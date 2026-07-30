import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Space, Tag, Tooltip, Typography } from 'antd';
import { Clock, TimerReset } from 'lucide-react';
import { appealWindowService } from '../services/appealWindow.service';

const { Text, Title } = Typography;

const POLL_MS = 15_000;
const TICK_MS = 1_000;

const pad2 = (n) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

export const formatCountdown = (totalSeconds) => {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return '--:--:--';
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
};

export const countdownTone = (remainingMinutes) => {
  if (remainingMinutes == null || Number.isNaN(remainingMinutes)) {
    return { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: '—' };
  }
  if (remainingMinutes < 5) {
    return { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', label: 'Sắp hết giờ' };
  }
  if (remainingMinutes < 10) {
    return { color: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'Sắp đến hạn' };
  }
  return { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Còn thời gian' };
};

/**
 * Shared countdown bar for coordinator / student / judge / mentor.
 * Polls appeal-window every 15s; local tick uses serverNow skew.
 */
const AppealCountdownBar = ({
  roundId,
  readOnly = true,
  showDelayButton = false,
  onRequestDelay,
  onStatusChange,
  style,
}) => {
  const [status, setStatus] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [loadError, setLoadError] = useState(null);
  const skewRef = useRef(0);

  const fetchStatus = useCallback(async () => {
    if (!roundId) return;
    try {
      const data = await appealWindowService.getStatus(roundId);
      const serverNow = data?.serverNow ? new Date(data.serverNow).getTime() : Date.now();
      skewRef.current = serverNow - Date.now();
      setStatus(data);
      setLoadError(null);
      onStatusChange?.(data);
    } catch (error) {
      setLoadError(error);
      onStatusChange?.(null);
    }
  }, [roundId, onStatusChange]);

  useEffect(() => {
    fetchStatus();
    const pollId = window.setInterval(fetchStatus, POLL_MS);
    const tickId = window.setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => {
      window.clearInterval(pollId);
      window.clearInterval(tickId);
    };
  }, [fetchStatus]);

  const skewedNow = nowMs + skewRef.current;

  const finalExamAtMs = status?.finalExamAt ? new Date(status.finalExamAt).getTime() : null;
  const appealEndsMs = status?.appealWindowEndsAt
    ? new Date(status.appealWindowEndsAt).getTime()
    : null;

  const secondsToFinal =
    finalExamAtMs != null ? Math.max(0, (finalExamAtMs - skewedNow) / 1000) : null;
  const secondsToAppealEnd =
    appealEndsMs != null ? Math.max(0, (appealEndsMs - skewedNow) / 1000) : null;
  const minutesToFinal = secondsToFinal != null ? secondsToFinal / 60 : null;

  const tone = countdownTone(minutesToFinal);
  const windowState = String(status?.windowState || '').toUpperCase();
  const isOpen = windowState === 'OPEN';
  const pendingOpen =
    Number(status?.pendingCount || 0) + Number(status?.underReviewCount || 0);

  const revision = Number(status?.publishRevision || 0);

  const visible = Boolean(
    status &&
      (isOpen ||
        windowState === 'CLOSED' ||
        windowState === 'EXPIRED' ||
        (finalExamAtMs != null && secondsToFinal > 0)),
  );

  if (!roundId || loadError || !visible) return null;

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        padding: '16px 20px',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Space direction="vertical" size={4}>
          <Space wrap size={8}>
            <Tag color={isOpen ? 'processing' : 'default'} icon={<Clock size={12} />}>
              {isOpen ? 'Cửa sổ khiếu nại đang mở' : `Cửa sổ: ${windowState || '—'}`}
            </Tag>
            <Tag color={tone.color === '#b91c1c' ? 'error' : tone.color === '#b45309' ? 'warning' : 'success'}>
              {tone.label}
            </Tag>
            {pendingOpen > 0 && (
              <Tag color="orange">
                {status.pendingCount || 0} chờ duyệt · {status.underReviewCount || 0} đang xét
              </Tag>
            )}
            {revision > 1 && (
              <Tag color="blue">Kết quả đã cập nhật (bản #{revision})</Tag>
            )}
          </Space>
          <Title level={3} style={{ margin: 0, color: tone.color, fontVariantNumeric: 'tabular-nums' }}>
            {formatCountdown(secondsToFinal)}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Đếm ngược tới giờ Chung kết
            {status?.finalExamAt
              ? ` (${new Date(status.finalExamAt).toLocaleString('vi-VN')})`
              : ''}
          </Text>
          {appealEndsMs != null && (
            <Text style={{ fontSize: 13, color: tone.color }}>
              Hết hạn nộp khiếu nại:{' '}
              <Text strong style={{ color: tone.color, fontVariantNumeric: 'tabular-nums' }}>
                {formatCountdown(secondsToAppealEnd)}
              </Text>
              {' · '}
              {new Date(status.appealWindowEndsAt).toLocaleString('vi-VN')}
            </Text>
          )}
        </Space>

        {!readOnly && showDelayButton && (
          <Tooltip title="Dời giờ Chung kết để kéo dài thời gian xét khiếu nại (tối đa ngân sách còn lại)">
            <Button
              icon={<TimerReset size={16} />}
              onClick={() => onRequestDelay?.(status)}
              disabled={!status?.delayMinutesRemaining}
            >
              Dời giờ CK
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default AppealCountdownBar;
