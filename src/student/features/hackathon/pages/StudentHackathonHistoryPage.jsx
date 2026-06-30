import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Empty, Space, Spin, Tag, Typography } from 'antd';
import { History, Trophy, ArrowRight, BarChart3 } from 'lucide-react';
import { studentTeamService } from '../../team/services/studentTeam.service';
import { ROUTES } from '../../../../shared/constants/routes';

const { Title, Text } = Typography;

const StudentHackathonHistoryPage = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    studentTeamService
      .getMyTeams()
      .then((data) => {
        if (!cancelled) setTeams(data.filter((t) => t.status !== 'REJECTED'));
      })
      .catch(() => {
        if (!cancelled) setTeams([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hackathonGroups = useMemo(() => {
    const map = new Map();
    teams.forEach((team) => {
      const key = team.hackathonId ?? team.hackathonName;
      if (!map.has(key)) {
        map.set(key, {
          hackathonId: team.hackathonId,
          hackathonName: team.hackathonName,
          teams: [],
        });
      }
      map.get(key).teams.push(team);
    });
    return Array.from(map.values()).sort((a, b) =>
      String(b.hackathonName).localeCompare(String(a.hackathonName)),
    );
  }, [teams]);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
      <Card
        style={{
          border: 0,
          color: '#fff',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 55%, #0ea5e9 100%)',
          marginBottom: 24,
          borderRadius: 16,
        }}
        styles={{ body: { padding: '28px 32px' } }}
      >
        <Space direction="vertical" size={8}>
          <Tag color="cyan" style={{ border: 0, background: 'rgba(255,255,255,0.2)' }} icon={<History size={13} />}>
            Lịch sử tham gia
          </Tag>
          <Title level={2} style={{ color: '#fff', margin: 0 }}>
            Cuộc thi đã tham gia
          </Title>
          <Text style={{ color: 'rgba(255,255,255,.85)', fontSize: 15 }}>
            Xem lại hành trình, trạng thái vào Chung kết hoặc bị loại tại từng Hackathon bạn đã thi.
          </Text>
        </Space>
      </Card>

      {hackathonGroups.length === 0 ? (
        <Card style={{ borderRadius: 16 }}>
          <Empty description="Bạn chưa tham gia cuộc thi nào" />
        </Card>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {hackathonGroups.map((group) => {
            const primary = group.teams[0];
            const isAdvanced = group.teams.some((t) => t.isAdvanced);
            const isEliminated = group.teams.every((t) => t.isEliminatedFromFinal);
            const hasFinalist = isAdvanced;

            return (
              <Card key={group.hackathonId ?? group.hackathonName} style={{ borderRadius: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <Space align="start" size={12}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: 'linear-gradient(135deg, #1677ff, #36cfc9)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Trophy size={24} color="#fff" />
                      </div>
                      <div>
                        <Title level={4} style={{ margin: 0 }}>
                          {group.hackathonName}
                        </Title>
                        <Text type="secondary">Mã sự kiện: #{group.hackathonId ?? '—'}</Text>
                        <div style={{ marginTop: 10 }}>
                          <Space wrap size={6}>
                            {hasFinalist && (
                              <Tag color="success" style={{ fontWeight: 700 }}>
                                ADVANCED — Vào Chung kết
                              </Tag>
                            )}
                            {isEliminated && !hasFinalist && (
                              <Tag color="error">Bị loại — Không vào CK</Tag>
                            )}
                            {!hasFinalist && !isEliminated && primary?.participationLabel && (
                              <Tag color={primary.participationColor}>{primary.participationLabel}</Tag>
                            )}
                            <Tag color={primary?.statusColor}>{primary?.statusLabel}</Tag>
                          </Space>
                        </div>
                      </div>
                    </Space>

                    {isEliminated && !hasFinalist && (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 16, borderRadius: 10 }}
                        message="Đội không vào Vòng Chung kết"
                        description="Bạn đã bị loại tại Vòng Sơ loại của cuộc thi này. Vẫn có thể xem lại kết quả và điểm số bên dưới."
                      />
                    )}

                    {hasFinalist && (
                      <Alert
                        type="success"
                        showIcon
                        style={{ marginTop: 16, borderRadius: 10 }}
                        message="Đội vào Chung kết"
                        description="Theo dõi mục «Nộp bài thi» khi Coordinator kích hoạt vòng Chung kết."
                      />
                    )}

                    <div style={{ marginTop: 12 }}>
                      {group.teams.map((team) => (
                        <Text key={team.id} type="secondary" style={{ display: 'block', fontSize: 13 }}>
                          {team.teamName}
                          {team.trackName ? ` · ${team.trackName}` : ''}
                        </Text>
                      ))}
                    </div>
                  </div>

                  <Space direction="vertical" size={8}>
                    <Button
                      type="primary"
                      icon={<BarChart3 size={16} />}
                      onClick={() => navigate(ROUTES.STUDENT_RESULTS)}
                    >
                      Tra cứu điểm vòng
                    </Button>
                    {group.hackathonId && (
                      <Button
                        icon={<ArrowRight size={16} />}
                        onClick={() => navigate(`/student/hackathons/${group.hackathonId}/results`)}
                      >
                        Vinh danh Chung cuộc
                      </Button>
                    )}
                    <Button type="link" onClick={() => navigate(ROUTES.STUDENT_TEAM)}>
                      Xem chi tiết đội
                    </Button>
                  </Space>
                </div>
              </Card>
            );
          })}
        </Space>
      )}
    </div>
  );
};

export default StudentHackathonHistoryPage;
