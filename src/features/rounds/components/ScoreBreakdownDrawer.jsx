// src/features/rounds/components/ScoreBreakdownDrawer.jsx
import { useEffect, useMemo, useState } from "react";
import { Alert, Drawer, Skeleton, Table, Tag, Tooltip, Typography } from "antd";
import { roundResultsService } from "../services/roundResults.service";

const { Text, Title } = Typography;

const fmt = (v) => (v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(2));

/**
 * Ngưỡng cảnh báo thiên vị: điểm 1 giám khảo lệch quá mức so với TB các GK khác
 * trên cùng submission + tiêu chí (thang 10). Chỉ là tín hiệu nhẹ để Coord soi thêm,
 * KHÔNG phải kết luận thiên vị.
 */
const BIAS_CELL_DELTA_THRESHOLD = 2.0;

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

  // Tín hiệu thiên vị: với mỗi ô (judge, criterion) tính TB điểm các GK KHÁC trên cùng
  // tiêu chí. Lệch > ngưỡng → highlight. Cần ≥2 GK cùng chấm tiêu chí đó mới xét.
  const biasMap = useMemo(() => {
    const byCriterion = new Map(); // criterionId → [{judgeId, score}]
    (data?.cells || []).forEach((c) => {
      if (c.scoreValue == null) return;
      const list = byCriterion.get(c.criterionId) || [];
      list.push({ judgeId: c.judgeId, score: Number(c.scoreValue) });
      byCriterion.set(c.criterionId, list);
    });
    const map = new Map();
    byCriterion.forEach((list, criterionId) => {
      if (list.length < 2) return;
      list.forEach(({ judgeId, score }) => {
        const peers = list.filter((x) => x.judgeId !== judgeId);
        if (peers.length === 0) return;
        const peerMean = peers.reduce((s, x) => s + x.score, 0) / peers.length;
        const delta = score - peerMean;
        map.set(`${judgeId}:${criterionId}`, {
          peerMean,
          delta,
          biased: Math.abs(delta) > BIAS_CELL_DELTA_THRESHOLD,
        });
      });
    });
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
        onCell: (row) => {
          const bias = biasMap.get(`${row.judgeId}:${c.criterionId}`);
          return bias?.biased
            ? { style: { background: "#fff1f0" } }
            : {};
        },
        render: (_, row) => {
          const cell = cellMap.get(`${row.judgeId}:${c.criterionId}`);
          if (!cell || cell.scoreValue == null) {
            return <Tag color="error">Chưa chấm</Tag>;
          }
          const bias = biasMap.get(`${row.judgeId}:${c.criterionId}`);
          const value = <Text strong>{Number(cell.scoreValue).toFixed(1)}</Text>;
          if (!bias?.biased) return value;
          return (
            <Tooltip
              title={`Lệch ${bias.delta > 0 ? "+" : ""}${bias.delta.toFixed(1)} so với TB các GK khác (${bias.peerMean.toFixed(1)})`}
            >
              <span style={{ color: "#cf1322", cursor: "help" }}>
                <Text strong style={{ color: "#cf1322" }}>
                  {Number(cell.scoreValue).toFixed(1)}
                </Text>
                {" ⚠"}
              </span>
            </Tooltip>
          );
        },
      })),
    ];
  }, [data, cellMap, biasMap]);

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
          {[...biasMap.values()].some((b) => b.biased) && (
            <Alert
              showIcon
              type="warning"
              style={{ marginBottom: 12 }}
              message="Có ô điểm lệch bất thường"
              description={`Ô nền hồng kèm ⚠ là điểm lệch > ${BIAS_CELL_DELTA_THRESHOLD.toFixed(1)} so với TB các giám khảo khác cùng tiêu chí — tín hiệu để soi thêm, chưa phải kết luận thiên vị.`}
            />
          )}
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
