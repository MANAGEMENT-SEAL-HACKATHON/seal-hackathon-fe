import { expect } from '@playwright/test';

const DEFAULT_STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const DEFAULT_COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const DEFAULT_JUDGE_PASSWORD = process.env.E2E_JUDGE_PASSWORD || 'Judge@dev1';
const DEFAULT_GUEST_PASSWORD = process.env.E2E_GUEST_PASSWORD || 'GuestJudge@dev1';
const DEFAULT_MENTOR_PASSWORD = process.env.E2E_MENTOR_PASSWORD || 'Mentor@dev1';

export function resolvePassword(role, password) {
  if (password) return password;
  switch (role) {
    case 'coord':
      return DEFAULT_COORD_PASSWORD;
    case 'judge':
      return DEFAULT_JUDGE_PASSWORD;
    case 'guest':
      return DEFAULT_GUEST_PASSWORD;
    case 'mentor':
      return DEFAULT_MENTOR_PASSWORD;
    default:
      return DEFAULT_STUDENT_PASSWORD;
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ email: string, password?: string, role?: string }} account
 */
export async function loginAs(page, account) {
  const password = resolvePassword(account.role, account.password);
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('example@hackathon.com').waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByPlaceholder('example@hackathon.com').fill(account.email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();

  const dashboardPattern =
    account.role === 'coord' ? /\/dashboard/ : /\/(dashboard|student|judge|mentor)/;
  await expect(page).toHaveURL(dashboardPattern, { timeout: 30_000 });
}
