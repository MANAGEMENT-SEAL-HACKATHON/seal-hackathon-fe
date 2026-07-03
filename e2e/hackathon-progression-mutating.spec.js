import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  isBackendReady,
  login,
} from './helpers/api.js';
import { isMutatingEnabled, publishRound, advanceRound, getRoundRanking } from './helpers/progressionApiHelpers.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const ADVANCE_READY_SEED = 'seal-gd4-advance-ready';

/**
 * Mutating tests — restart BE dev profile after run to reset seeds.
 * Run: E2E_MUTATING=1 npm run test:e2e:mutating
 */
test.describe('Hackathon progression (mutating)', () => {
  test.beforeAll(async () => {
    test.skip(!isMutatingEnabled(), 'E2E_MUTATING=1 required');
    const ready = await isBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
  });

  test('API publish + advance on advance-ready seed', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(ADVANCE_READY_SEED, token);
    test.skip(!hackathon, `Seed ${ADVANCE_READY_SEED} not found`);

    const prelim = await findPrelimRound(hackathon.id, token);
    test.skip(!prelim, 'No prelim');

    if (!prelim.is_published && !prelim.isPublished) {
      try {
        await publishRound(prelim.id, token);
      } catch (err) {
        const alreadyPublished = /đã được công bố/i.test(err.message || '');
        if (!alreadyPublished) throw err;
      }
    }

    const ranking = await getRoundRanking(prelim.id, token);
    const items = Array.isArray(ranking) ? ranking : ranking?.items || ranking?.rankings || [];
    test.skip(items.length === 0, 'No ranking items');

    const advancedBefore = items.filter(
      (i) => i.isAdvanced || i.is_advanced || i.participationStatus === 'ADVANCED',
    ).length;
    if (advancedBefore === 0) {
      const teamIds = items.map((i) => i.teamId ?? i.team_id).filter(Boolean);
      const topN = Number(ranking?.topNAdvance ?? ranking?.top_n_advance ?? 2);
      await advanceRound(
        prelim.id,
        { advancedTeamIds: teamIds.slice(0, topN || 2), eliminatedTeamIds: teamIds.slice(topN || 2), note: 'e2e' },
        token,
      );
    }

    const after = await getRoundRanking(prelim.id, token);
    const afterItems = Array.isArray(after) ? after : after?.items || [];
    const advancedCount = afterItems.filter(
      (i) => i.isAdvanced || i.is_advanced || i.participationStatus === 'ADVANCED',
    ).length;
    expect(advancedCount).toBeGreaterThan(0);
  });
});
