import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { ceilToNextMinute, formatExamPreview } from './ceilToNextMinute';

describe('ceilToNextMinute', () => {
  it('ceil seconds up to next minute', () => {
    const d = dayjs('2026-07-15T14:30:15.000');
    expect(ceilToNextMinute(d).format('HH:mm:ss')).toBe('14:31:00');
  });

  it('keeps exact minute when already on :00', () => {
    const d = dayjs('2026-07-15T14:30:00.000');
    expect(ceilToNextMinute(d).format('HH:mm:ss')).toBe('14:30:00');
  });

  it('formatExamPreview includes seconds', () => {
    const t = dayjs('2026-07-15T14:35:15.000');
    expect(formatExamPreview(t)).toBe('14:35:15');
  });
});
