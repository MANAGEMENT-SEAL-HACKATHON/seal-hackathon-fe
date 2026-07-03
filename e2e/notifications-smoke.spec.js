import { test, expect } from '@playwright/test';
import { waitForBackendReady } from './helpers/api.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

async function loginAsCoordinator(page) {
  await page.goto('/login');
  await page.getByPlaceholder('example@hackathon.com').fill(COORD_EMAIL);
  await page.getByPlaceholder('••••••••').fill(COORD_PASSWORD);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe('Notifications — bell UI smoke', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
  });

  test('coordinator can open notification panel', async ({ page }) => {
    await loginAsCoordinator(page);
    await page.goto('/dashboard');
    await page.locator('button').filter({ has: page.locator('.anticon-bell') }).first().click();
    await expect(page.getByText('Thông báo hệ thống')).toBeVisible({ timeout: 10_000 });
  });
});
