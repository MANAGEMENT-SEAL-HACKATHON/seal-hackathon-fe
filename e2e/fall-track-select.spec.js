/**
 * FR-U-15-F - Fall track select gate, revived on live seeds.
 * Fall ONGOING seed was purged, so this suite verifies the season gate on the
 * live Spring seed (seal-e2e-2026): the Fall card must NOT render and the API
 * must reject with NOT_APPLICABLE. Reject-path mutation: fall-track-select-mutating.spec.js.
 * NOTE: Vietnamese UI text uses \uXXXX escapes (repo tooling writes ASCII only).
 */
import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  waitForBackendReady,
  waitForLoginToken,
  waitForSeedSlug,
} from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const SPRING_SLUG = 'seal-e2e-2026';
const SPRING_LEADER = 'student.e2e.t01.leader@fpt.edu.vn';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';

// "Nguoi Dan Dat Doi Thi|Doi cua ban|E2E-T01"
const RE_TEAM_DASHBOARD =
  /Ng\u01B0\u1EDDi D\u1EABn D\u1EAFt \u0110\u1ED9i Thi|\u0110\u1ED9i c\u1EE7a b\u1EA1n|E2E-T01/i;
// "Chon track (Fall)"
const RE_FALL_CARD = /Ch\u1ECDn track \(Fall\)/i;

async function apiRaw(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, code: json?.error?.code || json?.code, status: res.status };
}

test.describe('Fall track select gate (FR-U-15-F)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    expect(ready, 'BE dev server not reachable').toBeTruthy();
    const token = await waitForLoginToken(
      process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn',
      process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1',
    );
    const hackathon = await waitForSeedSlug(SPRING_SLUG, token);
    expect(hackathon, `Seed ${SPRING_SLUG} not ready`).toBeTruthy();
  });

  test('Spring leader does not see Fall track select card', async ({ page }) => {
    await loginAs(page, { email: SPRING_LEADER, role: 'student' });
    await page.goto('/student/team');
    // Wait for team dashboard content, then assert the Fall card is absent.
    await expect(page.getByText(RE_TEAM_DASHBOARD).first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(RE_FALL_CARD)).toHaveCount(0);
  });

  test('API rejects Fall track select for non-Fall season (NOT_APPLICABLE)', async () => {
    const coordToken = await waitForLoginToken(
      process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn',
      process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1',
    );
    const spring = await findHackathonBySlug(SPRING_SLUG, coordToken);
    expect(spring, `Seed ${SPRING_SLUG} not found`).toBeTruthy();

    const leaderToken = await waitForLoginToken(SPRING_LEADER, STUDENT_PASSWORD);
    expect(leaderToken, 'Spring leader login').toBeTruthy();

    const listRes = await apiRaw('GET', `/me/hackathons/${spring.id}/selectable-tracks`, {
      token: leaderToken,
    });
    expect(listRes.status, 'selectable-tracks must be a named 4xx').toBeGreaterThanOrEqual(400);
    expect(listRes.status).toBeLessThan(500);
    expect(listRes.code).toBe('NOT_APPLICABLE');
  });
});
