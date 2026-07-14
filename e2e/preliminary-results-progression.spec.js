import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  waitForBackendReady,
  waitForLoginToken,
  waitForSeedSlug,
} from './helpers/api.js';
import { getTiebreak, isMutatingEnabled } from './helpers/progressionApiHelpers.js';
test.skip(true, 'deprecated seed slug removed � see intentional-errors-catalog.md');

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const TIEBREAK_SEED_SLUG = 'seal-gd4-tiebreak-gate';

async function loginAsCoordinator(page) {
  await page.goto('/login');
  await page.getByPlaceholder('example@hackathon.com').fill(COORD_EMAIL);
  await page.getByPlaceholder('••••••••').fill(COORD_PASSWORD);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe('Preliminary results progression (read-only)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(TIEBREAK_SEED_SLUG, token);
    test.skip(!hackathon, `Seed ${TIEBREAK_SEED_SLUG} not ready`);
  });

  test('tiebreak seed blocks advance UI', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(TIEBREAK_SEED_SLUG, token);
    test.skip(!hackathon, `Seed ${TIEBREAK_SEED_SLUG} not found`);

    const prelim = await findPrelimRound(hackathon.id, token);
    test.skip(!prelim, 'No prelim round');

    const tiebreak = await getTiebreak(prelim.id, token);
    const items = Array.isArray(tiebreak) ? tiebreak : tiebreak?.items || [];
    test.skip(items.length === 0, 'Seed has no tiebreak items');

    await loginAsCoordinator(page);
    await page.goto(`/hackathons/${hackathon.id}/rounds/${prelim.id}/results`);
    await expect(page.getByText(/Tiebreak/i).first()).toBeVisible({ timeout: 20_000 });

    const advanceBtn = page.getByRole('button', { name: /Chốt chuyển vòng/i });
    if (await advanceBtn.isVisible()) {
      await expect(advanceBtn).toBeDisabled();
    }
  });
});

test.describe('Preliminary results progression (mutating)', () => {
  test.beforeAll(async () => {
    test.skip(!isMutatingEnabled(), 'Set E2E_MUTATING=1 to run mutating tests');
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(TIEBREAK_SEED_SLUG, token);
    test.skip(!hackathon, `Seed ${TIEBREAK_SEED_SLUG} not ready`);
  });

  test('tiebreak seed — advance button stays disabled after page reload', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(TIEBREAK_SEED_SLUG, token);
    test.skip(!hackathon, `Seed ${TIEBREAK_SEED_SLUG} not found`);

    const prelim = await findPrelimRound(hackathon.id, token);
    test.skip(!prelim, 'No prelim round');

    await loginAsCoordinator(page);
    await page.goto(`/hackathons/${hackathon.id}/rounds/${prelim.id}/results`);
    await expect(page.getByText(/Tiebreak/i).first()).toBeVisible({ timeout: 20_000 });

    const advanceBtn = page.getByRole('button', { name: /Chốt chuyển vòng/i });
    if (await advanceBtn.isVisible()) {
      await expect(advanceBtn).toBeDisabled();
      await page.reload();
      await expect(advanceBtn).toBeDisabled();
    }
  });
});
