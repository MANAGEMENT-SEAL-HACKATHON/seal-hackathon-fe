import { useEffect, useMemo, useState } from 'react';
import { Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { CalendarDays, TimerReset, Flame } from 'lucide-react';

const { Text, Title } = Typography;

/* OFFICIAL FPT LOGO COLORS */
const FPT = {
  blue: '#00529C',       // Chữ F - Cobalt/Royal Blue
  blueDark: '#003366',   // Deep Blue for gradients
  orange: '#F37021',     // Chữ P - FPT Vibrant Orange
  orangeLight: '#FF8C42',// Warm Orange
};

const getHackathonName = (hackathon, selectedTeam) =>
  hackathon?.name || hackathon?.hackathonName || selectedTeam?.hackathonName || 'Hackathon hiện tại';

const getTargetDate = (data) =>
  data?.submissionDeadline ||
  data?.submission_deadline ||
  data?.registrationEnd ||
  data?.registration_end ||
  data?.eventEnd ||
  data?.event_end ||
  data?.endDate;

const getTargetLabel = (data) => {
  if (data?.submissionDeadline || data?.submission_deadline) return 'Hạn nộp bài thi';
  if (data?.registrationEnd || data?.registration_end) return 'Đóng đăng ký';
  return 'Kết thúc sự kiện';
};

const getTimeLeft = (targetDate) => {
  if (!targetDate) return null;
  const distance = new Date(targetDate).getTime() - Date.now();
  if (Number.isNaN(distance) || distance <= 0) return { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    ended: false,
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
};

const LiveCountdownWidget = ({ hackathon, selectedTeam }) => {
  const { token } = theme.useToken();
  const [nowTick, setNowTick] = useState(0);
  const targetDate = getTargetDate(hackathon);
  const targetLabel = getTargetLabel(hackathon);
  const timeLeft = useMemo(() => getTimeLeft(targetDate, nowTick), [targetDate, nowTick]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isUrgent = timeLeft && !timeLeft.ended && timeLeft.days <= 1;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      style={{
        minHeight: 300,
        borderRadius: 24,
        padding: 26,
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${FPT.blueDark} 0%, ${FPT.blue} 100%)`,
        border: isUrgent
          ? `1px solid ${FPT.orange}`
          : '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: isUrgent
          ? `0 12px 32px rgba(243, 112, 33, 0.2)`
          : '0 8px 24px rgba(0, 82, 156, 0.15)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Decorative lighting */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          background: isUrgent
            ? `radial-gradient(circle, rgba(243, 112, 33, 0.4) 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(30, 115, 190, 0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.04) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 14,
              color: '#fff',
              background: isUrgent
                ? `linear-gradient(135deg, ${FPT.orange} 0%, #DC2626 100%)`
                : `linear-gradient(135deg, ${FPT.orange} 0%, ${FPT.orangeLight} 100%)`,
              boxShadow: `0 4px 14px rgba(243, 112, 33, 0.4)`,
            }}
          >
            {isUrgent ? <Flame size={20} /> : <TimerReset size={20} />}
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 17 }}>
              {isUrgent ? '⚡ Đếm Ngược Khẩn!' : 'Đếm Ngược FPTU'}
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: 12, fontWeight: 500 }}>
              {getHackathonName(hackathon, selectedTeam)}
            </Text>
          </div>
        </div>

        {/* Countdown */}
        {!timeLeft ? (
          <EmptyCountdown />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Target Label */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {timeLeft.ended ? 'Mốc thời gian đã qua' : targetLabel}
              </Text>
            </div>

            {/* Time Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
              <TimeBox label="Ngày" value={timeLeft.days} isUrgent={isUrgent} />
              <TimeBox label="Giờ" value={timeLeft.hours} isUrgent={isUrgent} />
              <TimeBox label="Phút" value={timeLeft.minutes} isUrgent={isUrgent} />
              <TimeBox label="Giây" value={timeLeft.seconds} isUrgent={isUrgent} accent />
            </div>

            {/* Target date info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <CalendarDays size={15} color={FPT.orangeLight} />
              <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 12 }}>
                {timeLeft.ended
                  ? 'Giai đoạn này đã kết thúc'
                  : `Đích đến: ${new Date(targetDate).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
              </Text>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
};

const TimeBox = ({ label, value, accent, isUrgent }) => {
  return (
    <motion.div
      key={value}
      style={{
        borderRadius: 14,
        padding: '14px 6px',
        textAlign: 'center',
        background: accent
          ? `rgba(243, 112, 33, 0.25)`
          : 'rgba(255, 255, 255, 0.08)',
        border: `1px solid ${accent ? 'rgba(243, 112, 33, 0.5)' : 'rgba(255, 255, 255, 0.15)'}`,
      }}
    >
      <Text
        style={{
          display: 'block',
          color: accent ? FPT.orangeLight : '#fff',
          fontSize: 28,
          fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {String(value || 0).padStart(2, '0')}
      </Text>
      <Text
        style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 10,
          textTransform: 'uppercase',
          fontWeight: 700,
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </Text>
    </motion.div>
  );
};

const EmptyCountdown = () => (
  <div style={{ minHeight: 180, display: 'grid', placeItems: 'center', textAlign: 'center', flex: 1 }}>
    <div>
      <div style={{ width: 50, height: 50, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.08)', margin: '0 auto 12px' }}>
        <TimerReset size={22} color="rgba(255,255,255,0.5)" />
      </div>
      <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 }}>
        Chưa có mốc thời gian sắp tới để hiển thị.
      </Text>
    </div>
  </div>
);

export default LiveCountdownWidget;
