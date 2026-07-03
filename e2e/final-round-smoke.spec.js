import { test, expect } from '@playwright/test';
import { findHackathonBySlug, waitForBackendReady, waitForLoginToken, waitForSeedSlug } from './helpers/api.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const STUDENT_EMAIL = process.env.E2E_STUDENT_FINAL_EMAIL || process.env.E2E_STUDENT_GD5_EMAIL || 'student.gd5.leader03@fpt.edu.vn';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const FINAL_ACTIVE_SEED = 'seal-gd5-final-active';

async function loginAsCoordinator(page) {
  await page.goto('/login');
  await page.getByPlaceholder('example@hackathon.com').fill(COORD_EMAIL);
  await page.getByPlaceholder('••••••••').fill(COORD_PASSWORD);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

async function loginAsStudent(page) {
  await page.goto('/login');
  await page.getByPlaceholder('example@hackathon.com').fill(STUDENT_EMAIL);
  await page.getByPlaceholder('••••••••').fill(STUDENT_PASSWORD);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|student)/, { timeout: 20_000 });
}

test.describe('Final round smoke', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const coordToken = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const finalSeed = await waitForSeedSlug(FINAL_ACTIVE_SEED, coordToken);
    test.skip(!finalSeed, `Seed ${FINAL_ACTIVE_SEED} not ready`);
  });

  test('final-config page loads', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(FINAL_ACTIVE_SEED, token);
    test.skip(!hackathon, `Seed ${FINAL_ACTIVE_SEED} not found`);

    await loginAsCoordinator(page);
    await page.goto(`/coordinator/final-config?hackathonId=${hackathon.id}`);
    await expect(page.getByText(/Cấu hình Chung kết|FINAL_ROUND/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Checklist vận hành — Chung kết/i)).toBeVisible();
    await expect(page.getByText(/Readiness FINAL_ROUND/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Làm mới/i })).toBeVisible();
  });

  test('student dashboard shows final submission area', async ({ page }) => {
    const token = await waitForLoginToken(STUDENT_EMAIL, STUDENT_PASSWORD, {
      timeoutMs: 20_000,
      intervalMs: 1_000,
    });
    test.skip(!token, `Student ${STUDENT_EMAIL} not available`);

    await loginAsStudent(page);
    await page.goto('/dashboard');
    await expect(page.getByText(/Chung kết|nộp bài|Final/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/Cổng nộp bài Chung kết|Vòng Chung kết chưa mở|Nộp bài Chung kết/i).first(),
    ).toBeVisible();
  });
});
