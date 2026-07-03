import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  waitForBackendReady,
  waitForLoginToken,
  waitForSeedSlug,
} from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const ADVANCE_READY_SEED = 'seal-gd4-advance-ready';
const CONFIRM_READY_SEED = 'seal-gd6-confirm-ready';

test.describe('Coordinator hackathon progression', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable — start with mvn spring-boot:run -Dspring-boot.run.profiles=dev');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const advanceSeed = await waitForSeedSlug(ADVANCE_READY_SEED, token);
    const confirmSeed = await waitForSeedSlug(CONFIRM_READY_SEED, token);
    test.skip(!advanceSeed || !confirmSeed, 'Required GĐ4/GĐ6 seeds not ready');
  });

  test('preliminary results page loads', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(ADVANCE_READY_SEED, token);
    test.skip(!hackathon, `Seed hackathon ${ADVANCE_READY_SEED} not found`);

    const prelim = await findPrelimRound(hackathon.id, token);
    test.skip(!prelim, 'No preliminary round on advance-ready seed');

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/hackathons/${hackathon.id}/rounds/${prelim.id}/results`);
    await expect(page.getByText(/Kết quả|Vòng Sơ loại|Bảng xếp hạng/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Chuyển vòng & công bố kết quả|Kết quả Sơ loại/i).first()).toBeVisible();
  });

  test('confirm-ready shows confirm trigger without mutating state', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(CONFIRM_READY_SEED, token);
    test.skip(!hackathon, `Seed hackathon ${CONFIRM_READY_SEED} not found`);

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/hackathons/${hackathon.id}/results`);
    await expect(page.locator('#hackathon-confirm-trigger')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/PENDING_CONFIRM|Đang chờ công bố/i).first()).toBeVisible();

    await page.locator('#hackathon-confirm-trigger').click();
    await expect(page.locator('#hackathon-confirm-cancel')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/Ghi chú xác nhận/i)).toBeVisible();
    await page.locator('#hackathon-confirm-cancel').click();
    await expect(page.locator('#hackathon-confirm-trigger')).toBeVisible();
  });
});
