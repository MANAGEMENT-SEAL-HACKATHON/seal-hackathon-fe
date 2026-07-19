import { useMemo, useState } from 'react';
import { Form, Input, Button, message, Modal, Radio, Select } from 'antd';
import {
  MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone,
  ArrowRightOutlined, GithubOutlined, IdcardOutlined, BankOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { GoogleSocialButton } from '../components/GoogleSocialButton';
import { ROUTES } from '../../../shared/constants/routes';
import { authService, persistAuthTokens } from '../services/authService';
import { resolveOAuthError } from '../constants/oauthErrors';
import { startGithubOAuth } from '../utils/githubOAuth';

// ---------------------------------------------------------------------------
// Error code mapping theo BE contract
// ---------------------------------------------------------------------------
const REGISTER_ERROR_MESSAGES = {
  ACCOUNT_DUPLICATE_EMAIL: 'Email này đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập!',
  VALIDATION_FAILED: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin!',
};

const CHAPTERS = [
  { id: 1, name: 'FPT Hà Nội' },
  { id: 2, name: 'FPT Hồ Chí Minh' },
  { id: 3, name: 'FPT Đà Nẵng' },
  { id: 4, name: 'FPT Cần Thơ' },
];

const resolveRegisterError = (error) => {
  const code = error?.code || error?.data?.error?.code;
  return REGISTER_ERROR_MESSAGES[code] || error?.message || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại!';
};

// ---------------------------------------------------------------------------
const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingOAuthAction, setPendingOAuthAction] = useState(null);
  const [passwordConfirmLoading, setPasswordConfirmLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const userType = Form.useWatch('userType', form) || 'INTERNAL';

  // ── OAuth Google (register page also supports social login) ──────────────
  const runGoogleOAuthLogin = async (tokenValue, existingAccountPassword) => {
    if (!tokenValue) {
      message.error('Không nhận được token từ nhà cung cấp OAuth.');
      return;
    }
    setLoading(true);
    try {
      const authData = await authService.loginWithGoogle(tokenValue, existingAccountPassword);
      persistAuthTokens(authData);

      // Social login → may be PENDING → redirect handled in login flow via onboarding
      handlePostLoginRedirect(authData);
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

  const handlePostLoginRedirect = (authData) => {
    const role = authData?.role || authData?.user?.role;
    const status = authData?.status || authData?.user?.status;
    const userInfo = {
      email: authData?.email || authData?.user?.email,
      status,
      role,
      userId: authData?.userId || authData?.user?.userId || authData?.user?.id
    };
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    message.success('Đăng ký tài khoản thành công!');
    window.location.replace(ROUTES.DASHBOARD);
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

  // ── Register form submit ─────────────────────────────────────────────────
  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authService.register({
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        userType: values.userType,
        studentCode: values.studentCode,
        ...(values.userType === 'INTERNAL'
          ? { chapterId: values.chapterId }
          : { institution: values.institution }),
      });
      message.success('Đăng ký thành công! Kiểm tra email để xác thực tài khoản trước khi đăng nhập.');
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error('Register error:', error);
      message.error(resolveRegisterError(error));
    } finally {
      setLoading(false);
    }
  };

  const socialRowItemStyle = useMemo(() => ({ flex: '1 1 0', minWidth: 0 }), []);
  const socialButtonStyle = useMemo(() => ({
    height: '40px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    color: '#374151',
    borderRadius: '16px',
    fontWeight: '600',
  }), []);

  // ── Render ────────────────────────────────────────────────────────────────
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
          style={{ backgroundColor: '#0072ff', color: '#fff', border: 'none', borderRadius: '20px', padding: '0 24px', fontWeight: '600', height: '36px' }}
          onClick={() => navigate(ROUTES.LOGIN)}
        >
          Đăng nhập
        </Button>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            border: '1px solid rgba(255,255,255,0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #0072ff, #00e5ff)' }} />

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1
              style={{
                fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0',
                background: 'linear-gradient(90deg, #0072ff, #00e5ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Tham gia cùng chúng tôi
            </h1>
            <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}>
              Đăng ký nhanh — hoàn thiện hồ sơ sau khi đăng nhập.
            </p>
          </div>

          {/* Info banner */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 13,
            color: '#1e40af',
            lineHeight: 1.5,
          }}>
            Chọn đúng đối tượng và khai báo thông tin sinh viên. Sau khi đăng ký,
            kiểm tra email để xác thực tài khoản và chờ Coordinator duyệt.
          </div>

          <Form
            form={form}
            name="register_form"
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            initialValues={{ userType: 'INTERNAL', chapterId: 1 }}
          >
            <Form.Item
              label={<span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600' }}>ĐỐI TƯỢNG</span>}
              name="userType"
              rules={[{ required: true, message: 'Vui lòng chọn đối tượng!' }]}
            >
              <Radio.Group data-testid="register-user-type" buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                <Radio.Button value="INTERNAL" style={{ flex: 1, textAlign: 'center' }}>Sinh viên FPT</Radio.Button>
                <Radio.Button value="EXTERNAL" style={{ flex: 1, textAlign: 'center' }}>Sinh viên ngoài FPT</Radio.Button>
              </Radio.Group>
            </Form.Item>

            {userType === 'INTERNAL' ? (
              <Form.Item
                label={<span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600' }}>CƠ SỞ</span>}
                name="chapterId"
                rules={[{ required: true, message: 'Vui lòng chọn cơ sở!' }]}
              >
                <Select
                  data-testid="register-chapter-id"
                  style={{ height: 48 }}
                  options={CHAPTERS.map((chapter) => ({ value: chapter.id, label: chapter.name }))}
                />
              </Form.Item>
            ) : (
              <Form.Item
                label={<span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600' }}>TRƯỜNG / TỔ CHỨC</span>}
                name="institution"
                rules={[{ required: true, message: 'Vui lòng nhập trường / tổ chức!' }]}
              >
                <Input
                  data-testid="register-institution"
                  prefix={<BankOutlined style={{ color: '#0072ff', marginRight: 8 }} />}
                  placeholder="Đại học Bách Khoa..."
                  style={{ height: 48, borderRadius: 16 }}
                />
              </Form.Item>
            )}

            <Form.Item
              label={<span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600' }}>MÃ SINH VIÊN</span>}
              name="studentCode"
              rules={[{ required: true, message: 'Vui lòng nhập mã sinh viên!' }]}
            >
              <Input
                data-testid="register-student-code"
                prefix={<IdcardOutlined style={{ color: '#0072ff', marginRight: 8 }} />}
                placeholder={userType === 'INTERNAL' ? 'SE123456' : 'Mã sinh viên trường bạn'}
                style={{ height: 48, borderRadius: 16 }}
              />
            </Form.Item>

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
                placeholder="example@fpt.edu.vn"
                style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827', height: '48px', borderRadius: '16px' }}
                className="custom-input"
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>MẬT KHẨU</span>}
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                { min: 8, message: 'Mật khẩu phải từ 8 ký tự trở lên!' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                  message: 'Cần chữ hoa, thường, số và ký tự đặc biệt (vd: Student@123)!',
                },
              ]}
              style={{ marginBottom: '20px' }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#0072ff', marginRight: '8px' }} />}
                placeholder="Student@123"
                iconRender={(visible) => (visible ? <EyeTwoTone twoToneColor="#4b5563" /> : <EyeInvisibleOutlined style={{ color: '#9ca3af' }} />)}
                style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827', height: '48px', borderRadius: '16px' }}
                className="custom-input"
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>XÁC NHẬN MẬT KHẨU</span>}
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                  },
                }),
              ]}
              style={{ marginBottom: '28px' }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#0072ff', marginRight: '8px' }} />}
                placeholder="Nhập lại mật khẩu"
                iconRender={(visible) => (visible ? <EyeTwoTone twoToneColor="#4b5563" /> : <EyeInvisibleOutlined style={{ color: '#9ca3af' }} />)}
                style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827', height: '48px', borderRadius: '16px' }}
                className="custom-input"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '24px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                data-testid="register-submit"
                style={{
                  width: '100%', height: '48px', borderRadius: '16px', fontSize: '16px',
                  fontWeight: 'bold', border: 'none',
                  background: 'linear-gradient(90deg, #0072ff, #00e5ff)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                Đăng ký <ArrowRightOutlined />
              </Button>
            </Form.Item>

            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
              <span style={{ padding: '0 12px', color: '#9ca3af', fontSize: '12px' }}>HOẶC</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={socialRowItemStyle}>
                <Button block icon={<GithubOutlined />} style={socialButtonStyle} onClick={handleGithubLogin} loading={loading}>
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
              <span style={{ color: '#4b5563' }}>Đã có tài khoản? </span>
              <a onClick={() => navigate(ROUTES.LOGIN)} style={{ color: '#0072ff', fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer' }}>
                Đăng nhập ngay
              </a>
            </div>
          </Form>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 40px', backgroundColor: 'transparent' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '1px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>HACKATHON</div>
        <div style={{ color: '#f3f4f6', fontSize: '12px', fontWeight: '500', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>© 2024 HACKATHON. ALL RIGHTS RESERVED.</div>
        <div style={{ display: 'flex', gap: '24px', color: '#ffffff', fontSize: '13px', fontWeight: '500', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Discord</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Twitter</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>GitHub</a>
        </div>
      </footer>

      {/* OAuth password confirmation modal */}
      <Modal
        open={passwordModalOpen}
        title="Xác nhận mật khẩu để liên kết tự động"
        onCancel={() => { setPasswordModalOpen(false); setPendingOAuthAction(null); }}
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
        .custom-input { overflow: hidden !important; }
        .custom-input input::placeholder, .custom-input .ant-input::placeholder { color: #9ca3af !important; }
        .custom-input input, .custom-input .ant-input-password {
          background-color: transparent !important; color: #111827 !important; border-radius: 16px !important;
        }
        .custom-input .ant-input { background-color: transparent !important; color: #111827 !important; border-radius: 16px !important; }
        .custom-input:hover, .custom-input:focus-within {
          border-color: #0072ff !important; box-shadow: 0 0 0 2px rgba(0,114,255,0.1) !important;
        }
        .ant-form-item-label > label { color: #4b5563 !important; }
        .custom-input input:-webkit-autofill,
        .custom-input input:-webkit-autofill:hover,
        .custom-input input:-webkit-autofill:focus,
        .custom-input input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #f9fafb inset !important;
          -webkit-text-fill-color: #111827 !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
