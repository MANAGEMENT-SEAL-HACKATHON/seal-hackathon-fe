import { useMemo, useState, useEffect, useRef } from 'react';
import { Button } from 'antd';
import {
  Layers,
  Columns,
  Target,
  Users,
  Calendar,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import {
  SETUP_SUBSTEPS,
  resolveSetupStepStatuses,
  getSetupStepDetailLines,
} from '../utils/hackathonLifecycleSteps';

const PASTEL = {
  rounds: { bg: '#fdf2f8', color: '#db2777' },
  tracks: { bg: '#faf5ff', color: '#9333ea' },
  criteria: { bg: '#f0fdf4', color: '#16a34a' },
  people: { bg: '#eff6ff', color: '#2563eb' },
  events: { bg: '#fff7ed', color: '#ea580c' },
  review: { bg: '#faf5ff', color: '#a855f7' },
};

const ICONS = {
  rounds: Layers,
  tracks: Columns,
  criteria: Target,
  people: Users,
  events: Calendar,
  review: ShieldCheck,
};

/**
 * Tab «Chuẩn bị» — 6 bước setup (không gồm bốc thăm).
 */
const HackathonPrepProgressPanel = ({
  rounds = [],
  tracksCount = 0,
  eventsCount = 0,
  hackathon,
  readinessData,
  onStepClick,
  onClose,
}) => {
  const blockers = readinessData?.blockers || [];
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const lastAutoExpandKey = useRef(null);

  const ctx = useMemo(
    () => ({ rounds, tracksCount, eventsCount, hackathon, readinessData, blockers }),
    [rounds, tracksCount, eventsCount, hackathon, readinessData, blockers],
  );

  const stepStatuses = useMemo(() => resolveSetupStepStatuses(ctx), [ctx]);

  useEffect(() => {
    const processIdx = stepStatuses.findIndex((s) => s === 'process');
    if (processIdx < 0) return;
    const key = SETUP_SUBSTEPS[processIdx].key;
    if (lastAutoExpandKey.current === key) return;
    lastAutoExpandKey.current = key;
    setExpandedKeys((prev) => new Set(prev).add(key));
  }, [stepStatuses]);

  const completedCount = stepStatuses.filter((s) => s === 'finish').length;
  const totalStepsCount = SETUP_SUBSTEPS.length;
  const progressPercent = Math.round((completedCount / totalStepsCount) * 100);

  const toggleExpanded = (key, e) => {
    e?.stopPropagation?.();
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        style={{
          background: 'url("/Check-listCK.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '16px 20px 18px',
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {onClose && (
            <Button
              type="text"
              icon={<X size={16} style={{ color: '#fff' }} />}
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.12)',
                border: 'none',
              }}
            />
          )}
          <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>
            Tiến độ chuẩn bị sự kiện
          </span>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '12px 16px',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>Chuẩn bị</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '4px 0 8px' }}>
            <span
              style={{
                fontSize: 26,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #c084fc 0%, #f472b6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}
            >
              {progressPercent}%
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
              {completedCount} / {totalStepsCount} bước
            </span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #c084fc, #f472b6)',
                borderRadius: 3,
                transition: 'width 0.35s ease',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SETUP_SUBSTEPS.map((step, index) => {
          const status = stepStatuses[index];
          const isFinished = status === 'finish';
          const isProcess = status === 'process';
          const isError = status === 'error';
          const isLast = index === SETUP_SUBSTEPS.length - 1;
          const pastel = PASTEL[step.key] || { bg: '#f1f5f9', color: '#475569' };
          const Icon = ICONS[step.key] || Layers;
          const isExpanded = expandedKeys.has(step.key);
          const detailLines = getSetupStepDetailLines(step, ctx);

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
            <div key={step.key} style={{ display: 'flex', gap: 14, position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 26, position: 'relative' }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: isFinished
                      ? 'linear-gradient(135deg, #c084fc 0%, #f472b6 100%)'
                      : isError
                        ? '#ef4444'
                        : '#fff',
                    border: isProcess ? '3px solid #c084fc' : isFinished || isError ? 'none' : '2px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    color: '#94a3b8',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {isFinished || isError ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      {isFinished ? <polyline points="20 6 9 17 4 12" /> : (
                        <>
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </>
                      )}
                    </svg>
                  ) : isProcess ? (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c084fc' }} />
                  ) : (
                    index + 1
                  )}
                </div>
                {!isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 26,
                      bottom: -16,
                      width: 2,
                      background: isFinished ? 'linear-gradient(180deg, #c084fc, #f472b6)' : '#e2e8f0',
                      zIndex: 1,
                    }}
                  />
                )}
              </div>

              <div
                onClick={() => onStepClick?.(step.tab)}
                style={{
                  flex: 1,
                  background: '#fff',
                  borderRadius: 14,
                  border: isProcess ? '1.5px solid #c084fc' : '1.5px solid rgba(226,232,240,0.8)',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  marginBottom: 4,
                  boxShadow: isProcess ? '0 4px 16px rgba(192,132,252,0.08)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: pastel.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={15} style={{ color: pastel.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{step.title}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>{statusText}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => toggleExpanded(step.key, e)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isExpanded ? '#c084fc' : '#94a3b8' }}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                {isExpanded && detailLines.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detailLines.map((line, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#475569', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: '#c084fc', flexShrink: 0 }}>•</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div
          style={{
            marginTop: 4,
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #090d1a 0%, #1e1b4b 100%)',
            borderRadius: 16,
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#d946ef', marginBottom: 4 }}>Gợi ý</div>
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            Lần lượt: vòng thi → bảng đấu → tiêu chí → nhân sự → lịch trình → kiểm tra → mở đăng ký.
            Bốc thăm nằm ở giai đoạn vận hành (sau khi đóng đăng ký).
          </div>
        </div>
      </div>
    </div>
  );
};

export default HackathonPrepProgressPanel;
