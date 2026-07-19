/**
 * Mutating - Mentor Portal deep flow + IDOR/conflict API.
 * Revived on live seed seal-gd3-prelim-open:
 *   - mentor@fpt.edu.vn: team assignments on GD3-01..06 (prelim)
 *   - mentor2@fpt.edu.vn: track-level assignments only (track-only bootstrap)
 * Run: E2E_MUTATING=1 npx playwright test e2e/mentor-portal-mutating.spec.js --project=mutating-e2e
 * NOTE: Vietnamese UI text uses \uXXXX escapes (repo tooling writes ASCII only).
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

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const MENTOR_EMAIL = 'mentor@fpt.edu.vn';
const MENTOR_PASSWORD = process.env.E2E_MENTOR_PASSWORD || 'Mentor@dev1';
const TRACK_ONLY_EMAIL = 'mentor2@fpt.edu.vn';
const STUDENT_EMAIL = 'student.gd3.leader01@fpt.edu.vn';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

const MENTOR_PORTAL_SEED = 'seal-gd3-prelim-open';
const TEAM_A = 'GD3-01';
const TEAM_B = 'GD3-02';

// "Vong thi dang phu trach"
const RE_MENTOR_ROUNDS = /V\u00F2ng thi \u0111ang ph\u1EE5 tr\u00E1ch/i;
// "Nhom doi ho tro"
const RE_SUPPORT_GROUPS = /Nh\u00F3m \u0111\u1ED9i h\u1ED7 tr\u1EE3/i;
// "Lam moi"
const RE_REFRESH = /L\u00E0m m\u1EDBi/i;
// "Xem bai nop"
const RE_VIEW_SUBMISSION = /Xem b\u00E0i n\u1ED9p/i;
// "Bai nop"
const RE_TAB_SUBMISSION = /B\u00E0i n\u1ED9p/i;
// "Diem"
const RE_TAB_SCORE = /\u0110i\u1EC3m/i;
// "Chua co diem (co the chua khoa cham)"
const RE_NO_SCORE =
  /Ch\u01B0a c\u00F3 \u0111i\u1EC3m \(c\u00F3 th\u1EC3 ch\u01B0a kh\u00F3a ch\u1EA5m\)/i;
// "Lich su mentor"
const RE_MENTOR_HISTORY = /L\u1ECBch s\u1EED mentor/i;
// "Ban da duoc gan track chuyen mon"
const RE_BOOTSTRAP_TITLE =
  /B\u1EA1n \u0111\u00E3 \u0111\u01B0\u1EE3c g\u00E1n track chuy\u00EAn m\u00F4n/i;

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

test.describe('Mentor portal (mutating)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    expect(isMutatingEnabled(), 'E2E_MUTATING=1 required').toBeTruthy();
    const ready = await isBackendReady();
    expect(ready, 'BE dev server not reachable').toBeTruthy();
  });

  test('happy: rounds -> support drawer -> history', async ({ page }) => {
    const mentorToken = await login(MENTOR_EMAIL, MENTOR_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(MENTOR_PORTAL_SEED, coordToken);
    expect(hackathon, `Seed ${MENTOR_PORTAL_SEED} not found`).toBeTruthy();
    const prelim = await findPrelimRound(hackathon.id, coordToken);
    expect(prelim, 'No prelim on mentor-portal seed').toBeTruthy();

    // Confirm mentor is assigned on this round
    const assigned = await apiRaw('GET', `/me/mentor/rounds/${prelim.id}/assigned-teams`, {
      token: mentorToken,
    });
    expect(assigned.res.ok, 'Mentor assigned on prelim').toBeTruthy();

    await loginAs(page, { email: MENTOR_EMAIL, password: MENTOR_PASSWORD, role: 'mentor' });

    await page.goto('/mentor/rounds');
    await expect(page.getByRole('heading', { name: RE_MENTOR_ROUNDS })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto(`/mentor/support?roundId=${prelim.id}`);
    await expect(page).toHaveURL(/\/mentor\/support/, { timeout: 15_000 });

    await expect(page.getByText(RE_SUPPORT_GROUPS)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(new RegExp(TEAM_A, 'i')).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(new RegExp(TEAM_B, 'i')).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: RE_REFRESH }).click();
    await expect(page.getByText(RE_SUPPORT_GROUPS)).toBeVisible();

    await page.getByRole('button', { name: RE_VIEW_SUBMISSION }).first().click();
    await expect(page.getByRole('tab', { name: RE_TAB_SUBMISSION })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('tab', { name: RE_TAB_SCORE })).toBeVisible();

    await page.getByRole('tab', { name: RE_TAB_SCORE }).click();
    await expect(page.getByText(RE_NO_SCORE)).toBeVisible({ timeout: 10_000 });

    await page.goto('/mentor/history');
    await expect(page.getByRole('heading', { name: RE_MENTOR_HISTORY })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('IDOR: track-only mentor cannot read GD3 team submissions', async () => {
    const trackOnlyToken = await login(TRACK_ONLY_EMAIL, MENTOR_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const mentorToken = await login(MENTOR_EMAIL, MENTOR_PASSWORD);

    const mp = await findHackathonBySlug(MENTOR_PORTAL_SEED, coordToken);
    expect(mp, `Seed ${MENTOR_PORTAL_SEED} not found`).toBeTruthy();
    const prelim = await findPrelimRound(mp.id, coordToken);
    expect(prelim, 'No prelim').toBeTruthy();

    // Resolve a real GD3 team id via the assigned mentor (who can list them)
    const assigned = await apiRaw('GET', `/me/mentor/rounds/${prelim.id}/assigned-teams`, {
      token: mentorToken,
    });
    const teams = assigned.data?.teams || [];
    const gd3Team = teams.find((t) => new RegExp(TEAM_A, 'i').test(String(t.teamName || t.team_name || '')));
    const teamId = gd3Team?.teamId ?? gd3Team?.team_id ?? gd3Team?.id;
    expect(teamId, `${TEAM_A} not found for IDOR`).toBeTruthy();

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

  test('track-only mentor sees bootstrap card, not GD3 teams', async ({ page }) => {
    const trackOnlyToken = await login(TRACK_ONLY_EMAIL, MENTOR_PASSWORD);
    const rounds = await apiRaw('GET', '/me/mentor/rounds', { token: trackOnlyToken });
    expect((rounds.data || []).length, 'mentor2 must have no round assignments').toBe(0);

    await loginAs(page, {
      email: TRACK_ONLY_EMAIL,
      password: MENTOR_PASSWORD,
      role: 'mentor',
    });
    await page.goto('/mentor/rounds');
    await expect(page.getByText(RE_BOOTSTRAP_TITLE)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(new RegExp(TEAM_A, 'i'))).toHaveCount(0);
  });

  test('conflict: mentor with track assignment cannot be judge same track', async () => {
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(MENTOR_PORTAL_SEED, coordToken);
    expect(hackathon, `Seed ${MENTOR_PORTAL_SEED} not found`).toBeTruthy();
    const prelim = await findPrelimRound(hackathon.id, coordToken);
    expect(prelim?.id).toBeTruthy();

    const tracksRes = await apiRaw('GET', `/rounds/${prelim.id}/tracks`, { token: coordToken });
    const tracks = Array.isArray(tracksRes.data) ? tracksRes.data : tracksRes.data?.items || [];
    expect(tracks.length, 'gd3 prelim tracks').toBeGreaterThanOrEqual(2);
    const track1 = tracks[0];

    const meMentor = await apiRaw('GET', '/users/me', {
      token: await login(MENTOR_EMAIL, MENTOR_PASSWORD),
    });
    const mentorId = meMentor.data?.id ?? meMentor.data?.userId;
    expect(mentorId).toBeTruthy();

    // mentor@ has a track-level MentorAssignment on track1 -> track-level guard
    const { res, code } = await apiRaw('POST', '/judge-assignments', {
      token: coordToken,
      body: { judgeId: mentorId, trackId: track1.id, assignmentType: 'NORMAL' },
    });
    expect(res.ok).toBeFalsy();
    expect(res.status).toBeLessThan(500);
    expect(['CONFLICT_SAME_TRACK', 'CONFLICT_MENTOR_JUDGE_SAME_TRACK']).toContain(code);
  });

  test('conflict: mentor of teams in track cannot be judge that track', async () => {
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(MENTOR_PORTAL_SEED, coordToken);
    expect(hackathon, `Seed ${MENTOR_PORTAL_SEED} not found`).toBeTruthy();
    const prelim = await findPrelimRound(hackathon.id, coordToken);
    expect(prelim?.id).toBeTruthy();

    const tracksRes = await apiRaw('GET', `/rounds/${prelim.id}/tracks`, { token: coordToken });
    const tracks = Array.isArray(tracksRes.data) ? tracksRes.data : tracksRes.data?.items || [];
    expect(tracks.length).toBeGreaterThanOrEqual(2);
    // mentor@ mentors GD3-04..06 (track2 teams) but only has track-level assignment on track1
    // -> track2 attempt must hit the team-in-track isolation guard.
    const track2 = tracks[1];

    const meMentor = await apiRaw('GET', '/users/me', {
      token: await login(MENTOR_EMAIL, MENTOR_PASSWORD),
    });
    const mentorId = meMentor.data?.id ?? meMentor.data?.userId;
    expect(mentorId).toBeTruthy();

    const { res, code } = await apiRaw('POST', '/judge-assignments', {
      token: coordToken,
      body: { judgeId: mentorId, trackId: track2.id, assignmentType: 'NORMAL' },
    });
    expect(res.ok).toBeFalsy();
    expect(res.status).toBeLessThan(500);
    expect(['CONFLICT_MENTOR_JUDGE_SAME_TRACK', 'CONFLICT_SAME_TRACK']).toContain(code);
  });
});
