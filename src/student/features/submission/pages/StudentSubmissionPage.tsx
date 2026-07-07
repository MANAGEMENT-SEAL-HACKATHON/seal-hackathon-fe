// src/student/features/submission/pages/StudentSubmissionPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Spin, Modal, Button, message, Card, Row, Col, Skeleton,
  Typography, Tag, Upload, Space, Divider, Alert, Form, Input, theme, Segmented, Collapse
} from 'antd';
import {
  FilePdfOutlined, EyeOutlined, CheckCircleFilled,
  ClockCircleOutlined, GithubOutlined, LinkOutlined,
  CloudUploadOutlined, InfoCircleOutlined, LockOutlined, EditOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Shield, Sparkles, Zap, Users } from 'lucide-react';
import { personBApi, SubmissionRequest, SubmissionStatusResponse, DeadlineResponse } from '../../../../api/personB.api';
import { studentSubmissionService } from '../services/studentSubmission.service';
import toast from 'react-hot-toast';
import { useStudentDashboard } from '../../../dashboard/hooks/useStudentDashboard';
import RoundProblemPanel from '../../round/components/RoundProblemPanel';
import FinalRoundProblemPanel from '../../round/components/FinalRoundProblemPanel';
import FinalSubmissionPanel from '../components/FinalSubmissionPanel';

const { Title, Text } = Typography;
const { Dragger } = Upload;

/* OFFICIAL FPT LOGO COLORS & CYBER PALETTE */
const FPT = {
  blue: '#00529C',
  blueDark: '#003366',
  orange: '#F37021',
  orangeLight: '#FF8C42',
  green: '#46B749',
};

// ==========================================
// 1. ZOD SCHEMA & UTILS
// ==========================================
const submissionSchema = z.object({
  repo_url: z.string().min(1, 'Đường dẫn Repository là bắt buộc').url('Định dạng URL không hợp lệ'),
  demo_url: z.string().url('Định dạng URL không hợp lệ').or(z.literal('')),
  slide_file: z.any().optional(),
});
type SubmissionFormValues = z.infer<typeof submissionSchema>;

const resolveSubmissionId = (data?: any): number | null => {
  if (!data) return null;
  const rawId = data.submission_id || data.id;
  if (rawId != null && rawId !== '') return Number(rawId);
  const path = data.slide_download_path || data.slide_url || data.slideFile || data.slideUrl;
  if (!path) return null;
  const match = String(path).match(/\/submissions\/(\d+)\/slide/);
  return match ? Number(match[1]) : null;
};

// ==========================================
// 2. SUB-COMPONENTS GIAO DIỆN
// ==========================================
const CountdownTimer: React.FC<{ deadline: string; isOverdue: boolean; isDark?: boolean; token?: any }> = ({ deadline, isOverdue, isDark, token }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => {
      const diff = +new Date(deadline) - +new Date();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      } else {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
      {[{ l: 'Ngày', v: timeLeft.days }, { l: 'Giờ', v: pad(timeLeft.hours) }, { l: 'Phút', v: pad(timeLeft.minutes) }, { l: 'Giây', v: pad(timeLeft.seconds) }].map((t, i) => (
        <div key={i} style={{ 
          background: isOverdue ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2') : (isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc'), 
          padding: '16px 4px', 
          borderRadius: 12, 
          border: `1px solid ${isOverdue ? (isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca') : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0')}` 
        }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: isOverdue ? '#ef4444' : (token?.colorTextHeading || '#0f172a'), lineHeight: 1, fontFamily: 'monospace' }}>{t.v}</div>
          <div style={{ fontSize: 11, color: token?.colorTextSecondary || '#64748b', marginTop: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{t.l}</div>
        </div>
      ))}
    </div>
  );
};

const SuccessView: React.FC<{ submissionData: any; submittedSlideName: string; onViewPdf: () => void; onEdit: () => void; isDark?: boolean; token?: any }> = ({ submissionData, submittedSlideName, onViewPdf, onEdit, isDark, token }) => (
  <Card style={{ borderRadius: 24, border: isDark ? '1px solid rgba(70, 183, 73, 0.3)' : '1px solid #b7eb8f', background: isDark ? 'linear-gradient(135deg, rgba(20, 35, 25, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)' : '#f6ffed', boxShadow: isDark ? '0 12px 32px rgba(0, 0, 0, 0.3)' : '0 12px 32px rgba(82, 196, 26, 0.1)', height: '100%', display: 'flex', flexDirection: 'column' }} styles={{ body: { padding: 40, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } }}>
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a', marginBottom: 16 }} />
      </motion.div>
      <Title level={2} style={{ color: isDark ? '#46B749' : '#237804', margin: 0, fontWeight: 800 }}>Nộp bài thành công!</Title>
      <Text style={{ color: isDark ? '#86efac' : '#389e0d', fontSize: 16 }}>Sản phẩm của đội bạn đã được lưu trữ an toàn và đóng dấu thời gian trên hệ thống.</Text>
    </div>

    <div style={{ background: isDark ? 'rgba(30, 41, 59, 0.8)' : '#fff', borderRadius: 16, padding: 28, border: isDark ? '1px solid rgba(70, 183, 73, 0.25)' : '1px solid #d9f7be', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: token?.colorTextSecondary }}>File Thuyết Trình (PDF)</Text>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(70, 183, 73, 0.15)' : '#f0fdf4', padding: '16px 20px', borderRadius: 12, border: isDark ? '1px solid rgba(70, 183, 73, 0.3)' : '1px solid #bbf7d0' }}>
            <Space size="middle">
              <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
              <Text strong style={{ fontSize: 16, color: isDark ? '#86efac' : '#166534' }}>{submittedSlideName}</Text>
            </Space>
            <Button type="primary" size="large" icon={<EyeOutlined />} onClick={onViewPdf} style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600, borderRadius: 8, boxShadow: '0 4px 10px rgba(22, 163, 74, 0.3)' }}>
              Xem PDF
            </Button>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: token?.colorTextSecondary }}>Repository Code</Text>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', padding: '14px 16px', borderRadius: 10, border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0' }}>
            <GithubOutlined style={{ fontSize: 20, color: token?.colorTextSecondary || '#334155' }} />
            <a href={submissionData?.repo_url || submissionData?.repoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: token?.colorTextHeading || '#0f172a' }}>
              {submissionData?.repo_url || submissionData?.repoUrl || 'N/A'}
            </a>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: token?.colorTextSecondary }}>Link Demo (Live)</Text>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', padding: '14px 16px', borderRadius: 10, border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0' }}>
            <LinkOutlined style={{ fontSize: 20, color: token?.colorTextSecondary || '#334155' }} />
            {(submissionData?.demo_url || submissionData?.demoUrl) ? (
              <a href={submissionData?.demo_url || submissionData?.demoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: token?.colorTextHeading || '#0f172a' }}>
                {submissionData?.demo_url || submissionData?.demoUrl}
              </a>
            ) : (
              <Text type="secondary" italic style={{ color: token?.colorTextSecondary }}>Không cung cấp</Text>
            )}
          </div>
        </Col>
      </Row>
    </div>

    <div style={{ textAlign: 'center', marginTop: 32 }}>
      <Button type="dashed" size="large" icon={<EditOutlined />} onClick={onEdit} style={{ borderRadius: 12, fontWeight: 700, padding: '0 32px', height: 48, borderColor: '#16a34a', color: isDark ? '#46B749' : '#16a34a', background: isDark ? 'rgba(70, 183, 73, 0.1)' : '#f0fdf4' }}>
        Cập Nhật / Thay Đổi Bài Nộp
      </Button>
    </div>
  </Card>
);

// ==========================================
// 3. COMPONENT CHÍNH (MAIN PAGE)
// ==========================================
const StudentSubmissionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeHackathon, selectedTeam } = useStudentDashboard() as { activeHackathon?: any; selectedTeam?: any };
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const studentId = userInfo.userId || userInfo.id || 'student-1';

  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  const { data: submissionDataRaw, isLoading: isSubLoading, refetch: refetchSubmission } = useQuery<SubmissionStatusResponse>({
    queryKey: ['studentSubmission', studentId],
    queryFn: () => personBApi.getStudentSubmission(studentId),
    retry: false,
  });

  const { data: deadlineData, isLoading: isDeadlineLoading } = useQuery<DeadlineResponse>({
    queryKey: ['currentDeadline'],
    queryFn: () => personBApi.getCurrentDeadline(),
    retry: false,
  });

  const submissionData = submissionDataRaw as any;
  const effectiveTeamId = selectedTeam?.id || submissionData?.teamId || submissionData?.team_id;
  const effectiveHackathonId = activeHackathon?.id || selectedTeam?.hackathonId || submissionData?.hackathonId || 1;
  const effectiveTeam: any = selectedTeam || { id: effectiveTeamId, trackId: submissionData?.trackId || submissionData?.track_id };

  const [isSlideModalVisible, setIsSlideModalVisible] = useState(false);
  const [slideBlobUrl, setSlideBlobUrl] = useState<string | null>(null);
  const [isLoadingSlide, setIsLoadingSlide] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeRoundTab, setActiveRoundTab] = useState<'FINAL' | 'PRELIMINARY'>('FINAL');

  useEffect(() => {
    if (effectiveTeam && effectiveTeam.isAdvanced === false) {
      setActiveRoundTab('PRELIMINARY');
    }
  }, [effectiveTeam]);

  const hasSavedSlide = Boolean(submissionData?.slide_file || submissionData?.slide_url || submissionData?.slideFile || submissionData?.slideUrl || submissionData?.has_slide);
  const isSubmitted = Boolean(submissionData && submissionData.status !== 'INCOMPLETE' && hasSavedSlide);
  const submittedSlideName = submissionData?.slide_file || submissionData?.slideFile || 'slide.pdf';
  const submissionId = resolveSubmissionId(submissionData);

  const isOverdue = useMemo(() => {
    if (!deadlineData?.deadline) return false;
    return +new Date(deadlineData.deadline) - +new Date() <= 0;
  }, [deadlineData]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { repo_url: '', demo_url: '', slide_file: null },
  });

  useEffect(() => {
    if (submissionData) {
      reset({
        repo_url: submissionData.repo_url || submissionData.repoUrl || '',
        demo_url: submissionData.demo_url || submissionData.demoUrl || '',
      });
    }
  }, [submissionData, isEditing, reset]);

  const mutation = useMutation({
    mutationFn: async (data: SubmissionRequest) => personBApi.submitStudentSubmission(studentId, data),
    onSuccess: (data) => {
      toast.success('Lưu bài dự thi thành công!');
      queryClient.setQueryData(['studentSubmission', studentId], data);
      setIsEditing(false);
      refetchSubmission();
    },
    onError: (err: any) => {
      toast.error(`Lỗi nộp bài: ${err?.message || 'Không thể kết nối máy chủ'}`);
    },
  });

  const onSubmit = (values: SubmissionFormValues) => {
    if (!values.slide_file && !hasSavedSlide) {
      message.error('Vui lòng tải lên file slide PDF.');
      return;
    }

    const currentTeamId = submissionData?.teamId || submissionData?.team_id;
    const currentTrackId = submissionData?.trackId || submissionData?.track_id;
    const fileToUpload = values.slide_file?.file?.originFileObj || values.slide_file?.file || values.slide_file?.originFileObj || values.slide_file;

    // 🚀 FIX: Ép cứng dữ liệu truyền đi, lót sẵn mọi định dạng tên biến cho Backend
    const payload = {
      teamId: currentTeamId,
      trackId: currentTrackId,
      repoUrl: values.repo_url,
      repo_url: values.repo_url,
      demoUrl: values.demo_url,  // <- Backend lấy trường này (từ API Doc)
      demo_url: values.demo_url,
      demoLink: values.demo_url,
      slideFile: fileToUpload,
      slide_file: fileToUpload,
      late_reason: isOverdue ? 'Nộp muộn do hệ thống ghi nhận' : undefined,
    };

    mutation.mutate(payload as any);
  };

  const handleViewPdf = async () => {
    if (!submissionId) {
      message.warning('Dữ liệu đang đồng bộ, vui lòng thử lại sau vài giây.');
      refetchSubmission();
      return;
    }
    setIsSlideModalVisible(true);
    setIsLoadingSlide(true);
    try {
      const blobData = (await studentSubmissionService.getSubmissionSlide(submissionId)) as unknown as BlobPart;
      const fileUrl = URL.createObjectURL(new Blob([blobData], { type: 'application/pdf' }));
      setSlideBlobUrl(fileUrl);
    } catch {
      message.error('Không thể tải file PDF từ máy chủ.');
      setIsSlideModalVisible(false);
    } finally {
      setIsLoadingSlide(false);
    }
  };

  const closePdfModal = () => {
    setIsSlideModalVisible(false);
    if (slideBlobUrl) {
      URL.revokeObjectURL(slideBlobUrl);
      setSlideBlobUrl(null);
    }
  };

  useEffect(() => {
    return () => { if (slideBlobUrl) URL.revokeObjectURL(slideBlobUrl); };
  }, [slideBlobUrl]);

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        background: isDark
          ? 'radial-gradient(circle at 10% 10%, rgba(0, 82, 156, 0.15) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(243, 112, 33, 0.12) 0%, transparent 60%), #0B0F19'
          : 'radial-gradient(circle at 15% 15%, rgba(243, 112, 33, 0.12) 0%, transparent 50%), radial-gradient(circle at 85% 85%, rgba(0, 82, 156, 0.12) 0%, transparent 50%), linear-gradient(180deg, #E2E8F0 0%, #F1F5F9 50%, #E2E8F0 100%)',
        padding: '36px 32px 64px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* 1. TOP HERO SECTION (Match Quản Lý Đội) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
            marginBottom: 36,
            paddingBottom: 24,
            borderBottom: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 82, 156, 0.18)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <motion.div
              whileHover={{ rotate: 15, scale: 1.08 }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 20,
                background: `linear-gradient(135deg, ${FPT.blue} 0%, #00C6FF 100%)`,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                boxShadow: `0 10px 24px -4px rgba(0, 82, 156, 0.5), inset 0 2px 4px rgba(255,255,255,0.4)`,
                border: '2px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
              }}
            >
              <Trophy size={30} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
            </motion.div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  background: isDark ? 'rgba(243, 112, 33, 0.25)' : 'rgba(243, 112, 33, 0.15)',
                  color: isDark ? '#FF8C42' : FPT.orange,
                  padding: '4px 12px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  border: `1px solid rgba(243, 112, 33, 0.4)`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Sparkles size={13} /> CỔNG DỰ THI HACKATHON
                </span>
              </div>
              <Title level={2} style={{ margin: 0, fontWeight: 900, color: token.colorTextHeading, fontSize: 30, letterSpacing: '-0.02em' }}>
                Đề thi & Nộp bài dự thi
              </Title>
            </div>
          </div>

          <div>
            {isSubmitted && !isEditing ? (
              <Tag color="success" icon={<CheckCircleFilled />} style={{ padding: '8px 18px', fontSize: 14, borderRadius: 10, fontWeight: 700, border: 0, boxShadow: '0 4px 12px rgba(82, 196, 26, 0.2)' }}>ĐÃ NỘP BÀI THÀNH CÔNG</Tag>
            ) : isOverdue ? (
              <Tag color="error" icon={<ClockCircleOutlined />} style={{ padding: '8px 18px', fontSize: 14, borderRadius: 10, fontWeight: 700, border: 0, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}>ĐÃ QUÁ HẠN NỘP</Tag>
            ) : (
              <Tag color="processing" style={{ padding: '8px 18px', fontSize: 14, borderRadius: 10, fontWeight: 700, border: 0, boxShadow: '0 4px 12px rgba(22, 119, 255, 0.2)' }}>CỔNG ĐANG MỞ</Tag>
            )}
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <AnimatePresence mode="wait">
          {isSubLoading || isDeadlineLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                padding: 48,
                background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
                borderRadius: 28,
                border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : token.colorBorderSecondary}`,
                boxShadow: '0 20px 48px rgba(0,0,0,0.06)',
              }}
            >
              <Skeleton active avatar paragraph={{ rows: 8 }} />
            </motion.div>
          ) : (
            <motion.div
              key="submission-studio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* ROUND SELECTOR BAR */}
              <div
                style={{
                  background: isDark ? 'rgba(30, 41, 59, 0.85)' : '#FFFFFF',
                  borderRadius: 24,
                  padding: '20px 28px',
                  boxShadow: isDark ? '0 12px 28px rgba(0,0,0,0.4)' : '0 12px 28px -8px rgba(0, 82, 156, 0.12)',
                  border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 82, 156, 0.22)'}`,
                  marginBottom: 32,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: isDark ? 'rgba(243, 112, 33, 0.2)' : 'rgba(243, 112, 33, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F37021', fontSize: 24, border: `1px solid ${isDark ? 'rgba(243, 112, 33, 0.3)' : 'rgba(243, 112, 33, 0.2)'}` }}>
                    🏆
                  </div>
                  <div>
                    <Title level={5} style={{ margin: 0, fontWeight: 900, color: token.colorTextHeading, fontSize: 18 }}>
                      Chọn Vòng thi & Cổng nộp bài
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13, color: token.colorTextSecondary, fontWeight: 600 }}>
                      Sử dụng Tab bên dưới để chuyển qua lại giữa Vòng Sơ loại và Vòng Chung kết
                    </Text>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* 2 Tab Chuyển Đổi */}
                  <Segmented
                    value={activeRoundTab}
                    onChange={(val) => setActiveRoundTab(val as any)}
                    size="large"
                    style={{
                      padding: 4,
                      borderRadius: 14,
                      background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f1f5f9',
                      fontWeight: 700,
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`
                    }}
                    options={[
                      {
                        label: (
                          <div style={{ padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>🏆</span>
                            <span>Chung kết</span>
                          </div>
                        ),
                        value: 'FINAL',
                      },
                      {
                        label: (
                          <div style={{ padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>⚡</span>
                            <span>Sơ loại</span>
                          </div>
                        ),
                        value: 'PRELIMINARY',
                      },
                    ]}
                  />
                </div>
              </div>

              {/* 3. MAIN CONTAINER 1: KHO ĐỀ THI CHÍNH THỨC */}
              <Collapse
                defaultActiveKey={['problem']}
                style={{
                  background: isDark
                    ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)'
                    : '#FFFFFF',
                  borderRadius: 28,
                  boxShadow: isDark
                    ? '0 24px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                    : '0 20px 48px -12px rgba(0, 82, 156, 0.15), 0 8px 24px -8px rgba(0, 0, 0, 0.08), 0 0 0 1.5px rgba(0, 82, 156, 0.18)',
                  border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 82, 156, 0.22)'}`,
                  marginBottom: 32,
                  overflow: 'hidden',
                }}
                items={[
                  {
                    key: 'problem',
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 4px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{
                              background: isDark ? 'rgba(0, 82, 156, 0.3)' : 'rgba(0, 82, 156, 0.12)',
                              color: isDark ? '#60A5FA' : FPT.blue,
                              padding: '4px 12px',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              border: `1px solid ${isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(0, 82, 156, 0.25)'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              <Users size={13} /> TÀI LIỆU & ĐỀ THI
                            </span>
                          </div>
                          <Title level={4} style={{ margin: '0 0 4px', fontWeight: 900, color: token.colorTextHeading, fontSize: 22, letterSpacing: '-0.01em' }}>
                            Đề thi chính thức — {activeRoundTab === 'FINAL' ? 'Vòng Chung kết' : 'Vòng Sơ loại'}
                          </Title>
                          <Text type="secondary" style={{ fontSize: 14, color: token.colorTextSecondary, fontWeight: 600 }}>
                            Xem đề thi và tài liệu hướng dẫn từ Ban tổ chức cho vòng đang chọn.
                          </Text>
                        </div>
                        <Tag color="processing" style={{ borderRadius: 8, fontWeight: 700, padding: '6px 14px', fontSize: 13 }}>
                          Bấm nút sổ xuống để thu gọn/mở rộng
                        </Tag>
                      </div>
                    ),
                    children: (
                      <div style={{ padding: '8px 12px 20px', position: 'relative', zIndex: 1 }}>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeRoundTab}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3 }}
                          >
                            {activeRoundTab === 'FINAL' ? (
                              <FinalRoundProblemPanel
                                teamId={effectiveTeamId}
                                hackathonId={effectiveHackathonId}
                              />
                            ) : (
                              <RoundProblemPanel
                                team={effectiveTeam}
                                hackathonId={effectiveHackathonId}
                              />
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    ),
                  },
                ]}
              />

              {/* 4. MAIN CONTAINER 2: TRẠM ĐIỀU PHỐI NỘP BÀI */}
              <Collapse
                defaultActiveKey={['submission']}
                style={{
                  background: isDark
                    ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)'
                    : '#FFFFFF',
                  borderRadius: 28,
                  boxShadow: isDark
                    ? '0 24px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                    : '0 20px 48px -12px rgba(0, 82, 156, 0.15), 0 8px 24px -8px rgba(0, 0, 0, 0.08), 0 0 0 1.5px rgba(0, 82, 156, 0.18)',
                  border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 82, 156, 0.22)'}`,
                  marginBottom: 32,
                  overflow: 'hidden',
                }}
                items={[
                  {
                    key: 'submission',
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 4px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{
                              background: isDark ? 'rgba(243, 112, 33, 0.25)' : 'rgba(243, 112, 33, 0.12)',
                              color: isDark ? '#FF8C42' : FPT.orange,
                              padding: '4px 12px',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              border: `1px solid ${isDark ? 'rgba(243, 112, 33, 0.3)' : 'rgba(243, 112, 33, 0.25)'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              <Zap size={13} /> KHU VỰC NỘP BÀI
                            </span>
                          </div>
                          <Title level={4} style={{ margin: '0 0 4px', fontWeight: 900, color: token.colorTextHeading, fontSize: 22, letterSpacing: '-0.01em' }}>
                            Nộp bài & Yêu cầu kỹ thuật — {activeRoundTab === 'FINAL' ? 'Vòng Chung kết' : 'Vòng Sơ loại'}
                          </Title>
                          <Text type="secondary" style={{ fontSize: 14, color: token.colorTextSecondary, fontWeight: 600 }}>
                            Nộp slide thuyết trình, mã nguồn và demo sản phẩm theo yêu cầu từng vòng thi.
                          </Text>
                        </div>
                        <Tag color="processing" style={{ borderRadius: 8, fontWeight: 700, padding: '6px 14px', fontSize: 13 }}>
                          Bấm nút sổ xuống để thu gọn/mở rộng
                        </Tag>
                      </div>
                    ),
                    children: (
                      <div style={{ padding: '8px 12px 20px', position: 'relative', zIndex: 1 }}>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeRoundTab}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3 }}
                          >
                            {activeRoundTab === 'FINAL' ? (
                              effectiveTeamId ? (
                                <div style={{ marginBottom: 16 }}>
                                  <FinalSubmissionPanel
                                    teamId={effectiveTeamId}
                                    hackathonId={effectiveHackathonId}
                                  />
                                </div>
                              ) : (
                                <Alert
                                  type="info"
                                  message="Chưa có thông tin Vòng Chung kết"
                                  description="Đội của bạn hiện chưa được cấu hình hoặc chưa lọt vào Vòng Chung kết."
                                  showIcon
                                  style={{ borderRadius: 16, padding: 24, fontSize: 15 }}
                                />
                              )
                            ) : (
                              /* Cổng Nộp Bài Vòng Sơ Loại */
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                                  <span style={{ fontSize: 20 }}>⚡</span>
                                  <Title level={5} style={{ margin: 0, fontWeight: 800, color: token.colorTextHeading, fontSize: 18 }}>
                                    Cổng nộp bài Vòng Sơ loại
                                  </Title>
                                </div>

                                <Row gutter={[24, 24]} align="stretch">
                                  <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>

                                      <Card style={{ borderRadius: 20, border: isOverdue ? '2px solid #ef4444' : (isDark ? '1px solid rgba(59, 130, 246, 0.4)' : '2px solid #93c5fd'), background: isOverdue ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2') : (isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)'), boxShadow: isDark ? '0 12px 28px rgba(0,0,0,0.3)' : '0 12px 28px -6px rgba(59, 130, 246, 0.18)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                          {isOverdue ? <LockOutlined style={{ color: '#ef4444', fontSize: 20 }} /> : <ClockCircleOutlined style={{ color: '#1677ff', fontSize: 20 }} />}
                                          <Text strong style={{ color: isOverdue ? '#ef4444' : '#1677ff', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {isOverdue ? 'THỜI GIAN ĐÃ KẾT THÚC' : 'THỜI GIAN CÒN LẠI'}
                                          </Text>
                                        </div>
                                        {deadlineData?.deadline ? (
                                          <CountdownTimer deadline={deadlineData.deadline} isOverdue={isOverdue} isDark={isDark} token={token} />
                                        ) : (
                                          <Alert type="info" message="Chưa có thông tin hạn chót Sơ loại" showIcon style={{ borderRadius: 10 }} />
                                        )}
                                        <Divider style={{ margin: '20px 0 16px', borderColor: isDark ? 'rgba(255,255,255,0.1)' : undefined }} />
                                        <div style={{ textAlign: 'center' }}>
                                          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600, color: token.colorTextSecondary }}>Hạn nộp Sơ loại chính thức</Text>
                                          <div style={{ fontSize: 15, fontWeight: 700, color: token.colorTextHeading, marginTop: 4 }}>
                                            {deadlineData?.deadline ? new Date(deadlineData.deadline).toLocaleString('vi-VN') : '---'}
                                          </div>
                                        </div>
                                      </Card>

                                      <Card style={{ borderRadius: 20, background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)', border: isDark ? '1px solid rgba(139, 92, 246, 0.3)' : '2px solid #d8b4fe', boxShadow: isDark ? '0 12px 28px rgba(0,0,0,0.3)' : '0 12px 28px -6px rgba(139, 92, 246, 0.15)', flex: 1 }}
                                        title={<span style={{ display: 'flex', alignItems: 'center', color: token.colorTextHeading }}><InfoCircleOutlined style={{ color: '#8b5cf6', marginRight: 8, fontSize: 18 }} /> Yêu cầu kỹ thuật Sơ loại</span>}>
                                        <ul style={{ paddingLeft: 18, color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.8, margin: 0 }}>
                                          <li>Mã nguồn phải đẩy lên <Tag color="default">Github</Tag> hoặc <Tag color="default">GitLab</Tag> ở chế độ <Text strong color="success">Public</Text>.</li>
                                          <li style={{ marginTop: 8 }}>Slide thuyết trình <Text type="danger" strong>BẮT BUỘC</Text> lưu dưới định dạng PDF.</li>
                                          <li style={{ marginTop: 8 }}>Dung lượng file tải lên tối đa <Text strong>25MB</Text>.</li>
                                          <li style={{ marginTop: 8 }}>Hệ thống tự động chốt lấy bản ghi bài nộp cuối cùng trước khi đồng hồ điểm 0. Cẩn thận khi sửa bài sát giờ.</li>
                                        </ul>
                                      </Card>

                                    </div>
                                  </Col>

                                  <Col xs={24} lg={16} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <AnimatePresence mode="wait">
                                      {isSubmitted && !isEditing ? (
                                        <motion.div key="success" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} style={{ height: '100%' }}>
                                          <SuccessView
                                            submissionData={submissionData}
                                            submittedSlideName={submittedSlideName}
                                            onViewPdf={handleViewPdf}
                                            onEdit={() => setIsEditing(true)}
                                            isDark={isDark}
                                            token={token}
                                          />
                                        </motion.div>
                                      ) : (
                                        <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ height: '100%' }}>
                                          <Card style={{ borderRadius: 24, boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px -10px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.05)', border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '2px solid #cbd5e1', background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)' : '#ffffff', height: '100%', display: 'flex', flexDirection: 'column' }} styles={{ body: { padding: '36px 40px', flex: 1, display: 'flex', flexDirection: 'column' } }}>

                                            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                              <div>
                                                <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 700 }}>
                                                  {isSubmitted ? 'Cập nhật bài Sơ loại' : 'Nộp bài Vòng Sơ loại'}
                                                </Title>
                                              </div>
                                              {isSubmitted && (
                                                <Button onClick={() => setIsEditing(false)} size="middle" style={{ borderRadius: 8, fontWeight: 600 }}>Hủy</Button>
                                              )}
                                            </div>

                                            <Form layout="vertical" onFinish={handleSubmit(onSubmit)} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                              <Row gutter={24}>
                                                <Col xs={24} md={12}>
                                                  <Form.Item label={<Text strong style={{ fontSize: 14, color: token.colorTextHeading }}>Đường dẫn Repository <span style={{ color: '#ff4d4f' }}>*</span></Text>} validateStatus={errors.repo_url ? 'error' : ''} help={errors.repo_url?.message as string}>
                                                    <Controller name="repo_url" control={control} render={({ field }) => (
                                                      <Input
                                                        {...field}
                                                        value={field.value || ''}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                        prefix={<GithubOutlined style={{ color: '#94a3b8' }} />}
                                                        placeholder="https://github.com/team/project"
                                                        size="large" style={{ borderRadius: 10, padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : undefined, color: token.colorTextHeading }}
                                                      />
                                                    )} />
                                                  </Form.Item>
                                                </Col>
                                                <Col xs={24} md={12}>
                                                  <Form.Item label={<Text strong style={{ fontSize: 14, color: token.colorTextHeading }}>Đường dẫn Demo (Live URL)</Text>} validateStatus={errors.demo_url ? 'error' : ''} help={errors.demo_url?.message as string}>
                                                    <Controller name="demo_url" control={control} render={({ field }) => (
                                                      <Input
                                                        {...field}
                                                        value={field.value || ''}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                        prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
                                                        placeholder="https://my-demo.vercel.app"
                                                        size="large" style={{ borderRadius: 10, padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : undefined, color: token.colorTextHeading }}
                                                      />
                                                    )} />
                                                  </Form.Item>
                                                </Col>
                                              </Row>

                                              <Form.Item
                                                label={<Text strong style={{ fontSize: 14, color: token.colorTextHeading }}>File Slide Thuyết Trình Sơ Loại (.PDF) {!hasSavedSlide && <span style={{ color: '#ff4d4f' }}>*</span>}</Text>}
                                                validateStatus={errors.slide_file ? 'error' : ''}
                                                help={errors.slide_file?.message as string}
                                                style={{ flex: 1, marginBottom: 24 }}
                                              >
                                                <Controller name="slide_file" control={control} render={({ field: { onChange } }) => (
                                                  <Dragger
                                                    accept=".pdf,application/pdf"
                                                    maxCount={1}
                                                    beforeUpload={(file) => { onChange(file); return false; }}
                                                    onRemove={() => onChange(null)}
                                                    style={{ background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#eff6ff', borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#60a5fa', borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                  >
                                                    <div style={{ padding: '40px 0' }}>
                                                      <p className="ant-upload-drag-icon"><CloudUploadOutlined style={{ color: '#3b82f6', fontSize: 56 }} /></p>
                                                      <p className="ant-upload-text" style={{ fontSize: 18, fontWeight: 700, color: token.colorTextHeading, marginTop: 16 }}>Kéo thả file PDF vào đây hoặc Nhấp để chọn</p>
                                                      <p className="ant-upload-hint" style={{ color: token.colorTextSecondary, fontSize: 14 }}>Chỉ hỗ trợ định dạng .PDF (Tối đa 25MB)</p>

                                                      {hasSavedSlide && isEditing && (
                                                        <div style={{ marginTop: 16, color: '#16a34a', fontWeight: 600, background: '#dcfce7', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
                                                          ✓ Đã lưu File: {submittedSlideName} (Tải file mới nếu muốn thay thế)
                                                        </div>
                                                      )}
                                                    </div>
                                                  </Dragger>
                                                )} />
                                              </Form.Item>

                                              {isOverdue && (
                                                <Alert type="warning" showIcon message="Bạn đang cập nhật bài muộn!" description="Hệ thống sẽ đánh dấu bài nộp là LATE_PENDING. Quyền phê duyệt thuộc về Ban tổ chức." style={{ marginBottom: 24, borderRadius: 10 }} />
                                              )}

                                              <Button type="primary" htmlType="submit" size="large" block loading={mutation.isPending} style={{ height: 52, borderRadius: 12, fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', boxShadow: '0 6px 16px -4px rgba(37, 99, 235, 0.4)', marginTop: 'auto' }}>
                                                {isSubmitted ? 'Cập nhật bài Sơ loại' : 'Nộp bài Sơ loại'}
                                              </Button>
                                            </Form>
                                          </Card>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </Col>
                                </Row>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    ),
                  },
                ]}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF MODAL */}
        <Modal
          title={<Space><FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} /><span style={{ fontWeight: 700, fontSize: 18 }}>Chi tiết File: {submittedSlideName}</span></Space>}
          open={isSlideModalVisible}
          onCancel={closePdfModal}
          width={1100}
          style={{ top: 20 }}
          footer={[<Button key="close" type="primary" size="large" onClick={closePdfModal} style={{ borderRadius: 8, fontWeight: 600 }}>Đóng Cửa Sổ</Button>]}
        >
          <div style={{ height: '75vh', width: '100%', position: 'relative', background: '#e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)' }}>
            {isLoadingSlide ? (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: '#64748b', fontWeight: 600, fontSize: 15 }}>Đang tải và giải mã tệp PDF...</div>
              </div>
            ) : slideBlobUrl ? (
              <iframe src={`${slideBlobUrl}#toolbar=0`} title="PDF Viewer" width="100%" height="100%" style={{ border: 'none' }} />
            ) : (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ef4444', fontWeight: 600, fontSize: 16 }}>
                Không thể hiển thị tệp PDF. Tệp có thể bị hỏng hoặc chưa được tải lên.
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default StudentSubmissionPage;