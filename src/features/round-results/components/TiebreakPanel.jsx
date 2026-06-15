import { Alert, Card, Empty, Space, Table, Tag, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

const ruleLabels = {
  SUBMISSION_TIME: "Ưu tiên thời gian nộp bài",
  PENALTY_SCORE: "Áp dụng điểm phạt",
  COORDINATOR_DECISION: "Quyết định của BTC",
};

const TiebreakPanel = ({ items, error }) => {
  if (error) return <Alert showIcon type="error" message="Không tải được dữ liệu tiebreak" description={error.message} />;
  if (!items.length) {
    return (
      <Card>
        <Empty description="Không có trường hợp đồng điểm tại ranh giới Top N." />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        showIcon
        type="warning"
        message={`${items.length} trường hợp cần theo dõi tại ranh giới Top N`}
        description="Màn hình này chỉ hiển thị kết quả xử lý từ Backend. FE không tự tính penalty hoặc quyết định đội đi tiếp."
      />
      {items.map((item) => (
        <Card
          key={item.key}
          title={<Space><WarningOutlined /><span>{item.groupLabel}</span></Space>}
          extra={
            item.escalationRequired ? (
              <Tag color="error">Escalate BTC</Tag>
            ) : item.resolved ? (
              <Tag color="success">Đã xử lý</Tag>
            ) : (
              <Tag color="warning">Đang xử lý</Tag>
            )
          }
        >
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Space wrap>
              <Tag color="blue">{ruleLabels[item.rule] || item.rule}</Tag>
              <Text type="secondary">Điểm ranh giới: <Text strong>{item.cutoffScore.toFixed(2)}</Text></Text>
              <Text type="secondary">Số suất còn lại: <Text strong>{item.remainingSlots}</Text></Text>
            </Space>
            <Title level={5} style={{ margin: 0 }}>Các đội đang đồng điểm</Title>
            <Table
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={item.teams}
              columns={[
                { title: "Đội", dataIndex: "teamName" },
                { title: "Bảng", dataIndex: "groupLabel" },
                { title: "Điểm gốc", dataIndex: "weightedAvgScore", align: "right", render: (value) => value.toFixed(2) },
                { title: "Penalty", dataIndex: "penaltyScore", align: "right", render: (value) => value.toFixed(2) },
              ]}
              scroll={{ x: 560 }}
            />
          </Space>
        </Card>
      ))}
    </Space>
  );
};

export default TiebreakPanel;

