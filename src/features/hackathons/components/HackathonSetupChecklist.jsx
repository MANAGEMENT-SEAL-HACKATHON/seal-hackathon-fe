import { useMemo } from 'react';
import { Card, Typography } from 'antd';
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
  Rocket
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

  const renderVerticalChecklist = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Progress Card */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid rgba(226, 232, 240, 0.8)',
          borderRadius: 20,
          padding: '20px 24px',
          position: 'relative',
          marginBottom: 24,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.015)',
        }}>
          {/* Rocket absolute position top-right */}
          <div style={{
            position: 'absolute',
            top: -12,
            right: 20,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(37, 99, 235, 0.15)',
            border: '2px solid #ffffff'
          }}>
            <Rocket size={22} style={{ color: '#2563eb', transform: 'rotate(45deg)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Tổng tiến độ</span>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '4px 0 12px 0' }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>
                {progressPercent}%
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
                {completedCount} / {totalStepsCount} bước hoàn thành
              </span>
            </div>
            
            {/* Progress Bar */}
            <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>

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
                  background: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.1)',
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
                  border: '3px solid #2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(37, 99, 235, 0.25)',
                  zIndex: 2,
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#2563eb',
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
                  boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.1)',
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

            const iconBgColor = isFinished ? 'rgba(59, 130, 246, 0.06)' : (isProcess ? 'rgba(59, 130, 246, 0.1)' : 'rgba(241, 245, 249, 0.8)');
            const iconColor = isFinished ? '#2563eb' : (isProcess ? '#2563eb' : '#64748b');

            let statusText = 'Chưa bắt đầu';
            let statusColor = '#94a3b8';
            if (isFinished) {
              statusText = 'Hoàn thành';
              statusColor = '#10b981';
            } else if (isProcess) {
              statusText = 'Tiếp theo';
              statusColor = '#2563eb';
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
                      background: isFinished ? 'linear-gradient(180deg, #2563eb, #60a5fa)' : '#e2e8f0',
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
                    border: isProcess ? '1.5px solid #2563eb' : '1.5px solid rgba(226, 232, 240, 0.8)',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: isProcess ? '0 4px 16px rgba(37, 99, 235, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
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

                  <div style={{ color: isProcess ? '#2563eb' : '#94a3b8' }}>
                    {isProcess ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Suggestion Card */}
        <div style={{
          marginTop: 8,
          padding: '16px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: 20,
          border: '1px solid rgba(226, 232, 240, 0.8)',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Lightbulb size={16} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>Gợi ý</span>
            <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
              Lần lượt: tạo vòng thi → bảng đấu → tiêu chí chấm → gán mentor & giám khảo → lên lịch sự kiện → kiểm tra điều kiện → mở đăng ký.
            </span>
            <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5, marginTop: 4 }}>
              Bốc thăm chỉ làm sau khi đã mở đăng ký và hết hạn đăng ký.
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (direction === 'vertical') {
    return <div style={{ padding: '8px 4px' }}>{renderVerticalChecklist()}</div>;
  }

  return (
    <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }} title="Tiến độ chuẩn bị kỳ thi">
      {renderVerticalChecklist()}
    </Card>
  );
};

export default HackathonSetupChecklist;
