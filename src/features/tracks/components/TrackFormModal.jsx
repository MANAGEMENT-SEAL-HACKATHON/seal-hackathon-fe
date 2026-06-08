import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select } from 'antd';

const { TextArea } = Input;

const TrackFormModal = ({ visible, onCancel, onFinish, initialValues, title, rounds, isEditing }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [visible, initialValues, form]);

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

        {!isEditing && (
          <Form.Item
            name="round_id"
            label="Vòng sơ loại"
            rules={[{ required: true, message: 'Vui lòng chọn vòng sơ loại' }]}
          >
            <Select placeholder="Chọn vòng sơ loại">
              {rounds?.map(r => (
                <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item name="description" label="Mô tả">
          <TextArea rows={3} placeholder="Mô tả ngắn (tuỳ chọn)" />
        </Form.Item>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="max_teams"
              label="Số đội tối đa"
              extra={<span style={{ fontSize: 12, color: '#888' }}>Tổng đội thuộc bảng đấu này.</span>}
              dependencies={['max_teams_per_group']}
            >
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Không giới hạn" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="max_teams_per_group"
              label="Số đội mỗi nhóm"
              extra={<span style={{ fontSize: 12, color: '#888' }}>Mỗi nhóm nhỏ sau bốc thăm. Không lớn hơn tổng ở trên.</span>}
              dependencies={['max_teams']}
              validateTrigger={['onChange', 'onBlur']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const maxTeams = getFieldValue('max_teams');
                    if (!value || !maxTeams || value <= maxTeams) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Không được lớn hơn số đội tối đa'));
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
