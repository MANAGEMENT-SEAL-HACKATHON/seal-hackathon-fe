import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Space, Typography, Alert, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { calculateStartTime, formatExamPreview } from '../utils/ceilToNextMinute';

const { Text } = Typography;

/**
 * Chỉ START_NOW (test nhanh) / KEEP khi exam không còn ở tương lai.
 * Dời lịch nằm ở «Dời lịch thi» / đóng ĐK sớm — không còn trong modal này.
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
  const isAlreadyActive = Boolean(round?.is_active ?? round?.isActive);
  const isFinal = Boolean(round?.is_final ?? round?.isFinal);
  const [setupLeadMinutes, setSetupLeadMinutes] = useState(5);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (open) {
      setSetupLeadMinutes(5);
    }
  }, [open, round?.id]);

  useEffect(() => {
    if (!open || !examInFuture) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [open, examInFuture]);

  const hoursUntil = useMemo(() => {
    if (!examAt?.isValid()) return null;
    const h = examAt.diff(dayjs(), 'hour');
    return h > 0 ? h : 0;
  }, [examAt]);

  const previewExam = useMemo(() => {
    void tick;
    return calculateStartTime(setupLeadMinutes);
  }, [setupLeadMinutes, tick]);

  const handleOk = () => {
    if (confirmLoading) return;
    const payload = {
      scheduleMode: examInFuture ? 'START_NOW' : 'KEEP',
      note: 'Kích hoạt thủ công',
    };
    if (examInFuture) {
      payload.setupLeadMinutes = setupLeadMinutes ?? 5;
    }
    onConfirm(payload);
  };

  return (
    <Modal
      open={open}
      title={
        isAlreadyActive
          ? `Bắt đầu thi sớm ${round?.name || 'vòng thi'}?`
          : `Kích hoạt ${round?.name || 'vòng thi'}?`
      }
      okText={isAlreadyActive ? 'Bắt đầu thi sớm' : examInFuture ? 'Kích hoạt & bắt đầu sớm' : 'Kích hoạt'}
      cancelText="Hủy"
      confirmLoading={confirmLoading}
      onCancel={confirmLoading ? undefined : onCancel}
      onOk={handleOk}
      destroyOnClose
      maskClosable={!confirmLoading}
      keyboard={!confirmLoading}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
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
              description="Dùng để test nhanh — bỏ qua chờ Workshop và Khai mạc. Muốn chỉnh ngày thi (Workshop / Khai mạc / Chung kết) dùng «Dời lịch thi» hoặc chọn lịch khi đóng đăng ký sớm."
            />
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space align="center">
                <Text>Thời gian chuẩn bị trước giờ thi (phút):</Text>
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
                Giờ thi sẽ là {formatExamPreview(previewExam)} — đúng {setupLeadMinutes} phút kể từ lúc bạn bấm xác nhận.
                {!isFinal &&
                  ' Lịch Chung kết sẽ được kéo theo (1–2 giờ sau khi Sơ loại kết thúc).'}
              </Text>
            </Space>
          </>
        ) : (
          <Text>
            {isAlreadyActive
              ? `Xác nhận bắt đầu thi sớm ${round?.name}?`
              : `Xác nhận kích hoạt ${round?.name}? (giữ nguyên lịch đã xếp)`}
          </Text>
        )}
      </Space>
    </Modal>
  );
};

export default ActivateScheduleModal;
