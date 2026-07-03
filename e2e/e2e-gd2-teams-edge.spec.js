/**
 * GĐ2 read-only — slug `seal-gd2-teams-edge` (Gd2TeamsEdgeDataSeeder, 9-team matrix).
 */
import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  waitForBackendReady,
  waitForLoginToken,
  waitForSeedSlug,
} from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const SLUG = 'seal-gd2-teams-edge';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

test.describe('GĐ2 — seal-gd2-teams-edge (read-only)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(SLUG, token);
    test.skip(!hackathon, `Seed ${SLUG} not ready`);
  });

  test('coordinator sees GD2-T01 pending and GD2-T05 locked approved', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(SLUG, token);
    test.skip(!hackathon, `Seed ${SLUG} not found`);

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto('/teams');
    await expect(page.getByRole('heading', { name: /Quản lý đội thi/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.locator('.ant-select').first().click();
    await page.getByText(/SEAL GĐ2 — Teams edge/i).click();

    await expect(page.getByText(/GD2-T01/i).first()).toBeVisible({ timeout: 20_000 });
    await page.getByTitle('Đã duyệt', { exact: true }).click();
    await expect(page.getByText(/GD2-T05/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
