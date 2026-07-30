import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import {
  getAwardsMinMoment,
  isEventStartDateDisabled,
  isBuffetDateDisabled,
  formatBuffetSubtitle,
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

describe('eventScheduleRules buffet helpers', () => {
  it('disables buffet dates outside event window', () => {
    const startsAt = dayjs('2026-08-05T08:00:00');
    const endsAt = dayjs('2026-08-05T17:00:00');
    assert.equal(isBuffetDateDisabled(dayjs('2026-08-04'), startsAt, endsAt), true);
    assert.equal(isBuffetDateDisabled(dayjs('2026-08-05'), startsAt, endsAt), false);
    assert.equal(isBuffetDateDisabled(dayjs('2026-08-06'), startsAt, endsAt), true);
  });

  it('formats kickoff buffet subtitle', () => {
    const line = formatBuffetSubtitle({
      type: 'KICKOFF',
      buffet_location: 'Canteen',
      buffet_starts_at: '2026-08-05T11:00:00',
      buffet_ends_at: '2026-08-05T12:00:00',
    });
    assert.equal(line, 'Buffet: Canteen · 11:00–12:00');
    assert.equal(formatBuffetSubtitle({ type: 'WORKSHOP', buffet_location: 'X' }), null);
  });
});