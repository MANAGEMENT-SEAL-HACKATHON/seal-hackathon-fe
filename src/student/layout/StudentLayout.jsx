import { useMemo, useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Badge, Drawer, Grid, Space, theme, Typography, Tag } from 'antd';
import {
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { BarChart3, CalendarDays, FileCheck2, LayoutDashboard, Trophy, UsersRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';
import { useAppContext } from '../../app/AppContext';
import { authService } from '../../features/auth/services/authService';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

const StudentLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();
  const { darkMode, toggleDarkMode, notifications = [] } = useAppContext();
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  useEffect(() => {
    const handleUserInfoUpdated = () => {
      setCurrentUser(getStoredUser());
    };
    window.addEventListener('userInfoUpdated', handleUserInfoUpdated);
    return () => window.removeEventListener('userInfoUpdated', handleUserInfoUpdated);
  }, []);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const menuItems = useMemo(
    () => [
      {
        key: ROUTES.DASHBOARD,
        icon: <LayoutDashboard size={18} />,
        label: 'Tổng quan',
      },
      {
        key: ROUTES.STUDENT_TEAM,
        icon: <UsersRound size={18} />,
        label: 'Quản lý đội',
        disabled: currentUser.status !== 'APPROVED',
      },
      {
        key: ROUTES.STUDENT_SUBMIT,
        icon: <FileCheck2 size={18} />,
        label: 'Nộp bài thi',
        disabled: currentUser.status !== 'APPROVED',
      },
      {
        key: ROUTES.STUDENT_RESULTS,
        icon: <BarChart3 size={18} />,
        label: 'Kết quả thi đấu',
      },
      {
        key: 'student-schedule',
        icon: <CalendarDays size={18} />,
        label: 'Lịch sự kiện',
        disabled: true,
      },
      {
        key: ROUTES.PROFILE,
        icon: <FileCheck2 size={18} />,
        label: 'Hồ sơ',
      },
    ],
    [currentUser.status]
  );

  const handleMenuClick = ({ key }) => {
    if (isMobile) {
      setDrawerOpen(false);
    }

    if (
      key === ROUTES.DASHBOARD ||
      key === ROUTES.STUDENT_TEAM ||
      key === ROUTES.STUDENT_SUBMIT ||
      key === ROUTES.STUDENT_RESULTS ||
      key === ROUTES.PROFILE
    ) {
      navigate(key);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // Local session cleanup below still runs if logout API is unavailable.
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userInfo');
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  const sidebar = (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: collapsed && !isMobile ? '22px 16px' : '22px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #1677ff, #13c2c2)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 12px 28px rgba(22, 119, 255, 0.28)',
              flexShrink: 0,
            }}
          >
            <Trophy size={22} />
          </div>
          {(!collapsed || isMobile) && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: token.colorText, lineHeight: 1.1 }}>
                SEAL Student
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Không gian sinh viên
              </Text>
            </div>
          )}
        </div>
      </div>

      {(!collapsed || isMobile) && (
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              borderRadius: 16,
              padding: 14,
              background: darkMode ? 'rgba(22,119,255,0.13)' : 'rgba(22,119,255,0.08)',
              border: `1px solid ${darkMode ? 'rgba(64,150,255,0.24)' : 'rgba(22,119,255,0.12)'}`,
            }}
          >
            <Text strong style={{ display: 'block', color: token.colorText }}>
              {currentUser.fullName || currentUser.email || 'Sinh viên'}
            </Text>
            <Space size={6} wrap style={{ marginTop: 8 }}>
              <Tag color="blue" style={{ margin: 0, borderRadius: 999 }}>
                STUDENT
              </Tag>
              <Tag color={currentUser.status === 'APPROVED' ? 'success' : 'warning'} style={{ margin: 0, borderRadius: 999 }}>
                {currentUser.status || 'PENDING'}
              </Tag>
            </Space>
          </div>
        </div>
      )}

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0, flex: 1, background: 'transparent' }}
      />

      <div style={{ padding: 16, marginTop: 'auto' }}>
        <Button
          danger
          type="text"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          block={!collapsed || isMobile}
          style={{
            height: 42,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            gap: 8,
          }}
        >
          {(!collapsed || isMobile) && 'Đăng xuất'}
        </Button>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          closable={false}
          styles={{ body: { padding: 0, background: token.colorBgContainer }, wrapper: { width: 292 } }}
        >
          {sidebar}
        </Drawer>
      ) : (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme={darkMode ? 'dark' : 'light'}
          width={280}
          style={{
            position: 'fixed',
            inset: '0 auto 0 0',
            height: '100vh',
            zIndex: 10,
            overflow: 'auto',
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: darkMode ? '10px 0 30px rgba(0,0,0,0.2)' : '10px 0 30px rgba(15,23,42,0.04)',
          }}
        >
          {sidebar}
        </Sider>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 280, transition: 'margin-left 0.2s ease' }}>
        <Header
          style={{
            height: 68,
            padding: isMobile ? '0 12px' : '0 24px',
            background: darkMode ? 'rgba(20,20,20,0.94)' : 'rgba(255,255,255,0.94)',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            position: 'sticky',
            top: 0,
            zIndex: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            backdropFilter: 'blur(14px)',
            boxShadow: darkMode ? '0 10px 24px rgba(0,0,0,0.18)' : '0 10px 24px rgba(15,23,42,0.04)',
          }}
        >
          <Space size={12} align="center" style={{ minWidth: 0, flex: 1 }}>
            <Button
              type="text"
              icon={isMobile ? <MenuUnfoldOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed((value) => !value))}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, lineHeight: 1.2 }}>
              <Text
                strong
                style={{
                  display: 'block',
                  color: token.colorText,
                  fontSize: isMobile ? 15 : 16,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Student Workspace
              </Text>
              {!isMobile && (
                <Text
                  type="secondary"
                  style={{
                    display: 'block',
                    fontSize: 12,
                    lineHeight: 1.35,
                    marginTop: 3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Theo dõi hồ sơ, đội thi và lịch trình của bạn
                </Text>
              )}
            </div>
          </Space>

          <Space size={isMobile ? 6 : 10} align="center" style={{ flexShrink: 0 }}>
            <Badge count={unreadCount} size="small">
              <Button type="text" icon={<BellOutlined />} style={{ width: 42, height: 42, borderRadius: 12 }} />
            </Badge>
            <Button
              type="text"
              icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleDarkMode}
              style={{ width: 42, height: 42, borderRadius: 12 }}
            />
            <Avatar
              style={{
                background: 'linear-gradient(135deg, #1677ff, #13c2c2)',
                border: `2px solid ${token.colorBorder}`,
                cursor: 'pointer',
              }}
              onClick={() => navigate(ROUTES.PROFILE)}
            >
              {(currentUser.fullName || currentUser.email || 'S').charAt(0).toUpperCase()}
            </Avatar>
          </Space>
        </Header>

        <Content style={{ padding: isMobile ? 16 : 24, minHeight: 'calc(100vh - 68px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default StudentLayout;
