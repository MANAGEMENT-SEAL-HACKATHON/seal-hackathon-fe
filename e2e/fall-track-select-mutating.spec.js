/**
 * FR-U-15-F mutating — prefers student.fall.t02, falls back to t03 (dedicated-e2e only).
 * BE repairForFeTesting() resets tracks on restart; t01 reserved for read-only/matrix.
 */
import { test, expect } from '@playwright/test';
import { waitForBackendReady, waitForLoginToken, waitForSeedSlug } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';
test.skip(true, 'deprecated seed slug removed � see intentional-errors-catalog.md');

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const FALL_SLUG = 'seal-fall-ongoing-2026';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const MUTATING_CANDIDATES = [
  'student.fall.t02.leader@fpt.edu.vn',
  'student.fall.t03.leader@fpt.edu.vn',
];

async function findFallLeaderWithoutTrack(hackathonId) {
  for (const email of MUTATING_CANDIDATES) {
    const token = await waitForLoginToken(email, STUDENT_PASSWORD);
    if (!token) continue;

    const res = await fetch(`${BE_BASE}/me/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    const teams = json?.data ?? json ?? [];
    const team = teams.find((t) => String(t.hackathonId ?? t.hackathon_id) === String(hackathonId));
    const trackId = team?.trackId ?? team?.track_id;
    if (team && trackId == null) {
      return email;
    }
  }
  return null;
}

test.describe('Fall track select mutating (FR-U-15-F)', () => {
  let mutatingLeaderEmail;

  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(
      process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn',
      process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1'
    );
    const hackathon = await waitForSeedSlug(FALL_SLUG, token);
    test.skip(!hackathon, `Seed ${FALL_SLUG} not ready`);

    mutatingLeaderEmail = await findFallLeaderWithoutTrack(hackathon.id);
    test.skip(
      !mutatingLeaderEmail,
      'No Fall leader without track (t02/t03) — restart BE dev to reset seeds'
    );
  });

  test('Fall leader can choose track', async ({ page }) => {
    await loginAs(page, { email: mutatingLeaderEmail, role: 'student' });
    await page.goto('/student/team');
    await expect(page.getByText(/Chọn track \(Fall\)/i)).toBeVisible({ timeout: 25_000 });

    const fallCard = page.locator('.ant-card').filter({ hasText: 'Chọn track (Fall)' });
    await fallCard.getByRole('combobox').click();
    await page.locator('.ant-select-item-option').first().click();
    await fallCard.getByRole('button', { name: /Xác nhận track/i }).click();
    await expect(page.getByText(/đã chọn track|thành công/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
