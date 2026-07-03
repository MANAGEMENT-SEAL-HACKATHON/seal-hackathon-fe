import { useState } from 'react';
import { Alert, Button, Col, Row, Spin, Typography, theme } from 'antd';
import { PlusOutlined, RadarChartOutlined } from '@ant-design/icons';
import { useTeamRadar } from '../hooks/useTeamRadar';
import OrphanUserTable from './OrphanUserTable';
import IncompleteTeamTable from './IncompleteTeamTable';
import AdminCreateTeamModal from './AdminCreateTeamModal';
import AdminAddMemberModal from './AdminAddMemberModal';
import AdminMergeTeamModal from './AdminMergeTeamModal';

const { Title, Text } = Typography;

const TeamRadarPanel = ({ hackathonId, onDataChanged }) => {
  const { token } = theme.useToken();
  const { orphans, incompleteTeams, loading, error, refetch } = useTeamRadar(hackathonId);

  const [createOpen, setCreateOpen] = useState(false);
  const [addMemberTeam, setAddMemberTeam] = useState(null);
  const [mergeTeam, setMergeTeam] = useState(null);

  const handleSuccess = async () => {
    await refetch();
    onDataChanged?.();
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RadarChartOutlined />
            Radar & Giải cứu đội thi
          </Title>
          <Text type="secondary">
            Dò sinh viên mồ côi và đội thiếu người. Khi đủ 3 thành viên, hệ thống tự chuyển đội sang ACTIVE.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={orphans.length < 3}
          onClick={() => setCreateOpen(true)}
        >
          Gom đội mới
        </Button>
      </div>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <div
              style={{
                padding: 16,
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
              }}
            >
              <Title level={5}>Sinh viên mồ côi ({orphans.length})</Title>
              <OrphanUserTable orphans={orphans} loading={loading} />
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <div
              style={{
                padding: 16,
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
              }}
            >
              <Title level={5}>Đội thiếu người ({incompleteTeams.length})</Title>
              <IncompleteTeamTable
                teams={incompleteTeams}
                loading={loading}
                onAddMember={setAddMemberTeam}
                onMerge={setMergeTeam}
              />
            </div>
          </Col>
        </Row>
      )}

      <AdminCreateTeamModal
        open={createOpen}
        hackathonId={hackathonId}
        orphans={orphans}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleSuccess}
      />
      <AdminAddMemberModal
        open={Boolean(addMemberTeam)}
        team={addMemberTeam}
        orphans={orphans}
        onClose={() => setAddMemberTeam(null)}
        onSuccess={handleSuccess}
      />
      <AdminMergeTeamModal
        open={Boolean(mergeTeam)}
        targetTeam={mergeTeam}
        incompleteTeams={incompleteTeams}
        onClose={() => setMergeTeam(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default TeamRadarPanel;
