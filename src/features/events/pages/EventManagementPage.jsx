import { useState, useMemo, useEffect } from 'react';
import { Card, Button, Table, Form, Input, InputNumber, Modal, Select, Tag, Radio, Badge, Calendar, Spin, Popconfirm, DatePicker, Switch, Steps, Alert, Typography, Space, Tooltip } from 'antd';
import { Plus, List, Calendar as CalendarIcon, Trash2, Pencil } from 'lucide-react';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppContext } from '../../../app/AppContext';
import { useEventManagement } from '../hooks/useEventManagement';
import { eventService } from '../services/eventService';
import {
  buildEventScheduleContext,
  getEventEndDisabledTime,
  getEventScheduleHint,
  getEventStartDisabledTime,
  getSuggestedEventStart,
  isEventEndDateDisabled,
  isEventStartDateDisabled,
  isPrelimPublished,
} from '../utils/eventScheduleRules';
import {
  EVENT_TYPE_LABELS,
  getCreatableEventTypes,
  getDefaultEventType,
  getEventTypeOptionLabel,
  hasEventType,
  isFirstEventCreation,
} from '../utils/eventTypeRules';
import { hackathonService } from '../../hackathons/services/hackathonService';
import SectionHeader, { HintList } from '../../../shared/components/ui/SectionHeader';

const EVENTS_TAB_HINT = (
  <HintList
    items={[
      'Trước hết tạo Lễ khai mạc, sau đó mới tạo Workshop',
      'Trên lịch thực tế, Workshop diễn ra trước khai mạc và không cùng ngày',
      'Buffet giải lao nằm giữa Sơ loại và Chung kết (sau khi đã có cả hai vòng)',
      'Khi chọn loại sự kiện, lịch sẽ tự khóa ngày/giờ không hợp lệ',
      'Mỗi kỳ chỉ có một Lễ khai mạc, một Workshop, một Buffet và một Lễ trao giải',
    ]}
  />
);

const EVENT_TYPE_STYLES = {
  KICKOFF: { tag: 'red', bg: '#fff1f0', border: '#ff7875' },
  WORKSHOP: { tag: 'blue', bg: '#e6f4ff', border: '#69b1ff' },
  PRESENTATION: { tag: 'green', bg: '#f6ffed', border: '#73d13d' },
  AWARDS: { tag: 'gold', bg: '#fffbe6', border: '#ffc53d' },
  BUFFET: { tag: 'orange', bg: '#fff7e6', border: '#ffa940' },
  OTHER: { tag: 'default', bg: '#fafafa', border: '#d9d9d9' },
};

const getEventTypeStyle = (type) => EVENT_TYPE_STYLES[type] || EVENT_TYPE_STYLES.OTHER;
const BUFFET_LOCK_TIP = 'Đã công bố điểm — không thể sửa buffet';

const { TextArea } = Input;
const { Text } = Typography;
const EventManagementPage = ({ hackathonId, onUpdated }) => {
  const { refreshNotifications } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [menuLoading, setMenuLoading] = useState(false);
  const [form] = Form.useForm();

  // "Nghe lén" loại sự kiện người dùng đang chọn để khóa lịch và highlight Timeline
  const selectedType = Form.useWatch('type', form);
  const startsAt = Form.useWatch('starts_at', form);

  const { events, rounds, currentHackathon, isLoading, createEvent, updateEvent, deleteEvent } = useEventManagement(
    hackathonId,
    refreshNotifications,
    onUpdated,
  );
  const [awardsReadiness, setAwardsReadiness] = useState(null);

  const buffetLocked = useMemo(() => isPrelimPublished(rounds), [rounds]);
  const buffetFieldsDisabled = selectedType === 'BUFFET' && buffetLocked;

  useEffect(() => {
    if (!hackathonId || !hasEventType(events, 'AWARDS')) {
      setAwardsReadiness(null);
      return;
    }
    let cancelled = false;
    hackathonService.getReadiness(hackathonId, 'AWARDS')
      .then((res) => { if (!cancelled) setAwardsReadiness(res?.data ?? res); })
      .catch(() => { if (!cancelled) setAwardsReadiness(null); });
    return () => { cancelled = true; };
  }, [hackathonId, events]);

  const creatableEventTypes = useMemo(
    () => getCreatableEventTypes(events, rounds),
    [events, rounds],
  );
  const isFirstEvent = isFirstEventCreation(events);

  const openCreateModal = () => {
    setEditingEvent(null);
    form.resetFields();
    form.setFieldsValue({
      type: getDefaultEventType(events, rounds),
      is_public: true,
      buffet_menu: [{ name: '', quantity: 1, unit: '', note: '' }],
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (record) => {
    setEditingEvent(record);
    form.setFieldsValue({
      title: record.title,
      type: record.type,
      is_public: record.is_public,
      starts_at: record.starts_at ? dayjs(record.starts_at) : null,
      ends_at: record.ends_at ? dayjs(record.ends_at) : null,
      location: record.location,
      meet_url: record.meet_url,
      description: record.description,
      buffet_menu: [{ name: '', quantity: 1, unit: '', note: '' }],
    });
    setIsModalOpen(true);

    if (record.type === 'BUFFET' && record.id) {
      setMenuLoading(true);
      try {
        const menu = await eventService.getBuffetMenu(record.id);
        const rows = Array.isArray(menu) ? menu : [];
        form.setFieldsValue({
          buffet_menu: rows.length
            ? rows.map((item) => ({
                name: item.name || '',
                quantity: item.quantity ?? 1,
                unit: item.unit || '',
                note: item.note || '',
              }))
            : [{ name: '', quantity: 1, unit: '', note: '' }],
        });
      } catch {
        form.setFieldsValue({
          buffet_menu: [{ name: '', quantity: 1, unit: '', note: '' }],
        });
      } finally {
        setMenuLoading(false);
      }
    }
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
    if (!isModalOpen || !selectedType || editingEvent) return;
    const suggested = getSuggestedEventStart(scheduleCtx);
    if (suggested) {
      form.setFieldsValue({ starts_at: suggested });
    }
  }, [form, isModalOpen, selectedType, scheduleCtx, editingEvent]);

  useEffect(() => {
    if (!isModalOpen || editingEvent) return;
    const currentType = form.getFieldValue('type');
    if (!creatableEventTypes.includes(currentType)) {
      form.setFieldsValue({ type: getDefaultEventType(events, rounds) });
    }
  }, [isModalOpen, creatableEventTypes, events, rounds, form, editingEvent]);

  const handleFinish = (values) => {
    if (values.type === 'BUFFET' && buffetLocked) {
      return;
    }
    const onDone = () => {
      setIsModalOpen(false);
      setEditingEvent(null);
      form.resetFields();
    };
    if (editingEvent?.id) {
      updateEvent(editingEvent.id, values, onDone);
    } else {
      createEvent(values, onDone);
    }
  };

  const disabledStartDate = (current) => isEventStartDateDisabled(current, scheduleCtx);
  const disabledEndDate = (current) => isEventEndDateDisabled(current, scheduleCtx, startsAt);
  const disabledStartTime = (current) => getEventStartDisabledTime(current, scheduleCtx);
  const disabledEndTime = (current) => getEventEndDisabledTime(current, startsAt, scheduleCtx);
  const scheduleHint = getEventScheduleHint(scheduleCtx);
  const columns = [
    {
      title: 'Tên sự kiện',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const style = getEventTypeStyle(type);
        return <Tag color={style.tag}>{EVENT_TYPE_LABELS[type] || getEventTypeOptionLabel(type)}</Tag>;
      },
    },
    { title: 'Bắt đầu', dataIndex: 'starts_at', key: 'starts', render: text => dayjs(text).format('YYYY-MM-DD HH:mm') },
    { title: 'Kết thúc', dataIndex: 'ends_at', key: 'ends', render: text => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-' },
    { title: 'Trạng thái', dataIndex: 'is_public', key: 'public', render: (pub) => pub ? <Tag color="green">Mở</Tag> : <Tag>Đóng</Tag> },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title={record.type === 'BUFFET' && buffetLocked ? BUFFET_LOCK_TIP : 'Sửa sự kiện'}>
            <Button type="text" icon={<Pencil size={16} />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Popconfirm
          title="Xóa sự kiện"
          description="Bạn có chắc chắn muốn xóa sự kiện này?"
          onConfirm={() => deleteEvent(record.id)}
          okText="Xóa"
          cancelText="Hủy"
          disabled={record.type === 'BUFFET' && buffetLocked}
        >
          <Tooltip title={record.type === 'BUFFET' && buffetLocked ? BUFFET_LOCK_TIP : undefined}>
            <Button
              type="text"
              danger
              icon={<Trash2 size={16} />}
              disabled={record.type === 'BUFFET' && buffetLocked}
            />
          </Tooltip>
        </Popconfirm>
        </Space>
      ),
    },
  ];

  const getBadgeStatus = (type) => {
    switch (type) {
      case 'KICKOFF': return 'error';
      case 'AWARDS': return 'warning';
      case 'PRESENTATION': return 'success';
      case 'BUFFET': return 'warning';
      default: return 'processing';
    }
  };

  const dateCellRender = (value) => {
    const listData = events.filter(e => dayjs(e.starts_at).isSame(value, 'day'));
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {listData.map((item) => {
          const style = getEventTypeStyle(item.type);
          return (
            <li key={item.id} style={{ marginBottom: 4 }}>
              <div
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: style.bg,
                  borderLeft: `3px solid ${style.border}`,
                }}
              >
                <Badge status={getBadgeStatus(item.type)} text={item.title} />
              </div>
            </li>
          );
        })}
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
      case 'KICKOFF': return 0;
      case 'WORKSHOP': return 1;
      case 'BUFFET': return 2;
      case 'AWARDS': return 3;
      default: return -1;
    }
  };

  return (
    <div style={{ padding: '24px 0', animation: 'fadeInUp 0.4s ease-out both' }}>
      <SectionHeader
        title="Lịch trình & Sự kiện"
        info={EVENTS_TAB_HINT}
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
            Tạo Sự kiện
          </Button>
        }
      />
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 16 }}>
        <Radio.Group value={viewMode} onChange={e => setViewMode(e.target.value)}>
          <Radio.Button value="list"><List size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Danh sách</Radio.Button>
          <Radio.Button value="calendar"><CalendarIcon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Lịch sự kiện</Radio.Button>
        </Radio.Group>
      </div>

      {awardsReadiness && (
        <Alert
          data-testid="hackathon-awards-readiness"
          type={awardsReadiness.ready ? 'success' : 'info'}
          showIcon
          style={{ marginBottom: 16 }}
          message={awardsReadiness.ready ? 'Readiness AWARDS: Sẵn sàng' : 'Readiness AWARDS'}
          description={`Blockers: ${(awardsReadiness.blockers || []).length}, Warnings: ${(awardsReadiness.warnings || []).length}`}
        />
      )}

      <Card styles={{ body: { padding: viewMode === 'calendar' ? 0 : 24 } }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
        ) : viewMode === 'list' ? (
          <Table
            scroll={{ x: 'max-content' }}
            dataSource={events}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{ emptyText: 'Chưa có sự kiện nào được tạo.' }}
            onRow={(record) => {
              const style = getEventTypeStyle(record.type);
              return {
                style: {
                  borderLeft: `4px solid ${style.border}`,
                },
              };
            }}
          />
        ) : (
          <Calendar cellRender={cellRender} />
        )}
      </Card>

      <Modal
        title={editingEvent ? 'Sửa sự kiện' : 'Thêm sự kiện'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); setEditingEvent(null); }}
        onOk={() => form.submit()}
        width={720}
        okText="Lưu"
        confirmLoading={isLoading || menuLoading}
        okButtonProps={{ disabled: buffetFieldsDisabled }}
      >
        
        <div style={{ marginBottom: 20, padding: '16px 20px', background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: 12, color: '#475569', fontSize: 13, fontWeight: 500 }}>
            <InfoCircleOutlined style={{ marginRight: 6, color: '#6366f1' }} />
            Dòng thời gian gợi ý
          </div>
          <Steps
            size="small"
            current={currentStepIndex()}
            items={[
              { title: 'Khai mạc', description: 'Trước ngày thi 1 ngày', status: getStepStatus('KICKOFF') },
              { title: 'Workshop', description: 'Sau đăng ký', status: getStepStatus('WORKSHOP') },
              { title: 'Buffet', description: 'Giữa SL–CK', status: getStepStatus('BUFFET') },
              { title: 'Trao giải', description: 'Cuối kỳ', status: getStepStatus('AWARDS') },
            ]}
          />
        </div>

        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ is_public: true }}>
          <Form.Item name="title" label="Tên sự kiện" rules={[{ required: true, message: 'Nhập tên sự kiện' }]}>
            <Input placeholder="Ví dụ: Workshop định hướng đề tài" disabled={buffetFieldsDisabled} />
          </Form.Item>
          
          {isFirstEvent && !editingEvent && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
              <InfoCircleOutlined style={{ marginRight: 6, color: '#6366f1' }} />
              Lần đầu tạo sự kiện, bạn cần tạo Lễ khai mạc. Các loại khác sẽ mở sau khi đã có khai mạc.
            </Text>
          )}

          {!isFirstEvent && !editingEvent && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
              <InfoCircleOutlined style={{ marginRight: 6, color: '#6366f1' }} />
              Mỗi kỳ chỉ có một Lễ khai mạc, một Workshop, một Buffet và một Lễ trao giải — loại đã tạo sẽ không hiện lại.
              {hasEventType(events, 'KICKOFF') && !hasEventType(events, 'WORKSHOP') && ' Bạn có thể thêm Workshop sau khai mạc.'}
            </Text>
          )}

          {buffetFieldsDisabled && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={BUFFET_LOCK_TIP}
            />
          )}

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="type"
              label={
                <span>
                  Loại sự kiện{' '}
                  {scheduleHint && (
                    <Tooltip title={scheduleHint}>
                      <InfoCircleOutlined style={{ color: '#6366f1', marginLeft: 4 }} />
                    </Tooltip>
                  )}
                </span>
              }
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Chọn loại sự kiện' }]}
            >
              <Select placeholder="Chọn loại" disabled={Boolean(editingEvent) || buffetFieldsDisabled}>
                {(editingEvent ? [editingEvent.type] : creatableEventTypes).map((type) => (
                  <Select.Option key={type} value={type}>
                    {getEventTypeOptionLabel(type, events)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="is_public" label="Hiển thị công khai" valuePropName="checked" style={{ flex: 1 }}>
              <Switch disabled={buffetFieldsDisabled} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="starts_at"
              label={
                <span>
                  Bắt đầu{' '}
                  {scheduleHint && (
                    <Tooltip title={scheduleHint}>
                      <InfoCircleOutlined style={{ color: '#6366f1', marginLeft: 4 }} />
                    </Tooltip>
                  )}
                </span>
              }
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Chọn thời gian bắt đầu' }]}
            >
              <DatePicker
                disabled={buffetFieldsDisabled}
                disabledDate={disabledStartDate}
                disabledTime={disabledStartTime}
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                placeholder="Chọn ngày và giờ"
              />
            </Form.Item>
            <Form.Item 
              name="ends_at"
              label="Kết thúc"
              style={{ flex: 1 }}
              dependencies={['starts_at', 'type']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (getFieldValue('type') === 'BUFFET' && !value) {
                      return Promise.reject(new Error('Buffet cần giờ kết thúc'));
                    }
                    const start = getFieldValue('starts_at');
                    if (!value || !start || dayjs(value).isAfter(dayjs(start))) return Promise.resolve();
                    return Promise.reject(new Error('Giờ kết thúc phải sau giờ bắt đầu'));
                  },
                }),
              ]}
            >
              <DatePicker
                disabled={buffetFieldsDisabled}
                disabledDate={disabledEndDate}
                disabledTime={disabledEndTime}
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                placeholder={selectedType === 'BUFFET' ? 'Bắt buộc' : 'Tuỳ chọn'}
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
            <Input placeholder="Ví dụ: Phòng A101, tòa Beta" disabled={buffetFieldsDisabled} />
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
            <Input placeholder="https://meet.google.com/..." disabled={buffetFieldsDisabled} />
          </Form.Item>

          {selectedType === 'BUFFET' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text strong>Thực đơn buffet</Text>
                {buffetFieldsDisabled ? (
                  <Tooltip title={BUFFET_LOCK_TIP}>
                    <InfoCircleOutlined style={{ color: '#fa8c16' }} />
                  </Tooltip>
                ) : null}
              </div>
              {menuLoading ? (
                <div style={{ textAlign: 'center', padding: 16 }}><Spin /></div>
              ) : (
                <Form.List name="buffet_menu">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field) => (
                        <Space key={field.key} align="start" wrap style={{ display: 'flex', marginBottom: 8 }}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'name']}
                            rules={[{ required: true, message: 'Tên món' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input placeholder="Tên món" style={{ width: 160 }} disabled={buffetFieldsDisabled} />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            name={[field.name, 'quantity']}
                            rules={[{ required: true, message: 'SL' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber min={1} placeholder="SL" style={{ width: 80 }} disabled={buffetFieldsDisabled} />
                          </Form.Item>
                          <Form.Item {...field} name={[field.name, 'unit']} style={{ marginBottom: 0 }}>
                            <Input placeholder="Đơn vị" style={{ width: 90 }} disabled={buffetFieldsDisabled} />
                          </Form.Item>
                          <Form.Item {...field} name={[field.name, 'note']} style={{ marginBottom: 0 }}>
                            <Input placeholder="Ghi chú" style={{ width: 140 }} disabled={buffetFieldsDisabled} />
                          </Form.Item>
                          {!buffetFieldsDisabled && fields.length > 1 ? (
                            <Button type="text" danger onClick={() => remove(field.name)}>
                              Xóa
                            </Button>
                          ) : null}
                        </Space>
                      ))}
                      {!buffetFieldsDisabled ? (
                        <Button
                          type="dashed"
                          block
                          icon={<Plus size={14} />}
                          onClick={() => add({ name: '', quantity: 1, unit: '', note: '' })}
                        >
                          Thêm món
                        </Button>
                      ) : null}
                    </>
                  )}
                </Form.List>
              )}
            </div>
          )}

          <Form.Item name="description" label="Ghi chú thêm">
            <TextArea rows={3} placeholder="Thông tin bổ sung cho sinh viên (tuỳ chọn)" disabled={buffetFieldsDisabled} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EventManagementPage;
