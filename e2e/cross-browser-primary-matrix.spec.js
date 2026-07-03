/**
 * Cross-browser smoke — 5 primary happy slugs only (read-only matrix subset).
 */
import { test, expect } from '@playwright/test';
import { ALL_DEV_SEEDS, getSeedBySlug } from './helpers/seedRegistry.js';
import { PRIMARY_HAPPY_SLUGS } from './helpers/primaryHappySlugs.js';
import {
  findHackathonBySlug,
  findPrelimRound,
  findFinalRound,
  waitForBackendReady,
  waitForLoginToken,
} from './helpers/api.js';
import { loginAs, resolvePassword } from './helpers/uiAuth.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

/** @type {string | null} */
let coordToken = null;

/** @type {Map<string, { hackathon: object, prelim: object|null, finalRound: object|null }>} */
const contextCache = new Map();

async function getCoordToken() {
  if (!coordToken) {
    coordToken = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
  }
  return coordToken;
}

async function resolveSeedContext(slug) {
  if (contextCache.has(slug)) {
    return contextCache.get(slug);
  }
  const token = await getCoordToken();
  const hackathon = await findHackathonBySlug(slug, token);
  if (!hackathon) {
    throw new Error(`Seed hackathon not found: ${slug}`);
  }
  const prelim = await findPrelimRound(hackathon.id, token);
  const finalRound = await findFinalRound(hackathon.id, token);
  const ctx = { hackathon, prelim, finalRound };
  contextCache.set(slug, ctx);
  return ctx;
}

for (const slug of PRIMARY_HAPPY_SLUGS) {
  const entry = getSeedBySlug(slug) || ALL_DEV_SEEDS.find((s) => s.slug === slug);
  if (!entry) continue;

  test.describe(`cross-browser: ${slug}`, () => {
    test.beforeAll(async () => {
      const ready = await waitForBackendReady();
      test.skip(!ready, 'BE dev server not reachable');
      const token = await getCoordToken();
      test.skip(!token, 'Coordinator login failed');
    });

    test(`${entry.label} — smoke visible`, async ({ page }) => {
      const ctx = await resolveSeedContext(slug);
      const path = entry.buildPath(ctx);

      if (path.includes('/rounds/') && path.includes('/results') && !ctx.prelim) {
        test.skip(true, `No prelim round for ${slug}`);
      }

      const accountToken = await waitForLoginToken(
        entry.email || COORD_EMAIL,
        resolvePassword(entry.role, entry.password),
        { timeoutMs: 20_000, intervalMs: 1_000 }
      );
      test.skip(!accountToken, `login failed for ${entry.email}`);

      await loginAs(page, {
        email: entry.email,
        password: entry.password,
        role: entry.role,
      });
      await page.goto(path);

      for (const pattern of entry.expectVisible || []) {
        await expect(page.getByText(pattern).first()).toBeVisible({ timeout: 25_000 });
      }
    });
  });
}
