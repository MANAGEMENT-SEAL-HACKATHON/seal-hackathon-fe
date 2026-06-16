// Đường dẫn: src/student/features/submission/components/FinalSubmissionPanel.jsx
import React from 'react';
import { Card, Form, Input, Button, Typography, Tag, Space, Alert, Row, Col, Spin, message } from 'antd';
import { CloudUploadOutlined, LockOutlined, CloseCircleOutlined, CheckCircleOutlined, FilePdfOutlined, LinkOutlined } from '@ant-design/icons';
import { useFinalSubmission } from '../hooks/useFinalSubmission';

const { Title, Text, Paragraph } = Typography;

const FINAL_CRITERIA_CHECKLIST = [
  { label: 'Tính kỹ thuật & Công nghệ', weight: '30%' },
  { label: 'Tính Đổi mới sáng tạo', weight: '20%' },
  { label: 'Trải nghiệm người dùng (UX/UI)', weight: '20%' },
  { label: 'Tiềm năng thương mại hóa', weight: '20%' },
  { label: 'Mức độ hoàn thiện sản phẩm', weight: '10%' }
];

const FinalSubmissionPanel = ({ teamId, hackathonId }) => {
  const [form] = Form.useForm();
  
  const { 
    finalRound, 
    existingSubmission, 
    isEligible, 
    isLocked, 
    timeLeft, 
    isSubmitting, 
    isLoading, 
    submitFinalWork 
  } = useFinalSubmission(teamId, hackathonId);

  // Đang tải dữ liệu kiểm tra từ Backend
  if (isLoading) {
    return (
      <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 0' }}>
        <Spin tip="Đang kiểm tra dữ liệu Vòng Chung kết..." />
      </Card>
    );
  }

  // 1. Giải đấu chưa có Vòng Chung kết (Sự kiện mới tạo)
  if (!finalRound) {
    return null;
  }

  // 2. Đội thi KHÔNG đủ điều kiện vào Chung kết (đã bị ELIMINATED hoặc chưa thi xong Sơ loại)
  if (!isEligible) {
    return (
      <Card style={{ borderRadius: 16, border: '1px solid #ffccc7', background: '#fff2f0' }}>
        <Space align="center">
          <LockOutlined style={{ fontSize: 24, color: '#cf1322' }} />
          <div>
            <Title level={4} style={{ margin: 0, color: '#cf1322' }}>Cổng nộp bài Chung kết</Title>
            <Text style={{ color: '#cf1322' }}>Đội của bạn chưa đủ điều kiện tham gia Vòng Chung kết hoặc đã dừng bước tại Vòng Sơ loại.</Text>
          </div>
        </Space>
      </Card>
    );
  }

  const isSubmitted = !!existingSubmission;
  const deadline = finalRound.submissionDeadline || finalRound.submission_deadline;

  const handleFinish = async (values) => {
    await submitFinalWork({
      repoUrl: values.repoUrl || '',
      demoUrl: values.demoUrl || '',
      slideUrl: values.slideUrl || '', // Slide bắt buộc
      reportUrl: values.reportUrl || ''
    });
  };

  return (
    <Card 
      style={{ borderRadius: 16, border: isLocked && !isSubmitted ? '1px solid #ffccc7' : '1px solid #e2e8f0' }}
      styles={{ body: { padding: 32 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Space align="center" style={{ marginBottom: 8 }}>
            <Title level={3} style={{ margin: 0 }}>Nộp bài Chung kết</Title>
            {isSubmitted ? (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 600 }}>ĐÃ NỘP BÀI</Tag>
            ) : isLocked ? (
              <Tag color="error" icon={<CloseCircleOutlined />} style={{ fontWeight: 600, fontSize: 14, padding: '4px 8px' }}>
                REJECTED (Nộp muộn)
              </Tag>
            ) : (
              <Tag color="processing" style={{ fontWeight: 600 }}>ĐANG MỞ</Tag>
            )}
          </Space>
          <Text type="secondary" style={{ display: 'block' }}>
            Hạn chót: {deadline ? new Date(deadline).toLocaleString('vi-VN') : 'Chưa công bố'}
          </Text>
        </div>

        {/* Cụm Đếm ngược Deadline */}
        <div style={{ background: isLocked ? '#fff2f0' : '#e6f4ff', padding: '12px 24px', borderRadius: 12, border: `1px solid ${isLocked ? '#ffccc7' : '#bae0ff'}`, textAlign: 'center' }}>
          <Text style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isLocked ? '#cf1322' : '#0958d9' }}>
            {isLocked ? 'TRẠNG THÁI' : 'THỜI GIAN CÒN LẠI'}
          </Text>
          <Title level={4} style={{ margin: 0, color: isLocked ? '#cf1322' : '#1677ff', fontFamily: 'monospace' }}>
            {timeLeft}
          </Title>
        </div>
      </div>

      {isLocked && !isSubmitted && (
        <Alert
          message="Đã khóa cổng nộp bài"
          description="Thời gian nộp bài Chung kết đã kết thúc. Hệ thống đã khóa cứng (Hard-lock) toàn bộ form nộp bài theo quy định. Bài thi không được ghi nhận mang trạng thái REJECTED."
          type="error"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      <Row gutter={48}>
        {/* CỘT TRÁI: DANH SÁCH 5 TIÊU CHÍ */}
        <Col xs={24} lg={8}>
          <div style={{ background: '#fafafa', padding: 24, borderRadius: 12, border: '1px solid #f0f0f0', height: '100%' }}>
            <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FilePdfOutlined style={{ color: '#1677ff' }} />
              Yêu cầu & Tiêu chí
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              Sản phẩm của bạn sẽ được đánh giá qua 5 tiêu chí trọng tâm của Vòng Chung kết. Vui lòng đảm bảo tài liệu thuyết trình thể hiện rõ các yếu tố này:
            </Paragraph>
            
            <ul style={{ paddingLeft: 16, marginTop: 16 }}>
              {FINAL_CRITERIA_CHECKLIST.map((c, i) => (
                <li key={i} style={{ marginBottom: 12, color: '#434343', fontWeight: 500 }}>
                  {c.label} <Tag color="blue" style={{ marginLeft: 8 }}>{c.weight}</Tag>
                </li>
              ))}
            </ul>
          </div>
        </Col>

        {/* CỘT PHẢI: FORM UPLOAD (Nhập URL) */}
        <Col xs={24} lg={16}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            disabled={isLocked || isSubmitted}
            initialValues={existingSubmission || {}}
          >
            <Form.Item 
              name="slideUrl" 
              label={<span style={{ fontWeight: 600 }}>Link Slide Thuyết trình <span style={{color: 'red'}}>*</span></span>}
              rules={[{ required: true, message: 'Bắt buộc phải có Link Slide thuyết trình (Google Slides, Canva, v.v.)' }]}
            >
              <Input prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />} placeholder="https://..." size="large" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="demoUrl" label="Link Demo Sản phẩm (Nếu có)">
                  <Input prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />} placeholder="https://..." size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="repoUrl" label="Link Source Code (Github/Gitlab)">
                  <Input prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />} placeholder="https://github.com/..." size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="reportUrl" label="Link Báo cáo bổ sung (Tùy chọn)">
              <Input prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />} placeholder="https://..." size="large" style={{ borderRadius: 8 }} />
            </Form.Item>

            {!isSubmitted && (
              <Button 
                type="primary" 
                size="large" 
                htmlType="submit" 
                icon={<CloudUploadOutlined />} 
                loading={isSubmitting}
                disabled={isLocked}
                style={{ 
                  width: 200, 
                  height: 48, 
                  borderRadius: 12, 
                  fontWeight: 700,
                  background: isLocked ? '#d9d9d9' : '#1677ff',
                  borderColor: isLocked ? '#d9d9d9' : '#1677ff'
                }}
              >
                Gửi Bài Dự Thi
              </Button>
            )}
          </Form>
        </Col>
      </Row>
    </Card>
  );
};

export default FinalSubmissionPanel;