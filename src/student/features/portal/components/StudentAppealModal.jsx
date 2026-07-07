import { useState } from 'react';
import { Modal, Form, Input, Select, message, Alert } from 'antd';
import { studentPortalService } from '../services/studentPortal.service';

const StudentAppealModal = ({
  open,
  onClose,
  teamId,
  roundId,
  roundOptions = [],
  onRoundChange,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    const effectiveRoundId = values.roundId ?? roundId;
    if (!teamId || !effectiveRoundId) {
      message.warning('Thiếu thông tin đội hoặc vòng thi để gửi khiếu nại.');
      return;
    }
    setLoading(true);
    try {
      await studentPortalService.createAppeal({
        teamId,
        roundId: effectiveRoundId,
        reason: values.reason,
        evidenceUrl: values.evidenceUrl,
      });
      message.success('Đã gửi khiếu nại thành công. Ban tổ chức sẽ xem xét và phản hồi.');
      form.resetFields();
      onSuccess?.();
      onClose?.();
    } catch (error) {
      message.error(error?.message || 'Không thể gửi khiếu nại. Có thể đã hết thời hạn hoặc không hợp lệ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Gửi khiếu nại quyết định loại đội"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Gửi khiếu nại"
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        message="Quy định khiếu nại"
        description="Chỉ Trưởng nhóm (Leader) của đội bị loại thủ công (ELIMINATED) mới có thể gửi khiếu nại trong thời hạn quy định của Ban tổ chức."
        style={{ marginBottom: 16 }}
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ roundId: roundId ?? undefined }}
      >
        {roundOptions.length > 1 && (
          <Form.Item
            name="roundId"
            label="Vòng thi bị loại"
            rules={[{ required: true, message: 'Chọn vòng thi cần khiếu nại' }]}
          >
            <Select
              placeholder="Chọn vòng"
              options={roundOptions}
              onChange={(value) => onRoundChange?.(value)}
            />
          </Form.Item>
        )}
        <Form.Item
          name="reason"
          label="Lý do khiếu nại việc đội bị loại"
          rules={[{ required: true, message: 'Vui lòng mô tả lý do' }, { min: 10, message: 'Tối thiểu 10 ký tự' }]}
        >
          <Input.TextArea rows={4} placeholder="Mô tả chi tiết lý do khiếu nại quyết định loại thủ công đội của bạn trong vòng thi này..." />
        </Form.Item>
        <Form.Item name="evidenceUrl" label="Link minh chứng (tuỳ chọn)">
          <Input placeholder="https://..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StudentAppealModal;
