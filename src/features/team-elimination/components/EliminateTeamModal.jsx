import { useEffect } from "react";
import { Form, Input, Modal, Typography } from "antd";

const { Text } = Typography;

const EliminateTeamModal = ({ open, team, confirmLoading, onCancel, onConfirm }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) form.resetFields();
  }, [form, open, team?.teamId]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onConfirm(values.reason);
  };

  return (
    <Modal
      title="Loại đội do vi phạm?"
      open={open}
      okText="Xác nhận loại đội"
      okButtonProps={{ danger: true }}
      cancelText="Hủy"
      confirmLoading={confirmLoading}
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnHidden
    >
      <Text>
        Đội <Text strong>{team?.teamName}</Text> sẽ chuyển sang trạng thái ELIMINATED và không
        tiếp tục tham gia vòng sơ loại. Thao tác này chỉ dùng cho trường hợp vi phạm quy chế.
      </Text>

      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="Lý do vi phạm"
          name="reason"
          rules={[
            { required: true, whitespace: true, message: "Vui lòng nhập lý do loại đội." },
          ]}
        >
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={500}
            showCount
            placeholder="Ví dụ: Vi phạm quy chế thi hoặc sử dụng tài nguyên không hợp lệ..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EliminateTeamModal;
