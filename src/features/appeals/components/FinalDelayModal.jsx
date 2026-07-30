import { useEffect, useState } from 'react';
import { Alert, Form, InputNumber, List, Modal, Typography, message } from 'antd';
import { appealWindowService } from '../services/appealWindow.service';
import { resolveProgressionError } from '../../rounds/constants/progressionErrors';

const { Text, Paragraph } = Typography;

const sessionKey = (roundId) => `appeal-final-delay-prompted:${roundId}`;

/**
 * Auto-open once per session when countdown ≤5 min AND pending+underReview > 0.
 * Preview then confirm delay. Also reopenable from countdown bar.
 */
const FinalDelayModal = ({
  open,
  onCancel,
  roundId,
  windowStatus,
  onApplied,
  defaultMinutes,
}) => {
  const [form] = Form.useForm();
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const remainingBudget = Number(
    windowStatus?.delayMinutesRemaining ?? preview?.delayMinutesRemaining ?? 0,
  );

  useEffect(() => {
    if (!open) {
      setPreview(null);
      form.resetFields();
      return;
    }
    const suggested = Math.min(
      Number(defaultMinutes) || 5,
      remainingBudget > 0 ? remainingBudget : Number(defaultMinutes) || 5,
    );
    form.setFieldsValue({ minutes: suggested > 0 ? suggested : 1 });
  }, [open, defaultMinutes, remainingBudget, form]);

  const runPreview = async () => {
    try {
      const values = await form.validateFields();
      setLoadingPreview(true);
      const data = await appealWindowService.previewDelay(roundId, values.minutes);
      setPreview(data);
    } catch (error) {
      if (error?.errorFields) return;
      const { message: msg } = resolveProgressionError(error, 'Không xem trước được dời giờ.');
      message.error(msg);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      setConfirming(true);
      const data = await appealWindowService.applyDelay(roundId, values.minutes);
      message.success(
        `Đã dời giờ Chung kết sang ${
          data?.newFinalExamAt
            ? new Date(data.newFinalExamAt).toLocaleString('vi-VN')
            : 'lịch mới'
        }.`,
      );
      if (roundId) {
        try {
          sessionStorage.setItem(sessionKey(roundId), '1');
        } catch {
          /* ignore */
        }
      }
      onApplied?.(data);
      onCancel?.();
    } catch (error) {
      if (error?.errorFields) return;
      const { message: msg } = resolveProgressionError(error, 'Không thể dời giờ Chung kết.');
      message.error(msg);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      title="Dời giờ Chung kết (kháng cáo)"
      open={open}
      onCancel={onCancel}
      okText={preview ? 'Xác nhận dời giờ' : 'Xem trước'}
      cancelText="Hủy"
      onOk={preview ? handleConfirm : runPreview}
      confirmLoading={confirming || loadingPreview}
      destroyOnClose
      width={520}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Còn dưới 5 phút tới Chung kết và vẫn còn đơn khiếu nại"
        description="Bạn có thể dời giờ Chung kết trong ngân sách còn lại để kịp xét duyệt."
      />
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Ngân sách dời còn lại: <Text strong>{remainingBudget} phút</Text>
      </Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item
          name="minutes"
          label="Số phút dời"
          rules={[
            { required: true, message: 'Nhập số phút' },
            {
              validator: (_, value) => {
                const n = Number(value);
                if (!n || n < 1) return Promise.reject(new Error('Tối thiểu 1 phút'));
                if (remainingBudget > 0 && n > remainingBudget) {
                  return Promise.reject(new Error(`Tối đa ${remainingBudget} phút`));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber min={1} max={remainingBudget || undefined} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
      {preview && (
        <div style={{ marginTop: 8 }}>
          <Text strong>Giờ CK hiện tại: </Text>
          <Text>
            {preview.currentFinalExamAt
              ? new Date(preview.currentFinalExamAt).toLocaleString('vi-VN')
              : '—'}
          </Text>
          <br />
          <Text strong>Giờ CK mới: </Text>
          <Text>
            {preview.newFinalExamAt
              ? new Date(preview.newFinalExamAt).toLocaleString('vi-VN')
              : '—'}
          </Text>
          {Array.isArray(preview.consequences) && preview.consequences.length > 0 && (
            <List
              size="small"
              style={{ marginTop: 12 }}
              header={<Text type="secondary">Hệ quả</Text>}
              dataSource={preview.consequences}
              renderItem={(item) => <List.Item style={{ padding: '4px 0' }}>{item}</List.Item>}
            />
          )}
        </div>
      )}
    </Modal>
  );
};

export const shouldAutoOpenFinalDelay = (roundId, windowStatus) => {
  if (!roundId || !windowStatus) return false;
  try {
    if (sessionStorage.getItem(sessionKey(roundId)) === '1') return false;
  } catch {
    /* ignore */
  }
  const pending =
    Number(windowStatus.pendingCount || 0) + Number(windowStatus.underReviewCount || 0);
  if (pending <= 0) return false;
  if (!windowStatus.finalExamAt || !windowStatus.serverNow) return false;
  const remainingMs =
    new Date(windowStatus.finalExamAt).getTime() - new Date(windowStatus.serverNow).getTime();
  return remainingMs > 0 && remainingMs <= 5 * 60 * 1000;
};

export const markFinalDelayPrompted = (roundId) => {
  if (!roundId) return;
  try {
    sessionStorage.setItem(sessionKey(roundId), '1');
  } catch {
    /* ignore */
  }
};

export default FinalDelayModal;
