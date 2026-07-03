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

const SCORING_GATE_SEED = 'seal-gd3-scoring-gate';

async function attemptLogin(page, email, password) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('example@hackathon.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
}

async function loginAs(page, email, password) {
  await attemptLogin(page, email, password);
  await expect(page).toHaveURL(/\/(dashboard|student|judge|coordinator)/, { timeout: 20_000 });
}

test.describe('Abuse guards — UI chặn thao tác sai (P1)', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    test.skip(!ready, 'BE dev server not reachable');
    const negResults = await probeNegatives();
    const failed = negResults.filter((r) => !r.pass);
    test.skip(
      failed.length > 0,
      `Negative probes not ready: ${failed.map((f) => `${f.key} (${f.reason})`).join('; ')}`,
    );
  });

  test('login sai mật khẩu → INVALID_CREDENTIALS', async ({ page }) => {
    await attemptLogin(page, COORD_EMAIL, 'WrongPassword@probe1');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByText(/Email hoặc mật khẩu không đúng/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('đăng ký email trùng → ACCOUNT_DUPLICATE_EMAIL', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('example@fpt.edu.vn').fill(COORD_EMAIL);
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('ProbeDup@12345');
    await passwordInputs.nth(1).fill('ProbeDup@12345');
    await page.getByRole('button', { name: /Đăng ký/i }).click();
    await expect(page.getByText(/Email này đã được đăng ký|đã được đăng ký/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('nộp repo Google Drive → INVALID_REPO_PLATFORM', async ({ page }) => {
    const token = await waitForLoginToken('student.gd3.leader06@fpt.edu.vn', STUDENT_PASSWORD);
    test.skip(!token, 'student.gd3.leader06 not available');

    await loginAs(page, 'student.gd3.leader06@fpt.edu.vn', STUDENT_PASSWORD);
    await page.goto('/student/submit', { waitUntil: 'networkidle' });
    await expect(page.getByText(/Cổng nộp bài|Nộp bài|Tiến trình/i).first()).toBeVisible({
      timeout: 20_000,
    });

    await page.getByPlaceholder('https://github.com/team/project').fill(
      'https://drive.google.com/file/d/probe-invalid-repo',
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'probe-slide.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 probe minimal'),
    });

    await page.getByRole('button', { name: /XÁC NHẬN GỬI BÀI DỰ THI|LƯU CẬP NHẬT/i }).click();
    await expect(
      page.getByText(/Google Drive|GitHub hoặc GitLab|Repository phải là|Không chấp nhận/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('judge scoring-gate — slot WAITING, chưa mở chấm', async ({ page }) => {
    const coordToken = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(SCORING_GATE_SEED, coordToken);
    test.skip(!hackathon, `Seed ${SCORING_GATE_SEED} not found`);
    const prelim = await findPrelimRound(hackathon.id, coordToken);
    test.skip(!prelim, 'prelim round missing on scoring-gate seed');

    const beBase = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
    const tracksRes = await fetch(`${beBase}/hackathons/${hackathon.id}/tracks`, {
      headers: { Authorization: `Bearer ${coordToken}` },
    });
    const tracksJson = await tracksRes.json();
    const tracks = Array.isArray(tracksJson?.data) ? tracksJson.data : tracksJson?.data?.items || [];
    const trackId = tracks[0]?.id;
    test.skip(!trackId, 'track missing on scoring-gate seed');

    await loginAs(page, 'judge1@fpt.edu.vn', JUDGE_PASSWORD);
    await page.goto(`/presentation/queue?roundId=${prelim.id}&trackId=${trackId}`, {
      waitUntil: 'networkidle',
    });
    await expect(page.getByText(/Sự Kiện Đang Điều Phối|Hàng đợi|Điều Phối/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Chờ tới lượt|ĐANG TRÌNH BÀY/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
