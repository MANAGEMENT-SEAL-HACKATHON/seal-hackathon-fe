// src/shared/components/layout/MainLayout.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout, Menu, Button, theme, Input, Badge, Avatar, Space, Popover, Typography, Drawer, Grid, Modal } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  SearchOutlined, 
  SettingOutlined, 
  QuestionCircleOutlined,
  LogoutOutlined,
  PlusOutlined,
  SunOutlined,
  MoonOutlined,
  LinkOutlined
} from '@ant-design/icons';
import {
  LayoutDashboard, Trophy, Users, HelpCircle,
  UserCheck, UserPlus, User,
  FileText, ClipboardCheck, History, CheckSquare, BarChart3, Settings
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useAppContext } from '../../../app/AppContext';
import SocialLinkManager from '../../../features/auth/components/SocialLinkManager';
import { useCoordinatorTodos } from '../../../features/notifications/hooks/useCoordinatorTodos';
import { authService } from '../../../features/auth/services/authService';
import NotificationBell from '../ui/NotificationBell';

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

  const { items: todoItems, total: todoTotal } = useCoordinatorTodos(isCoordinatorOrAdmin);
  const latePendingCount = todoItems.find((item) => item.key === 'late-submissions')?.count ?? 0;

  let menuItems;

  if (userRole === 'COORDINATOR' || userRole === 'ADMIN') {
    menuItems = [
      { key: ROUTES.DASHBOARD, icon: <LayoutDashboard size={18} />, label: 'Tổng quan' },
      { key: ROUTES.PROFILE, icon: <User size={18} />, label: 'Trang cá nhân' },
      { key: ROUTES.HACKATHONS, icon: <Trophy size={18} />, label: 'Cấu hình sự kiện' },
      { key: ROUTES.GLOBAL_TEAMS, icon: <Users size={18} />, label: 'Quản lý đội thi' },
      { key: ROUTES.COORDINATOR_ANALYTICS, icon: <BarChart3 size={18} />, label: 'Phân tích & dữ liệu' },
      { key: ROUTES.COORDINATOR_FINAL_CONFIG, icon: <Settings size={18} />, label: 'Cấu hình chung kết' },
      {
        key: ROUTES.COORDINATOR_LATE_SUBMISSIONS,
        icon: <ClipboardCheck size={18} />,
        label: (
          <Badge count={latePendingCount || 0} size="small" offset={[10, 0]} showZero={false}>
            <span>Duyệt nộp muộn</span>
          </Badge>
        ),
      },
      { key: ROUTES.PRESENTATION_QUEUE, icon: <History size={18} />, label: 'Hàng đợi thuyết trình' },
      { key: ROUTES.USER_APPROVAL, icon: <UserCheck size={18} />, label: 'Duyệt tài khoản' },
      { key: ROUTES.TEMP_JUDGES, icon: <UserPlus size={18} />, label: 'Giám khảo khách' },
    ];
  } else if (userRole === 'JUDGE' || userRole === 'TEMP_JUDGE') {
    menuItems = [
      { key: ROUTES.JUDGE_DASHBOARD, icon: <LayoutDashboard size={18} />, label: 'Tổng quan' },
      // THÊM MENU PHÒNG CHẤM THI VÀO ĐÂY
      { key: '/judge/assignments', icon: <ClipboardCheck size={18} />, label: 'Phòng chấm thi' },
      { key: ROUTES.JUDGE_CRITERIA, icon: <FileText size={18} />, label: 'Tiêu chí đánh giá' },
      { key: ROUTES.PROFILE, icon: <User size={18} />, label: 'Trang cá nhân' },
    ];
  } else if (userRole === 'MENTOR') {
    menuItems = [
      { key: ROUTES.DASHBOARD, icon: <LayoutDashboard size={18} />, label: 'Overview' },
      { key: ROUTES.MENTOR_ROUNDS, icon: <Users size={18} />, label: 'Support Teams' },
      { key: ROUTES.MENTOR_HISTORY, icon: <History size={18} />, label: 'Lịch sử mentor' },
      { key: ROUTES.PRESENTATION_QUEUE, icon: <History size={18} />, label: 'Presentation Queue' },
      { key: ROUTES.PROFILE, icon: <User size={18} />, label: 'Profile' },
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
    { key: 'logout-all', icon: <LogoutOutlined />, label: 'Đăng xuất tất cả thiết bị' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ];

  const clearSessionAndRedirect = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    navigate(ROUTES.LOGIN);
  };

  const handleMenuClick = ({ key }) => {
    if (isMobile) setDrawerVisible(false);
    navigate(key);
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
        clearSessionAndRedirect();
      }
    }
    if (key === 'logout-all') {
      try {
        await authService.logoutAll();
      } catch (error) {
        console.error('Logout all error:', error);
      } finally {
        clearSessionAndRedirect();
      }
    }
  };

  // UI Helpers
  const todoContent = (
    <div style={{ width: 300 }}>
      <div style={{ padding: '8px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Text strong>Việc cần làm</Text>
      </div>
      {todoItems.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: token.colorTextDisabled }}>
          Không có việc cần làm
        </div>
      ) : (
        todoItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              role="button"
              tabIndex={0}
              onClick={() => navigate(item.route)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(item.route);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 8px',
                cursor: 'pointer',
                borderRadius: 6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = token.colorBgTextHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} />
                <Text>{item.label}</Text>
              </div>
              <Badge count={item.count} showZero style={{ backgroundColor: item.count > 0 ? token.colorWarning : token.colorTextDisabled }} />
            </div>
          );
        })
      )}
    </div>
  );

  const siderContent = (
    <>
      {userRole === 'MENTOR' ? (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '10px', height: 80 }}>
          <img src="/logo.jpg" alt="SEAL Hackathon Logo" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 8 }} />
          {(!collapsed || isMobile) && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>Mentor Portal</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>Management Cockpit</div>
            </div>
          )}
        </div>
      ) : (
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
      )}
      
      {(!collapsed || isMobile) && (userRole === 'COORDINATOR' || userRole === 'ADMIN') && (
        <div style={{ padding: '0 16px 24px' }}>
          <Button type="primary" icon={<PlusOutlined />} block size="large" style={{ height: 48, borderRadius: 8, fontWeight: 600 }} onClick={() => { if(isMobile) setDrawerVisible(false); navigate(ROUTES.HACKATHON_CREATE); }}>Tạo sự kiện mới</Button>
        </div>
      )}
      
      {userRole === 'MENTOR' ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 80px)', justifyContent: 'space-between' }}>
          <Menu
            mode="inline"
            selectedKeys={[
              location.pathname.startsWith('/mentor/support') || location.pathname === ROUTES.MENTOR_ROUNDS
                ? ROUTES.MENTOR_ROUNDS
                : location.pathname
            ]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
          />
          
          {/* Bottom part */}
          <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6' }}>
            {/* Button View Active Round */}
            <button style={{
              background: '#111827',
              color: 'white',
              borderRadius: '10px',
              padding: '12px 16px',
              fontWeight: 600,
              fontSize: '14px',
              width: '100%',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} onClick={() => navigate(ROUTES.MENTOR_SUPPORT)}>
              View Active Round
            </button>
            
            {/* Support Center & Logout links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px 12px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                fontSize: '14px', 
                color: '#374151',
                cursor: 'pointer',
                padding: '6px 0'
              }} onClick={() => navigate('/support-center')}>
                <HelpCircle size={18} />
                <span>Support Center</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                fontSize: '14px', 
                color: '#6B7280',
                cursor: 'pointer',
                padding: '6px 0'
              }} onClick={() => handleBottomMenuClick({ key: 'logout-all' })}>
                <LogoutOutlined style={{ fontSize: '18px' }} />
                <span>Logout all devices</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                fontSize: '14px', 
                color: '#EF4444',
                cursor: 'pointer',
                padding: '6px 0'
              }} onClick={() => handleBottomMenuClick({ key: 'logout' })}>
                <LogoutOutlined style={{ fontSize: '18px' }} />
                <span>Logout</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 180px)', justifyContent: 'space-between' }}>
          <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={handleMenuClick} style={{ borderRight: 0 }} />
          <Menu mode="inline" items={bottomMenuItems} style={{ borderRight: 0, marginBottom: 24 }} onClick={handleBottomMenuClick} />
        </div>
      )}
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <style>{`
        .mentor-sider {
          background-color: white !important;
          border-right: 1px solid #E5E7EB !important;
        }
        .mentor-sider .ant-layout-sider-children {
          background-color: white !important;
        }
        .mentor-sider .ant-menu {
          background-color: white !important;
        }
        .mentor-sider .ant-menu-item {
          border-radius: 8px !important;
          margin: 4px 8px !important;
          font-size: 14px !important;
          color: #374151 !important;
        }
        .mentor-sider .ant-menu-item-selected {
          background-color: #00C851 !important;
          color: white !important;
          font-weight: 600 !important;
        }
        .mentor-sider .ant-menu-item-selected .ant-menu-title-content {
          color: white !important;
        }
        .mentor-sider .ant-menu-item-selected svg {
          color: white !important;
        }
      `}</style>
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
        <Sider trigger={null} collapsible collapsed={collapsed} theme={darkMode ? 'dark' : 'light'} width={260} className={userRole === 'MENTOR' ? 'mentor-sider' : ''} style={{ boxShadow: darkMode ? '2px 0 8px 0 rgba(0,0,0,.15)' : '2px 0 8px 0 rgba(29,35,41,.03)', zIndex: 10, position: 'fixed', height: '100vh', left: 0, top: 0, bottom: 0 }}>
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
            {isCoordinatorOrAdmin && (
              <Popover content={todoContent} trigger="click" placement="bottomRight" arrow={false}>
                <Badge count={todoTotal} offset={[-4, 4]} showZero={false}>
                  <Button type="text" icon={<CheckSquare size={20} />} title="Việc cần làm" />
                </Badge>
              </Popover>
            )}
            <NotificationBell
              notifications={notifications}
              markAsRead={markAsRead}
              darkMode={darkMode}
            />
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
            {userRole === 'MENTOR' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate(ROUTES.PROFILE)}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Mentor Pham</span>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>Expert Lead</span>
                </div>
                <Avatar 
                  style={{ backgroundColor: '#52C41A', verticalAlign: 'middle', cursor: 'pointer' }} 
                  size="large"
                >
                  M
                </Avatar>
              </div>
            ) : (
              <Avatar 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                style={{ cursor: 'pointer', border: `2px solid ${token.colorBorder}` }} 
                onClick={() => navigate(ROUTES.PROFILE)}
              />
            )}
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
