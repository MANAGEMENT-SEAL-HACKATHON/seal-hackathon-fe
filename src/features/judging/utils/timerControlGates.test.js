import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canCallNextTeam,
  canEarlyEndQa,
  shouldWarnQaScoringDeadline,
} from './timerControlGates.js';

describe('timerControlGates', () => {
  it('canEarlyEndQa only in QA with time left AND all judges chốt', () => {
    assert.equal(
      canEarlyEndQa({
        hasPresentationQueue: true,
        localTimerPhase: 'QA',
        localRemainingSeconds: 30,
        presentationScoringStatus: { allJudgesSubmitted: true },
      }),
      true,
    );
    assert.equal(
      canEarlyEndQa({
        hasPresentationQueue: true,
        localTimerPhase: 'QA',
        localRemainingSeconds: 30,
        presentationScoringStatus: { allJudgesSubmitted: false },
      }),
      false,
    );
    assert.equal(
      canEarlyEndQa({
        hasPresentationQueue: true,
        localTimerPhase: 'QA',
        localRemainingSeconds: 0,
        presentationScoringStatus: { allJudgesSubmitted: true },
      }),
      false,
    );
  });

  it('canCallNextTeam: ENDED + complete, or natural end with some scores', () => {
    assert.equal(
      canCallNextTeam({
        hasPresentationQueue: true,
        localTimerPhase: 'ENDED',
        presentationScoringStatus: { allJudgesSubmitted: true },
      }),
      true,
    );
    assert.equal(
      canCallNextTeam({
        hasPresentationQueue: true,
        localTimerPhase: 'ENDED',
        presentationScoringStatus: {
          allJudgesSubmitted: false,
          qaEndedEarly: false,
          judgesScored: 1,
        },
      }),
      true,
    );
    assert.equal(
      canCallNextTeam({
        hasPresentationQueue: true,
        localTimerPhase: 'ENDED',
        presentationScoringStatus: {
          allJudgesSubmitted: false,
          qaEndedEarly: true,
          judgesScored: 1,
        },
      }),
      false,
    );
  });

  it('shouldWarnQaScoringDeadline when ≤ 1/3 of Q&A remains if not chốt', () => {
    // Q&A 3 phút → warn ≤ 60s
    assert.equal(
      shouldWarnQaScoringDeadline({
        localTimerPhase: 'QA',
        localRemainingSeconds: 60,
        hasScoredCurrentTeam: false,
        qaMinutes: 3,
      }),
      true,
    );
    assert.equal(
      shouldWarnQaScoringDeadline({
        localTimerPhase: 'QA',
        localRemainingSeconds: 61,
        hasScoredCurrentTeam: false,
        qaMinutes: 3,
      }),
      false,
    );
    // Q&A 1 phút → warn ≤ 20s
    assert.equal(
      shouldWarnQaScoringDeadline({
        localTimerPhase: 'QA',
        localRemainingSeconds: 20,
        hasScoredCurrentTeam: false,
        qaMinutes: 1,
      }),
      true,
    );
    assert.equal(
      shouldWarnQaScoringDeadline({
        localTimerPhase: 'QA',
        localRemainingSeconds: 21,
        hasScoredCurrentTeam: false,
        qaMinutes: 1,
      }),
      false,
    );
    // Q&A 2 phút → warn ≤ 40s
    assert.equal(
      shouldWarnQaScoringDeadline({
        localTimerPhase: 'QA',
        localRemainingSeconds: 40,
        hasScoredCurrentTeam: false,
        qaMinutes: 2,
      }),
      true,
    );
    assert.equal(
      shouldWarnQaScoringDeadline({
        localTimerPhase: 'QA',
        localRemainingSeconds: 60,
        hasScoredCurrentTeam: true,
        qaMinutes: 3,
      }),
      false,
    );
    assert.equal(
      shouldWarnQaScoringDeadline({
        localTimerPhase: 'PRESENTING',
        localRemainingSeconds: 60,
        hasScoredCurrentTeam: false,
        qaMinutes: 3,
      }),
      false,
    );
    assert.equal(
      shouldWarnQaScoringDeadline({
        localTimerPhase: 'QA',
        localRemainingSeconds: 0,
        hasScoredCurrentTeam: false,
        qaMinutes: 3,
      }),
      false,
    );
  });
});
