// src/student/features/submission/utils/isPrelimReadOnly.js
/**
 * Bug5 / G5-A: prelim mutate UX locked when TRT is ADVANCED or ELIMINATED.
 */
export function isPrelimReadOnly(teamOrStatus) {
  if (teamOrStatus == null) return false;
  if (typeof teamOrStatus === 'string') {
    const s = teamOrStatus.toUpperCase();
    return s === 'ADVANCED' || s === 'ELIMINATED';
  }
  if (teamOrStatus.isPrelimReadOnly === true) return true;
  if (teamOrStatus.isAdvanced === true || teamOrStatus.isEliminatedFromFinal === true) return true;
  const raw = String(
    teamOrStatus.participationStatus
      ?? teamOrStatus.lotteryStatus
      ?? teamOrStatus.lottery_status
      ?? '',
  ).toUpperCase();
  return raw === 'ADVANCED' || raw === 'ELIMINATED';
}
