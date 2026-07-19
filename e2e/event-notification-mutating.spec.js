import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  waitForBackendReady,
  waitForLoginToken,
  waitForSeedSlug,
} from './helpers/api.js';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const SEED = 'seal-gd1-incomplete';

async function apiRequest(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `HTTP ${res.status}`);
  }
  return json?.data ?? json;
}

function computePublicEventStartsAt(hackathon) {
  const eventStartStr = hackathon.eventStart || hackathon.event_start;
  const pad = (n) => String(n).padStart(2, '0');
  const formatLocal = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00:00`;

  if (eventStartStr) {
    return `${String(eventStartStr).slice(0, 10)}T10:00:00`;
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 30);
  return formatLocal(fallback);
}

async function listMyNotifications(token) {
  const data = await apiRequest('GET', '/me/notifications', { token });
  return Array.isArray(data) ? data : data?.items || [];
}

test.describe('Event create → EVENT_REMINDER notification (mutating)', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const seed = await waitForSeedSlug(SEED, token);
    test.skip(!seed, `Seed ${SEED} not ready`);
  });

  test('public event create fans out EVENT_REMINDER to coordinator', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(SEED, token);
    test.skip(!hackathon?.id, `Seed ${SEED} not found`);

    const title = `E2E Notify ${Date.now()}`;
    const startsAt = computePublicEventStartsAt(hackathon);

    await apiRequest('POST', `/hackathons/${hackathon.id}/events`, {
      token,
      body: {
        type: 'OTHER',
        title,
        startsAt,
        endsAt: startsAt,
        isPublic: true,
        location: 'Hall A',
      },
    });

    let found = null;
    for (let i = 0; i < 15; i += 1) {
      const items = await listMyNotifications(token);
      found = items.find(
        (n) =>
          n.type === 'EVENT_REMINDER' &&
          String(n.title || '').includes(title),
      );
      if (found) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(found, 'EVENT_REMINDER after public event create').toBeTruthy();

    const notifResponse = page.waitForResponse(
      (r) => r.url().includes('/me/notifications') && r.status() === 200,
      { timeout: 25_000 },
    );
    await page.goto('/login');
    await page.getByPlaceholder('example@hackathon.com').fill(COORD_EMAIL);
    await page.getByPlaceholder('••••••••').fill(COORD_PASSWORD);
    await page.getByRole('button', { name: /Đăng nhập/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await notifResponse;
    await page.locator('button').filter({ has: page.locator('.anticon-bell') }).first().click();
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
  });
});
