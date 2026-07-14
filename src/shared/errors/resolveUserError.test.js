import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveUserError,
  resolveStatusLabel,
  SANITIZE_FALLBACK,
  SHARED_ERROR_MESSAGES,
} from './resolveUserError.js';

describe('resolveUserError', () => {
  it('1) RESOURCE_NOT_FOUND + teamId/roundId raw → VN map, no IDs leaked', () => {
    const msg = resolveUserError({
      code: 'RESOURCE_NOT_FOUND',
      message: 'TeamRoundTrack with id=teamId=12, roundId=34 not found',
    });
    assert.equal(msg, SHARED_ERROR_MESSAGES.RESOURCE_NOT_FOUND);
    assert.equal(/teamId=|roundId=/.test(msg), false);
  });

  it('2) sensitive raw messages → SANITIZE_FALLBACK', () => {
    const samples = [
      'teamId=12 bad',
      'Entity with id=99 not found',
      'Đội chưa khóa (is_locked=false)',
      'Call PATCH /lottery first',
    ];
    for (const message of samples) {
      const msg = resolveUserError({ message });
      assert.equal(msg, SANITIZE_FALLBACK, `expected sanitize for: ${message}`);
    }
  });

  it('3) enum-only LATE_PENDING message → SANITIZE_FALLBACK; code maps via SHARED', () => {
    assert.equal(resolveUserError({ message: 'LATE_PENDING' }), SANITIZE_FALLBACK);
    assert.equal(
      resolveUserError({ code: 'LATE_PENDING', message: 'LATE_PENDING' }),
      SHARED_ERROR_MESSAGES.LATE_PENDING,
    );
  });

  it('4) resolveStatusLabel(PENDING_CONFIRM)', () => {
    assert.equal(resolveStatusLabel('PENDING_CONFIRM'), 'Đang chờ chốt sổ điểm');
  });

  it('5) clean Vietnamese message preserved', () => {
    const clean = 'Đội thi đã nộp bài';
    assert.equal(resolveUserError({ message: clean }), clean);
  });
});
