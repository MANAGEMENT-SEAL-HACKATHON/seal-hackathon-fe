import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveEventPhaseStatuses,
  isPastKickoffPhases,
} from './hackathonLifecycleSteps.js';

describe('isPastKickoffPhases', () => {
  it('true for PENDING_CONFIRM and FINISHED', () => {
    assert.equal(isPastKickoffPhases({ status: 'FINISHED' }), true);
    assert.equal(isPastKickoffPhases({ status: 'PENDING_CONFIRM' }), true);
    assert.equal(isPastKickoffPhases({ status: 'ONGOING' }), false);
    assert.equal(isPastKickoffPhases({ status: 'DRAFT' }), false);
  });
});

describe('resolveEventPhaseStatuses — FINISHED short-circuit GĐ2/GĐ4', () => {
  it('marks GĐ2 and GĐ4 finish when status=FINISHED even with empty teams / unpublished rounds', () => {
    const ctx = {
      hackathon: { status: 'FINISHED' },
      activeTeams: [],
      rounds: [
        {
          id: 1,
          isFinal: false,
          isActive: false,
          isPublished: false,
          scoringLocked: true,
        },
        {
          id: 2,
          isFinal: true,
          isActive: false,
          scoringLocked: true,
        },
      ],
      tracks: [],
      prizesCount: 1,
    };

    const statuses = resolveEventPhaseStatuses(ctx);
    // gd1, gd2, gd3, gd4, gd5, gd6
    assert.equal(statuses[0].status, 'finish', 'GĐ1');
    assert.equal(statuses[1].status, 'finish', 'GĐ2 short-circuit');
    assert.equal(statuses[2].status, 'finish', 'GĐ3 scoringLocked');
    assert.equal(statuses[3].status, 'finish', 'GĐ4 short-circuit');
    assert.equal(statuses[4].status, 'finish', 'GĐ5 scoringLocked');
    assert.equal(statuses[5].status, 'finish', 'GĐ6 FINISHED');

    assert.ok(statuses[1].subStatuses.every((s) => s === 'finish'), 'GĐ2 sub-steps');
    assert.ok(statuses[3].subStatuses.every((s) => s === 'finish'), 'GĐ4 sub-steps');
  });

  it('does not short-circuit GĐ2 for ONGOING with empty teams', () => {
    const ctx = {
      hackathon: { status: 'ONGOING' },
      activeTeams: [],
      rounds: [
        { id: 1, isFinal: false, isActive: false, isPublished: false, scoringLocked: false },
        { id: 2, isFinal: true, isActive: false, scoringLocked: false },
      ],
      tracks: [],
    };
    const statuses = resolveEventPhaseStatuses(ctx);
    assert.notEqual(statuses[1].status, 'finish');
  });
});
