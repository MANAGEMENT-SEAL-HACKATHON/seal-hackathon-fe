// src/features/rounds/components/AdvanceRosterPanel.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Col, Empty, Input, Row, Select, Skeleton, Space, Tag, Tooltip, Typography } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { roundResultsService } from "../services/roundResults.service";

const { Text, Title } = Typography;

const REASON_META = {
  TOP_N: { color: "green", label: "Top N" },
  WILDCARD: { color: "blue", label: "Vé vớt" },
  OUT: { color: "default", label: "Loại" },
  DQ: { color: "red", label: "Bị loại kỷ luật" },
};

const RosterColumn = ({ title, color, items, emptyText }) => (
  <div
    style={{
      borderRadius: 12,
      border: `1px solid ${color}33`,
      background: `${color}08`,
      padding: 16,
      minHeight: 280,
    }}
  >
    <Title level={5} style={{ marginTop: 0, color }}>
      {title} ({items.length})
    </Title>
    {items.length === 0 ? (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
    ) : (
      <Space direction="vertical" style={{ width: "100%" }} size={8}>
        {items.map((item) => {
          const meta = REASON_META[item.reasonCode] || REASON_META.OUT;
          return (
            <div
              key={item.teamId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
                background: "#fff",
                borderRadius: 8,
                padding: "10px 12px",
                border: "1px solid #f0f0f0",
              }}
            >
              <div>
                <Text strong>{item.teamName}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.trackName || "—"}
                  {item.rank != null ? ` · Hạng ${item.rank}` : ""}
                  {item.totalScore != null ? ` · ${Number(item.totalScore).toFixed(2)}` : ""}
                </Text>
              </div>
              <Tooltip title={item.reasonLabel || meta.label}>
                <Tag color={meta.color}>{item.reasonLabel || meta.label}</Tag>
              </Tooltip>
            </div>
          );
        })}
      </Space>
    )}
  </div>
);

const AdvanceRosterPanel = ({ roundId, isPublished }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [trackFilter, setTrackFilter] = useState("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!roundId || !isPublished) return;
    setLoading(true);
    setError(null);
    try {
      const page = await roundResultsService.getAdvanceRoster(roundId, { page: 0, size: 200 });
      setItems(page?.items || []);
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [roundId, isPublished]);

  useEffect(() => {
    load();
  }, [load]);

  const trackOptions = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (item.trackId != null) map.set(String(item.trackId), item.trackName || `Bảng #${item.trackId}`);
    });
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (trackFilter !== "all" && String(item.trackId) !== trackFilter) return false;
      if (!q) return true;
      return String(item.teamName || "").toLowerCase().includes(q);
    });
  }, [items, trackFilter, query]);

  const advanced = filtered.filter((i) => i.status === "ADVANCED");
  const eliminated = filtered.filter((i) => i.status !== "ADVANCED");

  const exportCsv = () => {
    const header = ["teamId", "teamName", "trackId", "trackName", "status", "reasonCode", "reasonLabel", "rank", "totalScore"];
    const rows = filtered.map((i) =>
      [i.teamId, i.teamName, i.trackId, i.trackName, i.status, i.reasonCode, i.reasonLabel, i.rank, i.totalScore]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advance-roster-round-${roundId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isPublished) {
    return (
      <Alert
        showIcon
        type="info"
        message="Chưa công bố kết quả"
        description="Danh sách Chung kết / loại chỉ xem được sau khi công bố kết quả Sơ loại."
      />
    );
  }

  if (loading && items.length === 0) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (error) {
    return (
      <Alert
        showIcon
        type="error"
        message="Không tải được danh sách Chung kết & bị loại"
        action={<Button size="small" onClick={load}>Thử lại</Button>}
      />
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
        <Space wrap>
          <Select
            style={{ minWidth: 180 }}
            value={trackFilter}
            onChange={setTrackFilter}
            options={[{ value: "all", label: "Tất cả bảng" }, ...trackOptions]}
          />
          <Input.Search
            allowClear
            placeholder="Tìm đội…"
            style={{ width: 220 }}
            onSearch={setQuery}
            onChange={(e) => {
              if (!e.target.value) setQuery("");
            }}
          />
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={exportCsv} disabled={filtered.length === 0}>
            Xuất tệp bảng
          </Button>
        </Space>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <RosterColumn title="Vào Chung kết" color="#389e0d" items={advanced} emptyText="Chưa có đội vào Chung kết" />
        </Col>
        <Col xs={24} md={12}>
          <RosterColumn title="Bị loại" color="#cf1322" items={eliminated} emptyText="Không có đội bị loại" />
        </Col>
      </Row>
    </Space>
  );
};

export default AdvanceRosterPanel;
