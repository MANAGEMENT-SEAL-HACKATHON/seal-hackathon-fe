/**
 * Mutating — Mentor Portal deep flow + IDOR/conflict API.
 * Run: E2E_MUTATING=1 npx playwright test e2e/mentor-portal-mutating.spec.js --project=mutating-e2e
 * Restart BE after suite to reset seeds.
 */
import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  isBackendReady,
  login,
} from './helpers/api.js';
import { isMutatingEnabled } from './helpers/progressionApiHelpers.js';
import { loginAs } from './helpers/uiAuth.js';
test.skip(true, 'deprecated seed slug removed � see intentional-errors-catalog.md');

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const MENTOR_EMAIL = 'mentor@fpt.edu.vn';
const MENTOR_PASSWORD = process.env.E2E_MENTOR_PASSWORD || 'Mentor@dev1';
const TRACK_ONLY_EMAIL = 'mentor.trackonly@fpt.edu.vn';
const STUDENT_EMAIL = 'student.gd3mp.t01.leader@fpt.edu.vn';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const JUDGE_EMAIL = 'judge1@fpt.edu.vn';
const JUDGE_PASSWORD = process.env.E2E_JUDGE_PASSWORD || 'Judge@dev1';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

const MENTOR_PORTAL_SEED = 'seal-gd3-prelim-open';
const CONFLICT_SEED = 'seal-gd3-prelim-open';
const TRACK_ONLY_SEED = 'seal-gd3-prelim-open';

async function apiRaw(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data ?? json, code: json?.error?.code || json?.code };
}

function extractQueueItems(queue) {
  if (!queue) return [];
  if (Array.isArray(queue.tracks)) {
    return queue.tracks.flatMap((t) => (Array.isArray(t.items) ? t.items : []));
  }
  return queue?.slots || queue?.items || (Array.isArray(queue) ? queue : []);
}

test.describe('Mentor portal (mutating)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    test.skip(!isMutatingEnabled(), 'E2E_MUTATING=1 required');
    const ready = await isBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
  });

  test('happy: rounds → support drawer → history', async ({ page }) => {
    const mentorToken = await login(MENTOR_EMAIL, MENTOR_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(MENTOR_PORTAL_SEED, coordToken);
    test.skip(!hackathon, `Seed ${MENTOR_PORTAL_SEED} not found`);
    const prelim = await findPrelimRound(hackathon.id, coordToken);
    test.skip(!prelim, 'No prelim on mentor-portal seed');

    // Confirm mentor is assigned on this round (independent of which hackathon getMentorRounds picks first)
    const assigned = await apiRaw('GET', `/me/mentor/rounds/${prelim.id}/assigned-teams`, {
      token: mentorToken,
    });
    test.skip(!assigned.res.ok, 'Mentor not assigned on mentor-portal prelim');

    await loginAs(page, { email: MENTOR_EMAIL, password: MENTOR_PASSWORD, role: 'mentor' });

    await page.goto('/mentor/rounds');
    await expect(page.getByRole('heading', { name: /Vòng thi đang phụ trách/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto(`/mentor/support?roundId=${prelim.id}`);
    await expect(page).toHaveURL(/\/mentor\/support/, { timeout: 15_000 });

    await expect(page.getByText(/Nhóm đội hỗ trợ/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/GD3-MP-T01/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/GD3-MP-T02/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Làm mới/i }).click();
    await expect(page.getByText(/Nhóm đội hỗ trợ/i)).toBeVisible();

    await page.getByRole('button', { name: /Xem bài nộp/i }).first().click();
    await expect(page.getByRole('tab', { name: /Bài nộp/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('tab', { name: /Điểm/i })).toBeVisible();

    await page.getByRole('tab', { name: /Điểm/i }).click();
    await expect(
      page.getByText(/Chưa có điểm \(có thể chưa khóa chấm\)/i),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/Phân công đội \(FR-M-06\)/i)).toBeVisible();

    await page.goto('/mentor/history');
    await expect(page.getByRole('heading', { name: /Lịch sử mentor/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('IDOR: track-only mentor cannot read MP team submissions', async () => {
    const trackOnlyToken = await login(TRACK_ONLY_EMAIL, MENTOR_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const mentorToken = await login(MENTOR_EMAIL, MENTOR_PASSWORD);

    const mp = await findHackathonBySlug(MENTOR_PORTAL_SEED, coordToken);
    test.skip(!mp, `Seed ${MENTOR_PORTAL_SEED} not found`);
    const prelim = await findPrelimRound(mp.id, coordToken);
    test.skip(!prelim, 'No prelim');

    // Resolve a real MP team id via the assigned mentor (who can list them)
    const assigned = await apiRaw('GET', `/me/mentor/rounds/${prelim.id}/assigned-teams`, {
      token: mentorToken,
    });
    const teams = assigned.data?.teams || [];
    const mpTeam = teams.find((t) => /GD3-MP-T01/i.test(String(t.teamName || t.team_name || '')));
    const teamId = mpTeam?.teamId ?? mpTeam?.team_id ?? mpTeam?.id;
    test.skip(!teamId, 'MP team not found for IDOR');

    const { res, code } = await apiRaw(
      'GET',
      `/me/mentor/teams/${teamId}/submissions?roundId=${prelim.id}`,
      { token: trackOnlyToken },
    );
    expect(res.status).toBe(403);
    expect(code === 'FORBIDDEN' || res.status === 403).toBeTruthy();
  });

  test('permission: student cannot call mentor rounds', async () => {
    const studentToken = await login(STUDENT_EMAIL, STUDENT_PASSWORD);
    const { res } = await apiRaw('GET', '/me/mentor/rounds', { token: studentToken });
    expect(res.status).toBeGreaterThanOrEqual(403);
  });

  test('track-only mentor sees bootstrap card, not MP teams', async ({ page }) => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(TRACK_ONLY_SEED, token);
    test.skip(!hackathon, `Seed ${TRACK_ONLY_SEED} not found`);

    await loginAs(page, {
      email: TRACK_ONLY_EMAIL,
      password: MENTOR_PASSWORD,
      role: 'mentor',
    });
    await page.goto('/mentor/rounds');
    await expect(page.getByText(/Bạn đã được gán track chuyên môn/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/GD3-MP-T01/i)).toHaveCount(0);
  });

  test('API conflict: POST /scores → CONFLICT_MENTOR_JUDGE_SAME_TRACK', async () => {
    const judgeToken = await login(JUDGE_EMAIL, JUDGE_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(CONFLICT_SEED, coordToken);
    expect(hackathon, `Seed ${CONFLICT_SEED} not found`).toBeTruthy();

    const prelim = await findPrelimRound(hackathon.id, coordToken);
    expect(prelim?.id).toBeTruthy();

    const tracksRes = await apiRaw('GET', `/rounds/${prelim.id}/tracks`, { token: coordToken });
    const tracks = Array.isArray(tracksRes.data) ? tracksRes.data : tracksRes.data?.items || [];
    const track = tracks[0];
    expect(track?.id, 'No track on conflict prelim').toBeTruthy();

    const queueRes = await apiRaw(
      'GET',
      `/presentation/queue?roundId=${prelim.id}&trackId=${track.id}`,
      { token: coordToken },
    );
    const slots = extractQueueItems(queueRes.data);
    const presenting =
      slots.find((s) =>
        String(s.queueStatus || s.status || s.queue_status || '')
          .toUpperCase()
          .includes('PRESENTING'),
      ) || slots.find((s) => s.submissionId ?? s.submission_id);
    expect(presenting, `No queue slot on conflict seed (slots=${slots.length})`).toBeTruthy();
    const submissionId = presenting.submissionId ?? presenting.submission_id;
    expect(submissionId).toBeTruthy();

    const criteriaRes = await apiRaw('GET', `/tracks/${track.id}/criteria`, {
      token: judgeToken,
    });
    const criteria = Array.isArray(criteriaRes.data)
      ? criteriaRes.data
      : criteriaRes.data?.items || [];
    const criterion = criteria[0];
    expect(criterion?.id, 'No criteria on conflict track').toBeTruthy();

    const { res, code } = await apiRaw('POST', '/scores', {
      token: judgeToken,
      body: {
        submissionId,
        criterionId: criterion.id,
        scoreValue: 7.5,
        scoreType: 'NORMAL',
      },
    });
    expect(res.ok).toBeFalsy();
    expect(code).toBe('CONFLICT_MENTOR_JUDGE_SAME_TRACK');
  });

  test('API conflict: POST /scores/calibration resolves team/track from submissionId', async () => {
    const judgeToken = await login(JUDGE_EMAIL, JUDGE_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(CONFLICT_SEED, coordToken);
    expect(hackathon, `Seed ${CONFLICT_SEED} not found`).toBeTruthy();

    const prelim = await findPrelimRound(hackathon.id, coordToken);
    expect(prelim?.id).toBeTruthy();

    const tracksRes = await apiRaw('GET', `/rounds/${prelim.id}/tracks`, { token: coordToken });
    const tracks = Array.isArray(tracksRes.data) ? tracksRes.data : tracksRes.data?.items || [];
    const track = tracks[0];
    expect(track?.id).toBeTruthy();

    const queueRes = await apiRaw(
      'GET',
      `/presentation/queue?roundId=${prelim.id}&trackId=${track.id}`,
      { token: coordToken },
    );
    const slots = extractQueueItems(queueRes.data);
    const presenting = slots.find((s) => s.submissionId ?? s.submission_id);
    const submissionId = presenting?.submissionId ?? presenting?.submission_id;
    expect(submissionId, 'No submission for calibration conflict').toBeTruthy();

    const sessionsRes = await apiRaw('GET', `/calibration-sessions?roundId=${prelim.id}`, {
      token: coordToken,
    });
    let sessions = Array.isArray(sessionsRes.data)
      ? sessionsRes.data
      : sessionsRes.data?.items || [];
    let openSession = sessions.find((s) => String(s.status).toUpperCase() === 'OPEN');

    if (!openSession) {
      const created = await apiRaw('POST', '/calibration-sessions', {
        token: coordToken,
        body: {
          roundId: prelim.id,
          sampleSubmissionId: submissionId,
          targetScore: 8,
          instructions: 'E2E conflict calib',
        },
      });
      expect(created.res.ok).toBeTruthy();
      openSession = created.data;
    }

    const criteriaRes = await apiRaw('GET', `/tracks/${track.id}/criteria`, {
      token: judgeToken,
    });
    const criteria = Array.isArray(criteriaRes.data)
      ? criteriaRes.data
      : criteriaRes.data?.items || [];
    const criterion = criteria[0];
    expect(criterion?.id).toBeTruthy();

    const { res, code } = await apiRaw('POST', '/scores/calibration', {
      token: judgeToken,
      body: {
        submissionId,
        criterionId: criterion.id,
        scoreValue: 7,
        calibrationSessionId: openSession.id,
      },
    });
    expect(res.ok).toBeFalsy();
    expect(code).toBe('CONFLICT_MENTOR_JUDGE_SAME_TRACK');
  });
});
