import dayjs from 'dayjs';

/**
 * Ceil datetime to the next whole minute (for RESCHEDULE DatePicker / schedule UI).
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
  const withSeconds = examDayjs.format('HH:mm:ss');
  return sameDay ? withSeconds : `${withSeconds} ${examDayjs.format('DD/MM')}`;
}
