import dayjs from 'dayjs';

/**
 * START_NOW preview — khớp BE: examAt = now.plusMinutes(lead) (không ceil / startOf).
 */
export function calculateStartTime(leadMinutes, now = dayjs()) {
  const lead = Number.isFinite(leadMinutes) && leadMinutes >= 1 ? Math.floor(leadMinutes) : 5;
  return dayjs(now).add(lead, 'minute');
}

/** @deprecated dùng calculateStartTime */
export function previewStartNowExamAt(leadMinutes, now = dayjs()) {
  return calculateStartTime(leadMinutes, now);
}

/**
 * Giữ helper ceil cho RESCHEDULE DatePicker nếu cần — không dùng cho START_NOW preview.
 */
export function ceilToNextMinute(value) {
  const d = dayjs.isDayjs(value) ? value : dayjs(value);
  if (!d.isValid()) return d;
  const truncated = d.startOf('minute');
  if (d.second() > 0 || d.millisecond() > 0) {
    return truncated.add(1, 'minute');
  }
  return truncated;
}

export function formatExamPreview(examDayjs) {
  if (!examDayjs?.isValid()) return '—';
  const sameDay = examDayjs.isSame(dayjs(), 'day');
  // Hiện cả giây để khớp countdown ~N:00.xx
  const withSeconds = examDayjs.format('HH:mm:ss');
  return sameDay ? withSeconds : `${withSeconds} ${examDayjs.format('DD/MM')}`;
}
