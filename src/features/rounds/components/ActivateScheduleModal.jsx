import React, { useMemo, useState } from 'react';
import { Modal, Radio, DatePicker, Space, Typography, Alert } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

/**
 * Modal Activate thông minh: KEEP | START_NOW | RESCHEDULE khi examAt còn tương lai.
 */
const ActivateScheduleModal = ({
  open,
  round,
  confirmLoading,
  onCancel,
  onConfirm,
}) => {
  const examAt = round?.exam_at ? dayjs(round.exam_at) : null;
  const examInFuture = examAt?.isValid() && examAt.isAfter(dayjs());
  const [mode, setMode] = useState('KEEP');
  const [newExamAt, setNewExamAt] = useState(null);

  React.useEffect(() => {
    if (open) {
      setMode('KEEP');
      setNewExamAt(null);
    }
  }, [open, round?.id]);

  const disabledDate = (current) => current && current.isBefore(dayjs().startOf('day'));

  const disabledTime = (current) => {
    if (!current) return {};
    if (!current.isSame(dayjs(), 'day')) return {};
    const now = dayjs();
    return {
      disabledHours: () => Array.from({ length: now.hour() }, (_, i) => i),
      disabledMinutes: (selectedHour) => {
        if (selectedHour !== now.hour()) return [];
        return Array.from({ length: now.minute() + 1 }, (_, i) => i);
      },
    };
  };

  const hoursUntil = useMemo(() => {
    if (!examAt?.isValid()) return null;
    const h = examAt.diff(dayjs(), 'hour');
    return h > 0 ? h : 0;
  }, [examAt]);

  const handleOk = () => {
    if (mode === 'RESCHEDULE' && (!newExamAt || !newExamAt.isAfter(dayjs()))) {
      return;
    }
    onConfirm({
      scheduleMode: examInFuture ? mode : 'KEEP',
      newExamAt:
        examInFuture && mode === 'RESCHEDULE' && newExamAt
          ? newExamAt.format('YYYY-MM-DDTHH:mm:ss')
          : undefined,
      note: 'Kích hoạt thủ công',
    });
  };

  const okDisabled =
    confirmLoading ||
    (examInFuture && mode === 'RESCHEDULE' && (!newExamAt || !newExamAt.isAfter(dayjs())));

  return (
    <Modal
      open={open}
      title={`Kích hoạt ${round?.name || 'vòng thi'}?`}
      okText="Kích hoạt"
      cancelText="Hủy"
      confirmLoading={confirmLoading}
      okButtonProps={{ disabled: okDisabled }}
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnClose
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Text type="secondary">
          Kích hoạt chỉ mở môi trường vận hành (chia bảng, giám khảo, đề). Không tự động ép thí sinh thi
          ngay trừ khi bạn chọn rõ bên dưới.
        </Text>

        {examInFuture ? (
          <>
            <Alert
              type="info"
              showIcon
              message={
                hoursUntil != null
                  ? `Lịch thi dự kiến còn khoảng ${hoursUntil} giờ (${examAt.format('DD/MM/YYYY HH:mm')}).`
                  : `Lịch thi dự kiến: ${examAt.format('DD/MM/YYYY HH:mm')}.`
              }
            />
            <Radio.Group
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <Radio value="KEEP">
                Chỉ kích hoạt vòng thi — <Text type="secondary">giữ nguyên lịch dự kiến</Text>
              </Radio>
              <Radio value="START_NOW">
                Kích hoạt và <Text strong>bắt đầu thi ngay</Text> — nén lịch theo thời lượng coding
              </Radio>
              <Radio value="RESCHEDULE">Kích hoạt và dời giờ thi sang mốc mới</Radio>
            </Radio.Group>
            {mode === 'RESCHEDULE' && (
              <DatePicker
                showTime
                style={{ width: '100%' }}
                value={newExamAt}
                onChange={setNewExamAt}
                disabledDate={disabledDate}
                disabledTime={disabledTime}
                placeholder="Chọn giờ thi mới (phải sau hiện tại)"
              />
            )}
          </>
        ) : (
          <Text>Xác nhận kích hoạt {round?.name}?</Text>
        )}
      </Space>
    </Modal>
  );
};

export default ActivateScheduleModal;
