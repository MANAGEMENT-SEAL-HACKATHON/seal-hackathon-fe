import { useMemo, useState } from 'react';
import { Empty, Modal, Tag, Tooltip, Typography, theme, Space } from 'antd';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, CircleDot, Clock4, LockKeyhole, Sparkles, Zap, Trophy, Rocket, Flag } from 'lucide-react';

const { Text, Title, Paragraph } = Typography;

/* OFFICIAL FPT LOGO COLORS */
const FPT = {
  blue: '#00529C',       // Chữ F - Cobalt/Royal Blue
  blueLight: '#1E73BE',
  orange: '#F37021',     // Chữ P - FPT Orange
  orangeLight: '#FF8C42',
  green: '#46B749',      // Chữ T - FPT Leaf Green
};

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
      color: '#8B5CF6',
      gradient: `linear-gradient(135deg, #A855F7, #6366F1)`,
      customIcon: Rocket,
    },
    {
      id: 'registration-end',
      title: 'Khóa thành viên',
      summary: 'Đóng cửa sổ thay đổi đội hình.',
      description: 'Sau mốc này, đội thi được khóa thành viên. Leader không thể mời thêm, hủy lời mời hoặc thay đổi đội hình.',
      startTime: pickDate(hackathon, ['registrationEnd', 'registration_end', 'registrationEndAt']),
      color: FPT.orange,
      gradient: `linear-gradient(135deg, ${FPT.orange}, ${FPT.orangeLight})`,
      customIcon: Zap,
    },
    {
      id: 'event-start',
      title: 'Khai mạc',
      summary: 'Công bố thông tin vận hành chính.',
      description: 'Coordinator công bố thông tin thi đấu, chủ đề, phân luồng đội và các mốc quan trọng cho vòng thi.',
      startTime: pickDate(hackathon, ['eventStart', 'event_start', 'startDate', 'startsAt']),
      color: FPT.blue,
      gradient: `linear-gradient(135deg, ${FPT.blue}, ${FPT.blueLight})`,
      customIcon: Sparkles,
    },
    {
      id: 'submission-deadline',
      title: 'Hạn nộp bài',
      summary: 'Đội hoàn tất và nộp sản phẩm.',
      description: 'Đây là mốc cuối để đội hoàn thiện sản phẩm, kiểm tra nội dung nộp bài và chuẩn bị cho giai đoạn đánh giá.',
      startTime: pickDate(hackathon, ['submissionDeadline', 'submission_deadline']),
      color: '#EF4444',
      gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
      customIcon: Flag,
    },
    {
      id: 'event-end',
      title: 'Tổng kết',
      summary: 'Kết thúc mùa thi hiện tại.',
      description: 'Hackathon kết thúc và chuyển sang tổng kết, xác nhận kết quả, công bố giải thưởng hoặc lưu trữ dữ liệu.',
      startTime: pickDate(hackathon, ['eventEnd', 'event_end', 'endDate', 'endsAt']),
      color: FPT.green,
      gradient: `linear-gradient(135deg, ${FPT.green}, #2E8B57)`,
      customIcon: Trophy,
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

const STATUS_META = {
  done: { color: FPT.green, tagColor: 'success', icon: CheckCircle2, label: '✔ Đã qua' },
  active: { color: FPT.orange, tagColor: 'orange', icon: CircleDot, label: '🔥 Đang diễn ra' },
  preview: { color: FPT.blue, tagColor: 'blue', icon: Clock4, label: '⚡ Sắp tới' },
  locked: { color: '#64748B', tagColor: 'default', icon: LockKeyhole, label: '🔒 Chưa mở' },
};

const HackathonTimeline = ({ hackathon, selectedTeam }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const [selectedEvent, setSelectedEvent] = useState(null);
  const mappedEvents = useMemo(
    () => enrichTimelineEvents(buildTimelineEvents(hackathon)),
    [hackathon]
  );
  const focusedIndex = getFocusedIndex(mappedEvents);
  const focusedEvent = mappedEvents[focusedIndex];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      style={{
        borderRadius: 24,
        padding: 26,
        background: isDark
          ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.98) 100%)'
          : 'linear-gradient(145deg, #FFF8F0 0%, #FFFFFF 50%, #FFE8CC 100%)',
        border: `2px solid ${isDark ? 'rgba(255, 140, 66, 0.3)' : '#fed7aa'}`,
        boxShadow: isDark 
          ? '0 24px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(243, 112, 33, 0.15)' 
          : '0 20px 48px -10px rgba(243, 112, 33, 0.15), 0 8px 24px -6px rgba(0, 0, 0, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Ambient Lighting */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, background: `radial-gradient(circle, rgba(243, 112, 33, 0.2) 0%, transparent 70%)`, filter: 'blur(35px)', pointerEvents: 'none' }} />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              background: `linear-gradient(135deg, ${FPT.orange}, ${FPT.orangeLight})`,
              boxShadow: `0 4px 12px ${FPT.orange}35`,
            }}
          >
            <Calendar size={20} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 800, fontSize: 17, color: token.colorTextHeading }}>
              Lịch Trình Sự Kiện FPTU
            </Title>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
              {getHackathonName(hackathon, selectedTeam)}
            </Text>
          </div>
        </div>
        {focusedEvent && (
          <Tag color={STATUS_META[focusedEvent.status].tagColor} style={{ borderRadius: 8, padding: '4px 12px', fontWeight: 700, fontSize: 12, border: 0 }}>
            {STATUS_META[focusedEvent.status].label}: {focusedEvent.title}
          </Tag>
        )}
      </div>

      {mappedEvents.length === 0 ? (
        <Empty description="Chưa có lịch trình được công bố" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
      ) : (
        <>
          {/* Focused event callout (Enhanced Premium UI) */}
          {focusedEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 26,
                padding: '18px 22px',
                borderRadius: 18,
                background: isDark 
                  ? `linear-gradient(135deg, ${focusedEvent.color}15 0%, rgba(15, 23, 42, 0.4) 100%)` 
                  : `linear-gradient(135deg, #FFFFFF 0%, ${focusedEvent.color}08 100%)`,
                border: `1.5px solid ${isDark ? `${focusedEvent.color}40` : `${focusedEvent.color}30`}`,
                borderLeft: `5px solid ${focusedEvent.color}`,
                boxShadow: isDark 
                  ? `0 8px 24px ${focusedEvent.color}15, inset 0 2px 4px rgba(255,255,255,0.05)` 
                  : `0 8px 24px rgba(0,0,0,0.04), 0 4px 12px ${focusedEvent.color}10, inset 0 2px 8px #FFFFFF`,
              }}
            >
              {/* Event Icon Jewel */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  background: focusedEvent.gradient,
                  boxShadow: `0 6px 16px ${focusedEvent.color}40`,
                  flexShrink: 0,
                }}
              >
                {focusedEvent.customIcon && <focusedEvent.customIcon size={22} />}
              </div>

              {/* Event Details */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text type="secondary" style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2, color: focusedEvent.color }}>
                  Mốc hiện tại
                </Text>
                <Text strong style={{ display: 'block', fontSize: 16, color: token.colorTextHeading, fontWeight: 800 }}>
                  {focusedEvent.title}
                </Text>
                <Text style={{ display: 'block', color: token.colorTextSecondary, fontSize: 13, marginTop: 2, fontWeight: 500 }}>
                  {focusedEvent.summary}
                </Text>
              </div>

              {/* Event Time */}
              <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 16, borderLeft: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
                <Text type="secondary" style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Thời gian</Text>
                <Text strong style={{ color: focusedEvent.color, fontSize: 15, fontWeight: 800 }}>
                  {new Date(focusedEvent.startTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </div>
            </motion.div>
          )}

          {/* Timeline nodes */}
          <div style={{ overflowX: 'auto', padding: '10px 4px 16px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${mappedEvents.length}, minmax(170px, 1fr))`,
                minWidth: Math.max(mappedEvents.length * 180, 640),
                alignItems: 'start',
                position: 'relative',
              }}
            >
              {/* Track line */}
              <div style={{ position: 'absolute', left: 75, right: 75, top: 28, height: 3, borderRadius: 999, background: token.colorBorderSecondary }} />
              <div style={{ position: 'absolute', left: 75, top: 28, height: 3, width: focusedIndex <= 0 ? 0 : `calc((100% - 150px) * ${focusedIndex / Math.max(mappedEvents.length - 1, 1)})`, borderRadius: 999, background: `linear-gradient(90deg, ${FPT.orange}, ${FPT.blue})` }} />

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
        </>
      )}

      {/* Detail Modal */}
      <Modal
        open={Boolean(selectedEvent)}
        onCancel={() => setSelectedEvent(null)}
        footer={null}
        centered
        title={
          selectedEvent && (
            <Space align="center" size={10}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: selectedEvent.gradient, display: 'grid', placeItems: 'center', color: '#fff' }}>
                {selectedEvent.customIcon && <selectedEvent.customIcon size={16} />}
              </div>
              <span style={{ fontSize: 17, fontWeight: 800 }}>{selectedEvent.title}</span>
            </Space>
          )
        }
        styles={{ body: { paddingTop: 16 } }}
      >
        {selectedEvent && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={STATUS_META[selectedEvent.status].tagColor} style={{ borderRadius: 6, fontWeight: 700, border: 0 }}>
                {STATUS_META[selectedEvent.status].label}
              </Tag>
              <Text type="secondary" style={{ fontSize: 13 }}>
                🕒 {new Date(selectedEvent.startTime).toLocaleString('vi-VN')}
              </Text>
            </Space>
            <div style={{ padding: 14, borderRadius: 12, background: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}`, marginBottom: 14 }}>
              <Text strong style={{ fontSize: 14 }}>{selectedEvent.summary}</Text>
            </div>
            <Paragraph style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {selectedEvent.description}
            </Paragraph>
          </div>
        )}
      </Modal>
    </motion.section>
  );
};

/* ── Single timeline node ── */
const TimelineNode = ({ event, index, isFocused, isPassed, token, onClick }) => {
  const meta = STATUS_META[event.status];
  const Icon = event.customIcon || meta.icon;
  const nodeColor = isPassed ? FPT.green : isFocused ? event.color : token.colorTextQuaternary;
  const isClickable = event.canView;

  return (
    <Tooltip
      title={isClickable ? 'Bấm để xem chi tiết' : 'Sẽ mở khi sự kiện sắp tới'}
      placement="top"
    >
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 * index }}
        whileHover={isClickable ? { y: -4, scale: 1.02 } : {}}
        onClick={onClick}
        style={{
          appearance: 'none',
          border: 0,
          background: 'transparent',
          cursor: isClickable ? 'pointer' : 'default',
          padding: '0 8px',
          textAlign: 'center',
          color: token.colorText,
          position: 'relative',
          zIndex: 1,
          opacity: isClickable || isPassed ? 1 : 0.55,
          width: '100%',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            margin: '0 auto 12px',
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            color: isFocused || isPassed ? '#fff' : nodeColor,
            background: isFocused || isPassed ? event.gradient : token.colorBgContainer,
            border: isFocused || isPassed ? 'none' : `2px solid ${nodeColor}`,
            boxShadow: isFocused ? `0 6px 16px ${event.color}40` : isPassed ? `0 4px 10px ${FPT.green}25` : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <Icon size={20} />
        </div>
        <Text strong ellipsis style={{ display: 'block', maxWidth: 140, margin: '0 auto', fontSize: 13, color: isFocused ? event.color : token.colorTextHeading }}>
          {event.title}
        </Text>
        <Text type="secondary" style={{ display: 'block', marginTop: 2, fontSize: 11, fontWeight: 500 }}>
          {new Date(event.startTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Tag color={meta.tagColor} style={{ marginTop: 6, marginInlineEnd: 0, borderRadius: 6, fontWeight: 700, fontSize: 10, border: 0 }}>
          {meta.label}
        </Tag>
      </motion.button>
    </Tooltip>
  );
};

export default HackathonTimeline;
