import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import {
  getAwardsMinMoment,
  isEventStartDateDisabled,
  buildEventScheduleContext,
} from './eventScheduleRules.js';

describe('eventScheduleRules AWARDS constraints', () => {
  const finalRound = {
    is_final: true,
    exam_at: '2026-08-20T08:00:00',
    coding_duration_hours: 4,
    default_presentation_minutes: 10,
    default_qa_minutes: 5,
    published_at: '2026-08-20T18:00:00',
  };

  it('prefers publishedAt as min moment', () => {
    const ctx = buildEventScheduleContext({
      hackathon: { event_end: '2026-08-20' },
      rounds: [finalRound],
      events: [],
      selectedType: 'AWARDS',
    });
    const min = getAwardsMinMoment(ctx);
    assert.equal(min.format('YYYY-MM-DD HH:mm'), '2026-08-20 18:00');
  });

  it('disables AWARDS dates before event end day', () => {
    const ctx = buildEventScheduleContext({
      hackathon: { event_end: '2026-08-20' },
      rounds: [finalRound],
      events: [],
      selectedType: 'AWARDS',
    });
    const wrongDay = dayjs('2026-08-19');
    const okDay = dayjs('2026-08-20');
    assert.equal(isEventStartDateDisabled(wrongDay, ctx), true);
    assert.equal(isEventStartDateDisabled(okDay, ctx), false);
  });
});
