import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canCallNextTeam, canEarlyEndQa } from './timerControlGates.js';

describe('timerControlGates', () => {
  it('canEarlyEndQa only in QA with remaining time', () => {
    assert.equal(
      canEarlyEndQa({
        hasPresentationQueue: true,
        localTimerPhase: 'QA',
        localRemainingSeconds: 30,
      }),
      true,
    );
    assert.equal(
      canEarlyEndQa({
        hasPresentationQueue: true,
        localTimerPhase: 'QA',
        localRemainingSeconds: 0,
      }),
      false,
    );
    assert.equal(
      canEarlyEndQa({
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
        hasPresentationQueue: true,
        localTimerPhase: 'QA',
        presentationScoringStatus: { allJudgesSubmitted: true },
      }),
      false,
    );

    assert.equal(
      canCallNextTeam({
        hasPresentationQueue: true,
        localTimerPhase: 'ENDED',
        presentationScoringStatus: {
          allJudgesSubmitted: false,
          canAdvanceQueue: true,
        },
      }),
      false,
    );

    assert.equal(
      canCallNextTeam({
        hasPresentationQueue: true,
        localTimerPhase: 'ENDED',
        presentationScoringStatus: { allJudgesSubmitted: true },
      }),
      true,
    );
  });
});
