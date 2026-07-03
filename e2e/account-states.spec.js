import { test, expect } from '@playwright/test';
import { waitForBackendReady, waitForLoginToken } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';
import {
  ACCOUNT_STATES_BY_KEY,
  ACCOUNT_STATES_PASSWORD,
  probeAccountStates,
} from './helpers/accountStates.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

/**
 * Điền form login mà KHÔNG kỳ vọng điều hướng (dùng cho các case bị chặn login).
 * @param {import('@playwright/test').Page} page
 */
async function attemptLogin(page, email, password) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('example@hackathon.com').waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByPlaceholder('example@hackathon.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
}

test.describe('Account states — email verify + duyệt tài khoản (Module 5)', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const results = await probeAccountStates();
    const failed = results.filter((r) => !r.pass);
    test.skip(
      failed.length > 0,
      `Account-state seeds not ready: ${failed.map((f) => `${f.key} (${f.reason})`).join('; ')}`,
    );
  });

  test('unverified student → gate xác thực + nút gửi lại email', async ({ page }) => {
    const acc = ACCOUNT_STATES_BY_KEY['unverified-student'];
    await attemptLogin(page, acc.email, ACCOUNT_STATES_PASSWORD);
    // Vẫn ở trang login (không vào dashboard)
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    // EMAIL_NOT_VERIFIED → hiện khối gửi lại email xác thực (phần tử ổn định, không phải toast)
    await expect(page.getByRole('button', { name: /Gửi lại email xác thực/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('pending judge → bị chặn với thông báo chờ duyệt', async ({ page }) => {
    const acc = ACCOUNT_STATES_BY_KEY['pending-judge'];
    await attemptLogin(page, acc.email, ACCOUNT_STATES_PASSWORD);
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByText(/chưa được phê duyệt|đang chờ|chờ duyệt/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('rejected judge → bị chặn với thông báo từ chối', async ({ page }) => {
    const acc = ACCOUNT_STATES_BY_KEY['rejected-judge'];
    await attemptLogin(page, acc.email, ACCOUNT_STATES_PASSWORD);
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByText(/bị từ chối/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('approved-unverified mentor → gate xác thực email (không phải chờ duyệt)', async ({ page }) => {
    const acc = ACCOUNT_STATES_BY_KEY['approved-unverified-mentor'];
    await attemptLogin(page, acc.email, ACCOUNT_STATES_PASSWORD);
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Gửi lại email xác thực/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/chưa được phê duyệt|chờ duyệt/i)).toHaveCount(0);
  });

  test('coordinator → hàng chờ duyệt (PENDING) và tài khoản bị từ chối (REJECTED)', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    test.skip(!token, 'Coordinator login token unavailable');

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto('/admin/users');

    await expect(page.getByText(/Duyệt tài khoản người dùng/i)).toBeVisible({ timeout: 20_000 });

    // Filter mặc định = PENDING → thấy mentor + judge chờ duyệt
    await expect(page.getByText(/Mentor Chờ duyệt/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Giám khảo Chờ duyệt/i).first()).toBeVisible({ timeout: 15_000 });

    // Chuyển filter sang REJECTED → thấy judge bị từ chối + lý do
    await page.locator('.ant-select').first().click();
    await page.getByText('Đã từ chối', { exact: true }).click();
    await expect(page.getByText(/Giám khảo Bị từ chối/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
