import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { studentPortalService } from '../services/studentPortal.service';
import { appealWindowService } from '../../../../features/appeals/services/appealWindow.service';

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

const STATUS_META = {
  PENDING: { color: 'orange', label: 'Chờ duyệt' },
  UNDER_REVIEW: { color: 'processing', label: 'Đang xét' },
  APPROVED: { color: 'success', label: 'Đã duyệt' },
  REJECTED: { color: 'error', label: 'Từ chối' },
  EXPIRED: { color: 'default', label: 'Hết hạn' },
};

const inferType = (file) => {
  const t = String(file?.type || '').toLowerCase();
  if (t.startsWith('video/')) return 'VIDEO';
  if (t.startsWith('image/')) return 'IMAGE';
  return 'IMAGE';
};

const StudentAppealModal = ({
  open,
  onClose,
  teamId,
  roundId,
  roundOptions = [],
  onRoundChange,
  onSuccess,
  appealWindowEndsAt,
}) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [evidences, setEvidences] = useState([]);
  const [existingAppeal, setExistingAppeal] = useState(null);
  const [deadlineLabel, setDeadlineLabel] = useState(null);

  const effectiveRoundId = Form.useWatch('roundId', form) ?? roundId;

  useEffect(() => {
    if (!open) {
      setEvidences([]);
      setExistingAppeal(null);
      form.resetFields();
      return;
    }
    form.setFieldsValue({ roundId: roundId ?? undefined });
  }, [open, roundId, form]);

  useEffect(() => {
    if (!open || !effectiveRoundId) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const [mine, windowStatus] = await Promise.all([
          studentPortalService.listMyAppeals().catch(() => []),
          appealWindowService.getStatus(effectiveRoundId).catch(() => null),
        ]);
        if (cancelled) return;
        const match = (mine || []).find(
          (a) => Number(a.roundId ?? a.round_id) === Number(effectiveRoundId),
        );
        setExistingAppeal(match || null);
        const ends =
          windowStatus?.appealWindowEndsAt ||
          appealWindowEndsAt ||
          null;
        setDeadlineLabel(
          ends ? new Date(ends).toLocaleString('vi-VN') : null,
        );
      } catch {
        if (!cancelled) setExistingAppeal(null);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, effectiveRoundId, appealWindowEndsAt]);

  const beforeUpload = async (file) => {
    const type = inferType(file);
    const max = type === 'VIDEO' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > max) {
      message.error(type === 'VIDEO' ? 'Video tối đa 50MB' : 'Ảnh tối đa 5MB');
      return Upload.LIST_IGNORE;
    }
    try {
      const uploaded = await studentPortalService.uploadAppealEvidence(file);
      const storageKey = uploaded?.storageKey || uploaded?.url;
      if (!storageKey) {
        message.error('Upload minh chứng thất bại.');
        return Upload.LIST_IGNORE;
      }
      const previewUrl = URL.createObjectURL(file);
      setEvidences((prev) => [
        ...prev,
        {
          uid: `${Date.now()}-${file.name}`,
          url: storageKey,
          type,
          caption: file.name,
          previewUrl,
          displayOrder: prev.length,
        },
      ]);
      message.success('Đã tải minh chứng lên');
    } catch (error) {
      message.error(error?.message || 'Không thể tải minh chứng');
    }
    return Upload.LIST_IGNORE;
  };

  const removeEvidence = (uid) => {
    setEvidences((prev) => {
      const target = prev.find((e) => e.uid === uid);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((e) => e.uid !== uid);
    });
  };

  const handleSubmit = async (values) => {
    const rid = values.roundId ?? roundId;
    if (!teamId || !rid) {
      message.warning('Thiếu thông tin đội hoặc vòng thi để gửi khiếu nại.');
      return;
    }
    if (evidences.length === 0) {
      message.warning('Phải đính kèm ít nhất một minh chứng.');
      return;
    }
    setLoading(true);
    try {
      const created = await studentPortalService.createAppeal({
        teamId,
        roundId: rid,
        reason: values.reason,
        evidences: evidences.map((e, idx) => ({
          url: e.url,
          type: e.type,
          caption: e.caption,
          displayOrder: idx,
        })),
      });
      message.success('Đã gửi khiếu nại thành công. Ban tổ chức sẽ xem xét và phản hồi.');
      setExistingAppeal(created);
      form.resetFields(['reason']);
      setEvidences([]);
      onSuccess?.(created);
    } catch (error) {
      message.error(
        error?.message ||
          'Không thể gửi khiếu nại. Có thể đã hết thời hạn hoặc không hợp lệ.',
      );
    } finally {
      setLoading(false);
    }
  };

  const statusMeta =
    STATUS_META[String(existingAppeal?.status || '').toUpperCase()] || null;

  return (
    <Modal
      title="Gửi khiếu nại quyết định loại đội"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Gửi khiếu nại"
      okButtonProps={{ disabled: Boolean(existingAppeal) }}
      destroyOnClose
      width={640}
    >
      <Alert
        type="info"
        showIcon
        message="Quy định khiếu nại"
        description="Chỉ Trưởng nhóm của đội bị loại thủ công mới có thể gửi khiếu nại trong thời hạn cửa sổ khiếu nại sau công bố."
        style={{ marginBottom: 16 }}
      />

      {deadlineLabel && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Hạn nộp khiếu nại: ${deadlineLabel}`}
        />
      )}

      {existingAppeal && (
        <Alert
          style={{ marginBottom: 16 }}
          type={
            String(existingAppeal.status).toUpperCase() === 'APPROVED'
              ? 'success'
              : String(existingAppeal.status).toUpperCase() === 'REJECTED'
                ? 'error'
                : 'info'
          }
          showIcon
          message={
            <Space>
              <span>Trạng thái đơn</span>
              {statusMeta && <Tag color={statusMeta.color}>{statusMeta.label}</Tag>}
            </Space>
          }
          description={
            existingAppeal.decisionNote ? (
              <Paragraph style={{ marginBottom: 0 }}>
                Ghi chú BTC: {existingAppeal.decisionNote}
              </Paragraph>
            ) : (
              'Đơn của bạn đã được ghi nhận. Bạn không thể gửi thêm đơn cho vòng này.'
            )
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ roundId: roundId ?? undefined }}
        disabled={Boolean(existingAppeal)}
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
          rules={[
            { required: true, message: 'Vui lòng mô tả lý do' },
            { min: 10, message: 'Tối thiểu 10 ký tự' },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Mô tả chi tiết lý do khiếu nại quyết định loại thủ công đội của bạn trong vòng thi này..."
          />
        </Form.Item>

        <Form.Item label="Minh chứng (bắt buộc)" required>
          <Dragger
            multiple
            accept="image/*,video/mp4,video/webm,video/quicktime"
            showUploadList={false}
            beforeUpload={beforeUpload}
            disabled={Boolean(existingAppeal)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Kéo thả hoặc bấm để tải ảnh/video minh chứng</p>
            <p className="ant-upload-hint">Ảnh ≤ 5MB · Video ≤ 50MB</p>
          </Dragger>
          {evidences.length > 0 && (
            <Image.PreviewGroup>
              <Space wrap style={{ marginTop: 12 }}>
                {evidences.map((ev) =>
                  ev.type === 'IMAGE' && ev.previewUrl ? (
                    <div key={ev.uid} style={{ position: 'relative' }}>
                      <Image
                        src={ev.previewUrl}
                        width={96}
                        height={96}
                        style={{ objectFit: 'cover', borderRadius: 8 }}
                      />
                      <Button
                        size="small"
                        danger
                        type="text"
                        style={{ position: 'absolute', top: 0, right: 0 }}
                        onClick={() => removeEvidence(ev.uid)}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <Tag
                      key={ev.uid}
                      closable
                      onClose={() => removeEvidence(ev.uid)}
                      icon={<PlusOutlined />}
                    >
                      {ev.type}: {ev.caption}
                    </Tag>
                  ),
                )}
              </Space>
            </Image.PreviewGroup>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StudentAppealModal;
