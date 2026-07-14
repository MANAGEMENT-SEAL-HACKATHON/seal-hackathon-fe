/**
 * GĐ2 smoke — dữ liệu trên slug `seal-e2e-2026` (E2eWorkflowDataSeeder).
 * 7 đội E2E-T01..07 ACTIVE + 3 orphan — read-only, không lottery/approve.
 */
import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  waitForBackendReady,
  waitForLoginToken,
  waitForSeedSlug,
} from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const E2E_SLUG = 'seal-e2e-2026';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

async function waitForTeamsPage(page) {
  await expect(page.getByRole('heading', { name: /Quản lý đội thi/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/Duyệt đội/i).first()).toBeVisible({ timeout: 20_000 });
}

async function showActiveTeams(page) {
  await page.getByText('Đã duyệt', { exact: true }).click();
}

test.describe('GĐ2 — seal-e2e-2026 (teams / orphan / lottery)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(E2E_SLUG, token);
    test.skip(!hackathon, `Seed ${E2E_SLUG} not ready`);
  });

  test('coordinator sees 7 ACTIVE teams on /teams', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(E2E_SLUG, token);
    test.skip(!hackathon, `Seed ${E2E_SLUG} not found`);

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/teams?hackathonId=${hackathon.id}`);
    await waitForTeamsPage(page);
    await showActiveTeams(page);
    await expect(page.getByText(/E2E-T01/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/E2E-T07/i).first()).toBeVisible();
  });

  test('coordinator radar shows 3 orphan students', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(E2E_SLUG, token);
    test.skip(!hackathon, `Seed ${E2E_SLUG} not found`);

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/teams?hackathonId=${hackathon.id}`);
    await waitForTeamsPage(page);
    await page.getByRole('tab', { name: /Radar & Giải cứu/i }).click();
    await expect(page.getByText(/Sinh viên mồ côi \(3\)/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/student\.e2e\.orphan1@fpt\.edu\.vn/i).first()).toBeVisible();
  });

  test('lottery tab shows gate before registration closes', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(E2E_SLUG, token);
    test.skip(!hackathon, `Seed ${E2E_SLUG} not found`);

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/hackathons/${hackathon.id}/setup?tab=lottery`);
    await expect(page.getByText(/Bốc thăm Bảng đấu|Lottery/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /Bốc thăm Tự động/i })).toBeDisabled();
  });
});
