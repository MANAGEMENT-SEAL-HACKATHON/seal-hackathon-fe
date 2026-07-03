import { useState } from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { ROUTES } from '../../../shared/constants/routes';

const { Title, Paragraph } = Typography;

const ResetPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authService.resetPassword({
        token: values.token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      message.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      message.error(error?.message || 'Không thể đặt lại mật khẩu. Token có thể đã hết hạn.');
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
        <Title level={3} style={{ marginBottom: 8 }}>Đặt lại mật khẩu</Title>
        <Paragraph type="secondary">
          Dán token từ email (hoặc từ Coordinator trong môi trường dev) và nhập mật khẩu mới.
        </Paragraph>

        <Form
          layout="vertical"
          onFinish={onFinish}
          style={{ marginTop: 24 }}
          initialValues={{ token: tokenFromUrl }}
        >
          <Form.Item
            name="token"
            label="Token"
            rules={[{ required: true, message: 'Vui lòng nhập token' }]}
          >
            <Input placeholder="reset-token-from-email" size="large" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 8, message: 'Tối thiểu 8 ký tự' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Cập nhật mật khẩu
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
