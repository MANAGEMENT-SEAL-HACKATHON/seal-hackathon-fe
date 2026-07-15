// src/features/presentation/utils/presentationSubmissionUtils.js
/** Khớp BE `SubmissionGradablePolicy` — chỉ các status này vào hàng đợi khi xáo trộn. */
const GRADABLE_STATUSES = new Set(['SUBMITTED', 'LATE_APPROVED', 'ACCEPTED']);

export const isGradableSubmissionStatus = (status) =>
  Boolean(status && GRADABLE_STATUSES.has(String(status).toUpperCase()));

/**
 * @param {string|null|undefined} status
 * @param {{ latePolicy?: string, windowClosed?: boolean, isFinal?: boolean }} [options]
 */
export const getSubmissionStatusMeta = (status, options = {}) => {
  const { latePolicy, windowClosed = false, isFinal = false } = options;
  const hardLock =
    isFinal ||
    String(latePolicy || '').toUpperCase() === 'HARD_LOCK';
  const normalized = status == null || status === '' ? 'NONE' : String(status).toUpperCase();

  if (
    hardLock &&
    (normalized === 'LATE_PENDING' || normalized === 'LATE_APPROVED')
  ) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[INVARIANT_VIOLATION]', {
        code: 'HARD_LOCK_LATE_STATUS',
        status: normalized,
        latePolicy,
        isFinal,
      });
    }
    return {
      label: 'Trạng thái không hợp lệ (ck)',
      color: 'magenta',
      gradable: false,
      invariantViolation: true,
    };
  }

  if (normalized === 'NONE' || normalized === 'NULL' || normalized === 'UNDEFINED') {
    if (!windowClosed) {
      return { label: 'Chưa nộp', color: 'default', gradable: false };
    }
    if (hardLock) {
      return { label: 'Không nộp', color: 'default', gradable: false };
    }
    return { label: 'Hết hạn — không nộp', color: 'default', gradable: false };
  }

  switch (normalized) {
    case 'SUBMITTED':
      return { label: 'Nộp đúng hạn', color: 'green', gradable: true };
    case 'LATE_APPROVED':
      return { label: 'Nộp trễ — đã duyệt', color: 'blue', gradable: true };
    case 'ACCEPTED':
      return { label: 'Đã chấp nhận', color: 'green', gradable: true };
    case 'LATE_PENDING':
      return { label: 'Nộp trễ — chờ duyệt', color: 'orange', gradable: false };
    case 'LATE':
      return { label: 'Nộp trễ', color: 'orange', gradable: false };
    case 'REJECTED':
      return {
        label: hardLock ? 'Nộp trễ — từ chối' : 'Bị từ chối',
        color: 'red',
        gradable: false,
      };
    case 'DISQUALIFIED':
      return { label: 'Loại (vi phạm)', color: 'volcano', gradable: false };
    case 'ABSENT_NO_SUBMISSION':
      return {
        label: hardLock ? 'Không nộp' : 'Hết hạn — không nộp',
        color: 'default',
        gradable: false,
      };
  }
  return { label: 'Chưa nộp / không xác định', color: 'default', gradable: false };
};

export const countGradableSubmissions = (submissions = []) =>
  submissions.filter((s) => isGradableSubmissionStatus(s.status)).length;

/**
 * Split readiness counts for coordinator panels.
 */
export const countSubmissionBuckets = (eligibleTeams = [], options = {}) => {
  const buckets = {
    notSubmittedInWindow: 0,
    absentPastDeadline: 0,
    latePending: 0,
    rejected: 0,
    disqualified: 0,
    gradable: 0,
    invariantViolations: 0,
  };
  for (const team of eligibleTeams) {
    const status = team.submissionStatus ?? team.status ?? null;
    const meta = getSubmissionStatusMeta(status, options);
    if (meta.invariantViolation) buckets.invariantViolations += 1;
    if (meta.gradable) {
      buckets.gradable += 1;
      continue;
    }
    const n = status == null || status === '' ? 'NONE' : String(status).toUpperCase();
    if (n === 'LATE_PENDING') buckets.latePending += 1;
    else if (n === 'REJECTED') buckets.rejected += 1;
    else if (n === 'DISQUALIFIED') buckets.disqualified += 1;
    else if (n === 'NONE' || n === 'NULL') {
      if (options.windowClosed) buckets.absentPastDeadline += 1;
      else buckets.notSubmittedInWindow += 1;
    } else {
      buckets.absentPastDeadline += 1;
    }
  }
  return buckets;
};
