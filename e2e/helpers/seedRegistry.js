/**
 * Dev seed matrix — 6 happy-path slugs (mirrors BE DevSeedCatalog).
 * Negative/gate: BE/docs/testing/intentional-errors-catalog.md
 */
import { expect } from '@playwright/test';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';

/** @typedef {'coord' | 'student' | 'judge' | 'guest'} SeedRole */

/**
 * @typedef {object} SeedContext
 * @property {{ id: string|number, slug?: string, status?: string }} hackathon
 * @property {{ id: string|number, is_active?: boolean, isActive?: boolean } | null} [prelim]
 * @property {{ id: string|number, is_active?: boolean, isActive?: boolean } | null} [finalRound]
 */

/**
 * @typedef {object} DevSeedEntry
 * @property {string} slug
 * @property {string} stage
 * @property {string} label
 * @property {SeedRole} role
 * @property {string} email
 * @property {string} [password]
 * @property {(ctx: SeedContext) => string} buildPath
 * @property {(string|RegExp)[]} expectVisible
 * @property {(string|RegExp)[]} [expectNotVisible]
 * @property {string} [expectDisabledSelector]
 * @property {string} [expectEnabledSelector]
 * @property {(page: import('@playwright/test').Page) => Promise<void>} [runActions]
 */

/** @param {SeedContext} ctx */
function prelimResultsPath(ctx) {
  return `/hackathons/${ctx.hackathon.id}/rounds/${ctx.prelim.id}/results`;
}

/** @param {SeedContext} ctx */
function hackathonResultsPath(ctx) {
  return `/hackathons/${ctx.hackathon.id}/results`;
}

/** @type {DevSeedEntry[]} */
export const ALL_DEV_SEEDS = [
  {
    slug: 'seal-e2e-2026',
    stage: 'gd1',
    label: 'E2E ONGOING — setup / GĐ1–GĐ2 happy',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup`,
    expectVisible: [/SEAL E2E 2026/i, /Vòng thi \(Rounds\)|Bảng đấu/i],
  },
  {
    slug: 'seal-fall-2025-finished',
    stage: 'gd1',
    label: 'FINISHED archive — read-only results',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: hackathonResultsPath,
    expectVisible: [/FINISHED|Đã công bố kết quả/i],
    expectEnabledSelector: '#hackathon-export-csv',
  },
  {
    slug: 'seal-gd3-prelim-open',
    stage: 'gd3',
    label: 'Prelim open — student chưa nộp (full GĐ3)',
    role: 'student',
    email: 'student.gd3.leader06@fpt.edu.vn',
    buildPath: () => '/student/submit',
    expectVisible: [/Cổng Nộp Bài|Biểu Mẫu Nộp Bài/i, /CỔNG ĐANG MỞ/i],
    expectNotVisible: [/ĐÃ NỘP BÀI THÀNH CÔNG/i],
  },
  {
    slug: 'seal-gd4-advance-ready',
    stage: 'gd4',
    label: 'Advance ready — chưa công bố (full GĐ4)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Chưa công bố/i, /Công bố kết quả/i],
    expectNotVisible: [/Đã chốt chuyển vòng/i],
  },
  {
    slug: 'seal-gd4-tiebreak-submission-time',
    stage: 'gd4',
    label: 'Tiebreak SUBMISSION_TIME — prelim published + ranking',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Chưa công bố|Công bố kết quả/i],
  },
  {
    slug: 'seal-gd4-tiebreak-manual',
    stage: 'gd4',
    label: 'Tiebreak COORDINATOR_DECISION — prelim published + ranking',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Chưa công bố|Công bố kết quả/i],
  },
  {
    slug: 'seal-gd4-wildcard-gap',
    stage: 'gd4',
    label: 'Wildcard gap — prelim published + ranking',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Chưa công bố|Công bố kết quả/i],
  },
  {
    slug: 'seal-gd5-final-active',
    stage: 'gd5',
    label: 'Final active — submit CK mở (full GĐ5)',
    role: 'student',
    email: 'student.gd5.leader01@fpt.edu.vn',
    buildPath: () => '/dashboard',
    expectVisible: [/Chung kết|Nộp bài Chung kết|Cổng nộp bài Chung kết/i],
  },
  {
    slug: 'seal-gd6-pending-confirm',
    stage: 'gd6',
    label: 'Pending confirm — đủ podium (full GĐ6)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: hackathonResultsPath,
    expectVisible: [/PENDING_CONFIRM|Đang chờ công bố/i],
    expectEnabledSelector: '#hackathon-confirm-trigger',
    async runActions(page) {
      await page.getByRole('tab', { name: /Giải thưởng/i }).click();
      await expect(page.getByRole('heading', { name: /Giải Nhất/i })).toBeVisible({ timeout: 15_000 });
    },
  },
];

export const ALL_DEV_SLUGS = ALL_DEV_SEEDS.map((s) => s.slug);

/** @param {string} slug */
export function getSeedBySlug(slug) {
  const seed = ALL_DEV_SEEDS.find((s) => s.slug === slug);
  if (!seed) {
    throw new Error(`Unknown dev seed slug: ${slug}`);
  }
  return seed;
}

export const SEEDS_BY_STAGE = {
  gd1: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd1'),
  gd2: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd2'),
  gd3: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd3'),
  gd4: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd4'),
  gd5: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd5'),
  gd6: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd6'),
};
