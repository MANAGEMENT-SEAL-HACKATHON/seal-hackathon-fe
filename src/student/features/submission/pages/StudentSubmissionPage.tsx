// src/student/features/submission/pages/StudentSubmissionPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Spin, Modal, Button, message, Card, Row, Col, 
  Typography, Tag, Upload, Space, Divider, Alert, Form, Input
} from 'antd';
import { 
  FilePdfOutlined, EyeOutlined, CheckCircleFilled, 
  ClockCircleOutlined, GithubOutlined, LinkOutlined,
  CloudUploadOutlined, InfoCircleOutlined, LockOutlined, EditOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { personBApi, SubmissionRequest, SubmissionStatusResponse, DeadlineResponse } from '../../../../api/personB.api';
import { studentSubmissionService } from '../services/studentSubmission.service';
import toast from 'react-hot-toast';

const { Title, Text } = Typography;
const { Dragger } = Upload;

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
const CountdownTimer: React.FC<{ deadline: string; isOverdue: boolean }> = ({ deadline, isOverdue }) => {
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
        <div key={i} style={{ background: isOverdue ? '#fef2f2' : '#f8fafc', padding: '16px 4px', borderRadius: 12, border: `1px solid ${isOverdue ? '#fecaca' : '#e2e8f0'}` }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: isOverdue ? '#ef4444' : '#0f172a', lineHeight: 1, fontFamily: 'monospace' }}>{t.v}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{t.l}</div>
        </div>
      ))}
    </div>
  );
};

const SuccessView: React.FC<{ submissionData: any; submittedSlideName: string; onViewPdf: () => void; onEdit: () => void; }> = ({ submissionData, submittedSlideName, onViewPdf, onEdit }) => (
  <Card style={{ borderRadius: 24, border: '1px solid #b7eb8f', background: '#f6ffed', boxShadow: '0 12px 32px rgba(82, 196, 26, 0.1)', height: '100%', display: 'flex', flexDirection: 'column' }} styles={{ body: { padding: 40, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } }}>
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a', marginBottom: 16 }} />
      </motion.div>
      <Title level={2} style={{ color: '#237804', margin: 0, fontWeight: 800 }}>Nộp bài thành công!</Title>
      <Text style={{ color: '#389e0d', fontSize: 16 }}>Sản phẩm của đội bạn đã được lưu trữ an toàn và đóng dấu thời gian trên hệ thống.</Text>
    </div>

    <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #d9f7be', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>File Thuyết Trình (PDF)</Text>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '16px 20px', borderRadius: 12, border: '1px solid #bbf7d0' }}>
            <Space size="middle">
              <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
              <Text strong style={{ fontSize: 16, color: '#166534' }}>{submittedSlideName}</Text>
            </Space>
            <Button type="primary" size="large" icon={<EyeOutlined />} onClick={onViewPdf} style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600, borderRadius: 8, boxShadow: '0 4px 10px rgba(22, 163, 74, 0.3)' }}>
              Xem PDF
            </Button>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Repository Code</Text>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <GithubOutlined style={{ fontSize: 20, color: '#334155' }} />
            <a href={submissionData?.repo_url || submissionData?.repoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>
              {submissionData?.repo_url || submissionData?.repoUrl || 'N/A'}
            </a>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Link Demo (Live)</Text>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <LinkOutlined style={{ fontSize: 20, color: '#334155' }} />
            {/* KIỂM TRA CHẶT CHẼ DỮ LIỆU TỪ DB */}
            {(submissionData?.demo_url || submissionData?.demoUrl) ? (
              <a href={submissionData?.demo_url || submissionData?.demoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>
                {submissionData?.demo_url || submissionData?.demoUrl}
              </a>
            ) : (
              <Text type="secondary" italic>Không cung cấp</Text>
            )}
          </div>
        </Col>
      </Row>
    </div>

    <div style={{ textAlign: 'center', marginTop: 32 }}>
      <Button type="dashed" size="large" icon={<EditOutlined />} onClick={onEdit} style={{ borderRadius: 12, fontWeight: 700, padding: '0 32px', height: 48, borderColor: '#16a34a', color: '#16a34a', background: '#f0fdf4' }}>
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
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const studentId = userInfo.userId || userInfo.id || 'student-1';

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

  const [isSlideModalVisible, setIsSlideModalVisible] = useState(false);
  const [slideBlobUrl, setSlideBlobUrl] = useState<string | null>(null);
  const [isLoadingSlide, setIsLoadingSlide] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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


  if (isSubLoading || isDeadlineLoading) {
    return (
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>Đang tải cổng nộp bài...</Text>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 60px' }}>
      
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Cổng nộp bài dự thi</Title>
          <Text type="secondary" style={{ fontSize: 15 }}>Hoàn thiện mã nguồn và tài liệu trình bày cho vòng thi hiện tại.</Text>
        </div>
        <div>
          {isSubmitted && !isEditing ? (
            <Tag color="success" icon={<CheckCircleFilled />} style={{ padding: '8px 16px', fontSize: 14, borderRadius: 8, fontWeight: 700 }}>ĐÃ NỘP BÀI THÀNH CÔNG</Tag>
          ) : isOverdue ? (
            <Tag color="error" icon={<ClockCircleOutlined />} style={{ padding: '8px 16px', fontSize: 14, borderRadius: 8, fontWeight: 700 }}>ĐÃ QUÁ HẠN NỘP</Tag>
          ) : (
            <Tag color="processing" style={{ padding: '8px 16px', fontSize: 14, borderRadius: 8, fontWeight: 700 }}>CỔNG ĐANG MỞ</Tag>
          )}
        </div>
      </div>

      <Row gutter={[32, 32]} align="stretch">
        <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
            
            <Card style={{ borderRadius: 20, border: isOverdue ? '1px solid #fca5a5' : '1px solid #bae0ff', background: isOverdue ? '#fef2f2' : '#f0f8ff', boxShadow: '0 10px 25px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                {isOverdue ? <LockOutlined style={{ color: '#ef4444', fontSize: 20 }} /> : <ClockCircleOutlined style={{ color: '#1677ff', fontSize: 20 }} />}
                <Text strong style={{ color: isOverdue ? '#ef4444' : '#1677ff', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {isOverdue ? 'THỜI GIAN ĐÃ KẾT THÚC' : 'THỜI GIAN CÒN LẠI'}
                </Text>
              </div>
              {deadlineData?.deadline ? (
                <CountdownTimer deadline={deadlineData.deadline} isOverdue={isOverdue} />
              ) : (
                <Alert type="info" message="Chưa có thông tin hạn chót" showIcon style={{ borderRadius: 10 }} />
              )}
              <Divider style={{ margin: '20px 0 16px' }} />
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Hạn nộp chính thức</Text>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginTop: 4 }}>
                  {deadlineData?.deadline ? new Date(deadlineData.deadline).toLocaleString('vi-VN') : '---'}
                </div>
              </div>
            </Card>

            <Card style={{ borderRadius: 20, background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', flex: 1 }} 
                  title={<span style={{ display: 'flex', alignItems: 'center' }}><InfoCircleOutlined style={{ color: '#8b5cf6', marginRight: 8, fontSize: 18 }}/> Yêu cầu kỹ thuật bắt buộc</span>}>
              <ul style={{ paddingLeft: 18, color: '#334155', fontSize: 15, lineHeight: 1.8, margin: 0 }}>
                <li>Mã nguồn phải đẩy lên <Tag color="default">Github</Tag> hoặc <Tag color="default">GitLab</Tag> ở chế độ <Text strong color="success">Public</Text>.</li>
                <li style={{ marginTop: 8 }}>Slide thuyết trình <Text type="danger" strong>BẮT BUỘC</Text> lưu dưới định dạng PDF.</li>
                <li style={{ marginTop: 8 }}>Dung lượng file tải lên tối đa <Text strong>25MB</Text>.</li>
                <li style={{ marginTop: 8 }}>Hệ thống tự động chốt lấy bản ghi bài nộp cuối cùng trước khi đồng hồ điểm 0. Cẩn thận khi sửa bài gần sát giờ.</li>
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
                />
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ height: '100%' }}>
                <Card style={{ borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', height: '100%', display: 'flex', flexDirection: 'column' }} styles={{ body: { padding: '36px 40px', flex: 1, display: 'flex', flexDirection: 'column' } }}>
                  
                  <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>
                        {isSubmitted ? 'Cập nhật biểu mẫu' : 'Biểu mẫu nộp bài'}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 15 }}>
                        {isSubmitted ? 'Chỉnh sửa liên kết hoặc tải lên file PDF mới để thay thế bản cũ.' : 'Cập nhật cẩn thận các liên kết, bạn có thể nộp lại nhiều lần trước hạn chót.'}
                      </Text>
                    </div>
                    {isSubmitted && (
                      <Button onClick={() => setIsEditing(false)} size="large" style={{ borderRadius: 8, fontWeight: 600 }}>Hủy Cập Nhật</Button>
                    )}
                  </div>

                  <Form layout="vertical" onFinish={handleSubmit(onSubmit)} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Row gutter={24}>
                      <Col xs={24} md={12}>
                        <Form.Item label={<Text strong style={{ fontSize: 14 }}>Đường dẫn Repository <span style={{color: '#ff4d4f'}}>*</span></Text>} validateStatus={errors.repo_url ? 'error' : ''} help={errors.repo_url?.message as string}>
                          {/* 🚀 FIX: Ép cứng giá trị onChange và value để lấy chính xác ký tự */}
                          <Controller name="repo_url" control={control} render={({ field }) => (
                            <Input 
                                {...field} 
                                value={field.value || ''} 
                                onChange={(e) => field.onChange(e.target.value)} 
                                prefix={<GithubOutlined style={{ color: '#94a3b8' }}/>} 
                                placeholder="https://github.com/team/project" 
                                size="large" style={{ borderRadius: 10, padding: '10px 14px' }} 
                            />
                          )} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label={<Text strong style={{ fontSize: 14 }}>Đường dẫn Demo (Live URL)</Text>} validateStatus={errors.demo_url ? 'error' : ''} help={errors.demo_url?.message as string}>
                          <Controller name="demo_url" control={control} render={({ field }) => (
                            <Input 
                                {...field} 
                                value={field.value || ''} 
                                onChange={(e) => field.onChange(e.target.value)} 
                                prefix={<LinkOutlined style={{ color: '#94a3b8' }}/>} 
                                placeholder="https://my-demo.vercel.app" 
                                size="large" style={{ borderRadius: 10, padding: '10px 14px' }} 
                            />
                          )} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item 
                      label={<Text strong style={{ fontSize: 14 }}>File Slide Thuyết Trình (.PDF) {!hasSavedSlide && <span style={{color: '#ff4d4f'}}>*</span>}</Text>} 
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
                          style={{ background: '#f8fafc', borderColor: '#cbd5e1', borderRadius: 16, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <div style={{ padding: '40px 0' }}>
                            <p className="ant-upload-drag-icon"><CloudUploadOutlined style={{ color: '#3b82f6', fontSize: 56 }} /></p>
                            <p className="ant-upload-text" style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginTop: 16 }}>Kéo thả file PDF vào đây hoặc Nhấp để chọn</p>
                            <p className="ant-upload-hint" style={{ color: '#64748b', fontSize: 14 }}>Chỉ hỗ trợ định dạng .PDF (Tối đa 25MB)</p>
                            
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

                    <Button type="primary" htmlType="submit" size="large" block loading={mutation.isPending} style={{ height: 60, borderRadius: 14, fontSize: 17, fontWeight: 800, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)', marginTop: 'auto' }}>
                      {isSubmitted ? 'LƯU CẬP NHẬT BÀI THI' : 'XÁC NHẬN GỬI BÀI DỰ THI'}
                    </Button>
                  </Form>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </Col>
      </Row>

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
  );
};

export default StudentSubmissionPage;