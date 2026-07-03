import { test, expect } from '@playwright/test';
import { waitForBackendReady } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const STUDENT_EMAIL = 'student.archive.fall2025@fpt.edu.vn';

test.describe('Student portal API gaps smoke', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
  });

  test('annual awards page route exists', async ({ page }) => {
    await loginAs(page, { email: STUDENT_EMAIL, role: 'student' });
    await page.goto('/student/annual-awards');
    await expect(page).toHaveURL(/annual-awards/);
    await expect(page.getByRole('heading', { name: /Giải cá nhân năm/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('hackathon history page route exists', async ({ page }) => {
    await loginAs(page, { email: STUDENT_EMAIL, role: 'student' });
    await page.goto('/student/hackathons');
    await expect(page).toHaveURL(/student\/hackathons/);
    await expect(page.getByRole('heading', { name: /Cuộc thi đã tham gia/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
