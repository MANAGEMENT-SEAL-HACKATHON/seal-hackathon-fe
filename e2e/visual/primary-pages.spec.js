/**
 * Visual regression — primary happy pages (manual / nightly).
 */
import { test, expect } from '@playwright/test';
import { waitForBackendReady, waitForLoginToken, findHackathonBySlug } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const E2E_SLUG = 'seal-e2e-2026';

test.describe('Visual — primary pages', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
  });

  test('login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login.png', { maxDiffPixels: 200 });
  });

  test('coordinator setup (seal-e2e-2026)', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(E2E_SLUG, token);
    test.skip(!hackathon, `Seed ${E2E_SLUG} not found`);

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/hackathons/${hackathon.id}/setup`);
    await expect(page.getByText(/SEAL E2E 2026/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveScreenshot('setup-e2e-2026.png', { maxDiffPixels: 400 });
  });

  test('coordinator teams page', async ({ page }) => {
    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto('/teams');
    await expect(page.getByRole('heading', { name: /Quản lý đội thi/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).toHaveScreenshot('teams.png', { maxDiffPixels: 400 });
  });
});
