import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Empty, List, Row, Spin, Tag, Typography } from 'antd';
import { TeamOutlined, HistoryOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import {
  HACKATHON_STATUS_COLORS,
  HACKATHON_STATUS_LABELS,
  labelOf,
} from '../../../shared/constants/labels';
import { mentorPortalService } from '../services/mentorPortal.service';

const { Title, Text } = Typography;

const MentorDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [trackList, teamList] = await Promise.all([
          mentorPortalService.getTrackAssignments().catch(() => []),
          mentorPortalService.getTeamAssignments().catch(() => []),
        ]);
        if (!cancelled) {
          setTracks(Array.isArray(trackList) ? trackList : []);
          setTeams(Array.isArray(teamList) ? teamList : []);
        }
      } catch {
        if (!cancelled) setError('Không tải được tổng quan cố vấn.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }} data-testid="mentor-dashboard">
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Tổng quan cố vấn</Title>
        <Text type="secondary">Đội đang hỗ trợ, hạng mục được gán và việc cần theo dõi.</Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
      ) : error ? (
        <Alert type="error" showIcon message={error} />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card>
              <Text type="secondary">Hạng mục được gán</Text>
              <Title level={2} style={{ margin: '8px 0' }}>{tracks.length}</Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Text type="secondary">Đội đang hỗ trợ</Text>
              <Title level={2} style={{ margin: '8px 0' }}>{teams.length}</Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Button
                type="primary"
                block
                icon={<TeamOutlined />}
                onClick={() => navigate(ROUTES.MENTOR_ROUNDS || '/mentor/rounds')}
              >
                Hỗ trợ đội
              </Button>
              <Button
                block
                style={{ marginTop: 8 }}
                icon={<HistoryOutlined />}
                onClick={() => navigate(ROUTES.MENTOR_HISTORY || '/mentor/history')}
              >
                Lịch sử mentor
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Hạng mục">
              {tracks.length === 0 ? (
                <Empty description="Chưa được gán hạng mục" />
              ) : (
                <List
                  dataSource={tracks.slice(0, 8)}
                  renderItem={(t) => (
                    <List.Item>
                      <List.Item.Meta
                        title={t.trackName || t.name || `Hạng mục #${t.trackId || t.id}`}
                        description={t.hackathonName || t.roundName || ''}
                      />
                      {t.hackathonStatus ? (
                        <Tag color={HACKATHON_STATUS_COLORS[String(t.hackathonStatus).toUpperCase()] || 'default'}>
                          {labelOf(HACKATHON_STATUS_LABELS, t.hackathonStatus)}
                        </Tag>
                      ) : null}
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Đội đang hỗ trợ">
              {teams.length === 0 ? (
                <Empty description="Chưa có đội được gán" />
              ) : (
                <List
                  dataSource={teams.slice(0, 8)}
                  renderItem={(t) => (
                    <List.Item actions={[<RightOutlined key="a" />]}>
                      <List.Item.Meta
                        title={t.teamName || t.name || `Đội #${t.teamId || t.id}`}
                        description={t.roundName || t.trackName || ''}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default MentorDashboardPage;
