import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractFinalEligibleTeamsFromQueue } from './finalEligibleTeams.js';

describe('extractFinalEligibleTeamsFromQueue', () => {
  it('reads eligibleTeams from final track bucket only once per team', () => {
    const teams = extractFinalEligibleTeamsFromQueue({
      tracks: [
        {
          trackId: null,
          trackName: 'Chung kết',
          eligibleTeams: [
            { teamId: 10, teamName: 'A' },
            { team_id: 11, team_name: 'B' },
            { teamId: 10, teamName: 'A-dup' },
          ],
        },
      ],
    });
    assert.equal(teams.length, 2);
    assert.equal(teams[0].id, 10);
    assert.equal(teams[0].teamName, 'A');
    assert.equal(teams[1].id, 11);
  });

  it('returns empty when no eligible list', () => {
    assert.deepEqual(extractFinalEligibleTeamsFromQueue({ tracks: [{ items: [] }] }), []);
    assert.deepEqual(extractFinalEligibleTeamsFromQueue(null), []);
  });
});
