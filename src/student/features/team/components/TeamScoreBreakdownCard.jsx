/**
 * A2-1 — Bảng điểm riêng của đội: tiêu chí + TB, giám khảo ẩn danh.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Empty, Select, Space, Table, Tag, Typography } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import axiosClient from '../../../../shared/api/axiosClient';
import { teamService } from '../../../../features/teams/services/teamService';

const { Text, Title } = Typography;

const fmt = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(2));

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

  const columns = useMemo(() => {
    if (!data?.criteria?.length) return [];
    const cols = [
      {
        title: 'Giám khảo',
        dataIndex: 'label',
        fixed: 'left',
        width: 120,
      },
    ];
    data.criteria.forEach((c) => {
      cols.push({
        title: c.name,
        dataIndex: `c_${c.criterionId}`,
        align: 'center',
        width: 100,
        render: (v, row) => {
          if (row.isAvg) return <Text strong>{fmt(v)}</Text>;
          if (v == null) return <Tag>Chưa chấm</Tag>;
          return fmt(v);
        },
      });
    });
    return cols;
  }, [data]);

  const tableData = useMemo(() => {
    if (!data?.judges) return [];
    const cellMap = new Map();
    (data.cells || []).forEach((c) => {
      cellMap.set(`${c.judgeOrdinal}:${c.criterionId}`, c.scoreValue);
    });
    const avgMap = new Map();
    (data.criterionAverages || []).forEach((a) => avgMap.set(a.criterionId, a.average));

    const rows = data.judges.map((j) => {
      const row = { key: j.ordinal, label: j.label };
      (data.criteria || []).forEach((c) => {
        row[`c_${c.criterionId}`] = cellMap.get(`${j.ordinal}:${c.criterionId}`) ?? null;
      });
      return row;
    });
    const avgRow = { key: 'avg', label: 'Trung bình đội', isAvg: true };
    (data.criteria || []).forEach((c) => {
      avgRow[`c_${c.criterionId}`] = avgMap.get(c.criterionId) ?? null;
    });
    rows.push(avgRow);
    return rows;
  }, [data]);

  if (!teamId) return null;

  return (
    <Card
      data-testid="team-score-breakdown-card"
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
      <Table
        size="small"
        loading={loading}
        columns={columns}
        dataSource={tableData}
        pagination={false}
        scroll={{ x: true }}
        locale={{ emptyText: <Empty description="Chưa có điểm để hiển thị" /> }}
      />
    </Card>
  );
};

export default TeamScoreBreakdownCard;
