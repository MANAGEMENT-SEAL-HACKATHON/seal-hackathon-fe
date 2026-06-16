import { useState } from "react";
import { Alert, Button, Card, Empty, Input, Modal, Space, Table, Tag, Typography } from "antd";
import { CheckOutlined, CloseOutlined, StarOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { TextArea } = Input;

const WildcardPanel = ({ wildcard, error, decidingReviewId, onDecide }) => {
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState("");
  const enabled = wildcard.config.hackathonEnabled && wildcard.config.roundEnabled;

  const closeModal = () => {
    setDecision(null);
    setNote("");
  };

  const confirmDecision = async () => {
    const success = await onDecide(decision.candidate, decision.approved, note.trim());
    if (success) closeModal();
  };

  if (error) return <Alert showIcon type="error" message="Không tải được danh sách Wild Card" description={error.message} />;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space wrap style={{ marginBottom: 4 }}>
        <Tag color={wildcard.config.hackathonEnabled ? "success" : "default"} style={{ fontWeight: 500, padding: '2px 10px' }}>
          Global: {wildcard.config.hackathonEnabled ? "Đã bật" : "Đang tắt"}
        </Tag>
        <Tag color={wildcard.config.roundEnabled ? "success" : "default"} style={{ fontWeight: 500, padding: '2px 10px' }}>
          Round: {wildcard.config.roundEnabled ? "Đã bật" : "Đang tắt"}
        </Tag>
        <Tag color="blue" bordered={false} style={{ fontWeight: 600, padding: '2px 10px' }}>
          {wildcard.config.availableSlots} suất vé vớt
        </Tag>
      </Space>

      <Alert
        showIcon
        type={enabled ? "info" : "warning"}
        message={<Text strong>{enabled ? "Wild Card đang khả dụng" : "Chưa thể xét Wild Card"}</Text>}
        description={<Text type="secondary">Chức năng này cần được bật cấu hình Vé vớt ở cả cấp độ Hackathon và Vòng thi. Hệ thống sẽ tự động so sánh chéo điểm số giữa các bảng để đưa ra đề xuất.</Text>}
        style={{ borderRadius: 8 }}
      />

      <Card 
        title={<Space><StarOutlined style={{ color: '#faad14' }} /><Text strong style={{ fontSize: 16 }}>Đề xuất Wild Card cross-bảng</Text></Space>}
        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '16px 24px' } }}
        style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
      >
        <Table
          rowKey="key"
          pagination={false}
          dataSource={wildcard.items}
          locale={{ 
            emptyText: (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <span style={{ fontWeight: 500 }}>Chưa có danh sách đề xuất vé vớt</span>
                    <br />
                    <span style={{ fontSize: 13 }}>Tính năng này có thể chưa được bật, hoặc hiện tại không có đội thi nào đáp ứng đủ điều kiện nhận vé vớt.</span>
                  </div>
                } 
              />
            )
          }}
          scroll={{ x: 760 }}
          size="middle"
          columns={[
            { 
              title: "Ưu tiên", 
              dataIndex: "candidateRank", 
              width: 100, 
              align: "center",
              render: (value) => <span style={{ fontWeight: 'bold', fontSize: 16, color: '#d48806' }}>#{value}</span> 
            },
            { 
              title: "Đội thi", 
              dataIndex: "teamName", 
              render: (value, item) => (
                <Space direction="vertical" size={4}>
                  <Text strong style={{ fontSize: 15 }}>{value}</Text>
                  <Tag bordered={false} style={{ margin: 0, fontSize: 12 }}>
                    {item.groupLabel}
                  </Tag>
                </Space>
              ) 
            },
            { 
              title: "Điểm chéo", 
              dataIndex: "weightedAvgScore", 
              align: "right", 
              render: (value) => <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#2563eb' }}>{value.toFixed(2)}</span> 
            },
            {
              title: "Trạng thái",
              dataIndex: "coordinatorApproved",
              render: (approved) =>
                approved === true ? <Tag color="success" style={{ fontWeight: 600, padding: '4px 10px' }}>Đã duyệt</Tag> : approved === false ? <Tag color="error" style={{ fontWeight: 600, padding: '4px 10px' }}>Đã từ chối</Tag> : <Tag color="processing" style={{ fontWeight: 600, padding: '4px 10px' }}>Chờ duyệt</Tag>,
            },
            {
              title: "Thao tác",
              key: "actions",
              width: 210,
              render: (_, candidate) => (
                <Space>
                  <Button
                    type="primary"
                    ghost
                    icon={<CheckOutlined />}
                    disabled={!enabled || !candidate.reviewId}
                    loading={decidingReviewId === candidate.reviewId}
                    onClick={() => setDecision({ candidate, approved: true })}
                  >
                    Duyệt
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    disabled={!enabled || !candidate.reviewId}
                    loading={decidingReviewId === candidate.reviewId}
                    onClick={() => setDecision({ candidate, approved: false })}
                  >
                    Từ chối
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={Boolean(decision)}
        title={decision?.approved ? "Xác nhận duyệt Wild Card" : "Xác nhận từ chối Wild Card"}
        okText={decision?.approved ? "Duyệt vé vớt" : "Từ chối"}
        okButtonProps={{ danger: decision?.approved === false }}
        confirmLoading={decidingReviewId === decision?.candidate?.reviewId}
        onCancel={closeModal}
        onOk={confirmDecision}
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Alert
            type={decision?.approved ? "info" : "warning"}
            showIcon
            message={decision?.candidate?.teamName}
            description="Quyết định này sẽ được lưu vào Wildcard Review và Audit Log."
          />
          <Text strong>Ghi chú của Coordinator</Text>
          <TextArea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            showCount
            rows={4}
            placeholder="Nêu ngắn gọn căn cứ cho quyết định..."
          />
        </Space>
      </Modal>
    </Space>
  );
};

export default WildcardPanel;

