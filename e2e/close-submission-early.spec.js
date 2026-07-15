import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  findFinalRound,
  getRounds,
  isBackendReady,
  login,
} from './helpers/api.js';
import { isMutatingEnabled } from './helpers/progressionApiHelpers.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';

/** Prefer seeds outside cross-browser-primary-matrix when possible. */
const CLOSE_EARLY_PRELIM_SEED = 'seal-gd3-prelim-open';
const LATE_PENDING_SEED = 'seal-gd3-prelim-open';
const ADVANCE_READY_SEED = 'seal-gd4-advance-ready';
const CLOSE_EARLY_FINAL_SEED = 'seal-gd5-final-active';

const PRELIM_STUDENT_EMAIL = 'student.gd3.leader06@fpt.edu.vn';
const FINAL_STUDENT_EMAIL = 'student.gd5.leader04@fpt.edu.vn';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const GITHUB_REPO = 'https://github.com/octocat/Hello-World';

async function apiRequestRaw(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data ?? json };
}

async function closeSubmissionEarly(roundId, token) {
  return apiRequestRaw('POST', `/rounds/${roundId}/close-submission-early`, { token });
}

function minimalPdfBlob() {
  const bytes = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  return new Blob([bytes], { type: 'application/pdf' });
}

async function submitMultipart(token, fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (key === 'slideFile') {
      form.append('slideFile', value, 'e2e-slide.pdf');
    } else {
      form.append(key, String(value));
    }
  }
  const res = await fetch(`${BE_BASE}/submissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data ?? json };
}

async function findStudentTeamForHackathon(studentToken, hackathonId) {
  const { data } = await apiRequestRaw('GET', '/me/teams', { token: studentToken });
  const teamList = Array.isArray(data) ? data : data?.items || [];
  return (
    teamList.find(
      (t) =>
        String(t.hackathonId ?? t.hackathon_id ?? t.hackathon?.id) === String(hackathonId),
    ) || null
  );
}

async function releaseProblemIfNeeded(roundId, token) {
  const form = new FormData();
  const res = await fetch(`${BE_BASE}/rounds/${roundId}/release-problem`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function ensureCloseEarlyPrerequisites(round, token) {
  const released = Boolean(round.problemReleasedAt || round.problem_released_at);
  if (!released) {
    const releaseResult = await releaseProblemIfNeeded(round.id, token);
    if (!releaseResult.res.ok) {
      const code = releaseResult.json?.error?.code || releaseResult.json?.code;
      // Already released / race — continue; otherwise fail clearly
      if (code !== 'INVALID_STATE' && code !== 'CONFLICT') {
        throw new Error(
          `release-problem failed: ${code || releaseResult.res.status} ${releaseResult.json?.error?.message || ''}`,
        );
      }
    }
  }
  const examAt = round.examAt || round.exam_at;
  if (examAt && new Date(examAt).getTime() > Date.now()) {
    throw new Error(
      `Round ${round.id} examAt is still in the future (${examAt}) — cannot close-early gate`,
    );
  }
}

async function ensureCloseEarly(roundId, coordToken, roundSnapshot = null) {
  if (roundSnapshot) {
    await ensureCloseEarlyPrerequisites(roundSnapshot, coordToken);
  }
  const first = await closeSubmissionEarly(roundId, coordToken);
  if (first.res.ok) return first;
  const code = first.json?.error?.code || first.json?.code;
  if (code === 'SUBMISSION_ALREADY_CLOSED') return first;
  // Gate failures: try release once then retry (seed may lack problemReleasedAt)
  if (code === 'INVALID_ROUND_STATE_UNRELEASED') {
    await releaseProblemIfNeeded(roundId, coordToken);
    const retry = await closeSubmissionEarly(roundId, coordToken);
    if (retry.res.ok || (retry.json?.error?.code || retry.json?.code) === 'SUBMISSION_ALREADY_CLOSED') {
      return retry;
    }
    throw new Error(
      `close-submission-early retry failed: ${retry.json?.error?.code || retry.res.status} ${retry.json?.error?.message || ''}`,
    );
  }
  throw new Error(`close-submission-early failed: ${code || first.res.status} ${first.json?.error?.message || ''}`);
}

async function loginAsCoordinator(page) {
  await page.goto('/login');
  await page.getByPlaceholder('example@hackathon.com').fill(COORD_EMAIL);
  await page.getByPlaceholder('••••••••').fill(COORD_PASSWORD);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

/**
 * Mutating — run AFTER cross-browser/seed-matrix; restart BE after to reset seeds.
 * Run: E2E_MUTATING=1 npx playwright test e2e/close-submission-early.spec.js --project=mutating-e2e
 */
test.describe('Close submission early (mutating)', () => {
  test.beforeAll(async () => {
    test.skip(!isMutatingEnabled(), 'E2E_MUTATING=1 required');
    const ready = await isBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
  });

  test('API: close scoring-live then idempotent SUBMISSION_ALREADY_CLOSED', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(CLOSE_EARLY_PRELIM_SEED, token);
    test.skip(!hackathon, `Seed ${CLOSE_EARLY_PRELIM_SEED} not found`);

    const prelim = await findPrelimRound(hackathon.id, token);
    test.skip(!prelim, 'No prelim round');

    const alreadyClosed = Boolean(
      prelim.submissionClosedEarlyAt || prelim.submission_closed_early_at,
    );

    if (!alreadyClosed) {
      await ensureCloseEarlyPrerequisites(prelim, token);
      const first = await closeSubmissionEarly(prelim.id, token);
      expect(first.res.ok).toBeTruthy();
      expect(first.data?.deadlineAdjusted === true || first.data?.examAtAdjusted === true).toBeTruthy();
      expect(first.data?.round?.submissionClosedEarlyAt || first.data?.closedAt).toBeTruthy();
    }

    const second = await closeSubmissionEarly(prelim.id, token);
    expect(second.res.ok).toBeFalsy();
    expect(second.json?.error?.code || second.json?.code).toBe('SUBMISSION_ALREADY_CLOSED');
  });

  test('API BC2: scoringLocked → INVALID_STATE', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(ADVANCE_READY_SEED, token);
    test.skip(!hackathon, `Seed ${ADVANCE_READY_SEED} not found`);

    const rounds = await getRounds(hackathon.id, token);
    const locked = rounds.find((r) => r.scoringLocked || r.scoring_locked);
    test.skip(!locked, 'No scoring-locked round on advance-ready');

    const result = await closeSubmissionEarly(locked.id, token);
    expect(result.res.ok).toBeFalsy();
    const code = result.json?.error?.code || result.json?.code;
    expect(['INVALID_STATE', 'ROUND_NOT_ACTIVE', 'SUBMISSION_ALREADY_CLOSED']).toContain(code);
  });

  test('API BC1: inactive round → ROUND_NOT_ACTIVE', async () => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(ADVANCE_READY_SEED, token);
    test.skip(!hackathon, `Seed ${ADVANCE_READY_SEED} not found`);

    const rounds = await getRounds(hackathon.id, token);
    const inactive = rounds.find((r) => !(r.isActive || r.is_active));
    test.skip(!inactive, 'No inactive round');

    const result = await closeSubmissionEarly(inactive.id, token);
    expect(result.res.ok).toBeFalsy();
    expect(result.json?.error?.code || result.json?.code).toBe('ROUND_NOT_ACTIVE');
  });

  test('Coord UI: Kết thúc thời gian thi sớm + red irreversible warning', async ({ page }) => {
    const token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(CLOSE_EARLY_PRELIM_SEED, token);
    test.skip(!hackathon, `Seed ${CLOSE_EARLY_PRELIM_SEED} not found`);

    await loginAsCoordinator(page);
    await page.goto(`/hackathons/${hackathon.id}/setup?tab=rounds`);
    await expect(page.getByText(/Vòng thi|Thêm vòng thi/i).first()).toBeVisible({ timeout: 20_000 });

    const btn = page.getByTestId('round-close-submission-early-btn');
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) {
      await expect(page.getByText(/Đã kết thúc sớm|Đã kết thúc/i).first()).toBeVisible({
        timeout: 10_000,
      });
      return;
    }

    await btn.first().click();
    await expect(page.getByText(/Hành động này KHÔNG THỂ HOÀN TÁC/i)).toBeVisible();
    await page.getByRole('button', { name: /Xác nhận kết thúc/i }).click();
    await expect(page.getByText(/Đã kết thúc thời gian thi sớm/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('SV after end-early GĐ3 → LATE_PENDING (ALLOW_LATE_PENDING)', async () => {
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(LATE_PENDING_SEED, coordToken);
    test.skip(!hackathon, `Seed ${LATE_PENDING_SEED} not found`);

    const prelim = await findPrelimRound(hackathon.id, coordToken);
    test.skip(!prelim, 'No prelim round');
    test.skip(!(prelim.isActive || prelim.is_active), 'Prelim not active');

    await ensureCloseEarly(prelim.id, coordToken, prelim);
    // Đợi clock vượt deadline==now (kể cả khi BE chưa có check submissionClosedEarlyAt)
    await new Promise((r) => setTimeout(r, 1500));

    const studentToken = await login(PRELIM_STUDENT_EMAIL, STUDENT_PASSWORD);
    const team = await findStudentTeamForHackathon(studentToken, hackathon.id);
    test.skip(!team, `${PRELIM_STUDENT_EMAIL} team not on ${LATE_PENDING_SEED}`);

    const teamId = team.id ?? team.teamId;
    const trackId = team.trackId ?? team.track_id;
    test.skip(!trackId, 'Student team missing trackId for prelim submit');

    const submitted = await submitMultipart(studentToken, {
      teamId,
      trackId,
      roundId: prelim.id,
      repoUrl: GITHUB_REPO,
      lateReason: 'e2e after close-submission-early',
      slideFile: minimalPdfBlob(),
    });

    expect(submitted.res.ok, JSON.stringify(submitted.json)).toBeTruthy();
    const status = String(submitted.data?.status || '').toUpperCase();
    expect(status).toBe('LATE_PENDING');
  });

  test('API: close submit-open CK then SV → REJECTED (HARD_LOCK)', async () => {
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(CLOSE_EARLY_FINAL_SEED, coordToken);
    test.skip(!hackathon, `Seed ${CLOSE_EARLY_FINAL_SEED} not found`);

    const finalRound = await findFinalRound(hackathon.id, coordToken);
    test.skip(!finalRound, 'No final round');
    test.skip(!(finalRound.isActive || finalRound.is_active), 'Final not active');
    test.skip(
      Boolean(finalRound.scoringLocked || finalRound.scoring_locked),
      'Final already scoring-locked',
    );

    await ensureCloseEarly(finalRound.id, coordToken, finalRound);

    const second = await closeSubmissionEarly(finalRound.id, coordToken);
    expect(second.json?.error?.code || second.json?.code).toBe('SUBMISSION_ALREADY_CLOSED');

    const studentToken = await login(FINAL_STUDENT_EMAIL, STUDENT_PASSWORD);
    const team = await findStudentTeamForHackathon(studentToken, hackathon.id);
    test.skip(!team, `${FINAL_STUDENT_EMAIL} team not on ${CLOSE_EARLY_FINAL_SEED}`);

    const teamId = team.id ?? team.teamId;
    // CK: không gửi trackId — BE sẽ lấy round từ track (prelim) → ROUND_NOT_ACTIVE
    const submitted = await submitMultipart(studentToken, {
      teamId,
      roundId: finalRound.id,
      repoUrl: GITHUB_REPO,
      lateReason: 'e2e after CK close-submission-early',
      slideFile: minimalPdfBlob(),
    });

    // HARD_LOCK: lần đầu 2xx + REJECTED; lần re-run sau có thể 422 INVALID_STATE (không nộp lại)
    if (!submitted.res.ok) {
      const code = submitted.json?.error?.code || submitted.json?.code;
      const msg = String(submitted.json?.error?.message || '');
      expect(
        code === 'INVALID_STATE' && /từ chối|REJECTED/i.test(msg),
        JSON.stringify(submitted.json),
      ).toBeTruthy();
      return;
    }
    const status = String(submitted.data?.status || '').toUpperCase();
    expect(status).toBe('REJECTED');
  });
});
