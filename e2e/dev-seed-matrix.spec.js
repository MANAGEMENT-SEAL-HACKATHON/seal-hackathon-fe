/**
 * Dev seed matrix E2E — 53 slugs read-only (happy + bad).
 *
 * Prerequisites: single BE instance (profile dev), all seeds loaded.
 *   mvn spring-boot:run "-Dspring-boot.run.profiles=dev"
 *
 * Run: npm run test:e2e:matrix
 */
import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  findFinalRound,
  waitForBackendReady,
  waitForLoginToken,
  waitForAllSeedSlugs,
} from './helpers/api.js';
import { ALL_DEV_SEEDS, ALL_DEV_SLUGS } from './helpers/seedRegistry.js';
import { loginAs } from './helpers/uiAuth.js';

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

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('./helpers/seedRegistry.js').DevSeedEntry} seed
 */
async function runSeedAssertions(page, seed) {
  for (const pattern of seed.expectVisible || []) {
    await expect(page.getByText(pattern).first()).toBeVisible({ timeout: 20_000 });
  }

  for (const pattern of seed.expectNotVisible || []) {
    await expect(page.getByText(pattern)).toHaveCount(0, { timeout: 5_000 });
  }

  if (seed.expectDisabledSelector) {
    await expect(page.locator(seed.expectDisabledSelector).first()).toBeDisabled({ timeout: 20_000 });
  }

  if (seed.expectEnabledSelector) {
    await expect(page.locator(seed.expectEnabledSelector).first()).toBeEnabled({ timeout: 20_000 });
  }

  if (seed.runActions) {
    await seed.runActions(page);
  }
}

test.describe('Dev seed matrix (53 slugs)', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable — start with mvn spring-boot:run -Dspring-boot.run.profiles=dev');

    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    test.skip(!token, 'Coordinator login failed');

    coordToken = token;
    const missing = await waitForAllSeedSlugs(ALL_DEV_SLUGS, token);
    test.skip(missing.length > 0, `Missing dev seeds (${missing.length}): ${missing.join(', ')}`);
  });

  for (const seed of ALL_DEV_SEEDS) {
    test(`${seed.slug} — ${seed.label}`, async ({ page }) => {
      const ctx = await resolveSeedContext(seed.slug);
      const path = seed.buildPath(ctx);

      if (path.includes('/rounds/') && path.includes('/results') && !ctx.prelim) {
        test.skip(true, `No prelim round for ${seed.slug}`);
      }
      if (path.includes('late-submissions') && !ctx.prelim && !ctx.finalRound) {
        test.skip(true, `No round for late-submissions on ${seed.slug}`);
      }
      if (path.includes('final-config') && !ctx.finalRound) {
        test.skip(true, `No final round for ${seed.slug}`);
      }
      if (path.includes('presentation/queue') && seed.role === 'guest' && !ctx.finalRound) {
        test.skip(true, `No final round for ${seed.slug}`);
      }
      if (path.includes('presentation/queue') && seed.role === 'judge' && !ctx.prelim) {
        test.skip(true, `No prelim round for ${seed.slug}`);
      }

      await loginAs(page, { email: seed.email, password: seed.password, role: seed.role });
      await page.goto(path);
      await runSeedAssertions(page, seed);
    });
  }
});
