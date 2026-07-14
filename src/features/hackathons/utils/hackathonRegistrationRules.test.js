import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import { getLotteryGateReason } from './hackathonRegistrationRules.js';

function assertNoItJargon(reason, label) {
  assert.equal(/ONGOING/.test(reason), false, `${label}: must not contain ONGOING — got: ${reason}`);
  assert.equal(/is_locked/i.test(reason), false, `${label}: must not contain is_locked — got: ${reason}`);
  assert.equal(/PATCH/i.test(reason), false, `${label}: must not contain PATCH — got: ${reason}`);
}

describe('getLotteryGateReason', () => {
  it('status not ONGOING → friendly VN, no IT jargon', () => {
    const reason = getLotteryGateReason({ status: 'DRAFT', registration_end: '2099-12-31' }, []);
    assert.ok(reason.length > 0);
    assertNoItJargon(reason, 'draft status');
  });

  it('unlocked active teams → friendly VN, no is_locked', () => {
    const yesterday = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
    const reason = getLotteryGateReason(
      { status: 'ONGOING', registration_end: yesterday },
      [{ id: 1, is_locked: false }, { id: 2, isLocked: false }],
    );
    assert.ok(reason.length > 0);
    assert.match(reason, /chưa bị khóa/i);
    assertNoItJargon(reason, 'unlocked teams');
  });

  it('active round → cannot lottery again, no IT jargon', () => {
    const reason = getLotteryGateReason(
      { status: 'ONGOING', registration_end: '2020-01-01' },
      [{ id: 1, is_locked: true }],
      { id: 9, is_active: true },
    );
    assert.ok(reason.length > 0);
    assert.match(reason, /không thể bốc thăm lại/i);
    assertNoItJargon(reason, 'active round');
  });
});
