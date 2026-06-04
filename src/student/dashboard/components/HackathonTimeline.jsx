import { useMemo, useState } from 'react';
import { Empty, Modal, Tag, Tooltip, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, CircleDot, Clock4, LockKeyhole } from 'lucide-react';

const { Text, Title, Paragraph } = Typography;

const getHackathonName = (hackathon, selectedTeam) =>
  hackathon?.name || hackathon?.hackathonName || selectedTeam?.hackathonName || 'Hackathon hiện tại';

const pickDate = (source, keys) => {
  const value = keys.map((key) => source?.[key]).find(Boolean);
  return value && !Number.isNaN(new Date(value).getTime()) ? value : null;
};

const buildTimelineEvents = (hackathon) => {
  const items = [
    {
      id: 'registration-start',
      title: 'Mở đăng ký',
      summary: 'Sinh viên bắt đầu đăng ký tham gia.',
      description: 'Sinh viên bắt đầu tạo tài khoản, xác thực email và hoàn tất hồ sơ để chờ Coordinator phê duyệt.',
      startTime: pickDate(hackathon, ['registrationStart', 'registration_start', 'registrationStartAt']),
    },
    {
      id: 'registration-end',
      title: 'Khóa thành viên',
      summary: 'Đóng cửa sổ thay đổi thành viên.',
      description: 'Sau mốc này, đội thi được khóa thành viên. Leader không thể mời thêm, hủy lời mời hoặc thay đổi đội hình.',
      startTime: pickDate(hackathon, ['registrationEnd', 'registration_end', 'registrationEndAt']),
    },
    {
      id: 'event-start',
      title: 'Khai mạc',
      summary: 'Công bố thông tin vận hành chính.',
      description: 'Coordinator công bố thông tin thi đấu, chủ đề, phân luồng đội và các mốc quan trọng cho vòng thi.',
      startTime: pickDate(hackathon, ['eventStart', 'event_start', 'startDate', 'startsAt']),
    },
    {
      id: 'submission-deadline',
      title: 'Hạn nộp bài',
      summary: 'Đội hoàn tất và nộp sản phẩm.',
      description: 'Đây là mốc cuối để đội hoàn thiện sản phẩm, kiểm tra nội dung nộp bài và chuẩn bị cho giai đoạn đánh giá.',
      startTime: pickDate(hackathon, ['submissionDeadline', 'submission_deadline']),
    },
    {
      id: 'event-end',
      title: 'Kết thúc',
      summary: 'Kết thúc mùa thi hiện tại.',
      description: 'Hackathon kết thúc và chuyển sang tổng kết, xác nhận kết quả, công bố giải thưởng hoặc lưu trữ dữ liệu.',
      startTime: pickDate(hackathon, ['eventEnd', 'event_end', 'endDate', 'endsAt']),
    },
  ];

  return items
    .filter((item) => item.startTime)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
};

const enrichTimelineEvents = (events) => {
  const now = Date.now();
  const nextIndex = events.findIndex((event) => new Date(event.startTime).getTime() > now);

  return events.map((event, index) => {
    const start = new Date(event.startTime).getTime();
    const nextStart = events[index + 1] ? new Date(events[index + 1].startTime).getTime() : Number.POSITIVE_INFINITY;
    const isActive = now >= start && now < nextStart;
    const isPreview = !isActive && index === nextIndex;
    const isDone = now >= nextStart || (nextIndex === -1 && index < events.length - 1);

    return {
      ...event,
      status: isActive ? 'active' : isPreview ? 'preview' : isDone ? 'done' : 'locked',
      canView: isActive || isPreview,
    };
  });
};

const getFocusedIndex = (events) => {
  const activeIndex = events.findIndex((event) => event.status === 'active');
  if (activeIndex >= 0) return activeIndex;

  const previewIndex = events.findIndex((event) => event.status === 'preview');
  if (previewIndex >= 0) return previewIndex;

  return Math.max(events.length - 1, 0);
};

const HackathonTimeline = ({ hackathon, selectedTeam }) => {
  const { token } = theme.useToken();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const mappedEvents = useMemo(
    () => enrichTimelineEvents(buildTimelineEvents(hackathon)),
    [hackathon]
  );
  const focusedIndex = getFocusedIndex(mappedEvents);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.22 }}
      style={{
        borderRadius: 8,
        padding: 22,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              color: '#fa8c16',
              background: 'rgba(250,140,22,0.14)',
            }}
          >
            <Calendar size={22} />
          </span>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
              Timeline Hackathon
            </Title>
            <Text type="secondary">{getHackathonName(hackathon, selectedTeam)}</Text>
          </div>
        </div>
      </div>

      {mappedEvents.length === 0 ? (
        <Empty description="Chưa có lịch trình được công bố" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ overflowX: 'auto', padding: '8px 4px 18px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${mappedEvents.length}, minmax(180px, 1fr))`,
              minWidth: Math.max(mappedEvents.length * 190, 660),
              alignItems: 'start',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 76,
                right: 76,
                top: 28,
                height: 3,
                borderRadius: 999,
                background: token.colorBorderSecondary,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 76,
                top: 28,
                height: 3,
                width: focusedIndex <= 0 ? 0 : `calc((100% - 152px) * ${focusedIndex / Math.max(mappedEvents.length - 1, 1)})`,
                borderRadius: 999,
                background: 'linear-gradient(90deg, #13c2c2, #1677ff)',
              }}
            />

            {mappedEvents.map((event, index) => (
              <TimelineNode
                event={event}
                index={index}
                isFocused={index === focusedIndex}
                isPassed={index < focusedIndex}
                token={token}
                onClick={() => event.canView && setSelectedEvent(event)}
                key={event.id}
              />
            ))}
          </div>
        </div>
      )}

      <Modal
        open={Boolean(selectedEvent)}
        onCancel={() => setSelectedEvent(null)}
        footer={null}
        centered
        title={selectedEvent?.title}
      >
        {selectedEvent && (
          <div>
            <Tag color={STATUS_META[selectedEvent.status].tagColor}>
              {STATUS_META[selectedEvent.status].label}
            </Tag>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ display: 'block' }}>
                Thời gian
              </Text>
              <Text strong>{new Date(selectedEvent.startTime).toLocaleString('vi-VN')}</Text>
            </div>
            <div style={{ marginTop: 14 }}>
              <Text type="secondary" style={{ display: 'block' }}>
                Tóm tắt
              </Text>
              <Text>{selectedEvent.summary}</Text>
            </div>
            <Paragraph style={{ marginTop: 18, marginBottom: 0 }}>{selectedEvent.description}</Paragraph>
          </div>
        )}
      </Modal>
    </motion.section>
  );
};

const STATUS_META = {
  done: { color: '#13c2c2', tagColor: 'cyan', icon: CheckCircle2, label: 'Đã qua' },
  active: { color: '#1677ff', tagColor: 'blue', icon: CircleDot, label: 'Đang diễn ra' },
  preview: { color: '#fa8c16', tagColor: 'orange', icon: Clock4, label: 'Sắp diễn ra' },
  locked: { color: '#94a3b8', tagColor: 'default', icon: LockKeyhole, label: 'Chưa mở' },
};

const TimelineNode = ({ event, index, isFocused, isPassed, token, onClick }) => {
  const meta = STATUS_META[event.status];
  const Icon = meta.icon;
  const color = isPassed ? '#13c2c2' : isFocused ? meta.color : token.colorTextQuaternary;
  const cursor = event.canView ? 'pointer' : 'not-allowed';

  return (
    <Tooltip
      title={event.canView ? 'Bấm để xem chi tiết' : 'Thông tin sẽ mở khi sự kiện sắp hoặc đang diễn ra'}
      placement="top"
    >
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 * index }}
        whileHover={event.canView ? { y: -4 } : {}}
        onClick={onClick}
        style={{
          appearance: 'none',
          border: 0,
          background: 'transparent',
          cursor,
          padding: 0,
          textAlign: 'center',
          color: token.colorText,
          position: 'relative',
          zIndex: 1,
          opacity: event.canView || isPassed ? 1 : 0.62,
        }}
      >
        <span
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 12px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color,
            background: token.colorBgContainer,
            border: `3px solid ${color}`,
            boxShadow: isFocused ? `0 0 0 8px ${color}18, 0 0 30px ${color}55` : token.boxShadowTertiary,
          }}
        >
          <Icon size={21} />
        </span>
        <Text strong ellipsis style={{ display: 'block', maxWidth: 150, margin: '0 auto' }}>
          {event.title}
        </Text>
        <Text type="secondary" style={{ display: 'block', marginTop: 5, fontSize: 12 }}>
          {new Date(event.startTime).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <Tag color={meta.tagColor} style={{ marginTop: 8, marginInlineEnd: 0 }}>
          {meta.label}
        </Tag>
      </motion.button>
    </Tooltip>
  );
};

export default HackathonTimeline;
