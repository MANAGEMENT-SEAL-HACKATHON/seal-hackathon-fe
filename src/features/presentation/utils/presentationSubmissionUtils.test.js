import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSubmissionStatusMeta,
  countSubmissionBuckets,
} from './presentationSubmissionUtils.js';

describe('presentationSubmissionUtils — A1 labels + INVARIANT', () => {
  it('ALLOW_LATE_PENDING: in-window null → Chưa nộp; closed → Hết hạn — không nộp', () => {
    assert.equal(
      getSubmissionStatusMeta(null, {
        latePolicy: 'ALLOW_LATE_PENDING',
        windowClosed: false,
      }).label,
      'Chưa nộp',
    );
    assert.equal(
      getSubmissionStatusMeta(null, {
        latePolicy: 'ALLOW_LATE_PENDING',
        windowClosed: true,
      }).label,
      'Hết hạn — không nộp',
    );
  });

  it('HARD_LOCK: closed null → Không nộp; REJECTED → Nộp trễ — từ chối', () => {
    assert.equal(
      getSubmissionStatusMeta(null, { latePolicy: 'HARD_LOCK', windowClosed: true }).label,
      'Không nộp',
    );
    assert.equal(
      getSubmissionStatusMeta('REJECTED', { latePolicy: 'HARD_LOCK', windowClosed: true }).label,
      'Nộp trễ — từ chối',
    );
  });

  it('INVARIANT-01/02: LATE_* on HARD_LOCK → invalid label', () => {
    const pending = getSubmissionStatusMeta('LATE_PENDING', {
      latePolicy: 'HARD_LOCK',
      isFinal: true,
    });
    const approved = getSubmissionStatusMeta('LATE_APPROVED', {
      latePolicy: 'HARD_LOCK',
      isFinal: true,
    });
    assert.equal(pending.label, 'Trạng thái không hợp lệ (ck)');
    assert.equal(approved.invariantViolation, true);
  });

  it('countSubmissionBuckets splits not-submitted vs late', () => {
    const buckets = countSubmissionBuckets(
      [
        { submissionStatus: null },
        { submissionStatus: 'LATE_PENDING' },
        { submissionStatus: 'SUBMITTED' },
        { submissionStatus: 'REJECTED' },
      ],
      { latePolicy: 'ALLOW_LATE_PENDING', windowClosed: true },
    );
    assert.equal(buckets.gradable, 1);
    assert.equal(buckets.latePending, 1);
    assert.equal(buckets.rejected, 1);
    assert.equal(buckets.absentPastDeadline, 1);
  });
});
