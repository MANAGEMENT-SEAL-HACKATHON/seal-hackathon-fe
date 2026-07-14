import { useMemo } from 'react';
import { Card, Typography, Button } from 'antd';
import dayjs from 'dayjs';
import { 
  Layers, 
  Columns, 
  Target, 
  Users, 
  Calendar, 
  Ticket, 
  ShieldCheck, 
  Trophy,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  X
} from 'lucide-react';

const { Text } = Typography;

const SETUP_STEPS = [
  { key: 'rounds', title: 'Vòng thi', tab: 'rounds', blockerMatch: (code) => code.includes('ROUND') },
  { key: 'tracks', title: 'Bảng đấu', tab: 'tracks', blockerMatch: () => false },
  { key: 'criteria', title: 'Tiêu chí', tab: 'criteria', blockerMatch: (code) => code.includes('CRITERIA') || code.includes('WEIGHT') },
  { key: 'people', title: 'Nhân sự', tab: 'people', blockerMatch: (code) => code.includes('PERSONNEL') || code.includes('JUDGE') || code.includes('MENTOR') },
  { key: 'events', title: 'Lịch trình', tab: 'events', blockerMatch: (code) => code.includes('SCHEDULE') || code.includes('EVENT') },
  { key: 'lottery', title: 'Bốc thăm', tab: 'lottery', blockerMatch: () => false },
  { key: 'review', title: 'Kiểm tra', tab: 'review', blockerMatch: () => false },
  { key: 'analytics', title: 'Công bố & Trao giải', tab: 'analytics', blockerMatch: () => false },
];

function hasBlockerForStep(blockers, step) {
  return (blockers || []).some((b) => step.blockerMatch((b.code || '').toUpperCase()));
}

function isStepComplete(step, { rounds, tracksCount, eventsCount, hackathon, readinessData, blockers }) {
  switch (step.key) {
    case 'rounds':
      return rounds.length > 0;
    case 'tracks':
      return tracksCount > 0;
    case 'criteria':
      return tracksCount > 0 && !hasBlockerForStep(blockers, step);
    case 'people':
      return tracksCount > 0 && !hasBlockerForStep(blockers, step);
    case 'events':
      return eventsCount > 0 || !hasBlockerForStep(blockers, step);
    case 'lottery': {
      if (!hackathon) return false;
      if (hackathon.registration_closed_early_at) return true;
      if (hackathon.registration_end && dayjs(hackathon.registration_end).isBefore(dayjs())) return true;
      return hackathon.status === 'ONGOING' || hackathon.status === 'FINISHED';
    }
    case 'review':
      return readinessData?.ready === true;
    case 'analytics':
      return hackathon?.status === 'FINISHED';
    default:
      return false;
  }
}

const HackathonSetupChecklist = ({
  rounds = [],
  tracksCount = 0,
  eventsCount = 0,
  hackathon,
  readinessData,
  onStepClick,
  onClose,
  direction = 'horizontal',
}) => {
  const blockers = readinessData?.blockers || [];

  const stepStatuses = useMemo(() => {
    const ctx = { rounds, tracksCount, eventsCount, hackathon, readinessData, blockers };
    const completes = SETUP_STEPS.map((step) => isStepComplete(step, ctx));
    const errors = SETUP_STEPS.map((step, index) => hasBlockerForStep(blockers, step) && !completes[index]);

    let processIndex = SETUP_STEPS.findIndex((_, i) => !completes[i] && !errors[i]);
    if (processIndex === -1) processIndex = SETUP_STEPS.length - 1;

    return SETUP_STEPS.map((step, index) => {
      if (errors[index]) return 'error';
      if (completes[index]) return 'finish';
      if (index === processIndex) return 'process';
      return 'wait';
    });
  }, [rounds, tracksCount, eventsCount, hackathon, readinessData, blockers]);

  const completedCount = stepStatuses.filter(status => status === 'finish').length;
  const totalStepsCount = SETUP_STEPS.length;
  const progressPercent = Math.round((completedCount / totalStepsCount) * 100);

  const getPastelStyles = (key) => {
    switch (key) {
      case 'rounds':
        return { bg: '#fdf2f8', color: '#db2777' };
      case 'tracks':
        return { bg: '#faf5ff', color: '#9333ea' };
      case 'criteria':
        return { bg: '#f0fdf4', color: '#16a34a' };
      case 'people':
        return { bg: '#eff6ff', color: '#2563eb' };
      case 'events':
        return { bg: '#fff7ed', color: '#ea580c' };
      case 'lottery':
        return { bg: '#fff1f2', color: '#e11d48' };
      case 'review':
        return { bg: '#faf5ff', color: '#a855f7' };
      case 'analytics':
        return { bg: '#fdf2f8', color: '#ec4899' };
      default:
        return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  const getStepIcon = (key, color) => {
    switch (key) {
      case 'rounds':
        return <Layers size={16} style={{ color }} />;
      case 'tracks':
        return <Columns size={16} style={{ color }} />;
      case 'criteria':
        return <Target size={16} style={{ color }} />;
      case 'people':
        return <Users size={16} style={{ color }} />;
      case 'events':
        return <Calendar size={16} style={{ color }} />;
      case 'lottery':
        return <Ticket size={16} style={{ color }} />;
      case 'review':
        return <ShieldCheck size={16} style={{ color }} />;
      case 'analytics':
        return <Trophy size={16} style={{ color }} />;
      default:
        return <Layers size={16} style={{ color }} />;
    }
  };

  const stepSubItems = {
    rounds: [
      "Thiết lập các vòng thi đấu",
      "Cấu hình thời gian nộp bài"
    ],
    tracks: [
      "Phân chia bảng đấu",
      "Gán đề tài cho từng bảng"
    ],
    criteria: [
      "Cấu hình tiêu chí đánh giá",
      "Thiết lập trọng số điểm"
    ],
    people: [
      "Gán Giám khảo & Mentor",
      "Phân quyền quản trị viên"
    ],
    events: [
      "Lập lịch trình chi tiết kì thi",
      "Cập nhật địa điểm & phòng thi"
    ],
    lottery: [
      "Tiến hành bốc thăm chia bảng",
      "Khai mạc kì thi"
    ],
    review: [
      "Kiểm tra điều kiện đội thi",
      "Kiểm tra lịch trình & phòng thi",
      "Kiểm tra thiết bị & hệ thống",
      "Xác nhận tất cả thông tin"
    ],
    analytics: [
      "Công bố kết quả chung cuộc",
      "Tổ chức lễ trao giải"
    ]
  };

  const NeonRocket = () => (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
      position: 'absolute',
      top: -30,
      right: 10,
      zIndex: 2,
      filter: 'drop-shadow(0 8px 20px rgba(217, 70, 239, 0.4))'
    }}>
      {/* Glowing Platform/Base */}
      <ellipse cx="50" cy="80" rx="30" ry="10" fill="url(#platformGrad)" />
      <ellipse cx="50" cy="80" rx="24" ry="7" fill="#d946ef" opacity="0.6" />
      <ellipse cx="50" cy="80" rx="16" ry="4" fill="#f5d0fe" />

      {/* Light beam from platform */}
      <path d="M34 80 L42 55 H58 L66 80 Z" fill="url(#beamGrad)" opacity="0.3" />

      {/* Smoke / Clouds */}
      <circle cx="38" cy="76" r="8" fill="url(#smokeGrad)" />
      <circle cx="62" cy="76" r="8" fill="url(#smokeGrad)" />
      <circle cx="50" cy="74" r="10" fill="url(#smokeGrad)" />

      {/* Rocket Body */}
      <g transform="translate(18, 12) rotate(15)">
        {/* Flame/Thruster tail */}
        <path d="M26 52 C26 62 30 68 30 68 C30 68 34 62 34 52 Z" fill="url(#fireGrad)" />
        
        {/* Fins */}
        <path d="M16 52 L26 44 V52 Z" fill="#c084fc" />
        <path d="M44 52 L34 44 V52 Z" fill="#c084fc" />
        <path d="M30 54 L27 48 H33 Z" fill="#d946ef" />

        {/* Main Fuselage */}
        <path d="M22 28 C22 28 22 52 30 52 C38 52 38 28 38 28 C38 12 30 4 30 4 C30 4 22 12 22 28 Z" fill="url(#rocketBodyGrad)" />
        
        {/* Nose cone */}
        <path d="M22 24 C25 14 30 4 30 4 C30 4 35 14 38 24 Z" fill="#f472b6" />
        
        {/* Window */}
        <circle cx="30" cy="24" r="5" fill="#fdf2f8" stroke="#d946ef" strokeWidth="2" />
        <path d="M28 22 A 3 3 0 0 1 32 26" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
      </g>

      <defs>
        <linearGradient id="platformGrad" x1="20" y1="75" x2="80" y2="85">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id="beamGrad" x1="50" y1="55" x2="50" y2="80">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="smokeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdf2f8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f5d0fe" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="rocketBodyGrad" x1="22" y1="28" x2="38" y2="52">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#fdf2f8" />
          <stop offset="100%" stopColor="#f5d0fe" />
        </linearGradient>
        <linearGradient id="fireGrad" x1="30" y1="52" x2="30" y2="68">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );

  const ChecklistIllustration = () => (
    <svg width="70" height="70" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
      position: 'absolute',
      bottom: 4,
      right: 4,
      opacity: 0.85,
      pointerEvents: 'none'
    }}>
      <circle cx="45" cy="45" r="25" fill="#fdf2f8" opacity="0.4" filter="blur(6px)" />
      <rect x="20" y="16" width="36" height="48" rx="6" fill="#f472b6" transform="rotate(-5, 38, 40)" />
      <rect x="22" y="18" width="32" height="44" rx="4" fill="#ffffff" transform="rotate(-5, 38, 40)" />
      <rect x="32" y="12" width="12" height="6" rx="2" fill="#d946ef" transform="rotate(-5, 38, 40)" />
      <g transform="rotate(-5, 38, 40)">
        <rect x="26" y="24" width="4" height="4" rx="1" fill="#c084fc" />
        <rect x="32" y="25" width="18" height="2" rx="1" fill="#cbd5e1" />
        <rect x="26" y="32" width="4" height="4" rx="1" fill="#c084fc" />
        <rect x="32" y="33" width="14" height="2" rx="1" fill="#cbd5e1" />
        <rect x="26" y="40" width="4" height="4" rx="1" fill="#c084fc" />
        <rect x="32" y="41" width="16" height="2" rx="1" fill="#cbd5e1" />
      </g>
      <g transform="translate(42, 38) rotate(10)">
        <circle cx="16" cy="16" r="10" stroke="#d946ef" strokeWidth="3" fill="#ffffff" fillOpacity="0.8" />
        <line x1="23.5" y1="23.5" x2="31" y2="31" stroke="#d946ef" strokeWidth="3" strokeLinecap="round" />
        <circle cx="13" cy="13" r="4" fill="#f472b6" opacity="0.3" />
      </g>
    </svg>
  );

  const renderVerticalChecklist = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Dark cosmic header and progress card */}
        <div style={{
          background: 'linear-gradient(180deg, #090d1a 0%, #0d1224 40%, #1e1b4b 100%)',
          padding: '24px 24px 28px 24px',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          position: 'relative'
        }}>
          {/* Header block with Close Button and Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            {onClose && (
              <Button 
                type="text" 
                icon={<X size={16} style={{ color: '#ffffff' }} />} 
                onClick={onClose} 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              />
            )}
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
              Tiến độ chuẩn bị kỳ thi
            </span>
          </div>

          {/* Progress Box inside header */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            padding: '20px 24px',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }}>
            {/* Neon Rocket Illustration */}
            <NeonRocket />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>Tổng tiến độ</span>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '4px 0 12px 0' }}>
                <span style={{ 
                  fontSize: 32, 
                  fontWeight: 800, 
                  background: 'linear-gradient(135deg, #c084fc 0%, #f472b6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1 
                }}>
                  {progressPercent}%
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
                  {completedCount} / {totalStepsCount} bước hoàn thành
                </span>
              </div>
              
              {/* Progress Bar */}
              <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #c084fc, #f472b6)',
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Steps container (white background) */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Stepper Steps List */}
          <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 4 }}>
            {SETUP_STEPS.map((step, index) => {
              const status = stepStatuses[index];
              const isFinished = status === 'finish';
              const isProcess = status === 'process';
              const isError = status === 'error';
              const isLast = index === SETUP_STEPS.length - 1;
              
              let indicator;
              if (isFinished) {
                indicator = (
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c084fc 0%, #f472b6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 4px rgba(192, 132, 252, 0.15)',
                    zIndex: 2,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                );
              } else if (isProcess) {
                indicator = (
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '3px solid #c084fc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(192, 132, 252, 0.3)',
                    zIndex: 2,
                  }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#c084fc',
                    }} />
                  </div>
                );
              } else if (isError) {
                indicator = (
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.15)',
                    zIndex: 2,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                );
              } else {
                indicator = (
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '2px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: 12,
                    fontWeight: 700,
                    zIndex: 2,
                  }}>
                    {index + 1}
                  </div>
                );
              }

              const pastel = getPastelStyles(step.key);
              const iconBgColor = pastel.bg;
              const iconColor = pastel.color;

              let statusText = 'Chưa bắt đầu';
              let statusColor = '#94a3b8';
              if (isFinished) {
                statusText = 'Hoàn thành';
                statusColor = '#10b981';
              } else if (isProcess) {
                statusText = 'Tiếp theo';
                statusColor = '#c084fc';
              } else if (isError) {
                statusText = 'Cần xử lý';
                statusColor = '#ef4444';
              }

              return (
                <div key={step.key} style={{ display: 'flex', gap: 16, position: 'relative', marginBottom: 16 }}>
                  {/* Left Line & circle column */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 26, position: 'relative' }}>
                    {indicator}
                    {!isLast && (
                      <div style={{
                        position: 'absolute',
                        top: 26,
                        bottom: -24,
                        width: 2,
                        background: isFinished ? 'linear-gradient(180deg, #c084fc, #f472b6)' : '#e2e8f0',
                        zIndex: 1,
                      }} />
                    )}
                  </div>

                  {/* Right Card */}
                  <div
                    onClick={() => onStepClick?.(step.tab)}
                    style={{
                      flex: 1,
                      background: '#ffffff',
                      borderRadius: 16,
                      border: isProcess ? '1.5px solid #c084fc' : '1.5px solid rgba(226, 232, 240, 0.8)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: isProcess ? '0 4px 20px rgba(192, 132, 252, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.015)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: iconBgColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {getStepIcon(step.key, iconColor)}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#1e293b',
                          }}>{step.title}</span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: statusColor,
                            marginTop: 2,
                          }}>{statusText}</span>
                        </div>
                      </div>

                      <div style={{ color: isProcess ? '#c084fc' : '#94a3b8' }}>
                        {isProcess ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Checklist Illustration for active review step */}
                    {isProcess && step.key === 'review' && <ChecklistIllustration />}

                    {/* Render sub-items if active/expanded */}
                    {isProcess && stepSubItems[step.key] && (
                      <div style={{ 
                        marginTop: 12, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 10,
                        borderTop: '1px solid rgba(226, 232, 240, 0.6)',
                        paddingTop: 12,
                        width: '100%',
                        zIndex: 1
                      }}>
                        {stepSubItems[step.key].map((subItem, sIdx) => (
                          <div key={sIdx} style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            <span>{subItem}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Suggestion Card */}
          <div style={{
            marginTop: 8,
            padding: '18px 20px',
            background: 'linear-gradient(135deg, #090d1a 0%, #1e1b4b 100%)',
            borderRadius: 20,
            border: '1px solid rgba(139, 92, 246, 0.2)',
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(217, 70, 239, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d946ef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{
                filter: 'drop-shadow(0 0 6px rgba(217, 70, 239, 0.8))'
              }}>
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .4 2.5 1.5 3.5.7.8 1.3 1.5 1.5 2.5" />
                <line x1="9" y1="18" x2="15" y2="18" />
                <line x1="10" y1="22" x2="14" y2="22" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#d946ef', filter: 'drop-shadow(0 0 4px rgba(217, 70, 239, 0.3))' }}>Gợi ý</span>
              <span style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                Lần lượt: tạo vòng thi → bảng đấu → tiêu chí chấm → gán mentor & giám khảo → lên lịch sự kiện → kiểm tra điều kiện → mở đăng ký.
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, marginTop: 4 }}>
                Bốc thăm chỉ làm sau khi đã mở đăng ký và hết hạn đăng ký.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (direction === 'vertical') {
    return <div style={{ padding: '0px' }}>{renderVerticalChecklist()}</div>;
  }

  return (
    <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }} title="Tiến độ chuẩn bị kỳ thi">
      {renderVerticalChecklist()}
    </Card>
  );
};

export default HackathonSetupChecklist;
