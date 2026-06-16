import { useMemo, useState } from "react";
import { Card, Empty, Segmented, Skeleton, Space, Table, Tag, Typography } from "antd";
import { CrownOutlined, TrophyOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

const PublicScoreboard = ({ scoreboard, isLoading }) => {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const groups = useMemo(
    () => [...new Set(scoreboard.items.map((item) => item.groupLabel))],
    [scoreboard.items],
  );
  const items = selectedGroup === "all"
    ? scoreboard.items
    : scoreboard.items.filter((item) => item.groupLabel === selectedGroup);
  const winners = items.filter((item) => item.rank <= 3).slice(0, 3);

  if (isLoading) return <Skeleton active paragraph={{ rows: 9 }} />;
  if (!scoreboard.items.length) {
    return (
      <Card style={{ textAlign: "center", padding: "40px 12px" }}>
        <Empty
          image={<TrophyOutlined style={{ color: "#faad14", fontSize: 56 }} />}
          description="Kết quả sẽ xuất hiện sau khi Ban tổ chức công bố."
        />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Segmented
        block
        options={[{ label: "Tất cả bảng", value: "all" }, ...groups.map((group) => ({ label: group, value: group }))]}
        value={selectedGroup}
        onChange={setSelectedGroup}
      />

      {selectedGroup !== "all" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          {winners.map((item) => (
            <Card
              key={item.key}
              style={{
                borderColor: item.rank === 1 ? "#ffd666" : undefined,
                background: item.rank === 1 ? "linear-gradient(145deg, #fffbe6, #ffffff)" : undefined,
              }}
            >
              <Space direction="vertical" size={8}>
                <Tag color={item.rank === 1 ? "gold" : "blue"} icon={item.rank === 1 ? <CrownOutlined /> : undefined}>
                  Top {item.rank}
                </Tag>
                <Title level={4} style={{ margin: 0 }}>{item.teamName}</Title>
                <Text type="secondary">{item.groupLabel}</Text>
                <Text strong style={{ fontSize: 28, color: item.rank === 1 ? "#d48806" : undefined }}>
                  {item.score.toFixed(2)}
                </Text>
              </Space>
            </Card>
          ))}
        </div>
      )}

      <Card title="Bảng xếp hạng đã công bố">
        <Table
          rowKey="key"
          pagination={false}
          dataSource={items}
          scroll={{ x: 580 }}
          columns={[
            { title: "Hạng", dataIndex: "rank", width: 88, render: (value) => <Text strong>#{value}</Text> },
            { title: "Đội thi", dataIndex: "teamName", render: (value) => <Text strong>{value}</Text> },
            { title: "Bảng", dataIndex: "groupLabel" },
            { title: "Điểm", dataIndex: "score", align: "right", render: (value) => <Text strong>{value.toFixed(2)}</Text> },
            { title: "Kết quả", dataIndex: "isAdvanced", render: (value) => value ? <Tag color="success">Đi tiếp</Tag> : <Tag>Hoàn thành</Tag> },
          ]}
        />
      </Card>
    </Space>
  );
};

export default PublicScoreboard;

