/**
 * FR-M-05 - mentor track bootstrap when mentor has track assignments but no
 * team/round assignments. Revived on live seeds: mentor2@fpt.edu.vn has
 * MentorAssignments (track-level) on every seeded hackathon but zero
 * MentorTeamAssignments, so /mentor/rounds must render the bootstrap card.
 * NOTE: Vietnamese UI text uses \uXXXX escapes (repo tooling writes ASCII only).
 */
import { test, expect } from '@playwright/test';
import { waitForBackendReady, waitForLoginToken } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const MENTOR_EMAIL = process.env.E2E_MENTOR_TRACK_ONLY_EMAIL || 'mentor2@fpt.edu.vn';
const MENTOR_PASSWORD = process.env.E2E_MENTOR_PASSWORD || 'Mentor@dev1';

// "Ban da duoc gan track chuyen mon"
const RE_BOOTSTRAP_TITLE =
  /B\u1EA1n \u0111\u00E3 \u0111\u01B0\u1EE3c g\u00E1n track chuy\u00EAn m\u00F4n/i;
// "chua co vong thi nao can ho tro truc tiep"
const RE_BOOTSTRAP_DESC =
  /ch\u01B0a c\u00F3 v\u00F2ng thi n\u00E0o c\u1EA7n h\u1ED7 tr\u1EE3 tr\u1EF1c ti\u1EBFp/i;

async function apiGet(path, token) {
  const res = await fetch(`${BE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json?.data ?? json };
}

test.describe('Mentor track bootstrap (FR-M-05)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    expect(ready, 'BE dev server not reachable').toBeTruthy();
    const mentorToken = await waitForLoginToken(MENTOR_EMAIL, MENTOR_PASSWORD);
    expect(mentorToken, `${MENTOR_EMAIL} login`).toBeTruthy();

    // Precondition: track-only mentor (track assignments > 0, rounds == 0)
    const tracks = await apiGet('/me/mentor-track-assignments', mentorToken);
    expect(tracks.status).toBe(200);
    expect((tracks.data || []).length, 'mentor2 must have track assignments').toBeGreaterThan(0);
    const rounds = await apiGet('/me/mentor/rounds', mentorToken);
    expect(rounds.status).toBe(200);
    expect((rounds.data || []).length, 'mentor2 must have no round/team assignments').toBe(0);
  });

  test('mentor sees track-only fallback card on /mentor/rounds', async ({ page }) => {
    await loginAs(page, { email: MENTOR_EMAIL, password: MENTOR_PASSWORD, role: 'mentor' });
    await page.goto('/mentor/rounds');
    await expect(page.getByText(RE_BOOTSTRAP_TITLE)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(RE_BOOTSTRAP_DESC)).toBeVisible();
  });
});
