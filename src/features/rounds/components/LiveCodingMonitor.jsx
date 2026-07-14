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
  CheckCircle // ĐÃ FIX LỖI CRASH Ở ĐÂY: Dùng đúng CheckCircle của lucide-react
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
  useEffect(() => {
    if (!activeRound) return;

    // KIỂM TRA: Vòng thi đã khóa chấm hoặc hoàn thành chưa?
    const isLockedOrCompleted = 
      activeRound?.scoring_locked === true
      || activeRound?.scoringLocked === true
      || activeRound?.status === 'SCORING_LOCKED' 
      || activeRound?.status === 'COMPLETED';

    // NẾU ĐÃ KHÓA / HOÀN THÀNH: Gán trạng thái và thoát luôn, không đếm ngược nữa
    if (isLockedOrCompleted) {
      setStatus('LOCKED_OR_COMPLETED');
      setProgress(100);
      setTimeLeft({ 
        hours: 0, 
        minutes: 0, 
        seconds: 0 
      });
      setChipCountdown('');
      return;
    }

    const startTime = dayjs(activeRound.exam_at);
    const endTime = dayjs(activeRound.submission_deadline);
    const totalDuration = endTime.diff(startTime);

    const timer = setInterval(() => {
      const now = dayjs();

      if (now.isBefore(startTime)) {
        // TRẠNG THÁI 1: CHƯA TỚI GIỜ THI
        setStatus('WAITING');
        setProgress(0);

        const diffToStart = startTime.diff(now);
        const d = dayjs.duration(diffToStart);
        const h = Math.floor(d.asHours());
        const m = d.minutes();
        const s = d.seconds();

        setTimeLeft({ 
          hours: h, 
          minutes: m, 
          seconds: s 
        });

        if (h > 0) {
          setChipCountdown(`${h}g ${String(m).padStart(2, '0')}p`);
        } else {
          setChipCountdown(`${m}p ${String(s).padStart(2, '0')}s`);
        }

      } else if (now.isAfter(endTime)) {
        // TRẠNG THÁI 2: ĐÃ HẾT GIỜ NỘP BÀI NHƯNG CHƯA KHÓA CHẤM
        setStatus('ENDED');
        setProgress(100);
        setTimeLeft({ 
          hours: 0, 
          minutes: 0, 
          seconds: 0 
        });
        setChipCountdown('');
        clearInterval(timer);
        
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
        setProgress(Math.min((elapsed / totalDuration) * 100, 100));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRound]);

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
      fontSize: 12, 
      fontWeight: 600, 
      marginBottom: 14,
    };

    switch (status) {
      case 'WAITING':
        return (
          <span 
            style={{ 
              ...base, 
              background: 'var(--ant-color-info-bg)', 
              color: 'var(--ant-color-info-text)', 
              border: '1px solid var(--ant-color-info-border)' 
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
              background: 'var(--ant-color-info-bg)', 
              color: 'var(--ant-color-info-text)', 
              border: '1px solid var(--ant-color-info-border)' 
            }}
          >
            <span 
              style={{
                width: 7, 
                height: 7, 
                borderRadius: '50%',
                background: 'var(--ant-color-primary)', 
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
              background: 'var(--ant-color-success-bg)', 
              color: 'var(--ant-color-success-text)', 
              border: '1px solid var(--ant-color-success-border)' 
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
              background: 'var(--ant-color-success-bg)', 
              color: 'var(--ant-color-success-text)', 
              border: '1px solid var(--ant-color-success-border)' 
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

  const boxStyle = {
    WAITING: { 
      bg: 'var(--ant-color-info-bg)', 
      border: 'var(--ant-color-info-border)', 
      labelColor: 'var(--ant-color-info-text)', 
      digitColor: 'var(--ant-color-primary)', 
      sepColor: 'var(--ant-color-info-border)' 
    },
    ONGOING: { 
      bg: 'var(--ant-color-info-bg)', 
      border: 'var(--ant-color-info-border)', 
      labelColor: 'var(--ant-color-info-text)', 
      digitColor: 'var(--ant-color-primary)', 
      sepColor: 'var(--ant-color-info-border)' 
    },
    // Chuyển màu cảnh báo Hết hạn thành màu xanh Success (Hoàn thành)
    ENDED: { 
      bg: 'var(--ant-color-success-bg)', 
      border: 'var(--ant-color-success-border)', 
      labelColor: 'var(--ant-color-success-text)', 
      digitColor: 'var(--ant-color-success)', 
      sepColor: 'var(--ant-color-success-border)' 
    },
    LOCKED_OR_COMPLETED: { 
      bg: 'var(--ant-color-success-bg)', 
      border: 'var(--ant-color-success-border)', 
      labelColor: 'var(--ant-color-success-text)', 
      digitColor: 'var(--ant-color-success)', 
      sepColor: 'var(--ant-color-success-border)' 
    },
  }[status] || { 
      bg: '#fff', border: '#d9d9d9', labelColor: '#000', digitColor: '#000', sepColor: '#d9d9d9' 
  };

  // ==========================================
  // 5. RENDER GIAO DIỆN CHÍNH
  // ==========================================
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
          background: 'var(--ant-color-bg-container)',
          border: '1px solid var(--ant-color-border-secondary)',
          boxShadow: 'var(--ant-box-shadow-tertiary)',
          overflow: 'hidden',
        }}
        styles={{ 
          body: { 
            padding: 0 
          } 
        }}
      >
        {/* Progress bar xanh trên cùng */}
        <div 
          style={{ 
            height: 3, 
            background: (status === 'LOCKED_OR_COMPLETED' || status === 'ENDED') 
              ? 'var(--ant-color-success-bg)' 
              : 'var(--ant-color-primary-bg)' 
          }}
        >
          <div 
            style={{
              height: '100%',
              width: `${progress}%`,
              background: (status === 'LOCKED_OR_COMPLETED' || status === 'ENDED') 
                ? 'var(--ant-color-success)' 
                : 'var(--ant-color-primary)',
              borderRadius: '0 2px 2px 0',
              transition: 'width 1s linear',
            }} 
          />
        </div>

        {/* Layout 1/3 | divider | 2/3 */}
        <div 
          style={{
            padding: '28px 32px',
            display: 'grid',
            gridTemplateColumns: '1fr 1px 2fr',
            alignItems: 'center',
          }}
        >

          {/* === CỘT TRÁI 1/3 === */}
          <div 
            style={{ 
              paddingRight: 32 
            }}
          >
            {renderStatusChip()}

            <div 
              style={{
                fontSize: 10, 
                color: (status === 'LOCKED_OR_COMPLETED' || status === 'ENDED') 
                  ? 'var(--ant-color-success)' 
                  : 'var(--ant-color-primary)', 
                fontWeight: 700,
                letterSpacing: 1.5, 
                textTransform: 'uppercase', 
                marginBottom: 5,
              }}
            >
              Màn hình phát đề bài (Live Coding)
            </div>

            <Title
              style={{ 
                margin: '0 0 20px 0', 
                fontWeight: 800, 
                lineHeight: 1.2 
              }}
            >
              {activeRound?.name}
            </Title>

            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 10 
              }}
            >
              <div>
                <Text 
                  type="secondary" 
                  style={{
                    fontSize: 10, 
                    fontWeight: 700,
                    letterSpacing: 1, 
                    textTransform: 'uppercase', 
                    display: 'block', 
                    marginBottom: 2,
                  }}
                >
                  Bắt đầu
                </Text>
                <Text 
                  strong 
                  style={{ 
                    fontSize: 13 
                  }}
                >
                  {dayjs(activeRound?.exam_at).format('HH:mm · DD/MM/YYYY')}
                </Text>
              </div>
              <div>
                <Text 
                  type="secondary" 
                  style={{
                    fontSize: 10, 
                    fontWeight: 700,
                    letterSpacing: 1, 
                    textTransform: 'uppercase', 
                    display: 'block', 
                    marginBottom: 2,
                  }}
                >
                  Hạn nộp bài
                </Text>
                <Text 
                  strong 
                  style={{ 
                    fontSize: 13 
                  }}
                >
                  {dayjs(activeRound?.submission_deadline).format('HH:mm · DD/MM/YYYY')}
                </Text>
              </div>
            </div>
          </div>

          {/* === DIVIDER DỌC === */}
          <div 
            style={{ 
              height: 110, 
              background: 'var(--ant-color-border-secondary)', 
              margin: '0 32px' 
            }} 
          />

          {/* === CỘT PHẢI 2/3: Nền cảnh báo và Thông tin === */}
          <div 
            style={{
              background: boxStyle.bg,
              border: `1px solid ${boxStyle.border}`,
              borderRadius: 14,
              padding: '20px 28px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <div 
              style={{
                fontSize: 10, 
                color: boxStyle.labelColor, 
                fontWeight: 700,
                letterSpacing: 1.4, 
                textTransform: 'uppercase',
                marginBottom: 16, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 5,
              }}
            >
              {status === 'LOCKED_OR_COMPLETED' ? (
                <Lock size={13} color={boxStyle.labelColor} />
              ) : status === 'ENDED' ? (
                <CheckCircle size={13} color={boxStyle.labelColor} />
              ) : (
                <Timer size={13} color={boxStyle.labelColor} />
              )}
              {countdownLabel}
            </div>

            {/* KHI ĐÃ HẾT HẠN HOẶC KHÓA ĐIỂM: Ẩn đồng hồ và hiện chữ "VÒNG THI ĐÃ HOÀN THÀNH" */}
            {(status === 'ENDED' || status === 'LOCKED_OR_COMPLETED') ? (
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '10px 0'
                }}
              >
                <div 
                  style={{
                    fontSize: 28, 
                    fontWeight: 800,
                    color: boxStyle.digitColor, 
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
                    fontSize: 13, 
                    color: boxStyle.labelColor,
                    fontWeight: 500, 
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
              /* NẾU ĐANG CHỜ HOẶC ĐANG THI: HIỂN THỊ CÁC CON SỐ ĐẾM NGƯỢC */
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-end', 
                  justifyContent: 'space-evenly' 
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
                          fontSize: 52, 
                          color: boxStyle.sepColor,
                          fontWeight: 800, 
                          marginBottom: 22, 
                          padding: '0 4px',
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
                        textAlign: 'center', 
                        flex: 1 
                      }}
                    >
                      <div 
                        style={{
                          fontSize: 72, 
                          fontWeight: 800,
                          color: boxStyle.digitColor, 
                          lineHeight: 1,
                          letterSpacing: -3,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {String(item.value).padStart(2, '0')}
                      </div>
                      <div 
                        style={{
                          fontSize: 11, 
                          color: boxStyle.labelColor,
                          fontWeight: 600, 
                          marginTop: 8, 
                          letterSpacing: 2,
                        }}
                      >
                        {item.label}
                      </div>
                    </div>
                  );
                  return acc;
                }, [])}
              </div>
            )}

            {/* Progress bar — chỉ hiện khi ONGOING */}
            {status === 'ONGOING' && (
              <Progress
                percent={Math.round(progress)}
                showInfo={false}
                strokeColor="#1677ff"
                trailColor="#bae0ff"
                style={{ 
                  marginTop: 18, 
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