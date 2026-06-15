import { Alert, Card, Empty, Space, Table, Tag, Typography } from "antd";
import { WarningOutlined, ExclamationCircleOutlined, CheckCircleOutlined, SyncOutlined } from "@ant-design/icons";

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
      <Card style={{ borderRadius: 12 }}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <span style={{ fontWeight: 500 }}>Không có đội đồng điểm tại ranh giới đi tiếp.</span>
              <br />
              <span style={{ fontSize: 13 }}>Hệ thống đã kiểm tra và xác nhận danh sách các đội đi tiếp hoàn toàn hợp lệ, không cần phân xử thêm.</span>
            </div>
          } 
        />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        showIcon
        type="warning"
        message={`${items.length} trường hợp cần theo dõi tại ranh giới Top N`}
        description="Hệ thống tự động phân xử dựa trên tiêu chí phụ. Nếu vẫn hòa, sự cố sẽ được gắn cờ 'Escalate BTC' để Ban tổ chức quyết định tay."
      />
      {items.map((item) => (
        <Card
          key={item.key}
          title={<Space><WarningOutlined style={{ color: '#faad14' }} /><Text strong style={{ fontSize: 16 }}>Bảng {item.groupLabel}</Text></Space>}
          extra={
            item.escalationRequired ? (
              <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ fontWeight: 600, padding: '2px 10px' }}>Escalate BTC</Tag>
            ) : item.resolved ? (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 600, padding: '2px 10px' }}>Đã xử lý</Tag>
            ) : (
              <Tag color="processing" icon={<SyncOutlined spin />} style={{ fontWeight: 600, padding: '2px 10px' }}>Đang xử lý</Tag>
            )
          }
          styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '16px 24px' } }}
          style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
        >
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Space wrap style={{ marginBottom: 4, padding: '10px 16px', borderRadius: 8, width: '100%', background: 'var(--ant-color-bg-container-disabled)' }}>
              <Tag color="blue" bordered={false} style={{ fontWeight: 500 }}>{ruleLabels[item.rule] || item.rule}</Tag>
              <Text type="secondary">Điểm ranh giới: <Text strong>{item.cutoffScore.toFixed(2)}</Text></Text>
              <Text type="secondary">Số suất còn lại: <Text strong>{item.remainingSlots}</Text></Text>
            </Space>
            <Title level={5} style={{ margin: 0, fontSize: 15 }}>Các đội đang đồng điểm</Title>
            <Table
              rowKey="key"
              size="middle"
              pagination={false}
              dataSource={item.teams}
              columns={[
                { 
                  title: "Đội", 
                  dataIndex: "teamName",
                  render: (name, record) => (
                    <Space direction="vertical" size={2}>
                      <Text strong style={{ fontSize: 14 }}>{name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{record.groupLabel}</Text>
                    </Space>
                  )
                },
                { 
                  title: "Điểm gốc", 
                  dataIndex: "weightedAvgScore", 
                  align: "right", 
                  render: (value) => <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: '#2563eb' }}>{value.toFixed(2)}</span> 
                },
                { 
                  title: "Penalty", 
                  dataIndex: "penaltyScore", 
                  align: "right", 
                  render: (value) => <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: '#dc2626' }}>{value.toFixed(2)}</span> 
                },
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

