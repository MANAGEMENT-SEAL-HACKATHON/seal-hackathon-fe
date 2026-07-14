/**
 * Module 5 — Secondary portals (matchmaking / invitations / analytics / profile / OAuth).
 * File prefix `5-` for alphabetical order (Rủi ro 1). workers=1 required.
 *
 * Run:
 *   E2E_MUTATING=1 npx playwright test e2e/5-secondary-portals-mutating.spec.js --project=mutating-e2e --workers=1
 * Restart BE before full suite / after mutating.
 */
import { test, expect } from '@playwright/test';
import { isBackendReady } from './helpers/api.js';
import { isMutatingEnabled } from './helpers/progressionApiHelpers.js';
import { loginAs } from './helpers/uiAuth.js';
import {
test.skip(true, 'deprecated seed slug removed � see intentional-errors-catalog.md');
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
  assertInviteAcceptOutcome,
  withPatchedFullName,
  findTeamByName,
  findHackathonBySlug,
  findPrelimRound,
} from './helpers/secondaryPortalHelpers.js';

test.describe('Secondary portals (Module 5)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  let coordToken;

  test.beforeAll(async () => {
    test.skip(!isMutatingEnabled(), 'E2E_MUTATING=1 required');
    const ready = await isBackendReady();
    test.skip(!ready, 'BE not reachable');
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
    await expect(
      page.getByText(/ghép đội|matchmaking|đội|chưa có|bảng tin/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('2) Coord radar shows orphans on seal-e2e-2026', async ({ page }) => {
    const e2e = await findHackathonBySlug('seal-e2e-2026', coordToken);
    expect(e2e?.id).toBeTruthy();
    const orphans = await listOrphans(coordToken, e2e.id);
    assertNever500(orphans.status, orphans.json, 'orphans API');
    expect(orphans.status).toBeGreaterThanOrEqual(200);
    expect(orphans.status).toBeLessThan(300);

    await loginAs(page, { email: M5.coord.email, role: 'coord' });
    await page.goto('/teams');
    await page.getByRole('tab', { name: /Radar & Giải cứu/i }).click();
    await expect(page.getByText(/student\.e2e\.orphan1@fpt\.edu\.vn/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('3) Invitee accept PENDING on teams-edge (or TEAM_MEMBER_FULL)', async () => {
    const edge = await findHackathonBySlug('seal-gd2-teams-edge', coordToken);
    expect(edge?.id, 'teams-edge').toBeTruthy();
    const t02 = await findTeamByName(coordToken, edge.id, /T02|PENDING/i);
    expect(t02?.id, 'T02 team').toBeTruthy();

    const inviteeToken = await loginCred(M5.pendingInvitee);
    const me = await getMe(inviteeToken);
    const userId = me.data?.id ?? me.data?.userId;
    expect(userId).toBeTruthy();

    // Repair: ensure PENDING invite exists (leader re-invite if needed)
    let accept = await respondInvite(inviteeToken, t02.id, userId, 'ACCEPT');
    if (
      accept.status >= 400 &&
      ['INVALID_STATUS_TRANSITION', 'FORBIDDEN'].includes(accept.code)
    ) {
      const leaderToken = await loginCred(M5.t02Leader);
      const inv = await inviteMember(leaderToken, t02.id, M5.pendingInvitee.email);
      assertNever500(inv.status, inv.json, 're-invite');
      // If already member / full / in another team — assert and stop
      if (
        ['TEAM_MEMBER_FULL', 'TEAM_FULL', 'USER_IN_ANOTHER_TEAM', 'MEMBER_ALREADY'].some((c) =>
          inv.code.includes(c),
        )
      ) {
        assertInviteAcceptOutcome(inv, 're-invite outcome');
        return;
      }
      accept = await respondInvite(inviteeToken, t02.id, userId, 'ACCEPT');
    }
    assertInviteAcceptOutcome(accept, 'accept T02');
  });

  test('4) Invite busy member → USER_IN_ANOTHER_TEAM (or TEAM_MEMBER_FULL)', async () => {
    const edge = await findHackathonBySlug('seal-gd2-teams-edge', coordToken);
    expect(edge?.id).toBeTruthy();
    const t01 = await findTeamByName(coordToken, edge.id, /T01/i);
    expect(t01?.id, 'T01').toBeTruthy();

    const leaderToken = await loginCred(M5.t01Leader);
    const inv = await inviteMember(leaderToken, t01.id, M5.poolBusy.email);
    assertNever500(inv.status, inv.json, 'invite busy');
    const ok =
      (inv.status >= 200 && inv.status < 300) ||
      [
        'USER_IN_ANOTHER_TEAM',
        'TEAM_MEMBER_FULL',
        'TEAM_FULL',
        'TEAM_LOCKED',
        'ALREADY_MEMBER',
        'MEMBER_ALREADY',
      ].includes(inv.code) ||
      /ALREADY|ANOTHER|FULL|LOCKED/i.test(inv.code);
    expect(
      ok,
      `invite busy: unexpected ${inv.status} ${inv.code} ${JSON.stringify(inv.json).slice(0, 300)}`,
    ).toBe(true);

    // If invite somehow succeeded (PENDING), reject to clean
    if (inv.status >= 200 && inv.status < 300) {
      const busyToken = await loginCred(M5.poolBusy);
      const busyMe = await getMe(busyToken);
      const busyId = busyMe.data?.id ?? busyMe.data?.userId;
      if (busyId) {
        const rej = await respondInvite(busyToken, t01.id, busyId, 'REJECT');
        assertNever500(rej.status, rej.json, 'reject cleanup');
      }
    }
  });

  test('5) Analytics: RBL API 2xx + UI gate on ONGOING / unlock on FINISHED', async ({ page }) => {
    const live = await findHackathonBySlug('seal-gd3-scoring-live', coordToken);
    expect(live?.id).toBeTruthy();
    const prelim = await findPrelimRound(live.id, coordToken);
    expect(prelim?.id).toBeTruthy();

    const progress = await getRblProgress(coordToken, prelim.id);
    assertNever500(progress.status, progress.json, 'rbl progress');
    expect(progress.status).toBeGreaterThanOrEqual(200);
    expect(progress.status).toBeLessThan(300);

    await loginAs(page, { email: M5.coord.email, role: 'coord' });
    await page.goto(`/hackathons/${live.id}/setup?tab=analytics`);
    await expect(
      page.getByText(/Đang khóa|FINISHED|RBL|Phân tích|Tiến độ/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    const finished = await findHackathonBySlug('seal-fall-2025-finished', coordToken);
    if (finished?.id) {
      await page.goto(`/hackathons/${finished.id}/setup?tab=analytics`);
      await expect(
        page.getByText(/RBL|Tiến độ|Phân tích|Xuất|Export|Đang khóa/i).first(),
      ).toBeVisible({ timeout: 20_000 });
    }
  });

  test('6) Profile PATCH fullName + finally restore', async () => {
    const token = await loginCred(M5.profileStudent);
    await withPatchedFullName(token, async (tempName) => {
      expect(tempName).toMatch(/ · m5-/);
    });
  });

  test('7) Login OAuth controls + github callback error path', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByText(/GitHub/i).first()).toBeVisible({ timeout: 15_000 });
    await page.goto('/auth/github/callback?error=access_denied&error_description=user_denied');
    await expect(page.getByText(/GitHub OAuth lỗi|user_denied|access_denied/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('8) OAuth invalid token → OAUTH_TOKEN_INVALID', async () => {
    const { status, code, json } = await apiRaw('POST', '/auth/oauth/google', {
      body: { idToken: 'module5-invalid-oauth-token' },
    });
    assertNever500(status, json, 'oauth invalid');
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
    expect(['OAUTH_TOKEN_INVALID', 'OAUTH_TOKEN_EXPIRED', 'FORBIDDEN'].includes(code)).toBe(true);
  });
});
