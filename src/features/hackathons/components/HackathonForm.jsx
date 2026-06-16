import React from 'react';
import { Form, Input, DatePicker, Select, Switch, Row, Col, Space, Button, Typography } from 'antd';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

const fieldHint = (text) => (
  <Text type="secondary" style={{ fontSize: 12 }}>{text}</Text>
);

const HackathonForm = ({ form, onFinish, initialValues }) => {
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        year: new Date().getFullYear(),
        wildcard_enabled: false,
        individual_ranking_enabled: true,
        ...initialValues,
        registration_start: initialValues?.registration_start ? dayjs(initialValues.registration_start) : null,
        registration_end: initialValues?.registration_end ? dayjs(initialValues.registration_end) : null,
        event_start: initialValues?.event_start ? dayjs(initialValues.event_start) : null,
        event_end: initialValues?.event_end ? dayjs(initialValues.event_end) : null,
      }}
    >
      <Row gutter={24}>
        <Col span={14}>
          <Form.Item
            name="name"
            label="Tên Hackathon"
            extra={fieldHint('Tên hiển thị của kỳ thi.')}
            rules={[{ required: true, message: 'Vui lòng nhập tên hackathon' }]}
          >
            <Input placeholder="Ví dụ: SEAL Hackathon Xuân 2026" />
          </Form.Item>
        </Col>
        <Col span={10}>
          <Form.Item
            name="slug"
            label="Đường dẫn trên web"
            extra={fieldHint('Không dấu, dùng dấu gạch ngang.')}
            rules={[
              { required: true, message: 'Vui lòng nhập đường dẫn' },
              { pattern: /^[a-z0-9-]+$/, message: 'Chỉ dùng chữ thường a-z, số 0-9 và dấu gạch ngang (-)' }
            ]}
          >
            <Input placeholder="Ví dụ: seal-xuan-2026" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            name="season"
            label="Mùa"
            rules={[{ required: true, message: 'Vui lòng chọn mùa' }]}
          >
            <Select placeholder="Chọn mùa">
              <Option value="Spring">Xuân</Option>
              <Option value="Summer">Hạ</Option>
              <Option value="Fall">Thu</Option>
              <Option value="Winter">Đông</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="year"
            label="Năm"
            rules={[{ required: true, message: 'Vui lòng nhập năm' }]}
          >
            <Input type="number" placeholder="Ví dụ: 2026" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="description" label="Mô tả">
        <TextArea rows={4} placeholder="Mô tả ngắn gọn về hackathon" />
      </Form.Item>

      <Form.Item name="rules" label="Thể lệ">
        <TextArea rows={4} placeholder="Quy định và thể lệ cuộc thi" />
      </Form.Item>

      <Form.Item name="banner_url" label="Link ảnh Banner">
        <Input placeholder="https://example.com/banner.jpg" />
      </Form.Item>

      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            name="registration_start"
            label="Bắt đầu Đăng ký"
            extra={fieldHint('Cổng mở khi bạn bấm Mở đăng ký.')}
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu đăng ký' }]}
          >
            <DatePicker 
              showTime 
              style={{ width: '100%' }} 
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="registration_end"
            label="Kết thúc Đăng ký"
            extra={fieldHint('Hết hạn đăng ký — sau đó khóa đội và bốc thăm.')}
            dependencies={['registration_start']}
            rules={[
              { required: true, message: 'Vui lòng chọn ngày kết thúc đăng ký' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const start = getFieldValue('registration_start');
                  if (!value || !start || dayjs(value).isAfter(dayjs(start)) || dayjs(value).isSame(dayjs(start))) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Ngày kết thúc đăng ký phải sau hoặc bằng ngày bắt đầu'));
                },
              }),
            ]}
          >
            <DatePicker 
              showTime 
              style={{ width: '100%' }} 
              disabledDate={(current) => {
                const regStart = form.getFieldValue('registration_start');
                return current && (current < dayjs().startOf('day') || (regStart && current < dayjs(regStart).startOf('day')));
              }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            name="event_start"
            label="Bắt đầu Sự kiện"
            extra={fieldHint('Tự tính sau khi tạo vòng thi.')}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              disabled
              placeholder="Hệ thống tự tính"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="event_end"
            label="Kết thúc Sự kiện"
            extra={fieldHint('Tự tính theo hạn nộp bài các vòng.')}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              disabled
              placeholder="Hệ thống tự tính"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            name="wildcard_enabled"
            label="Cho phép bổ sung đội (Wild Card)"
            extra={fieldHint('Dùng khi thiếu đội vào Chung kết.')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="individual_ranking_enabled"
            label="Bật Bảng xếp hạng cá nhân"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default HackathonForm;
