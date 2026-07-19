/**
 * Preliminary results progression - revived on live seed seal-gd4-tiebreak-manual
 * (prelim locked + unpublished + 1 unresolved COORDINATOR_DECISION tiebreak).
 * The advance button must stay disabled while the tiebreak is unresolved.
 * NOTE: Vietnamese UI text uses \uXXXX escapes (repo tooling writes ASCII only).
 */
import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  waitForBackendReady,
  waitForLoginToken,
  waitForSeedSlug,
} from './helpers/api.js';
import { getTiebreak } from './helpers/progressionApiHelpers.js';
import { loginAs } from './helpers/uiAuth.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const TIEBREAK_SEED_SLUG = 'seal-gd4-tiebreak-manual';

// "Tiebreak|dong diem"
const RE_TIEBREAK = /Tiebreak|\u0111\u1ED3ng \u0111i\u1EC3m/i;
// "Chot chuyen vong"
const RE_ADVANCE_BTN = /Ch\u1ED1t chuy\u1EC3n v\u00F2ng/i;

test.describe('Preliminary results progression (read-only)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    expect(ready, 'BE dev server not reachable').toBeTruthy();
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(TIEBREAK_SEED_SLUG, token);
    expect(hackathon, `Seed ${TIEBREAK_SEED_SLUG} not ready`).toBeTruthy();
  });

  test('tiebreak seed blocks advance UI', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(TIEBREAK_SEED_SLUG, token);
    expect(hackathon, `Seed ${TIEBREAK_SEED_SLUG} not found`).toBeTruthy();

    const prelim = await findPrelimRound(hackathon.id, token);
    expect(prelim, 'No prelim round').toBeTruthy();

    const tiebreak = await getTiebreak(prelim.id, token);
    const items = Array.isArray(tiebreak) ? tiebreak : tiebreak?.items || [];
    expect(items.length, 'Seed must have tiebreak items').toBeGreaterThan(0);

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/hackathons/${hackathon.id}/rounds/${prelim.id}/results`);
    await expect(page.getByText(RE_TIEBREAK).first()).toBeVisible({ timeout: 20_000 });

    const advanceBtn = page.getByRole('button', { name: RE_ADVANCE_BTN });
    if (await advanceBtn.isVisible()) {
      await expect(advanceBtn).toBeDisabled();
    }
  });
});

test.describe('Preliminary results progression (reload persistence)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    expect(ready, 'BE dev server not reachable').toBeTruthy();
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await waitForSeedSlug(TIEBREAK_SEED_SLUG, token);
    expect(hackathon, `Seed ${TIEBREAK_SEED_SLUG} not ready`).toBeTruthy();
  });

  test('tiebreak seed - advance button stays disabled after page reload', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(TIEBREAK_SEED_SLUG, token);
    expect(hackathon, `Seed ${TIEBREAK_SEED_SLUG} not found`).toBeTruthy();

    const prelim = await findPrelimRound(hackathon.id, token);
    expect(prelim, 'No prelim round').toBeTruthy();

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/hackathons/${hackathon.id}/rounds/${prelim.id}/results`);
    await expect(page.getByText(RE_TIEBREAK).first()).toBeVisible({ timeout: 20_000 });

    const advanceBtn = page.getByRole('button', { name: RE_ADVANCE_BTN });
    if (await advanceBtn.isVisible()) {
      await expect(advanceBtn).toBeDisabled();
      await page.reload();
      await expect(page.getByText(RE_TIEBREAK).first()).toBeVisible({ timeout: 20_000 });
      await expect(advanceBtn).toBeDisabled();
    }
  });
});
