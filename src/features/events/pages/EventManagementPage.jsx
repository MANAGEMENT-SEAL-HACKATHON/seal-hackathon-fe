import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Table, Form, Input, Modal, Select, Tag, Radio, Badge, Calendar, Spin, Popconfirm, DatePicker, Switch, Steps, Alert, Typography } from 'antd';
import { Plus, List, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppContext } from '../../../app/AppContext';
import { useEventManagement } from '../hooks/useEventManagement';
import {
  buildEventScheduleContext,
  getEventEndDisabledTime,
  getEventScheduleHint,
  getEventStartDisabledTime,
  getSuggestedEventStart,
  isEventEndDateDisabled,
  isEventStartDateDisabled,
} from '../utils/eventScheduleRules';
import {
  getCreatableEventTypes,
  getDefaultEventType,
  getEventTypeOptionLabel,
  hasEventType,
  isFirstEventCreation,
} from '../utils/eventTypeRules';

const { TextArea } = Input;
const { Text } = Typography;
const EventManagementPage = ({ hackathonId }) => {
  const { addNotification } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [form] = Form.useForm();

  // "Nghe lén" loại sự kiện người dùng đang chọn để khóa lịch và highlight Timeline
  const selectedType = Form.useWatch('type', form);
  const startsAt = Form.useWatch('starts_at', form);

  const { events, rounds, currentHackathon, isLoading, createEvent, deleteEvent } = useEventManagement(hackathonId, addNotification);

  const creatableEventTypes = useMemo(() => getCreatableEventTypes(events), [events]);
  const isFirstEvent = isFirstEventCreation(events);

  const openCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({
      type: getDefaultEventType(events),
      is_public: true,
    });
    setIsModalOpen(true);
  };

  const scheduleCtx = useMemo(
    () =>
      buildEventScheduleContext({
        hackathon: currentHackathon,
        rounds,
        events,
        selectedType,
      }),
    [currentHackathon, rounds, events, selectedType]
  );

  useEffect(() => {
    if (!isModalOpen || !selectedType) return;
    const suggested = getSuggestedEventStart(scheduleCtx);
    if (suggested) {
      form.setFieldsValue({ starts_at: suggested });
    }
  }, [form, isModalOpen, selectedType, scheduleCtx]);

  useEffect(() => {
    if (!isModalOpen) return;
    const currentType = form.getFieldValue('type');
    if (!creatableEventTypes.includes(currentType)) {
      form.setFieldsValue({ type: getDefaultEventType(events) });
    }
  }, [isModalOpen, creatableEventTypes, events, form]);

  const handleFinish = (values) => {    createEvent(values, () => {
      setIsModalOpen(false);
      form.resetFields();
    });
  };

  const disabledStartDate = (current) => isEventStartDateDisabled(current, scheduleCtx);
  const disabledEndDate = (current) => isEventEndDateDisabled(current, scheduleCtx, startsAt);
  const disabledStartTime = (current) => getEventStartDisabledTime(current, scheduleCtx);
  const disabledEndTime = (current) => getEventEndDisabledTime(current, startsAt);
  const scheduleHint = getEventScheduleHint(scheduleCtx);
  const columns = [
    { title: 'Tên sự kiện', dataIndex: 'title', key: 'title', render: text => <strong>{text}</strong> },
    { title: 'Loại', dataIndex: 'type', key: 'type', render: type => <Tag color="purple">{type}</Tag> },
    { title: 'Bắt đầu', dataIndex: 'starts_at', key: 'starts', render: text => dayjs(text).format('YYYY-MM-DD HH:mm') },
    { title: 'Kết thúc', dataIndex: 'ends_at', key: 'ends', render: text => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-' },
    { title: 'Trạng thái', dataIndex: 'is_public', key: 'public', render: (pub) => pub ? <Tag color="green">Mở</Tag> : <Tag>Đóng</Tag> },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="Xóa sự kiện"
          description="Bạn có chắc chắn muốn xóa sự kiện này?"
          onConfirm={() => deleteEvent(record.id)}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button type="text" danger icon={<Trash2 size={16} />} />
        </Popconfirm>
      ),
    },
  ];

  const getBadgeStatus = (type) => {
    switch (type) {
      case 'KICKOFF': return 'error';
      case 'AWARDS': return 'warning';
      case 'PRESENTATION': return 'success';
      default: return 'processing';
    }
  };

  const dateCellRender = (value) => {
    const listData = events.filter(e => dayjs(e.starts_at).isSame(value, 'day'));
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {listData.map((item) => (
          <li key={item.id} style={{ marginBottom: 4 }}>
            <Badge status={getBadgeStatus(item.type)} text={<span style={{ fontSize: 12 }}>{item.title}</span>} />
          </li>
        ))}
      </ul>
    );
  };

  const cellRender = (current, info) => {
    if (info.type === 'date') return dateCellRender(current);
    return info.originNode;
  };

  // --- LOGIC TRẠNG THÁI TIMELINE ---
  const getStepStatus = (stepType) => {
    if (selectedType === stepType) return 'process'; // Đang chọn ở Form
    const isCreated = events.some(e => e.type === stepType);
    if (isCreated) return 'finish'; // Đã tạo thành công
    return 'wait'; // Chưa tạo
  };

  const currentStepIndex = () => {
    switch (selectedType) {
      case 'WORKSHOP': return 0;
      case 'KICKOFF': return 1;
      case 'PRESENTATION': return 2;
      case 'AWARDS': return 3;
      default: return -1;
    }
  };

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 12 }}
        message="Thứ tự tạo sự kiện"
        description={
          <Text type="secondary" style={{ fontSize: 13 }}>
            Trước hết tạo <strong>Lễ khai mạc</strong>, sau đó mới tạo <strong>Workshop</strong>.
            Trên lịch thực tế, workshop diễn ra trước khai mạc và không cùng ngày.
            Khi chọn loại sự kiện, lịch sẽ khóa ngày và giờ không hợp lệ — bạn chỉ cần chọn trong khung được phép.
          </Text>
        }
      />      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Radio.Group value={viewMode} onChange={e => setViewMode(e.target.value)}>
          <Radio.Button value="list"><List size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Danh sách</Radio.Button>
          <Radio.Button value="calendar"><CalendarIcon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Lịch sự kiện</Radio.Button>
        </Radio.Group>

        <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
          Tạo Sự kiện
        </Button>
      </div>

      <Card styles={{ body: { padding: viewMode === 'calendar' ? 0 : 24 } }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
        ) : viewMode === 'list' ? (
          <Table scroll={{ x: 'max-content' }} dataSource={events} columns={columns} rowKey="id" pagination={false} locale={{ emptyText: 'Chưa có sự kiện nào được tạo.' }} />
        ) : (
          <Calendar cellRender={cellRender} />
        )}
      </Card>

      <Modal title="Thêm sự kiện" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()} width={720} okText="Lưu" confirmLoading={isLoading}>
        
        <div style={{ marginBottom: 20, padding: '16px 20px', background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: 12, color: '#475569', fontSize: 13, fontWeight: 500 }}>
            <InfoCircleOutlined style={{ marginRight: 6, color: '#1677ff' }} />
            Dòng thời gian gợi ý
          </div>
          <Steps
            size="small"
            current={currentStepIndex()}
            items={[
              { title: 'Workshop', description: 'Sau đăng ký', status: getStepStatus('WORKSHOP') },
              { title: 'Khai mạc', description: 'Trước ngày thi 1 ngày', status: getStepStatus('KICKOFF') },
              { title: 'Thuyết trình', description: 'Trong kỳ thi', status: getStepStatus('PRESENTATION') },
              { title: 'Trao giải', description: 'Cuối kỳ', status: getStepStatus('AWARDS') },
            ]}
          />
        </div>

        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ is_public: true }}>
          <Form.Item name="title" label="Tên sự kiện" rules={[{ required: true, message: 'Nhập tên sự kiện' }]}>
            <Input placeholder="Ví dụ: Workshop định hướng đề tài" />
          </Form.Item>
          
          {isFirstEvent && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Sự kiện đầu tiên"
              description="Lần đầu tạo sự kiện, bạn cần tạo Lễ khai mạc. Các loại khác sẽ mở sau khi đã có khai mạc."
            />
          )}

          {!isFirstEvent && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Loại sự kiện có thể tạo"
              description={
                <span style={{ fontSize: 13 }}>
                  Mỗi kỳ chỉ có một Lễ khai mạc, một Workshop và một Lễ trao giải — loại đã tạo sẽ không hiện lại.
                  {hasEventType(events, 'KICKOFF') && !hasEventType(events, 'WORKSHOP') && ' Bạn có thể thêm Workshop sau khai mạc.'}
                </span>
              }
            />
          )}

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="type" label="Loại sự kiện" style={{ flex: 1 }} rules={[{ required: true, message: 'Chọn loại sự kiện' }]}>
              <Select placeholder="Chọn loại">
                {creatableEventTypes.map((type) => (
                  <Select.Option key={type} value={type}>
                    {getEventTypeOptionLabel(type, events)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="is_public" label="Hiển thị công khai" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
          </div>

          {selectedType && (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
              message="Khung thời gian được phép"
              description={<Text style={{ fontSize: 13 }}>{scheduleHint}</Text>}
            />
          )}

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="starts_at" label="Bắt đầu" style={{ flex: 1 }} rules={[{ required: true, message: 'Chọn thời gian bắt đầu' }]}>
              <DatePicker
                disabledDate={disabledStartDate}
                disabledTime={disabledStartTime}
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                placeholder="Chọn ngày và giờ"
              />
            </Form.Item>
            <Form.Item 
              name="ends_at" label="Kết thúc" style={{ flex: 1 }} dependencies={['starts_at']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const start = getFieldValue('starts_at');
                    if (!value || !start || dayjs(value).isAfter(dayjs(start))) return Promise.resolve();
                    return Promise.reject(new Error('Giờ kết thúc phải sau giờ bắt đầu'));
                  },
                }),
              ]}
            >
              <DatePicker
                disabledDate={disabledEndDate}
                disabledTime={disabledEndTime}
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                placeholder="Tuỳ chọn"
              />
            </Form.Item>
          </div>
          <Form.Item 
            name="location" 
            label="Địa điểm (nếu offline)"
            dependencies={['meet_url']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value || getFieldValue('meet_url')) return Promise.resolve();
                  return Promise.reject(new Error('Nhập địa điểm hoặc link họp online'));
                },
              }),
            ]}
          >
            <Input placeholder="Ví dụ: Phòng A101, tòa Beta" />
          </Form.Item>

          <Form.Item 
            name="meet_url" 
            label="Link họp online"
            dependencies={['location']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value || getFieldValue('location')) return Promise.resolve();
                  return Promise.reject(new Error('Nhập địa điểm hoặc link họp online'));
                },
              }),
            ]}
          >
            <Input placeholder="https://meet.google.com/..." />
          </Form.Item>

          <Form.Item name="description" label="Ghi chú thêm"><TextArea rows={3} placeholder="Thông tin bổ sung cho sinh viên (tuỳ chọn)" /></Form.Item>        </Form>
      </Modal>
    </div>
  );
};

export default EventManagementPage;