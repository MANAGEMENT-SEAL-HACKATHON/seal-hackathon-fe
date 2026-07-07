import { useState } from 'react';
import { Button, Card, message, Popconfirm, Space, Typography, theme } from 'antd';
import { KeyOutlined, LogoutOutlined, SafetyOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { ROUTES } from '../../../shared/constants/routes';

const { Text, Paragraph, Title } = Typography;

const AccountSecurityPanel = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  const handleLogoutAll = async () => {
    setLoading(true);
    try {
      await authService.logoutAll();
      message.success('Đã đăng xuất khỏi tất cả thiết bị.');
    } catch (error) {
      message.error(error?.message || 'Không thể đăng xuất toàn bộ thiết bị.');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userInfo');
      setLoading(false);
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  return (
    <Card
      style={{
        marginTop: 24,
        borderRadius: 24,
        background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.04)',
      }}
      styles={{ body: { padding: 24 } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            padding: 10,
            background: isDark ? 'rgba(0, 82, 156, 0.2)' : '#eff6ff',
            borderRadius: 14,
            display: 'flex',
            border: '1px solid rgba(0, 82, 156, 0.3)',
            color: '#00529C',
          }}
        >
          <SafetyOutlined style={{ fontSize: 22 }} />
        </div>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 800, color: token.colorTextHeading }}>
            Bảo Mật & Phiên Đăng Nhập
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Quản lý mật khẩu và các thiết bị đang đăng nhập vào tài khoản của bạn
          </Text>
        </div>
      </div>

      <Paragraph style={{ color: token.colorTextSecondary, marginBottom: 20, fontSize: 14 }}>
        Để đảm bảo an toàn cho tài khoản thi đấu Hackathon, hãy thay đổi mật khẩu định kỳ hoặc đăng xuất khỏi các thiết bị lạ.
      </Paragraph>

      <Space wrap size={14}>
        <Link to={ROUTES.CHANGE_PASSWORD}>
          <Button
            type="default"
            icon={<KeyOutlined />}
            style={{
              height: 44,
              borderRadius: 14,
              fontWeight: 700,
              padding: '0 20px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
              color: token.colorText,
            }}
          >
            Đổi mật khẩu
          </Button>
        </Link>
        <Popconfirm
          title="Đăng xuất tất cả thiết bị?"
          description="Bạn sẽ cần đăng nhập lại trên mọi thiết bị hiện tại."
          onConfirm={handleLogoutAll}
          okText="Xác nhận"
          cancelText="Hủy"
        >
          <Button
            danger
            type="primary"
            icon={<LogoutOutlined />}
            loading={loading}
            style={{
              height: 44,
              borderRadius: 14,
              fontWeight: 700,
              padding: '0 20px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
            }}
          >
            Đăng xuất tất cả thiết bị
          </Button>
        </Popconfirm>
      </Space>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          🔒 Phiên làm việc được mã hóa an toàn và tự động làm mới token đăng nhập khi hết hạn.
        </Text>
      </div>
    </Card>
  );
};

export default AccountSecurityPanel;
