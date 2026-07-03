import { useEffect, useState, useCallback } from 'react';
import { Card, Progress, Space, Typography, Spin, Tag } from 'antd';
import { roundService } from '../services/roundService';
import { useScoringProgressSocket } from '../../../shared/hooks/useScoringProgressSocket';

const { Text } = Typography;

const ScoringProgressCard = ({ round }) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!round?.id || round.scoring_locked || round.scoringLocked) {
      return;
    }
    setLoading(true);
    try {
      const data = await roundService.getScoringProgress(round.id);
      setProgress(data);
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [round?.id, round?.scoring_locked, round?.scoringLocked]);

  useScoringProgressSocket(round?.id, (payload) => {
    if (payload && typeof payload === 'object') {
      setProgress((prev) => ({ ...prev, ...payload }));
    } else {
      fetchProgress();
    }
  });

  useEffect(() => {
    fetchProgress();
    if (!round?.id || round.scoring_locked || round.scoringLocked) {
      return undefined;
    }
    const interval = setInterval(fetchProgress, 60000);
    return () => clearInterval(interval);
  }, [fetchProgress, round?.id, round?.scoring_locked, round?.scoringLocked]);

  if (!round?.is_active || round.scoring_locked || round.scoringLocked) {
    return null;
  }

  const total = progress?.totalSubmissions ?? 0;
  const scored = progress?.scoredSubmissions ?? 0;
  const pending = progress?.pendingSubmissions ?? Math.max(0, total - scored);
  const percent = total > 0 ? Math.round((scored / total) * 100) : 0;

  return (
    <Card size="small" style={{ marginBottom: 16 }} title="Tiến độ chấm điểm" extra={<Tag color="blue">Live WS</Tag>}>
      {loading && !progress ? (
        <Spin size="small" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Progress percent={percent} status={percent === 100 ? 'success' : 'active'} />
          <Text type="secondary" style={{ fontSize: 13 }}>
            Đã chấm: {scored}/{total} · Còn lại: {pending}
          </Text>
        </Space>
      )}
    </Card>
  );
};

export default ScoringProgressCard;
