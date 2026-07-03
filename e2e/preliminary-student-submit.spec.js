import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  waitForBackendReady,
  waitForLoginToken,
  waitForSeedSlug,
} from './helpers/api.js';

const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || 'student.gd3.leader01@fpt.edu.vn';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const PRELIM_OPEN_SEED = 'seal-gd3-prelim-open';
const LATE_REVIEW_SEED = 'seal-gd3-late-review';

async function loginAsStudent(page) {
  await page.goto('/login');
  await page.getByPlaceholder('example@hackathon.com').fill(STUDENT_EMAIL);
  await page.getByPlaceholder('••••••••').fill(STUDENT_PASSWORD);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|student)/, { timeout: 20_000 });
}

async function loginAsCoordinator(page) {
  await page.goto('/login');
  await page.getByPlaceholder('example@hackathon.com').fill(COORD_EMAIL);
  await page.getByPlaceholder('••••••••').fill(COORD_PASSWORD);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe('Preliminary round student + coordinator smoke', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable — start with mvn spring-boot:run -Dspring-boot.run.profiles=dev');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(PRELIM_OPEN_SEED, token);
    test.skip(!hackathon, `Seed ${PRELIM_OPEN_SEED} not ready`);
  });

  test('student submission page shows status-driven UI', async ({ page }) => {
    const token = await waitForLoginToken(STUDENT_EMAIL, STUDENT_PASSWORD, {
      timeoutMs: 20_000,
      intervalMs: 1_000,
    });
    test.skip(!token, `Student seed ${STUDENT_EMAIL} not available`);

    await loginAsStudent(page);
    await page.goto('/student/submit');
    await expect(page.getByText(/Tiến trình nộp bài|Nộp bài|Đề bài/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('coordinator late review page loads with roundId filter', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(LATE_REVIEW_SEED, token);
    test.skip(!hackathon, `Seed hackathon ${LATE_REVIEW_SEED} not found`);

    const prelim = await findPrelimRound(hackathon.id, token);
    test.skip(!prelim, 'No preliminary round on late-review seed');

    await loginAsCoordinator(page);
    await page.goto(`/coordinator/late-submissions?roundId=${prelim.id}`);
    await expect(page.getByText(/Duyệt nộp trễ|nộp muộn|LATE_PENDING/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
