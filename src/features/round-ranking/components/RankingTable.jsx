import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import { Ban } from "lucide-react";

const { Text } = Typography;

const statusColor = {
  ACTIVE: "green",
  ELIMINATED: "red",
};

const RankingTable = ({
  items,
  isLoading,
  canEliminate = true,
  eliminatingTeamId,
  onEliminate,
}) => {
  const columns = [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      width: 88,
      align: "center",
      render: (rank) => <Text strong>#{rank || "-"}</Text>,
    },
    {
      title: "Đội",
      dataIndex: "teamName",
      key: "teamName",
      render: (teamName, record) => (
        <Space direction="vertical" size={2}>
          <Text strong delete={record.isEliminated}>{teamName}</Text>
          <Text type="secondary">Team ID: {record.teamId}</Text>
        </Space>
      ),
    },
    {
      title: "Bảng",
      dataIndex: "groupLabel",
      key: "groupLabel",
      responsive: ["md"],
      render: (groupLabel) => <Tag>{groupLabel}</Tag>,
    },
    {
      title: "Điểm TB trọng số",
      dataIndex: "scoreLabel",
      key: "scoreLabel",
      align: "right",
      render: (scoreLabel) => <Text strong>{scoreLabel}</Text>,
    },
    {
      title: "Tiebreak",
      dataIndex: "tiebreakRequired",
      key: "tiebreakRequired",
      responsive: ["lg"],
      render: (required) => (required ? <Tag color="gold">Cần tiebreak</Tag> : <Text type="secondary">-</Text>),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => <Tag color={statusColor[status] || "default"}>{status}</Tag>,
    },
    {
      title: "Hành động",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Button
          danger
          icon={<Ban size={16} />}
          disabled={!canEliminate || record.isEliminated}
          loading={eliminatingTeamId === record.teamId}
          onClick={() => onEliminate(record)}
        >
          Loại đội
        </Button>
      ),
    },
  ];

  return (
    <Table
      rowKey={(record) => record.teamId}
      columns={columns}
      dataSource={items}
      loading={isLoading}
      scroll={{ x: "max-content" }}
      onRow={(record) => ({
        style: record.isEliminated ? { opacity: 0.65 } : undefined,
      })}
      locale={{
        emptyText: <Empty description="Chưa có dữ liệu bảng xếp hạng." />,
      }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đội`,
      }}
    />
  );
};

export default RankingTable;
