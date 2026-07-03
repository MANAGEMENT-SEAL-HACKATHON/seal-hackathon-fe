import { useEffect, useState } from 'react';
import { Card, Empty, Spin, Steps, Typography } from 'antd';
import { teamService } from '../services/teamService';

const { Text } = Typography;

const statusColor = (status) => {
  const norm = String(status || '').toUpperCase();
  if (norm.includes('ADVANCED') || norm.includes('FINAL')) return 'finish';
  if (norm.includes('ELIMINATED') || norm.includes('OUT')) return 'error';
  if (norm.includes('ACTIVE') || norm.includes('PARTICIPATING')) return 'process';
  return 'wait';
};

const TeamJourneyPanel = ({ teamId, teamName }) => {
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId) return undefined;
    let cancelled = false;
    setLoading(true);
    teamService
      .getJourney(teamId)
      .then((res) => {
        if (!cancelled) setJourney(res);
      })
      .catch(() => {
        if (!cancelled) setJourney(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (!teamId) return null;

  const steps = journey?.steps || [];

  return (
    <Card size="small" title={`Hành trình đội${teamName ? `: ${teamName}` : ''}`} style={{ marginTop: 16 }}>
      {loading ? (
        <Spin size="small" />
      ) : steps.length === 0 ? (
        <Empty description="Chưa có dữ liệu hành trình." image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Steps
          direction="vertical"
          size="small"
          items={steps.map((step) => ({
            title: step.roundName ?? step.round_name ?? `Vòng ${step.roundId}`,
            status: statusColor(step.participationStatus ?? step.participation_status),
            description: (
              <div>
                <Text type="secondary">
                  Track: {step.trackName ?? step.track_name ?? '—'}
                </Text>
                <br />
                <Text>
                  Trạng thái: {step.participationStatus ?? step.participation_status ?? '—'}
                </Text>
              </div>
            ),
          }))}
        />
      )}
    </Card>
  );
};

export default TeamJourneyPanel;
