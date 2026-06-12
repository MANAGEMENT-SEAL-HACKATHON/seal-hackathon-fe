import React, { useState, useEffect } from 'react';
import { Card, Typography, Progress } from 'antd';
import { Timer, Flag, PlayCircle } from 'lucide-react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

const { Title, Text } = Typography;

const LiveCodingMonitor = ({ activeRound }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [chipCountdown, setChipCountdown] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('WAITING');

  useEffect(() => {
    if (!activeRound) return;

    const startTime = dayjs(activeRound.exam_at);
    const endTime = dayjs(activeRound.submission_deadline);
    const totalDuration = endTime.diff(startTime);

    const timer = setInterval(() => {
      const now = dayjs();

      if (now.isBefore(startTime)) {
        setStatus('WAITING');
        setProgress(0);

        // Đếm ngược đến khi bắt đầu — cho cả box lớn lẫn chip
        const diffToStart = startTime.diff(now);
        const d = dayjs.duration(diffToStart);
        const h = Math.floor(d.asHours());
        const m = d.minutes();
        const s = d.seconds();

        setTimeLeft({ hours: h, minutes: m, seconds: s });

        // Chip hiển thị gọn: "2g 15p" hoặc "45p 30s" nếu < 1 giờ
        if (h > 0) {
          setChipCountdown(`${h}g ${String(m).padStart(2, '0')}p`);
        } else {
          setChipCountdown(`${m}p ${String(s).padStart(2, '0')}s`);
        }

      } else if (now.isAfter(endTime)) {
        setStatus('ENDED');
        setProgress(100);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setChipCountdown('');
        clearInterval(timer);
      } else {
        setStatus('ONGOING');
        setChipCountdown('');

        const diff = endTime.diff(now);
        const d = dayjs.duration(diff);
        setTimeLeft({
          hours: Math.floor(d.asHours()),
          minutes: d.minutes(),
          seconds: d.seconds(),
        });
        const elapsed = now.diff(startTime);
        setProgress(Math.min((elapsed / totalDuration) * 100, 100));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRound]);

  const renderStatusChip = () => {
    if (!activeRound) return null;
    const hours = activeRound.coding_duration_hours || 0;

    const base = {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, marginBottom: 14,
    };

    switch (status) {
      case 'WAITING':
        return (
          <span style={{ ...base, background: '#e6f4ff', color: '#0958d9', border: '1px solid #91caff' }}>
            <PlayCircle size={12} />
            {/* Hiện đếm ngược thực đến khi bắt đầu */}
            Bắt đầu sau {chipCountdown}
          </span>
        );
      case 'ONGOING':
        return (
          <span style={{ ...base, background: '#e6f4ff', color: '#0958d9', border: '1px solid #91caff' }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#1677ff', flexShrink: 0,
              animation: 'livePulse 2s infinite',
            }} />
            Đang thi — {hours} tiếng
          </span>
        );
      case 'ENDED':
        return (
          <span style={{ ...base, background: '#fff2f0', color: '#cf1322', border: '1px solid #ffccc7' }}>
            <Flag size={12} />
            Đã kết thúc
          </span>
        );
      default:
        return null;
    }
  };

  const countdownLabel = {
    WAITING: 'Bắt đầu sau',
    ONGOING: 'Thời gian còn lại',
    ENDED:   'Đã kết thúc',
  }[status];

  const boxStyle = {
    WAITING: { bg: '#e6f4ff', border: '#91caff', labelColor: '#0958d9', digitColor: '#1677ff', sepColor: '#91caff' },
    ONGOING: { bg: '#e6f4ff', border: '#91caff', labelColor: '#0958d9', digitColor: '#1677ff', sepColor: '#91caff' },
    ENDED:   { bg: '#fff2f0', border: '#ffccc7', labelColor: '#cf1322', digitColor: '#ff4d4f', sepColor: '#ffccc7' },
  }[status];

  if (!activeRound) return null;

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <Card
        style={{
          marginBottom: 24,
          borderRadius: 16,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Progress bar xanh trên cùng */}
        <div style={{ height: 3, background: '#e6f4ff' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#1677ff',
            borderRadius: '0 2px 2px 0',
            transition: 'width 1s linear',
          }} />
        </div>

        {/* Layout 1/3 | divider | 2/3 */}
        <div style={{
          padding: '28px 32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1px 2fr',
          alignItems: 'center',
        }}>

          {/* === CỘT TRÁI 1/3 === */}
          <div style={{ paddingRight: 32 }}>
            {renderStatusChip()}

            <div style={{
              fontSize: 10, color: '#1677ff', fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5,
            }}>
              Màn hình phát đề bài (Live Coding)
            </div>

            <Title
              level={3}
              style={{ margin: '0 0 20px 0', color: '#1f2937', fontWeight: 800, lineHeight: 1.2 }}
            >
              {activeRound.name}
            </Title>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <Text style={{
                  fontSize: 10, color: '#6b7280', fontWeight: 700,
                  letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 2,
                }}>
                  Bắt đầu
                </Text>
                <Text strong style={{ fontSize: 13, color: '#374151' }}>
                  {dayjs(activeRound.exam_at).format('HH:mm · DD/MM/YYYY')}
                </Text>
              </div>
              <div>
                <Text style={{
                  fontSize: 10, color: '#6b7280', fontWeight: 700,
                  letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 2,
                }}>
                  Hạn nộp bài
                </Text>
                <Text strong style={{ fontSize: 13, color: '#374151' }}>
                  {dayjs(activeRound.submission_deadline).format('HH:mm · DD/MM/YYYY')}
                </Text>
              </div>
            </div>
          </div>

          {/* === DIVIDER DỌC === */}
          <div style={{ height: 110, background: '#e2e8f0', margin: '0 32px' }} />

          {/* === CỘT PHẢI 2/3: Countdown có nền xanh === */}
          <div style={{
            background: boxStyle.bg,
            border: `1px solid ${boxStyle.border}`,
            borderRadius: 14,
            padding: '20px 28px',
          }}>
            <div style={{
              fontSize: 10, color: boxStyle.labelColor, fontWeight: 700,
              letterSpacing: 1.4, textTransform: 'uppercase',
              marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Timer size={13} color={boxStyle.labelColor} />
              {countdownLabel}
            </div>

            {/* Digits */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-evenly' }}>
              {[
                { value: timeLeft.hours,   label: 'GIỜ'  },
                { value: timeLeft.minutes, label: 'PHÚT' },
                { value: timeLeft.seconds, label: 'GIÂY' },
              ].reduce((acc, item, i) => {
                if (i > 0) {
                  acc.push(
                    <div key={`sep-${i}`} style={{
                      fontSize: 52, color: boxStyle.sepColor,
                      fontWeight: 800, marginBottom: 22, padding: '0 4px',
                      fontFamily: 'ui-monospace, monospace',
                    }}>:</div>
                  );
                }
                acc.push(
                  <div key={item.label} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{
                      fontSize: 72, fontWeight: 800,
                      color: boxStyle.digitColor, lineHeight: 1,
                      letterSpacing: -3,
                      fontFamily: 'ui-monospace, monospace',
                    }}>
                      {String(item.value).padStart(2, '0')}
                    </div>
                    <div style={{
                      fontSize: 11, color: boxStyle.labelColor,
                      fontWeight: 600, marginTop: 8, letterSpacing: 2,
                    }}>
                      {item.label}
                    </div>
                  </div>
                );
                return acc;
              }, [])}
            </div>

            {/* Progress bar — chỉ hiện khi ONGOING */}
            {status === 'ONGOING' && (
              <Progress
                percent={Math.round(progress)}
                showInfo={false}
                strokeColor="#1677ff"
                trailColor="#bae0ff"
                style={{ marginTop: 18, marginBottom: 0 }}
              />
            )}
          </div>

        </div>
      </Card>
    </>
  );
};

export default LiveCodingMonitor;