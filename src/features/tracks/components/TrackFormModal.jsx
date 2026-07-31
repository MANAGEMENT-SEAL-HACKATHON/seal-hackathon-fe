import { useEffect, useState } from 'react';
import { Modal, Form, Input, Row, Col, Switch, Button, message } from 'antd';
import RoundProblemPdfUpload from '../../rounds/components/RoundProblemPdfUpload';
import { trackService } from '../services/trackService';

const { TextArea } = Input;

const TrackFormModal = ({
  visible,
  onCancel,
  onFinish,
  initialValues,
  title,
  problemReleased = false,
}) => {
  const [form] = Form.useForm();
  const [viewingProblem, setViewingProblem] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          is_open: (initialValues.status || 'OPEN') === 'OPEN',
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, initialValues, form]);

  const handleViewProblemPdf = async () => {
    if (!initialValues?.id) return;
    setViewingProblem(true);
    try {
      const blob = await trackService.getProblemStatement(initialValues.id);
      const file = new Blob([blob], { type: 'application/pdf' });
      const fileUrl = URL.createObjectURL(file);
      const opened = window.open(fileUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        URL.revokeObjectURL(fileUrl);
        message.warning('Trình duyệt chặn cửa sổ mới. Vui lòng cho phép popup để xem PDF.');
      }
    } catch {
      message.error('Không thể mở file đề bài. Vui lòng thử lại.');
    } finally {
      setViewingProblem(false);
    }
  };

  const hasProblemFile = Boolean(
    initialValues?.problem_statement_filename || initialValues?.problem_statement_url,
  );

  const handleSubmit = () => {
    form.validateFields()
      .then((values) => {
        const { is_open: isOpen, ...rest } = values;
        onFinish({
          ...rest,
          status: isOpen ? 'OPEN' : 'CLOSED',
        });
        form.resetFields();
      })
      .catch((info) => {
        console.log('Validate Failed:', info);
      });
  };

  return (
    <Modal
      open={visible}
      title={title}
      okText="Lưu"
      cancelText="Hủy"
      onCancel={onCancel}
      onOk={handleSubmit}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          is_open: true,
        }}
      >
        <Form.Item
          name="name"
          label="Tên bảng đấu"
          extra={<span style={{ fontSize: 12, color: '#888' }}>Tên hiển thị của bảng, ví dụ: Track 1 — RAG Pipeline.</span>}
          rules={[{ required: true, message: 'Vui lòng nhập tên bảng đấu' }]}
        >
          <Input placeholder="Ví dụ: Bảng đấu RAG" />
        </Form.Item>

        <Form.Item
          name="topic"
          label="Chủ đề"
          extra={<span style={{ fontSize: 12, color: '#888' }}>Chủ đề thi của bảng đấu (hiển thị khi bốc thăm).</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập chủ đề bảng đấu' },
            { max: 300, message: 'Chủ đề tối đa 300 ký tự' },
          ]}
        >
          <Input placeholder="Ví dụ: Business Analysis App" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <TextArea rows={3} placeholder="Mô tả ngắn (tuỳ chọn)" />
        </Form.Item>

        {initialValues?.problem_statement_filename && (
          <div style={{ marginBottom: 12, fontSize: 13 }}>
            <span>Đề bài hiện tại: {initialValues.problem_statement_filename}</span>
            {hasProblemFile ? (
              <Button
                type="link"
                style={{ padding: '0 0 0 8px', height: 'auto' }}
                loading={viewingProblem}
                onClick={handleViewProblemPdf}
              >
                Xem PDF
              </Button>
            ) : null}
          </div>
        )}

        <Form.Item
          label="File đề bài (PDF)"
          extra="Mỗi bảng đấu một đề riêng (tối đa 25MB). Upload trước khi phát đề Sơ loại."
          name="problem_file"
          valuePropName="fileList"
          getValueFromEvent={(event) => (Array.isArray(event) ? event : event?.fileList)}
        >
          <RoundProblemPdfUpload disabled={problemReleased} />
        </Form.Item>

        <Form.Item
          name="is_open"
          label="Mở bảng đấu"
          valuePropName="checked"
          extra="Tắt khi tạm khóa bảng đấu khỏi phân bổ mới."
        >
          <Switch checkedChildren="Mở" unCheckedChildren="Đóng" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TrackFormModal;
