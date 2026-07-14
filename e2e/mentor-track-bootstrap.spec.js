/**
 * FR-M-05 — mentor track bootstrap khi chưa có mentor/rounds assignments.
 */
import { test, expect } from '@playwright/test';
import { waitForBackendReady, waitForLoginToken, waitForSeedSlug } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';
test.skip(true, 'deprecated seed slug removed � see intentional-errors-catalog.md');

const SLUG = 'seal-gd3-mentor-track-only';
const MENTOR_EMAIL = 'mentor.trackonly@fpt.edu.vn';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

test.describe('Mentor track bootstrap (FR-M-05)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(SLUG, token);
    test.skip(!hackathon, `Seed ${SLUG} not ready`);
  });

  test('mentor sees track-only fallback card on /mentor/rounds', async ({ page }) => {
    await loginAs(page, {
      email: MENTOR_EMAIL,
      password: process.env.E2E_MENTOR_PASSWORD || 'Mentor@dev1',
      role: 'student',
    });
    await page.goto('/mentor/rounds');
    await expect(page.getByText(/Bạn đã được gán track chuyên môn/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/chưa có vòng thi nào cần hỗ trợ trực tiếp/i)).toBeVisible();
  });
});
