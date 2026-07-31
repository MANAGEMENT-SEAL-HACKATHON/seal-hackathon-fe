/**
 * Bộ kiểm soát vòng đời vòng thi — đồng bộ với BE gatekeeper (GD3 + GD5).
 * Accepts FE-mapped round (snake_case) or raw BE (camelCase).
 */

const pick = (round, ...keys) => {
  if (!round) return undefined;
  for (const k of keys) {
    if (round[k] !== undefined && round[k] !== null) return round[k];
  }
  return undefined;
};

export const isRoundActive = (round) =>
  Boolean(pick(round, 'is_active', 'isActive'));

export const getProblemReleasedAt = (round) =>
  pick(round, 'problem_released_at', 'problemReleasedAt');

export const getExamAt = (round) => pick(round, 'exam_at', 'examAt');

export const getSubmissionDeadline = (round) =>
  pick(round, 'submission_deadline', 'submissionDeadline');

export const getClosedEarlyAt = (round) =>
  pick(round, 'submission_closed_early_at', 'submissionClosedEarlyAt');

export const isPresentationShuffled = (round) =>
  Boolean(pick(round, 'is_presentation_shuffled', 'isPresentationShuffled'));

export const isPresentationsComplete = (round) =>
  Boolean(pick(round, 'is_presentations_complete', 'isPresentationsComplete'));

export const isScoringLocked = (round) =>
  Boolean(pick(round, 'scoring_locked', 'scoringLocked'));

export const hasReachedExam = (round, now = new Date()) => {
  const examAt = getExamAt(round);
  if (!examAt) return false;
  return new Date(examAt).getTime() <= new Date(now).getTime();
};

/** Phát đề: chỉ hiện khi Active + chưa release + đã tới examAt. */
export const canReleaseProblem = (round) =>
  isRoundActive(round) && hasReachedExam(round) && !getProblemReleasedAt(round);

export const canCloseEarly = (round, now = new Date()) =>
  isRoundActive(round) &&
  Boolean(getProblemReleasedAt(round)) &&
  hasReachedExam(round, now) &&
  !getClosedEarlyAt(round) &&
  !isScoringLocked(round);

export const isSubmissionClosed = (round, now = new Date()) => {
  if (getClosedEarlyAt(round)) return true;
  const deadline = getSubmissionDeadline(round);
  if (!deadline) return false;
  // Align with BE: now >= deadline (closed)
  return new Date(now).getTime() >= new Date(deadline).getTime();
};

export const canOpenPresentationQueue = (round, now = new Date()) =>
  isSubmissionClosed(round, now) && !isScoringLocked(round);

/** Alias for presentation queue shuffle / open — same base gate; optionally block on late-pending. */
export const canShuffleQueue = (round, now = new Date(), options = {}) => {
  if (!canOpenPresentationQueue(round, now)) return false;
  if (options.hasLatePending) return false;
  return true;
};

export const getShuffleQueueTooltip = (round, now = new Date(), options = {}) => {
  if (isScoringLocked(round)) return 'Round đã khóa chấm — không xáo hàng đợi.';
  if (!isSubmissionClosed(round, now)) {
    return 'Chờ hết hạn nộp bài';
  }
  if (options.hasLatePending) {
    const n = Number(options.latePendingCount);
    if (Number.isFinite(n) && n > 0) {
      return `Còn ${n} đội nộp trễ chưa xử lý — duyệt hoặc từ chối trước khi quay số.`;
    }
    return 'Còn đội «Nộp trễ — chờ duyệt» — duyệt hoặc từ chối trước khi quay số.';
  }
  return 'Xáo trộn hàng đợi thuyết trình';
};

export const canLockScoring = (round, now = new Date()) =>
  isSubmissionClosed(round, now) &&
  isPresentationShuffled(round) &&
  isPresentationsComplete(round) &&
  !isScoringLocked(round);

export const getReleaseProblemTooltip = (round) => {
  if (!isRoundActive(round)) return 'Vòng thi chưa được kích hoạt.';
  if (getProblemReleasedAt(round)) return 'Đề bài đã được phát.';
  if (!hasReachedExam(round)) return 'Chưa tới giờ thi — chưa thể phát đề.';
  return 'Phát đề bài';
};

export const getCloseEarlyTooltip = (round, now = new Date()) => {
  if (!getProblemReleasedAt(round)) return 'Vòng thi chưa được phát đề.';
  if (!hasReachedExam(round, now)) {
    return 'Đang trong thời gian chờ (Waiting), chưa thể kết thúc sớm.';
  }
  return 'Kết thúc thời gian thi sớm (cần mọi đội đã nộp — xác nhận trong hộp thoại)';
};

export const getLockScoringTooltip = (round, now = new Date()) => {
  if (!isSubmissionClosed(round, now)) {
    return 'Chỉ có thể khóa chấm sau khi vòng thi đã kết thúc (Hết giờ hoặc đóng sớm).';
  }
  if (!isPresentationShuffled(round)) {
    return 'Vòng thi chưa được xáo trộn hàng đợi thuyết trình.';
  }
  if (!isPresentationsComplete(round)) {
    return 'Còn nhóm đang chờ hoặc đang thực hiện thuyết trình.';
  }
  return 'Khóa chấm điểm';
};

export const getOpenQueueTooltip = (round, now = new Date()) => {
  if (!isSubmissionClosed(round, now)) {
    return 'Chỉ mở hàng đợi sau khi vòng thi đã kết thúc (hết giờ hoặc kết thúc sớm).';
  }
  return 'Mở hàng đợi thuyết trình';
};
