import { test, expect } from '@playwright/test';
import { waitForBackendReady } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const MENTOR_EMAIL = 'mentor@fpt.edu.vn';

test.describe('Mentor portal API gaps smoke', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
  });

  test('mentor history route exists', async ({ page }) => {
    await loginAs(page, { email: MENTOR_EMAIL, role: 'mentor' });
    await page.goto('/mentor/history');
    await expect(page).toHaveURL(/mentor\/history/);
    await expect(page.getByRole('heading', { name: /Lịch sử mentor/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('mentor support route exists', async ({ page }) => {
    await loginAs(page, { email: MENTOR_EMAIL, role: 'mentor' });
    await page.goto('/mentor/support');
    await expect(page).toHaveURL(/mentor\/support/);
    await expect(page.getByRole('heading', { name: /Nhóm đội hỗ trợ/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
