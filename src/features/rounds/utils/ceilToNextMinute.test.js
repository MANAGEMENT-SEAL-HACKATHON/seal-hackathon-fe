import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { calculateStartTime, formatExamPreview } from './ceilToNextMinute';

describe('calculateStartTime (mirror BE now.plusMinutes)', () => {
  it('14:30:15 + 5 → 14:35:15 — không ceil lên 14:36', () => {
    const now = dayjs('2026-07-15T14:30:15.000');
    const preview = calculateStartTime(5, now);
    expect(preview.format('HH:mm:ss')).toBe('14:35:15');
  });

  it('keeps exact lead when already on :00', () => {
    const now = dayjs('2026-07-15T14:30:00.000');
    expect(calculateStartTime(5, now).format('HH:mm:ss')).toBe('14:35:00');
  });

  it('defaults lead to 5 when invalid', () => {
    const now = dayjs('2026-07-15T10:00:00.000');
    expect(calculateStartTime(null, now).format('HH:mm:ss')).toBe('10:05:00');
  });

  it('formatExamPreview includes seconds', () => {
    const t = dayjs('2026-07-15T14:35:15.000');
    expect(formatExamPreview(t)).toBe('14:35:15');
  });
});
