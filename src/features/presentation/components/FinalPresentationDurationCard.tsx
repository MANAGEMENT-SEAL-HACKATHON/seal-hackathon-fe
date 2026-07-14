import React, { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Button, Typography, Tag, Alert, Spin } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { presentationService } from '../../judging/services/presentationService';

const { Title, Text } = Typography;

type Props = {
  roundId: number;
  timerStarted: boolean;
};

const FinalPresentationDurationCard: React.FC<Props> = ({ roundId, timerStarted }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<string>('ROUND');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    presentationService
      .getDuration(roundId)
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data || res;
        setScope(data?.scope || 'ROUND');
        form.setFieldsValue({
          presentationMinutes:
            data?.presentationMinutes ??
            data?.effectivePresentationMinutes ??
            data?.defaultPresentationMinutes ??
            10,
          qaMinutes:
            data?.qaMinutes ?? data?.effectiveQaMinutes ?? data?.defaultQaMinutes ?? 5,
        });
      })
      .catch(() => {
        if (!cancelled) {
          form.setFieldsValue({ presentationMinutes: 10, qaMinutes: 5 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roundId, form]);

  const handleSave = async () => {
    if (timerStarted) {
      toast.error('Không thể thay đổi thời lượng sau khi đồng hồ đếm ngược đã bắt đầu.');
      return;
    }
    try {
      const values = await form.validateFields();
      setSaving(true);
      await presentationService.updateDuration({
        roundId,
        presentationMinutes: values.presentationMinutes,
        qaMinutes: values.qaMinutes,
      });
      toast.success('Cập nhật thời lượng thuyết trình thành công.');
    } catch (error: any) {
      const code = error?.code || error?.response?.data?.error?.code;
      if (code === 'INVALID_STATE') {
        toast.error('Không thể thay đổi thời lượng sau khi đồng hồ đếm ngược đã bắt đầu.');
      } else {
        toast.error(error?.message || 'Không thể cập nhật thời lượng vào lúc này.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      <div style={{ background: '#f8fafc', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          Thời gian Thuyết trình Vòng Chung kết
        </Title>
        <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
          Thiết lập thời gian thuyết trình và trả lời câu hỏi (áp dụng chung cho tất cả các bảng đấu).
        </Text>
      </div>
      <div style={{ padding: 24 }}>
        {timerStarted && (
          <Alert
            type="warning"
            showIcon
            message="Timer đã chạy"
            description="Chỉ có thể đổi thời lượng trước khi bắt đầu timer."
            style={{ marginBottom: 16, borderRadius: 10 }}
          />
        )}
        {loading ? (
          <Spin />
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              label="Thuyết trình (phút)"
              name="presentationMinutes"
              rules={[{ required: true, message: 'Nhập số phút' }]}
            >
              <InputNumber min={1} max={60} style={{ width: '100%' }} disabled={timerStarted} />
            </Form.Item>
            <Form.Item
              label="Q&A (phút)"
              name="qaMinutes"
              rules={[{ required: true, message: 'Nhập số phút' }]}
            >
              <InputNumber min={1} max={60} style={{ width: '100%' }} disabled={timerStarted} />
            </Form.Item>
            <Button type="primary" block onClick={handleSave} loading={saving} disabled={timerStarted}>
              Lưu thời lượng
            </Button>
          </Form>
        )}
      </div>
    </div>
  );
};

export default FinalPresentationDurationCard;
