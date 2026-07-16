import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Spin, Typography, theme } from 'antd';
import { studentRoundService } from '../../round/services/studentRound.service';

const { Text } = Typography;

const POLL_MS = 4000;

/**
 * Live STT panel for the student's team in a round.
 * Polls GET /api/v1/me/rounds/{roundId}/presentation-slot every few seconds.
 */
const PresentationSlotPanel = ({ roundId }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['studentPresentationSlot', roundId],
    queryFn: () => studentRoundService.getPresentationSlot(roundId),
    enabled: Boolean(roundId),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    retry: false,
  });

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

  let headline;
  if (data.status === 'PRESENTING') {
    headline = `Đang thuyết trình: Bạn · Mã ${myCode}`;
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
