import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Result, Spin, Typography, message } from 'antd';
import { ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { ROUTES } from '../../../shared/constants/routes';

const { Title, Paragraph } = Typography;

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';
  const [status, setStatus] = useState(tokenFromUrl ? 'verifying' : 'form');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!tokenFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        await authService.verifyEmail(tokenFromUrl);
        if (!cancelled) setStatus('success');
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          message.error(error?.message || 'Link xác thực không hợp lệ hoặc đã hết hạn.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenFromUrl]);

  const handleResend = async (values) => {
    setResendLoading(true);
    try {
      await authService.resendVerification(values.email);
      message.success('Nếu email tồn tại và chưa xác thực, chúng tôi đã gửi lại link.');
    } catch (error) {
      message.error(error?.message || 'Không gửi được email xác thực.');
    } finally {
      setResendLoading(false);
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
      <Card style={{ width: '100%', maxWidth: 480, borderRadius: 16 }} styles={{ body: { padding: 32 } }}>
        <Link to={ROUTES.LOGIN} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <ArrowLeftOutlined /> Quay lại đăng nhập
        </Link>

        {status === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>Đang xác thực email...</Paragraph>
          </div>
        )}

        {status === 'success' && (
          <Result
            status="success"
            title="Email đã được xác thực"
            subTitle="Bạn có thể đăng nhập và hoàn thiện hồ sơ."
            extra={
              <Button type="primary" onClick={() => navigate(ROUTES.LOGIN, { replace: true })}>
                Đăng nhập
              </Button>
            }
          />
        )}

        {status === 'error' && (
          <>
            <Result status="error" title="Không xác thực được email" subTitle="Link có thể đã hết hạn." />
            <Title level={5}>Gửi lại email xác thực</Title>
            <Form layout="vertical" onFinish={handleResend}>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Nhập email đã đăng ký' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="email@fpt.edu.vn" size="large" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block size="large" loading={resendLoading}>
                Gửi lại email xác thực
              </Button>
            </Form>
          </>
        )}

        {status === 'form' && (
          <>
            <Title level={3} style={{ marginBottom: 8 }}>Xác thực email</Title>
            <Paragraph type="secondary">
              Dán token từ email hoặc mở link xác thực trực tiếp. Bạn cũng có thể gửi lại email nếu chưa nhận được.
            </Paragraph>
            <Form
              layout="vertical"
              style={{ marginTop: 24 }}
              onFinish={async (values) => {
                setStatus('verifying');
                try {
                  await authService.verifyEmail(values.token);
                  setStatus('success');
                } catch (error) {
                  setStatus('error');
                  message.error(error?.message || 'Token không hợp lệ.');
                }
              }}
              initialValues={{ token: tokenFromUrl }}
            >
              <Form.Item name="token" label="Token" rules={[{ required: true, message: 'Nhập token' }]}>
                <Input placeholder="verification-token-from-email" size="large" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block size="large">
                Xác thực
              </Button>
            </Form>
            <Paragraph type="secondary" style={{ marginTop: 24, marginBottom: 8 }}>
              Chưa nhận được email?
            </Paragraph>
            <Form layout="vertical" onFinish={handleResend}>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="email@fpt.edu.vn" />
              </Form.Item>
              <Button htmlType="submit" block loading={resendLoading}>
                Gửi lại email xác thực
              </Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
