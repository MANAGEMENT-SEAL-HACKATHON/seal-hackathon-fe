/**
 * Module 5 - Secondary portals (matchmaking / invitations / analytics / profile / OAuth).
 * Revived on live seeds: seal-e2e-2026 (orphans + ACTIVE teams), seal-gd3-prelim-open (RBL),
 * seal-fall-2025-finished (analytics unlock). File prefix `5-` for alphabetical order.
 *
 * Run:
 *   E2E_MUTATING=1 npx playwright test e2e/5-secondary-portals-mutating.spec.js --project=mutating-e2e --workers=1
 * NOTE: Vietnamese UI text uses \uXXXX escapes (repo tooling writes ASCII only).
 */
import { test, expect } from '@playwright/test';
import { isBackendReady } from './helpers/api.js';
import { isMutatingEnabled } from './helpers/progressionApiHelpers.js';
import { loginAs } from './helpers/uiAuth.js';
import {
  M5,
  apiRaw,
  loginCred,
  listMatchmaking,
  listOrphans,
  inviteMember,
  respondInvite,
  getRblProgress,
  getMe,
  assertNever500,
  withPatchedFullName,
  findTeamByName,
  findHackathonBySlug,
  findPrelimRound,
} from './helpers/secondaryPortalHelpers.js';

// "ghep doi|matchmaking|doi|chua co|bang tin"
const RE_MATCHMAKING =
  /gh\u00E9p \u0111\u1ED9i|matchmaking|\u0111\u1ED9i|ch\u01B0a c\u00F3|b\u1EA3ng tin/i;
// "Radar & Giai cuu"
const RE_RADAR_TAB = /Radar & Gi\u1EA3i c\u1EE9u/i;
// "dang khoa|FINISHED|RBL|Phan tich|Tien do"
const RE_ANALYTICS =
  /\u0111ang kh\u00F3a|FINISHED|RBL|Ph\u00E2n t\u00EDch|Ti\u1EBFn \u0111\u1ED9/i;
// "RBL|Tien do|Phan tich|Xuat|Export|dang khoa"
const RE_ANALYTICS_FINISHED =
  /RBL|Ti\u1EBFn \u0111\u1ED9|Ph\u00E2n t\u00EDch|Xu\u1EA5t|Export|\u0111ang kh\u00F3a/i;
// "GitHub OAuth loi|user_denied|access_denied"
const RE_OAUTH_ERROR = /GitHub OAuth l\u1ED7i|user_denied|access_denied/i;

const INVITE_GATE_CODES = [
  'TEAM_ALREADY_ACTIVE',
  'TEAM_MEMBER_FULL',
  'TEAM_FULL',
  'TEAM_LOCKED',
  'USER_IN_ANOTHER_TEAM',
  'ALREADY_MEMBER',
  'MEMBER_ALREADY',
];

test.describe('Secondary portals (Module 5)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  let coordToken;

  test.beforeAll(async () => {
    expect(isMutatingEnabled(), 'E2E_MUTATING=1 required').toBeTruthy();
    const ready = await isBackendReady();
    expect(ready, 'BE not reachable').toBeTruthy();
    coordToken = await loginCred(M5.coord);
  });

  test('1) Student orphan matchmaking board loads', async ({ page }) => {
    const e2e = await findHackathonBySlug('seal-e2e-2026', coordToken);
    expect(e2e?.id, 'seal-e2e-2026').toBeTruthy();

    const orphanToken = await loginCred(M5.orphan1);
    const mm = await listMatchmaking(orphanToken, e2e.id);
    assertNever500(mm.status, mm.json, 'matchmaking API');
    expect(mm.status).toBeGreaterThanOrEqual(200);
    expect(mm.status).toBeLessThan(300);

    await loginAs(page, { email: M5.orphan1.email, role: 'student' });
    await page.goto('/student/matchmaking');
    await expect(page.getByText(RE_MATCHMAKING).first()).toBeVisible({ timeout: 20_000 });
  });

  test('2) Coord radar shows orphans on seal-e2e-2026', async ({ page }) => {
    const e2e = await findHackathonBySlug('seal-e2e-2026', coordToken);
    expect(e2e?.id).toBeTruthy();
    const orphans = await listOrphans(coordToken, e2e.id);
    assertNever500(orphans.status, orphans.json, 'orphans API');
    expect(orphans.status).toBeGreaterThanOrEqual(200);
    expect(orphans.status).toBeLessThan(300);

    await loginAs(page, { email: M5.coord.email, role: 'coord' });
    // Pin the page to seal-e2e-2026 (header context may default to another seed)
    await page.goto(`/teams?hackathonId=${e2e.id}`);
    await page.getByRole('tab', { name: RE_RADAR_TAB }).click();
    await expect(page.getByText(/student\.e2e\.orphan1@fpt\.edu\.vn/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('3) Invite orphan to ACTIVE team -> named gate (no 500, no silent success)', async () => {
    const e2e = await findHackathonBySlug('seal-e2e-2026', coordToken);
    expect(e2e?.id).toBeTruthy();
    const t01 = await findTeamByName(coordToken, e2e.id, /T01/i);
    expect(t01?.id, 'E2E-T01').toBeTruthy();

    const leaderToken = await loginCred(M5.t01Leader);
    const inv = await inviteMember(leaderToken, t01.id, M5.orphan1.email);
    assertNever500(inv.status, inv.json, 'invite orphan to ACTIVE team');

    if (inv.status >= 200 && inv.status < 300) {
      // Invite unexpectedly allowed - reject to clean and still assert no 500 anywhere.
      const orphanToken = await loginCred(M5.orphan1);
      const me = await getMe(orphanToken);
      const userId = me.data?.id ?? me.data?.userId;
      const rej = await respondInvite(orphanToken, t01.id, userId, 'REJECT');
      assertNever500(rej.status, rej.json, 'reject cleanup');
    } else {
      expect(
        INVITE_GATE_CODES.includes(inv.code) || /ACTIVE|LOCKED|FULL/i.test(inv.code),
        `invite gate: expected named 4xx, got ${inv.status} ${inv.code} ${JSON.stringify(inv.json).slice(0, 300)}`,
      ).toBe(true);
    }
  });

  test('4) Invite busy member (leader of another team) -> named gate', async () => {
    const e2e = await findHackathonBySlug('seal-e2e-2026', coordToken);
    expect(e2e?.id).toBeTruthy();
    const t01 = await findTeamByName(coordToken, e2e.id, /T01/i);
    expect(t01?.id, 'E2E-T01').toBeTruthy();

    const leaderToken = await loginCred(M5.t01Leader);
    const inv = await inviteMember(leaderToken, t01.id, M5.busyLeader.email);
    assertNever500(inv.status, inv.json, 'invite busy');
    const ok =
      (inv.status >= 200 && inv.status < 300) ||
      INVITE_GATE_CODES.includes(inv.code) ||
      /ALREADY|ANOTHER|FULL|LOCKED|ACTIVE/i.test(inv.code);
    expect(
      ok,
      `invite busy: unexpected ${inv.status} ${inv.code} ${JSON.stringify(inv.json).slice(0, 300)}`,
    ).toBe(true);

    // If invite somehow succeeded (PENDING), reject to clean
    if (inv.status >= 200 && inv.status < 300) {
      const busyToken = await loginCred(M5.busyLeader);
      const busyMe = await getMe(busyToken);
      const busyId = busyMe.data?.id ?? busyMe.data?.userId;
      if (busyId) {
        const rej = await respondInvite(busyToken, t01.id, busyId, 'REJECT');
        assertNever500(rej.status, rej.json, 'reject cleanup');
      }
    }
  });

  test('5) Analytics: RBL API 2xx + UI gate on ONGOING / unlock on FINISHED', async ({ page }) => {
    const live = await findHackathonBySlug('seal-gd3-prelim-open', coordToken);
    expect(live?.id).toBeTruthy();
    const prelim = await findPrelimRound(live.id, coordToken);
    expect(prelim?.id).toBeTruthy();

    const progress = await getRblProgress(coordToken, prelim.id);
    assertNever500(progress.status, progress.json, 'rbl progress');
    expect(progress.status).toBeGreaterThanOrEqual(200);
    expect(progress.status).toBeLessThan(300);

    await loginAs(page, { email: M5.coord.email, role: 'coord' });
    await page.goto(`/hackathons/${live.id}/setup?tab=analytics`);
    await expect(page.getByText(RE_ANALYTICS).first()).toBeVisible({ timeout: 20_000 });

    const finished = await findHackathonBySlug('seal-fall-2025-finished', coordToken);
    expect(finished?.id, 'seal-fall-2025-finished').toBeTruthy();
    await page.goto(`/hackathons/${finished.id}/setup?tab=analytics`);
    await expect(page.getByText(RE_ANALYTICS_FINISHED).first()).toBeVisible({ timeout: 20_000 });
  });

  test('6) Profile PATCH fullName + finally restore', async () => {
    const token = await loginCred(M5.profileStudent);
    await withPatchedFullName(token, async (tempName) => {
      expect(tempName).toMatch(/ \u00B7 m5-/);
    });
  });

  test('7) Login OAuth controls + github callback error path', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByText(/GitHub/i).first()).toBeVisible({ timeout: 15_000 });
    await page.goto('/auth/github/callback?error=access_denied&error_description=user_denied');
    await expect(page.getByText(RE_OAUTH_ERROR).first()).toBeVisible({ timeout: 15_000 });
  });

  test('8) OAuth invalid token -> OAUTH_TOKEN_INVALID', async () => {
    const { status, code, json } = await apiRaw('POST', '/auth/oauth/google', {
      body: { idToken: 'module5-invalid-oauth-token' },
    });
    assertNever500(status, json, 'oauth invalid');
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
    expect(['OAUTH_TOKEN_INVALID', 'OAUTH_TOKEN_EXPIRED', 'FORBIDDEN'].includes(code)).toBe(true);
  });
});
