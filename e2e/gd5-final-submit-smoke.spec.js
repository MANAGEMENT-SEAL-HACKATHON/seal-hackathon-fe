/**
 * GĐ5 Final Submission Smoke — non-mutating.
 * Seed: seal-gd5-final-active / student.gd5.leader01@fpt.edu.vn
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/uiAuth.js';
import { DevSeedSlugs } from './helpers/devSeedCatalogSlugs.js';

const STUDENT = {
  email: process.env.E2E_STUDENT_GD5_EMAIL || 'student.gd5.leader01@fpt.edu.vn',
  password: process.env.E2E_STUDENT_PASSWORD || 'Student@dev1',
  role: 'student',
};

test.describe('GĐ5 Final Submission Smoke (Non-Mutating)', () => {
  test('UI nộp bài Chung kết mở đúng, chặn submit thiếu repo/PDF, không gọi hackathon/1', async ({
    page,
  }) => {
    const wrongFinalRoundCalls = [];
    const submissionPosts = [];

    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/me/hackathons/1/final-round')) {
        wrongFinalRoundCalls.push(url);
      }
      if (req.method() === 'POST' && url.includes('/api/v1/submissions')) {
        submissionPosts.push(url);
      }
    });

    await loginAs(page, STUDENT);
    await page.goto('/student/submit', { waitUntil: 'domcontentloaded' });

    // Segmented: mặc định FINAL — đảm bảo chọn Chung kết
    const chungKet = page.getByText(/^Chung kết$/).first();
    if (await chungKet.isVisible().catch(() => false)) {
      await chungKet.click().catch(() => {});
    }

    await expect(page.getByText(/Cổng nộp bài Vòng Chung kết/i).first()).toBeVisible({
      timeout: 45_000,
    });

    const dragger = page.locator('.ant-upload-drag').first();
    await expect(dragger).toBeVisible({ timeout: 20_000 });
    // Không HARD_LOCK nhầm khi seed submit-open
    await expect(dragger).not.toHaveClass(/ant-upload-disabled/);

    await expect(page.getByText(/Link Source Code \(Github\)/i).first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Gửi Bài Dự Thi Chung Kết/i })
    ).toBeVisible();

    // Submit trống — FE chặn, không POST BE
    await page.getByRole('button', { name: /Gửi Bài Dự Thi Chung Kết/i }).click();

    await expect(
      page.getByText(/Link GitHub repository là bắt buộc|Vui lòng nhập URL GitHub/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Fill repo only → still blocked on missing PDF (toast), still no POST success path
    const repoInput = page
      .locator('.ant-form-item')
      .filter({ hasText: /Link Source Code/i })
      .locator('input')
      .first();
    await repoInput.fill('https://github.com/octocat/Hello-World');
    await page.getByRole('button', { name: /Gửi Bài Dự Thi Chung Kết/i }).click();
    await expect(
      page.getByText(/Vui lòng tải lên file slide PDF|slide PDF/i).first()
    ).toBeVisible({ timeout: 10_000 });

    expect(
      wrongFinalRoundCalls,
      `Must not call hackathons/1/final-round (slug=${DevSeedSlugs.GD5_FINAL_ACTIVE})`
    ).toEqual([]);
    expect(submissionPosts, 'Empty/invalid submit must not POST /submissions').toEqual([]);
  });
});
