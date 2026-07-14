import { test, expect } from '@playwright/test';
import { findHackathonBySlug, waitForBackendReady, waitForLoginToken, waitForSeedSlug } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const PENDING_CONFIRM_SEED = 'seal-gd6-pending-confirm';
const FINISHED_EXPORT_SEED = 'seal-fall-2025-finished';

test.describe('Hackathon closure smoke', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const pendingConfirm = await waitForSeedSlug(PENDING_CONFIRM_SEED, token);
    const finishedExport = await waitForSeedSlug(FINISHED_EXPORT_SEED, token);
    test.skip(!pendingConfirm || !finishedExport, 'Required happy GĐ6 / FINISHED seeds not ready');
  });

  test('pending-confirm shows award entry + confirm enabled', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(PENDING_CONFIRM_SEED, token);
    test.skip(!hackathon, `Seed ${PENDING_CONFIRM_SEED} not found`);

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/hackathons/${hackathon.id}/results`);
    await expect(page.getByText(/Giải thưởng|PENDING_CONFIRM/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('tab', { name: /Giải thưởng/i }).click();
    await expect(page.locator('#hackathon-award-trigger')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#hackathon-confirm-trigger')).toBeEnabled({ timeout: 15_000 });
  });

  test('finished archive shows export button', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(FINISHED_EXPORT_SEED, token);
    test.skip(!hackathon, `Seed ${FINISHED_EXPORT_SEED} not found`);

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/hackathons/${hackathon.id}/results`);
    await expect(page.locator('#hackathon-export-csv')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Đã công bố kết quả|FINISHED/i).first()).toBeVisible();
  });
});
