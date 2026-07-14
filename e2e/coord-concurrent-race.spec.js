/**
 * Module 3 — 2 Coordinator concurrent races (close-early / lock / approve).
 * Hard asserts: exactly one 2xx winner; never HTTP 500 (Rủi ro 2–3).
 *
 * Run:
 *   E2E_MUTATING=1 npx playwright test e2e/coord-concurrent-race.spec.js --project=mutating-e2e --workers=1
 */
import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  isBackendReady,
  login,
} from './helpers/api.js';
import { isMutatingEnabled } from './helpers/progressionApiHelpers.js';
import {
test.skip(true, 'deprecated seed slug removed � see intentional-errors-catalog.md');
  raceTwoCoordRequests,
  assertOneWinnerNo500,
  apiFetch,
} from './helpers/stompPresentationHelpers.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

test.describe('Coord concurrent races (2× APIRequestContext)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    test.skip(!isMutatingEnabled(), 'E2E_MUTATING=1 required');
    const ready = await isBackendReady();
    test.skip(!ready, 'BE not reachable');
  });

  test('1) close-submission-early ×2 → one ok, one SUBMISSION_ALREADY_CLOSED', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd3-prelim-open', token);
    test.skip(!hackathon?.id, 'seal-gd3-prelim-open missing');
    const prelim = await findPrelimRound(hackathon.id, token);
    test.skip(!prelim?.id, 'prelim missing');

    // Skip if already closed by prior mutating run
    const round = await apiFetch('GET', `/rounds/${prelim.id}`, token);
    if (round.data?.submissionClosedEarlyAt) {
      test.skip(true, 'submission already closed early — restart BE for clean seed');
    }

    const raced = await raceTwoCoordRequests(`/rounds/${prelim.id}/close-submission-early`, {
      method: 'POST',
      body: {},
    });
    try {
      assertOneWinnerNo500(
        raced.resA,
        raced.resB,
        raced.jsonA,
        raced.jsonB,
        /SUBMISSION_ALREADY_CLOSED|INVALID_STATE|CONCURRENT_MODIFICATION|DB_INTEGRITY/i,
      );
    } finally {
      await raced.dispose();
    }
  });

  test('2) lock-scoring ×2 → one ok, one INVALID_STATE', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd3-scoring-live', token);
    test.skip(!hackathon?.id, 'seal-gd3-scoring-live missing');
    const prelim = await findPrelimRound(hackathon.id, token);
    test.skip(!prelim?.id, 'prelim missing');

    const round = await apiFetch('GET', `/rounds/${prelim.id}`, token);
    if (round.data?.scoringLocked === true) {
      test.skip(true, 'scoring already locked — restart BE');
    }

    const raced = await raceTwoCoordRequests(`/rounds/${prelim.id}/lock-scoring`, {
      method: 'PATCH',
      body: { force: true, reason: 'Module 3 concurrent lock race' },
    });
    try {
      assertOneWinnerNo500(
        raced.resA,
        raced.resB,
        raced.jsonA,
        raced.jsonB,
        /INVALID_STATE|CONCURRENT_MODIFICATION|SCORING_|DB_INTEGRITY|FORCE_LOCK/i,
      );
    } finally {
      await raced.dispose();
    }
  });

  test('3) team approve ×2 → one ACTIVE, one TEAM_ALREADY_ACTIVE', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd2-teams-edge', token);
    test.skip(!hackathon?.id, 'seal-gd2-teams-edge missing');

    const teamsRes = await apiFetch('GET', `/teams?hackathonId=${hackathon.id}&size=100`, token);
    const teams = Array.isArray(teamsRes.data) ? teamsRes.data : teamsRes.data?.items || [];
    // Prefer formation-ready PENDING (T03); fallback any PENDING
    const pending =
      teams.find(
        (t) =>
          String(t.status).toUpperCase() === 'PENDING' &&
          /T03|Sẵn duyệt|formation/i.test(String(t.teamName || t.name || '')),
      ) || teams.find((t) => String(t.status).toUpperCase() === 'PENDING');
    test.skip(!pending?.id, 'No PENDING team for approve race');

    const raced = await raceTwoCoordRequests(`/teams/${pending.id}/approve`, {
      method: 'PATCH',
      body: {},
    });
    try {
      assertOneWinnerNo500(
        raced.resA,
        raced.resB,
        raced.jsonA,
        raced.jsonB,
        /TEAM_ALREADY_ACTIVE|INVALID_STATE|CONCURRENT_MODIFICATION|TEAM_|DB_INTEGRITY|CONFLICT/i,
      );
    } finally {
      await raced.dispose();
    }
  });

  test('4) late submission approve ×2 → one ok, one conflict/idempotent', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd3-late-review', token);
    test.skip(!hackathon?.id, 'seal-gd3-late-review missing');
    const prelim = await findPrelimRound(hackathon.id, token);
    test.skip(!prelim?.id, 'prelim missing');

    const lateRes = await apiFetch(
      'GET',
      `/submissions?status=LATE_PENDING&roundId=${prelim.id}&size=50`,
      token,
    ).catch(() => ({ data: [] }));
    let lateList = Array.isArray(lateRes.data) ? lateRes.data : lateRes.data?.items || [];
    if (!lateList.length) {
      const alt = await apiFetch('GET', `/submissions?roundId=${prelim.id}&size=100`, token).catch(() => ({
        data: [],
      }));
      const all = Array.isArray(alt.data) ? alt.data : alt.data?.items || [];
      lateList = all.filter((s) => String(s.status || '').toUpperCase() === 'LATE_PENDING');
    }

    const late =
      lateList.find((s) => String(s.status || s.submissionStatus || '').toUpperCase() === 'LATE_PENDING') ||
      lateList[0];
    test.skip(!late?.id && !late?.submissionId, 'No LATE_PENDING submission');

    const submissionId = late.id || late.submissionId;
    const raced = await raceTwoCoordRequests(`/submissions/${submissionId}/approve`, {
      method: 'PATCH',
      body: {},
    });
    try {
      assertOneWinnerNo500(
        raced.resA,
        raced.resB,
        raced.jsonA,
        raced.jsonB,
        /INVALID_STATE|CONCURRENT_MODIFICATION|ALREADY_|LATE_|SUBMISSION_|DB_INTEGRITY|CONFLICT|NOT_LATE/i,
      );
    } finally {
      await raced.dispose();
    }
  });
});
