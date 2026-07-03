import { useState } from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { ROUTES } from '../../../shared/constants/routes';

const { Title, Text, Paragraph } = Typography;

const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onFinish = async ({ email }) => {
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
      message.success('Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.');
    } catch (error) {
      message.error(error?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 440, borderRadius: 16 }} styles={{ body: { padding: 32 } }}>
        <Link to={ROUTES.LOGIN} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <ArrowLeftOutlined /> Quay lại đăng nhập
        </Link>
        <Title level={3} style={{ marginBottom: 8 }}>Quên mật khẩu</Title>
        <Paragraph type="secondary">
          Nhập email đã đăng ký. Chúng tôi sẽ gửi link đặt lại mật khẩu nếu tài khoản tồn tại.
        </Paragraph>

        {sent ? (
          <div style={{ marginTop: 24 }}>
            <Text>Đã gửi yêu cầu. Kiểm tra hộp thư (và thư rác) hoặc liên hệ Coordinator nếu không nhận được email.</Text>
            <div style={{ marginTop: 16 }}>
              <Link to={`${ROUTES.RESET_PASSWORD}?email=demo`}>Đã có token? Đặt lại mật khẩu</Link>
            </div>
          </div>
        ) : (
          <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@fpt.edu.vn" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Gửi link đặt lại mật khẩu
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
