// src/features/rounds/components/ScoringCheckPanel.jsx
import { useMemo, useState } from "react";
import { Alert, Button, Empty, Space, Table, Tag, Typography } from "antd";
import { UnorderedListOutlined } from "@ant-design/icons";
import ScoreBreakdownDrawer from "./ScoreBreakdownDrawer";

const { Text } = Typography;

/**
 * Tab «Kiểm tra chấm» — list submissions from ranking; open breakdown drawer.
 */
const ScoringCheckPanel = ({ roundId, ranking, isLoading, error }) => {
  const [target, setTarget] = useState(null);

  const items = useMemo(() => ranking?.items || [], [ranking]);

  const columns = [
    {
      title: "Hạng",
      dataIndex: "rank",
      width: 70,
      align: "center",
    },
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
      title: "Trạng thái nộp",
      dataIndex: "submissionStatus",
      width: 120,
      render: (s) => (s ? <Tag>{s}</Tag> : "—"),
    },
    {
      title: "",
      key: "action",
      width: 140,
      render: (_, row) =>
        row.submissionId ? (
          <Button
            type="link"
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={() => setTarget(row)}
          >
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
        message="Kiểm tra chấm theo giám khảo"
        description="Mở ma trận judges × tiêu chí. Ô thiếu hiện đỏ «Chưa chấm». (G5-J: audit list đầy đủ deferred — dùng drawer từng submission.)"
      />
      {error && <Alert showIcon type="error" message="Không tải được danh sách" description={error.message} />}
      <Table
        rowKey="key"
        loading={isLoading}
        columns={columns}
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
