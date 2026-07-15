// src/features/rounds/components/ScoreBreakdownDrawer.jsx
import { useEffect, useMemo, useState } from "react";
import { Alert, Drawer, Skeleton, Table, Tag, Typography } from "antd";
import { roundResultsService } from "../services/roundResults.service";

const { Text, Title } = Typography;

const fmt = (v) => (v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(2));

/**
 * Bug4 — Coord drawer: matrix judges × criteria; null = red «Chưa chấm»; mean + variance.
 */
const ScoreBreakdownDrawer = ({ open, onClose, roundId, submissionId, teamName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || !roundId || !submissionId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    roundResultsService
      .getScoreBreakdown(roundId, submissionId)
      .then((res) => {
        if (!cancelled) setData(res);
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
  }, [open, roundId, submissionId]);

  const cellMap = useMemo(() => {
    const map = new Map();
    (data?.cells || []).forEach((c) => {
      map.set(`${c.judgeId}:${c.criterionId}`, c);
    });
    return map;
  }, [data]);

  const statsMap = useMemo(() => {
    const map = new Map();
    (data?.criterionStats || []).forEach((s) => map.set(s.criterionId, s));
    return map;
  }, [data]);

  const columns = useMemo(() => {
    const criteria = data?.criteria || [];
    return [
      {
        title: "Giám khảo",
        dataIndex: "judgeName",
        fixed: "left",
        width: 160,
        render: (name, row) => (
          <div>
            <Text strong>{name}</Text>
            {row.lastScoredAt && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(row.lastScoredAt).toLocaleString("vi-VN")}
                </Text>
              </div>
            )}
          </div>
        ),
      },
      ...criteria.map((c) => ({
        title: c.name,
        key: `c-${c.criterionId}`,
        width: 110,
        align: "center",
        render: (_, row) => {
          const cell = cellMap.get(`${row.judgeId}:${c.criterionId}`);
          if (!cell || cell.scoreValue == null) {
            return <Tag color="error">Chưa chấm</Tag>;
          }
          return <Text strong>{Number(cell.scoreValue).toFixed(1)}</Text>;
        },
      })),
    ];
  }, [data, cellMap]);

  return (
    <Drawer
      title={`Chi tiết chấm — ${teamName || data?.teamName || `#${submissionId}`}`}
      open={open}
      onClose={onClose}
      width={Math.min(920, typeof window !== "undefined" ? window.innerWidth - 24 : 920)}
      destroyOnClose
    >
      {loading && <Skeleton active />}
      {error && (
        <Alert showIcon type="error" message="Không tải được ma trận điểm" style={{ marginBottom: 12 }} />
      )}
      {data && !loading && (
        <>
          <SpaceStat mean={data.overallMean} variance={data.overallVariance} />
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <Table
              size="small"
              rowKey="judgeId"
              pagination={false}
              columns={columns}
              dataSource={data.judges || []}
              scroll={{ x: true }}
            />
          </div>
          <Title level={5}>Thống kê theo tiêu chí</Title>
          <Table
            size="small"
            pagination={false}
            rowKey="criterionId"
            dataSource={(data.criteria || []).map((c) => ({
              ...c,
              ...(statsMap.get(c.criterionId) || {}),
            }))}
            columns={[
              { title: "Tiêu chí", dataIndex: "name" },
              { title: "Mean", dataIndex: "mean", render: fmt, width: 90 },
              { title: "Variance", dataIndex: "variance", render: fmt, width: 100 },
              {
                title: "Thiếu",
                dataIndex: "missingCount",
                width: 80,
                render: (n) => (n > 0 ? <Tag color="error">{n}</Tag> : n ?? 0),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
};

const SpaceStat = ({ mean, variance }) => (
  <div style={{ marginBottom: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
    <Text>
      Mean tổng: <Text strong>{fmt(mean)}</Text>
    </Text>
    <Text>
      Variance tổng: <Text strong>{fmt(variance)}</Text>
    </Text>
  </div>
);

export default ScoreBreakdownDrawer;
