/**
 * FE ↔ BE slug parity — DevSeedCatalog vs seedRegistry.
 */
import { test, expect } from '@playwright/test';
import { ALL_DEV_SLUGS } from './helpers/seedRegistry.js';
import { BE_DEV_SLUGS, EXPECTED_SLUG_COUNT } from './helpers/devSeedCatalogSlugs.js';

test.describe('Dev seed slug parity (FE ↔ BE)', () => {
  test('both catalogs have expected count', () => {
    expect(BE_DEV_SLUGS).toHaveLength(EXPECTED_SLUG_COUNT);
    expect(ALL_DEV_SLUGS).toHaveLength(EXPECTED_SLUG_COUNT);
  });

  test('FE slugs match BE catalog (set + order)', () => {
    expect(ALL_DEV_SLUGS).toEqual(BE_DEV_SLUGS);
  });

  test('no duplicate slugs in FE registry', () => {
    expect(new Set(ALL_DEV_SLUGS).size).toBe(ALL_DEV_SLUGS.length);
  });
});
