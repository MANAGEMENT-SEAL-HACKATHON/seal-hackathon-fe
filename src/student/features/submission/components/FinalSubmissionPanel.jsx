// src/student/features/submission/components/FinalSubmissionPanel.jsx
import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, Tag, Space, Alert, Row, Col, Spin, Upload, Modal, message } from 'antd';
import {
  CloudUploadOutlined,
  LockOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useFinalSubmission } from '../hooks/useFinalSubmission';
import { criteriaService } from '../../../../features/criteria/services/criteriaService';
import { studentSubmissionService } from '../services/studentSubmission.service';

const { Title, Text, Paragraph } = Typography;

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
    <Card
      style={{
        borderRadius: 16,
        border: (isLocked || isRejected) && !isSubmitted ? '1px solid #ffccc7' : '1px solid #e2e8f0',
      }}
      styles={{ body: { padding: 32 } }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Space align="center" style={{ marginBottom: 8 }}>
            <Title level={3} style={{ margin: 0 }}>
              Nộp bài Chung kết
            </Title>
            {isSubmitted ? (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 600 }}>
                ĐÃ NỘP BÀI
              </Tag>
            ) : isRejected ? (
              <Tag
                color="error"
                icon={<CloseCircleOutlined />}
                style={{ fontWeight: 600, fontSize: 14, padding: '4px 8px' }}
              >
                REJECTED
              </Tag>
            ) : isLocked ? (
              <Tag color="warning" icon={<ClockCircleOutlined />} style={{ fontWeight: 600 }}>
                HẾT HẠN
              </Tag>
            ) : (
              <Tag color="processing" style={{ fontWeight: 600 }}>
                ĐANG MỞ
              </Tag>
            )}
          </Space>
          <Text type="secondary" style={{ display: 'block' }}>
            Hạn chót: {deadline ? new Date(deadline).toLocaleString('vi-VN') : 'Chưa công bố'}
          </Text>
        </div>

        <div
          style={{
            background: isLocked ? '#fff2f0' : '#e6f4ff',
            padding: '12px 24px',
            borderRadius: 12,
            border: `1px solid ${isLocked ? '#ffccc7' : '#bae0ff'}`,
            textAlign: 'center',
          }}
        >
          <Text
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: isLocked ? '#cf1322' : '#0958d9',
            }}
          >
            {isLocked ? 'TRẠNG THÁI' : 'THỜI GIAN CÒN LẠI'}
          </Text>
          <Title
            level={4}
            style={{ margin: 0, color: isLocked ? '#cf1322' : '#1677ff', fontFamily: 'monospace' }}
          >
            {timeLeft}
          </Title>
        </div>
      </div>

      {isRejected && (
        <Alert
          message="Bài nộp bị từ chối (REJECTED)"
          description="Bài nộp Chung kết đã bị hệ thống từ chối do quá hạn (HARD_LOCK). Không thể nộp lại."
          type="error"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {isLocked && !isSubmitted && !isRejected && (
        <Alert
          message="Đã quá hạn nộp bài"
          description="Thời gian nộp Chung kết đã kết thúc. Bạn vẫn có thể gửi để hệ thống ghi nhận trạng thái REJECTED (HARD_LOCK)."
          type="warning"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {submissionIncomplete && !isLocked && (
        <Alert
          message="Nộp file thất bại — cần nộp lại"
          description="File slide PDF chưa được lưu thành công. Vui lòng chọn file PDF hợp lệ và nộp lại."
          type="warning"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {isSubmitted && (
        <Alert
          message="Bài nộp đã được ghi nhận"
          description="Nếu bạn vừa cập nhật repo hoặc demo, hệ thống có thể cần thêm thời gian để đồng bộ và kiểm tra quyền truy cập công khai."
          type="success"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      <Row gutter={48}>
        <Col xs={24} lg={8}>
          <div
            style={{
              background: '#fafafa',
              padding: 24,
              borderRadius: 12,
              border: '1px solid #f0f0f0',
              height: '100%',
            }}
          >
            <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FilePdfOutlined style={{ color: '#1677ff' }} />
              Yêu cầu & Tiêu chí
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              Sản phẩm của bạn sẽ được đánh giá theo tiêu chí Vòng Chung kết từ hệ thống. Vui lòng đảm bảo slide thể hiện rõ các yếu tố này:
            </Paragraph>

            {criteriaLoading ? (
              <Spin size="small" />
            ) : criteria.length === 0 ? (
              <Text type="secondary">Chưa có tiêu chí Chung kết — liên hệ Coordinator.</Text>
            ) : (
              <ul style={{ paddingLeft: 16, marginTop: 16 }}>
                {criteria.map((c) => (
                  <li key={c.id} style={{ marginBottom: 12, color: '#434343', fontWeight: 500 }}>
                    {c.name || c.criterionName}{' '}
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {formatWeight(c.weight)}
                    </Tag>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Col>

        <Col xs={24} lg={16}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            disabled={isRejected || isSubmitted}
            initialValues={existingSubmission || {}}
          >
            <Form.Item
              label={
                <span style={{ fontWeight: 600 }}>
                  File Slide Thuyết trình PDF <span style={{ color: 'red' }}>*</span>
                </span>
              }
              required
            >
              <Upload
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
                disabled={isRejected || isSubmitted}
              >
                <Button icon={<CloudUploadOutlined />} disabled={isRejected || isSubmitted}>Chọn file PDF</Button>
              </Upload>
              
              {(existingSubmission?.slideFile || existingSubmission?.slide_file || hasSavedSlide) && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
                  <Text style={{ color: '#389e0d', fontWeight: 600, display: 'block' }}>
                    <CheckCircleOutlined style={{ marginRight: 6 }} />
                    Slide đã nộp: {submittedSlideName}
                  </Text>
                  {hasSavedSlide && submissionId && (
                    <div 
                      onClick={handleViewSubmittedSlide} 
                      style={{ marginTop: 8, color: '#1677ff', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e6f4ff', padding: '4px 10px', borderRadius: 6 }}
                    >
                      <EyeOutlined /> Bấm vào đây để xem nội dung PDF
                    </div>
                  )}
                </div>
              )}
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="demoUrl" label="Link Demo Sản phẩm (Nếu có)" rules={[{ validator: validateOptionalUrl }]}>
                  <Input
                    prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="https://..."
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="repoUrl" label="Link Source Code (Github/Gitlab)" rules={[{ validator: validateOptionalUrl }]}>
                  <Input
                    prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="https://github.com/..."
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="reportUrl" label="Link Báo cáo (Nếu có)" rules={[{ validator: validateOptionalUrl }]}>
                  <Input
                    prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="https://docs.example.com/final-report"
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
            </Row>
            {!isSubmitted && !isRejected && (
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                icon={<CloudUploadOutlined />}
                loading={isSubmitting}
                style={{
                  width: 200,
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 700,
                }}
              >
                Gửi Bài Dự Thi
              </Button>
            )}
          </Form>
        </Col>
      </Row>

      <Modal
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#ff4d4f' }} />
            <span>Slide đã nộp: {submittedSlideName}</span>
          </Space>
        }
        open={isSlideModalVisible}
        onCancel={handleCloseSlideModal}
        width={1000}
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={handleCloseSlideModal}>
            Đóng
          </Button>,
        ]}
      >
        <div
          style={{
            height: '75vh',
            width: '100%',
            position: 'relative',
            background: '#f0f2f5',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {isLoadingSlide ? (
            <div style={{ textAlign: 'center', paddingTop: '30vh' }}>
              <Spin size="large" tip="Đang tải file slide..." />
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
            <div style={{ textAlign: 'center', paddingTop: '30vh', color: '#ff4d4f' }}>
              Không thể hiển thị file PDF.
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
};

// ==========================================
// MAIN COMPONENT CHỨA CÁC ĐIỀU KIỆN EARLY RETURN
// ==========================================
const FinalSubmissionPanel = ({ teamId, hackathonId }) => {
  const submissionData = useFinalSubmission(teamId, hackathonId);

  // Early returns (Tuyệt đối không có Hook nào bên dưới dòng này)
  if (submissionData.isLoading) {
    return (
      <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 0' }}>
        <Spin tip="Đang kiểm tra dữ liệu Vòng Chung kết..." />
      </Card>
    );
  }

  if (!submissionData.finalRound) {
    return (
      <Card style={{ borderRadius: 16, border: '1px solid #d9d9d9', background: '#fafafa' }}>
        <Space align="center">
          <ClockCircleOutlined style={{ fontSize: 24, color: '#595959' }} />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Cổng nộp bài Chung kết
            </Title>
            <Text type="secondary">
              Chưa có thông tin vòng Chung kết cho hackathon này. Hãy quay lại sau khi Ban tổ chức hoàn tất cấu hình.
            </Text>
          </div>
        </Space>
      </Card>
    );
  }

  if (!submissionData.isAdvanced) {
    return (
      <Card style={{ borderRadius: 16, border: '1px solid #ffccc7', background: '#fff2f0' }}>
        <Space align="center">
          <LockOutlined style={{ fontSize: 24, color: '#cf1322' }} />
          <div>
            <Title level={4} style={{ margin: 0, color: '#cf1322' }}>
              Cổng nộp bài Chung kết
            </Title>
            <Text style={{ color: '#cf1322' }}>
              Đội của bạn chưa đủ điều kiện tham gia Vòng Chung kết hoặc đã dừng bước tại Vòng Sơ loại.
            </Text>
          </div>
        </Space>
      </Card>
    );
  }

  if (!submissionData.isFinalRoundActive) {
    return (
      <Card style={{ borderRadius: 16, border: '1px solid #ffe58f', background: '#fffbe6' }}>
        <Space align="center">
          <ClockCircleOutlined style={{ fontSize: 24, color: '#d48806' }} />
          <div>
            <Title level={4} style={{ margin: 0, color: '#d48806' }}>
              Vòng Chung kết chưa mở
            </Title>
            <Text style={{ color: '#ad6800' }}>
              Đội của bạn đã được chọn vào Chung kết. Coordinator sẽ kích hoạt vòng thi — bạn có thể nộp bài sau khi vòng được mở.
            </Text>
          </div>
        </Space>
      </Card>
    );
  }

  if (!submissionData.isEligible) {
    return (
      <Card style={{ borderRadius: 16, border: '1px solid #ffe58f', background: '#fffbe6' }}>
        <Space align="center">
          <ClockCircleOutlined style={{ fontSize: 24, color: '#d48806' }} />
          <div>
            <Title level={4} style={{ margin: 0, color: '#ad6800' }}>
              Chưa thể nộp bài Chung kết
            </Title>
            <Text style={{ color: '#ad6800' }}>
              Hệ thống đã nhận diện vòng Chung kết nhưng đội của bạn chưa đủ điều kiện nộp bài ở thời điểm hiện tại. Vui lòng kiểm tra lại sau.
            </Text>
          </div>
        </Space>
      </Card>
    );
  }

  // Nếu qua hết các bài test trên, hiển thị Form
  return <FinalSubmissionForm {...submissionData} />;
};

export default FinalSubmissionPanel;