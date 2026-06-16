import React, { useEffect, useState } from 'react';
import {
  Typography, Row, Col, Card, Button, Space, Avatar,
  Tag
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserAddOutlined,
  SendOutlined,
  TeamOutlined,
  CalendarOutlined,
  DownloadOutlined,
  MoreOutlined,
  RightOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StudentDashboardPage from '../student/dashboard/pages/StudentDashboardPage';
import { useAppContext } from './AppContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { ROUTES } from '../shared/constants/routes';

const { Title, Text } = Typography;

const chartData = [
  { name: '0h', value: 200 },
  { name: '4h', value: 300 },
  { name: '8h', value: 250 },
  { name: '12h', value: 450 },
  { name: '16h', value: 400 },
  { name: '20h', value: 550 },
  { name: '24h', value: 480 },
];

const StatCard = ({ title, value, trend, icon, color }) => (
  <Card styles={{ body: { padding: 20 } }} style={{ borderRadius: 16, border: '1px solid #f0f0f0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ background: color + '15', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          {React.cloneElement(icon, { style: { fontSize: 20, color } })}
        </div>
        <Text type="secondary" style={{ fontSize: 14 }}>{title}</Text>
        <div style={{ fontSize: 28, fontWeight: 700, margin: '4px 0' }}>{value}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {trend > 0 ? (
            <Tag color="success" icon={<ArrowUpOutlined />} style={{ borderRadius: 4, border: 'none' }}>{trend}%</Tag>
          ) : trend < 0 ? (
            <Tag color="error" icon={<ArrowDownOutlined />} style={{ borderRadius: 4, border: 'none' }}>{Math.abs(trend)}%</Tag>
          ) : (
            <Tag color="default" style={{ borderRadius: 4, border: 'none' }}>0%</Tag>
          )}
        </div>
      </div>
    </div>
  </Card>
);

// ── Coordinator / Admin Dashboard View ──────────────────────────────────────
const CoordinatorDashboard = () => {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700, background: 'linear-gradient(90deg, #1e3a8a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tổng quan SEAL
          </Title>
          <Text type="secondary">Cổng giám sát dành cho Ban tổ chức & Điều phối viên</Text>
        </div>
        <Space>
          <Button icon={<CalendarOutlined />} style={{ borderRadius: 12 }}>Hôm nay</Button>
          <Button type="primary" icon={<DownloadOutlined />} style={{ borderRadius: 12 }}>Báo cáo</Button>
        </Space>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            title="Tổng Lượt Đăng Ký" 
            value="1,248" 
            trend={12} 
            icon={<UserAddOutlined />} 
            color="#1677ff" 
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            title="Nhóm Đang Hoạt Động" 
            value="312" 
            trend={5} 
            icon={<TeamOutlined />} 
            color="#52c41a" 
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            title="Tỷ Lệ Nộp Bài" 
            value="84.5%" 
            trend={0} 
            icon={<SendOutlined />} 
            color="#faad14" 
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            title="Tiến Độ Chấm Điểm" 
            value="42/150" 
            trend={-2} 
            icon={<RocketOutlined />} 
            color="#eb2f96" 
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={18}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Tình Trạng Sự Kiện (Thời gian thực)</span>
                <Button type="text" icon={<MoreOutlined />} />
              </div>
            }
            style={{ borderRadius: 16 }}
          >
            <div style={{ height: 400, width: '100%' }}>
              <ResponsiveContainer width="99%" height={400} minWidth={1} minHeight={1}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1677ff" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1677ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#1677ff" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card title="Thao Tác Nhanh" style={{ borderRadius: 16, height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { title: 'Thêm Giám Khảo', icon: <UserAddOutlined />, color: '#1677ff' },
                { title: 'Gửi Thông Báo', icon: <SendOutlined />, color: '#52c41a' },
                { title: 'Quản Lý Vai Trò', icon: <TeamOutlined />, color: '#faad14' },
              ].map((item, index) => (
                <div 
                  key={index}
                  className="quick-action-item"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer', 
                    padding: '16px 12px', 
                    borderRadius: 12, 
                    transition: 'all 0.3s' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar 
                      icon={item.icon} 
                      style={{ backgroundColor: item.color + '15', color: item.color, borderRadius: 8 }} 
                    />
                    <span style={{ fontWeight: 600 }}>{item.title}</span>
                  </div>
                  <RightOutlined style={{ color: '#bfbfbf' }} />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// ── Main Dashboard Selector Component ───────────────────────────────────────
const Dashboard = () => {
  const [userProfile, setUserProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleUserInfoUpdated = () => {
      try {
        const info = JSON.parse(localStorage.getItem('userInfo') || '{}');
        setUserProfile(info);
      } catch {
        // no-op
      }
    };
    window.addEventListener('userInfoUpdated', handleUserInfoUpdated);
    return () => window.removeEventListener('userInfoUpdated', handleUserInfoUpdated);
  }, []);

  if (userProfile.role === 'STUDENT') {
    return <StudentDashboardPage />;
  }
  
  if (userProfile.role === 'JUDGE' || userProfile.role === 'TEMP_JUDGE') {
    return <Navigate to={ROUTES.JUDGE_DASHBOARD} replace />;
  }

  // Mặc định hiển thị Coordinator Dashboard nếu không phải student
  return <CoordinatorDashboard />;
};

export default Dashboard;