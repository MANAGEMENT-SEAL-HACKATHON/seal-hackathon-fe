import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography, Row, Col, Card, Button, Space, Avatar,
  Spin, Empty,
} from 'antd';
import {
  UserAddOutlined,
  SendOutlined,
  TeamOutlined,
  RightOutlined,
  RocketOutlined,
  TrophyOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import StudentDashboardPage from '../student/dashboard/pages/StudentDashboardPage';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../shared/constants/routes';
import { hackathonService } from '../features/hackathons/services/hackathonService';
import { mapHackathonToFE } from '../features/hackathons/mappers/hackathonMapper';
import { teamService } from '../features/teams/services/teamService';
import { roundService } from '../features/rounds/services/roundService';
import { mapRoundToFE } from '../features/rounds/mappers/roundMapper';

const { Title, Text } = Typography;

const STATUS_LABELS = {
  DRAFT: 'Bản nháp',
  ONGOING: 'Đang diễn ra',
  PENDING_CONFIRM: 'Chờ chốt sổ',
  FINISHED: 'Đã kết thúc',
};

const STATUS_COLORS = {
  DRAFT: '#94a3b8',
  ONGOING: '#1677ff',
  PENDING_CONFIRM: '#faad14',
  FINISHED: '#52c41a',
};

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card styles={{ body: { padding: 20 } }} style={{ borderRadius: 16, border: '1px solid #f0f0f0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ background: `${color}15`, width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          {React.cloneElement(icon, { style: { fontSize: 20, color } })}
        </div>
        <Text type="secondary" style={{ fontSize: 14 }}>{title}</Text>
        <div style={{ fontSize: 28, fontWeight: 700, margin: '4px 0' }}>{value}</div>
        {subtitle ? (
          <Text type="secondary" style={{ fontSize: 12 }}>{subtitle}</Text>
        ) : null}
      </div>
    </div>
  </Card>
);

const CoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hackathons, setHackathons] = useState([]);
  const [activeTeams, setActiveTeams] = useState(0);
  const [submitRate, setSubmitRate] = useState(null);
  const [scoringLabel, setScoringLabel] = useState(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hackathonService.search({ size: 100 });
      const list = unwrapList(res).map((item) => mapHackathonToFE(item));
      setHackathons(list);

      if (list.length === 0) {
        setActiveTeams(0);
        setSubmitRate(null);
        setScoringLabel(null);
        return;
      }

      const teamCounts = await Promise.all(
        list.map(async (h) => {
          try {
            const teamsRes = await teamService.listByHackathon(h.id, { status: 'ACTIVE' });
            return unwrapList(teamsRes).length;
          } catch {
            return 0;
          }
        }),
      );
      setActiveTeams(teamCounts.reduce((sum, n) => sum + n, 0));

      const focus =
        list.find((h) => h.status === 'ONGOING') ||
        list.find((h) => h.status === 'PENDING_CONFIRM') ||
        list[0];

      let rate = null;
      let scoring = null;
      try {
        const roundsRes = await roundService.listByHackathon(focus.id);
        const rounds = unwrapList(roundsRes).map((r) => mapRoundToFE(r));
        const scoringRound =
          rounds.find((r) => r.is_active && !r.scoring_locked) ||
          rounds.find((r) => r.is_active) ||
          rounds.find((r) => !r.is_final) ||
          rounds[0];

        if (scoringRound?.id) {
          try {
            const progress = await roundService.getScoringProgress(scoringRound.id);
            const scored = Number(progress?.scoredSubmissions ?? progress?.scoredCount ?? 0);
            const total = Number(progress?.totalSubmissions ?? progress?.totalCount ?? 0);
            if (total > 0) {
              scoring = `${scored}/${total}`;
              rate = `${Math.round((scored / total) * 1000) / 10}%`;
            }
          } catch {
            // no open scoring round
          }
        }
      } catch {
        // rounds unavailable for focus hackathon
      }

      setSubmitRate(rate);
      setScoringLabel(scoring);
    } catch (err) {
      console.error('Dashboard overview load failed', err);
      setHackathons([]);
      setActiveTeams(0);
      setSubmitRate(null);
      setScoringLabel(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const statusChartData = useMemo(() => {
    const counts = { DRAFT: 0, ONGOING: 0, PENDING_CONFIRM: 0, FINISHED: 0 };
    hackathons.forEach((h) => {
      const key = (h.status || '').toUpperCase();
      if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      status,
      value,
    }));
  }, [hackathons]);

  const firstHackathonId = hackathons[0]?.id;

  const quickActions = [
    {
      title: 'Danh sách sự kiện',
      icon: <TrophyOutlined />,
      color: '#1677ff',
      onClick: () => navigate(ROUTES.HACKATHONS),
    },
    {
      title: 'Quản lý đội thi',
      icon: <TeamOutlined />,
      color: '#52c41a',
      onClick: () => navigate(ROUTES.GLOBAL_TEAMS),
    },
    {
      title: firstHackathonId ? 'Thiết lập sự kiện' : 'Tạo sự kiện',
      icon: <UserAddOutlined />,
      color: '#faad14',
      onClick: () =>
        navigate(
          firstHackathonId
            ? `/hackathons/${firstHackathonId}/setup?tab=people`
            : ROUTES.HACKATHON_CREATE,
        ),
    },
    {
      title: 'Phân tích & dữ liệu',
      icon: <BarChartOutlined />,
      color: '#722ed1',
      onClick: () => navigate(ROUTES.COORDINATOR_ANALYTICS),
    },
  ];

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
          <Button onClick={loadOverview} style={{ borderRadius: 12 }}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            style={{ borderRadius: 12 }}
            onClick={() => navigate(ROUTES.COORDINATOR_ANALYTICS)}
          >
            Phân tích
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                title="Sự kiện đang quản lý"
                value={hackathons.length}
                icon={<TrophyOutlined />}
                color="#1677ff"
                subtitle="Theo tài khoản điều phối viên"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                title="Đội đang hoạt động"
                value={activeTeams}
                icon={<TeamOutlined />}
                color="#52c41a"
                subtitle="Trạng thái ACTIVE trên mọi kỳ"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                title="Tỷ lệ hoàn thành chấm"
                value={submitRate ?? '—'}
                icon={<SendOutlined />}
                color="#faad14"
                subtitle={submitRate ? 'Theo vòng đang chấm gần nhất' : 'Chưa có vòng đang chấm'}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                title="Tiến độ chấm điểm"
                value={scoringLabel ?? '—'}
                icon={<RocketOutlined />}
                color="#eb2f96"
                subtitle={scoringLabel ? 'Đã chấm / tổng (vòng gần nhất)' : 'Không có dữ liệu chấm'}
              />
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={18}>
              <Card
                title="Sự kiện theo trạng thái"
                style={{ borderRadius: 16 }}
              >
                {hackathons.length === 0 ? (
                  <Empty
                    description="Chưa có sự kiện nào"
                    style={{ padding: 48 }}
                  >
                    <Button type="primary" onClick={() => navigate(ROUTES.HACKATHON_CREATE)}>
                      Tạo sự kiện mới
                    </Button>
                  </Empty>
                ) : (
                  <div style={{ height: 360, width: '100%' }}>
                    <ResponsiveContainer width="99%" height={360} minWidth={1} minHeight={1}>
                      <BarChart data={statusChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c' }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c' }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
                          {statusChartData.map((entry) => (
                            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#1677ff'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card title="Thao tác nhanh" style={{ borderRadius: 16, height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {quickActions.map((item) => (
                    <div
                      key={item.title}
                      role="button"
                      tabIndex={0}
                      onClick={item.onClick}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') item.onClick();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        padding: '16px 12px',
                        borderRadius: 12,
                        transition: 'all 0.3s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar
                          icon={item.icon}
                          style={{ backgroundColor: `${item.color}15`, color: item.color, borderRadius: 8 }}
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
        </>
      )}
    </div>
  );
};

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

  return <CoordinatorDashboard />;
};

export default Dashboard;
