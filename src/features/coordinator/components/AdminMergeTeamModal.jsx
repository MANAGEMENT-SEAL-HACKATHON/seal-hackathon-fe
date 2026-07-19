import { useEffect, useMemo } from 'react';
import { Alert, Form, Modal, Select, Typography, message } from 'antd';
import { teamService } from '../../teams/services/teamService';
import { getTeamErrorMessage } from '../constants/team.constants';

const { Text } = Typography;

const AdminMergeTeamModal = ({
  open,
  targetTeam,
  incompleteTeams,
  minTeamSize = 3,
  maxTeamSize = 5,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) form.resetFields();
  }, [open, form]);

  const sourceOptions = useMemo(() => {
    if (!targetTeam) return [];
    return incompleteTeams
      .filter((t) => t.teamId !== targetTeam.teamId)
      .filter((t) => {
        const total = targetTeam.memberCount + t.memberCount;
        return total >= minTeamSize && total <= maxTeamSize;
      })
      .map((t) => ({
        value: t.teamId,
        label: `${t.teamName} (${t.memberCount} thành viên)`,
      }));
  }, [incompleteTeams, targetTeam, minTeamSize, maxTeamSize]);

  const handleSubmit = async () => {
    if (!targetTeam?.teamId) return;
    try {
      const values = await form.validateFields();
      await teamService.adminMergeTeams(targetTeam.teamId, values.sourceTeamId);
      message.success('Đã gộp đội thành công');
      onSuccess?.();
      onClose();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(getTeamErrorMessage(error, 'Không thể gộp đội'));
    }
  };

  return (
    <Modal
      title={`Gộp đội — ${targetTeam?.teamName || ''}`}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Gộp đội"
      okButtonProps={{ disabled: sourceOptions.length === 0 }}
      destroyOnClose
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Chọn đội nguồn để gộp vào đội đích. Tổng thành viên sau gộp phải từ {minTeamSize} đến {maxTeamSize}.
      </Text>
      {sourceOptions.length === 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Không có đội phù hợp để gộp"
          description={`Không tìm thấy đội khác sao cho tổng thành viên từ ${minTeamSize} đến ${maxTeamSize}.`}
        />
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="sourceTeamId"
          label="Đội nguồn (sẽ bị giải tán)"
          rules={[{ required: true, message: 'Chọn đội nguồn' }]}
        >
          <Select
            placeholder="Chọn đội nguồn"
            disabled={sourceOptions.length === 0}
            options={sourceOptions}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AdminMergeTeamModal;
