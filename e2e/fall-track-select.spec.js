/**
 * FR-U-15-F — Fall leader chọn track trên seal-fall-ongoing-2026 (read-only).
 * Mutating flow: fall-track-select-mutating.spec.js (dedicated-e2e only, user t02).
 */
import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  waitForBackendReady,
  waitForLoginToken,
  waitForSeedSlug,
} from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const FALL_SLUG = 'seal-fall-ongoing-2026';
const SPRING_SLUG = 'seal-e2e-2026';
const FALL_LEADER_READONLY = 'student.fall.t01.leader@fpt.edu.vn';
const SPRING_LEADER = 'student.e2e.t01.leader@fpt.edu.vn';

test.describe('Fall track select (FR-U-15-F)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(
      process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn',
      process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1'
    );
    const hackathon = await waitForSeedSlug(FALL_SLUG, token);
    test.skip(!hackathon, `Seed ${FALL_SLUG} not ready`);
  });

  test('Fall leader sees track select card', async ({ page }) => {
    await loginAs(page, { email: FALL_LEADER_READONLY, role: 'student' });
    await page.goto('/student/team');
    await expect(page.getByText(/Chọn track \(Fall\)/i)).toBeVisible({ timeout: 25_000 });

    const fallCard = page.locator('.ant-card').filter({ hasText: 'Chọn track (Fall)' });
    await expect(fallCard.getByRole('combobox')).toBeVisible();
  });

  test('Spring leader does not see Fall track select', async ({ page }) => {
    const token = await waitForLoginToken(
      process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn',
      process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1'
    );
    const spring = await findHackathonBySlug(SPRING_SLUG, token);
    test.skip(!spring, `Seed ${SPRING_SLUG} not found`);

    await loginAs(page, { email: SPRING_LEADER, role: 'student' });
    await page.goto('/student/team');
    await expect(page.getByText(/Chọn track \(Fall\)/i)).not.toBeVisible({ timeout: 10_000 });
  });
});
