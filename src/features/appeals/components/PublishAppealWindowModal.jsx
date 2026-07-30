import { useEffect, useMemo, useState } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Radio, Space, Typography, message } from 'antd';
import { roundResultsService } from '../../rounds/services/roundResults.service';
import { resolveProgressionError } from '../../rounds/constants/progressionErrors';

const { Text, Paragraph } = Typography;

const MODE_LABELS = {
  DELAY_FINAL: 'Dời giờ Chung kết để đủ cửa sổ khiếu nại',
  SHRINK: 'Rút ngắn cửa sổ khiếu nại cho vừa lịch CK',
  SKIP: 'Bỏ qua cửa sổ khiếu nại (cần lý do)',
};

/**
 * Parent sets open=true on publish click. Component runs preflight:
 * - fits → publish empty body immediately
 * - not fits → show DELAY_FINAL / SHRINK / SKIP chooser
 */
const PublishAppealWindowModal = ({ open, onCancel, roundId, onPublished, confirmLoading }) => {
  const [form] = Form.useForm();
  const [preflight, setPreflight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const modes = useMemo(() => {
    const list = Array.isArray(preflight?.availableModes) ? preflight.availableModes : [];
    return list.map((m) => ({
      mode: m.mode || m.appealWindowMode,
      available: Boolean(m.available),
      blockedReason: m.blockedReason || m.blocked_reason || '',
      suggestedDelayMinutes: m.suggestedDelayMinutes ?? m.suggested_delay_minutes,
    }));
  }, [preflight]);

  const selectedMode = Form.useWatch('appealWindowMode', form);

  useEffect(() => {
    if (!open || !roundId) {
      setPreflight(null);
      form.resetFields();
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const data = await roundResultsService.publishPreflight(roundId);
        if (cancelled) return;
        setPreflight(data);

        if (data?.fits) {
          setPublishing(true);
          try {
            await roundResultsService.publishRound(roundId);
            if (cancelled) return;
            message.success('Đã công bố kết quả sơ loại.');
            onPublished?.();
            onCancel?.();
          } catch (error) {
            if (cancelled) return;
            const { message: msg } = resolveProgressionError(error, 'Không thể công bố kết quả.');
            message.error(msg);
            onCancel?.();
          } finally {
            if (!cancelled) setPublishing(false);
          }
          return;
        }

        const firstAvailable = (data?.availableModes || []).find((m) => m.available);
        form.setFieldsValue({
          appealWindowMode: firstAvailable?.mode || undefined,
          delayMinutes: firstAvailable?.suggestedDelayMinutes,
          skipReason: '',
        });
      } catch (error) {
        if (cancelled) return;
        const { message: msg } = resolveProgressionError(error, 'Không kiểm tra được cửa sổ khiếu nại.');
        message.error(msg);
        onCancel?.();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, roundId, form, onPublished, onCancel]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setPublishing(true);
      const body = {
        appealWindowMode: values.appealWindowMode,
      };
      if (values.appealWindowMode === 'DELAY_FINAL' && values.delayMinutes != null) {
        body.delayMinutes = Number(values.delayMinutes);
      }
      if (values.appealWindowMode === 'SKIP') {
        body.skipReason = values.skipReason;
      }
      await roundResultsService.publishRound(roundId, body);
      message.success('Đã công bố kết quả sơ loại.');
      onPublished?.();
      onCancel?.();
    } catch (error) {
      if (error?.errorFields) return;
      const { message: msg } = resolveProgressionError(error, 'Không thể công bố kết quả.');
      message.error(msg);
    } finally {
      setPublishing(false);
    }
  };

  const showChooser = open && preflight && !preflight.fits;

  return (
    <Modal
      title="Cửa sổ khiếu nại không vừa lịch Chung kết"
      open={showChooser}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Công bố với lựa chọn này"
      cancelText="Hủy"
      confirmLoading={publishing || confirmLoading || loading}
      destroyOnClose
      width={560}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Cửa sổ khiếu nại cấu hình không vừa trước giờ Chung kết"
        description={
          <Paragraph style={{ marginBottom: 0 }}>
            Cấu hình: <Text strong>{preflight?.configuredWindowMinutes ?? '—'} phút</Text>
            {' · '}Còn lại trước CK:{' '}
            <Text strong>
              {preflight?.remainingMinutes != null ? `${preflight.remainingMinutes} phút` : '—'}
            </Text>
            . Chọn một phương án bên dưới.
          </Paragraph>
        }
      />
      <Form form={form} layout="vertical">
        <Form.Item
          name="appealWindowMode"
          label="Phương án"
          rules={[{ required: true, message: 'Chọn một phương án' }]}
        >
          <Radio.Group style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {modes.map((m) => (
                <Radio
                  key={m.mode}
                  value={m.mode}
                  disabled={!m.available}
                  style={{
                    opacity: m.available ? 1 : 0.45,
                    whiteSpace: 'normal',
                    alignItems: 'flex-start',
                    height: 'auto',
                  }}
                >
                  <div>
                    <Text strong>{MODE_LABELS[m.mode] || m.mode}</Text>
                    {!m.available && m.blockedReason && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {m.blockedReason}
                        </Text>
                      </div>
                    )}
                    {m.available && m.mode === 'DELAY_FINAL' && m.suggestedDelayMinutes != null && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Gợi ý dời {m.suggestedDelayMinutes} phút
                        </Text>
                      </div>
                    )}
                  </div>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </Form.Item>

        {selectedMode === 'DELAY_FINAL' && (
          <Form.Item
            name="delayMinutes"
            label="Số phút dời giờ Chung kết"
            rules={[{ required: true, message: 'Nhập số phút dời' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        )}

        {selectedMode === 'SKIP' && (
          <Form.Item
            name="skipReason"
            label="Lý do bỏ qua cửa sổ khiếu nại"
            rules={[
              { required: true, message: 'Bắt buộc nhập lý do khi bỏ qua' },
              { min: 10, message: 'Tối thiểu 10 ký tự' },
            ]}
          >
            <Input.TextArea rows={3} placeholder="Giải thích lý do bỏ qua cửa sổ khiếu nại..." />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default PublishAppealWindowModal;
