import assert from 'node:assert/strict';
import {
  canCloseEarly,
  canLockScoring,
  canReleaseProblem,
  canShuffleQueue,
  getReleaseProblemTooltip,
  getShuffleQueueTooltip,
  hasReachedExam,
} from './roundLifecycleGates.js';

const now = new Date('2026-07-18T07:00:00.000Z');
const futureExam = new Date(Date.now() + 60_000).toISOString();
const pastExam = new Date(Date.now() - 60_000).toISOString();
const fixedFutureExam = new Date('2026-07-18T08:00:00.000Z').toISOString();
const fixedPastExam = new Date('2026-07-18T06:00:00.000Z').toISOString();
const pastDeadline = new Date('2026-07-18T06:30:00.000Z').toISOString();

{
  // EARLY-WAIT-01: waiting window — release locked with Vietnamese tooltip
  const waiting = {
    is_active: true,
    isActive: true,
    exam_at: futureExam,
    examAt: futureExam,
    problem_released_at: null,
  };
  assert.equal(hasReachedExam(waiting), false);
  assert.equal(canReleaseProblem(waiting), false);
  assert.match(getReleaseProblemTooltip(waiting), /Chưa tới giờ thi/);
}

{
  // After examAt and still active — release allowed
  const ready = {
    is_active: true,
    isActive: true,
    exam_at: pastExam,
    examAt: pastExam,
    problem_released_at: null,
  };
  assert.equal(hasReachedExam(ready), true);
  assert.equal(canReleaseProblem(ready), true);
  assert.equal(getReleaseProblemTooltip(ready), 'Phát đề bài');
}

{
  // Already released — cannot release again
  const released = {
    is_active: true,
    exam_at: pastExam,
    problem_released_at: pastExam,
  };
  assert.equal(canReleaseProblem(released), false);
  assert.match(getReleaseProblemTooltip(released), /Đã được phát|đã được phát/i);
}

{
  // Close early remains locked until both exam time and problem release are reached
  const beforeExam = {
    is_active: true,
    exam_at: fixedFutureExam,
    problem_released_at: fixedPastExam,
  };
  const notReleased = {
    is_active: true,
    exam_at: fixedPastExam,
    problem_released_at: null,
  };
  const readyToClose = {
    is_active: true,
    exam_at: fixedPastExam,
    problem_released_at: fixedPastExam,
  };
  assert.equal(canCloseEarly(beforeExam, now), false);
  assert.equal(canCloseEarly(notReleased, now), false);
  assert.equal(canCloseEarly(readyToClose, now), true);
}

{
  // Queue cannot be shuffled while a late submission is awaiting review
  const closed = {
    is_active: true,
    submission_deadline: pastDeadline,
  };
  assert.equal(canShuffleQueue(closed, now), true);
  assert.equal(canShuffleQueue(closed, now, { hasLatePending: true }), false);
}

{
  const closed = { is_active: true, submission_deadline: pastDeadline };
  assert.match(
    getShuffleQueueTooltip(closed, now, { hasLatePending: true, latePendingCount: 2 }),
    /Còn 2 đội nộp trễ chưa xử lý/,
  );
}

{
  // Scoring can only lock after close + shuffle + all presentations complete
  const lockReady = {
    submission_deadline: pastDeadline,
    is_presentation_shuffled: true,
    is_presentations_complete: true,
    scoring_locked: false,
  };
  assert.equal(canLockScoring(lockReady, now), true);
  assert.equal(
    canLockScoring({ ...lockReady, is_presentations_complete: false }, now),
    false,
  );
  assert.equal(canLockScoring({ ...lockReady, scoring_locked: true }, now), false);
}

console.log('roundLifecycleGates transition tests OK');
