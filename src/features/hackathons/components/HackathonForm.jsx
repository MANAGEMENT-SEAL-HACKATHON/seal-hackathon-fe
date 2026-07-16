import { Form, Input, DatePicker, Select, Row, Col, Typography } from 'antd';
import dayjs from 'dayjs';
import HackathonBannerUpload from './HackathonBannerUpload';

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
        individual_ranking_enabled: false,
        ...initialValues,
        registration_start: initialValues?.registration_start ? dayjs(initialValues.registration_start) : null,
        registration_end: initialValues?.registration_end ? dayjs(initialValues.registration_end) : null,
      }}
    >
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            name="season"
            label="Mùa (FPT)"
            rules={[{ required: true, message: 'Vui lòng chọn mùa' }]}
          >
            <Select placeholder="Chọn mùa">
              <Option value="Spring">Spring — Xuân</Option>
              <Option value="Summer">Summer — Hạ</Option>
              <Option value="Fall">Fall — Thu</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="year"
            label="Năm"
            rules={[{ required: true, message: 'Vui lòng nhập năm' }]}
          >
            <Input
              type="number"
              readOnly
              placeholder="Ví dụ: 2026"
              style={{ backgroundColor: '#fafafa', cursor: 'not-allowed' }}
            />
          </Form.Item>
        </Col>
      </Row>

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
            name="max_participants"
            label="Số lượng người tham gia tối đa"
            extra={fieldHint('Giới hạn số sinh viên đăng ký tham gia giải đấu.')}
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng người tham gia tối đa' },
              {
                validator: (_, value) => {
                  const num = Number(value);
                  if (!value || Number.isNaN(num) || num < 1) {
                    return Promise.reject(new Error('Giá trị phải là số nguyên dương, tối thiểu 1'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input type="number" min={1} placeholder="Ví dụ: 100" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={14}>
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

      <Form.Item name="description" label="Mô tả">
        <TextArea rows={4} placeholder="Mô tả ngắn gọn về hackathon" />
      </Form.Item>

      <Form.Item name="rules" label="Thể lệ">
        <TextArea rows={4} placeholder="Quy định và thể lệ cuộc thi" />
      </Form.Item>

      <Form.Item
        label="Ảnh Banner"
        extra={fieldHint('Upload ảnh JPG/PNG/WebP (tối đa 5MB). Ảnh hiển thị trên trang cấu hình sự kiện.')}
        name="banner_file"
        valuePropName="fileList"
        getValueFromEvent={(event) => (Array.isArray(event) ? event : event?.fileList)}
      >
        <HackathonBannerUpload />
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

    </Form>
  );
};

export default HackathonForm;
