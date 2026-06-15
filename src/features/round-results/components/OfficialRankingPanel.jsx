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
      width: 80,
      align: "center",
      render: (rank) => {
        let color = undefined;
        let bg = "transparent";
        if (rank === 1) { color = "#d48806"; bg = "#fffbe6"; }
        else if (rank === 2) { color = "#595959"; bg = "#f5f5f5"; }
        else if (rank === 3) { color = "#ad6800"; bg = "#fff2e8"; }
        
        return (
          <div style={{
            background: bg,
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
            border: rank <= 3 ? `1px solid ${color}40` : "none"
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
          <Text strong style={{ fontSize: 15, color: '#1f2937' }}>{name}</Text>
          <Tag bordered={false} style={{ margin: 0, background: '#f3f4f6', color: '#4b5563', fontSize: 12 }}>
            {item.groupLabel}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Điểm chính thức",
      dataIndex: "weightedAvgScore",
      align: "right",
      render: (value) => (
        <span style={{ 
          fontSize: 18, 
          fontWeight: 700, 
          color: '#2563eb',
          fontFamily: 'monospace'
        }}>
          {score(value)}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      key: "result",
      width: 190,
      render: (_, item) =>
        item.isAdvanced || item.qualificationStatus === "ADVANCED" ? (
          <Tag color="success" style={{ fontWeight: 600, padding: '4px 12px', borderRadius: 4 }}>
            Được đề xuất đi tiếp
          </Tag>
        ) : (
          <Tag style={{ color: '#6b7280', background: '#f9fafb', borderColor: '#e5e7eb', padding: '4px 12px', borderRadius: 4 }}>
            Chờ chốt danh sách
          </Tag>
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
              {activeItems.length} đội ACTIVE
            </Tag>
          </Space>
        }
        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '16px 24px' } }}
        style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
      >
        <Table
          rowKey="key"
          columns={columns}
          dataSource={items}
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có kết quả chính thức." /> }}
          scroll={{ x: 720 }}
          size="middle"
        />
      </Card>
    </Space>
  );
};

export default OfficialRankingPanel;
