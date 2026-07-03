import { test, expect } from '@playwright/test';

test.describe('Auth recovery smoke', () => {
  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.getByRole('button', { name: /Gửi|gửi/i })).toBeVisible({ timeout: 15_000 });
  });

  test('reset password page renders with token param', async ({ page }) => {
    await page.goto('/reset-password?token=smoke-test-token');
    await expect(page).toHaveURL(/reset-password/);
    await expect(page.getByRole('heading', { name: /Đặt lại mật khẩu/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel('Token')).toHaveValue('smoke-test-token');
    await expect(page.getByRole('button', { name: /Cập nhật mật khẩu/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('login page links to forgot password', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /Quên mật khẩu/i })).toBeVisible({ timeout: 15_000 });
  });
});
