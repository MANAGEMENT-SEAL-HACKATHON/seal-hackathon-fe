import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  waitForBackendReady,
  waitForLoginToken,
  waitForSeedSlug,
} from './helpers/api.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const JUDGE_EMAIL = 'judge1@fpt.edu.vn';
const SEED = 'seal-e2e-2026';

async function loginAsCoordinator(page) {
  await page.goto('/login');
  await page.getByPlaceholder('example@hackathon.com').fill(COORD_EMAIL);
  await page.getByPlaceholder('••••••••').fill(COORD_PASSWORD);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe('People — mentor pool includes INTERNAL judge', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const seed = await waitForSeedSlug(SEED, token);
    test.skip(!seed, `Seed ${SEED} not ready`);
  });

  test('mentor dropdown lists judge accounts (symmetric pool)', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(SEED, token);
    test.skip(!hackathon?.id, `Seed ${SEED} not found`);

    await loginAsCoordinator(page);
    await page.goto(`/hackathons/${hackathon.id}/setup?tab=people`);
    await expect(page.getByText(/Phân công nhân sự theo bảng đấu/i)).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('tab', { name: /Mentor theo bảng đấu/i }).click();
    const panel = page.locator('.ant-tabs-tabpane-active');
    await expect(panel.getByRole('button', { name: /Gán mentor/i })).toBeVisible({ timeout: 15_000 });
    await panel.locator('.ant-select').first().click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
    await panel.locator('.ant-select').nth(1).click();
    await expect(page.getByText(/Giám khảo/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(JUDGE_EMAIL, { exact: false })).toBeVisible({ timeout: 10_000 });
  });
});
