import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout, Menu, Button, theme, Input, Badge, Avatar, Space, Popover, Typography, Drawer, Grid, Modal } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  SearchOutlined, 
  BellOutlined, 
  SettingOutlined, 
  QuestionCircleOutlined,
  LogoutOutlined,
  PlusOutlined,
  SunOutlined,
  MoonOutlined,
  LinkOutlined
} from '@ant-design/icons';
import {
  LayoutDashboard, Trophy, Users, Activity, BarChart3, Settings, HelpCircle,
  Mail, CalendarClock, AlertTriangle, CheckCheck, UserCheck, UserPlus, User,
  FileText
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useAppContext } from '../../../app/AppContext';
import SocialLinkManager from '../../../features/auth/components/SocialLinkManager';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [socialLinkModalOpen, setSocialLinkModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  // Lấy dữ liệu global từ AppContext
  const { notifications, markAsRead, darkMode, toggleDarkMode } = useAppContext();

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && !currentUser.role) {
      import('../../../features/auth/services/userService')
        .then(({ userService }) => userService.getMe())
        .then((res) => {
          const info = {
            email: res?.email || res?.data?.email,
            status: res?.status || res?.data?.status,
            role: res?.role || res?.data?.role,
            userId: res?.userId || res?.id || res?.data?.userId || res?.data?.id,
          };
          localStorage.setItem('userInfo', JSON.stringify(info));
          setCurrentUser(info);

          // Force redirect if temporary judge must change password
          if (res?.mustChangePassword || res?.data?.mustChangePassword || res?.mustChangePassword === true) {
            window.location.replace('/change-password');
            return;
          }
        })
        .catch((err) => {
          console.error('Failed to auto-fetch user profile:', err);
        });
    }
  }, [currentUser.role]);

  useEffect(() => {
    const handleUserInfoUpdated = () => {
      try {
        const info = JSON.parse(localStorage.getItem('userInfo') || '{}');
        setCurrentUser(info);
      } catch {
        // no-op
      }
    };
    window.addEventListener('userInfoUpdated', handleUserInfoUpdated);
    return () => window.removeEventListener('userInfoUpdated', handleUserInfoUpdated);
  }, []);

  // PHÂN LUỒNG MENU DỰA VÀO ROLE
  const userRole = currentUser?.role;
  const isCoordinatorOrAdmin = userRole === 'COORDINATOR' || userRole === 'ADMIN';
  let menuItems;

  if (userRole === 'COORDINATOR' || userRole === 'ADMIN') {
    menuItems = [
      { key: ROUTES.DASHBOARD, icon: <LayoutDashboard size={18} />, label: 'Tổng quan' },
      { key: ROUTES.PROFILE, icon: <User size={18} />, label: 'Trang cá nhân' },
      { key: ROUTES.HACKATHONS, icon: <Trophy size={18} />, label: 'Cấu hình Sự kiện' },
      { key: ROUTES.GLOBAL_TEAMS, icon: <Users size={18} />, label: 'Quản lý Đội thi' },
      { key: ROUTES.USER_APPROVAL, icon: <UserCheck size={18} />, label: 'Duyệt tài khoản' },
      { key: ROUTES.TEMP_JUDGES, icon: <UserPlus size={18} />, label: 'Giám khảo khách' },
      { key: 'monitor', icon: <Activity size={18} />, label: 'Giám sát Real-time' },
      { key: 'analytics', icon: <BarChart3 size={18} />, label: 'Phân tích dữ liệu' },
      { key: 'settings', icon: <Settings size={18} />, label: 'Cài đặt Hệ thống' },
    ];
  } else if (userRole === 'JUDGE' || userRole === 'TEMP_JUDGE') {
    menuItems = [
      { key: ROUTES.JUDGE_DASHBOARD, icon: <LayoutDashboard size={18} />, label: 'Tổng quan' },
      { key: ROUTES.JUDGE_CRITERIA, icon: <FileText size={18} />, label: 'Tiêu chí Đánh giá' },
      { key: ROUTES.PROFILE, icon: <User size={18} />, label: 'Trang cá nhân' },
    ];
  } else if (userRole === 'STUDENT') {
    menuItems = [
      { key: ROUTES.DASHBOARD, icon: <LayoutDashboard size={18} />, label: 'Tổng quan' },
      { key: ROUTES.PROFILE, icon: <User size={18} />, label: 'Trang cá nhân' },
      { key: ROUTES.HACKATHONS, icon: <Trophy size={18} />, label: 'Sự kiện Hackathon' },
      { key: ROUTES.GLOBAL_TEAMS, icon: <Users size={18} />, label: 'Đội thi của tôi' },
    ];
  } else {
    menuItems = [
      { key: ROUTES.DASHBOARD, icon: <LayoutDashboard size={18} />, label: 'Tổng quan' },
    ];
  }

  const bottomMenuItems = [
    { key: 'help', icon: <HelpCircle size={18} />, label: 'Trung tâm Hỗ trợ' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ];

  const handleMenuClick = ({ key }) => {
    if (isMobile) setDrawerVisible(false);
    // Bỏ qua các key dùng tạm làm UI (chưa có route thật)
    if (key !== 'monitor' && key !== 'analytics' && key !== 'settings') {
      navigate(key);
    }
  };

  const handleBottomMenuClick = async ({ key }) => {
    if (isMobile) setDrawerVisible(false);
    if (key === 'logout') {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          await axios.post('/api/v1/auth/logout', { refreshToken });
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        navigate(ROUTES.LOGIN);
      }
    }
  };

  // UI Helpers cho Notification
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotifConfig = (type) => {
    switch(type) {
      case 'INVITATION': return { icon: <Mail size={16} color={token.colorPrimary} />, bg: darkMode ? '#111a2c' : '#e6f4ff' };
      case 'REMINDER': return { icon: <CalendarClock size={16} color={token.colorSuccess} />, bg: darkMode ? '#11211b' : '#f6ffed' };
      case 'WARNING': return { icon: <AlertTriangle size={16} color={token.colorWarning} />, bg: darkMode ? '#272015' : '#fffbe6' };
      default: return { icon: <BellOutlined style={{color: token.colorPrimary}}/>, bg: darkMode ? '#111a2c' : '#e6f4ff' };
    }
  };

  const notificationContent = (
    <div style={{ width: 340 }}>
      <div style={{ padding: '8px 0', borderBottom: `1px solid ${token.colorBorderSecondary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Thông báo hệ thống</Text>
        <Button type="link" size="small" onClick={() => markAsRead('ALL')} disabled={unreadCount === 0} icon={<CheckCheck size={14} />}>
          Đã đọc tất cả
        </Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: token.colorTextDisabled }}>
            Không có thông báo mới
          </div>
        ) : (
          notifications.slice(0, 5).map(item => {
            const config = getNotifConfig(item.type);
            return (
              <div 
                key={item.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  padding: '12px 8px', 
                  cursor: 'pointer', 
                  opacity: item.is_read ? 0.6 : 1, 
                  transition: 'background 0.3s', 
                  borderRadius: 6 
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = token.colorBgTextHover}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => markAsRead(item.id)}
              >
                <Avatar 
                  style={{ backgroundColor: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }} 
                  icon={config.icon} 
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: item.is_read ? 400 : 600, color: token.colorText, marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>{item.time}</Text>
                  </div>
                </div>
                {!item.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: token.colorPrimary, marginLeft: 8, marginTop: 6, flexShrink: 0 }} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const siderContent = (
    <>
      <div style={{ height: 80, display: 'flex', alignItems: 'center', padding: '0 24px', marginBottom: 8 }}>
        <img src="/logo.jpg" alt="SEAL Hackathon Logo" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, marginRight: 12, flexShrink: 0 }} />
        {(!collapsed || isMobile) && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: token.colorText, lineHeight: '1.2', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>HackOS</div>
            <div style={{ fontSize: 12, color: token.colorTextSecondary || '#8c8c8c', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {isCoordinatorOrAdmin ? 'Quản trị viên Doanh nghiệp' : (userRole === 'JUDGE' ? 'Cổng Giám Khảo SEAL' : 'Thí sinh SEAL')}
            </div>
          </div>
        )}
      </div>
      {(!collapsed || isMobile) && (userRole === 'COORDINATOR' || userRole === 'ADMIN') && (
        <div style={{ padding: '0 16px 24px' }}>
          <Button type="primary" icon={<PlusOutlined />} block size="large" style={{ height: 48, borderRadius: 8, fontWeight: 600 }} onClick={() => { if(isMobile) setDrawerVisible(false); navigate(ROUTES.HACKATHON_CREATE); }}>Tạo Sự kiện Mới</Button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 180px)', justifyContent: 'space-between' }}>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={handleMenuClick} style={{ borderRight: 0 }} />
        <Menu mode="inline" items={bottomMenuItems} style={{ borderRight: 0, marginBottom: 24 }} onClick={handleBottomMenuClick} />
      </div>
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      {isMobile ? (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          styles={{ body: { padding: 0 } }}
        >
          {siderContent}
        </Drawer>
      ) : (
        <Sider trigger={null} collapsible collapsed={collapsed} theme={darkMode ? 'dark' : 'light'} width={260} style={{ boxShadow: darkMode ? '2px 0 8px 0 rgba(0,0,0,.15)' : '2px 0 8px 0 rgba(29,35,41,.03)', zIndex: 10, position: 'fixed', height: '100vh', left: 0, top: 0, bottom: 0 }}>
          {siderContent}
        </Sider>
      )}
      
      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 260), transition: 'all 0.2s' }}>
        <Header style={{ padding: isMobile ? '0 16px' : '0 24px', background: token.colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: darkMode ? '0 1px 4px rgba(0,0,0,.2)' : '0 1px 4px rgba(0,21,41,.05)', position: 'sticky', top: 0, zIndex: 9, height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Button type="text" icon={isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)} onClick={() => isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed)} style={{ fontSize: '16px', width: 40, height: 40, marginRight: 16 }} />
            {!isMobile && <Input prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />} placeholder="Tìm kiếm nhóm, giám khảo, cài đặt..." style={{ maxWidth: 400, borderRadius: 8, background: token.colorFillTertiary, border: 'none', height: 40, color: token.colorText }} />}
          </div>
          
          <Space size={isMobile ? 8 : 20}>
            {isMobile && <Button type="text" icon={<SearchOutlined style={{ fontSize: 20 }} />} />}
            <Popover content={notificationContent} trigger="click" placement="bottomRight" arrow={false}>
              <Badge count={unreadCount} offset={[-4, 4]}>
                <Button type="text" icon={<BellOutlined style={{ fontSize: 20 }} />} />
              </Badge>
            </Popover>
            <Button 
              type="text" 
              icon={darkMode ? <SunOutlined style={{ fontSize: 20 }} /> : <MoonOutlined style={{ fontSize: 20 }} />} 
              onClick={toggleDarkMode}
              title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            />
            <Button
              type="text"
              icon={<LinkOutlined style={{ fontSize: 20 }} />}
              title="Liên kết tài khoản mạng xã hội"
              onClick={() => setSocialLinkModalOpen(true)}
            />
            {!isMobile && <Button type="text" icon={<SettingOutlined style={{ fontSize: 20 }} />} />}
            {!isMobile && <Button type="text" icon={<QuestionCircleOutlined style={{ fontSize: 20 }} />} />}
            <Avatar 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
              style={{ cursor: 'pointer', border: `2px solid ${token.colorBorder}` }} 
              onClick={() => navigate(ROUTES.PROFILE)}
            />
          </Space>
        </Header>
        
        <Content style={{ margin: isMobile ? '16px' : '24px', minHeight: 280, borderRadius: token.borderRadiusLG }}>
          {children}
        </Content>
      </Layout>

      <Modal
        title="Liên kết tài khoản mạng xã hội"
        open={socialLinkModalOpen}
        onCancel={() => setSocialLinkModalOpen(false)}
        footer={null}
      >
        <SocialLinkManager />
      </Modal>
    </Layout>
  );
};

export default MainLayout;
