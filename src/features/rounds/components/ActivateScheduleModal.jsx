import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Radio, DatePicker, Space, Typography, Alert, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { calculateStartTime, formatExamPreview } from '../utils/ceilToNextMinute';

const { Text } = Typography;

/**
 * Modal: START_NOW (buffer) | RESCHEDULE (chỉ dời lịch, vòng vẫn Ngưng hoạt động).
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
  const [mode, setMode] = useState('START_NOW');
  const [newExamAt, setNewExamAt] = useState(null);
  const [setupLeadMinutes, setSetupLeadMinutes] = useState(5);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (open) {
      setMode('START_NOW');
      setNewExamAt(null);
      setSetupLeadMinutes(5);
    }
  }, [open, round?.id]);

  useEffect(() => {
    if (!open || !examInFuture || mode !== 'START_NOW') return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [open, examInFuture, mode]);

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

  const previewExam = useMemo(() => {
    void tick;
    return calculateStartTime(setupLeadMinutes);
  }, [setupLeadMinutes, tick]);

  const isReschedule = examInFuture && mode === 'RESCHEDULE';

  const handleOk = () => {
    if (confirmLoading) return;
    if (isReschedule && (!newExamAt || !newExamAt.isAfter(dayjs()))) {
      return;
    }
    const payload = {
      scheduleMode: examInFuture ? mode : 'KEEP',
      note: isReschedule ? 'Dời lịch thủ công' : 'Kích hoạt thủ công',
    };
    if (examInFuture && mode === 'START_NOW') {
      payload.setupLeadMinutes = setupLeadMinutes ?? 5;
    }
    if (isReschedule && newExamAt) {
      payload.newExamAt = newExamAt.format('YYYY-MM-DDTHH:mm:ss');
    }
    onConfirm(payload);
  };

  const okDisabled =
    confirmLoading ||
    (isReschedule && (!newExamAt || !newExamAt.isAfter(dayjs())));

  return (
    <Modal
      open={open}
      title={
        isReschedule
          ? `Dời lịch ${round?.name || 'vòng thi'}?`
          : `Kích hoạt ${round?.name || 'vòng thi'}?`
      }
      okText={isReschedule ? 'Lưu lịch mới' : 'Kích hoạt'}
      cancelText="Hủy"
      confirmLoading={confirmLoading}
      okButtonProps={{ disabled: okDisabled }}
      onCancel={confirmLoading ? undefined : onCancel}
      onOk={handleOk}
      destroyOnClose
      maskClosable={!confirmLoading}
      keyboard={!confirmLoading}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Text type="secondary">
          {isReschedule
            ? 'Chỉ đổi giờ thi — vòng vẫn Ngưng hoạt động. Sau này bấm Play để kích hoạt hoặc bắt đầu thi sớm.'
            : 'Kích hoạt mở môi trường vận hành (chia bảng, giám khảo, đề). Chọn rõ bên dưới nếu muốn bắt đầu thi sớm hoặc chỉ dời lịch.'}
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
              disabled={confirmLoading}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <Radio value="START_NOW">
                Kích hoạt và bắt đầu thi sớm{' '}
                <Text type="secondary">(Cài đặt thời gian chuẩn bị)</Text>
              </Radio>
              <Radio value="RESCHEDULE">
                Chỉ dời lịch thi{' '}
                <Text type="secondary">(Vòng thi vẫn giữ trạng thái Ngưng hoạt động)</Text>
              </Radio>
            </Radio.Group>

            {mode === 'START_NOW' && (
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space align="center">
                  <Text>Thời gian chuẩn bị (phút):</Text>
                  <InputNumber
                    min={1}
                    max={30}
                    precision={0}
                    keyboard={false}
                    value={setupLeadMinutes}
                    disabled={confirmLoading}
                    onChange={(v) => {
                      if (v == null) {
                        setSetupLeadMinutes(5);
                        return;
                      }
                      const n = Math.floor(Number(v));
                      if (!Number.isFinite(n)) return;
                      setSetupLeadMinutes(Math.min(30, Math.max(1, n)));
                    }}
                  />
                </Space>
                <Text type="secondary">
                  (Giờ thi sẽ bắt đầu vào lúc: {formatExamPreview(previewExam)} — đúng {setupLeadMinutes}{' '}
                  phút từ lúc bạn bấm Kích hoạt)
                </Text>
              </Space>
            )}

            {mode === 'RESCHEDULE' && (
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  value={newExamAt}
                  onChange={setNewExamAt}
                  disabled={confirmLoading}
                  disabledDate={disabledDate}
                  disabledTime={disabledTime}
                  placeholder="Chọn giờ thi mới (phải sau hiện tại)"
                />
                <Text type="secondary">
                  Vòng vẫn Ngưng hoạt động. Nút Play vẫn còn để sau này kích hoạt / bắt đầu thi sớm.
                </Text>
              </Space>
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
