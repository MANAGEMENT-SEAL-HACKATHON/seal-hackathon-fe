/**
 * Pure helpers mirroring Sprint1 Next/EarlyQA gates (T-03 / J-02).
 * Kept separate from the hook so Node unit tests do not need React DOM.
 */

export function canEarlyEndQa({ isCalibration, hasPresentationQueue, localTimerPhase, localRemainingSeconds }) {
  if (isCalibration || !hasPresentationQueue) return false;
  return localTimerPhase === 'QA' && localRemainingSeconds > 0;
}

export function canCallNextTeam({
  isCalibration,
  hasPresentationQueue,
  localTimerPhase,
  presentationScoringStatus,
}) {
  if (isCalibration || !hasPresentationQueue) return false;
  if (localTimerPhase !== 'ENDED') return false;
  const status = presentationScoringStatus;
  if (!status) return false;
  if (typeof status.allJudgesSubmitted === 'boolean') {
    return status.allJudgesSubmitted === true;
  }
  return Boolean(status.canAdvanceQueue);
}

export function shouldHideResetTimer(localTimerPhase) {
  return localTimerPhase === 'QA' || localTimerPhase === 'ENDED' || localTimerPhase === 'IDLE' || localTimerPhase === 'SETUP';
}
