// src/features/rounds/results/components/OfficialRankingPanel.jsx
import { useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Segmented, Space, Table, Tag, Typography } from "antd";
import { TrophyOutlined, UnorderedListOutlined } from "@ant-design/icons";
import ScoreBreakdownDrawer from "./ScoreBreakdownDrawer";
import { formatScore } from "../../../shared/utils/formatScore";

const { Text } = Typography;

const score = (value) => formatScore(value);

const OfficialRankingPanel = ({
  ranking,
  isLoading,
  error,
  advancePreviewTeamIds,
  hasAdvanced,
  isPublished,
  rosterDecided,
  topN: _topN,
  roundId,
}) => {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [breakdownTarget, setBreakdownTarget] = useState(null);
  const previewSet = useMemo(
    () => advancePreviewTeamIds ?? new Set(),
    [advancePreviewTeamIds],
  );
  const displayItems = useMemo(() => ranking.items, [ranking.items]);
  const groups = useMemo(
    () => [...new Set(displayItems.map((item) => item.groupLabel))],
    [displayItems],
  );
  const items = useMemo(
    () =>
      selectedGroup === "all"
        ? displayItems
        : displayItems.filter((item) => item.groupLabel === selectedGroup),
    [displayItems, selectedGroup],
  );

  const columns = [
    {
      title: "Hạng",
      dataIndex: "rank",
      width: 80,
      align: "center",
      render: (rank) => {
        let color = undefined;
        let border = "none";
        if (rank === 1) { color = "#d48806"; border = `1px solid ${color}40`; }
        else if (rank === 2) { color = "#595959"; border = `1px solid ${color}40`; }
        else if (rank === 3) { color = "#ad6800"; border = `1px solid ${color}40`; }
        
        return (
          <div style={{
            color: color,
            fontWeight: "bold",
            fontSize: 16,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            margin: "0 auto",
            border: border
          }}>
            {rank}
          </div>
        );
      },
    },
    {
      title: "Đội thi",
      dataIndex: "teamName",
      render: (name, item) => (
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: 15 }}>{name}</Text>
          <Tag bordered={false} style={{ margin: 0, fontSize: 12 }}>
            {item.groupLabel}
          </Tag>
          {item.tiebreakReasonLabel ? (
            <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
              {item.tiebreakReasonLabel}
            </Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Điểm chính thức",
      dataIndex: "weightedAvgScore",
      align: "right",
      render: (value) => (
        <Text strong style={{ 
          fontSize: 18, 
          fontFamily: 'monospace'
        }}>
          {score(value)}
        </Text>
      ),
    },
    {
      title: "Trạng thái",
      key: "result",
      width: 220,
      render: (_, item) => {
        // Đã chốt chính thức lên BE
        if (item.isAdvanced || item.qualificationStatus === "ADVANCED" || item.participationStatus === "ADVANCED") {
          return <Tag color="success" style={{ fontWeight: 600, padding: "4px 12px", borderRadius: 4 }}>Vào Chung kết</Tag>;
        }
        if (item.participationStatus === "ELIMINATED" || item.isEliminated) {
          return <Tag color="default" style={{ padding: "4px 12px", borderRadius: 4 }}>Bị loại</Tag>;
        }

        // Đang trong giai đoạn Preview (Chờ chốt) — Phase 1: Top-N only, no Vé vớt labels
        if (isPublished) {
          const isProposed = previewSet.has(item.teamId);

          if (isProposed) {
            return <Tag color="processing" style={{ fontWeight: 600, padding: "4px 12px", borderRadius: 4 }}>Đề xuất vào Chung kết</Tag>;
          }

          if (rosterDecided) {
             return <Tag color="default" style={{ padding: "4px 12px", borderRadius: 4 }}>Bị loại</Tag>;
          }

          return <Tag style={{ padding: "4px 12px", borderRadius: 4 }}>Chờ chốt danh sách</Tag>;
        }

        return <Tag style={{ padding: "4px 12px", borderRadius: 4 }}>Chưa công bố</Tag>;
      },
    },
    {
      title: "",
      key: "breakdown",
      width: 120,
      render: (_, item) =>
        item.submissionId ? (
          <Button
            size="small"
            type="link"
            icon={<UnorderedListOutlined />}
            onClick={() => setBreakdownTarget(item)}
          >
            Chi tiết chấm
          </Button>
        ) : null,
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        showIcon
        type="info"
        message="Bảng xếp hạng chính thức sau khóa chấm"
        description="Mỗi bảng được xếp hạng độc lập theo điểm trung bình có trọng số. Điểm trừ phân xử (nếu có) không hiển thị trong bảng này."
      />
      {error && <Alert showIcon type="error" message="Không tải được bảng xếp hạng" description={error.message} />}
      <Card
        title={<Space><TrophyOutlined style={{ color: '#faad14' }} /><Text strong style={{ fontSize: 16 }}>Bảng điểm xếp hạng</Text></Space>}
        extra={
          <Space size="large">
            <Segmented
              options={[{ label: "Tất cả bảng", value: "all" }, ...groups.map((group) => ({ label: group, value: group }))]}
              value={selectedGroup}
              onChange={setSelectedGroup}
              style={{ fontWeight: 500 }}
            />
            <Tag color="blue" bordered={false} style={{ fontWeight: 600, padding: '2px 8px' }}>
              {displayItems.length} đội
            </Tag>
          </Space>
        }
        style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
      >
        <Table
          rowKey="key"
          columns={columns}
          dataSource={items}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="Chưa có kết quả chính thức." /> }}
          scroll={{ x: 720 }}
          size="middle"
        />
      </Card>
      <ScoreBreakdownDrawer
        open={Boolean(breakdownTarget)}
        onClose={() => setBreakdownTarget(null)}
        roundId={roundId}
        submissionId={breakdownTarget?.submissionId}
        teamName={breakdownTarget?.teamName}
      />
    </Space>
  );
};

export default OfficialRankingPanel;
