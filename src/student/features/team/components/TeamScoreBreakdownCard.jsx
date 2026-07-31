/**
 * A2-1 — Bảng điểm riêng của đội: bố cục dọc theo tiêu chí + nhận xét giám khảo ẩn danh.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Empty, Select, Space, Typography } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import axiosClient from '../../../../shared/api/axiosClient';
import { teamService } from '../../../../features/teams/services/teamService';

const { Text, Title } = Typography;

const fmt = (v) => (v == null || Number.isNaN(Number(v)) ? '0.00' : Number(v).toFixed(2));

const TeamScoreBreakdownCard = ({ teamId, rounds: roundsProp }) => {
  const [rounds, setRounds] = useState(roundsProp || []);
  const [roundId, setRoundId] = useState(roundsProp?.[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (Array.isArray(roundsProp) && roundsProp.length > 0) {
      setRounds(roundsProp);
      setRoundId((cur) => cur ?? roundsProp[0]?.id ?? null);
      return undefined;
    }
    if (!teamId) return undefined;
    let cancelled = false;
    teamService
      .getJourney(teamId)
      .then((journey) => {
        if (cancelled) return;
        const steps = Array.isArray(journey?.steps) ? journey.steps : [];
        const next = steps
          .map((step) => ({
            id: step.roundId ?? step.round_id ?? step.id,
            name: step.roundName ?? step.round_name ?? step.name ?? `Vòng #${step.roundId}`,
          }))
          .filter((r) => r.id != null);
        setRounds(next);
        setRoundId((cur) => (cur && next.some((r) => Number(r.id) === Number(cur)) ? cur : next[0]?.id ?? null));
      })
      .catch(() => {
        if (!cancelled) setRounds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, roundsProp]);

  useEffect(() => {
    if (!teamId || !roundId) {
      setData(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    axiosClient
      .get(`/api/v1/me/teams/${teamId}/rounds/${roundId}/score-breakdown`)
      .then((res) => {
        if (!cancelled) setData(res?.data !== undefined ? res.data : res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, roundId]);

  const criterionBlocks = useMemo(() => {
    if (!data?.criteria?.length) return [];
    const cellMap = new Map();
    (data.cells || []).forEach((c) => {
      cellMap.set(`${c.judgeOrdinal}:${c.criterionId}`, c);
    });
    const avgMap = new Map();
    (data.criterionAverages || []).forEach((a) => avgMap.set(a.criterionId, a.average));
    const judges = data.judges || [];

    return data.criteria.map((c) => ({
      criterionId: c.criterionId,
      name: c.name,
      average: avgMap.get(c.criterionId) ?? null,
      rows: judges.map((j) => {
        const cell = cellMap.get(`${j.ordinal}:${c.criterionId}`);
        return {
          key: `${c.criterionId}-${j.ordinal}`,
          label: j.label || `Giám khảo ${j.ordinal}`,
          scoreValue: cell?.scoreValue ?? null,
          comment: cell?.comment || null,
        };
      }),
    }));
  }, [data]);

  if (!teamId) return null;

  return (
    <Card
      data-testid="team-score-breakdown-card"
      loading={loading}
      title={
        <Space>
          <TrophyOutlined style={{ color: '#1677ff' }} />
          <span>Điểm của đội</span>
        </Space>
      }
      extra={
        rounds.length > 0 ? (
          <Select
            size="small"
            style={{ minWidth: 180 }}
            value={roundId}
            onChange={setRoundId}
            options={rounds.map((r) => ({
              value: r.id,
              label: r.name || `Vòng #${r.id}`,
            }))}
          />
        ) : null
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Điểm từng tiêu chí theo giám khảo ẩn danh (Giám khảo 1, 2, …). Chỉ hiện sau khi Ban tổ chức công bố kết quả."
      />
      {error && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            error?.response?.data?.error?.code === 'RESULT_NOT_PUBLISHED' ||
            /chưa được công bố|RESULT_NOT_PUBLISHED/i.test(error?.message || '')
              ? 'Kết quả vòng chưa được công bố — chưa thể xem điểm chi tiết.'
              : error?.message || 'Không tải được bảng điểm'
          }
        />
      )}
      {data?.teamAverage != null && (
        <Title level={4} style={{ marginTop: 0 }}>
          Điểm trung bình đội: {fmt(data.teamAverage)}
        </Title>
      )}
      {!loading && criterionBlocks.length === 0 && !error ? (
        <Empty description="Chưa có điểm để hiển thị" />
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {criterionBlocks.map((block) => (
            <Card
              key={block.criterionId}
              size="small"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span>{block.name}</span>
                  <Text type="secondary" style={{ fontWeight: 400 }}>
                    TB: {fmt(block.average)}
                  </Text>
                </div>
              }
            >
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {block.rows.map((row) => (
                  <div key={row.key} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Text strong>{row.label}</Text>
                      <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(row.scoreValue)}
                      </Text>
                    </div>
                    {row.comment ? (
                      <Text type="secondary" style={{ display: 'block', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                        {row.comment}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ display: 'block', marginTop: 4, fontStyle: 'italic' }}>
                        Không có nhận xét
                      </Text>
                    )}
                  </div>
                ))}
              </Space>
            </Card>
          ))}
        </Space>
      )}
    </Card>
  );
};

export default TeamScoreBreakdownCard;
