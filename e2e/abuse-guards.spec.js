import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  waitForBackendReady,
  waitForLoginToken,
} from './helpers/api.js';
import { probeNegatives } from './helpers/negativeProbes.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const JUDGE_PASSWORD = process.env.E2E_JUDGE_PASSWORD || 'Judge@dev1';
const PRELIM_OPEN_SEED = 'seal-gd3-prelim-open';

async function attemptLogin(page, email, password) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('example@hackathon.com').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /\u0110\u0103ng nh\u1eadp/i }).click();
}

async function loginAs(page, email, password) {
  await attemptLogin(page, email, password);
  await expect(page).toHaveURL(/\/(dashboard|student|judge|coordinator)/, { timeout: 20_000 });
}

test.describe('Abuse guards P1', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    expect(ready, 'BE not reachable').toBeTruthy();
    const negResults = await probeNegatives();
    const failed = negResults.filter((r) => !r.pass);
    expect(failed, failed.map((f) => f.key).join('; ')).toHaveLength(0);
  });

  test('login wrong password -> INVALID_CREDENTIALS', async ({ page }) => {
    await attemptLogin(page, COORD_EMAIL, 'WrongPassword@probe1');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(
      page.getByText(/Email ho\u1eb7c m\u1eadt kh\u1ea9u kh\u00f4ng \u0111\u00fang/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('register duplicate email -> ACCOUNT_DUPLICATE_EMAIL', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    // Ant Radio.Button — click label text (input itself is not visible)
    await page.getByText(/Sinh vi\u00ean ngo\u00e0i FPT/i).click();
    await page.getByPlaceholder(/\u0110\u1ea1i h\u1ecdc B\u00e1ch Khoa/i).fill('Probe University');
    await page.getByPlaceholder(/M\u00e3 sinh vi\u00ean/i).fill('PROBE-DUP-UI');
    await page.getByPlaceholder('example@fpt.edu.vn').fill(COORD_EMAIL);
    const pw = page.locator('input[type="password"]');
    await pw.nth(0).fill('ProbeDup@12345');
    await pw.nth(1).fill('ProbeDup@12345');
    await page.getByRole('button', { name: /\u0110\u0103ng k\u00fd/i }).click();
    await expect(
      page
        .getByText(
          /Email n\u00e0y \u0111\u00e3 \u0111\u01b0\u1ee3c \u0111\u0103ng k\u00fd|\u0111\u00e3 \u0111\u01b0\u1ee3c \u0111\u0103ng k\u00fd/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('submit Google Drive repo -> INVALID_REPO_PLATFORM', async ({ page }) => {
    const token = await waitForLoginToken('student.gd3.leader06@fpt.edu.vn', STUDENT_PASSWORD);
    expect(token).toBeTruthy();
    await loginAs(page, 'student.gd3.leader06@fpt.edu.vn', STUDENT_PASSWORD);
    await page.goto('/student/submit', { waitUntil: 'networkidle' });
    await expect(
      page.getByText(/C\u1ed5ng n\u1ed9p b\u00e0i|N\u1ed9p b\u00e0i|S\u01a1 lo\u1ea1i/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    const editBtn = page.getByRole('button', {
      name: /Ch\u1ec9nh s\u1eeda|C\u1eadp nh\u1eadt b\u00e0i|S\u1eeda b\u00e0i/i,
    });
    if (await editBtn.first().isVisible().catch(() => false)) await editBtn.first().click();
    const prelimTab = page.getByRole('tab', { name: /S\u01a1 lo\u1ea1i|Preliminary/i });
    if (await prelimTab.first().isVisible().catch(() => false)) await prelimTab.first().click();
    const repoInput = page.getByPlaceholder('https://github.com/team/project');
    await expect(repoInput.first()).toBeVisible({ timeout: 15_000 });
    await repoInput.first().fill('https://drive.google.com/file/d/probe-invalid-repo');
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count()) {
      await fileInput.first().setInputFiles({
        name: 'probe-slide.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 probe minimal'),
      });
    }
    await page
      .getByRole('button', { name: /N\u1ed9p b\u00e0i|C\u1eadp nh\u1eadt b\u00e0i/i })
      .first()
      .click();
    await expect(
      page
        .getByText(
          /INVALID_REPO_PLATFORM|Google Drive|GitHub|GitLab|Repository|Kh\u00f4ng ch\u1ea5p nh\u1eadn/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('judge queue prelim-open no scoring form when not PRESENTING', async ({ page }) => {
    const coordToken = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(PRELIM_OPEN_SEED, coordToken);
    expect(hackathon).toBeTruthy();
    const prelim = await findPrelimRound(hackathon.id, coordToken);
    expect(prelim).toBeTruthy();
    const beBase = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
    const tracksRes = await fetch(`${beBase}/rounds/${prelim.id}/tracks`, {
      headers: { Authorization: `Bearer ${coordToken}` },
    });
    const tracksJson = await tracksRes.json();
    const tracks = Array.isArray(tracksJson?.data) ? tracksJson.data : tracksJson?.data?.items || [];
    expect(tracks[0]?.id).toBeTruthy();
    await loginAs(page, 'judge1@fpt.edu.vn', JUDGE_PASSWORD);
    await page.goto(`/presentation/queue?roundId=${prelim.id}&trackId=${tracks[0].id}`, {
      waitUntil: 'networkidle',
    });
    await expect(
      page
        .getByText(/H\u00e0ng \u0111\u1ee3i|B\u1ed1c th\u0103m|Th\u1ee9 T\u1ef1|\u0110i\u1ec1u Ph\u1ed1i/i)
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    const scoringForm = page.getByText(/Nh\u1eadp \u0111i\u1ec3m|Ch\u1ea5m \u0111i\u1ec3m ti\u00eau ch\u00ed/i);
    const presenting = page.getByText(/\u0110ANG TR\u00ccNH B\u00c0Y|PRESENTING/i);
    const waiting = page.getByText(
      /Ch\u1edd t\u1edbi l\u01b0\u1ee3t|B\u1ed1c th\u0103m|s\u1eb5n s\u00e0ng|h\u00e0ng \u0111\u1ee3i/i,
    );
    if (!(await presenting.first().isVisible().catch(() => false))) {
      await expect(waiting.first()).toBeVisible({ timeout: 15_000 });
      await expect(scoringForm).toHaveCount(0);
    }
  });
});
