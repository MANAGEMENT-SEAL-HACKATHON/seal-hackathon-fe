import React from 'react';
import { Modal, Space, Typography, Alert } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

/**
 * Pure activate confirmation (KEEP only).
 * If examAt is still in the future, block activate and direct user to «Dời lịch thi».
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

  const handleOk = () => {
    if (confirmLoading || examInFuture) return;
    onConfirm({
      scheduleMode: 'KEEP',
      note: 'Kích hoạt thủ công',
    });
  };

  return (
    <Modal
      open={open}
      title={`Kích hoạt ${round?.name || 'vòng thi'}?`}
      okText="Kích hoạt"
      cancelText="Hủy"
      confirmLoading={confirmLoading}
      okButtonProps={{ disabled: examInFuture }}
      onCancel={confirmLoading ? undefined : onCancel}
      onOk={handleOk}
      destroyOnClose
      maskClosable={!confirmLoading}
      keyboard={!confirmLoading}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {examInFuture ? (
          <Alert
            type="warning"
            showIcon
            message={
              examAt?.isValid()
                ? `Chưa tới giờ thi (${examAt.format('DD/MM/YYYY HH:mm')}) — không thể kích hoạt giữ lịch hiện tại.`
                : 'Chưa tới giờ thi — không thể kích hoạt giữ lịch hiện tại.'
            }
            description='Muốn dời giờ thi sớm hơn, dùng thao tác «Dời lịch thi» trên trang Quản lý vòng thi, rồi kích hoạt khi đã tới (hoặc đã qua) giờ thi mới.'
          />
        ) : (
          <Text>
            {`Xác nhận kích hoạt ${round?.name}? (giữ nguyên lịch đã xếp)`}
          </Text>
        )}
      </Space>
    </Modal>
  );
};

export default ActivateScheduleModal;
