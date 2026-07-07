import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, Grid, Row, Spin, Typography, message, theme, Skeleton } from 'antd';
import { CopyOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { studentTeamService } from '../../team/services/studentTeam.service';
import { matchmakingService } from '../services/matchmaking.service';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const MatchmakingBoardPage = () => {
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const [hackathonId, setHackathonId] = useState(null);
  const [hackathonName, setHackathonName] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const active = await studentTeamService.getActiveHackathon();
      if (!active?.id) {
        setTeams([]);
        setHackathonId(null);
        return;
      }
      setHackathonId(active.id);
      setHackathonName(active.name || active.hackathonName || `Hackathon #${active.id}`);
      const items = await matchmakingService.getTeams(active.id);
      setTeams(items);
    } catch (err) {
      setError(err?.message || 'Không thể tải bảng tin ghép đội');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyEmail = async (email) => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      message.success('Đã sao chép email nhóm trưởng');
    } catch {
      message.error('Không thể sao chép email');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 48 }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            Bảng tin Ghép đội
          </Title>
          <Text type="secondary">
            Danh sách các đội đang thiếu thành viên. Liên hệ trực tiếp với nhóm trưởng qua email bên dưới.
          </Text>
          {hackathonName && (
            <div style={{ marginTop: 8 }}>
              <Text strong>{hackathonName}</Text>
            </div>
          )}
        </div>

        {error && (
          <Alert type="error" message={error} showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                padding: 48,
                background: token.colorBgContainer !== '#ffffff' ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
                borderRadius: 28,
                border: `1.5px solid ${token.colorBorderSecondary}`,
                boxShadow: '0 20px 48px rgba(0,0,0,0.06)',
              }}
            >
              <Skeleton active avatar paragraph={{ rows: 8 }} />
            </motion.div>
          ) : !hackathonId ? (
            <motion.div
              key="empty-hackathon"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Empty description="Chưa đăng ký hackathon — hãy đăng ký sự kiện trước khi xem bảng ghép đội" />
            </motion.div>
          ) : teams.length === 0 ? (
            <motion.div
              key="empty-teams"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Empty description="Hiện không có đội nào đang tìm thành viên" />
            </motion.div>
          ) : (
            <motion.div
              key="matchmaking-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Row gutter={[24, 24]}>
            {teams.map((team) => (
              <Col xs={24} md={12} lg={8} key={team.teamId}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderRadius: 24,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                  styles={{ body: { padding: 24, display: 'flex', flexDirection: 'column', height: '100%' } }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, #1890ff, #13c2c2)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        marginBottom: 20,
                        boxShadow: '0 12px 24px rgba(24,144,255,0.25)',
                      }}
                    >
                      <TeamOutlined />
                    </div>
                    <Title level={4} style={{ marginTop: 0 }}>
                      {team.teamName}
                    </Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                      {team.memberCount}/{team.maxMembers} thành viên
                    </Text>
                    <div style={{ marginBottom: 8 }}>
                      <UserOutlined style={{ marginRight: 8 }} />
                      <Text strong>{team.leaderName || 'Nhóm trưởng'}</Text>
                    </div>
                    <Text copyable={false} style={{ wordBreak: 'break-all' }}>
                      {team.leaderEmail || '—'}
                    </Text>
                  </div>
                  {team.leaderEmail && (
                    <Card
                      size="small"
                      style={{
                        marginTop: 20,
                        borderRadius: 12,
                        background: 'rgba(24,144,255,0.08)',
                        border: '1px solid rgba(24,144,255,0.2)',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleCopyEmail(team.leaderEmail)}
                    >
                      <Text style={{ color: '#1890ff', fontWeight: 600 }}>
                        <CopyOutlined /> Sao chép email liên hệ
                      </Text>
                    </Card>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default MatchmakingBoardPage;
