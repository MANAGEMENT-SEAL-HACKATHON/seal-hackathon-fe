// src/features/rounds/components/ScoreBreakdownDrawer.jsx
import { useEffect, useMemo, useState } from "react";
import { Alert, Card, Drawer, Empty, Skeleton, Space, Typography } from "antd";
import { roundResultsService } from "../services/roundResults.service";

const { Text } = Typography;

const fmt = (v) => (v == null || Number.isNaN(Number(v)) ? "0.00" : Number(v).toFixed(2));

/**
 * Chi tiết điểm thành phần — bố cục dọc theo tiêu chí:
 * mỗi tiêu chí một khối, dưới đó từng giám khảo (điểm + nhận xét).
 * Ô chưa chấm hiển thị 0.00 (không còn cột Thiếu / Variance).
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

  const judgeNameById = useMemo(() => {
    const map = new Map();
    (data?.judges || []).forEach((j) => map.set(j.judgeId, j.judgeName || `GK #${j.judgeId}`));
    return map;
  }, [data]);

  const criterionBlocks = useMemo(() => {
    const criteria = data?.criteria || [];
    const judges = data?.judges || [];
    return criteria.map((c) => {
      const stats = statsMap.get(c.criterionId);
      const rows = judges.map((j) => {
        const cell = cellMap.get(`${j.judgeId}:${c.criterionId}`);
        return {
          judgeId: j.judgeId,
          judgeName: judgeNameById.get(j.judgeId) || j.judgeName,
          scoreValue: cell?.scoreValue ?? null,
          comment: cell?.comment || null,
        };
      });
      return {
        criterionId: c.criterionId,
        name: c.name,
        mean: stats?.mean ?? null,
        rows,
      };
    });
  }, [data, cellMap, statsMap, judgeNameById]);

  return (
    <Drawer
      title={`Chi tiết điểm — ${teamName || data?.teamName || `#${submissionId}`}`}
      open={open}
      onClose={onClose}
      width={Math.min(640, typeof window !== "undefined" ? window.innerWidth - 24 : 640)}
      destroyOnClose
    >
      {loading && <Skeleton active />}
      {error && (
        <Alert showIcon type="error" message="Không tải được chi tiết điểm" style={{ marginBottom: 12 }} />
      )}
      {data && !loading && (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Text>
            Điểm trung bình tổng: <Text strong>{fmt(data.overallMean)}</Text>
          </Text>

          {criterionBlocks.length === 0 ? (
            <Empty description="Chưa có tiêu chí / điểm" />
          ) : (
            criterionBlocks.map((block) => (
              <Card
                key={block.criterionId}
                size="small"
                title={
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <span>{block.name}</span>
                    <Text type="secondary" style={{ fontWeight: 400 }}>
                      TB: {fmt(block.mean)}
                    </Text>
                  </div>
                }
                styles={{ body: { padding: "8px 12px" } }}
              >
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  {block.rows.map((row) => (
                    <div
                      key={`${block.criterionId}-${row.judgeId}`}
                      style={{
                        borderBottom: "1px solid #f0f0f0",
                        paddingBottom: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <Text strong>{row.judgeName}</Text>
                        <Text strong style={{ fontVariantNumeric: "tabular-nums" }}>
                          {fmt(row.scoreValue)}
                        </Text>
                      </div>
                      {row.comment ? (
                        <Text type="secondary" style={{ display: "block", marginTop: 4, whiteSpace: "pre-wrap" }}>
                          {row.comment}
                        </Text>
                      ) : (
                        <Text type="secondary" style={{ display: "block", marginTop: 4, fontStyle: "italic" }}>
                          Không có nhận xét
                        </Text>
                      )}
                    </div>
                  ))}
                </Space>
              </Card>
            ))
          )}
        </Space>
      )}
    </Drawer>
  );
};

export default ScoreBreakdownDrawer;
