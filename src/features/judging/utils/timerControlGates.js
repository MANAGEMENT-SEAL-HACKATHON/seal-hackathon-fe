/**
 * Pure helpers mirroring Sprint1 Next/EarlyQA gates (T-03 / J-02).
 * Kept separate from the hook so Node unit tests do not need React DOM.
 *
 * Nghiệp vụ Q&A (rõ ràng):
 * - Trong Q&A: GK nghe → chấm → HOÀN TẤT & CHỐT SỔ ĐIỂM.
 * - Kết thúc sớm: chỉ khi MỌI GK đã chốt (tránh kết thúc khi còn đứng hỏi/lo lót).
 * - Hết giờ tự nhiên: KHÔNG đợi GK quên/chấm thiếu — ghi nhận điểm đã có trên bảng
 *   (thiếu tiêu chí / thiếu GK cũng được), rồi cho Next. Không “đợi hoài”.
 *   Chỉ chặn Next nếu chưa có điểm nào cả (NO_SCORES) — tránh chuyển đội trắng điểm.
 * - Còn ~1/3 thời gian Q&A: cảnh báo GK chưa chốt để họ kịp hoàn tất.
 */

/** @deprecated Prefer qaWarnThresholdSeconds(qaTotalSeconds) — kept for callers expecting a number. */
export const QA_SCORING_WARN_SECONDS = 60; // default khi Q&A = 3 phút

/** Ngưỡng cảnh báo = ceil(1/3 thời lượng Q&A), tối thiểu 1 giây. */
export function qaWarnThresholdSeconds(qaTotalSeconds) {
  const total = Number(qaTotalSeconds);
  if (!Number.isFinite(total) || total <= 0) return QA_SCORING_WARN_SECONDS;
  return Math.max(1, Math.ceil(total / 3));
}

export function canEarlyEndQa({
  hasPresentationQueue,
  localTimerPhase,
  localRemainingSeconds,
  presentationScoringStatus,
}) {
  if (!hasPresentationQueue) return false;
  if (localTimerPhase !== 'QA' || !(localRemainingSeconds > 0)) return false;
  return presentationScoringStatus?.allJudgesSubmitted === true;
}

export function canCallNextTeam({
  hasPresentationQueue,
  localTimerPhase,
  presentationScoringStatus,
}) {
  if (!hasPresentationQueue) return false;
  if (localTimerPhase !== 'ENDED') return false;
  const status = presentationScoringStatus;
  if (!status) return false;
  if (status.allJudgesSubmitted === true || status.canAdvanceQueue === true) {
    return true;
  }
  // Hết giờ tự nhiên: thiếu tiêu chí / thiếu GK chốt vẫn Next được nếu đã có ≥1 điểm trên bảng
  if (status.qaEndedEarly === false && (status.judgesScored ?? 0) > 0) {
    return true;
  }
  return false;
}

/**
 * Cảnh báo GK chưa chốt khi còn ≤ 1/3 thời gian Q&A.
 * Truyền qaMinutes hoặc qaTotalSeconds (ưu tiên qaTotalSeconds).
 */
export function shouldWarnQaScoringDeadline({
  localTimerPhase,
  localRemainingSeconds,
  hasScoredCurrentTeam,
  qaMinutes,
  qaTotalSeconds,
}) {
  if (hasScoredCurrentTeam) return false;
  if (localTimerPhase !== 'QA') return false;
  const left = Number(localRemainingSeconds);
  if (!Number.isFinite(left) || left <= 0) return false;
  const total =
    qaTotalSeconds != null && Number.isFinite(Number(qaTotalSeconds))
      ? Number(qaTotalSeconds)
      : Number(qaMinutes) * 60;
  const warnAt = qaWarnThresholdSeconds(total);
  return left <= warnAt;
}

export function shouldHideResetTimer(localTimerPhase) {
  return localTimerPhase === 'QA' || localTimerPhase === 'ENDED' || localTimerPhase === 'IDLE' || localTimerPhase === 'SETUP';
}
