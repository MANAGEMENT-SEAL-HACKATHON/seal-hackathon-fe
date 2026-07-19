// src/features/rounds/components/ScoringCheckPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Empty, Progress, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { UnorderedListOutlined } from "@ant-design/icons";
import ScoreBreakdownDrawer from "./ScoreBreakdownDrawer";
import { roundResultsService } from "../services/roundResults.service";

const { Text } = Typography;

const BIAS_CELL_DELTA_THRESHOLD = 2.0;
const fmt = (v) => (v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(2));

/**
 * Tab «Kiểm tra chấm» — A1: summary tiến độ GK theo track + ma trận đội×GK×tiêu chí (lazy theo track).
 */
const ScoringCheckPanel = ({ roundId, ranking, isLoading, error }) => {
  const [target, setTarget] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const items = useMemo(() => ranking?.items || [], [ranking]);

  useEffect(() => {
    if (!roundId) return undefined;
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);
    roundResultsService
      .getScoreBreakdownAll(roundId)
      .then((res) => {
        if (cancelled) return;
        setSummary(res);
        const tracks = res?.tracks || [];
        if (tracks.length === 1) {
          setSelectedTrackId(tracks[0].trackId ?? "final");
        } else if (tracks.length > 0 && selectedTrackId == null) {
          setSelectedTrackId(tracks[0].trackId ?? "final");
        }
      })
      .catch((err) => {
        if (!cancelled) setSummaryError(err);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per roundId
  }, [roundId]);

  useEffect(() => {
    if (!roundId || selectedTrackId == null) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    // CK không có track thật — gửi trackId=0 để BE trả ma trận (không trackId = chỉ summary).
    const trackParam = selectedTrackId === "final" ? 0 : selectedTrackId;
    roundResultsService
      .getScoreBreakdownAll(roundId, trackParam)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetailError(err);
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roundId, selectedTrackId]);

  const trackOptions = useMemo(
    () =>
      (summary?.tracks || []).map((t) => ({
        value: t.trackId == null ? "final" : t.trackId,
        label: `${t.trackName || "Bảng"} (${t.submissionCount ?? 0} bài)`,
      })),
    [summary],
  );

  const progressRows = useMemo(() => {
    const track = (summary?.tracks || []).find((t) =>
      selectedTrackId === "final" ? t.trackId == null : Number(t.trackId) === Number(selectedTrackId),
    );
    return track?.judgeProgress || [];
  }, [summary, selectedTrackId]);

  const matrixColumns = useMemo(() => {
    if (!detail?.judges?.length || !detail?.criteria?.length) return [];
    const cols = [
      {
        title: "Đội",
        dataIndex: "teamName",
        fixed: "left",
        width: 160,
        render: (name, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{name}</Text>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              icon={<UnorderedListOutlined />}
              disabled={!row.submissionId}
              onClick={() => setTarget(row)}
            >
              Chi tiết
            </Button>
          </Space>
        ),
      },
      {
        title: "TB",
        dataIndex: "overallMean",
        width: 72,
        align: "right",
        render: (v) => fmt(v),
      },
    ];
    detail.judges.forEach((j) => {
      detail.criteria.forEach((c) => {
        cols.push({
          title: (
            <Tooltip title={`${j.judgeName} · ${c.name}`}>
              <span style={{ fontSize: 11 }}>
                {String(j.judgeName || "").split(" ").slice(-1)[0]}/{String(c.name || "").slice(0, 8)}
              </span>
            </Tooltip>
          ),
          key: `${j.judgeId}-${c.criterionId}`,
          width: 72,
          align: "center",
          render: (_, row) => {
            const cell = row.cellMap.get(`${j.judgeId}:${c.criterionId}`);
            const value = cell?.scoreValue;
            if (value == null) {
              return <Tag color="error" style={{ margin: 0 }}>Chưa</Tag>;
            }
            const bias = row.biasMap.get(`${j.judgeId}:${c.criterionId}`);
            return (
              <Tooltip title={bias ? `Lệch ${bias > 0 ? "+" : ""}${bias.toFixed(1)} so với TB GK khác` : cell?.comment || ""}>
                <Tag color={bias != null ? "warning" : "default"} style={{ margin: 0 }}>
                  {fmt(value)}
                </Tag>
              </Tooltip>
            );
          },
        });
      });
    });
    return cols;
  }, [detail]);

  const matrixData = useMemo(() => {
    if (!detail?.teams) return [];
    return detail.teams.map((team) => {
      const cellMap = new Map();
      (team.cells || []).forEach((c) => cellMap.set(`${c.judgeId}:${c.criterionId}`, c));
      const byCriterion = new Map();
      (team.cells || []).forEach((c) => {
        if (c.scoreValue == null) return;
        const list = byCriterion.get(c.criterionId) || [];
        list.push({ judgeId: c.judgeId, score: Number(c.scoreValue) });
        byCriterion.set(c.criterionId, list);
      });
      const biasMap = new Map();
      byCriterion.forEach((list, criterionId) => {
        if (list.length < 2) return;
        list.forEach(({ judgeId, score }) => {
          const peers = list.filter((x) => x.judgeId !== judgeId);
          if (!peers.length) return;
          const peerMean = peers.reduce((s, x) => s + x.score, 0) / peers.length;
          const delta = score - peerMean;
          if (Math.abs(delta) > BIAS_CELL_DELTA_THRESHOLD) {
            biasMap.set(`${judgeId}:${criterionId}`, delta);
          }
        });
      });
      return {
        key: team.submissionId || team.teamId,
        teamName: team.teamName,
        teamId: team.teamId,
        submissionId: team.submissionId,
        overallMean: team.overallMean,
        cellMap,
        biasMap,
      };
    });
  }, [detail]);

  const listColumns = [
    { title: "Hạng", dataIndex: "rank", width: 70, align: "center" },
    {
      title: "Đội",
      dataIndex: "teamName",
      render: (name, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.groupLabel}
          </Text>
        </Space>
      ),
    },
    {
      title: "Điểm",
      dataIndex: "weightedAvgScore",
      align: "right",
      width: 100,
      render: (v) => Number(v || 0).toFixed(2),
    },
    {
      title: "",
      key: "action",
      width: 140,
      render: (_, row) =>
        row.submissionId ? (
          <Button type="link" size="small" icon={<UnorderedListOutlined />} onClick={() => setTarget(row)}>
            Ma trận điểm
          </Button>
        ) : (
          <Text type="secondary">Không có bài</Text>
        ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        showIcon
        type="info"
        message="Kiểm tra chấm tổng thể"
        description="Chọn bảng đấu để xem ma trận đội × giám khảo × tiêu chí. Ô đỏ = chưa chấm; vàng = lệch >2.0 so với TB các giám khảo khác."
      />

      {summaryError && (
        <Alert showIcon type="warning" message="Không tải được tóm tắt tiến độ" description={summaryError.message} />
      )}

      <Space wrap style={{ width: "100%" }} align="start">
        <div style={{ minWidth: 260 }}>
          <Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
            Chọn bảng đấu (lazy-load)
          </Text>
          <Select
            style={{ width: "100%", minWidth: 240 }}
            placeholder="Chọn bảng"
            loading={summaryLoading}
            options={trackOptions}
            value={selectedTrackId}
            onChange={setSelectedTrackId}
            data-testid="score-audit-track-select"
          />
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
            Tiến độ chấm theo giám khảo
          </Text>
          {progressRows.length === 0 ? (
            <Text type="secondary">{summaryLoading ? "Đang tải…" : "Chưa có dữ liệu tiến độ"}</Text>
          ) : (
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {progressRows.map((j) => (
                <div key={j.judgeId}>
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Text>{j.judgeName}</Text>
                    <Text type="secondary">
                      {j.scoredCells}/{j.expectedCells} ({j.percent}%)
                    </Text>
                  </Space>
                  <Progress
                    percent={j.percent}
                    size="small"
                    status={j.percent >= 100 ? "success" : j.percent < 50 ? "exception" : "active"}
                    showInfo={false}
                  />
                </div>
              ))}
            </Space>
          )}
        </div>
      </Space>

      {detailError && (
        <Alert showIcon type="error" message="Không tải được ma trận điểm" description={detailError.message} />
      )}

      <Table
        size="small"
        loading={detailLoading}
        columns={matrixColumns}
        dataSource={matrixData}
        scroll={{ x: Math.max(800, (matrixColumns.length || 0) * 72) }}
        pagination={{ pageSize: 15 }}
        locale={{ emptyText: <Empty description="Chọn bảng đấu để xem ma trận." /> }}
        data-testid="score-audit-matrix"
      />

      <Text type="secondary">Danh sách nhanh (ranking) — mở drawer từng đội nếu cần</Text>
      {error && <Alert showIcon type="error" message="Không tải được danh sách" description={error.message} />}
      <Table
        rowKey="key"
        loading={isLoading}
        columns={listColumns}
        dataSource={items}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: <Empty description="Chưa có đội trong ranking." /> }}
        size="middle"
      />

      <ScoreBreakdownDrawer
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        roundId={roundId}
        submissionId={target?.submissionId}
        teamName={target?.teamName}
      />
    </Space>
  );
};

export default ScoringCheckPanel;
