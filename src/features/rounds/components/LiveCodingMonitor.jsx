import { 
  useState, 
  useEffect 
} from 'react';
import { 
  Card, 
  Typography, 
  Progress 
} from 'antd';
import { 
  Timer, 
  PlayCircle,
  Lock,
  CheckCircle,
  Calendar
} from 'lucide-react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

const { 
  Title, 
  Text 
} = Typography;

const LiveCodingMonitor = ({ activeRound }) => {
  // ==========================================
  // 1. KHỞI TẠO STATE QUẢN LÝ THỜI GIAN VÀ TRẠNG THÁI
  // ==========================================
  const [timeLeft, setTimeLeft] = useState({ 
    hours: 0, 
    minutes: 0, 
    seconds: 0 
  });
  
  const [chipCountdown, setChipCountdown] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('WAITING');

  // ==========================================
  // 2. LOGIC TÍNH TOÁN ĐẾM NGƯỢC (CẬP NHẬT MỖI GIÂY)
  // ==========================================
  const examAt = activeRound?.exam_at ?? activeRound?.examAt;
  const submissionDeadline =
    activeRound?.submission_deadline ?? activeRound?.submissionDeadline;
  const scoringLocked =
    activeRound?.scoring_locked === true
    || activeRound?.scoringLocked === true
    || activeRound?.status === 'SCORING_LOCKED'
    || activeRound?.status === 'COMPLETED';
  const closedEarlyAt =
    activeRound?.submission_closed_early_at ?? activeRound?.submissionClosedEarlyAt;

  useEffect(() => {
    if (!activeRound) return undefined;

    // KIỂM TRA: Vòng thi đã khóa chấm hoặc hoàn thành chưa?
    if (scoringLocked) {
      setStatus('LOCKED_OR_COMPLETED');
      setProgress(100);
      setTimeLeft({
        hours: 0,
        minutes: 0,
        seconds: 0,
      });
      setChipCountdown('');
      return undefined;
    }

    const startTime = dayjs(examAt);
    const endTime = dayjs(submissionDeadline);
    const totalDuration = endTime.diff(startTime);

    const tick = () => {
      const now = dayjs();

      if (!startTime.isValid() || now.isBefore(startTime)) {
        // TRẠNG THÁI 1: CHƯA TỚI GIỜ THI
        setStatus('WAITING');
        setProgress(0);

        const diffToStart = startTime.isValid() ? startTime.diff(now) : 0;
        const d = dayjs.duration(Math.max(0, diffToStart));
        const h = Math.floor(d.asHours());
        const m = d.minutes();
        const s = d.seconds();

        setTimeLeft({
          hours: h,
          minutes: m,
          seconds: s,
        });

        if (h > 0) {
          setChipCountdown(`${h}g ${String(m).padStart(2, '0')}p`);
        } else {
          setChipCountdown(`${m}p ${String(s).padStart(2, '0')}s`);
        }
      } else if (!endTime.isValid() || now.isAfter(endTime) || closedEarlyAt) {
        // TRẠNG THÁI 2: ĐÃ HẾT GIỜ NỘP BÀI NHƯNG CHƯA KHÓA CHẤM
        setStatus('ENDED');
        setProgress(100);
        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
        });
        setChipCountdown('');
      } else {
        // TRẠNG THÁI 3: ĐANG TRONG THỜI GIAN THI VÀ NỘP BÀI
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
        setProgress(
          totalDuration > 0 ? Math.min((elapsed / totalDuration) * 100, 100) : 0,
        );
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeRound, examAt, submissionDeadline, scoringLocked, closedEarlyAt]);

  // Nếu chưa có activeRound, return null để chống lỗi trắng trang (bảo mật 2 lớp)
  if (!activeRound) return null;

  // ==========================================
  // 3. RENDER TRẠNG THÁI CHIP Ở CỘT TRÁI
  // ==========================================
  const renderStatusChip = () => {
    const hours = activeRound?.coding_duration_hours || 0;

    const base = {
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: 6,
      padding: '4px 12px', 
      borderRadius: 20,
      fontSize: 11, 
      fontWeight: 700, 
      marginBottom: 14,
    };

    switch (status) {
      case 'WAITING':
        return (
          <span 
            style={{ 
              ...base, 
              background: '#f5f3ff', 
              color: '#6366f1', 
            }}
          >
            <PlayCircle size={12} />
            Bắt đầu sau {chipCountdown}
          </span>
        );
        
      case 'ONGOING':
        return (
          <span 
            style={{ 
              ...base, 
              background: '#f5f3ff', 
              color: '#6366f1', 
            }}
          >
            <span 
              style={{
                width: 7, 
                height: 7, 
                borderRadius: '50%',
                background: '#6366f1', 
                flexShrink: 0,
                animation: 'livePulse 2s infinite',
              }} 
            />
            {activeRound?.submission_closed_early_at
              ? 'Đã kết thúc thi sớm — chuyển chấm điểm'
              : `Đang thi — ${hours} tiếng`}
          </span>
        );
        
      case 'ENDED':
        return (
          <span 
            style={{ 
              ...base, 
              background: '#f0fdf4', 
              color: '#16a34a', 
            }}
          >
            <CheckCircle size={12} />
            {activeRound?.submission_closed_early_at
              ? 'Đã kết thúc thi sớm'
              : 'Đã hết hạn nộp bài'}
          </span>
        );
        
      case 'LOCKED_OR_COMPLETED':
        return (
          <span 
            style={{ 
              ...base, 
              background: '#f0fdf4', 
              color: '#16a34a', 
            }}
          >
            <CheckCircle size={12} />
            Vòng thi đã hoàn thành
          </span>
        );
        
      default:
        return null;
    }
  };

  // ==========================================
  // 4. CẤU HÌNH GIAO DIỆN (MÀU SẮC & LABEL) THEO TRẠNG THÁI
  // ==========================================
  const countdownLabel = {
    WAITING: 'Bắt đầu sau',
    ONGOING: 'Thời gian còn lại',
    ENDED:   'Quy trình hoàn tất',
    LOCKED_OR_COMPLETED: 'Quy trình hoàn tất',
  }[status];

  // ==========================================
  // 5. RENDER GIAO DIỆN CHÍNH
  // ==========================================
  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
      `}</style>

      <Card
        style={{
          marginBottom: 24,
          borderRadius: 20,
          background: 'url("/banner-hackathon.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid rgba(167, 139, 250, 0.35)',
          boxShadow: '0 8px 30px rgba(99, 102, 241, 0.15)',
          overflow: 'hidden',
        }}
        styles={{ 
          body: { 
            padding: 0 
          } 
        }}
      >
        {/* Layout 1/3 | 2/3 */}
        <div 
          style={{
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px'
          }}
        >
          {/* === CỘT TRÁI 1/3 === */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
            <div>{renderStatusChip()}</div>

            <div 
              style={{
                fontSize: 10, 
                color: '#e9d5ff', 
                fontWeight: 800,
                letterSpacing: 1.5, 
                textTransform: 'uppercase', 
                marginBottom: 6,
              }}
            >
              {status === 'WAITING'
                ? 'MÀN HÌNH CHỜ SETUP (WAITING)'
                : status === 'ONGOING' &&
                    !(activeRound?.problem_released_at || activeRound?.problemReleasedAt)
                  ? 'MÀN HÌNH PHÁT ĐỀ BÀI (LIVE CODING)'
                  : status === 'ONGOING'
                    ? 'MÀN HÌNH LIVE CODING'
                    : status === 'ENDED'
                      ? 'MÀN HÌNH HẾT HẠN NỘP'
                      : 'MÀN HÌNH VÒNG THI'}
            </div>

            <Title
              level={2}
              style={{ 
                margin: '0 0 16px 0', 
                fontWeight: 900, 
                color: '#ffffff',
                fontSize: '28px'
              }}
            >
              {activeRound?.name}
            </Title>

            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 12 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} style={{ color: '#cbd5e1' }} />
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 700, marginRight: 6 }}>BẮT ĐẦU</span>
                  <span style={{ color: '#ffffff', fontWeight: 800 }}>
                    {dayjs(examAt).format('HH:mm - DD/MM/YYYY')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} style={{ color: '#cbd5e1' }} />
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 700, marginRight: 6 }}>HẠN NỘP BÀI</span>
                  <span style={{ color: '#ffffff', fontWeight: 800 }}>
                    {dayjs(submissionDeadline).format('HH:mm - DD/MM/YYYY')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* === CỘT PHẢI 2/3: Nền cảnh báo và Thông tin === */}
          <div 
            style={{
              flex: '1.2 1 400px',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              borderRadius: 16,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <div 
              style={{
                fontSize: 11, 
                color: '#6366f1', 
                fontWeight: 800,
                letterSpacing: 1.4, 
                textTransform: 'uppercase',
                marginBottom: 16, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
              }}
            >
              <Timer size={14} style={{ color: '#6366f1' }} />
              {countdownLabel}
            </div>

            {/* KHI ĐÃ HẾT HẠN HOẶC KHÓA ĐIỂM: Hiện chữ "VÒNG THI ĐÃ HOÀN THÀNH" */}
            {(status === 'ENDED' || status === 'LOCKED_OR_COMPLETED') ? (
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '20px 0'
                }}
              >
                <div 
                  style={{
                    fontSize: 24, 
                    fontWeight: 900,
                    color: '#6366f1', 
                    lineHeight: 1.2,
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: 1
                  }}
                >
                  VÒNG THI ĐÃ HOÀN THÀNH
                </div>
                <div 
                  style={{
                    fontSize: 12, 
                    color: '#64748b',
                    fontWeight: 600, 
                    marginTop: 8,
                    textAlign: 'center'
                  }}
                >
                  {status === 'LOCKED_OR_COMPLETED' 
                    ? 'Hệ thống đã khóa chấm điểm. Vòng thi kết thúc thành công.' 
                    : 'Đã kết thúc thời gian làm bài của Vòng thi.'}
                </div>
              </div>
            ) : (
              /* NẾU ĐANG CHỜ HOẶC ĐANG THI: HIỂN THỊ CÁC CON SỐ ĐẾM NGƯỢC CARD TRẮNG */
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: 12,
                  marginBottom: 16
                }}
              >
                {[
                  { value: timeLeft.hours,   label: 'GIỜ'   },
                  { value: timeLeft.minutes, label: 'PHÚT' },
                  { value: timeLeft.seconds, label: 'GIÂY' },
                ].reduce((acc, item, i) => {
                  if (i > 0) {
                    acc.push(
                      <div 
                        key={`sep-${i}`} 
                        style={{
                          fontSize: 32, 
                          color: '#6366f1',
                          fontWeight: 800, 
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        :
                      </div>
                    );
                  }
                  acc.push(
                    <div 
                      key={item.label} 
                      style={{ 
                        background: '#ffffff',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        borderRadius: 12,
                        padding: '10px 16px',
                        minWidth: '76px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
                      }}
                    >
                      <div 
                        style={{
                          fontSize: 40, 
                          fontWeight: 900,
                          color: '#6366f1', 
                          lineHeight: 1.1,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {String(item.value).padStart(2, '0')}
                      </div>
                      <div 
                        style={{
                          fontSize: 9, 
                          color: '#64748b',
                          fontWeight: 800, 
                          marginTop: 6, 
                          letterSpacing: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Timer size={10} style={{ color: '#64748b' }} />
                        {item.label}
                      </div>
                    </div>
                  );
                  return acc;
                }, [])}
              </div>
            )}

            {/* Progress bar — chỉ hiện khi ONGOING hoặc WAITING */}
            {(status === 'ONGOING' || status === 'WAITING') && (
              <Progress
                percent={Math.round(progress)}
                showInfo={false}
                strokeColor="#6366f1"
                trailColor="#e0e7ff"
                strokeWidth={5}
                style={{ 
                  marginTop: 8, 
                  marginBottom: 0 
                }}
              />
            )}
          </div>

        </div>
      </Card>
    </>
  );
};

export default LiveCodingMonitor;