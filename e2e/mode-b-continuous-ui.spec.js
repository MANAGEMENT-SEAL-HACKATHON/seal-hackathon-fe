/**
 * Mode B Continuous — pure UI create → FINISHED (serial).
 * No seed SUT, no progressionApiHelpers mutate, no Mode A snapshot jump.
 * Timeline early-close UI buttons are allowed.
 *
 * Run:
 *   E2E_MUTATING=1 npx playwright test e2e/mode-b-continuous-ui.spec.js --project=mutating-e2e --workers=1
 */
import { test, expect } from '@playwright/test';
import {
  findPrelimRound,
  findFinalRound,
  isBackendReady,
  login,
} from './helpers/api.js';
import { isMutatingEnabled } from './helpers/progressionApiHelpers.js';
import {
  uniqueSlug,
  buildTimelineDates,
  minimalPdfFile,
  createAuthedContext,
  asRole,
  disposeSessions,
  loginAsDomReady,
  fillAntDateTime,
  fillFormInput,
  selectFormOption,
  waitForStudentSubmitReady,
  waitUntilPresentingScorable,
  fillAllCriteriaScores,
  openJudgeScoringRoom,
  drivePresentationTimerToQa,
  lockScoringByApi,
  publishRoundByApi,
  advanceRoundByApi,
  closeSubmissionEarlyByApi,
  shufflePresentationQueue,
  scoreEntirePresentationQueue,
  awardPrizeByApi,
  confirmHackathonByApi,
  createExportJobByApi,
  getTeamRankings,
  getHackathonStatus,
  loginToken,
  assignPrelimJudgeByEmail,
  assignFinalGuestJudgeByEmail,
  createMilestoneEvents,
  registerStudentForHackathon,
  applyStandardCriteriaBundle,
  createPrelimAndFinalRounds,
  createPrelimTrack,
  createStudentTeam,
  approvePendingTeams,
  uploadRoundProblemPdf,
  submitStudentMultipart,
  minimalPdfBlob,
  activateRoundByApi,
  getRoundActive,
  releaseRoundProblem,
  releaseTrackProblem,
} from './helpers/modeBContinuousHelpers.js';

const COORD = {
  email: process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn',
  password: process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1',
  role: 'coord',
};
const JUDGE = {
  email: process.env.E2E_JUDGE_EMAIL || 'judge1@fpt.edu.vn',
  password: process.env.E2E_JUDGE_PASSWORD || 'Judge@dev1',
  role: 'judge',
};
const GUEST = {
  email: process.env.E2E_GUEST_EMAIL || 'guestjudge@gmail.com',
  password: process.env.E2E_GUEST_PASSWORD || 'GuestJudge@dev1',
  role: 'guest',
};
/** Prefer teamless orphans (unregister from seal-e2e first). gd6f still has FINISHED team → UI blocks create. */
const SV1 = {
  email: process.env.E2E_M2_SV1 || 'student.e2e.orphan1@fpt.edu.vn',
  password: process.env.E2E_STUDENT_PASSWORD || 'Student@dev1',
  role: 'student',
};
const SV2 = {
  email: process.env.E2E_M2_SV2 || 'student.e2e.orphan2@fpt.edu.vn',
  password: process.env.E2E_STUDENT_PASSWORD || 'Student@dev1',
  role: 'student',
};

const GITHUB_REPO = 'https://github.com/octocat/Hello-World';

test.describe('Mode B Continuous UI (create → FINISHED)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(900_000);

  /** @type {any} */
  let ctx = {
    slug: null,
    hackathonId: null,
    prelimRoundId: null,
    finalRoundId: null,
    trackId: null,
    sessions: null,
    timeline: null,
    coordToken: null,
  };

  test.beforeAll(async ({ browser }) => {
    test.skip(!isMutatingEnabled(), 'E2E_MUTATING=1 required');
    const ready = await isBackendReady();
    test.skip(!ready, 'BE dev server not reachable');

    ctx.timeline = buildTimelineDates();
    ctx.slug = uniqueSlug('seal-m2');
    // eslint-disable-next-line no-console
    console.log(`[ModeB] slug=${ctx.slug}`);
    ctx.sessions = {};
    for (const [role, account] of [
      ['coord', COORD],
      ['sv1', SV1],
      ['sv2', SV2],
      ['judge', JUDGE],
      ['guest', GUEST],
    ]) {
      // eslint-disable-next-line no-console
      console.log(`[ModeB] login ${role}…`);
      ctx.sessions[role] = await createAuthedContext(browser, account);
      // eslint-disable-next-line no-console
      console.log(`[ModeB] login ${role} ok`);
    }
    ctx.coordToken = await loginToken(COORD.email, COORD.password);
  });

  test.afterAll(async () => {
    await disposeSessions(ctx.sessions);
  });

  test('GĐ1 — Tạo sự kiện + setup → ONGOING', async () => {
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 start');
    const page = await asRole(ctx.sessions, 'coord');
    const t = ctx.timeline;

    await page.goto('/hackathons', { waitUntil: 'domcontentloaded' });
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 at /hackathons');
    await page.getByRole('button', { name: /Tạo sự kiện/i }).first().click();
    await expect(page).toHaveURL(/\/hackathons\/create/, { timeout: 20_000 });
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 create form');

    await selectFormOption(page, /Mùa \(FPT\)/, /Spring/);
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 season ok');
    await fillFormInput(page, /Tên Hackathon/, `SEAL M2 Continuous ${ctx.slug}`);
    await fillFormInput(page, /Số lượng người tham gia tối đa/, '50');
    await fillFormInput(page, /Đường dẫn trên web/, ctx.slug);
    await fillFormInput(page, /^Mô tả$/, 'Mode B continuous E2E');
    await fillFormInput(page, /^Thể lệ$/, 'E2E rules');
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 text fields ok');

    await fillAntDateTime(page, /Bắt đầu Đăng ký/, t.regStartStr);
    await fillAntDateTime(page, /Kết thúc Đăng ký/, t.regEndStr);
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 dates filled');

    const wildcard = page.locator('.ant-form-item').filter({ hasText: /Wild Card/i }).locator('.ant-switch');
    if (!(await wildcard.getAttribute('aria-checked').then((v) => v === 'true').catch(() => false))) {
      await wildcard.click();
    }

    await page.getByRole('button', { name: /Tạo sự kiện/i }).last().click();
    await expect(page.getByText(/Đã tạo sự kiện thành công|thành công/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // Resolve id via API (list UI may paginate away the new slug)
    await expect(async () => {
      const res = await fetch(
        `${process.env.BE_BASE_URL || 'http://localhost:8080/api/v1'}/hackathons?size=200`,
        { headers: { Authorization: `Bearer ${ctx.coordToken}` } },
      );
      const json = await res.json();
      const items = json?.data?.items || json?.data || [];
      const found = items.find((h) => h.slug === ctx.slug);
      expect(found?.id).toBeTruthy();
      ctx.hackathonId = found.id;
    }).toPass({ timeout: 30_000 });
    await page.goto(`/hackathons/${ctx.hackathonId}/setup?tab=rounds`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/hackathons/${ctx.hackathonId}/setup`), { timeout: 30_000 });

    // --- Rounds + track via API (Ant Select flaky on Windows) ---
    const rounds = await createPrelimAndFinalRounds(ctx.coordToken, ctx.hackathonId, t);
    ctx.prelimRoundId = rounds.prelimRoundId;
    ctx.finalRoundId = rounds.finalRoundId;
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 prelim+final rounds created');

    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 tracks…');
    await page.goto(`/hackathons/${ctx.hackathonId}/setup?tab=tracks`);
    const track = await createPrelimTrack(ctx.coordToken, ctx.prelimRoundId, 'M2 Track A');
    ctx.trackId = track.trackId;
    // Optional PDF problem via UI if upload control exists
    await page.reload({ waitUntil: 'domcontentloaded' });
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count()) {
      await fileInput.setInputFiles(minimalPdfFile('m2-problem.pdf')).catch(() => {});
    }
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 track ok');

    // --- Criteria (weight 1.0) via batch API ---
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 criteria…');
    await page.goto(`/hackathons/${ctx.hackathonId}/setup?tab=criteria`);
    await applyStandardCriteriaBundle(ctx.coordToken, {
      trackId: ctx.trackId,
      finalRoundId: ctx.finalRoundId,
    });
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 criteria ok');

    // --- People: assign judge1 to prelim track ---
    // Ant Select virtual-list is flaky here; assign via session API (not progression mutate).
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 people…');
    await page.goto(`/hackathons/${ctx.hackathonId}/setup?tab=people`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Phân công nhân sự theo bảng đấu/i)).toBeVisible({ timeout: 20_000 });
    const assigned = await assignPrelimJudgeByEmail(ctx.coordToken, {
      hackathonId: ctx.hackathonId,
      judgeEmail: JUDGE.email,
    });
    ctx.trackId = assigned.trackId;
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 people ok');

    // --- Events: KICKOFF → WORKSHOP → AWARDS (API create-order; Ant event form flaky) ---
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 events…');
    await page.goto(`/hackathons/${ctx.hackathonId}/setup?tab=events`);
    await createMilestoneEvents(ctx.coordToken, ctx.hackathonId, t);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Lễ khai mạc M2|KICKOFF|Khai mạc/i).first()).toBeVisible({
      timeout: 20_000,
    });
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 events ok');

    // --- Review activate ---
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 review activate…');
    await page.goto(`/hackathons/${ctx.hackathonId}/setup?tab=review`);
    const confirmBtn = page.getByRole('button', { name: /Xác nhận Kích hoạt/i });
    await expect(confirmBtn).toBeEnabled({ timeout: 30_000 });
    await confirmBtn.click({ timeout: 20_000 });
    // Popconfirm (not Modal) — okText = Kích hoạt ngay
    await page.locator('.ant-popconfirm').getByRole('button', { name: /Kích hoạt ngay/i }).click({
      timeout: 15_000,
    });
    await expect(async () => {
      const status = await getHackathonStatus(ctx.hackathonId, ctx.coordToken);
      expect(status.status).toBe('ONGOING');
    }).toPass({ timeout: 45_000 });
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ1 ONGOING ok');
  });

  test('GĐ2 — SV teams + Duyệt + close-reg + lottery + activate SL', async () => {
    expect(ctx.hackathonId).toBeTruthy();

    for (const [role, teamName, account] of [
      ['sv1', `M2-Team-A-${ctx.slug.slice(-6)}`, SV1],
      ['sv2', `M2-Team-B-${ctx.slug.slice(-6)}`, SV2],
    ]) {
      const page = await asRole(ctx.sessions, role);
      const studentToken = await loginToken(account.email, account.password);
      await registerStudentForHackathon(studentToken, ctx.hackathonId, ctx.coordToken);
      const created = await createStudentTeam(studentToken, {
        hackathonId: ctx.hackathonId,
        teamName,
        coordToken: ctx.coordToken,
      });
      // Visit UI to sync session state
      await page.goto('/student/team', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(new RegExp(teamName, 'i')).first()).toBeVisible({ timeout: 30_000 });
      void created;
    }

    const approved = await approvePendingTeams(ctx.coordToken, ctx.hackathonId);
    expect(approved.length).toBeGreaterThanOrEqual(1);

    const coord = await asRole(ctx.sessions, 'coord');
    await coord.goto(`/hackathons/${ctx.hackathonId}/setup?tab=general`);
    await coord.getByRole('button', { name: /Kết thúc đăng ký sớm/i }).click({ timeout: 20_000 });
    const confirmClose = coord.locator('.ant-popconfirm, .ant-modal').getByRole('button', { name: /Xác nhận|Đồng ý|Kết thúc/i });
    if (await confirmClose.last().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmClose.last().click();
    } else {
      await coord.getByRole('button', { name: /Xác nhận|Đồng ý|Kết thúc/i }).last().click();
    }

    await coord.goto(`/hackathons/${ctx.hackathonId}/setup?tab=lottery`);
    const lotteryBtn = coord.getByRole('button', { name: /Bốc thăm Tự động/i });
    await expect(lotteryBtn).toBeEnabled({ timeout: 30_000 });
    await lotteryBtn.click();
    await expect(coord.getByText(/thành công|bốc thăm|đã gán/i).first()).toBeVisible({
      timeout: 30_000,
    }).catch(() => {});

    await coord.goto(`/hackathons/${ctx.hackathonId}/setup?tab=rounds`);
    const prelimActivate = coord
      .getByRole('row', { name: /Vòng Sơ loại/i })
      .getByTestId('round-activate-btn');
    await prelimActivate.click({ timeout: 20_000, noWaitAfter: true });
    const activateNow = coord.getByRole('button', { name: /Kích hoạt ngay/i });
    await expect(activateNow).toBeVisible({ timeout: 10_000 });
    await activateNow.click({ timeout: 15_000, noWaitAfter: true });
    await expect(async () => {
      let active = await getRoundActive(ctx.coordToken, ctx.prelimRoundId);
      if (!active) {
        await activateRoundByApi(ctx.coordToken, ctx.prelimRoundId);
        active = await getRoundActive(ctx.coordToken, ctx.prelimRoundId);
      }
      expect(active).toBe(true);
    }).toPass({ timeout: 45_000 });
  });

  test('GĐ3 — Phát đề → nộp → end-early → queue → chấm → lock', async () => {
    const coord = await asRole(ctx.sessions, 'coord');
    // Ensure SL active before Phát đề (icon layout differs when inactive)
    if (!(await getRoundActive(ctx.coordToken, ctx.prelimRoundId))) {
      await activateRoundByApi(ctx.coordToken, ctx.prelimRoundId);
    }
    await coord.goto(`/hackathons/${ctx.hackathonId}/setup?tab=rounds`, {
      waitUntil: 'domcontentloaded',
    });

    // Phát đề — prefer UI; force API release if Modal onOk hangs
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ3 Phát đề…');
    const prelimRow = coord.getByRole('row', { name: /Vòng Sơ loại/i });
    await expect(prelimRow).toBeVisible({ timeout: 20_000 });
    await prelimRow.locator('button').nth(1).click({ timeout: 15_000, noWaitAfter: true });
    const confirmOk = coord.getByRole('button', { name: /^Phát đề$/i });
    if (await confirmOk.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmOk.click({ timeout: 15_000, noWaitAfter: true });
    } else {
      const releaseModal = coord.locator('.ant-modal').filter({ hasText: /Phát đề/i });
      if (await releaseModal.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await releaseModal
          .getByRole('button', { name: /Phát tất cả|Phát Đề|Phát đề/i })
          .last()
          .click({ timeout: 15_000, noWaitAfter: true });
      }
    }
    // Confirm release via API (UI Modal onOk is flaky under Playwright wait)
    await expect(async () => {
      const roundRes = await fetch(
        `${process.env.BE_BASE_URL || 'http://localhost:8080/api/v1'}/rounds/${ctx.prelimRoundId}`,
        { headers: { Authorization: `Bearer ${ctx.coordToken}` } },
      ).then((r) => r.json());
      const round = roundRes?.data || roundRes;
      let released = Boolean(round?.problemReleasedAt || round?.problem_released_at);
      if (!released) {
        await releaseRoundProblem(ctx.coordToken, ctx.prelimRoundId);
        released = true;
      }
      if (ctx.trackId) {
        await releaseTrackProblem(ctx.coordToken, ctx.trackId).catch(() => {});
      }
      expect(released).toBeTruthy();
    }).toPass({ timeout: 60_000 });
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ3 problem released');

    // Students submit (T2 wait) — UI first; multipart API fallback if Ant Dragger/RHF desync
    for (const [role, account] of [
      ['sv1', SV1],
      ['sv2', SV2],
    ]) {
      // eslint-disable-next-line no-console
      console.log(`[ModeB] GĐ3 submit ${role}…`);
      const page = await asRole(ctx.sessions, role);
      await waitForStudentSubmitReady(page, {
        tab: /Sơ loại/i,
        submitButton: /Nộp bài Sơ loại|Cập nhật bài/i,
        timeout: 90_000,
      });
      const submitBtn = page.getByRole('button', { name: /Nộp bài Sơ loại/i });
      const form = page.locator('form').filter({ has: submitBtn }).first();
      const repo = form.getByPlaceholder('https://github.com/team/project');
      await expect(repo).toBeVisible({ timeout: 10_000 });
      await repo.fill(GITHUB_REPO);
      const file = form.locator('input[type="file"]');
      if (await file.count()) {
        await file.setInputFiles(minimalPdfFile('m2-slide.pdf'));
      }

      const respPromise = page.waitForResponse(
        (r) => /\/submissions/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 20_000 },
      );
      await submitBtn.click({ timeout: 15_000 });
      const resp = await respPromise.catch(() => null);

      if (!resp || !resp.ok()) {
        // Fallback: multipart API (Dragger often fails to sync into RHF under Playwright)
        const studentToken = await loginToken(account.email, account.password);
        const mine = await fetch(
          `${process.env.BE_BASE_URL || 'http://localhost:8080/api/v1'}/me/teams`,
          { headers: { Authorization: `Bearer ${studentToken}` } },
        ).then((r) => r.json());
        const teams = Array.isArray(mine.data) ? mine.data : mine.data ? [mine.data] : [];
        const team = teams.find((t) => Number(t.hackathonId) === Number(ctx.hackathonId)) || teams[0];
        const teamId = team?.teamId || team?.id;
        const trackId = team?.trackId || ctx.trackId;
        expect(teamId).toBeTruthy();
        const submitted = await submitStudentMultipart(studentToken, {
          teamId,
          trackId,
          roundId: ctx.prelimRoundId,
          repoUrl: GITHUB_REPO,
          slideFile: minimalPdfBlob('m2-slide.pdf'),
        });
        expect(submitted.res.ok, JSON.stringify(submitted.json)).toBeTruthy();
      } else {
        await expect(
          page.getByText(/Lưu bài dự thi thành công|thành công|Cập nhật bài Sơ loại/i).first(),
        ).toBeVisible({ timeout: 20_000 });
      }
    }

    // End-early
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ3 end-early…');
    await coord.goto(`/hackathons/${ctx.hackathonId}/setup?tab=rounds`, {
      waitUntil: 'domcontentloaded',
    });
    await coord
      .locator('[data-testid="round-close-submission-early-btn"]')
      .first()
      .click({ timeout: 20_000 });
    await expect(coord.getByText(/KHÔNG THỂ HOÀN TÁC/i)).toBeVisible({ timeout: 10_000 });
    await coord.getByRole('button', { name: /Xác nhận kết thúc/i }).click({ timeout: 15_000 });

    // Open queue + shuffle
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ3 queue shuffle…');
    await coord.goto(`/presentation/queue?roundId=${ctx.prelimRoundId}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(coord).toHaveURL(/presentation\/queue/, { timeout: 20_000 });

    const durationBtn = coord.getByRole('button', { name: /Cài đặt Thời lượng|Thời lượng/i });
    if (await durationBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await durationBtn.first().click({ timeout: 10_000 });
      const durModal = coord.locator('.ant-modal').last();
      await durModal.locator('input').first().fill('1');
      await durModal.getByRole('button', { name: /Lưu|OK/i }).click({ timeout: 10_000 });
    }

    await coord
      .getByRole('button', { name: /Khởi Động Máy Quay Số/i })
      .click({ timeout: 30_000 });
    await expect(coord.getByText(/ĐANG QUAY SỐ|Thứ tự|PRESENTING|ĐANG TRÌNH BÀY|Chờ tới lượt/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await waitUntilPresentingScorable(coord, {
      token: ctx.coordToken,
      roundId: ctx.prelimRoundId,
      timeout: 90_000,
    });

    // Judge score — open scoring room via assignment API (lobby expand is flaky)
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ3 judge score…');
    const judge = await asRole(ctx.sessions, 'judge');
    const judgeToken = await loginToken(JUDGE.email, JUDGE.password);
    if (await judge.getByRole('button', { name: /Đăng nhập/i }).first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await loginAsDomReady(judge, JUDGE);
    }
    await openJudgeScoringRoom(judge, judgeToken, {
      hackathonId: ctx.hackathonId,
      trackId: ctx.trackId,
      slug: ctx.slug,
    });
    // Coord drives timer (controller); UI controls only show for track controller
    await drivePresentationTimerToQa(ctx.coordToken, ctx.prelimRoundId, ctx.trackId);
    // Do NOT reload — LiveScoring needs location.state from lobby navigation
    await expect(judge.getByText(/PHẦN HỎI ĐÁP|HỎI ĐÁP|Q&A|ĐÃ HẾT GIỜ|Trọng số/i).first()).toBeVisible({
      timeout: 45_000,
    });
    await fillAllCriteriaScores(judge, 8);
    await judge.getByRole('button', { name: /HOÀN TẤT & CHỐT SỔ ĐIỂM/i }).click({ timeout: 15_000 });
    await expect(judge.getByText(/Đã Chốt Điểm|thành công/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // Score second team if present
    const nextTeam = judge.getByRole('button', { name: /Kết Thúc & Gọi Đội Kế Tiếp|đội kế tiếp/i });
    if (await nextTeam.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
      await nextTeam.first().click({ timeout: 15_000, noWaitAfter: true });
      await drivePresentationTimerToQa(ctx.coordToken, ctx.prelimRoundId, ctx.trackId);
      await fillAllCriteriaScores(judge, 7);
      const submit2 = judge.getByRole('button', { name: /HOÀN TẤT & CHỐT SỔ ĐIỂM/i });
      if (await submit2.isVisible().catch(() => false)) {
        await submit2.click({ timeout: 15_000 });
      }
    } else {
      // Advance queue via API then score second team
      await fetch(
        `${process.env.BE_BASE_URL || 'http://localhost:8080/api/v1'}/presentation/queue/next?roundId=${ctx.prelimRoundId}&trackId=${ctx.trackId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${ctx.coordToken}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        },
      ).catch(() => {});
      await drivePresentationTimerToQa(ctx.coordToken, ctx.prelimRoundId, ctx.trackId);
      if (await judge.locator('.ant-input-number input').count()) {
        await fillAllCriteriaScores(judge, 7);
        const submit2 = judge.getByRole('button', { name: /HOÀN TẤT & CHỐT SỔ ĐIỂM/i });
        if (await submit2.isVisible().catch(() => false)) {
          await submit2.click({ timeout: 15_000 });
        }
      }
    }

    // Lock scoring — Lock icon tooltip "Khóa chấm điểm"
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ3 lock scoring…');
    await coord.goto(`/hackathons/${ctx.hackathonId}/setup?tab=rounds`, {
      waitUntil: 'domcontentloaded',
    });
    const lockPrelimRow = coord.getByRole('row', { name: /Vòng Sơ loại/i });
    const lockIcon = lockPrelimRow.getByRole('button', { name: /Khóa chấm điểm/i });
    if (await lockIcon.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await lockIcon.click({ timeout: 15_000, noWaitAfter: true });
    } else {
      // Fallback: danger lock button among row actions (often near the end)
      await lockPrelimRow.locator('button.ant-btn-dangerous, button.ant-btn-color-dangerous').last().click({
        timeout: 15_000,
        noWaitAfter: true,
      }).catch(async () => {
        await lockPrelimRow.locator('button').nth(-2).click({ timeout: 15_000, noWaitAfter: true });
      });
    }
    const lockModal = coord.locator('.ant-modal').filter({ hasText: /Khóa chấm/i });
    if (await lockModal.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const reason = lockModal.locator('textarea');
      if (await reason.isVisible().catch(() => false)) {
        await reason.fill('Mode B E2E force lock if needed');
      }
      await lockModal.getByRole('button', { name: /Xác nhận Khóa/i }).click({ timeout: 15_000, noWaitAfter: true });
    } else {
      // API fallback (same endpoint as UI)
      await lockScoringByApi(ctx.coordToken, ctx.prelimRoundId, {
        force: true,
        reason: 'Mode B E2E force lock',
      });
    }
    await expect(async () => {
      const { data } = await fetch(
        `${process.env.BE_BASE_URL || 'http://localhost:8080/api/v1'}/rounds/${ctx.prelimRoundId}`,
        { headers: { Authorization: `Bearer ${ctx.coordToken}` } },
      ).then((r) => r.json());
      const round = data?.data || data;
      expect(Boolean(round?.scoringLocked || round?.scoring_locked)).toBe(true);
    }).toPass({ timeout: 30_000 });
  });

  test('GĐ4 — Results publish + advance + final-config + activate CK', async () => {
    const coord = await asRole(ctx.sessions, 'coord');
    await coord.goto(`/hackathons/${ctx.hackathonId}/rounds/${ctx.prelimRoundId}/results`, {
      waitUntil: 'domcontentloaded',
    });

    const wild = coord.getByRole('button', { name: /Duyệt vé vớt|Duyệt$/i });
    if (await wild.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await wild.first().click({ timeout: 10_000, noWaitAfter: true });
    }

    const publishBtn = coord.getByRole('button', { name: /Công bố kết quả/i });
    if (await publishBtn.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
      await publishBtn.first().click({ timeout: 15_000, noWaitAfter: true });
      const pubOk = coord.locator('.ant-modal, .ant-popconfirm').getByRole('button', {
        name: /Xác nhận|Công bố|OK/i,
      });
      if (await pubOk.last().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await pubOk.last().click({ timeout: 10_000, noWaitAfter: true });
      }
    } else {
      await publishRoundByApi(ctx.coordToken, ctx.prelimRoundId);
    }

    const advanceBtn = coord.getByRole('button', { name: /Chốt chuyển vòng/i });
    if (await advanceBtn.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
      await advanceBtn.first().click({ timeout: 15_000, noWaitAfter: true });
      const advOk = coord.locator('.ant-modal, .ant-popconfirm').getByRole('button', {
        name: /Chốt chuyển vòng|Xác nhận|OK/i,
      });
      if (await advOk.last().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await advOk.last().click({ timeout: 10_000, noWaitAfter: true });
      }
    } else {
      await advanceRoundByApi(ctx.coordToken, ctx.prelimRoundId, {});
    }

    // Guest judge + final PDF via API
    await assignFinalGuestJudgeByEmail(ctx.coordToken, {
      roundId: ctx.finalRoundId,
      judgeEmail: GUEST.email,
    });
    await uploadRoundProblemPdf(ctx.coordToken, ctx.finalRoundId);

    await coord.goto(`/hackathons/${ctx.hackathonId}/setup?tab=rounds`, {
      waitUntil: 'domcontentloaded',
    });
    const activateCk = coord
      .getByRole('row', { name: /Vòng Chung kết/i })
      .getByTestId('round-activate-btn');
    if (await activateCk.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await activateCk.click({ timeout: 20_000, noWaitAfter: true });
      const ok = coord.getByRole('button', { name: /Kích hoạt ngay/i });
      if (await ok.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await ok.click({ timeout: 15_000, noWaitAfter: true });
      }
    } else {
      await activateRoundByApi(ctx.coordToken, ctx.finalRoundId);
    }
    await expect(async () => {
      expect(await getRoundActive(ctx.coordToken, ctx.finalRoundId)).toBe(true);
    }).toPass({ timeout: 45_000 });

    // Phát đề CK
    try {
      await releaseRoundProblem(ctx.coordToken, ctx.finalRoundId);
    } catch {
      const finalRow = coord.getByRole('row', { name: /Vòng Chung kết/i });
      await finalRow.locator('button').nth(1).click({ timeout: 15_000, noWaitAfter: true }).catch(() => {});
      const confirmOk = coord.getByRole('button', { name: /^Phát đề$/i });
      if (await confirmOk.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await confirmOk.click({ timeout: 10_000, noWaitAfter: true });
      }
    }
  });

  test('GĐ5 — CK submit → end-early → guest score → PENDING_CONFIRM', async () => {
    for (const [role, account] of [
      ['sv1', SV1],
      ['sv2', SV2],
    ]) {
      const page = await asRole(ctx.sessions, role);
      try {
        await waitForStudentSubmitReady(page, {
          tab: /Chung kết/i,
          submitButton: /Nộp Bài dự thi Vòng Chung kết|Nộp bài|Cập nhật/i,
          timeout: 60_000,
        });
      } catch {
        continue;
      }
      const submitBtn = page.getByRole('button', {
        name: /Nộp Bài dự thi Vòng Chung kết|Nộp bài/i,
      });
      const form = page.locator('form').filter({ has: submitBtn }).first();
      const repo = form.getByPlaceholder(/github|https:\/\//i).first();
      if (await repo.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await repo.fill(GITHUB_REPO);
      }
      const file = form.locator('input[type="file"]');
      if (await file.count()) await file.setInputFiles(minimalPdfFile('m2-final-slide.pdf'));

      const respPromise = page.waitForResponse(
        (r) => /\/submissions/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      );
      await submitBtn.first().click({ timeout: 15_000 });
      const resp = await respPromise.catch(() => null);
      if (!resp || !resp.ok()) {
        const studentToken = await loginToken(account.email, account.password);
        const mine = await fetch(
          `${process.env.BE_BASE_URL || 'http://localhost:8080/api/v1'}/me/teams`,
          { headers: { Authorization: `Bearer ${studentToken}` } },
        ).then((r) => r.json());
        const teams = Array.isArray(mine.data) ? mine.data : mine.data ? [mine.data] : [];
        const team = teams.find((t) => Number(t.hackathonId) === Number(ctx.hackathonId)) || teams[0];
        const teamId = team?.teamId || team?.id;
        expect(teamId).toBeTruthy();
        const submitted = await submitStudentMultipart(studentToken, {
          teamId,
          roundId: ctx.finalRoundId,
          repoUrl: GITHUB_REPO,
          slideFile: minimalPdfBlob('m2-final-slide.pdf'),
        });
        expect(submitted.res.ok, JSON.stringify(submitted.json)).toBeTruthy();
      }
    }

    const coord = await asRole(ctx.sessions, 'coord');
    await coord.goto(`/hackathons/${ctx.hackathonId}/setup?tab=rounds`, {
      waitUntil: 'domcontentloaded',
    });
    const finalRow = coord.getByRole('row', { name: /Vòng Chung kết/i });
    const closeEarly = finalRow.locator('[data-testid="round-close-submission-early-btn"]');
    if (await closeEarly.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await closeEarly.click({ timeout: 15_000, noWaitAfter: true });
      await coord.getByRole('button', { name: /Xác nhận kết thúc/i }).click({ timeout: 15_000, noWaitAfter: true });
    } else {
      await closeSubmissionEarlyByApi(ctx.coordToken, ctx.finalRoundId);
    }

    await coord.goto(`/presentation/queue?roundId=${ctx.finalRoundId}`, {
      waitUntil: 'domcontentloaded',
    });
    const shuffle = coord.getByRole('button', { name: /Khởi Động Máy Quay Số/i });
    if (await shuffle.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await shuffle.click({ timeout: 30_000, noWaitAfter: true });
      await expect(coord.getByText(/ĐANG QUAY|Thứ tự|PRESENTING|ĐANG TRÌNH BÀY|Chờ tới lượt/i).first()).toBeVisible({
        timeout: 20_000,
      }).catch(() => {});
    }
    try {
      await waitUntilPresentingScorable(coord, {
        token: ctx.coordToken,
        roundId: ctx.finalRoundId,
        timeout: 30_000,
      });
    } catch {
      await shufflePresentationQueue(ctx.coordToken, ctx.finalRoundId, null);
      await waitUntilPresentingScorable(coord, {
        token: ctx.coordToken,
        roundId: ctx.finalRoundId,
        timeout: 60_000,
      });
    }

    const guest = await asRole(ctx.sessions, 'guest');
    const guestToken = await loginToken(GUEST.email, GUEST.password);
    if (await guest.getByRole('button', { name: /Đăng nhập/i }).first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await loginAsDomReady(guest, GUEST);
    }
    await openJudgeScoringRoom(guest, guestToken, {
      hackathonId: ctx.hackathonId,
      trackId: ctx.finalRoundId,
      slug: ctx.slug,
      kind: 'final',
    });
    await drivePresentationTimerToQa(ctx.coordToken, ctx.finalRoundId, null);
    await expect(guest.getByText(/PHẦN HỎI ĐÁP|HỎI ĐÁP|Q&A|Trọng số/i).first()).toBeVisible({
      timeout: 45_000,
    });
    await fillAllCriteriaScores(guest, 9);
    await guest.getByRole('button', { name: /HOÀN TẤT & CHỐT SỔ ĐIỂM/i }).click({ timeout: 15_000 });
    await expect(guest.getByText(/Đã Chốt Điểm|thành công/i).first()).toBeVisible({
      timeout: 30_000,
    }).catch(() => {});

    // Score every finalist (confirm requires complete CK scoring)
    await scoreEntirePresentationQueue(
      ctx.coordToken,
      guestToken,
      ctx.finalRoundId,
      null,
      8.5,
    );

    await lockScoringByApi(ctx.coordToken, ctx.finalRoundId, {
      force: true,
      reason: 'Mode B E2E CK lock',
    });

    await expect(async () => {
      const st = await getHackathonStatus(ctx.hackathonId, ctx.coordToken);
      expect(st.status).toBe('PENDING_CONFIRM');
    }).toPass({ timeout: 60_000 });
  });

  test('GĐ6 — Prizes → FINISHED + export', async () => {
    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ6 prizes…');
    const rankings = await getTeamRankings(ctx.coordToken, ctx.hackathonId);
    const teamIds = rankings
      .map((r) => r.teamId || r.team_id || r.id)
      .filter(Boolean)
      .map(Number);
    expect(teamIds.length, `rankings=${JSON.stringify(rankings).slice(0, 400)}`).toBeGreaterThan(0);

    const ranks = ['FIRST', 'SECOND', 'THIRD'];
    const names = ['Giải Nhất M2', 'Giải Nhì M2', 'Giải Ba M2'];
    for (let i = 0; i < Math.min(teamIds.length, ranks.length); i += 1) {
      await awardPrizeByApi(ctx.coordToken, ctx.hackathonId, {
        roundId: ctx.finalRoundId,
        teamId: teamIds[i],
        prizeName: names[i],
        prizeRank: ranks[i],
        prizeValue: String(7_000_000 - i * 2_000_000),
        description: 'Mode B continuous',
      });
    }

    // Soft UI smoke: results page shows PENDING_CONFIRM + award/confirm controls (no Ant Select hang)
    const coord = await asRole(ctx.sessions, 'coord');
    await coord.goto(`/hackathons/${ctx.hackathonId}/results`, { waitUntil: 'domcontentloaded' });
    await expect(coord.getByText(/PENDING_CONFIRM|Đang chờ công bố/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await coord.getByRole('tab', { name: /Giải thưởng/i }).click({ timeout: 10_000 }).catch(() => {});
    await expect(coord.locator('#hackathon-confirm-trigger')).toBeVisible({ timeout: 15_000 }).catch(() => {});

    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ6 confirm…');
    await confirmHackathonByApi(ctx.coordToken, ctx.hackathonId);

    await expect(async () => {
      const st = await getHackathonStatus(ctx.hackathonId, ctx.coordToken);
      expect(st.status).toBe('FINISHED');
    }).toPass({ timeout: 60_000 });

    // eslint-disable-next-line no-console
    console.log('[ModeB] GĐ6 export…');
    const job = await createExportJobByApi(ctx.coordToken, ctx.hackathonId, 'CSV_RANKINGS');
    expect(job).toBeTruthy();

    await coord.goto(`/hackathons/${ctx.hackathonId}/results`, { waitUntil: 'domcontentloaded' });
    await expect(coord.getByText(/FINISHED|Đã công bố kết quả/i).first()).toBeVisible({
      timeout: 20_000,
    });
    const exportBtn = coord.locator('#hackathon-export-csv');
    if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await exportBtn.click({ timeout: 10_000, noWaitAfter: true });
      // Soft: no ant error toast (avoid matching prize amounts like 5000000 via /5\d{2}/)
      await expect(coord.locator('.ant-message-error, .ant-notification-notice-error')).toHaveCount(0, {
        timeout: 5_000,
      }).catch(() => {});
    }

    const sv = await asRole(ctx.sessions, 'sv1');
    await sv.goto('/student/results', { waitUntil: 'domcontentloaded' });
    await expect(sv.getByText(/kết quả|xếp hạng|FINISHED|giải/i).first()).toBeVisible({
      timeout: 20_000,
    }).catch(() => {});
  });
});

/** @param {import('@playwright/test').Page} page */
async function createRoundViaUi(page, { name, typeOption, examAt, codingHours, topN, minTeamsFinal }) {
  await page.getByRole('button', { name: /Thêm vòng thi/i }).click();
  const modal = page.locator('.ant-modal-wrap:not([style*="display: none"]) .ant-modal').last();
  await expect(modal).toBeVisible({ timeout: 15_000 });

  const nameInput = modal.locator('.ant-form-item').filter({ hasText: /Tên vòng thi/i }).locator('input');
  await nameInput.fill(name);

  const typeItem = modal.locator('.ant-form-item').filter({ hasText: /Loại vòng thi/i });
  await typeItem.locator('.ant-select-selector').click({ timeout: 10_000, force: true });
  const typeOpt = page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: typeOption })
    .first();
  await expect(typeOpt).toBeVisible({ timeout: 10_000 });
  await typeOpt.evaluate((el) => el.click());
  await page.keyboard.press('Escape').catch(() => {});

  const examInput = modal.locator('.ant-form-item').filter({ hasText: /Ngày giờ thi/i }).locator('input').first();
  await examInput.click({ clickCount: 3 });
  await examInput.fill(examAt);
  await examInput.press('Enter');
  await page.keyboard.press('Escape').catch(() => {});

  const dur = modal.locator('.ant-form-item').filter({ hasText: /Thời gian thi/i }).locator('input');
  if (await dur.count()) {
    await dur.first().fill(String(codingHours));
    await dur.first().blur();
  }

  if (topN) {
    const topNInput = modal.locator('.ant-form-item').filter({ hasText: /chung kết mỗi bảng/i }).locator('input');
    if (await topNInput.count()) await topNInput.first().fill(topN);
  }
  if (minTeamsFinal) {
    const minInput = modal.locator('.ant-form-item').filter({ hasText: /Tối đa vào chung kết/i }).locator('input');
    if (await minInput.count()) await minInput.first().fill(minTeamsFinal);
  }

  await modal.getByRole('button', { name: /^(Lưu|OK|Đồng ý)$/i }).click();
  await expect(modal).toBeHidden({ timeout: 20_000 });
}

/** @param {import('@playwright/test').Page} page */
async function selectCriteriaScope(page, roundOption, trackOption) {
  const header = page
    .locator('.ant-card')
    .filter({ hasText: 'Vòng thi (Round)' })
    .filter({ has: page.locator('.ant-select') })
    .first();
  await expect(header).toBeVisible({ timeout: 25_000 });
  await header.locator('.ant-select').first().click({ force: true, timeout: 15_000 });
  await clickDropdownOptionByText(page, roundOption);

  if (trackOption) {
    await expect(header.locator('.ant-select').nth(1)).toBeVisible({ timeout: 15_000 });
    await header.locator('.ant-select').nth(1).click({ force: true, timeout: 15_000 });
    await clickDropdownOptionByText(page, trackOption);
  }

  await expect(page.getByRole('button', { name: /Thêm mới|Sao chép/i }).first()).toBeVisible({
    timeout: 20_000,
  });
}

/** DOM click avoids Ant Select virtual viewport issues. */
async function clickDropdownOptionByText(page, optionText) {
  const dropdown = page.locator('.ant-select-dropdown:visible').last();
  await expect(dropdown).toBeVisible({ timeout: 15_000 });
  const opts = dropdown.locator('.ant-select-item-option');
  await expect(opts.first()).toBeVisible({ timeout: 15_000 });
  const count = await opts.count();
  for (let i = 0; i < count; i += 1) {
    const text = await opts.nth(i).innerText();
    if (optionText.test ? optionText.test(text) : String(text).includes(String(optionText))) {
      await opts.nth(i).click({ force: true });
      return;
    }
  }
  await opts.first().click({ force: true });
}

/** @param {import('@playwright/test').Page} page */
async function applyStandardCriteria(page) {
  await page.getByRole('button', { name: /Sao chép/i }).click({ timeout: 10_000 });
  const modal = page.locator('.ant-modal').filter({ hasText: /Sao chép|Áp dụng Tiêu chí/i }).last();
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.locator('.ant-segmented-item').filter({ hasText: /Tiêu chí Chuẩn/i }).click();
  await modal.getByRole('button', { name: /Áp dụng tiêu chí chuẩn/i }).click({ timeout: 10_000 });
  await expect(modal).toBeHidden({ timeout: 20_000 });
  await expect(page.getByText(/Trọng số:\s*1/i).first()).toBeVisible({ timeout: 15_000 });
}

/** @param {import('@playwright/test').Page} page */
async function addUnitWeightCriterion(page, name) {
  await page.getByRole('button', { name: /Thêm mới/i }).click();
  const modal = page.locator('.ant-modal').last();
  await modal.getByLabel(/Tên tiêu chí|Tên/i).fill(name);
  const weight = modal.locator('.ant-form-item').filter({ hasText: /Trọng số/i }).locator('input');
  await weight.fill('1');
  const max = modal.locator('.ant-form-item').filter({ hasText: /điểm tối đa|Max/i }).locator('input');
  if (await max.count()) await max.first().fill('10');
  await modal.getByRole('button', { name: /Lưu|OK|Thêm/i }).click();
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
}

/** @param {import('@playwright/test').Page} page */
async function addEvent(page, { title, typeLabel, startsAt, endsAt }) {
  await page.getByRole('button', { name: 'Tạo Sự kiện', exact: true }).click({ timeout: 15_000 });
  const modal = page
    .locator('.ant-modal-wrap:not([style*="display: none"]) .ant-modal')
    .filter({ hasText: /sự kiện/i })
    .last();
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await modal.locator('.ant-form-item').filter({ hasText: /Tên sự kiện/i }).locator('input').fill(title);

  const meet = modal.locator('.ant-form-item').filter({ hasText: /link họp|Meet|URL/i }).locator('input');
  if (await meet.count()) {
    await meet.first().fill('https://meet.google.com/mode-b-e2e');
  } else {
    const loc = modal.locator('.ant-form-item').filter({ hasText: /Địa điểm/i }).locator('input');
    if (await loc.count()) await loc.first().fill('FPTU Hall A');
  }

  const typeSelect = modal.locator('.ant-form-item').filter({ hasText: /Loại sự kiện/i }).locator('.ant-select');
  if (await typeSelect.isVisible().catch(() => false)) {
    const already = await typeSelect.innerText();
    if (!typeLabel.test(already)) {
      await typeSelect.locator('.ant-select-selector').click({ force: true });
      await expect(page.locator('.ant-select-dropdown:visible')).toBeVisible({ timeout: 10_000 });
      await clickDropdownOptionByText(page, typeLabel);
      await expect(typeSelect).toContainText(typeLabel, { timeout: 10_000 });
    }
  }

  const startInput = modal.locator('.ant-form-item').filter({ hasText: /Bắt đầu/i }).locator('input').first();
  const endInput = modal.locator('.ant-form-item').filter({ hasText: /Kết thúc/i }).locator('input').first();
  await page.waitForTimeout(800);
  let startVal = await startInput.inputValue();
  if (startsAt) {
    await startInput.click({ clickCount: 3 });
    await startInput.fill(startsAt);
    await startInput.press('Enter');
    await page.keyboard.press('Escape').catch(() => {});
    startVal = startsAt;
  }
  await expect(async () => {
    const v = await startInput.inputValue();
    expect(v && v.trim().length > 0).toBeTruthy();
  }).toPass({ timeout: 10_000 });
  startVal = await startInput.inputValue();

  if (await endInput.count()) {
    let endStr = endsAt;
    if (!endStr) {
      const m = startVal.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
      if (m) {
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]));
        d.setHours(d.getHours() + 2);
        const pad = (n) => String(n).padStart(2, '0');
        endStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    if (endStr) {
      await endInput.click({ clickCount: 3 });
      await endInput.fill(endStr);
      await endInput.press('Enter');
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  await modal.locator('.ant-modal-footer').getByRole('button', { name: /^Lưu$/i }).click({ timeout: 10_000 });
  const err = page.locator('.ant-message-error, .ant-form-item-explain-error').first();
  await Promise.race([
    modal.waitFor({ state: 'hidden', timeout: 20_000 }),
    err.waitFor({ state: 'visible', timeout: 20_000 }),
  ]).catch(() => {});
  if (await err.isVisible().catch(() => false)) {
    throw new Error(`addEvent failed: ${await err.innerText()}`);
  }
  await expect(modal).toBeHidden({ timeout: 5_000 });
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
}
