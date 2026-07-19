/**
 * FR-U-15-F mutating ? revived on live seeds.
 * Fall ONGOING seed was purged, so the mutating lane verifies the reject path:
 * an attempted select on a Spring team must be rejected (NOT_APPLICABLE) and
 * leave the team's lottery/track state unchanged (no partial mutation).
 */
import { test, expect } from '@playwright/test';
import { findHackathonBySlug, waitForBackendReady, waitForLoginToken, waitForSeedSlug } from './helpers/api.js';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const SPRING_SLUG = 'seal-e2e-2026';
const SPRING_LEADER = 'student.e2e.t01.leader@fpt.edu.vn';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

async function apiRaw(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data ?? json, code: json?.error?.code || json?.code, status: res.status };
}

async function myTeamOn(token, hackathonId) {
  const { data } = await apiRaw('GET', '/me/teams', { token });
  const teams = Array.isArray(data) ? data : data?.items || [];
  return teams.find((t) => String(t.hackathonId ?? t.hackathon_id) === String(hackathonId)) || null;
}

test.describe('Fall track select mutating (FR-U-15-F)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    expect(ready, 'BE dev server not reachable').toBeTruthy();
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(SPRING_SLUG, token);
    expect(hackathon, `Seed ${SPRING_SLUG} not ready`).toBeTruthy();
  });

  test('select attempt on Spring team is rejected and state unchanged', async () => {
    const coordToken = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const spring = await findHackathonBySlug(SPRING_SLUG, coordToken);
    expect(spring?.id).toBeTruthy();

    const leaderToken = await waitForLoginToken(SPRING_LEADER, STUDENT_PASSWORD);
    expect(leaderToken, 'Spring leader login').toBeTruthy();

    const before = await myTeamOn(leaderToken, spring.id);
    expect(before, 'Leader must have a team on seal-e2e-2026').toBeTruthy();
    const trackBefore = before.trackId ?? before.track_id ?? null;

    // Attempt the mutation ? must be rejected by the season gate.
    const pick = await apiRaw('POST', '/me/tracks/999999/select', { token: leaderToken });
    expect(pick.status).toBeGreaterThanOrEqual(400);
    expect(pick.status).toBeLessThan(500);
    expect(pick.code).toBe('NOT_APPLICABLE');

    // State must be unchanged after the rejected mutation.
    const after = await myTeamOn(leaderToken, spring.id);
    const trackAfter = after?.trackId ?? after?.track_id ?? null;
    expect(trackAfter).toEqual(trackBefore);
  });
});
