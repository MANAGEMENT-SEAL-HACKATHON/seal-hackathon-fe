import { useEffect } from 'react';
import { Form, Modal, Select, Typography, message } from 'antd';
import { teamService } from '../../teams/services/teamService';
import { getTeamErrorMessage } from '../constants/team.constants';

const { Text } = Typography;

const AdminAddMemberModal = ({ open, team, orphans, onClose, onSuccess }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) form.resetFields();
  }, [open, form]);

  const handleSubmit = async () => {
    if (!team?.teamId) return;
    try {
      const values = await form.validateFields();
      await teamService.adminAddMember(team.teamId, values.userId);
      message.success('Đã thêm thành viên vào đội');
      onSuccess?.();
      onClose();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(getTeamErrorMessage(error, 'Không thể thêm thành viên'));
    }
  };

  return (
    <Modal
      title={`Thêm thành viên — ${team?.teamName || ''}`}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Thêm vào đội"
      destroyOnClose
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Chọn 1 sinh viên mồ côi để thêm vào đội (hiện {team?.memberCount}/{team?.maxMembers}).
      </Text>
      <Form form={form} layout="vertical">
        <Form.Item
          name="userId"
          label="Sinh viên mồ côi"
          rules={[{ required: true, message: 'Chọn sinh viên' }]}
        >
          <Select
            placeholder="Chọn sinh viên"
            options={orphans.map((o) => ({
              value: o.id,
              label: `${o.fullName} (${o.email})`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AdminAddMemberModal;
