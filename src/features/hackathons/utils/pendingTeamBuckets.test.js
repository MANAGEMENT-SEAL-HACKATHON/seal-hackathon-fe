import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import { classifyPendingTeams, formatPendingTeamsGateReason } from './pendingTeamBuckets.js';
import { getLotteryGateReason } from './hackathonRegistrationRules.js';

describe('classifyPendingTeams (LOT-06)', () => {
  it('splits awaiting / grace / blocked and earliest deadline', () => {
    const now = dayjs('2026-07-17T10:00:00');
    const buckets = classifyPendingTeams(
      [
        { id: 1, formationSubmittedAt: '2026-07-17T08:00:00' },
        { id: 2, formationGraceDeadlineAt: '2026-07-17T22:00:00' },
        { id: 3, formationGraceDeadlineAt: '2026-07-18T08:00:00' },
        { id: 4, formationGraceDeadlineAt: '2026-07-16T10:00:00' },
      ],
      now,
    );
    assert.equal(buckets.awaitingApproval.length, 1);
    assert.equal(buckets.inGrace.length, 2);
    assert.equal(buckets.blockedOther.length, 1);
    assert.equal(buckets.total, 4);
    assert.equal(dayjs(buckets.earliestGraceDeadlineAt).format('YYYY-MM-DD HH:mm'), '2026-07-17 22:00');
  });
});

describe('getLotteryGateReason pending (LOT-01)', () => {
  it('blocks lottery when pending teams remain — message has buckets', () => {
    const yesterday = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
    const reason = getLotteryGateReason(
      { status: 'ONGOING', registration_end: yesterday, registrationClosedEarlyAt: dayjs().toISOString() },
      [{ id: 10, is_locked: true }],
      { id: 1, is_active: false },
      [
        { id: 1, formationSubmittedAt: dayjs().toISOString() },
        { id: 2, formationGraceDeadlineAt: dayjs().add(10, 'hour').toISOString() },
      ],
    );
    assert.ok(reason.length > 0);
    assert.match(reason, /đã xác nhận/i);
    assert.match(reason, /24h|suy nghĩ/i);
    assert.equal(/PENDING/.test(reason), false);
  });

  it('allows when no pending and all active locked', () => {
    const yesterday = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
    const reason = getLotteryGateReason(
      { status: 'ONGOING', registration_end: yesterday, registrationClosedEarlyAt: dayjs().toISOString() },
      [{ id: 10, is_locked: true }],
      { id: 1, is_active: false },
      [],
    );
    assert.equal(reason, '');
  });
});

describe('formatPendingTeamsGateReason', () => {
  it('returns empty when total 0', () => {
    assert.equal(
      formatPendingTeamsGateReason({
        awaitingApproval: [],
        inGrace: [],
        blockedOther: [],
        total: 0,
      }),
      '',
    );
  });
});
