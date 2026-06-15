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
      <Card>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap>
            <Tag color={wildcard.config.hackathonEnabled ? "success" : "default"}>
              Global: {wildcard.config.hackathonEnabled ? "Đã bật" : "Đang tắt"}
            </Tag>
            <Tag color={wildcard.config.roundEnabled ? "success" : "default"}>
              Round: {wildcard.config.roundEnabled ? "Đã bật" : "Đang tắt"}
            </Tag>
            <Tag color="blue">{wildcard.config.availableSlots} suất vé vớt</Tag>
          </Space>
          <Alert
            showIcon
            type={enabled ? "info" : "warning"}
            message={enabled ? "Wild Card đang khả dụng" : "Chưa thể xét Wild Card"}
            description="Chức năng chỉ hoạt động khi wildcard_enabled được bật ở cả cấp Hackathon và Round. Danh sách được Backend xếp hạng chéo giữa các bảng."
          />
        </Space>
      </Card>

      <Card title={<Space><StarOutlined />Đề xuất Wild Card cross-bảng</Space>}>
        <Table
          rowKey="key"
          pagination={false}
          dataSource={wildcard.items}
          locale={{ emptyText: <Empty description="Không có ứng viên Wild Card." /> }}
          scroll={{ x: 760 }}
          columns={[
            { title: "Ưu tiên", dataIndex: "candidateRank", width: 90, render: (value) => <Text strong>#{value}</Text> },
            { title: "Đội", dataIndex: "teamName", render: (value, item) => <Space direction="vertical" size={0}><Text strong>{value}</Text><Text type="secondary">{item.groupLabel}</Text></Space> },
            { title: "Điểm", dataIndex: "weightedAvgScore", align: "right", render: (value) => <Text strong>{value.toFixed(2)}</Text> },
            {
              title: "Quyết định",
              dataIndex: "coordinatorApproved",
              render: (approved) =>
                approved === true ? <Tag color="success">Đã duyệt</Tag> : approved === false ? <Tag color="error">Đã từ chối</Tag> : <Tag color="warning">Chờ duyệt</Tag>,
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

