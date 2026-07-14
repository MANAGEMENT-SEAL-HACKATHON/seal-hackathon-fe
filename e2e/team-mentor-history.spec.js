/**
 * FR-13C — lịch sử mentor theo vòng (coordinator + student).
 */
import { test, expect } from '@playwright/test';
import { waitForBackendReady, waitForLoginToken, waitForSeedSlug, findHackathonBySlug } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';
test.skip(true, 'deprecated seed slug removed � see intentional-errors-catalog.md');

const SLUG = 'seal-gd3-team-mentor-history';
const STUDENT_EMAIL = 'student.gd3mh.leader@fpt.edu.vn';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

test.describe('Team mentor history (FR-13C)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(SLUG, token);
    test.skip(!hackathon, `Seed ${SLUG} not ready`);
  });

  test('coordinator expand shows mentor history with ≥2 rounds', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(SLUG, token);
    test.skip(!hackathon, `Seed ${SLUG} not found`);

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/teams/${hackathon.id}`);
    await expect(page.getByRole('heading', { name: /Quản lý đội thi/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByText('Đã duyệt', { exact: true }).click();
    await page.getByPlaceholder(/Tìm tên đội/i).fill('GD3-MH-T01');
    await page
      .locator('tr')
      .filter({ hasText: 'GD3-MH-T01' })
      .locator('.ant-table-row-expand-icon')
      .click();

    const mentorPanel = page.getByText(/Người Dẫn Dắt Đội Thi|NGƯỜI HƯỚNG DẪN/i).first();
    await expect(mentorPanel).toBeVisible({ timeout: 15_000 });
    const mentorRoundRows = page.getByText(/Phụ trách:/i);
    await expect(mentorRoundRows.first()).toBeVisible({ timeout: 15_000 });
    expect(await mentorRoundRows.count()).toBeGreaterThanOrEqual(2);
  });

  test('student team dashboard shows mentor history panel', async ({ page }) => {
    await loginAs(page, { email: STUDENT_EMAIL, role: 'student' });
    await page.goto('/student/team');
    await expect(page.getByText(/Người Dẫn Dắt Đội Thi|NGƯỜI HƯỚNG DẪN/i).first()).toBeVisible({
      timeout: 20_000,
    });
    const mentorRoundRows = page.getByText(/Phụ trách:/i);
    await expect(mentorRoundRows.first()).toBeVisible({ timeout: 15_000 });
    expect(await mentorRoundRows.count()).toBeGreaterThanOrEqual(2);
  });
});
