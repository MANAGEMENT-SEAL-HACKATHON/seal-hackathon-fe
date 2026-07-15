import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canCallNextTeam, canEarlyEndQa, shouldHideResetTimer } from './timerControlGates.js';

describe('timerControlGates (Bug2 / T-03)', () => {
  it('canEarlyEndQa only in QA with remaining time', () => {
    assert.equal(
      canEarlyEndQa({
        isCalibration: false,
        hasPresentationQueue: true,
        localTimerPhase: 'QA',
        localRemainingSeconds: 30,
      }),
      true,
    );
    assert.equal(
      canEarlyEndQa({
        isCalibration: false,
        hasPresentationQueue: true,
        localTimerPhase: 'QA',
        localRemainingSeconds: 0,
      }),
      false,
    );
    assert.equal(
      canEarlyEndQa({
        isCalibration: false,
        hasPresentationQueue: true,
        localTimerPhase: 'ENDED',
        localRemainingSeconds: 0,
      }),
      false,
    );
  });

  it('canCallNextTeam requires ENDED + allJudgesSubmitted (no FE derive)', () => {
    assert.equal(
      canCallNextTeam({
        isCalibration: false,
        hasPresentationQueue: true,
        localTimerPhase: 'QA',
        presentationScoringStatus: { allJudgesSubmitted: true },
      }),
      false,
    );

    assert.equal(
      canCallNextTeam({
        isCalibration: false,
        hasPresentationQueue: true,
        localTimerPhase: 'ENDED',
        presentationScoringStatus: {
          allJudgesSubmitted: false,
          judgesConfirmed: 2,
          judgesAssigned: 2,
        },
      }),
      false,
    );

    assert.equal(
      canCallNextTeam({
        isCalibration: false,
        hasPresentationQueue: true,
        localTimerPhase: 'ENDED',
        presentationScoringStatus: { allJudgesSubmitted: true },
      }),
      true,
    );
  });

  it('hides Reset on QA/ENDED', () => {
    assert.equal(shouldHideResetTimer('PRESENTING'), false);
    assert.equal(shouldHideResetTimer('QA'), true);
    assert.equal(shouldHideResetTimer('ENDED'), true);
  });
});
