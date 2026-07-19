import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Progress, Space, Typography, Spin, Tag, Collapse, List } from 'antd';
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
    if (payload && typeof payload === 'object' && (payload.totalSubmissions != null || payload.items)) {
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

  const itemsByTrack = useMemo(() => {
    const rows = Array.isArray(progress?.items) ? progress.items : [];
    const map = new Map();
    rows.forEach((row) => {
      const trackKey = row.trackName || row.track_name || (row.trackId != null ? `Hạng mục #${row.trackId}` : 'Chung kết');
      if (!map.has(trackKey)) map.set(trackKey, []);
      map.get(trackKey).push(row);
    });
    return [...map.entries()];
  }, [progress?.items]);

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
          {itemsByTrack.length > 0 && (
            <Collapse
              size="small"
              items={itemsByTrack.map(([trackName, teams]) => {
                const trackScored = teams.filter((t) => t.scored).length;
                return {
                  key: trackName,
                  label: (
                    <Space>
                      <Text strong>{trackName}</Text>
                      <Tag>{trackScored}/{teams.length} đã chấm</Tag>
                    </Space>
                  ),
                  children: (
                    <List
                      size="small"
                      dataSource={teams}
                      renderItem={(item) => (
                        <List.Item style={{ padding: '6px 0' }}>
                          <Text>{item.teamName || item.team_name || `Đội #${item.teamId}`}</Text>
                          <Tag color={item.scored ? 'success' : 'warning'}>
                            {item.scored ? 'Đã chấm đủ' : 'Chưa chấm đủ'}
                          </Tag>
                        </List.Item>
                      )}
                    />
                  ),
                };
              })}
            />
          )}
        </Space>
      )}
    </Card>
  );
};

export default ScoringProgressCard;
