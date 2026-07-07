import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, Tag, Space, Alert, Row, Col, Spin, Upload, Modal, message, theme, Divider } from 'antd';
import {
  CloudUploadOutlined,
  LockOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  TrophyOutlined,
  InfoCircleOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import { useFinalSubmission } from '../hooks/useFinalSubmission';
import { criteriaService } from '../../../../features/criteria/services/criteriaService';
import { studentSubmissionService } from '../services/studentSubmission.service';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const formatWeight = (weight) => {
  const value = Number(weight);
  if (Number.isNaN(value)) return '—';
  return value <= 1 ? `${(value * 100).toFixed(0)}%` : `${value}%`;
};

const validateOptionalUrl = (_, value) => {
  if (!value) return Promise.resolve();
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('invalid protocol');
    }
    return Promise.resolve();
  } catch {
    return Promise.reject(new Error('Vui lòng nhập URL hợp lệ bắt đầu bằng http:// hoặc https://'));
  }
};

// ==========================================
// SUB-COMPONENT CHỨA TOÀN BỘ LOGIC FORM/HOOKS
// (Đảm bảo không bị vi phạm Rule of Hooks)
// ==========================================
const FinalSubmissionForm = ({ 
  finalRound, existingSubmission, isEligible,
  isLocked, timeLeft, isSubmitting, submitFinalWork 
}) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  const [form] = Form.useForm();
  const [slideFile, setSlideFile] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [isSlideModalVisible, setIsSlideModalVisible] = useState(false);
  const [slideBlobUrl, setSlideBlobUrl] = useState(null);
  const [isLoadingSlide, setIsLoadingSlide] = useState(false);

  // 1. Dọn dẹp Blob URL
  useEffect(() => {
    return () => {
      if (slideBlobUrl) {
        URL.revokeObjectURL(slideBlobUrl);
      }
    };
  }, [slideBlobUrl]);

  // 2. Tải Criteria
  useEffect(() => {
    if (!finalRound?.id || !isEligible) {
      setCriteria([]);
      return;
    }

    let cancelled = false;
    setCriteriaLoading(true);
    criteriaService
      .listByFinalRound(finalRound.id)
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data?.items || data?.data || [];
        setCriteria(items);
      })
      .catch(() => {
        if (!cancelled) setCriteria([]);
      })
      .finally(() => {
        if (!cancelled) setCriteriaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [finalRound?.id, isEligible]);

  const submissionIncomplete = existingSubmission?.status === 'INCOMPLETE';
  const isRejected = String(existingSubmission?.status || '').toUpperCase() === 'REJECTED';
  const hasSavedSlide = Boolean(
    existingSubmission?.hasSlide ??
      existingSubmission?.has_slide ??
      existingSubmission?.slideFile ??
      existingSubmission?.slide_file ??
      existingSubmission?.slideDownloadPath ??
      existingSubmission?.slide_download_path
  );
  const isSubmitted = Boolean(existingSubmission && !submissionIncomplete && !isRejected && hasSavedSlide);
  const deadline = finalRound?.submissionDeadline || finalRound?.submission_deadline;
  const submittedSlideName = existingSubmission?.slideFile || existingSubmission?.slide_file || existingSubmission?.slideUrl || existingSubmission?.slide_url || 'slide.pdf';
  const submissionId = existingSubmission?.submissionId ?? existingSubmission?.submission_id ?? existingSubmission?.id ?? null;

  const handleViewSubmittedSlide = async () => {
    if (!submissionId) {
      message.error('Không xác định được bài nộp để xem file.');
      return;
    }

    setIsSlideModalVisible(true);
    setIsLoadingSlide(true);
    setSlideBlobUrl(null);

    try {
      const blob = await studentSubmissionService.getSubmissionSlide(submissionId);
      const fileUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setSlideBlobUrl(fileUrl);
    } catch {
      message.error('Không thể mở file slide. Vui lòng thử lại sau.');
      setIsSlideModalVisible(false);
    } finally {
      setIsLoadingSlide(false);
    }
  };

  const handleCloseSlideModal = () => {
    setIsSlideModalVisible(false);
    if (slideBlobUrl) {
      URL.revokeObjectURL(slideBlobUrl);
      setSlideBlobUrl(null);
    }
  };

  const handleFinish = async (values) => {
    await submitFinalWork({
      repoUrl: values.repoUrl || '',
      demoUrl: values.demoUrl || '',
      reportUrl: values.reportUrl || '',
      slideFile: slideFile || undefined,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* HEADER SECTION */}
      <div
        style={{
          background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)' : '#FFFFFF',
          borderRadius: 24,
          padding: '24px 32px',
          boxShadow: isDark ? '0 12px 28px rgba(0,0,0,0.4)' : '0 12px 28px -8px rgba(0, 82, 156, 0.12)',
          border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 82, 156, 0.22)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: isDark ? 'rgba(243, 112, 33, 0.2)' : 'rgba(243, 112, 33, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F37021',
              fontSize: 28,
              border: `1px solid ${isDark ? 'rgba(243, 112, 33, 0.3)' : 'rgba(243, 112, 33, 0.2)'}`,
            }}
          >
            🏆
          </div>
          <div>
            <Space align="center" style={{ marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
              <Title level={3} style={{ margin: 0, fontWeight: 900, color: token.colorTextHeading, fontSize: 22 }}>
                Cổng nộp bài Vòng Chung kết
              </Title>
              {isSubmitted ? (
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 700, padding: '4px 10px', borderRadius: 8, fontSize: 13 }}>
                  ĐÃ NỘP BÀI
                </Tag>
              ) : isRejected ? (
                <Tag color="error" icon={<CloseCircleOutlined />} style={{ fontWeight: 700, padding: '4px 10px', borderRadius: 8, fontSize: 13 }}>
                  REJECTED
                </Tag>
              ) : isLocked ? (
                <Tag color="warning" icon={<ClockCircleOutlined />} style={{ fontWeight: 700, padding: '4px 10px', borderRadius: 8, fontSize: 13 }}>
                  HẾT HẠN
                </Tag>
              ) : (
                <Tag color="processing" style={{ fontWeight: 700, padding: '4px 10px', borderRadius: 8, fontSize: 13 }}>
                  ĐANG MỞ
                </Tag>
              )}
            </Space>
            <Text type="secondary" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: token.colorTextSecondary }}>
              Hạn chót chính thức: {deadline ? new Date(deadline).toLocaleString('vi-VN') : 'Chưa công bố'}
            </Text>
          </div>
        </div>

        <div
          style={{
            background: isLocked ? (isDark ? 'rgba(207, 19, 34, 0.2)' : '#fff2f0') : (isDark ? 'rgba(22, 119, 255, 0.15)' : '#eff6ff'),
            padding: '14px 28px',
            borderRadius: 16,
            border: `1.5px solid ${isLocked ? (isDark ? 'rgba(255, 77, 79, 0.4)' : '#ffccc7') : (isDark ? 'rgba(59, 130, 246, 0.4)' : '#bae0ff')}`,
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <Text
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: isLocked ? '#ff4d4f' : '#1677ff',
              marginBottom: 4,
            }}
          >
            {isLocked ? 'TRẠNG THÁI' : 'THỜI GIAN CÒN LẠI'}
          </Text>
          <Title
            level={4}
            style={{ margin: 0, color: isLocked ? '#ff4d4f' : '#1677ff', fontFamily: 'monospace', fontWeight: 800, fontSize: 20 }}
          >
            {timeLeft}
          </Title>
        </div>
      </div>

      {/* ALERTS SECTION */}
      {isRejected && (
        <Alert
          message="Bài nộp bị từ chối (REJECTED)"
          description="Bài nộp Chung kết đã bị hệ thống từ chối do quá hạn (HARD_LOCK). Không thể nộp lại."
          type="error"
          showIcon
          style={{ borderRadius: 14, padding: '16px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
        />
      )}

      {isLocked && !isSubmitted && !isRejected && (
        <Alert
          message="Đã quá hạn nộp bài"
          description="Thời gian nộp Chung kết đã kết thúc. Bạn vẫn có thể gửi để hệ thống ghi nhận trạng thái REJECTED (HARD_LOCK)."
          type="warning"
          showIcon
          style={{ borderRadius: 14, padding: '16px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
        />
      )}

      {submissionIncomplete && !isLocked && (
        <Alert
          message="Nộp file thất bại — cần nộp lại"
          description="File slide PDF chưa được lưu thành công. Vui lòng chọn file PDF hợp lệ và nộp lại."
          type="warning"
          showIcon
          style={{ borderRadius: 14, padding: '16px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
        />
      )}

      {isSubmitted && (
        <Alert
          message="Bài nộp Chung kết đã được ghi nhận thành công!"
          description="Nếu bạn vừa cập nhật source code hoặc demo, hệ thống có thể cần thêm thời gian để đồng bộ và kiểm tra quyền truy cập công khai."
          type="success"
          showIcon
          style={{ borderRadius: 14, padding: '16px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
        />
      )}

      {/* MAIN CONTENT COLUMNS */}
      <Row gutter={[24, 24]} align="stretch">
        <Col xs={24} lg={9} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            style={{
              borderRadius: 20,
              background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
              border: isDark ? '1px solid rgba(139, 92, 246, 0.3)' : '2px solid #d8b4fe',
              boxShadow: isDark ? '0 12px 28px rgba(0,0,0,0.3)' : '0 12px 28px -6px rgba(139, 92, 246, 0.15)',
              height: '100%',
            }}
            styles={{ body: { padding: 28 } }}
          >
            <Title level={5} style={{ display: 'flex', alignItems: 'center', color: token.colorTextHeading, fontSize: 17, fontWeight: 800, marginBottom: 12 }}>
              <InfoCircleOutlined style={{ color: '#8b5cf6', marginRight: 10, fontSize: 20 }} />
              Yêu cầu & Tiêu chí đánh giá
            </Title>
            <Paragraph style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Sản phẩm của bạn sẽ được đánh giá theo các tiêu chí Vòng Chung kết từ hệ thống. Vui lòng đảm bảo slide thể hiện rõ:
            </Paragraph>

            {criteriaLoading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Spin size="small" tip="Đang tải tiêu chí..." />
              </div>
            ) : criteria.length === 0 ? (
              <Text type="secondary" style={{ fontStyle: 'italic' }}>Chưa có tiêu chí Chung kết — liên hệ Ban tổ chức.</Text>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {criteria.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                      borderRadius: 12,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: token.colorTextHeading, fontSize: 14 }}>{c.name || c.criterionName}</span>
                    <Tag color="purple" style={{ margin: 0, fontWeight: 700, borderRadius: 6, padding: '2px 8px', fontSize: 13 }}>
                      {formatWeight(c.weight)}
                    </Tag>
                  </div>
                ))}
              </div>
            )}

            <Divider style={{ margin: '24px 0', borderColor: isDark ? 'rgba(255,255,255,0.1)' : undefined }} />

            <ul style={{ paddingLeft: 18, color: token.colorTextSecondary, fontSize: 13, lineHeight: 1.8, margin: 0 }}>
              <li>Slide thuyết trình <Text type="danger" strong>BẮT BUỘC</Text> lưu dưới định dạng <Tag color="error" style={{ margin: 0 }}>PDF</Tag>.</li>
              <li style={{ marginTop: 8 }}>Dung lượng file tải lên tối đa <Text strong>25MB</Text>.</li>
              <li style={{ marginTop: 8 }}>Mã nguồn phải ở chế độ <Text strong color="success">Public</Text> để Ban giám khảo chấm điểm.</li>
              <li style={{ marginTop: 8 }}>Hãy nộp sớm trước giờ chốt để tránh tắc nghẽn đường truyền.</li>
            </ul>
          </Card>
        </Col>

        <Col xs={24} lg={15} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            style={{
              borderRadius: 24,
              boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px -10px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.05)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '2px solid #cbd5e1',
              background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)' : '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
            styles={{ body: { padding: '32px 36px', flex: 1, display: 'flex', flexDirection: 'column' } }}
          >
            <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800, marginBottom: 24 }}>
              {isSubmitted ? 'Cập nhật Bài dự thi Chung kết' : 'Nộp Bài dự thi Vòng Chung kết'}
            </Title>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleFinish}
              disabled={isRejected}
              initialValues={existingSubmission || {}}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <Form.Item
                label={
                  <Text strong style={{ fontSize: 14, color: token.colorTextHeading }}>
                    File Slide Thuyết trình PDF {!hasSavedSlide && <span style={{ color: '#ff4d4f' }}>*</span>}
                  </Text>
                }
                required
                style={{ marginBottom: 24 }}
              >
                <Dragger
                  accept=".pdf,application/pdf"
                  maxCount={1}
                  beforeUpload={(file) => {
                    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                    if (!isPdf) {
                      message.error('Chỉ chấp nhận file PDF cho slide thuyết trình.');
                      return Upload.LIST_IGNORE;
                    }
                    setSlideFile(file);
                    return false;
                  }}
                  onRemove={() => setSlideFile(null)}
                  disabled={isRejected}
                  style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#eff6ff',
                    borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#60a5fa',
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderRadius: 16,
                    padding: '24px 0',
                  }}
                >
                  <p className="ant-upload-drag-icon">
                    <CloudUploadOutlined style={{ color: '#3b82f6', fontSize: 52 }} />
                  </p>
                  <p className="ant-upload-text" style={{ fontSize: 17, fontWeight: 700, color: token.colorTextHeading, marginTop: 14 }}>
                    Kéo thả file Slide PDF vào đây hoặc Nhấp để chọn
                  </p>
                  <p className="ant-upload-hint" style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                    Chỉ hỗ trợ định dạng .PDF (Tối đa 25MB)
                  </p>
                </Dragger>
                
                {(existingSubmission?.slideFile || existingSubmission?.slide_file || hasSavedSlide) && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: '12px 18px',
                      background: isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4',
                      border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0'}`,
                      borderRadius: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <Text style={{ color: isDark ? '#4ade80' : '#15803d', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircleOutlined style={{ fontSize: 18 }} />
                      Slide đã lưu: {submittedSlideName}
                    </Text>
                    {hasSavedSlide && submissionId && (
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        onClick={handleViewSubmittedSlide}
                        icon={<EyeOutlined />}
                        style={{ fontWeight: 700, borderRadius: 8 }}
                      >
                        Xem PDF
                      </Button>
                    )}
                  </div>
                )}
              </Form.Item>

              <Row gutter={20}>
                <Col xs={24} md={12}>
                  <Form.Item name="demoUrl" label={<Text strong style={{ fontSize: 14, color: token.colorTextHeading }}>Link Demo Sản phẩm (Live URL)</Text>} rules={[{ validator: validateOptionalUrl }]}>
                    <Input
                      prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="https://demo.example.com"
                      size="large"
                      style={{ borderRadius: 10, padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : undefined, color: token.colorTextHeading }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="repoUrl" label={<Text strong style={{ fontSize: 14, color: token.colorTextHeading }}>Link Source Code (Github/Gitlab)</Text>} rules={[{ validator: validateOptionalUrl }]}>
                    <Input
                      prefix={<GithubOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="https://github.com/team/project"
                      size="large"
                      style={{ borderRadius: 10, padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : undefined, color: token.colorTextHeading }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="reportUrl" label={<Text strong style={{ fontSize: 14, color: token.colorTextHeading }}>Link Báo cáo / Tài liệu (Nếu có)</Text>} rules={[{ validator: validateOptionalUrl }]}>
                    <Input
                      prefix={<FilePdfOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="https://docs.example.com/final-report"
                      size="large"
                      style={{ borderRadius: 10, padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.05)' : undefined, color: token.colorTextHeading }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {!isRejected && (
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  icon={<CloudUploadOutlined />}
                  loading={isSubmitting}
                  block
                  style={{
                    height: 52,
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    boxShadow: '0 6px 16px -4px rgba(37, 99, 235, 0.4)',
                    marginTop: 'auto',
                  }}
                >
                  {isSubmitted ? 'Cập nhật Bài Dự Thi Chung Kết' : 'Gửi Bài Dự Thi Chung Kết'}
                </Button>
              )}
            </Form>
          </Card>
        </Col>
      </Row>

        <Modal
          title={
            <Space>
              <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
              <span style={{ fontWeight: 700, fontSize: 18 }}>Chi tiết Slide: {submittedSlideName}</span>
            </Space>
          }
          open={isSlideModalVisible}
          onCancel={handleCloseSlideModal}
          width={1050}
          style={{ top: 20 }}
          footer={[
            <Button key="close" type="primary" size="large" onClick={handleCloseSlideModal} style={{ borderRadius: 8, fontWeight: 600 }}>
              Đóng Cửa Sổ
            </Button>,
          ]}
        >
          <div
            style={{
              height: '75vh',
              width: '100%',
              position: 'relative',
              background: '#e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)',
            }}
          >
            {isLoadingSlide ? (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: '#64748b', fontWeight: 600, fontSize: 15 }}>Đang tải và giải mã tệp PDF...</div>
              </div>
            ) : slideBlobUrl ? (
              <iframe
                src={`${slideBlobUrl}#toolbar=0`}
                title="PDF Viewer"
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
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


// ==========================================
// MAIN COMPONENT CHỨA CÁC ĐIỀU KIỆN EARLY RETURN
// ==========================================
const FinalSubmissionPanel = ({ teamId, hackathonId }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const submissionData = useFinalSubmission(teamId, hackathonId);

  // Early returns (Tuyệt đối không có Hook nào bên dưới dòng này)
  if (submissionData.isLoading) {
    return (
      <Card
        style={{
          borderRadius: 20,
          textAlign: 'center',
          padding: '32px 0',
          background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : token.colorBorderSecondary}`,
        }}
      >
        <Spin tip="Đang kiểm tra dữ liệu Cổng Nộp Bài Chung Kết..." size="large" />
      </Card>
    );
  }

  if (!submissionData.finalRound) {
    return (
      <Card
        style={{
          borderRadius: 20,
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)'
            : 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
          border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0'}`,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
              display: 'grid',
              placeItems: 'center',
              color: isDark ? '#fff' : '#475569',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              flexShrink: 0,
            }}
          >
            <ClockCircleOutlined style={{ fontSize: 26 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800 }}>
                Cổng nộp bài Vòng Chung kết
              </Title>
              <Tag color="default" style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, border: 0, margin: 0 }}>
                ⏳ CHƯA CÔNG BỐ
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.5, display: 'block' }}>
              Vòng Chung kết hiện chưa được công bố. Vui lòng quay lại sau khi Ban tổ chức chính thức kích hoạt vòng thi!
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!submissionData.isAdvanced) {
    return (
      <Card
        style={{
          borderRadius: 20,
          background: isDark
            ? 'linear-gradient(135deg, rgba(207, 19, 34, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)'
            : 'linear-gradient(135deg, #FFF2F0 0%, #FFFFFF 100%)',
          border: `2px solid ${isDark ? 'rgba(255, 77, 79, 0.4)' : '#FFCCC7'}`,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(207, 19, 34, 0.06)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #CF1322 0%, #FF4D4F 100%)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(207, 19, 34, 0.35)',
              flexShrink: 0,
            }}
          >
            <LockOutlined style={{ fontSize: 26 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800 }}>
                Cổng nộp bài Vòng Chung kết
              </Title>
              <Tag color="error" style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, border: 0, margin: 0 }}>
                🔴 ĐÃ DỪNG BƯỚC
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.5, display: 'block' }}>
              Đội của bạn đã dừng bước tại Vòng Sơ loại. Cảm ơn đội đã nỗ lực hết mình tại cuộc thi!
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!submissionData.isFinalRoundActive) {
    return (
      <Card
        style={{
          borderRadius: 20,
          background: isDark
            ? 'linear-gradient(135deg, rgba(212, 136, 6, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)'
            : 'linear-gradient(135deg, #FFFBE6 0%, #FFFFFF 100%)',
          border: `2px solid ${isDark ? 'rgba(255, 197, 61, 0.4)' : '#FFE58F'}`,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(212, 136, 6, 0.06)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #D48806 0%, #FFC53D 100%)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(212, 136, 6, 0.35)',
              flexShrink: 0,
            }}
          >
            <TrophyOutlined style={{ fontSize: 26 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800 }}>
                Cổng nộp bài Vòng Chung kết
              </Title>
              <Tag color="warning" style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, border: 0, margin: 0 }}>
                🏆 CHỜ MỞ CỔNG NỘP BÀI
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.5, display: 'block' }}>
              Chúc mừng đội bạn đã lọt vào Vòng Chung kết! Ban tổ chức sẽ sớm mở cổng nộp bài — vui lòng chuẩn bị sẵn tài liệu và theo dõi thông báo!
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!submissionData.isEligible) {
    return (
      <Card
        style={{
          borderRadius: 20,
          background: isDark
            ? 'linear-gradient(135deg, rgba(212, 136, 6, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)'
            : 'linear-gradient(135deg, #FFFBE6 0%, #FFFFFF 100%)',
          border: `2px solid ${isDark ? 'rgba(255, 197, 61, 0.4)' : '#FFE58F'}`,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(212, 136, 6, 0.06)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #D48806 0%, #FFC53D 100%)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(212, 136, 6, 0.35)',
              flexShrink: 0,
            }}
          >
            <ClockCircleOutlined style={{ fontSize: 26 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800 }}>
                Cổng nộp bài Vòng Chung kết
              </Title>
              <Tag color="warning" style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, border: 0, margin: 0 }}>
                ⏳ CHƯA THỂ NỘP BÀI
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.5, display: 'block' }}>
              Cổng nộp bài chưa sẵn sàng cho đội của bạn ở thời điểm hiện tại. Vui lòng kiểm tra lại sau hoặc liên hệ Ban tổ chức!
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  // Nếu qua hết các bài test trên, hiển thị Form
  return <FinalSubmissionForm {...submissionData} />;
};

export default FinalSubmissionPanel;