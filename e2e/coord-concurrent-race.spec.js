/**
 * Module 3 — 2 Coordinator concurrent races (close-early / lock / approve).
 * Hard asserts: exactly one 2xx winner; never HTTP 500.
 * Chỉ dùng happy seeds còn sống (không phụ thuộc slug deprecated).
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
  raceTwoCoordRequests,
  assertOneWinnerNo500,
  apiFetch,
} from './helpers/stompPresentationHelpers.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';

test.describe('Coord concurrent races (2× APIRequestContext)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test.beforeAll(async () => {
    expect(isMutatingEnabled(), 'E2E_MUTATING=1 required').toBeTruthy();
    const ready = await isBackendReady();
    expect(ready, 'BE not reachable').toBeTruthy();
  });

  test('1) close-submission-early ×2 → one ok, one SUBMISSION_ALREADY_CLOSED', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd3-prelim-open', token);
    expect(hackathon?.id, 'seal-gd3-prelim-open missing — restart BE (create-drop)').toBeTruthy();
    const prelim = await findPrelimRound(hackathon.id, token);
    expect(prelim?.id, 'prelim missing').toBeTruthy();

    const round = await apiFetch('GET', `/rounds/${prelim.id}`, token);
    const alreadyClosed = Boolean(round.data?.submissionClosedEarlyAt);

    const raced = await raceTwoCoordRequests(`/rounds/${prelim.id}/close-submission-early`, {
      method: 'POST',
      body: {},
    });
    try {
      const sA = raced.resA.status();
      const sB = raced.resB.status();
      expect(sA, `A must not be 500: ${JSON.stringify(raced.jsonA)}`).not.toBe(500);
      expect(sB, `B must not be 500: ${JSON.stringify(raced.jsonB)}`).not.toBe(500);
      if (alreadyClosed) {
        // seed bẩn từ run trước — cả hai phải 4xx named, không 500
        expect(sA).toBeGreaterThanOrEqual(400);
        expect(sA).toBeLessThan(500);
        expect(sB).toBeGreaterThanOrEqual(400);
        expect(sB).toBeLessThan(500);
      } else {
        assertOneWinnerNo500(
          raced.resA,
          raced.resB,
          raced.jsonA,
          raced.jsonB,
          /SUBMISSION_ALREADY_CLOSED|INVALID_STATE|CONCURRENT_MODIFICATION|DB_INTEGRITY/i,
        );
      }
    } finally {
      await raced.dispose();
    }
  });

  test('2) lock-scoring ×2 trên GĐ4 advance-ready → one ok hoặc đúng gate, never 500', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd4-advance-ready', token);
    expect(hackathon?.id, 'seal-gd4-advance-ready missing').toBeTruthy();
    const prelim = await findPrelimRound(hackathon.id, token);
    expect(prelim?.id, 'prelim missing').toBeTruthy();

    const round = await apiFetch('GET', `/rounds/${prelim.id}`, token);
    const alreadyLocked = round.data?.scoringLocked === true;

    const raced = await raceTwoCoordRequests(`/rounds/${prelim.id}/lock-scoring`, {
      method: 'PATCH',
      body: { force: true, reason: 'Module 3 concurrent lock race' },
    });
    try {
      const sA = raced.resA.status();
      const sB = raced.resB.status();
      expect(sA, `A must not be 500: ${JSON.stringify(raced.jsonA)}`).not.toBe(500);
      expect(sB, `B must not be 500: ${JSON.stringify(raced.jsonB)}`).not.toBe(500);
      if (alreadyLocked) {
        // cả hai phải 4xx có tên — không Lost Update, không 500
        expect(sA).toBeGreaterThanOrEqual(400);
        expect(sA).toBeLessThan(500);
        expect(sB).toBeGreaterThanOrEqual(400);
        expect(sB).toBeLessThan(500);
      } else {
        assertOneWinnerNo500(
          raced.resA,
          raced.resB,
          raced.jsonA,
          raced.jsonB,
          /INVALID_STATE|CONCURRENT_MODIFICATION|SCORING_|DB_INTEGRITY|FORCE_LOCK|ALREADY_/i,
        );
      }
    } finally {
      await raced.dispose();
    }
  });

  test('3) publish ×2 trên GĐ4 prelim → one ok hoặc cả hai 4xx named, never 500', async () => {
    // Happy seed seal-e2e không còn PENDING team (tất cả ACTIVE) — race publish thay approve.
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd4-advance-ready', token);
    expect(hackathon?.id, 'seal-gd4-advance-ready missing').toBeTruthy();
    const prelim = await findPrelimRound(hackathon.id, token);
    expect(prelim?.id, 'prelim missing').toBeTruthy();

    const round = await apiFetch('GET', `/rounds/${prelim.id}`, token);
    const alreadyPublished = round.data?.isPublished === true;

    const raced = await raceTwoCoordRequests(`/rounds/${prelim.id}/publish`, {
      method: 'PATCH',
      body: {},
    });
    try {
      const sA = raced.resA.status();
      const sB = raced.resB.status();
      expect(sA, `A must not be 500: ${JSON.stringify(raced.jsonA)}`).not.toBe(500);
      expect(sB, `B must not be 500: ${JSON.stringify(raced.jsonB)}`).not.toBe(500);
      if (alreadyPublished) {
        expect(sA).toBeGreaterThanOrEqual(400);
        expect(sA).toBeLessThan(500);
        expect(sB).toBeGreaterThanOrEqual(400);
        expect(sB).toBeLessThan(500);
      } else {
        assertOneWinnerNo500(
          raced.resA,
          raced.resB,
          raced.jsonA,
          raced.jsonB,
          /ALREADY_|INVALID_STATE|CONCURRENT_MODIFICATION|PUBLISH_|DB_INTEGRITY|CONFLICT/i,
        );
      }
    } finally {
      await raced.dispose();
    }
  });

  test('4) late submission approve ×2 trên seal-gd3-prelim-open → one ok, one conflict', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd3-prelim-open', token);
    expect(hackathon?.id, 'seal-gd3-prelim-open missing').toBeTruthy();
    const prelim = await findPrelimRound(hackathon.id, token);
    expect(prelim?.id, 'prelim missing').toBeTruthy();

    // Inject LATE_PENDING nếu seed chưa có (sau close-early ở test 1 cửa sổ đã đóng)
    let lateRes = await apiFetch(
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

    if (!lateList.length) {
      // Thử lần lượt leader 01..06 — chọn đội chưa có submission
      const beBase = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
      const existing = await apiFetch('GET', `/submissions?roundId=${prelim.id}&size=100`, token);
      const existingSubs = Array.isArray(existing.data) ? existing.data : existing.data?.items || [];
      const submittedTeamIds = new Set(
        existingSubs.map((s) => Number(s.teamId ?? s.team_id)).filter(Boolean),
      );
      let injectNote = 'no student tried';
      for (let i = 1; i <= 6; i++) {
        const email = `student.gd3.leader0${i}@fpt.edu.vn`;
        const stuToken = await login(email, STUDENT_PASSWORD).catch(() => null);
        if (!stuToken) continue;
        const meTeams = await apiFetch('GET', '/me/teams', stuToken);
        const myTeams = Array.isArray(meTeams.data) ? meTeams.data : meTeams.data?.items || [];
        const team =
          myTeams.find((t) => Number(t.hackathonId ?? t.hackathon_id) === Number(hackathon.id)) ||
          myTeams[0];
        const teamId = team?.teamId ?? team?.id;
        const trackId = team?.trackId ?? team?.track_id;
        if (!teamId || !trackId || submittedTeamIds.has(Number(teamId))) continue;

        const fd = new FormData();
        fd.append('teamId', String(teamId));
        fd.append('trackId', String(trackId));
        fd.append('repoUrl', 'https://github.com/octocat/Hello-World');
        fd.append('demoUrl', 'https://example.com');
        fd.append('lateReason', 'E2E concurrent-race late inject');
        fd.append(
          'slideFile',
          new Blob(['%PDF-1.4 race-late'], { type: 'application/pdf' }),
          'race-late.pdf',
        );
        const inj = await fetch(`${beBase}/submissions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${stuToken}` },
          body: fd,
        });
        const injJson = await inj.json().catch(() => ({}));
        injectNote = `${email} → ${inj.status} ${injJson?.error?.code || ''}`;
        if (inj.status < 300 || injJson?.error?.code === 'LATE_PENDING' || inj.status === 201) {
          break;
        }
      }

      lateRes = await apiFetch('GET', `/submissions?roundId=${prelim.id}&size=100`, token);
      const all = Array.isArray(lateRes.data) ? lateRes.data : lateRes.data?.items || [];
      lateList = all.filter((s) => String(s.status || '').toUpperCase() === 'LATE_PENDING');
      expect(
        lateList.length,
        `No LATE_PENDING after inject (${injectNote}) — cannot race approve`,
      ).toBeGreaterThan(0);
    } else {
      expect(lateList.length, 'No LATE_PENDING — cannot race approve').toBeGreaterThan(0);
    }
    const late = lateList[0];
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
