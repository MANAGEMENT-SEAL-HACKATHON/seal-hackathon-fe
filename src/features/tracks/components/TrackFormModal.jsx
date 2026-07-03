import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, Alert, Button, message } from 'antd';
import RoundProblemPdfUpload from '../../rounds/components/RoundProblemPdfUpload';
import { trackService } from '../services/trackService';

const { TextArea } = Input;

const TrackFormModal = ({
  visible,
  onCancel,
  onFinish,
  initialValues,
  title,
  rounds,
  isEditing,
  problemReleased = false,
}) => {
  const [form] = Form.useForm();
  const [viewingProblem, setViewingProblem] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
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
      .then(values => {
        onFinish(values);
        form.resetFields();
      })
      .catch(info => {
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
          min_team_size: 3,
          max_team_size: 5,
          status: 'OPEN',
        }}
      >
        <Form.Item
          name="name"
          label="Tên bảng đấu"
          extra={<span style={{ fontSize: 12, color: '#888' }}>Chủ đề thi, ví dụ: RAG Pipeline.</span>}
          rules={[{ required: true, message: 'Vui lòng nhập tên bảng đấu' }]}
        >
          <Input placeholder="Ví dụ: Bảng đấu RAG" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <TextArea rows={3} placeholder="Mô tả ngắn (tuỳ chọn)" />
        </Form.Item>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="min_team_size"
              label="Thành viên tối thiểu / đội"
              rules={[{ required: true, message: 'Bắt buộc' }]}
              dependencies={['max_team_size']}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="max_team_size"
              label="Thành viên tối đa / đội"
              dependencies={['min_team_size']}
              validateTrigger={['onChange', 'onBlur']}
              rules={[
                { required: true, message: 'Bắt buộc' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const minSize = getFieldValue('min_team_size');
                    if (!value || !minSize || value >= minSize) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Phải ≥ thành viên tối thiểu'));
                  },
                }),
              ]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="presentation_minutes"
              label="Thuyết trình (phút)"
              extra="Để trống = mặc định 10 phút"
              validateTrigger={['onChange', 'onBlur']}
              rules={[
                {
                  validator: (_, value) => {
                    if (value == null || value === '' || (value >= 1 && value <= 60)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Nhập từ 1 đến 60 phút'));
                  },
                },
              ]}
            >
              <InputNumber min={1} max={60} style={{ width: '100%' }} placeholder="10" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="qa_minutes"
              label="Q&A (phút)"
              extra="Để trống = mặc định 5 phút"
              validateTrigger={['onChange', 'onBlur']}
              rules={[
                {
                  validator: (_, value) => {
                    if (value == null || value === '' || (value >= 1 && value <= 60)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Nhập từ 1 đến 60 phút'));
                  },
                },
              ]}
            >
              <InputNumber min={1} max={60} style={{ width: '100%' }} placeholder="5" />
            </Form.Item>
          </Col>
        </Row>

        {initialValues?.problem_statement_filename && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`Đề bài hiện tại: ${initialValues.problem_statement_filename}`}
            description={
              hasProblemFile ? (
                <Button
                  type="link"
                  style={{ padding: 0, height: 'auto' }}
                  loading={viewingProblem}
                  onClick={handleViewProblemPdf}
                >
                  Xem PDF
                </Button>
              ) : null
            }
          />
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

        <Form.Item name="status" label="Trạng thái">
          <Select>
            <Select.Option value="OPEN">Mở</Select.Option>
            <Select.Option value="CLOSED">Đóng</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TrackFormModal;
