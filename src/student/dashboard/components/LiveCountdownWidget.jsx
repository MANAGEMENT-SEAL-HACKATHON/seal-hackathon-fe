import { useEffect, useMemo, useState } from 'react';
import { Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { CalendarDays, TimerReset } from 'lucide-react';

const { Text, Title } = Typography;

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

const getTimeLeft = (targetDate) => {
  if (!targetDate) return null;
  const distance = new Date(targetDate).getTime() - Date.now();
  if (Number.isNaN(distance) || distance <= 0) return { ended: true, days: 0, hours: 0, minutes: 0 };

  return {
    ended: false,
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
  };
};

const LiveCountdownWidget = ({ hackathon, selectedTeam }) => {
  const { token } = theme.useToken();
  const [nowTick, setNowTick] = useState(0);
  const targetDate = getTargetDate(hackathon);
  const timeLeft = useMemo(() => getTimeLeft(targetDate, nowTick), [targetDate, nowTick]);
  const isLight = token.colorBgContainer === '#ffffff';

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.16 }}
      style={{
        minHeight: 306,
        borderRadius: 8,
        padding: 22,
        color: token.colorText,
        background: isLight ? 'linear-gradient(160deg, #001529 0%, #092b52 54%, #0f766e 100%)' : token.colorBgContainer,
        border: isLight ? '1px solid rgba(255,255,255,0.14)' : `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: 'linear-gradient(120deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          opacity: isLight ? 1 : 0.18,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span
            style={{
              width: 42,
              height: 42,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 8,
              color: '#13c2c2',
              background: 'rgba(19,194,194,0.16)',
            }}
          >
            <TimerReset size={22} />
          </span>
          <div>
            <Title level={4} style={{ margin: 0, color: isLight ? '#fff' : token.colorText, fontWeight: 800 }}>
              Mốc thời gian
            </Title>
            <Text style={{ color: isLight ? 'rgba(255,255,255,0.72)' : token.colorTextSecondary }}>
              {getHackathonName(hackathon, selectedTeam)}
            </Text>
          </div>
        </div>

        {!timeLeft ? (
          <EmptyCountdown dark={isLight} />
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
              <TimeBox label="Ngày" value={timeLeft.days} />
              <TimeBox label="Giờ" value={timeLeft.hours} />
              <TimeBox label="Phút" value={timeLeft.minutes} accent />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                borderRadius: 8,
                background: isLight ? 'rgba(255,255,255,0.1)' : token.colorFillTertiary,
              }}
            >
              <CalendarDays size={18} color="#13c2c2" />
              <Text style={{ color: isLight ? 'rgba(255,255,255,0.82)' : token.colorTextSecondary }}>
                {timeLeft.ended ? 'Mốc này đã kết thúc' : `Đích đến: ${new Date(targetDate).toLocaleString('vi-VN')}`}
              </Text>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
};

const TimeBox = ({ label, value, accent }) => (
  <div
    style={{
      borderRadius: 8,
      padding: '16px 10px',
      textAlign: 'center',
      background: accent ? 'rgba(19,194,194,0.18)' : 'rgba(255,255,255,0.11)',
      border: '1px solid rgba(255,255,255,0.14)',
    }}
  >
    <Text style={{ display: 'block', color: '#fff', fontSize: 30, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
      {String(value || 0).padStart(2, '0')}
    </Text>
    <Text style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, textTransform: 'uppercase', fontWeight: 700 }}>
      {label}
    </Text>
  </div>
);

const EmptyCountdown = ({ dark }) => (
  <div style={{ minHeight: 190, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
    <Text style={{ color: dark ? 'rgba(255,255,255,0.72)' : undefined }}>
      Chưa có mốc thời gian để hiển thị.
    </Text>
  </div>
);

export default LiveCountdownWidget;
