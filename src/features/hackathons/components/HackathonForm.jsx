import { Form, Input, DatePicker, Select, Row, Col, Typography, Switch } from 'antd';
import dayjs from 'dayjs';
import HackathonBannerUpload from './HackathonBannerUpload';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

const fieldHint = (text) => (
  <Text type="secondary" style={{ fontSize: 12 }}>{text}</Text>
);

const range = (start, end) => {
  const result = [];
  for (let i = start; i < end; i += 1) result.push(i);
  return result;
};

/** Cùng ngày: end sớm nhất = start + 1 phút. */
const getRegEndDisabledTime = (current, regStart) => {
  if (!current || !regStart) return {};
  const start = dayjs(regStart);
  if (!current.isSame(start, 'day')) return {};
  const minEnd = start.add(1, 'minute');
  return {
    disabledHours: () => range(0, minEnd.hour()),
    disabledMinutes: (selectedHour) => {
      if (selectedHour < minEnd.hour()) return range(0, 60);
      if (selectedHour === minEnd.hour()) return range(0, minEnd.minute());
      return [];
    },
  };
};

const currentYear = new Date().getFullYear();
const buildYearOptions = (extraYear) => {
  const years = new Set([currentYear - 1, currentYear, currentYear + 1, currentYear + 2]);
  if (extraYear != null && !Number.isNaN(Number(extraYear))) years.add(Number(extraYear));
  return [...years].filter((y) => y >= 2024).sort((a, b) => a - b);
};

const HackathonForm = ({ form, onFinish, initialValues }) => {
  const yearOptions = buildYearOptions(initialValues?.year);
  const registrationStart = Form.useWatch('registration_start', form);
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        year: new Date().getFullYear(),
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
            extra={fieldHint('Có thể đổi năm khi nhân bản (vd. Fall 2026 → Spring 2027).')}
            rules={[
              { required: true, message: 'Vui lòng nhập năm' },
              {
                validator: (_, value) => {
                  const num = Number(value);
                  if (!value || Number.isNaN(num) || num < 2024) {
                    return Promise.reject(new Error('Năm phải từ 2024 trở lên'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Select
              placeholder="Chọn năm"
              options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
              showSearch
              optionFilterProp="label"
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
        name="individual_ranking_enabled"
        label="Bật bảng xếp hạng cá nhân"
        valuePropName="checked"
        extra={fieldHint('Khi bật, hệ thống tính và hiển thị BXH cá nhân bên cạnh BXH đội.')}
      >
        <Switch />
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
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="registration_end"
            label="Kết thúc Đăng ký"
            extra={fieldHint('Hết hạn đăng ký — sau đó khóa đội và bốc thăm. Cùng ngày thì sớm nhất = giờ mở + 1 phút.')}
            dependencies={['registration_start']}
            rules={[
              { required: true, message: 'Vui lòng chọn thời điểm kết thúc đăng ký' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const start = getFieldValue('registration_start');
                  if (!value || !start) return Promise.resolve();
                  const minEnd = dayjs(start).add(1, 'minute');
                  if (dayjs(value).isBefore(minEnd)) {
                    return Promise.reject(new Error('Kết thúc đăng ký phải sau giờ mở ít nhất 1 phút'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              disabledDate={(current) => {
                if (!current) return false;
                if (current < dayjs().startOf('day')) return true;
                if (registrationStart && current.isBefore(dayjs(registrationStart).startOf('day'))) return true;
                return false;
              }}
              disabledTime={(current) => getRegEndDisabledTime(current, registrationStart)}
            />
          </Form.Item>
        </Col>
      </Row>

    </Form>
  );
};

export default HackathonForm;
