/**
 * FR-U-32 — annual awards từ seal-fall-2025-finished + individual_rankings.
 */
import { test, expect } from '@playwright/test';
import { waitForBackendReady, waitForSeedSlug, waitForLoginToken } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const ARCHIVE_SLUG = 'seal-fall-2025-finished';
const ARCHIVE_STUDENT = 'student.archive.fall2025@fpt.edu.vn';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

test.describe('Student portal parity — annual awards', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(ARCHIVE_SLUG, token);
    test.skip(!hackathon, `Seed ${ARCHIVE_SLUG} not ready`);
  });

  test('archive student sees award row for year 2025', async ({ page }) => {
    await loginAs(page, { email: ARCHIVE_STUDENT, role: 'student' });
    await page.goto('/student/annual-awards');
    await expect(page).toHaveURL(/annual-awards/);
    await page.getByRole('combobox').click();
    await page.locator('.ant-select-item-option-content').filter({ hasText: '2025' }).click();
    await expect(page.getByText(/2025|Fall|SEAL/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 15_000 });
  });
});
