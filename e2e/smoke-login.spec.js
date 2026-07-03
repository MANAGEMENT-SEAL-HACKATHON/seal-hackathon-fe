import { test, expect } from '@playwright/test';

/**
 * Smoke: FE loads and login page is reachable.
 * Full coord → gd4 → gd6 flow requires BE dev seeds + credentials — extend when CI has both services.
 */
test.describe('SEAL Hackathon smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
    await expect(page.getByPlaceholder('example@hackathon.com')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: /Đăng nhập/i })).toBeVisible();
  });
});
