import React, { useState } from 'react';
import { Card, Button, Table, Form, Input, Modal, Select, Tag, Radio, Badge, Calendar, Spin, Popconfirm, DatePicker, Switch, Steps } from 'antd';
import { Plus, List, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppContext } from '../../../app/AppContext';
import { useEventManagement } from '../hooks/useEventManagement';

const { TextArea } = Input;

const EventManagementPage = ({ hackathonId }) => {
  const { addNotification } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [form] = Form.useForm();

  // "Nghe lén" loại sự kiện người dùng đang chọn để khóa lịch và highlight Timeline
  const selectedType = Form.useWatch('type', form);

  // Gọi API thông qua Custom Hook
  const { events, rounds, currentHackathon, isLoading, createEvent, deleteEvent } = useEventManagement(hackathonId, addNotification);

  // Biến cờ kiểm tra xem đã có sự kiện Khai mạc chưa
  const hasKickoff = events.some(e => e.type === 'KICKOFF');

  const handleFinish = (values) => {
    createEvent(values, () => {
      setIsModalOpen(false);
      form.resetFields();
    });
  };

  // --- LOGIC TÔ ĐEN (DISABLE) CÁC NGÀY KHÔNG HỢP LỆ TRÊN LỊCH ---
  const disabledStartDate = (current) => {
    if (!current || !currentHackathon || !selectedType) return false;

    const hRegEnd = currentHackathon.registration_end ? dayjs(currentHackathon.registration_end).startOf('day') : null;
    const hEvStart = currentHackathon.event_start ? dayjs(currentHackathon.event_start).startOf('day') : null;
    const hEvEnd = currentHackathon.event_end ? dayjs(currentHackathon.event_end).endOf('day') : null;

    // Tìm mốc "Ngày thi Hackathon"
    const firstRound = rounds?.sort((a, b) => dayjs(a.exam_at || a.examAt).valueOf() - dayjs(b.exam_at || b.examAt).valueOf())[0];
    const firstExamDate = firstRound && (firstRound.exam_at || firstRound.examAt) 
      ? dayjs(firstRound.exam_at || firstRound.examAt).startOf('day') 
      : hEvStart;

    if (selectedType === 'WORKSHOP') {
      if (hRegEnd && current.isBefore(hRegEnd, 'day')) return true;
      const kickoffEvent = events.find(e => e.type === 'KICKOFF');
      if (kickoffEvent) {
        const kickoffDay = dayjs(kickoffEvent.starts_at).startOf('day');
        if (!current.isBefore(kickoffDay, 'day')) return true;
      }
    }

    if (selectedType === 'KICKOFF') {
      if (firstExamDate) {
        const requiredKickoffDate = firstExamDate.subtract(1, 'day').startOf('day');
        if (!current.startOf('day').isSame(requiredKickoffDate)) {
          return true;
        }
      }

      const workshops = events.filter(e => e.type === 'WORKSHOP');
      if (workshops.length > 0) {
        const latestWorkshop = workshops.sort((a, b) => dayjs(b.ends_at || b.starts_at).diff(dayjs(a.ends_at || a.starts_at)))[0];
        const workshopEndDay = dayjs(latestWorkshop.ends_at || latestWorkshop.starts_at).startOf('day');
        if (!current.isAfter(workshopEndDay, 'day')) return true;
      }
    }

    if (selectedType === 'AWARDS') {
      const finalRound = rounds?.find(r => r.is_final || r.isFinal);
      if (finalRound && (finalRound.submission_deadline || finalRound.submissionDeadline)) {
        const finalDeadline = dayjs(finalRound.submission_deadline || finalRound.submissionDeadline).startOf('day');
        if (current.isBefore(finalDeadline, 'day')) return true;
      }
      if (hEvEnd && current.isAfter(hEvEnd, 'day')) return true;
    }

    if (selectedType === 'PRESENTATION' || selectedType === 'OTHER') {
      if (hEvStart && current.isBefore(hEvStart, 'day')) return true;
      if (hEvEnd && current.isAfter(hEvEnd, 'day')) return true;
    }

    return false;
  };

  const disabledEndDate = (current) => {
    if (disabledStartDate(current)) return true;
    const startsAt = form.getFieldValue('starts_at');
    if (startsAt && current.isBefore(dayjs(startsAt).startOf('day'))) return true;
    return false;
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Radio.Group value={viewMode} onChange={e => setViewMode(e.target.value)}>
          <Radio.Button value="list"><List size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Danh sách</Radio.Button>
          <Radio.Button value="calendar"><CalendarIcon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Lịch sự kiện</Radio.Button>
        </Radio.Group>

        <Button type="primary" icon={<Plus size={16} />} onClick={() => { form.resetFields(); setIsModalOpen(true); }}>
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

      <Modal title="Tạo Lịch Sự kiện" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()} width={700} okText="Lưu" confirmLoading={isLoading}>
        
        {/* --- KHỐI TIMELINE TRỰC QUAN --- */}
        <div style={{ marginBottom: 24, padding: '16px 20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ marginBottom: 16, color: '#595959', fontSize: 13, fontWeight: 500 }}>
            <InfoCircleOutlined style={{ marginRight: 6, color: '#1677ff' }} />
            Trình tự tổ chức chuỗi sự kiện khuyến nghị:
          </div>
          <Steps
            size="small"
            current={currentStepIndex()}
            items={[
              {
                title: 'Workshop',
                description: 'Sau Đăng ký',
                status: getStepStatus('WORKSHOP'),
              },
              {
                title: 'Khai mạc',
                description: 'Trước ngày thi 1 ngày',
                status: getStepStatus('KICKOFF'),
              },
              {
                title: 'Thuyết trình',
                description: 'Trong thời gian thi',
                status: getStepStatus('PRESENTATION'),
              },
              {
                title: 'Trao giải',
                description: 'Sau Chung kết',
                status: getStepStatus('AWARDS'),
              },
            ]}
          />
        </div>
        {/* --------------------------------- */}

        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ is_public: true }}>
          <Form.Item name="title" label="Tiêu đề Sự kiện" rules={[{ required: true, message: 'Bắt buộc nhập tiêu đề' }]}><Input placeholder="VD: Lễ Trao giải Hackathon" /></Form.Item>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="type" label="Phân loại (Type)" style={{ flex: 1 }} rules={[{ required: true, message: 'Vui lòng chọn loại sự kiện' }]}>
              <Select placeholder="Chọn loại sự kiện">
                <Select.Option value="KICKOFF">KICKOFF (Khai mạc)</Select.Option>
                <Select.Option value="WORKSHOP" disabled={!hasKickoff}>
                  WORKSHOP {!hasKickoff && '(Cần tạo Khai mạc trước)'}
                </Select.Option>
                <Select.Option value="PRESENTATION">PRESENTATION (Thuyết trình)</Select.Option>
                <Select.Option value="AWARDS">AWARDS (Trao giải)</Select.Option>
                <Select.Option value="OTHER">OTHER (Khác)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="is_public" label="Hiển thị Public" valuePropName="checked" style={{ flex: 1 }}><Switch /></Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="starts_at" label="Thời gian Bắt đầu" style={{ flex: 1 }} rules={[{ required: true, message: 'Bắt buộc chọn thời gian' }]}>
              <DatePicker disabledDate={disabledStartDate} showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item 
              name="ends_at" label="Thời gian Kết thúc" style={{ flex: 1 }} dependencies={['starts_at']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const start = getFieldValue('starts_at');
                    if (!value || !start || dayjs(value).isAfter(dayjs(start))) return Promise.resolve();
                    return Promise.reject(new Error('Kết thúc phải diễn ra sau lúc bắt đầu'));
                  },
                }),
              ]}
            >
              <DatePicker disabledDate={disabledEndDate} showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item 
            name="location" 
            label="Địa điểm (Offline)"
            dependencies={['meet_url']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value || getFieldValue('meet_url')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Bắt buộc nhập Địa điểm HOẶC Link họp'));
                },
              }),
            ]}
          >
            <Input placeholder="VD: Tòa nhà Beta" />
          </Form.Item>

          <Form.Item 
            name="meet_url" 
            label="Link Họp (Online)"
            dependencies={['location']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value || getFieldValue('location')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Bắt buộc nhập Địa điểm HOẶC Link họp'));
                },
              }),
            ]}
          >
            <Input placeholder="https://meet.google.com/..." />
          </Form.Item>

          <Form.Item name="description" label="Mô tả"><TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EventManagementPage;