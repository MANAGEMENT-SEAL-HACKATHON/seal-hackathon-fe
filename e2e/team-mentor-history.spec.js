/**
 * FR-13C - mentor history per team (coordinator + student), revived on
 * seal-gd3-prelim-open: mentor@fpt.edu.vn is assigned to all 6 GD3 teams
 * on the prelim round (1 round entry per team on a fresh seed).
 * NOTE: Vietnamese UI text uses \uXXXX escapes (repo tooling writes ASCII only).
 */
import { test, expect } from '@playwright/test';
import { waitForBackendReady, waitForLoginToken, waitForSeedSlug, findHackathonBySlug } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const SLUG = 'seal-gd3-prelim-open';
const TEAM_NAME = 'GD3-01';
const STUDENT_EMAIL = 'student.gd3.leader01@fpt.edu.vn';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

// "Nguoi Dan Dat Doi Thi|NGUOI HUONG DAN" (case-insensitive)
const RE_MENTOR_PANEL =
  /Ng\u01B0\u1EDDi D\u1EABn D\u1EAFt \u0110\u1ED9i Thi|ng\u01B0\u1EDDi h\u01B0\u1EDBng d\u1EABn/i;
// "Phu trach:"
const RE_ROUND_ROW = /Ph\u1EE5 tr\u00E1ch:/i;

async function apiGet(path, token) {
  const res = await fetch(`${BE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json?.data ?? json };
}

async function findTeam(token, hackathonId, name) {
  const { data } = await apiGet(`/teams?hackathonId=${hackathonId}&size=100`, token);
  const list = Array.isArray(data) ? data : data?.items || [];
  return list.find((t) => String(t.teamName || t.name || '').includes(name)) || null;
}

test.describe('Team mentor history (FR-13C)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    expect(ready, 'BE dev server not reachable').toBeTruthy();
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(SLUG, token);
    expect(hackathon, `Seed ${SLUG} not ready`).toBeTruthy();
  });

  test('API: team mentors endpoint returns round-scoped history (coord + student)', async () => {
    const coordToken = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(SLUG, coordToken);
    expect(hackathon, `Seed ${SLUG} not found`).toBeTruthy();

    const team = await findTeam(coordToken, hackathon.id, TEAM_NAME);
    expect(team?.id, `${TEAM_NAME} on ${SLUG}`).toBeTruthy();

    const coordView = await apiGet(`/teams/${team.id}/mentors`, coordToken);
    expect(coordView.status).toBe(200);
    const coordItems = coordView.data?.items || [];
    expect(coordItems.length, 'mentor history rows (coord)').toBeGreaterThanOrEqual(1);
    expect(coordItems[0].roundName || coordItems[0].round_name, 'row must carry round name').toBeTruthy();
    expect(coordItems[0].mentorName || coordItems[0].mentor_name, 'row must carry mentor name').toBeTruthy();

    const studentToken = await waitForLoginToken(STUDENT_EMAIL, STUDENT_PASSWORD);
    expect(studentToken, `${STUDENT_EMAIL} login`).toBeTruthy();
    const studentView = await apiGet(`/teams/${team.id}/mentors`, studentToken);
    expect(studentView.status).toBe(200);
    expect((studentView.data?.items || []).length, 'mentor history rows (student)').toBeGreaterThanOrEqual(1);
  });

  test('student team dashboard shows mentor history panel', async ({ page }) => {
    await loginAs(page, { email: STUDENT_EMAIL, role: 'student' });
    await page.goto('/student/team');
    await expect(page.getByText(RE_MENTOR_PANEL).first()).toBeVisible({ timeout: 25_000 });
    const mentorRoundRows = page.getByText(RE_ROUND_ROW);
    await expect(mentorRoundRows.first()).toBeVisible({ timeout: 15_000 });
    expect(await mentorRoundRows.count()).toBeGreaterThanOrEqual(1);
  });
});
