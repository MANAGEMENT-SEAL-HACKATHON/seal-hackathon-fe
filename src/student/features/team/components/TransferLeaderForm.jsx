import { Button, Form, Modal, Select, theme } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

const isSameId = (left, right) => String(left) === String(right);

const TransferLeaderForm = ({ team, form, loading, onTransferLeader }) => {
  const { token } = theme.useToken();

  if (!team.canTransferLeader || team.transferCandidates.length === 0) return null;

  const handleTransfer = (values) => {
    const nextLeader = team.transferCandidates.find((member) => isSameId(member.userId, values.newLeaderId));
    Modal.confirm({
      title: 'Chuyển quyền trưởng nhóm?',
      content: `Người nhận quyền: ${nextLeader?.fullName || 'thành viên đã chọn'}. Sau khi chuyển, bạn sẽ không còn là trưởng nhóm.`,
      okText: 'Chuyển quyền',
      cancelText: 'Hủy',
      onOk: async () => {
        await onTransferLeader(team.id, values.newLeaderId);
        form.resetFields();
      },
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleTransfer}
      requiredMark={false}
      style={{ marginTop: 12 }}
    >
      <Form.Item
        name="newLeaderId"
        rules={[{ required: true, message: 'Chọn thành viên nhận quyền.' }]}
      >
        <Select
          placeholder="Chọn thành viên..."
          size="large"
          options={team.transferCandidates.map((member) => ({
            value: member.userId,
            label: `${member.fullName} - ${member.email}`,
          }))}
        />
      </Form.Item>
      <Button type="primary" icon={<SwapOutlined />} htmlType="submit" loading={loading} style={{ borderRadius: 8, fontWeight: 600 }}>
        Chuyển leader
      </Button>
    </Form>
  );
};

export default TransferLeaderForm;
