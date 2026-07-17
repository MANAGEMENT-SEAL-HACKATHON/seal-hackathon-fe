import { useEffect, useMemo, useState } from 'react';
import { Button, Skeleton, Grid } from 'antd';
import {
  Rocket,
  Ticket,
  Layers,
  Trophy,
  Award,
  Flag,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react';
import {
  EVENT_PHASES,
  resolveEventPhaseStatuses,
  readManualDone,
  writeManualDone,
  buildNavigateTarget,
} from '../utils/hackathonLifecycleSteps';

const { useBreakpoint } = Grid;

const PHASE_ICONS = {
  gd1: Rocket,
  gd2: Ticket,
  gd3: Layers,
  gd4: Flag,
  gd5: Trophy,
  gd6: Award,
};

const STATUS_META = {
  finish: { label: 'Hoàn thành', color: '#10b981' },
  process: { label: 'Đang chờ hành động', color: '#d97706' },
  wait: { label: 'Chưa tới lượt', color: '#94a3b8' },
};

/**
 * Tab «Toàn bộ sự kiện» — macro GĐ1–GĐ6 + sub-steps.
 */
const HackathonEventProgressPanel = ({
  hackathonId,
  ctx,
  snapshotLoading,
  teamsLoading,
  onNavigate,
  onClose,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [expanded, setExpanded] = useState(() => new Set());
  const [manualDone, setManualDone] = useState(() => readManualDone(hackathonId));

  useEffect(() => {
    setManualDone(readManualDone(hackathonId));
  }, [hackathonId]);

  const phaseStatuses = useMemo(
    () => resolveEventPhaseStatuses(ctx || {}, manualDone),
    [ctx, manualDone],
  );

  const finishedCount = phaseStatuses.filter((p) => p.status === 'finish').length;
  const total = EVENT_PHASES.length;
  const percent = Math.round((finishedCount / total) * 100);

  const togglePhase = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const markDone = (subKey, e) => {
    e?.stopPropagation?.();
    setManualDone((prev) => {
      const next = new Set(prev);
      next.add(subKey);
      writeManualDone(hackathonId, next);
      return next;
    });
  };

  const handleSubClick = (sub) => {
    const target = buildNavigateTarget(hackathonId, sub);
    if (target) onNavigate?.(target);
  };

  if (snapshotLoading || teamsLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        style={{
          padding: '18px 22px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Tiến độ kỳ thi</div>
          <div style={{ fontSize: 12, color: '#c4b5fd', marginTop: 4 }}>
            {finishedCount} / {total} giai đoạn · {percent}%
          </div>
        </div>
        {onClose && (
          <Button
            type="text"
            icon={<X size={16} style={{ color: '#fff' }} />}
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
            }}
          />
        )}
      </div>

      <div
        style={{
          padding: isMobile ? 16 : 20,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(6, minmax(0, 1fr))',
          gap: 12,
          overflowX: isMobile ? 'visible' : 'auto',
        }}
      >
        {EVENT_PHASES.map((phase, index) => {
          const { status, subStatuses } = phaseStatuses[index];
          const meta = STATUS_META[status];
          const Icon = PHASE_ICONS[phase.key] || Rocket;
          const isOpen = expanded.has(phase.key) || status === 'process';

          return (
            <div
              key={phase.key}
              style={{
                background: '#fff',
                borderRadius: 14,
                border:
                  status === 'process'
                    ? '1.5px solid #f59e0b'
                    : status === 'finish'
                      ? '1.5px solid #a78bfa'
                      : '1.5px solid #e2e8f0',
                padding: 12,
                minWidth: isMobile ? undefined : 140,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => togglePhase(phase.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: status === 'finish' ? '#f5f3ff' : status === 'process' ? '#fffbeb' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {status === 'finish' ? (
                      <Check size={14} color="#7c3aed" />
                    ) : (
                      <Icon size={14} color={meta.color} />
                    )}
                  </div>
                  {isOpen ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginTop: 8, lineHeight: 1.3 }}>
                  {phase.title}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: meta.color, marginTop: 4 }}>
                  {meta.label}
                </div>
              </button>

              {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {phase.subSteps.map((sub, si) => {
                    const subStatus = subStatuses[si];
                    const subMeta = STATUS_META[subStatus];
                    const canMark =
                      subStatus === 'process' && sub.completionMode === 'manual';

                    return (
                      <div
                        key={sub.key}
                        style={{
                          padding: '8px 8px',
                          borderRadius: 8,
                          background: subStatus === 'process' ? '#fffbeb' : '#f8fafc',
                          border: '1px solid #f1f5f9',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleSubClick(sub)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', lineHeight: 1.35 }}>
                            {sub.title}
                          </div>
                          <div style={{ fontSize: 10, color: subMeta.color, marginTop: 2 }}>
                            {subMeta.label}
                          </div>
                        </button>
                        {canMark && (
                          <Button
                            size="small"
                            type="default"
                            onClick={(e) => markDone(sub.key, e)}
                            style={{
                              marginTop: 6,
                              fontSize: 10,
                              height: 24,
                              color: '#64748b',
                              borderColor: '#cbd5e1',
                            }}
                          >
                            Đánh dấu hoàn thành
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div
          style={{
            padding: '12px 14px',
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            fontSize: 11,
            color: '#64748b',
            lineHeight: 1.5,
          }}
        >
          GĐ1 chuẩn bị → GĐ2 đóng ĐK & bốc thăm → GĐ3 sơ loại (chia thuyết trình rồi mới chấm)
          → GĐ4 công bố & chuyển vòng → GĐ5 chung kết → GĐ6 trao giải.
          Bấm từng bước để đi tới đúng trang thao tác.
        </div>
      </div>
    </div>
  );
};

export default HackathonEventProgressPanel;
