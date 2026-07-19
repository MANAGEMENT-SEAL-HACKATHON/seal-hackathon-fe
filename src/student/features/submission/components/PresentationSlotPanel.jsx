import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Spin, Typography, theme } from 'antd';
import { studentRoundService } from '../../round/services/studentRound.service';
import { usePresentationQueueSocket } from '../../../../shared/hooks/usePresentationQueueSocket';

const { Text } = Typography;

const POLL_MS = 4000;

const formatCountdown = (totalSeconds) => {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

/**
 * Live STT panel for the student's team in a round.
 * Polls GET /api/v1/me/rounds/{roundId}/presentation-slot every few seconds.
 * When PRESENTING, ticks countdown client-side from remainingSeconds (WS + poll).
 */
const PresentationSlotPanel = ({ roundId }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const [tickSeconds, setTickSeconds] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['studentPresentationSlot', roundId],
    queryFn: () => studentRoundService.getPresentationSlot(roundId),
    enabled: Boolean(roundId),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const trackId = data?.trackId ?? data?.track_id ?? null;
  const mySubmissionId = useMemo(() => {
    const code = data?.displayCode || data?.display_code || '';
    const m = String(code).match(/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [data?.displayCode, data?.display_code]);

  usePresentationQueueSocket(
    roundId,
    () => {
      refetch();
    },
    trackId,
    {
      onTimerPhase: (payload) => {
        if (!payload || payload.type !== 'TIMER_PHASE') return;
        if (mySubmissionId == null) return;
        if (String(payload.submissionId) !== String(mySubmissionId)) return;
        const remaining = Number(payload.remainingSeconds ?? 0);
        setTickSeconds(Number.isFinite(remaining) ? remaining : 0);
      },
      onFallbackPoll: () => {
        refetch();
      },
    },
  );

  // Resync tick from poll payload when team is presenting
  useEffect(() => {
    if (!data || data.status !== 'PRESENTING') {
      setTickSeconds(null);
      return undefined;
    }
    const remaining = Number(data.remainingSeconds ?? data.remaining_seconds);
    if (Number.isFinite(remaining)) {
      setTickSeconds(remaining);
    }
    return undefined;
  }, [data?.status, data?.remainingSeconds, data?.remaining_seconds, data?.timerPhase]);

  // Client-side 1s tick
  useEffect(() => {
    if (tickSeconds == null || data?.status !== 'PRESENTING') return undefined;
    const id = setInterval(() => {
      setTickSeconds((prev) => (prev == null ? prev : Math.max(0, prev - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [tickSeconds == null, data?.status]);

  if (!roundId) return null;

  if (isLoading && !data) {
    return (
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <Spin size="small" tip="Đang tải thứ tự thuyết trình..." />
      </div>
    );
  }

  if (isError) return null;

  if (!data || data.available === false) {
    return (
      <Alert
        type="info"
        showIcon
        style={{
          marginBottom: 20,
          borderRadius: 14,
          background: isDark ? 'rgba(30, 41, 59, 0.6)' : undefined,
        }}
        message={data?.message || 'Chưa quay số'}
        description="Thứ tự thuyết trình sẽ hiện sau khi Ban tổ chức quay số / xáo hàng đợi."
      />
    );
  }

  const presentingCode = data.currentPresentingDisplayCode || (data.currentPresentingOrder != null ? `#${data.currentPresentingOrder}` : '—');
  const myCode = data.displayCode || (data.order != null ? `#${data.order}` : '—');
  const ahead = data.teamsAhead ?? 0;
  const phase = data.timerPhase || data.timer_phase;
  const countdownLabel =
    data.status === 'PRESENTING' && tickSeconds != null
      ? ` · ${phase === 'QA' ? 'Q&A' : 'TT'} ${formatCountdown(tickSeconds)}`
      : '';

  let headline;
  if (data.status === 'PRESENTING') {
    headline = `Đang thuyết trình: Bạn · Mã ${myCode}${countdownLabel}`;
  } else if (data.status === 'DONE') {
    headline = `Đội bạn đã thuyết trình · Mã ${myCode}`;
  } else if (data.status === 'SKIPPED') {
    headline = `Đội bạn bị bỏ qua · Mã ${myCode}`;
  } else {
    headline = `Đang thuyết trình: Mã ${presentingCode} · Bạn: Mã ${myCode} · Còn ${ahead} đội trước bạn`;
  }

  return (
    <Alert
      type={data.status === 'PRESENTING' ? 'success' : 'info'}
      showIcon
      style={{
        marginBottom: 20,
        borderRadius: 14,
        background: isDark ? 'rgba(30, 41, 59, 0.65)' : undefined,
      }}
      message={
        <Text strong style={{ fontSize: 15, color: token.colorTextHeading }}>
          {headline}
        </Text>
      }
      description={
        data.roundIsFinal
          ? 'Thứ tự vòng Chung kết (cập nhật tự động).'
          : 'Thứ tự vòng Sơ loại theo bảng của bạn (cập nhật tự động).'
      }
    />
  );
};

export default PresentationSlotPanel;
