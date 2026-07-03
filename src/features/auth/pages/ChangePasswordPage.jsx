import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { LockOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { ROUTES } from '../../../shared/constants/routes';

const ChangePasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
      message.success('Đổi mật khẩu thành công! Bạn đang được chuyển về trang chính.');
      
      // Update local storage flag if any
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (userInfo.mustChangePassword) {
        userInfo.mustChangePassword = false;
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
      }
      
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      console.error('Change password error:', error);
      const errorMsg = error?.message || error?.data?.error?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại!';
      message.error(errorMsg);
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
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
            background: 'linear-gradient(90deg, #ff4d4f, #ff7875)',
          }}
        />

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 'bold',
              margin: '0 0 12px 0',
              background: 'linear-gradient(90deg, #ff4d4f, #ff7875)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Đổi mật khẩu bắt buộc
          </h1>
          <p style={{ color: '#4b5563', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            Tài khoản giám khảo khách của bạn yêu cầu đổi mật khẩu trước khi tiếp tục truy cập hệ thống.
          </p>
        </div>

        <Form
          form={form}
          name="change_password_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            label={<span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>MẬT KHẨU HIỆN TẠI</span>}
            name="currentPassword"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
            style={{ marginBottom: '20px' }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />}
              placeholder="Nhập mật khẩu hiện tại"
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

          <Form.Item
            label={<span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>MẬT KHẨU MỚI</span>}
            name="newPassword"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
              { min: 8, message: 'Mật khẩu mới phải có ít nhất 8 ký tự!' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                message: 'Cần ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt!',
              },
            ]}
            style={{ marginBottom: '20px' }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />}
              placeholder="Nhập mật khẩu mới"
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

          <Form.Item
            label={<span style={{ color: '#4b5563', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>XÁC NHẬN MẬT KHẨU MỚI</span>}
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không trùng khớp!'));
                },
              }),
            ]}
            style={{ marginBottom: '28px' }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />}
              placeholder="Xác nhận mật khẩu mới"
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

          <Form.Item style={{ marginBottom: 0 }}>
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
                background: 'linear-gradient(90deg, #ff4d4f, #ff7875)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              Đổi mật khẩu & Tiếp tục <ArrowRightOutlined />
            </Button>
          </Form.Item>
        </Form>
      </div>

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
          border-color: #ff4d4f !important;
          box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.1) !important;
        }
        .ant-form-item-label > label {
          color: #4b5563 !important;
        }
      `}</style>
    </div>
  );
};

export default ChangePasswordPage;
