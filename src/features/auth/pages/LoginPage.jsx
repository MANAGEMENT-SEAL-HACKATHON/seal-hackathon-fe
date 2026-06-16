import { useEffect, useMemo, useState } from 'react';
import { Form, Input, Button, message, Modal } from 'antd';
import { MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone, ArrowRightOutlined, GithubOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleSocialButton } from '../components/GoogleSocialButton';
import { ROUTES } from '../../../shared/constants/routes';
import { authService, persistAuthTokens } from '../services/authService';
import { resolveOAuthError } from '../constants/oauthErrors';
import { startGithubOAuth } from '../utils/githubOAuth';

// ---------------------------------------------------------------------------
// Error code mapping theo BE contract mới
// ---------------------------------------------------------------------------
const LOGIN_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  ACCOUNT_PENDING: 'Tài khoản của bạn đang chờ xét duyệt. Sinh viên có thể đăng nhập và hoàn thiện hồ sơ.',
  ACCOUNT_PENDING_NOT_ALLOWED_LOGIN: 'Tài khoản của bạn chưa được phê duyệt. Vui lòng đợi Coordinator duyệt hồ sơ.',
  REJECTED_NOT_ALLOWED_LOGIN: 'Tài khoản đã bị từ chối. Vui lòng liên hệ Coordinator để được hỗ trợ.',
  INVITATION_EXPIRED: 'Lời mời tham gia của bạn đã hết hạn.',
  TEMP_JUDGE_HACKATHON_ENDED: 'Sự kiện Hackathon đã kết thúc. Tài khoản giám khảo tạm thời không còn hiệu lực.',
};

const resolveLoginError = (error) => {
  const code = error?.code || error?.data?.error?.code;
  return LOGIN_ERROR_MESSAGES[code] || error?.message || 'Có lỗi xảy ra khi đăng nhập. Vui lòng kiểm tra lại thông tin!';
};

/**
 * After login, determine where to send the user:
 *  - STUDENT + PENDING  → /onboarding  (hoàn thiện hồ sơ)
 *  - everyone else      → /  (dashboard)
 */
const resolvePostLoginRoute = (authData) => {
  return ROUTES.DASHBOARD;
};

const persistUserInfo = (authData) => {
  try {
    const userInfo = {
      email: authData?.email || authData?.user?.email,
      status: authData?.status || authData?.user?.status,
      role: authData?.role || authData?.user?.role,
      userId: authData?.userId || authData?.user?.userId || authData?.user?.id,
    };
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  } catch {
    // no-op
  }
};

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingOAuthAction, setPendingOAuthAction] = useState(null);
  const [passwordConfirmLoading, setPasswordConfirmLoading] = useState(false);
  const [passwordForm] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  // Hiển thị thông báo khi bị đá ra do token hết hạn
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('reason') === 'session_expired') {
      message.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      // Xóa query param khỏi URL để tránh hiển thị lại khi refresh
      navigate(location.pathname, { replace: true });
    }
  }, []);

  const runGoogleOAuthLogin = async (tokenValue, existingAccountPassword) => {
    if (!tokenValue) {
      message.error('Không nhận được token từ nhà cung cấp OAuth.');
      return;
    }

    setLoading(true);
    try {
      const authData = await authService.loginWithGoogle(tokenValue, existingAccountPassword);

      persistAuthTokens(authData);
      persistUserInfo(authData);

      if (authData?.mustChangePassword || authData?.user?.mustChangePassword) {
        message.warning('Tài khoản yêu cầu đổi mật khẩu trước khi sử dụng!');
        navigate(ROUTES.CHANGE_PASSWORD);
        return;
      }

      const destination = resolvePostLoginRoute(authData);
      if (destination === ROUTES.ONBOARDING) {
        message.success('Đăng nhập thành công! Hãy hoàn thiện hồ sơ để được duyệt.');
      } else {
        message.success('Đăng nhập Google thành công!');
      }
      window.location.replace(destination);
    } catch (error) {
      const resolved = resolveOAuthError(error, 'Đăng nhập Google thất bại.');
      if (resolved.requiresPassword) {
        setPendingOAuthAction({ provider: 'GOOGLE', tokenValue });
        setPasswordModalOpen(true);
        passwordForm.resetFields();
      } else {
        message.error(resolved.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = () => {
    try {
      startGithubOAuth();
    } catch (error) {
      message.error(error.message || 'Không thể bắt đầu đăng nhập GitHub.');
    }
  };

  const handlePasswordConfirm = async () => {
    try {
      const values = await passwordForm.validateFields();
      if (!pendingOAuthAction) {
        setPasswordModalOpen(false);
        return;
      }

      setPasswordConfirmLoading(true);
      await runGoogleOAuthLogin(pendingOAuthAction.tokenValue, values.existingAccountPassword);
      setPasswordModalOpen(false);
      setPendingOAuthAction(null);
    } finally {
      setPasswordConfirmLoading(false);
    }
  };

  const socialRowItemStyle = useMemo(
    () => ({
      flex: '1 1 0',
      minWidth: 0,
    }),
    []
  );

  const socialButtonStyle = useMemo(
    () => ({
      height: '40px',
      backgroundColor: '#ffffff',
      border: '1px solid #d1d5db',
      color: '#374151',
      borderRadius: '16px',
      fontWeight: '600',
    }),
    []
  );

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const authData = await authService.login(values.email, values.password);
      persistAuthTokens(authData);
      persistUserInfo(authData);
      
      if (authData?.mustChangePassword || authData?.user?.mustChangePassword) {
        message.warning('Tài khoản yêu cầu đổi mật khẩu trước khi sử dụng!');
        navigate(ROUTES.CHANGE_PASSWORD);
        return;
      }

      const destination = resolvePostLoginRoute(authData);
      if (destination === ROUTES.ONBOARDING) {
        message.success('Đăng nhập thành công! Hãy hoàn thiện hồ sơ để được Coordinator duyệt.');
      } else {
        message.success('Đăng nhập thành công!');
      }
      navigate(destination);
    } catch (error) {
      console.error('Login error:', error);
      message.error(resolveLoginError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f3f4f6',
        backgroundImage: `url('https://daihoc.fpt.edu.vn/wp-content/uploads/2022/08/dai-hoc-fpt-tp-hcm-1.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        fontFamily: "'Inter', sans-serif",
        color: '#111827',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
          borderBottom: 'none',
          backgroundColor: 'transparent',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '1px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          HACKATHON
        </div>
        <nav style={{ display: 'flex', gap: '30px', color: '#ffffff', fontSize: '14px', fontWeight: '500', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>About</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Schedules</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Prizes</a>
        </nav>
        <Button
          style={{
            backgroundColor: '#0072ff',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            padding: '0 24px',
            fontWeight: '600',
            height: '36px',
          }}
          onClick={() => navigate(ROUTES.REGISTER)}
        >
          Register
        </Button>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: 'rgba(237, 228, 224, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid #0072ff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #0072ff, #00e5ff)',
            }}
          />
          
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                margin: '0 0 12px 0',
                background: 'linear-gradient(90deg, #0072ff, #00e5ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Chào mừng trở lại
            </h1>
            <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}>
              Đăng nhập để tiếp tục hành trình sáng tạo của bạn.
            </p>
          </div>

          <Form
            name="login_form"
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
          >
            <Form.Item
              label={<span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>EMAIL</span>}
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập Email!' },
                { type: 'email', message: 'Email không hợp lệ!' },
              ]}
              style={{ marginBottom: '20px' }}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#0072ff', marginRight: '8px' }} />}
                placeholder="example@hackathon.com"
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  color: '#111827',
                  height: '48px',
                  borderRadius: '16px',
                }}
                className="custom-input"
              />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>MẬT KHẨU</span>
              <a href="#" style={{ color: '#0072ff', fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>
                Quên mật khẩu?
              </a>
            </div>
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
              style={{ marginBottom: '28px' }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#0072ff', marginRight: '8px' }} />}
                placeholder="••••••••"
                iconRender={(visible) => (visible ? <EyeTwoTone twoToneColor="#4b5563" /> : <EyeInvisibleOutlined style={{ color: '#9ca3af' }} />)}
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  color: '#111827',
                  height: '48px',
                  borderRadius: '16px',
                }}
                className="custom-input"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '24px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '16px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  border: 'none',
                  background: 'linear-gradient(90deg, #0072ff, #00e5ff)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Đăng nhập <ArrowRightOutlined />
              </Button>
            </Form.Item>

            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
              <span style={{ padding: '0 12px', color: '#9ca3af', fontSize: '12px' }}>HOẶC</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={socialRowItemStyle}>
                <Button
                  block
                  icon={<GithubOutlined />}
                  style={socialButtonStyle}
                  onClick={handleGithubLogin}
                  loading={loading}
                >
                  GitHub
                </Button>
              </div>
              <GoogleSocialButton
                wrapperStyle={socialRowItemStyle}
                buttonStyle={socialButtonStyle}
                loading={loading}
                onSuccess={async (credentialResponse) => {
                  await runGoogleOAuthLogin(credentialResponse?.credential);
                }}
                onError={() => message.error('Đăng nhập Google thất bại!')}
              />
            </div>

            <div style={{ textAlign: 'center', fontSize: '14px' }}>
              <span style={{ color: '#4b5563' }}>Chưa có tài khoản? </span>
              <a onClick={() => navigate(ROUTES.REGISTER)} style={{ color: '#0072ff', fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer' }}>
                Đăng ký ngay
              </a>
            </div>
          </Form>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '30px 40px',
          backgroundColor: 'transparent',
          borderTop: 'none',
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '1px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          HACKATHON
        </div>
        <div style={{ color: '#f3f4f6', fontSize: '12px', fontWeight: '500', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          © 2024 HACKATHON. ALL RIGHTS RESERVED.
        </div>
        <div style={{ display: 'flex', gap: '24px', color: '#ffffff', fontSize: '13px', fontWeight: '500', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Discord</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Twitter</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>GitHub</a>
        </div>
      </footer>

      <Modal
        open={passwordModalOpen}
        title="Xác nhận mật khẩu để liên kết tự động"
        onCancel={() => {
          setPasswordModalOpen(false);
          setPendingOAuthAction(null);
        }}
        onOk={handlePasswordConfirm}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={passwordConfirmLoading}
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            label="Mật khẩu tài khoản hiện tại"
            name="existingAccountPassword"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu để tiếp tục auto-link" />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .custom-input {
          overflow: hidden !important;
        }
        .custom-input input::placeholder, .custom-input .ant-input::placeholder {
          color: #9ca3af !important;
        }
        .custom-input input, .custom-input .ant-input-password {
          background-color: transparent !important;
          color: #111827 !important;
          border-radius: 16px !important;
        }
        .custom-input .ant-input {
          background-color: transparent !important;
          color: #111827 !important;
          border-radius: 16px !important;
        }
        .custom-input:hover, .custom-input:focus-within {
          border-color: #0072ff !important;
          box-shadow: 0 0 0 2px rgba(0, 114, 255, 0.1) !important;
        }
        .ant-form-item-label > label {
          color: #4b5563 !important;
        }
        /* Fix cho màu nền tự động điền (autofill) của trình duyệt */
        .custom-input input:-webkit-autofill,
        .custom-input input:-webkit-autofill:hover, 
        .custom-input input:-webkit-autofill:focus, 
        .custom-input input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #f9fafb inset !important;
          -webkit-text-fill-color: #111827 !important;
          transition: background-color 5000s ease-in-out 0s;
          border-radius: 0 !important;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
