import { useState } from 'react';
import { Button, Card, message, Popconfirm, Space, Typography } from 'antd';
import { KeyOutlined, LogoutOutlined, SafetyOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { ROUTES } from '../../../shared/constants/routes';

const { Text, Paragraph } = Typography;

const AccountSecurityPanel = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      title={
        <Space>
          <SafetyOutlined /> Bảo mật tài khoản
        </Space>
      }
      style={{ marginTop: 24, borderRadius: 12 }}
    >
      <Paragraph type="secondary">
        Quản lý mật khẩu và phiên đăng nhập trên các thiết bị.
      </Paragraph>
      <Space wrap>
        <Link to={ROUTES.CHANGE_PASSWORD}>
          <Button icon={<KeyOutlined />}>Đổi mật khẩu</Button>
        </Link>
        <Popconfirm
          title="Đăng xuất tất cả thiết bị?"
          description="Bạn sẽ cần đăng nhập lại trên mọi thiết bị."
          onConfirm={handleLogoutAll}
          okText="Xác nhận"
          cancelText="Hủy"
        >
          <Button danger icon={<LogoutOutlined />} loading={loading}>
            Đăng xuất tất cả thiết bị
          </Button>
        </Popconfirm>
      </Space>
      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Phiên hiện tại vẫn dùng refresh token tự động khi access token hết hạn.
        </Text>
      </div>
    </Card>
  );
};

export default AccountSecurityPanel;
