import { useMemo, useState } from "react";
import { Alert, Card, Empty, Segmented, Space, Table, Tag, Typography } from "antd";
import { TrophyOutlined } from "@ant-design/icons";

const { Text } = Typography;

const score = (value) => Number(value || 0).toFixed(2);

const OfficialRankingPanel = ({ ranking, isLoading, error }) => {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const activeItems = useMemo(
    () => ranking.items.filter((item) => item.status === "ACTIVE"),
    [ranking.items],
  );
  const groups = useMemo(
    () => [...new Set(activeItems.map((item) => item.groupLabel))],
    [activeItems],
  );
  const items = useMemo(
    () =>
      selectedGroup === "all"
        ? activeItems
        : activeItems.filter((item) => item.groupLabel === selectedGroup),
    [activeItems, selectedGroup],
  );

  const columns = [
    {
      title: "Hạng",
      dataIndex: "rank",
      width: 82,
      render: (rank) => (
        <Text strong style={{ color: rank === 1 ? "#d48806" : undefined, fontSize: 16 }}>
          #{rank}
        </Text>
      ),
    },
    {
      title: "Đội thi",
      dataIndex: "teamName",
      render: (name, item) => (
        <Space direction="vertical" size={1}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {item.groupLabel}
          </Text>
        </Space>
      ),
    },
    {
      title: "Điểm chính thức",
      dataIndex: "weightedAvgScore",
      align: "right",
      render: (value) => <Text strong style={{ fontSize: 17 }}>{score(value)}</Text>,
    },
    {
      title: "Kết quả",
      key: "result",
      width: 160,
      render: (_, item) =>
        item.isAdvanced || item.qualificationStatus === "ADVANCED" ? (
          <Tag color="success">Được đề xuất đi tiếp</Tag>
        ) : (
          <Tag>Chờ chốt danh sách</Tag>
        ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        showIcon
        type="info"
        message="Bảng xếp hạng chính thức sau khóa chấm"
        description="Mỗi bảng được xếp hạng độc lập theo điểm trung bình có trọng số. Điểm CALIBRATION và PENALTY không hiển thị trong bảng này."
      />
      {error && <Alert showIcon type="error" message="Không tải được leaderboard" description={error.message} />}
      <Card
        title={<Space><TrophyOutlined />Leaderboard Sơ loại</Space>}
        extra={<Text type="secondary">{activeItems.length} đội ACTIVE</Text>}
      >
        <Segmented
          block
          options={[{ label: "Tất cả bảng", value: "all" }, ...groups.map((group) => ({ label: group, value: group }))]}
          value={selectedGroup}
          onChange={setSelectedGroup}
          style={{ marginBottom: 16 }}
        />
        <Table
          rowKey="key"
          columns={columns}
          dataSource={items}
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có kết quả chính thức." /> }}
          scroll={{ x: 720 }}
        />
      </Card>
    </Space>
  );
};

export default OfficialRankingPanel;
