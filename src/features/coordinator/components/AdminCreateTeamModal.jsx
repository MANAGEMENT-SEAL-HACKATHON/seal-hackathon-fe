import { useEffect, useMemo, useState } from 'react';
import { Form, Input, Modal, Select, Typography, message } from 'antd';
import { teamService } from '../../teams/services/teamService';
import { getTeamErrorMessage } from '../constants/team.constants';

const { Text } = Typography;

const AdminCreateTeamModal = ({ open, hackathonId, orphans, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setSelectedIds([]);
    }
  }, [open, form]);

  const leaderOptions = useMemo(
    () => orphans.filter((o) => selectedIds.includes(o.id)),
    [orphans, selectedIds],
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const leaderId = values.leaderId;
      const memberIds = selectedIds.filter((id) => id !== leaderId);

      if (selectedIds.length < 3 || selectedIds.length > 5) {
        message.error('Phải chọn từ 3 đến 5 sinh viên mồ côi');
        return;
      }
      if (memberIds.length < 2 || memberIds.length > 4) {
        message.error('Số thành viên (không kể nhóm trưởng) phải từ 2 đến 4');
        return;
      }

      setSubmitting(true);
      await teamService.adminCreateTeam({
        hackathonId,
        teamName: values.teamName.trim(),
        leaderId,
        memberIds,
      });
      message.success('Đã tạo đội mới thành công');
      onSuccess?.();
      onClose();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(getTeamErrorMessage(error, 'Không thể tạo đội'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Gom đội mới"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Tạo đội"
      destroyOnClose
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Chọn 3–5 sinh viên mồ côi, chỉ định nhóm trưởng và đặt tên đội.
      </Text>
      <Form form={form} layout="vertical">
        <Form.Item
          label="Sinh viên mồ côi"
          required
        >
          <Select
            mode="multiple"
            placeholder="Chọn 3–5 sinh viên"
            value={selectedIds}
            onChange={(ids) => {
              setSelectedIds(ids);
              form.setFieldValue('leaderId', undefined);
            }}
            options={orphans.map((o) => ({
              value: o.id,
              label: `${o.fullName} (${o.email})`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="leaderId"
          label="Nhóm trưởng"
          rules={[{ required: true, message: 'Chọn nhóm trưởng' }]}
        >
          <Select
            placeholder="Chọn nhóm trưởng trong danh sách đã chọn"
            disabled={leaderOptions.length === 0}
            options={leaderOptions.map((o) => ({
              value: o.id,
              label: o.fullName,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="teamName"
          label="Tên đội"
          rules={[{ required: true, message: 'Nhập tên đội' }]}
        >
          <Input placeholder="Ví dụ: Biệt Đội Giải Cứu" maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AdminCreateTeamModal;
