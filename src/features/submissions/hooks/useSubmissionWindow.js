import { useMemo } from 'react';
import {
  getSubmissionDeadline,
  getClosedEarlyAt,
  getExamAt,
  isSubmissionClosed,
} from '../../rounds/utils/roundLifecycleGates';

/**
 * Shared submission window source for student/coord/judge messaging (A2).
 * @param {object|null} round
 * @param {Date} [now]
 */
export function useSubmissionWindow(round, now = new Date()) {
  return useMemo(() => {
    const deadline = getSubmissionDeadline(round);
    const closedEarlyAt = getClosedEarlyAt(round);
    const examAt = getExamAt(round);
    const closed = isSubmissionClosed(round, now);
    const deadlineMs = deadline ? new Date(deadline).getTime() : null;
    const nowMs = new Date(now).getTime();
    const msRemaining =
      closed || deadlineMs == null ? 0 : Math.max(0, deadlineMs - nowMs);

    let phase;
    if (!round) phase = 'UNKNOWN';
    else if (closed) phase = 'CLOSED';
    else if (examAt && nowMs < new Date(examAt).getTime()) phase = 'BEFORE_EXAM';
    else phase = 'OPEN';

    return {
      deadline,
      closedEarlyAt,
      examAt,
      closed,
      phase,
      msRemaining,
      label:
        phase === 'CLOSED'
          ? 'Đã đóng cửa sổ nộp bài'
          : phase === 'BEFORE_EXAM'
            ? 'Chưa tới giờ thi'
            : 'Đang trong cửa sổ nộp bài',
    };
  }, [round, now]);
}

export default useSubmissionWindow;
