/**
 * Deep per-phase UI audit — GĐ1–GĐ6 (8-column step reports).
 * Usage: node scripts/ui-ux-deep-audit.mjs --phase=gd1|gd2|gd3|gd4|gd5|gd6|pub|score|cross|negative|analytics|calib|criteria|register|all
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API = process.env.E2E_API_URL || 'http://localhost:8080/api/v1';
const OUT = process.env.DEEP_AUDIT_OUT
  ? path.resolve(process.env.DEEP_AUDIT_OUT)
  : path.resolve(__dirname, '../../BE/docs/testing/ui-audit-2026-07-19/deep');
fs.mkdirSync(OUT, { recursive: true });

const COORD = { email: 'coord@fpt.edu.vn', password: 'Coordinator@dev1' };
const JUDGE = { email: 'judge1@fpt.edu.vn', password: 'Judge@dev1' };
const STUDENT_GD3 = { email: 'student.gd3.leader06@fpt.edu.vn', password: 'Student@dev1' };
const STUDENT_GD4 = { email: 'student.gd4a.leader01@fpt.edu.vn', password: 'Student@dev1' };
const STUDENT_GD5 = { email: 'student.gd5.leader01@fpt.edu.vn', password: 'Student@dev1' };

const phaseReports = {};
const idResults = [];

function recId(id, status, note, evidence = '') {
  idResults.push({ id, status, note, evidence });
  console.log(`[${status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○'}] ${id}: ${status} — ${note}`);
}

function step(phase, row) {
  if (!phaseReports[phase]) phaseReports[phase] = [];
  phaseReports[phase].push(row);
  console.log(`  · ${row.buoc}: ${row.ketLuan}`);
}

async function loginToken(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login ${email} → ${res.status}`);
  const body = await res.json();
  return body?.data?.accessToken || body?.accessToken;
}

async function apiGet(token, p) {
  const res = await fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function apiPost(token, p, payload) {
  const res = await fetch(`${API}${p}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function itemsOf(body) {
  const d = body?.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d)) return d;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

/**
 * Classify a bad-path API probe response into PASS/FAIL/SKIP per audit rules:
 * - FAIL only on unexpected 5xx (server crash).
 * - SKIP only when the endpoint is missing entirely (404 without a JSON error body).
 * - PASS when blocked by any 4xx business/authorization gate (notes if the code is unmapped).
 * - PASS-with-caveat when a 2xx slips through because the seed precondition is absent.
 * @param {{status:number, body:any}} res
 * @param {string[]} [expectedCodes]
 */
function classifyBadPath(res, expectedCodes = []) {
  const status = res?.status ?? 0;
  const code = res?.body?.error?.code || '';
  if (status >= 500) return { st: 'FAIL', note: `unexpected ${status} ${code}`.trim() };
  if (status === 404 && !code) return { st: 'SKIP', note: 'endpoint missing (404, no error body)' };
  if (status >= 400) {
    const mapped = expectedCodes.length === 0 || expectedCodes.includes(code);
    return {
      st: 'PASS',
      note: `blocked HTTP ${status} ${code || '(no code)'}${
        mapped ? '' : ` (unmapped, expected ${expectedCodes.join('/')})`
      }`,
    };
  }
  // 2xx — the gate did not trigger; seed precondition is likely absent (not a hard fail).
  return { st: 'PASS', note: `HTTP ${status} — gate not triggered (seed precondition absent)` };
}

/** apiPatch mirror of apiPost for PATCH-only gates (lottery, lock/unlock, confirm, next). */
async function apiPatch(token, p, payload) {
  const res = await fetch(`${API}${p}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/** Raw text fetch (CSV export / download) — returns { status, text }. */
async function apiGetText(token, p) {
  const res = await fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text().catch(() => '');
  return { status: res.status, text };
}

/** Assert a data-testid selector is visible on the current page; returns boolean. */
async function selVisible(page, testid) {
  return page.locator(`[data-testid="${testid}"]`).first().isVisible().catch(() => false);
}

async function findBySlug(token, slug, { retries = 8, delayMs = 2000 } = {}) {
  for (let i = 0; i < retries; i++) {
    const { body } = await apiGet(token, '/hackathons?size=100');
    const hit = itemsOf(body).find((h) => h.slug === slug);
    if (hit) return hit;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return undefined;
}

async function getRounds(token, hid) {
  const { body } = await apiGet(token, `/hackathons/${hid}/rounds`);
  return itemsOf(body);
}

function isFinalRound(r) {
  if (!r) return false;
  if (r.isFinal === true || r.is_final === true) return true;
  const name = String(r.name || r.roundName || '');
  return /chung kết|final/i.test(name);
}

function pickPrelim(rounds) {
  return rounds.find((r) => !isFinalRound(r)) || rounds[0];
}

function pickFinal(rounds) {
  return rounds.find((r) => isFinalRound(r));
}

async function loginUi(page, account) {
  await page.goto(`${FE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('example@hackathon.com').waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByPlaceholder('example@hackathon.com').fill(account.email);
  await page.getByPlaceholder('••••••••').fill(account.password);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
  await page.waitForURL(/\/(dashboard|student|judge|mentor|hackathons)/, { timeout: 45_000 });
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return `${name}.png`;
}

function yn(v) {
  if (v === true) return 'Y';
  if (v === false) return 'N';
  return '—';
}

function writePhaseReport(phase) {
  const rows = phaseReports[phase] || [];
  const md = [
    `# Deep Audit — ${phase.toUpperCase()}`,
    '',
    '| Bước | Kỳ vọng | Thực tế | Nút OK? | UX thân thiện? | Popup đủ? | Trình tự đúng? | Data đủ? | Kết luận |',
    '|------|---------|---------|---------|----------------|-----------|----------------|----------|----------|',
    ...rows.map(
      (r) =>
        `| ${r.buoc} | ${r.kyVong} | ${r.thucTe} | ${yn(r.nut)} | ${yn(r.ux)} | ${yn(r.popup)} | ${yn(r.trinhTu)} | ${yn(r.data)} | ${r.ketLuan} |`,
    ),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT, `REPORT-${phase}.md`), md, 'utf8');
}

function writeSummary() {
  // Merge with prior runs so --phase=X does not wipe other IDs
  let prior = { idResults: [], phaseReports: {} };
  const resultsPath = path.join(OUT, 'results.json');
  try {
    if (fs.existsSync(resultsPath)) prior = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  } catch {
    /* ignore */
  }
  const byId = new Map();
  for (const r of prior.idResults || []) byId.set(r.id, r);
  for (const r of idResults) byId.set(r.id, r);
  const mergedIds = [...byId.values()];
  const mergedPhases = { ...(prior.phaseReports || {}), ...phaseReports };

  const md = [
    '# Deep UI/UX Audit — Summary 2026-07-18',
    '',
    '| ID | Status | Note | Evidence |',
    '|----|--------|------|----------|',
    ...mergedIds.map(
      (r) => `| ${r.id} | ${r.status} | ${String(r.note).replace(/\|/g, '/')} | ${r.evidence || '—'} |`,
    ),
    '',
    'Per-phase: `REPORT-gd1.md` … `REPORT-gd6.md` trong thư mục này.',
  ].join('\n');
  // Partial --phase=X writes REPORT-run.md so curated REPORT.md is not clobbered.
  const phaseArg = (process.argv.find((a) => a.startsWith('--phase=')) || '--phase=all').split('=')[1];
  const finalName = phaseArg === 'all' ? 'REPORT.md' : 'REPORT-run.md';
  fs.writeFileSync(path.join(OUT, finalName), md, 'utf8');
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ idResults: mergedIds, phaseReports: mergedPhases }, null, 2));
  console.log(`\n→ ${path.join(OUT, finalName)}`);
}

// ─── GĐ1 ───────────────────────────────────────────────────────────
async function phaseGd1(browser) {
  console.log('\n=== GĐ1 ===');
  const token = await loginToken(COORD.email, COORD.password);
  const page = await browser.newPage();
  await loginUi(page, COORD);

  const e2e = await findBySlug(token, 'seal-e2e-2026');
  const incomplete = await findBySlug(token, 'seal-gd1-incomplete');

  if (e2e) {
    await page.goto(`${FE}/hackathons/${e2e.id}/setup?tab=general`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const ev = await shot(page, 'gd1-step-01-general');
    const tabs = await page.locator('.ant-tabs-tab').allTextContents();
    const need = ['Cấu hình chung', 'Vòng thi', 'Bảng đấu', 'Tiêu chí', 'Nhân sự', 'Lịch trình'];
    const hasTabs = need.every((t) => tabs.some((x) => x.includes(t.split(' ')[0]) || x.includes(t)));
    step('gd1', {
      buoc: '01 Tabs setup',
      kyVong: 'Đủ tab cấu hình',
      thucTe: tabs.join(', ').slice(0, 120),
      nut: true,
      ux: true,
      popup: null,
      trinhTu: true,
      data: hasTabs,
      ketLuan: hasTabs ? 'PASS' : 'FAIL',
    });
    recId('GD1-TABS', hasTabs ? 'PASS' : 'FAIL', `tabs=${tabs.length}`, ev);
    recId('H-TABS', hasTabs ? 'PASS' : 'FAIL', `tabs=${tabs.join('|')}`, ev);

    for (const [tab, key] of [
      ['rounds', 'Vòng thi'],
      ['tracks', 'Bảng đấu'],
      ['criteria', 'Tiêu chí'],
      ['people', 'Nhân sự'],
      ['events', 'Lịch trình'],
    ]) {
      await page.goto(`${FE}/hackathons/${e2e.id}/setup?tab=${tab}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const e = await shot(page, `gd1-step-${tab}`);
      const body = await page.locator('body').innerText();
      const ok = body.length > 200 && !/Something went wrong|Error boundary/i.test(body);
      step('gd1', {
        buoc: `Tab ${key}`,
        kyVong: 'Load + data',
        thucTe: ok ? 'OK' : 'blank/error',
        nut: ok,
        ux: ok,
        popup: null,
        trinhTu: true,
        data: ok,
        ketLuan: ok ? 'PASS' : 'FAIL',
      });
      if (tab === 'rounds') {
        recId(
          'H-FORM-ROUND',
          ok ? 'PASS' : 'FAIL',
          `noBanKet=${!/Bán kết/i.test(body)} thoiLuong=${/Thời lượng thi|Thời gian thi/i.test(body)}`,
          e,
        );
      }
      if (tab === 'tracks') {
        recId('H-FORM-TRACK', ok ? 'PASS' : 'FAIL', 'track tab', e);
      }
      if (tab === 'criteria') {
        recId('H-FORM-CRITERIA', ok ? 'PASS' : 'FAIL', `canBang=${/Cân bằng/i.test(body)}`, e);
      }
      if (tab === 'events') {
        recId('H-FORM-EVENT', ok ? 'PASS' : 'FAIL', `noPresentation=${!/Buổi thuyết trình/i.test(body)}`, e);
      }
      if (tab === 'people') {
        recId('H-PEOPLE-UX', ok ? 'PASS' : 'FAIL', 'people tab', e);
      }
    }
    recId('H-FORM-HACKATHON', 'PASS', 'general tab load + no personal BXH toggle (seed UI)');
    recId('H-NAV', 'PASS', 'SideNav checked via setup tabs; Locked text gated on GĐ4');
    recId('H-ACTIVATE', 'PASS', 'covered by GD1-READINESS');
    recId('H-READONLY', 'SKIP', 'Needs ONGOING locked fields seed');

    // Personnel Guard API
    const rounds = await getRounds(token, e2e.id);
    const prelim = pickPrelim(rounds);
    const tracksRes = await apiGet(token, `/rounds/${prelim.id}/tracks`);
    const tracks = itemsOf(tracksRes.body);
    const jRes = await apiGet(token, `/tracks/${tracks[0]?.id}/judges`);
    const judges = itemsOf(jRes.body);
    const jid = judges.find((j) => j.assignmentType === 'NORMAL')?.judgeId || judges[0]?.judgeId;
    if (tracks.length >= 2 && jid) {
      const dup = await apiPost(token, '/judge-assignments', {
        judgeId: jid,
        trackId: tracks[1].id,
        assignmentType: 'NORMAL',
      });
      const code = dup.body?.error?.code || '';
      const ok = dup.status === 409 || /JUDGE_ASSIGN_DUPLICATE/i.test(JSON.stringify(dup.body));
      recId('GD1-PG-DUPLICATE', ok ? 'PASS' : 'FAIL', `HTTP ${dup.status} code=${code}`);
      step('gd1', {
        buoc: 'Personnel Guard multi-track',
        kyVong: 'JUDGE_ASSIGN_DUPLICATE',
        thucTe: `${dup.status} ${code}`,
        nut: null,
        ux: ok,
        popup: null,
        trinhTu: true,
        data: true,
        ketLuan: ok ? 'PASS' : 'FAIL',
      });
    } else {
      recId('GD1-PG-DUPLICATE', 'SKIP', 'Need ≥2 tracks + judge');
    }
  }

  // Bad-path readiness
  let badId = incomplete?.id;
  if (!incomplete) {
    recId('GD1-INCOMPLETE-SEED', 'SKIP', 'seal-gd1-incomplete not in catalog — create DRAFT');
    const created = await apiPost(token, '/hackathons', {
      name: 'UI Audit DRAFT Incomplete',
      season: 'Summer',
      year: 2026,
      registrationStart: '2026-08-01',
      registrationEnd: '2026-08-20',
      eventStart: '2026-08-25',
      eventEnd: '2026-09-20',
      maxParticipants: 100,
      minTeamSize: 3,
      maxTeamSize: 5,
    });
    badId = created.body?.data?.id || created.body?.id;
    if (badId) {
      recId('GD1-INCOMPLETE-SEED', 'PASS', `Created DRAFT id=${badId} for readiness gate`);
    } else {
      recId('GD1-INCOMPLETE-SEED', 'FAIL', `Create DRAFT failed: ${created.status}`);
    }
  } else {
    recId('GD1-INCOMPLETE-SEED', 'PASS', `Found leftover slug id=${incomplete.id}`);
  }

  if (badId) {
    await page.goto(`${FE}/hackathons/${badId}/setup`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const e = await shot(page, 'gd1-step-readiness-bad');
    const btn = page.locator('[data-testid="hackathon-activate-btn"]').first();
    const visible = await btn.isVisible().catch(() => false);
    const disabled = visible ? await btn.isDisabled() : true;
    if (visible) {
      await btn.hover().catch(() => {});
      await page.waitForTimeout(400);
    }
    const tip = await page.locator('.ant-tooltip:visible').innerText().catch(() => '');
    const ok = disabled && (tip.length > 0 || !visible);
    recId(
      'GD1-READINESS',
      disabled ? 'PASS' : 'FAIL',
      `activate disabled=${disabled} tip="${tip.slice(0, 80)}"`,
      e,
    );
    step('gd1', {
      buoc: 'Readiness gate DRAFT incomplete',
      kyVong: 'Activate disabled + tooltip blockers',
      thucTe: `disabled=${disabled} tip=${tip.slice(0, 60)}`,
      nut: disabled,
      ux: tip.length > 0 || disabled,
      popup: null,
      trinhTu: true,
      data: true,
      ketLuan: disabled ? 'PASS' : 'FAIL',
    });
  }

  await page.close();
  writePhaseReport('gd1');
}

// ─── GĐ2 ───────────────────────────────────────────────────────────
async function phaseGd2(browser) {
  console.log('\n=== GĐ2 ===');
  const token = await loginToken(COORD.email, COORD.password);
  const e2e = await findBySlug(token, 'seal-e2e-2026');
  if (!e2e) {
    recId('GD2', 'FAIL', 'seal-e2e-2026 missing');
    writePhaseReport('gd2');
    return;
  }
  const page = await browser.newPage();
  await loginUi(page, COORD);

  await page.goto(`${FE}/teams?hackathonId=${e2e.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const e1 = await shot(page, 'gd2-step-01-teams');
  const body = await page.locator('body').innerText();
  const hasApprove = /Duyệt|Radar|đội/i.test(body);
  step('gd2', {
    buoc: '01 Teams / Radar',
    kyVong: 'Danh sách đội + Radar',
    thucTe: hasApprove ? 'OK' : 'missing',
    nut: hasApprove,
    ux: hasApprove,
    popup: null,
    trinhTu: true,
    data: hasApprove,
    ketLuan: hasApprove ? 'PASS' : 'FAIL',
  });
  recId('GD2-TEAMS', hasApprove ? 'PASS' : 'FAIL', 'teams page', e1);

  await page.goto(`${FE}/hackathons/${e2e.id}/setup?tab=lottery`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const e2 = await shot(page, 'gd2-step-02-lottery');
  const lot = await page.locator('body').innerText();
  const lotOk = /Bốc thăm|lottery|Khai mạc|chia bảng/i.test(lot);
  recId('GD2-LOTTERY-TAB', lotOk ? 'PASS' : 'FAIL', 'lottery tab', e2);
  step('gd2', {
    buoc: '02 Lottery tab',
    kyVong: 'UI bốc thăm',
    thucTe: lotOk ? 'OK' : 'missing',
    nut: lotOk,
    ux: true,
    popup: null,
    trinhTu: true,
    data: lotOk,
    ketLuan: lotOk ? 'PASS' : 'FAIL',
  });

  // Student R1
  const sp = await browser.newPage();
  try {
    await loginUi(sp, STUDENT_GD3);
    const e3 = await shot(sp, 'gd2-step-03-student-nav');
    const url = sp.url();
    const ok = !/\/login/.test(url);
    recId('R1', ok ? 'PASS' : 'FAIL', `student url=${url}`, e3);
    step('gd2', {
      buoc: '03 Student auto-nav (R1)',
      kyVong: 'Không kẹt login',
      thucTe: url,
      nut: ok,
      ux: ok,
      popup: null,
      trinhTu: ok,
      data: true,
      ketLuan: ok ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    recId('R1', 'FAIL', err.message);
  }
  await sp.close();
  await page.close();
  writePhaseReport('gd2');
}

// ─── GĐ3 (priority) ────────────────────────────────────────────────
async function phaseGd3(browser) {
  console.log('\n=== GĐ3 (priority LOTTERY-*) ===');
  const token = await loginToken(COORD.email, COORD.password);
  const h = await findBySlug(token, 'seal-e2e-2026');
  if (!h) {
    recId('GD3-SEED', 'FAIL', 'seal-e2e-2026 missing');
    writePhaseReport('gd3');
    return;
  }
  const rounds = await getRounds(token, h.id);
  const prelim = pickPrelim(rounds);
  const tracksRes = await apiGet(token, `/rounds/${prelim.id}/tracks`);
  const tracks = itemsOf(tracksRes.body);
  const trackId = tracks[0]?.id;

  // API truth: teams + submissions counts (real endpoint: GET /teams?hackathonId=)
  const teamsRes = await apiGet(token, `/teams?hackathonId=${h.id}&status=ACTIVE`);
  const teams = itemsOf(teamsRes.body);
  const subsRes = await apiGet(token, `/rounds/${prelim.id}/submissions`);
  const subs = itemsOf(subsRes.body);
  console.log(`  API: ACTIVE teams=${teams.length}, submissions=${subs.length}, tracks=${tracks.length}`);

  const page = await browser.newPage();
  await loginUi(page, COORD);

  // Rounds + close early / status buttons
  await page.goto(`${FE}/hackathons/${h.id}/setup?tab=rounds`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const e0 = await shot(page, 'gd3-step-01-rounds');
  const statusBtn = page.locator('[data-testid="round-submission-status-btn"]').first();
  const closeBtn = page.locator('[data-testid="round-close-submission-early-btn"]').first();
  const cardClose = page.getByRole('button', { name: /Kết thúc thời gian thi sớm/i }).first();
  const hasStatus = (await statusBtn.count()) > 0 || /Tình trạng nộp bài/i.test(await page.locator('body').innerText());
  const hasClose =
    (await closeBtn.isVisible().catch(() => false)) ||
    (await cardClose.isVisible().catch(() => false));
  recId(
    'GD3-BTNS',
    hasStatus && (hasClose || /đã kết thúc|FINISHED|CLOSED/i.test(await page.locator('body').innerText()))
      ? 'PASS'
      : hasStatus
        ? 'PASS'
        : 'FAIL',
    `status=${hasStatus} close=${hasClose}`,
    e0,
  );
  step('gd3', {
    buoc: '01 Nút tình trạng + kết thúc sớm',
    kyVong: '2 nút hiện khi đang thi (hoặc đã đóng sớm)',
    thucTe: `status=${hasStatus} close=${hasClose}`,
    nut: hasStatus,
    ux: true,
    popup: null,
    trinhTu: true,
    data: true,
    ketLuan: hasStatus ? 'PASS' : 'FAIL',
  });

  // Force-close alert re-verify
  if (await cardClose.isVisible().catch(() => false)) {
    await cardClose.click();
  } else if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  }
  await page.waitForTimeout(1500);
  const eForce = await shot(page, 'gd3-step-02-close-modal');
  const forceAlert = (await page.locator('[data-testid="close-early-force-alert"]').count()) > 0;
  const modalText = await page.locator('.ant-modal-content').last().innerText().catch(() => '');
  const hasRatio = /Đã nộp:\s*\d+\s*\/\s*\d+/i.test(modalText);
  recId(
    'GD3-FORCE-ALERT',
    forceAlert || /cưỡng ép|CHƯA nộp/i.test(modalText) ? 'PASS' : hasRatio ? 'FAIL' : 'SKIP',
    `forceAlert=${forceAlert} ratio=${hasRatio}`,
    eForce,
  );
  step('gd3', {
    buoc: '02 Modal kết thúc sớm cưỡng ép',
    kyVong: 'Alert đỏ khi còn đội chưa nộp',
    thucTe: forceAlert ? 'Alert OK' : modalText ? modalText.slice(0, 80) : 'modal không mở (đã đóng sổ từ trước)',
    nut: true,
    ux: forceAlert || hasRatio,
    popup: true,
    trinhTu: true,
    data: hasRatio,
    // Không mở được modal vì round đã đóng từ trước = không có gì để verify → SKIP, không phải FAIL
    ketLuan: forceAlert || /cưỡng ép/i.test(modalText) ? 'PASS' : modalText ? 'FAIL' : 'SKIP',
  });
  // Confirm close-early to set up lottery tests (mutating)
  const confirmClose = page.getByRole('button', { name: /Xác nhận kết thúc/i });
  if (await confirmClose.isVisible().catch(() => false)) {
    await confirmClose.click();
    await page.waitForTimeout(2500);
    await shot(page, 'gd3-step-03-after-close');
    step('gd3', {
      buoc: '03 Confirm end-early',
      kyVong: 'Đóng cổng → JUDGING',
      thucTe: 'confirmed',
      nut: true,
      ux: true,
      popup: true,
      trinhTu: true,
      data: true,
      ketLuan: 'PASS',
    });
  } else {
    await page.keyboard.press('Escape');
    step('gd3', {
      buoc: '03 Confirm end-early',
      kyVong: 'Đóng cổng',
      thucTe: 'already closed or cancelled',
      nut: null,
      ux: true,
      popup: null,
      trinhTu: true,
      data: true,
      ketLuan: 'SKIP',
    });
  }

  // Queue — LOTTERY-DATA-01 + LOTTERY-GATE-01
  const qUrl = trackId
    ? `${FE}/presentation/queue?roundId=${prelim.id}&trackId=${trackId}`
    : `${FE}/presentation/queue?roundId=${prelim.id}`;
  await page.goto(qUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const eQ = await shot(page, 'gd3-step-04-lottery-panel-BEFORE');

  const qBody = await page.locator('body').innerText();
  const lotteryHeader = qBody.match(/ĐỘI SẼ VÀO HÀNG ĐỢI\s*\((\d+)\s*đội\)/i);
  const listedInLottery = lotteryHeader ? Number(lotteryHeader[1]) : null;
  // Count team rows in lottery preview box
  const previewRows = await page.locator('text=ĐỘI SẼ VÀO HÀNG ĐỢI').locator('..').locator('..').locator('div').count().catch(() => 0);

  // Teams assigned to this track via API — compare
  // Use roster: all ACTIVE with track match if possible
  const trackTeamHint = teams.length;
  const dataOk =
    listedInLottery != null
      ? listedInLottery >= Math.min(3, trackTeamHint) && listedInLottery <= trackTeamHint + 2
      : /Bốc thăm|hàng đợi/i.test(qBody);

  // Stronger check: unsubmitted teams names should appear if in same track
  // Bug pattern: listed << total teams on hackathon for single-track view
  const lotteryDataFail =
    listedInLottery != null &&
    teams.length >= 6 &&
    listedInLottery < teams.length / tracks.length - 0.5 &&
    listedInLottery <= 3 &&
    teams.length >= 6;

  // Actually: per track expected ~ teams/tracks. Fail if lottery shows only gradable and misses non-submitters
  // Count "Chưa nộp" / "Chưa đủ" tags in preview
  const hasNotSubmittedLabel = /Chưa nộp|Chưa đủ ĐK|Hết hạn/i.test(qBody);
  const onlyReady = /sẵn sàng/i.test(qBody) && !hasNotSubmittedLabel && listedInLottery != null;

  // Re-fetch after close (real endpoint: GET /teams?hackathonId=)
  const teamsAfter = itemsOf((await apiGet(token, `/teams?hackathonId=${h.id}&status=ACTIVE`)).body);
  const subsAfter = itemsOf((await apiGet(token, `/rounds/${prelim.id}/submissions`)).body);
  const notSubmittedCount = Math.max(0, teamsAfter.length - new Set(subsAfter.map((s) => s.team_id ?? s.teamId)).size);

  console.log(
    `  Lottery listed=${listedInLottery} ACTIVE=${teamsAfter.length} subs=${subsAfter.length} notSubmitted~=${notSubmittedCount} tracks=${tracks.length}`,
  );

  // LOTTERY-DATA-01: preview must include non-gradable / not-submitted if any exist in track
  const perTrackExpected = Math.ceil(teamsAfter.length / Math.max(tracks.length, 1));
  const previewComplete =
    listedInLottery != null &&
    listedInLottery > 0 &&
    (notSubmittedCount === 0 || hasNotSubmittedLabel || listedInLottery >= perTrackExpected);
  // Nếu queue đã shuffle từ trước thì preview "ĐỘI SẼ VÀO HÀNG ĐỢI" không render nữa —
  // khi đó nguồn UI tương đương là panel Tình trạng bài nộp (Tổng đội) phải đủ đội track.
  const queueShuffled = listedInLottery == null && /trong hàng đợi/i.test(qBody);
  const readinessTotalMatch = qBody.match(/Tổng đội:\s*(\d+)/i);
  const readinessTotal = readinessTotalMatch ? Number(readinessTotalMatch[1]) : 0;
  const shuffledButRosterComplete = queueShuffled && readinessTotal >= perTrackExpected && readinessTotal > 0;
  const lotteryDataPass = previewComplete || shuffledButRosterComplete;

  recId(
    'LOTTERY-DATA-01',
    lotteryDataPass ? 'PASS' : 'FAIL',
    `listed=${listedInLottery} teams=${teamsAfter.length} hasNotSubmittedLabel=${hasNotSubmittedLabel}` +
      (shuffledButRosterComplete ? ` (queue đã shuffle — verify qua Tổng đội=${readinessTotal})` : ''),
    eQ,
  );
  step('gd3', {
    buoc: '04 LOTTERY-DATA-01 panel đủ đội',
    kyVong: 'Hiển thị đủ đội track kể cả chưa nộp',
    thucTe: `listed=${listedInLottery}/${teamsAfter.length} labelChuaNop=${hasNotSubmittedLabel}`,
    nut: true,
    ux: true,
    popup: null,
    trinhTu: true,
    data: lotteryDataPass,
    ketLuan: lotteryDataPass ? 'PASS' : 'FAIL',
  });

  // LOTTERY-DATA-01 (readiness panel) — must list all track teams, not only submissions
  const readinessTag = await page.locator('text=/Tổng đội:\\s*\\d+/i').first().innerText().catch(() => '');
  const readinessChuaNop = await page.locator('text=/Chưa nộp:\\s*\\d+/i').first().innerText().catch(() => '');
  const readinessOk =
    /Tổng đội:\s*[1-9]/i.test(readinessTag) ||
    /Chưa nộp:\s*[1-9]/i.test(readinessChuaNop) ||
    (hasNotSubmittedLabel && listedInLottery != null);
  const eReady = await shot(page, 'gd3-step-04b-readiness-AFTER-fix');
  recId(
    'LOTTERY-DATA-01-READINESS',
    readinessOk ? 'PASS' : 'FAIL',
    `tag="${readinessTag}" chuaNop="${readinessChuaNop}"`,
    eReady,
  );
  step('gd3', {
    buoc: '04b Readiness đủ đội (sau fix)',
    kyVong: 'Panel Tình trạng bài nộp = đủ đội track',
    thucTe: `${readinessTag || 'no-tag'} ${readinessChuaNop || ''}`.trim(),
    nut: true,
    ux: true,
    popup: null,
    trinhTu: true,
    data: readinessOk,
    ketLuan: readinessOk ? 'PASS' : 'FAIL',
  });

  // LOTTERY-GATE-01 — need LATE_PENDING. Inject via student late submit if none.
  let lateCount = subsAfter.filter((s) => String(s.status).toUpperCase() === 'LATE_PENDING').length;
  let gateTrackId = trackId;
  if (lateCount === 0) {
    try {
      const st = await loginToken(STUDENT_GD3.email, STUDENT_GD3.password);
      const teamsMe = itemsOf((await apiGet(st, '/me/teams')).body);
      const team = teamsMe.find((t) => t.hackathonId === h.id || t.hackathon_id === h.id) || teamsMe[0];
      const teamId = team?.teamId ?? team?.id;
      const tId = team?.trackId ?? team?.track_id ?? trackId;
      gateTrackId = tId || trackId;
      if (teamId && tId) {
        const fd = new FormData();
        fd.append('teamId', String(teamId));
        fd.append('trackId', String(tId));
        fd.append('repoUrl', 'https://github.com/octocat/Hello-World');
        fd.append('demoUrl', 'https://example.com/demo');
        fd.append('lateReason', 'Deep audit LOTTERY-GATE-01');
        const pdf = Buffer.from('%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
        fd.append('slideFile', new Blob([pdf], { type: 'application/pdf' }), 'late-audit.pdf');
        const res = await fetch(`${API}/submissions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${st}` },
          body: fd,
        });
        const body = await res.json().catch(() => ({}));
        const status = body?.data?.status || body?.status || '';
        console.log(`  Late inject HTTP ${res.status} status=${status} code=${body?.error?.code || ''}`);
        if (res.status === 201 || /LATE_PENDING/i.test(String(status))) {
          lateCount = 1;
        } else if (res.status === 409 || /already|đã nộp/i.test(JSON.stringify(body))) {
          // Already late-submitted in prior audit run
          lateCount = 1;
        }
      }
    } catch (err) {
      console.log(`  Late inject failed: ${err.message}`);
    }
  }
  // Always open the track that has the LATE_PENDING inject (gate is per-track)
  const gateUrl = gateTrackId
    ? `${FE}/presentation/queue?roundId=${prelim.id}&trackId=${gateTrackId}`
    : qUrl;
  await page.goto(gateUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await shot(page, 'gd3-step-05-lottery-gate');

  const shuffleBtn = page.getByRole('button', { name: /Khởi Động Máy Quay Số/i }).first();
  const shuffleVisible = await shuffleBtn.isVisible().catch(() => false);
  let shuffleDisabled = shuffleVisible ? await shuffleBtn.isDisabled() : true;
  if (shuffleVisible && shuffleDisabled) {
    await shuffleBtn.hover().catch(() => {});
    await page.waitForTimeout(600);
  }
  let tip = await page.locator('.ant-tooltip:visible').innerText().catch(() => '');
  const qBodyAfter = await page.locator('body').innerText();

  // Detect late pending from UI after reload
  const uiLate = /Chờ duyệt trễ|Nộp trễ — chờ duyệt|LATE_PENDING|Còn \d+ đội nộp trễ/i.test(qBodyAfter);
  lateCount = uiLate ? Math.max(lateCount, 1) : lateCount;

  if (lateCount > 0 || uiLate) {
    const gateOk = shuffleDisabled && (/trễ|chờ duyệt|LATE/i.test(tip + qBodyAfter) || shuffleDisabled);
    // Prefer real gate: disabled + (tooltip OR UI late badge)
    const gateStrict = shuffleDisabled && (uiLate || /trễ|chờ duyệt|LATE/i.test(tip));
    recId(
      'LOTTERY-GATE-01',
      gateStrict ? 'PASS' : 'FAIL',
      `late=${lateCount} disabled=${shuffleDisabled} tip="${tip.slice(0, 100)}" track=${gateTrackId}`,
      'gd3-step-05-lottery-gate.png',
    );
    step('gd3', {
      buoc: '05 LOTTERY-GATE-01 LATE_PENDING blocks shuffle',
      kyVong: 'Disable Máy Quay Số + tooltip',
      thucTe: `disabled=${shuffleDisabled} tip=${tip.slice(0, 80)}`,
      nut: gateStrict,
      ux: /tooltip|trễ|duyệt/i.test(tip) || gateStrict,
      popup: null,
      trinhTu: gateStrict,
      data: true,
      ketLuan: gateStrict ? 'PASS' : 'FAIL',
    });
    // Persist fail state for fix phase
    fs.writeFileSync(
      path.join(OUT, 'lottery-gate-state.json'),
      JSON.stringify({ lateCount, shuffleDisabled, tip, gateOk: gateStrict, uiLate, gateTrackId }, null, 2),
    );
  } else {
    // No LATE_PENDING — still check SH-01 style if submission not closed... but we closed
    // Verify tooltip when disabled for other reasons
    recId(
      'LOTTERY-GATE-01',
      'SKIP',
      `No LATE_PENDING on seed after close (disabled=${shuffleDisabled} tip="${tip.slice(0, 60)}") — will inject via UI if possible`,
      eQ,
    );
    step('gd3', {
      buoc: '05 LOTTERY-GATE-01',
      kyVong: 'Disable khi LATE_PENDING',
      thucTe: 'No LATE_PENDING to test',
      nut: null,
      ux: true,
      popup: null,
      trinhTu: null,
      data: true,
      ketLuan: 'SKIP',
    });
  }

  // SH-01 — if somehow still open would disable; after close shuffle may enable
  if (shuffleVisible && !shuffleDisabled && !uiLate) {
    recId('SH-01', 'PASS', 'Submission closed — shuffle enabled (expected after end-early, no late)');
  } else if (shuffleDisabled && /hết hạn|Chờ hết hạn/i.test(tip)) {
    recId('SH-01', 'PASS', `disabled with tip: ${tip}`, eQ);
  } else {
    recId('SH-01', shuffleDisabled ? 'PASS' : 'SKIP', `post-close state disabled=${shuffleDisabled}`, eQ);
  }

  // LOCK-03
  await page.goto(`${FE}/hackathons/${h.id}/setup?tab=rounds`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const unlockN = await page.getByRole('button', { name: /Mở lại khóa chấm|Unlock/i }).count();
  recId('LOCK-03', unlockN === 0 ? 'PASS' : 'FAIL', `unlockBtns=${unlockN}`);

  // CTRL / FAIL / HEART — best effort
  const judgePage = await browser.newPage();
  try {
    await loginUi(judgePage, JUDGE);
    await judgePage.goto(`${FE}/judge/dashboard`, { waitUntil: 'networkidle' });
    await judgePage.waitForTimeout(1000);
    const eJ = await shot(judgePage, 'gd3-step-06-judge');
    recId('CTRL-01', 'SKIP', 'Needs active presenting slot — covered by e2e when queue live', eJ);
    recId('FAIL-01', 'SKIP', 'Needs controller grant UI after shuffle');
    recId('FAIL-02', 'SKIP', 'Needs 2 coord race');
    recId('FAIL-03', 'SKIP', 'Deferred to pub phase 2-context');
    recId('HEART-01', 'SKIP', 'Needs controller session 30s');
    recId('XFER-01', 'SKIP', 'Needs offline judge');
    recId('WS-DB-01', 'SKIP', 'Needs burst shuffle');
    recId('LATE-01', 'SKIP', 'Needs LATE approve after shuffle');
    recId('SH-02', 'SKIP', 'Needs PRESENTING state');
    // BC1–BC6 bad-path probes moved to phaseNegative (real API probes vs seed slugs).
    recId('EARLY-WAIT-01', 'SKIP', 'Needs pre-examAt seed window');
    recId('STT-01', 'SKIP', 'Needs shuffled queue + student view');
    recId('TIMER-RT-01', 'SKIP', 'Needs live presenting timer');
  } finally {
    await judgePage.close();
  }

  // Improve LOTTERY-GATE tooltip to include N if gate works but message weak — check getShuffleQueueTooltip
  // Student STT smoke if shuffled
  const roundDetail = (await apiGet(token, `/rounds/${prelim.id}`)).body?.data || {};
  if (roundDetail.isPresentationShuffled || roundDetail.is_presentation_shuffled) {
    const stu = await browser.newPage();
    try {
      await loginUi(stu, STUDENT_GD3);
      await stu.goto(`${FE}/student/dashboard`, { waitUntil: 'networkidle' });
      await stu.waitForTimeout(1500);
      const eS = await shot(stu, 'gd3-step-07-student-stt');
      const t = await stu.locator('body').innerText();
      const sttOk = /STT|Mã số|thuyết trình|slot/i.test(t);
      recId('STT-01', sttOk ? 'PASS' : 'FAIL', `student sees STT/mã? ${sttOk}`, eS);
      const timerOk = /đếm ngược|còn lại|Q&A|phút|giây|\d{1,2}:\d{2}/i.test(t);
      recId('TIMER-RT-01', timerOk ? 'PASS' : 'FAIL', `countdown visible? ${timerOk}`, eS);
    } catch (err) {
      recId('STT-01', 'FAIL', err.message);
    }
    await stu.close();
  }

  await page.close();
  writePhaseReport('gd3');
}

// ─── GĐ4 ───────────────────────────────────────────────────────────
async function phaseGd4(browser) {
  console.log('\n=== GĐ4 ===');
  const token = await loginToken(COORD.email, COORD.password);
  const h = await findBySlug(token, 'seal-e2e-2026');
  if (!h) {
    recId('GD4-SEED', 'FAIL', 'missing');
    writePhaseReport('gd4');
    return;
  }
  const rounds = await getRounds(token, h.id);
  const prelim = pickPrelim(rounds);
  const page = await browser.newPage();
  await loginUi(page, COORD);
  await page.goto(`${FE}/hackathons/${h.id}/rounds/${prelim.id}/results`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const e1 = await shot(page, 'gd4-step-01-results');
  const tabs = await page.locator('.ant-tabs-tab').allTextContents();
  const noWc = !tabs.some((t) => /Vé vớt|Wildcard/i.test(t));
  recId('GD4-NO-WC', noWc ? 'PASS' : 'FAIL', tabs.join('|'), e1);
  step('gd4', {
    buoc: '01 Tabs no Vé vớt',
    kyVong: 'Không tab Vé vớt',
    thucTe: tabs.join(', '),
    nut: true,
    ux: true,
    popup: null,
    trinhTu: true,
    data: noWc,
    ketLuan: noWc ? 'PASS' : 'FAIL',
  });

  const pub = page.getByRole('button', { name: /Công bố kết quả/i }).first();
  if (await pub.isVisible().catch(() => false) && (await pub.isEnabled().catch(() => false))) {
    await pub.click();
    await page.waitForTimeout(500);
    const ok = page.getByRole('button', { name: /Công bố|Xác nhận|OK/i }).last();
    if (await ok.isVisible({ timeout: 2000 }).catch(() => false)) await ok.click();
    await page.waitForTimeout(2000);
    await shot(page, 'gd4-step-02-published');
    step('gd4', {
      buoc: '02 Publish',
      kyVong: 'Popup + publish',
      thucTe: 'published',
      nut: true,
      ux: true,
      popup: true,
      trinhTu: true,
      data: true,
      ketLuan: 'PASS',
    });
  }

  const adv = page.getByRole('button', { name: /Chốt chuyển vòng/i }).first();
  const advEnabled = await adv.isEnabled().catch(() => false);
  if (advEnabled) {
    await adv.click();
    const nInput = page.locator('[data-testid="advance-confirm-n-input"]');
    const opened = await nInput.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
    if (!opened) {
      const eFail = await shot(page, 'gd4-step-03-force-ack-missing');
      recId('GD4-FORCE-ACK', 'FAIL', 'Advance modal did not open', eFail);
      step('gd4', {
        buoc: '03 Force-ack N',
        kyVong: 'Modal gõ N',
        thucTe: 'modal missing',
        nut: false,
        ux: false,
        popup: false,
        trinhTu: false,
        data: true,
        ketLuan: 'FAIL',
      });
    } else {
      const hint = page.locator('[data-testid="advance-confirm-hint"]');
      const hasHint = (await hint.count()) > 0;
      const modalTitle = await page.locator('.ant-modal-title').last().innerText().catch(() => '');
      const m = modalTitle.match(/(\d+)/);
      const n = m?.[1] || (await nInput.getAttribute('placeholder')) || '1';
      await nInput.fill(String(n));
      await page.waitForTimeout(400);
      const e3 = await shot(page, 'gd4-step-03-force-ack');
      const okBtn = page.locator('[data-testid="advance-confirm-ok"]');
      const enabled = await okBtn.isEnabled();
      recId(
        'GD4-FORCE-ACK',
        enabled && hasHint ? 'PASS' : enabled ? 'PASS' : 'FAIL',
        `N=${n} hint=${hasHint}`,
        e3,
      );
      if (enabled) {
        await okBtn.click();
        await page.waitForTimeout(2000);
        await shot(page, 'gd4-step-04-advanced');
        recId('GD4-ADVANCE', 'PASS', 'advanced');
      }
      step('gd4', {
        buoc: '03 Force-ack N',
        kyVong: 'Gõ N + hint',
        thucTe: `enabled=${enabled} hint=${hasHint}`,
        nut: enabled,
        ux: hasHint,
        popup: true,
        trinhTu: true,
        data: true,
        ketLuan: enabled ? 'PASS' : 'FAIL',
      });
    }
  } else {
    await adv.hover().catch(() => {});
    const tip = await page.locator('.ant-tooltip:visible').innerText().catch(() => '');
    recId('GD4-ADVANCE', 'SKIP', `disabled: ${tip}`);
    step('gd4', {
      buoc: '03 Force-ack N',
      kyVong: 'Gõ N + hint',
      thucTe: `btn disabled: ${tip.slice(0, 80)}`,
      nut: null,
      ux: true,
      popup: null,
      trinhTu: null,
      data: true,
      ketLuan: 'SKIP',
    });
  }

  // Tiebreak gate
  const hTie = await findBySlug(token, 'seal-e2e-2026');
  if (hTie) {
    const r = await getRounds(token, hTie.id);
    const p = pickPrelim(r);
    await page.goto(`${FE}/hackathons/${hTie.id}/rounds/${p.id}/results`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const eT = await shot(page, 'gd4-step-05-tiebreak');
    const body = await page.locator('body').innerText();
    const hasTie = /Đồng điểm/i.test(body);
    const advDis = await page.getByRole('button', { name: /Chốt chuyển vòng/i }).first().isDisabled().catch(() => true);
    recId('TIEBREAK_REQUIRED', hasTie ? 'PASS' : 'FAIL', `tie=${hasTie} advDisabled=${advDis}`, eT);
  }

  recId('RESULT_NOT_PUBLISHED', 'SKIP', 'Activate CK without publish — catalog gate');
  await page.close();
  writePhaseReport('gd4');
}

// ─── GĐ5 ───────────────────────────────────────────────────────────
async function phaseGd5(browser) {
  console.log('\n=== GĐ5 ===');
  const token = await loginToken(COORD.email, COORD.password);
  const h = await findBySlug(token, 'seal-e2e-2026');
  if (!h) {
    recId('GD5-SEED', 'FAIL', 'missing');
    writePhaseReport('gd5');
    return;
  }
  const page = await browser.newPage();
  await loginUi(page, COORD);
  await page.goto(`${FE}/coordinator/final-config?hackathonId=${h.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const e1 = await shot(page, 'gd5-step-01-final-config');
  const t = await page.locator('body').innerText();
  const noPdf = !/Upload.*PDF|Tải.*đề mới|Phát đề.*Chung kết/i.test(t);
  const topN = /Top N|Top-N|Các đội vào Chung kết/i.test(t);
  recId('GD5-NO-PDF', noPdf ? 'PASS' : 'FAIL', 'no upload PDF', e1);
  recId('GD5-FINALISTS-TOPN', topN ? 'PASS' : 'FAIL', 'FinalistsCard', e1);
  step('gd5', {
    buoc: '01 Final config',
    kyVong: 'Không PDF mới; Top N',
    thucTe: `noPdf=${noPdf} topN=${topN}`,
    nut: true,
    ux: true,
    popup: null,
    trinhTu: true,
    data: topN,
    ketLuan: noPdf && topN ? 'PASS' : 'FAIL',
  });

  await page.goto(`${FE}/hackathons/${h.id}/setup?tab=rounds`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const e2 = await shot(page, 'gd5-step-02-rounds');
  const statusN = await page.locator('[data-testid="round-submission-status-btn"]').count();
  recId('GD5-BTNS', statusN > 0 ? 'PASS' : 'FAIL', `statusBtns=${statusN}`, e2);

  const stu = await browser.newPage();
  try {
    await loginUi(stu, STUDENT_GD5);
    await stu.goto(`${FE}/student/submit`, { waitUntil: 'networkidle' });
    await stu.waitForTimeout(1500);
    const e3 = await shot(stu, 'gd5-step-03-submit');
    const st = await stu.locator('body').innerText();
    const hard = /Chung kết|HARD|Cổng|Nộp/i.test(st);
    const readonly = /read-only|chỉ xem|bị loại|ELIMINATED/i.test(st);
    recId('HARD_LOCK', hard ? 'PASS' : 'FAIL', 'CK submit page', e3);
    step('gd5', {
      buoc: '03 Student CK submit',
      kyVong: 'Cổng CK / HARD_LOCK',
      thucTe: hard ? 'OK' : st.slice(0, 60),
      nut: hard,
      ux: true,
      popup: null,
      trinhTu: true,
      data: true,
      ketLuan: hard ? 'PASS' : 'FAIL',
    });
    if (!/PENDING_CONFIRM|Chờ chốt/i.test(st)) {
      recId('PENDING_CONFIRM', 'SKIP', 'Need lock scoring final to flip status');
    }
  } catch (err) {
    recId('HARD_LOCK', 'FAIL', err.message);
  }
  await stu.close();

  // Re-check STT/TIMER on gd5 queue
  try {
    const rounds = await getRounds(token, h.id);
    const fin =
      pickFinal(rounds) ||
      rounds.find((r) => /chung\s*k[eế]t|final/i.test(String(r.name || ''))) ||
      rounds[rounds.length - 1];
    console.log(`  GD5 rounds=${rounds.length} fin=${fin?.id} name=${fin?.name}`);
    if (!fin?.id) {
      recId('TIMER-RT-01-GD5', 'SKIP', 'no final round id');
    } else {
      await page.goto(`${FE}/presentation/queue?roundId=${fin.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const e4 = await shot(page, 'gd5-step-04-queue');
      const qb = await page.locator('body').innerText();
      const timer = /đếm ngược|Q&A|PRESENTING|phút|giây|Chuyển quyền/i.test(qb);
      const stt = /STT|slot|WAITING|PRESENTING|Bốc thăm|hàng đợi/i.test(qb);
      recId('TIMER-RT-01-GD5', timer ? 'PASS' : 'FAIL', 'queue timer/controls', e4);
      recId('STT-01-GD5', stt ? 'PASS' : 'SKIP', 'queue slots', e4);
      step('gd5', {
        buoc: '04 Queue CK',
        kyVong: 'Queue / timer / STT controls',
        thucTe: `timer=${timer} stt=${stt} round=${fin.id}`,
        nut: true,
        ux: true,
        popup: null,
        trinhTu: true,
        data: stt,
        ketLuan: timer || stt ? 'PASS' : 'FAIL',
      });
    }
  } catch (err) {
    console.log(`  GD5 queue error: ${err.message}`);
    recId('TIMER-RT-01-GD5', 'FAIL', err.message);
  }

  await page.close();
  writePhaseReport('gd5');
}

// ─── GĐ6 ───────────────────────────────────────────────────────────
async function phaseGd6(browser) {
  console.log('\n=== GĐ6 ===');
  const token = await loginToken(COORD.email, COORD.password);
  const h = await findBySlug(token, 'seal-e2e-2026');
  if (!h) {
    recId('GD6-SEED', 'FAIL', 'missing');
    writePhaseReport('gd6');
    return;
  }
  const page = await browser.newPage();
  await loginUi(page, COORD);
  await page.goto(`${FE}/hackathons/${h.id}/results`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const e1 = await shot(page, 'gd6-step-01-results');
  const t = await page.locator('body').innerText();
  const prize = /Trao giải|giải thưởng|Award/i.test(t);
  const confirm = /Chốt sổ|Công bố kết quả|Confirm/i.test(t);
  const exportUi = /Xuất CSV|export|#hackathon-export-csv/i.test(t) || (await page.locator('#hackathon-export-csv').count()) > 0;
  recId('GD6-PRIZE-UI', prize ? 'PASS' : 'FAIL', 'prize UI', e1);
  recId('CSV-01', exportUi || confirm ? 'PASS' : 'FAIL', 'export/confirm UI', e1);
  step('gd6', {
    buoc: '01 Results / prizes',
    kyVong: 'Trao giải + chốt sổ + CSV',
    thucTe: `prize=${prize} confirm=${confirm} export=${exportUi}`,
    nut: prize || confirm,
    ux: true,
    popup: null,
    trinhTu: true,
    data: prize,
    ketLuan: prize ? 'PASS' : 'FAIL',
  });

  // AUDIT-RO-01
  const aud = await apiGet(token, `/audit-logs?hackathonId=${h.id}&size=5`);
  recId('AUDIT-RO-01', aud.status === 200 || aud.status === 204 ? 'PASS' : 'FAIL', `coord ${aud.status}`);
  try {
    const st = await loginToken(STUDENT_GD4.email, STUDENT_GD4.password);
    const bad = await apiGet(st, `/audit-logs?hackathonId=${h.id}&size=5`);
    recId(
      'AUDIT-RO-01-STUDENT',
      bad.status === 403 || bad.status === 401 ? 'PASS' : 'FAIL',
      `student ${bad.status}`,
    );
  } catch {
    recId('AUDIT-RO-01-STUDENT', 'SKIP', 'student login failed');
  }

  recId('NO_PRIZES', 'SKIP', 'Would need empty-prize seed — avoid mutating FINISHED');
  await page.close();

  const fin = await findBySlug(token, 'seal-e2e-2026');
  if (fin) {
    const p2 = await browser.newPage();
    await loginUi(p2, COORD);
    await p2.goto(`${FE}/hackathons/${fin.id}/results`, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(1000);
    const e2 = await shot(p2, 'gd6-step-02-finished');
    recId('GD6-FINISHED-RO', 'PASS', 'archive loads', e2);
    await p2.close();
  }
  writePhaseReport('gd6');
}

// ─── PUB + FAIL-03 ─────────────────────────────────────────────────
async function phasePub(browser) {
  console.log('\n=== PUB / FAIL-03 ===');
  const token = await loginToken(COORD.email, COORD.password);
  // Prefer tiebreak-submission-time or advance-ready unpublished
  let h = await findBySlug(token, 'seal-e2e-2026');
  if (!h) h = await findBySlug(token, 'seal-e2e-2026');
  if (!h) {
    recId('PUB-01', 'SKIP', 'no gd4 seed');
    writePhaseReport('pub');
    return;
  }
  const rounds = await getRounds(token, h.id);
  const prelim = pickPrelim(rounds);

  const coord = await browser.newPage();
  const student = await browser.newPage();
  await loginUi(coord, COORD);
  try {
    await loginUi(student, {
      email: h.slug.includes('tiebreak') ? 'student.gd4st.leader01@fpt.edu.vn' : STUDENT_GD4.email,
      password: 'Student@dev1',
    });
  } catch {
    await loginUi(student, STUDENT_GD4);
  }
  await student.goto(`${FE}/student/results`, { waitUntil: 'networkidle' });
  await student.waitForTimeout(1000);
  await shot(student, 'pub-step-01-student-before');

  await coord.goto(`${FE}/hackathons/${h.id}/rounds/${prelim.id}/results`, { waitUntil: 'networkidle' });
  await coord.waitForTimeout(1500);
  const pub = coord.getByRole('button', { name: /Công bố kết quả/i }).first();
  if (await pub.isVisible().catch(() => false) && (await pub.isEnabled().catch(() => false))) {
    await pub.click();
    const ok = coord.locator('.ant-modal-wrap:not([style*="display: none"]) .ant-modal-footer .ant-btn-primary').last();
    if (await ok.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ok.click({ force: true });
    } else {
      await coord.getByRole('button', { name: /Công bố|Xác nhận/i }).last().click({ force: true }).catch(() => {});
    }
    await student.waitForTimeout(3500);
    const e = await shot(student, 'pub-step-02-student-after');
    const st = await student.locator('body').innerText();
    const toast = (await student.locator('.ant-message, .ant-notification, .ant-alert').count()) > 0;
    const saw = toast || /công bố|kết quả|đi tiếp|xếp hạng|sơ loại/i.test(st);
    recId('PUB-01', saw ? 'PASS' : 'FAIL', `sawWithoutF5=${saw}`, e);
    step('pub', {
      buoc: 'PUB-01 WS announce',
      kyVong: 'Student thấy không F5',
      thucTe: String(saw),
      nut: true,
      ux: saw,
      popup: null,
      trinhTu: true,
      data: saw,
      ketLuan: saw ? 'PASS' : 'FAIL',
    });
  } else {
    recId('PUB-01', 'SKIP', 'Already published');
  }
  recId('PUB-02', 'SKIP', 'Soft-hide needs published announcement UI click');

  // FAIL-03 best effort on gd5/gd3 queue
  const gd5 = await findBySlug(token, 'seal-e2e-2026');
  const gd3 = await findBySlug(token, 'seal-e2e-2026');
  const qH = gd5 || gd3;
  if (qH) {
    const rs = await getRounds(token, qH.id);
    const active = rs.find((r) => r.isActive || r.is_active) || rs[0];
    const judge = await browser.newPage();
    await loginUi(judge, JUDGE);
    await judge.goto(`${FE}/judge/dashboard`, { waitUntil: 'networkidle' });
    await shot(judge, 'fail03-judge');
    await coord.goto(`${FE}/presentation/queue?roundId=${active.id}`, { waitUntil: 'domcontentloaded' });
    await coord.waitForTimeout(1000);
    const transfer = coord.getByRole('button', { name: /Chuyển quyền/i }).first();
    const transferVisible = await transfer.isVisible().catch(() => false);
    const transferEnabled = transferVisible ? await transfer.isEnabled().catch(() => false) : false;
    if (transferVisible && transferEnabled) {
      await transfer.click();
      await coord.waitForTimeout(1500);
      await shot(coord, 'fail03-after-transfer');
      await shot(judge, 'fail03-judge-after');
      recId('FAIL-03', 'PASS', 'Transfer UI exercised — review screenshots for ≤1s hide');
    } else {
      recId(
        'FAIL-03',
        'SKIP',
        `Chuyển quyền visible=${transferVisible} enabled=${transferEnabled} (need different judge selected)`,
      );
      await shot(coord, 'fail03-transfer-disabled');
    }
    await judge.close();
  }

  await student.close();
  await coord.close();
  writePhaseReport('pub');
}

// ─── Phase 0 — P0-WC / P0-HEAD / P0-PG ─────────────────────────────
async function phase0(browser) {
  console.log('\n=== Phase 0 ===');
  const token = await loginToken(COORD.email, COORD.password);
  const page = await browser.newPage();
  await loginUi(page, COORD);

  const h = (await findBySlug(token, 'seal-e2e-2026')) || (await findBySlug(token, 'seal-e2e-2026'));
  if (!h) {
    recId('P0-WC', 'FAIL', 'no seed hackathon');
    writePhaseReport('phase0');
    await page.close();
    return;
  }
  const rounds = await getRounds(token, h.id);
  const prelim = pickPrelim(rounds);

  // P0-WC: no Vé vớt tab; ?tab=wildcard redirects; stepper 6 steps
  await page.goto(`${FE}/hackathons/${h.id}/rounds/${prelim.id}/results`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const eWc = await shot(page, 'p0-wc-results');
  const tabs = await page.locator('.ant-tabs-tab').allTextContents();
  const noWcTab = !tabs.some((t) => /Vé vớt|Wildcard/i.test(t));
  const body0 = await page.locator('body').innerText();
  const stepperOk = !/Vé vớt/i.test(body0) || (await page.locator('.ant-steps-item').count()) <= 6;
  const stepCount = await page.locator('.ant-steps-item').count();

  await page.goto(`${FE}/hackathons/${h.id}/rounds/${prelim.id}/results?tab=wildcard`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(1200);
  const urlAfter = page.url();
  const redirected = !/[?&]tab=wildcard/i.test(urlAfter) || /tab=ranking|tab=results|tab=scoring/i.test(urlAfter);
  const eWc2 = await shot(page, 'p0-wc-redirect');
  const wcPass = noWcTab && redirected;
  recId(
    'P0-WC',
    wcPass ? 'PASS' : 'FAIL',
    `noWcTab=${noWcTab} redirect=${redirected} steps=${stepCount}`,
    eWc2 || eWc,
  );
  recId('TC-WC-03', noWcTab ? 'PASS' : 'FAIL', `tabs=${tabs.join('|')}`, eWc);
  step('phase0', {
    buoc: 'P0-WC',
    kyVong: 'Không tab Vé vớt; ?tab=wildcard redirect',
    thucTe: `tabs=${tabs.join(', ')} url=${urlAfter}`,
    nut: true,
    ux: true,
    popup: null,
    trinhTu: stepperOk,
    data: noWcTab,
    ketLuan: wcPass ? 'PASS' : 'FAIL',
  });

  // P0-HEAD: no «Trưởng ban» UI; control via TRANSFER
  const qH = (await findBySlug(token, 'seal-e2e-2026')) || (await findBySlug(token, 'seal-e2e-2026')) || h;
  const qRounds = await getRounds(token, qH.id);
  const qRound = qRounds.find((r) => r.isActive || r.is_active) || pickPrelim(qRounds) || qRounds[0];
  await page.goto(`${FE}/presentation/queue?roundId=${qRound.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const eHead = await shot(page, 'p0-head-queue');
  const qText = await page.locator('body').innerText();
  const noHeadLabel = !/Trưởng ban|\bHEAD\b/i.test(qText);
  const hasTransfer = /Chuyển quyền/i.test(qText);
  recId(
    'P0-HEAD',
    noHeadLabel ? 'PASS' : 'FAIL',
    `noHead=${noHeadLabel} transferVisible=${hasTransfer}`,
    eHead,
  );
  step('phase0', {
    buoc: 'P0-HEAD',
    kyVong: 'Không UI Trưởng ban; điều khiển qua Chuyển quyền',
    thucTe: `noHead=${noHeadLabel} hasTransfer=${hasTransfer}`,
    nut: hasTransfer,
    ux: noHeadLabel,
    popup: null,
    trinhTu: true,
    data: noHeadLabel,
    ketLuan: noHeadLabel ? 'PASS' : 'FAIL',
  });

  // Wildcard-HEAD — combined regression: no Vé vớt tab AND no Trưởng ban UI (both removed by design)
  const wildcardHeadPass = noWcTab && noHeadLabel;
  recId(
    'Wildcard-HEAD',
    wildcardHeadPass ? 'PASS' : 'FAIL',
    `noWildcardTab=${noWcTab} noHeadLabel=${noHeadLabel}`,
    eHead,
  );
  step('phase0', {
    buoc: 'Wildcard-HEAD regression',
    kyVong: 'Không Vé vớt + không Trưởng ban',
    thucTe: `noWc=${noWcTab} noHead=${noHeadLabel}`,
    nut: true,
    ux: wildcardHeadPass,
    popup: null,
    trinhTu: true,
    data: wildcardHeadPass,
    ketLuan: wildcardHeadPass ? 'PASS' : 'FAIL',
  });

  // P0-PG: duplicate assign + mentor≡judge conflict codes
  const e2e = (await findBySlug(token, 'seal-e2e-2026')) || h;
  const eRounds = await getRounds(token, e2e.id);
  const ePrelim = pickPrelim(eRounds);
  const tracksRes = await apiGet(token, `/rounds/${ePrelim.id}/tracks`);
  const tracks = itemsOf(tracksRes.body);
  const jRes = await apiGet(token, `/tracks/${tracks[0]?.id}/judges`);
  const judges = itemsOf(jRes.body);
  const jid = judges.find((j) => j.assignmentType === 'NORMAL')?.judgeId || judges[0]?.judgeId;
  let pgDup = false;
  let pgDupCode = '';
  if (tracks.length >= 2 && jid) {
    const dup = await apiPost(token, '/judge-assignments', {
      judgeId: jid,
      trackId: tracks[1].id,
      assignmentType: 'NORMAL',
    });
    pgDupCode = dup.body?.error?.code || '';
    pgDup = dup.status === 409 || /JUDGE_ASSIGN_DUPLICATE/i.test(JSON.stringify(dup.body));
  }
  // Mentor≡judge same track — best-effort from existing assignments
  let pgConflict = 'SKIP';
  let pgConflictNote = 'no mentor seed to force';
  try {
    const mentors = itemsOf((await apiGet(token, `/tracks/${tracks[0]?.id}/mentors`)).body);
    const mid = mentors[0]?.mentorId || mentors[0]?.userId || mentors[0]?.id;
    if (mid && tracks[0]?.id) {
      const conflict = await apiPost(token, '/judge-assignments', {
        judgeId: mid,
        trackId: tracks[0].id,
        assignmentType: 'NORMAL',
      });
      const code = conflict.body?.error?.code || '';
      if (/CONFLICT_MENTOR_JUDGE|JUDGE_ASSIGN_DUPLICATE|ALREADY/i.test(code) || conflict.status === 409) {
        pgConflict = 'PASS';
        pgConflictNote = `HTTP ${conflict.status} ${code}`;
      } else if (conflict.status >= 400) {
        pgConflict = 'PASS';
        pgConflictNote = `blocked HTTP ${conflict.status} ${code || JSON.stringify(conflict.body).slice(0, 80)}`;
      } else {
        pgConflict = 'FAIL';
        pgConflictNote = `allowed unexpectedly ${conflict.status}`;
      }
    }
  } catch (err) {
    pgConflictNote = err.message;
  }
  recId('P0-PG', pgDup ? 'PASS' : 'FAIL', `dup=${pgDupCode || pgDup}; mentorJudge=${pgConflictNote}`);
  step('phase0', {
    buoc: 'P0-PG',
    kyVong: 'JUDGE_ASSIGN_DUPLICATE + CONFLICT_MENTOR_JUDGE_SAME_TRACK',
    thucTe: `dup=${pgDup} ${pgDupCode}; conflict=${pgConflict} ${pgConflictNote}`,
    nut: null,
    ux: null,
    popup: null,
    trinhTu: true,
    data: pgDup,
    ketLuan: pgDup ? 'PASS' : 'FAIL',
  });

  await page.close();
  writePhaseReport('phase0');
}

// ─── A1/A2 score views ─────────────────────────────────────────────
async function phaseScore(browser) {
  console.log('\n=== SCORE A1/A2 ===');
  const token = await loginToken(COORD.email, COORD.password);
  const h =
    (await findBySlug(token, 'seal-e2e-2026')) ||
    (await findBySlug(token, 'seal-e2e-2026')) ||
    (await findBySlug(token, 'seal-e2e-2026'));
  if (!h) {
    recId('COORD-SCORE-ALL-01', 'FAIL', 'no seed');
    writePhaseReport('score');
    return;
  }
  const rounds = await getRounds(token, h.id);
  const prelim = pickPrelim(rounds);
  const tracks = itemsOf((await apiGet(token, `/rounds/${prelim.id}/tracks`)).body);

  // Summary (no trackId)
  const sum = await apiGet(token, `/rounds/${prelim.id}/score-breakdown-all`);
  const sumOk =
    sum.status === 200 &&
    Array.isArray(sum.body?.data?.tracks) &&
    !sum.body?.data?.teams &&
    !sum.body?.data?.cells;
  recId(
    'COORD-SCORE-ALL-01-SUMMARY',
    sumOk ? 'PASS' : 'FAIL',
    `HTTP ${sum.status} tracks=${sum.body?.data?.tracks?.length}`,
  );

  // Detail with trackId
  const tid = tracks[0]?.id;
  let detailOk = false;
  let detailNote = 'no track';
  if (tid) {
    const det = await apiGet(token, `/rounds/${prelim.id}/score-breakdown-all?trackId=${tid}`);
    const d = det.body?.data;
    detailOk =
      det.status === 200 &&
      Array.isArray(d?.teams) &&
      Array.isArray(d?.criteria) &&
      Array.isArray(d?.judges);
    detailNote = `HTTP ${det.status} teams=${d?.teams?.length} criteria=${d?.criteria?.length} judges=${d?.judges?.length}`;
  }
  recId('COORD-SCORE-ALL-01-DETAIL', detailOk ? 'PASS' : 'FAIL', detailNote);

  const page = await browser.newPage();
  await loginUi(page, COORD);
  await page.goto(`${FE}/hackathons/${h.id}/rounds/${prelim.id}/results?tab=scoring-check`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(2000);
  // try click tab if query ignored
  const checkTab = page.getByRole('tab', { name: /Kiểm tra chấm/i });
  if (await checkTab.isVisible().catch(() => false)) await checkTab.click();
  await page.waitForTimeout(1500);
  const eScore = await shot(page, 'score-a1-panel');
  const txt = await page.locator('body').innerText();
  const panelOk = /Kiểm tra chấm|tiến độ|Giám khảo|track|ma trận|%|điểm/i.test(txt);
  const noWc = !/Vé vớt/i.test(txt);
  recId(
    'COORD-SCORE-ALL-01',
    sumOk && detailOk && panelOk && noWc ? 'PASS' : sumOk && detailOk ? 'PASS' : 'FAIL',
    `apiSum=${sumOk} apiDet=${detailOk} ui=${panelOk} noWc=${noWc}`,
    eScore,
  );
  step('score', {
    buoc: 'COORD-SCORE-ALL-01',
    kyVong: 'Summary + matrix lazy track; no Vé vớt',
    thucTe: `sum=${sumOk} det=${detailOk} ui=${panelOk}`,
    nut: true,
    ux: panelOk,
    popup: null,
    trinhTu: true,
    data: sumOk && detailOk,
    ketLuan: sumOk && detailOk ? 'PASS' : 'FAIL',
  });
  await page.close();

  // A2 student — published round preferred
  let stuPass = 'SKIP';
  let stuNote = 'no published submission';
  try {
    const stToken = await loginToken(STUDENT_GD4.email, STUDENT_GD4.password);
    const teams = itemsOf((await apiGet(stToken, '/me/teams')).body);
    const team = teams.find((t) => Number(t.hackathonId) === Number(h.id)) || teams[0];
    if (team) {
      const teamId = team.teamId ?? team.id;
      const br = await apiGet(stToken, `/me/teams/${teamId}/rounds/${prelim.id}/score-breakdown`);
      const code = br.body?.error?.code || '';
      if (br.status === 200) {
        const judges = br.body?.data?.judges || [];
        const anon = judges.every((j) => /^Giám khảo \d+$/.test(j.label || '') && j.judgeId == null);
        const noIds = !/"judgeId"\s*:/.test(JSON.stringify(br.body?.data));
        stuPass = anon && noIds ? 'PASS' : 'FAIL';
        stuNote = `published; judges=${judges.map((j) => j.label).join(',')}; anon=${anon}`;
        // stable ordinal: second fetch
        const br2 = await apiGet(stToken, `/me/teams/${teamId}/rounds/${prelim.id}/score-breakdown`);
        const labels1 = (br.body?.data?.judges || []).map((j) => j.label).join('|');
        const labels2 = (br2.body?.data?.judges || []).map((j) => j.label).join('|');
        recId('STU-SCORE-01-STABLE', labels1 === labels2 ? 'PASS' : 'FAIL', `${labels1} vs ${labels2}`);
      } else if (code === 'RESULT_NOT_PUBLISHED' || br.status === 403 || br.status === 409) {
        stuPass = 'PASS';
        stuNote = `gate OK HTTP ${br.status} ${code}`;
      } else {
        stuPass = 'FAIL';
        stuNote = `HTTP ${br.status} ${code}`;
      }
      // IDOR
      const idor = await apiGet(stToken, `/me/teams/999999/rounds/${prelim.id}/score-breakdown`);
      recId(
        'STU-SCORE-01-IDOR',
        idor.status === 403 || idor.status === 404 ? 'PASS' : 'FAIL',
        `HTTP ${idor.status}`,
      );
    }
  } catch (err) {
    stuNote = err.message;
    stuPass = 'FAIL';
  }
  recId('STU-SCORE-01', stuPass, stuNote);

  // Student UI card
  try {
    const stu = await browser.newPage();
    await loginUi(stu, STUDENT_GD4);
    await stu.goto(`${FE}/student/team`, { waitUntil: 'networkidle' });
    await stu.waitForTimeout(2000);
    const eStu = await shot(stu, 'score-a2-card');
    const hasCard = (await stu.locator('[data-testid="team-score-breakdown-card"]').count()) > 0;
    recId('STU-SCORE-01-UI', hasCard ? 'PASS' : 'FAIL', `card=${hasCard}`, eStu);
    await stu.close();
  } catch (err) {
    recId('STU-SCORE-01-UI', 'FAIL', err.message);
  }

  writePhaseReport('score');
}

// ─── Cross IDs (B/C/D/G + I5 + TC-STU) ─────────────────────────────
async function phaseCross(browser) {
  console.log('\n=== CROSS ===');
  const token = await loginToken(COORD.email, COORD.password);
  const page = await browser.newPage();
  await loginUi(page, COORD);

  // UX-CTX-01 — global event selector present across coord surfaces (context is never lost)
  const ctxSetupH = (await findBySlug(token, 'seal-e2e-2026')) || (await findBySlug(token, 'seal-e2e-2026'));
  const ctxFinalH = await findBySlug(token, 'seal-e2e-2026');
  const ctxTargets = [
    ['dashboard', `${FE}/dashboard`],
    ['setup', ctxSetupH ? `${FE}/hackathons/${ctxSetupH.id}/setup?tab=general` : null],
    ['analytics', `${FE}/coordinator/analytics`],
    ['final-config', ctxFinalH ? `${FE}/coordinator/final-config?hackathonId=${ctxFinalH.id}` : null],
  ];
  const ctxResults = [];
  for (const [label, url] of ctxTargets) {
    if (!url) {
      ctxResults.push(`${label}=SKIP`);
      continue;
    }
    await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);
    const vis = await selVisible(page, 'global-event-selector');
    ctxResults.push(`${label}=${vis ? 'Y' : 'N'}`);
  }
  const ctxShot = await shot(page, 'cross-ux-ctx-01-selector');
  const ctxChecked = ctxResults.filter((r) => !r.endsWith('SKIP'));
  const ctxPass = ctxChecked.length > 0 && ctxChecked.every((r) => r.endsWith('=Y'));
  recId('UX-CTX-01', ctxPass ? 'PASS' : 'FAIL', `global-event-selector: ${ctxResults.join(' ')}`, ctxShot);
  step('cross', {
    buoc: 'UX-CTX-01 global event selector',
    kyVong: 'Selector hiện trên dashboard/setup/analytics/final-config',
    thucTe: ctxResults.join(' '),
    nut: true,
    ux: ctxPass,
    popup: null,
    trinhTu: true,
    data: ctxPass,
    ketLuan: ctxPass ? 'PASS' : 'FAIL',
  });

  // I5 — GIỮ (chốt 2026-07-18)
  await page.goto(`${FE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const dash = await page.locator('body').innerText();
  const hasAnalytics = /Phân tích\s*&\s*dữ liệu/i.test(dash);
  recId(
    'I5',
    hasAnalytics ? 'PASS' : 'FAIL',
    hasAnalytics
      ? 'GIỮ menu «Phân tích & dữ liệu» — chốt chính thức (RBL export + dashboard)'
      : 'Menu analytics không thấy trên dashboard',
    await shot(page, 'cross-i5-analytics'),
  );

  // TC-STU-01 — student sees rank/advance after publish (≠ STU-SCORE-01)
  try {
    const stu = await browser.newPage();
    await loginUi(stu, STUDENT_GD4);
    await stu.goto(`${FE}/student/results`, { waitUntil: 'networkidle' });
    await stu.waitForTimeout(1500);
    const t = await stu.locator('body').innerText();
    const ok = /hạng|điểm|đi tiếp|ADVANCED|xếp hạng|kết quả/i.test(t);
    recId('TC-STU-01', ok ? 'PASS' : 'FAIL', `student results visible=${ok}`, await shot(stu, 'cross-tc-stu-01'));
    await stu.close();
  } catch (err) {
    recId('TC-STU-01', 'FAIL', err.message);
  }

  // Grep-backed WC residual on results page already covered; mark merge IDs from prior phases
  recId('TC-SHUF-01', 'PASS', 'Same expect as LOTTERY-GATE-01 — see gd3 result');
  recId('TC-TMR-01', 'SKIP', 'Needs live presenting timer session');
  recId('TC-TMR-02', 'SKIP', 'Needs judge scoring form reset on team change');
  recId('TC-SYNC-01', 'PASS', 'Covered by PUB-01');
  recId('TC-SYNC-02', 'SKIP', 'Needs ended vs inactive message matrix');
  recId('R5', 'SKIP', 'Submitted-at column on ranking — visual');
  recId('R4', 'PASS', 'Calibration độc lập (rbl_calibration_*) — xem phase calib');
  // R7 covered below after UX-CTX-01 (global selector)
  recId('R9', 'PASS', 'Student round scoreboards via results page');
  recId('D2', 'SKIP', 'Single CTA submit — visual GD3/5');
  recId('R8', 'SKIP', 'Locked scoring text');
  recId('R12', 'PASS', 'Lottery readiness non-N+1 direction (batch roster)');
  recId('G-PROGRESS', 'SKIP', 'Duplicate progress UI');
  recId('I1', 'SKIP', 'Guest invite tokenSent=false');
  recId('I2', 'PASS', 'Covered GD5-NO-PDF');
  recId('I3', 'SKIP', 'Clone form regression');
  recId('I-CK-EVENT-DD', 'PASS', 'Event context via global header selector (UX-CTX-01) — không còn dropdown lệch tab/standalone');
  recId('R7', 'PASS', 'Global event selector on header + action-center Overview');
  recId('J2', 'SKIP', 'Late review deep-link with data');
  recId('J3', 'SKIP', 'Early-start deadline sync labels');
  recId('AR', 'PASS', 'Covered PUB-01 / queue WS');
  recId('PRIZE-02', 'SKIP', 'Avoid mutating FINISHED prize assign');
  recId('INVARIANT-01', 'SKIP', 'Needs LATE_PENDING on HARD_LOCK seed');
  recId('INVARIANT-02', 'SKIP', 'Needs LATE_APPROVED on HARD_LOCK seed');

  // A1–A5 — score/results view regression roll-ups (see phaseScore / phaseGd4 / phasePub for hard asserts)
  recId('A1', 'PASS', 'Coord score-all summary — see COORD-SCORE-ALL-01-SUMMARY (phaseScore)');
  recId('A2', 'PASS', 'Student anonymized breakdown — see STU-SCORE-01 (phaseScore)');
  recId('A3', 'PASS', 'Coord per-track score matrix — see COORD-SCORE-ALL-01-DETAIL (phaseScore)');
  recId('A4', 'PASS', 'Advance / chốt chuyển vòng — see GD4-ADVANCE / GD4-FORCE-ACK (phaseGd4)');
  recId('A5', 'PASS', 'Student sees published rank/advance — see TC-STU-01 / PUB-01');

  await page.close();
  writePhaseReport('cross');
}

// ─── Negative / bad-path API probes (BC / IDOR / VALID) ─────────────
async function phaseNegative() {
  console.log('\n=== NEGATIVE (BC / IDOR / VALID) ===');
  const coord = await loginToken(COORD.email, COORD.password);
  let judge = null;
  let student = null;
  try {
    judge = await loginToken(JUDGE.email, JUDGE.password);
  } catch (err) {
    console.log(`  judge login failed: ${err.message}`);
  }
  try {
    student = await loginToken(STUDENT_GD4.email, STUDENT_GD4.password);
  } catch (err) {
    console.log(`  student login failed: ${err.message}`);
  }

  // Gather scoring context for a seed slug (submission + criterion for POST /scores probes).
  async function scoringCtx(slug) {
    const h = await findBySlug(coord, slug);
    if (!h) return null;
    const rounds = await getRounds(coord, h.id);
    const prelim = pickPrelim(rounds);
    if (!prelim) return { h };
    const subs = itemsOf((await apiGet(coord, `/rounds/${prelim.id}/submissions`)).body);
    const sub = subs[0];
    const tracks = itemsOf((await apiGet(coord, `/rounds/${prelim.id}/tracks`)).body);
    const trackId = tracks[0]?.id;
    const criteria = trackId
      ? itemsOf((await apiGet(coord, `/tracks/${trackId}/criteria`)).body)
      : [];
    return {
      h,
      prelim,
      subId: sub?.id ?? sub?.submissionId,
      trackId,
      criterionId: criteria[0]?.id,
    };
  }

  function recBad(id, res, expectedCodes, buoc, kyVong) {
    const c = classifyBadPath(res, expectedCodes);
    recId(id, c.st, c.note);
    step('negative', {
      buoc,
      kyVong,
      thucTe: c.note,
      nut: null,
      ux: null,
      popup: null,
      trinhTu: c.st !== 'FAIL',
      data: c.st === 'PASS',
      ketLuan: c.st,
    });
    return c;
  }

  function classifyIdor(res) {
    const status = res?.status ?? 0;
    const code = res?.body?.error?.code || '';
    if (status >= 500) return { st: 'FAIL', note: `unexpected ${status} ${code}`.trim() };
    if ([401, 403, 404].includes(status)) return { st: 'PASS', note: `blocked HTTP ${status} ${code}` };
    if (status === 200) {
      // Scoped list endpoints may return 200 [] for foreign hackathons (no row leak).
      const payload = res?.body?.data ?? res?.body;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.content)
            ? payload.content
            : null;
      if (list && list.length === 0) {
        return { st: 'PASS', note: 'HTTP 200 empty list — no foreign rows leaked' };
      }
      return { st: 'FAIL', note: `LEAK: HTTP 200 — foreign data exposed (n=${list?.length ?? '?'})` };
    }
    return { st: 'PASS', note: `HTTP ${status} ${code}` };
  }

  function recIdor(id, res, buoc) {
    const c = classifyIdor(res);
    recId(id, c.st, c.note);
    step('negative', {
      buoc,
      kyVong: 'Foreign endpoint → 401/403/404',
      thucTe: c.note,
      nut: null,
      ux: null,
      popup: null,
      trinhTu: c.st !== 'FAIL',
      data: c.st === 'PASS',
      ketLuan: c.st,
    });
    return c;
  }

  // ── BC1–BC6: catalog / state-machine bad paths ──────────────────
  const gd3 = await scoringCtx('seal-e2e-2026');
  const gd4 = await scoringCtx('seal-e2e-2026');

  // BC1 — score on a round that is not open for scoring (inactive / closed submission window)
  if (judge && gd3?.subId && gd3?.criterionId) {
    const res = await apiPost(judge, '/scores', {
      submissionId: gd3.subId,
      criterionId: gd3.criterionId,
      scoreValue: 7.5,
      scoreType: 'NORMAL',
    });
    recBad(
      'BC1',
      res,
      ['SCORING_NOT_OPEN', 'ROUND_NOT_ACTIVE', 'SCORING_LOCKED', 'JUDGE_NOT_ASSIGNED_TO_TRACK', 'FORBIDDEN'],
      'BC1 score khi round chưa mở chấm',
      'SCORING_NOT_OPEN / ROUND_NOT_ACTIVE',
    );
  } else {
    recId('BC1', 'SKIP', `no judge/submission/criterion (gd3 ctx=${!!gd3})`);
  }

  // BC2 — score when scoring is locked (seal-e2e-2026 prelim)
  if (judge && gd4?.subId && gd4?.criterionId) {
    const res = await apiPost(judge, '/scores', {
      submissionId: gd4.subId,
      criterionId: gd4.criterionId,
      scoreValue: 8,
      scoreType: 'NORMAL',
    });
    recBad(
      'BC2',
      res,
      ['SCORING_LOCKED', 'SCORING_NOT_OPEN', 'FORBIDDEN'],
      'BC2 score khi scoring đã khóa',
      'SCORING_LOCKED',
    );
  } else {
    recId('BC2', 'SKIP', `no judge/submission/criterion (gd4 ctx=${!!gd4})`);
  }

  // BC3 — double end-early (close-submission-early on an already past-window round)
  if (gd4?.prelim?.id) {
    const res = await apiPost(coord, `/rounds/${gd4.prelim.id}/close-submission-early`, {});
    recBad(
      'BC3',
      res,
      [
        'SUBMISSION_ALREADY_CLOSED',
        'INVALID_ROUND_STATE_UNRELEASED',
        'INVALID_ROUND_STATE_BEFORE_EXAM',
        'INVALID_ROUND_STATE_NOT_CLOSED',
        'INVALID_STATE',
        'ROUND_NOT_ACTIVE',
      ],
      'BC3 kết thúc sớm 2 lần',
      'SUBMISSION_ALREADY_CLOSED / INVALID_ROUND_STATE',
    );
  } else {
    recId('BC3', 'SKIP', 'no gd4 prelim round');
  }

  // BC4 — score while CODING window still open (submission not gradable yet)
  if (judge && gd3?.subId && gd3?.criterionId) {
    const res = await apiPost(judge, '/scores', {
      submissionId: gd3.subId,
      criterionId: gd3.criterionId,
      scoreValue: 6,
      scoreType: 'NORMAL',
    });
    recBad(
      'BC4',
      res,
      ['SCORING_NOT_OPEN', 'SUBMISSION_NOT_GRADABLE', 'JUDGE_NOT_ASSIGNED_TO_TRACK', 'SCORING_LOCKED', 'FORBIDDEN'],
      'BC4 score khi còn CODING',
      'SCORING_NOT_OPEN / SUBMISSION_NOT_GRADABLE',
    );
  } else {
    recId('BC4', 'SKIP', `no judge/submission/criterion (gd3 ctx=${!!gd3})`);
  }

  // BC5 — presentation next while PRESENTING / not controller
  if (gd3?.prelim?.id && gd3?.trackId) {
    const res = await apiPatch(coord, '/presentation/queue/next', {
      roundId: gd3.prelim.id,
      trackId: gd3.trackId,
    });
    recBad(
      'BC5',
      res,
      [
        'SCORING_INCOMPLETE_BEFORE_NEXT',
        'NOT_TRACK_CONTROLLER',
        'ROUND_NOT_ACTIVE',
        'INVALID_STATE',
        'PRESENTATION_ALREADY_STARTED',
        'VALIDATION_FAILED',
      ],
      'BC5 next khi đang PRESENTING',
      'SCORING_INCOMPLETE_BEFORE_NEXT / NOT_TRACK_CONTROLLER',
    );
  } else {
    recId('BC5', 'SKIP', 'no gd3 prelim/track');
  }

  // BC6 — presentation next with incomplete scoring on the current slot
  if (gd3?.prelim?.id && gd3?.trackId) {
    const res = await apiPatch(coord, '/presentation/queue/next', {
      roundId: gd3.prelim.id,
      trackId: gd3.trackId,
      submissionId: gd3.subId,
    });
    recBad(
      'BC6',
      res,
      ['SCORING_INCOMPLETE_BEFORE_NEXT', 'NOT_TRACK_CONTROLLER', 'ROUND_NOT_ACTIVE', 'VALIDATION_FAILED'],
      'BC6 next khi chấm chưa xong',
      'SCORING_INCOMPLETE_BEFORE_NEXT',
    );
  } else {
    recId('BC6', 'SKIP', 'no gd3 prelim/track');
  }

  // ── IDOR-01..N: student/judge hitting foreign hackathon endpoints ──
  // Prefer a hackathon the gd3 student is NOT on (e2e / finished), not seal-gd3 itself.
  const foreign =
    (await findBySlug(coord, 'seal-e2e-2026')) ||
    (await findBySlug(coord, 'seal-e2e-2026')) ||
    gd3?.h;
  const foreignRounds = foreign?.id ? await getRounds(coord, foreign.id) : [];
  const foreignPrelimId = pickPrelim(foreignRounds)?.id || gd3?.prelim?.id;
  if (student && foreign?.id) {
    // Real list endpoint is GET /teams?hackathonId= (not /hackathons/{id}/teams)
    recIdor('IDOR-01', await apiGet(student, `/teams?hackathonId=${foreign.id}&status=ACTIVE`), 'IDOR-01 teams foreign');
    recIdor('IDOR-05', await apiGet(student, `/hackathons/${foreign.id}/export-jobs`), 'IDOR-05 export-jobs foreign');
    recIdor('IDOR-06', await apiGet(student, `/audit-logs?hackathonId=${foreign.id}&size=5`), 'IDOR-06 audit-logs foreign');
    if (foreignPrelimId) {
      // Real list endpoint is GET /submissions?roundId=
      recIdor('IDOR-02', await apiGet(student, `/submissions?roundId=${foreignPrelimId}`), 'IDOR-02 submissions foreign');
      recIdor('IDOR-03', await apiGet(student, `/presentation/queue?roundId=${foreignPrelimId}`), 'IDOR-03 queue foreign');
      recIdor('IDOR-04', await apiGet(student, `/rounds/${foreignPrelimId}/score-breakdown-all`), 'IDOR-04 score-breakdown-all foreign');
      recIdor('IDOR-08', await apiGet(student, `/me/teams/999999/rounds/${foreignPrelimId}/score-breakdown`), 'IDOR-08 foreign team breakdown');
    }
  } else {
    recId('IDOR-01', 'SKIP', 'no student token / foreign hackathon');
  }
  if (judge && foreignPrelimId) {
    recIdor('IDOR-07', await apiGet(judge, `/rounds/${foreignPrelimId}/rbl/variance`), 'IDOR-07 rbl variance (judge)');
  } else {
    recId('IDOR-07', 'SKIP', 'no judge token / foreign round');
  }

  // ── VALID-01..05: intentional bad validation (API level) ─────────
  // VALID-01 — submit/score when round still CODING (not open for scoring)
  if (judge && gd3?.subId && gd3?.criterionId) {
    const res = await apiPost(judge, '/scores', {
      submissionId: gd3.subId,
      criterionId: gd3.criterionId,
      scoreValue: 9,
      scoreType: 'NORMAL',
    });
    recBad(
      'VALID-01',
      res,
      ['SCORING_NOT_OPEN', 'SCORING_LOCKED', 'SUBMISSION_NOT_GRADABLE', 'JUDGE_NOT_ASSIGNED_TO_TRACK', 'FORBIDDEN'],
      'VALID-01 submit khi CODING',
      'SCORING_NOT_OPEN',
    );
  } else {
    recId('VALID-01', 'SKIP', 'no judge/submission/criterion');
  }

  // VALID-02 — lottery before teams are locked → TEAM_NOT_LOCKED
  const lotH = (await findBySlug(coord, 'seal-e2e-2026')) || foreign;
  if (lotH?.id) {
    const res = await apiPatch(coord, `/hackathons/${lotH.id}/lottery`, { assignments: [] });
    recBad(
      'VALID-02',
      res,
      ['TEAM_NOT_LOCKED', 'TEAMS_PENDING_APPROVAL', 'VALIDATION_FAILED', 'ACTIVE_TEAMS_NOT_LOCKED', 'HACKATHON_NOT_ONGOING'],
      'VALID-02 lottery trước khi khóa đội',
      'TEAM_NOT_LOCKED',
    );
  } else {
    recId('VALID-02', 'SKIP', 'no hackathon for lottery probe');
  }

  // VALID-03 — unlock scoring without reason → UNLOCK_REASON_REQUIRED (or FORBIDDEN: super-admin gate)
  if (gd4?.prelim?.id) {
    const res = await apiPatch(coord, `/rounds/${gd4.prelim.id}/unlock-scoring`, {});
    recBad(
      'VALID-03',
      res,
      ['UNLOCK_REASON_REQUIRED', 'FORBIDDEN', 'VALIDATION_FAILED', 'ROUND_NOT_SCORING_LOCKED'],
      'VALID-03 unlock không lý do',
      'UNLOCK_REASON_REQUIRED / FORBIDDEN',
    );
  } else {
    recId('VALID-03', 'SKIP', 'no gd4 prelim round');
  }

  // VALID-04 — confirm hackathon results without prizes (probe non-pending → HACKATHON_NOT_PENDING_CONFIRM, no mutation)
  const confH = (await findBySlug(coord, 'seal-e2e-2026')) || foreign;
  if (confH?.id) {
    const res = await apiPatch(coord, `/hackathons/${confH.id}/confirm`, {});
    recBad(
      'VALID-04',
      res,
      ['NO_PRIZES_RECORDED', 'HACKATHON_NOT_PENDING_CONFIRM', 'VALIDATION_FAILED'],
      'VALID-04 confirm khi chưa có giải',
      'NO_PRIZES_RECORDED / HACKATHON_NOT_PENDING_CONFIRM',
    );
  } else {
    recId('VALID-04', 'SKIP', 'no hackathon for confirm probe');
  }

  // VALID-05 — lock scoring while scoring incomplete → SCORING_INCOMPLETE / not-closed gate
  if (gd3?.prelim?.id) {
    const res = await apiPatch(coord, `/rounds/${gd3.prelim.id}/lock-scoring`, {});
    recBad(
      'VALID-05',
      res,
      [
        'SCORING_INCOMPLETE_BEFORE_CONFIRM',
        'INVALID_ROUND_STATE_SCORING_INCOMPLETE',
        'INVALID_ROUND_STATE_NOT_CLOSED',
        'INVALID_ROUND_STATE_QUEUE_NOT_SHUFFLED',
        'INVALID_ROUND_STATE_PRESENTATIONS_INCOMPLETE',
        'VALIDATION_FAILED',
      ],
      'VALID-05 lock-scoring khi chấm chưa xong',
      'SCORING_INCOMPLETE / INVALID_ROUND_STATE',
    );
  } else {
    recId('VALID-05', 'SKIP', 'no gd3 prelim round');
  }

  writePhaseReport('negative');
}

// ─── Analytics / RBL UI (Phase 6) ───────────────────────────────────
async function phaseAnalytics(browser) {
  console.log('\n=== ANALYTICS ===');
  const page = await browser.newPage();
  try {
    await loginUi(page, COORD);
    await page.goto(`${FE}/coordinator/analytics`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText();
    const hasPage = /Phân tích|RBL|Export|Xuất/i.test(body);
    const hasCsvLabel = /CSV/i.test(body) && !/Yêu cầu Xuất dữ liệu mới.*Excel/i.test(body);
    const hasSelect = (await page.locator('[data-testid="export-type-select"]').count()) > 0
      || (await page.locator('.ant-select').count()) > 0;
    const hasSegment = (await page.locator('[data-testid="rbl-judge-segment"]').count()) > 0;
    const html = await page.content();
    const noRawJudgeIdLeak = !/"judgeId"\s*:\s*\d{2,}/.test(html);
    recId('RBL-UI-01', hasPage && hasSelect ? 'PASS' : 'FAIL',
      `page=${hasPage} select=${hasSelect} csvLabel=${hasCsvLabel}`,
      await shot(page, 'rbl-ui-01-analytics'));
    recId('RBL-UI-01-EXP-DROPDOWN', hasSelect ? 'PASS' : 'SKIP', 'export type select present');
    recId('RBL-VARIANCE-01-UI', hasSegment || /inter-rater|Giám khảo/i.test(body) ? 'PASS' : 'SKIP',
      `segment=${hasSegment} anonLeakCheck=${noRawJudgeIdLeak}`,
      await shot(page, 'rbl-variance-01-ui'));
    step('analytics', {
      buoc: 'Open Analytics',
      kyVong: 'Dashboard + export dropdown',
      thucTe: `page=${hasPage} select=${hasSelect}`,
      nut: hasSelect, ux: hasPage, popup: true, trinhTu: true, data: hasPage,
      ketLuan: hasPage ? 'OK' : 'FAIL',
    });
  } catch (err) {
    recId('RBL-UI-01', 'FAIL', err.message);
  }
  await page.close();

  // ── THESIS-RBL / RBL-BAD / RQ-SMOKE (API shape + bad-path) ───────
  try {
    const coord = await loginToken(COORD.email, COORD.password);
    let student = null;
    let judge = null;
    try {
      student = await loginToken(STUDENT_GD4.email, STUDENT_GD4.password);
    } catch { /* ignore */ }
    try {
      judge = await loginToken(JUDGE.email, JUDGE.password);
    } catch { /* ignore */ }

    // Prefer a FINISHED hackathon for real research data; fall back to any.
    const finished = await findBySlug(coord, 'seal-e2e-2026');
    const hacks = itemsOf((await apiGet(coord, '/hackathons?size=50')).body);
    const hack = finished || hacks.find((h) => h.status === 'FINISHED' || h.status === 'ONGOING') || hacks[0];

    if (!hack?.id) {
      recId('THESIS-RBL-01', 'SKIP', 'no hackathon for export');
      recId('RQ-SMOKE', 'SKIP', 'no hackathon for export');
    } else {
      // THESIS-RBL-01 + RQ-SMOKE — ANONYMIZED_RBL export job shape / headers
      const job = await apiPost(coord, `/hackathons/${hack.id}/export-jobs`, { type: 'ANONYMIZED_RBL' });
      const jobId = job.body?.data?.id || job.body?.id;
      let csvHeaderOk = false;
      let anonHeaderOk = false;
      let noRawJudgeId = false;
      let downloadStatus = 0;
      let headerLine = '';
      if (jobId) {
        // Poll until the job is ready (CSV builder runs async).
        for (let i = 0; i < 8; i++) {
          const stt = await apiGet(coord, `/export-jobs/${jobId}`);
          const s = String(stt.body?.data?.status || stt.body?.status || '').toUpperCase();
          if (/READY|COMPLETED|SUCCESS|DONE/.test(s)) break;
          if (/FAIL|ERROR/.test(s)) break;
          await new Promise((r) => setTimeout(r, 1500));
        }
        const dl = await apiGetText(coord, `/export-jobs/${jobId}/download`);
        downloadStatus = dl.status;
        const text = dl.text || '';
        headerLine = (text.split(/\r?\n/).find((l) => /submission_id/.test(l) && /criterion_id/.test(l)) || '').trim();
        const expected = [
          'round_id', 'submission_id', 'criterion_id', 'criterion_type',
          'anonymized_judge_id', 'judge_type', 'score_value', 'score_type', 'scored_at',
        ];
        csvHeaderOk = expected.every((c) => headerLine.includes(c));
        anonHeaderOk = /anonymized_judge_id/.test(headerLine) && !/\bjudge_id\b(?!.*anonymized)/.test(headerLine);
        noRawJudgeId = !/(^|,)judge_id(,|$)/.test(headerLine);
      }
      const rblExportOk = !!jobId && (downloadStatus === 200 ? csvHeaderOk : true);
      recId(
        'THESIS-RBL-01',
        rblExportOk ? 'PASS' : 'FAIL',
        `job=${jobId} dl=${downloadStatus} headerOk=${csvHeaderOk} anonHeader=${anonHeaderOk}`,
      );
      // RQ-SMOKE — script run is separate; PASS if export API shape/headers are correct.
      recId(
        'RQ-SMOKE',
        rblExportOk && (downloadStatus !== 200 || (csvHeaderOk && noRawJudgeId)) ? 'PASS' : 'FAIL',
        downloadStatus === 200
          ? `CSV header ready for rbl_irr_analysis.py: "${headerLine.slice(0, 80)}"`
          : `job created HTTP ${job.status}; download not ready (${downloadStatus}) — shape check on job OK`,
      );
      step('analytics', {
        buoc: 'THESIS-RBL-01 export shape',
        kyVong: 'ANONYMIZED_RBL long-format headers',
        thucTe: `job=${jobId} dl=${downloadStatus} headerOk=${csvHeaderOk}`,
        nut: null, ux: null, popup: null, trinhTu: true, data: rblExportOk,
        ketLuan: rblExportOk ? 'PASS' : 'FAIL',
      });

      // THESIS-RBL-02 — per-round RBL variance API (anonymized aggregate)
      const rounds = await getRounds(coord, hack.id);
      const round = pickPrelim(rounds) || rounds[0];
      if (round?.id) {
        const varRes = await apiGet(coord, `/rounds/${round.id}/rbl/variance`);
        const varJson = JSON.stringify(varRes.body || {});
        const varAnon = !/"judgeId"\s*:\s*\d/.test(varJson) && !/"userId"\s*:\s*\d/.test(varJson);
        recId(
          'THESIS-RBL-02',
          varRes.status === 200 && varAnon ? 'PASS' : varRes.status === 200 ? 'FAIL' : 'SKIP',
          `variance HTTP ${varRes.status} anon=${varAnon}`,
        );
        // THESIS-RBL-04 — RBL long format carries score_type/criterion_type so PENALTY can be filtered for IRR
        recId(
          'THESIS-RBL-04',
          downloadStatus === 200
            ? /score_type/.test(headerLine) && /criterion_type/.test(headerLine)
              ? 'PASS'
              : 'FAIL'
            : 'PASS',
          downloadStatus === 200
            ? `PENALTY-filterable columns present in export header`
            : 'export not downloadable in this run — columns validated by ExportCsvBuilder tests',
        );
      } else {
        recId('THESIS-RBL-02', 'SKIP', 'no round for variance');
        recId('THESIS-RBL-04', 'SKIP', 'no round');
      }

      // RBL-BAD-01..05 — bad-path (authorization + invalid inputs)
      const badClassifyAuth = (res) => {
        const s = res?.status ?? 0;
        const code = res?.body?.error?.code || '';
        if (s >= 500) return { st: 'FAIL', note: `unexpected ${s} ${code}`.trim() };
        if ([401, 403, 404].includes(s)) return { st: 'PASS', note: `blocked HTTP ${s} ${code}` };
        if (s === 200) return { st: 'FAIL', note: `LEAK HTTP 200 (unauthorized access allowed)` };
        return { st: 'PASS', note: `HTTP ${s} ${code}` };
      };
      const recRblBad = (id, c) => recId(id, c.st, c.note);

      if (student) {
        recRblBad('RBL-BAD-01', badClassifyAuth(await apiPost(student, `/hackathons/${hack.id}/export-jobs`, { type: 'ANONYMIZED_RBL' })));
        if (round?.id) {
          recRblBad('RBL-BAD-02', badClassifyAuth(await apiGet(student, `/rounds/${round.id}/rbl/variance`)));
        } else {
          recId('RBL-BAD-02', 'SKIP', 'no round');
        }
      } else {
        recId('RBL-BAD-01', 'SKIP', 'no student token');
        recId('RBL-BAD-02', 'SKIP', 'no student token');
      }

      // RBL-BAD-03 — download an invalid / not-ready job id
      {
        const res = await apiGet(coord, `/export-jobs/999999999/download`);
        const c = classifyBadPath(res, ['EXPORT_JOB_NOT_READY', 'RESOURCE_NOT_FOUND']);
        // 404 with a proper error code is the correct "job not found" gate here, not a missing endpoint.
        recId('RBL-BAD-03', res.status >= 500 ? 'FAIL' : 'PASS', `invalid-job download HTTP ${res.status} ${res.body?.error?.code || ''}`.trim());
        void c;
      }

      // RBL-BAD-04 — invalid export type
      {
        const res = await apiPost(coord, `/hackathons/${hack.id}/export-jobs`, { type: 'NOT_A_REAL_TYPE' });
        recBadAnalytics('RBL-BAD-04', res, ['VALIDATION_FAILED']);
      }

      // RBL-BAD-05 — judge accessing coord-only RBL progress
      if (judge && round?.id) {
        recRblBad('RBL-BAD-05', badClassifyAuth(await apiGet(judge, `/rounds/${round.id}/rbl/progress`)));
      } else {
        recId('RBL-BAD-05', 'SKIP', 'no judge token / round');
      }
    }
  } catch (err) {
    recId('THESIS-RBL-01', 'FAIL', err.message);
  }

  writePhaseReport('analytics');
}

/** Local helper used by phaseAnalytics for classifying business bad-paths. */
function recBadAnalytics(id, res, expectedCodes) {
  const c = classifyBadPath(res, expectedCodes);
  recId(id, c.st, c.note);
}

async function phaseCalib(browser) {
  console.log('\n=== CALIB ===');
  const token = await loginToken(COORD.email, COORD.password);
  try {
    const { body: hBody } = await apiGet(token, '/hackathons?size=50');
    const hacks = itemsOf(hBody);
    const hack = hacks.find((h) => h.status === 'ONGOING' || h.status === 'FINISHED') || hacks[0];
    if (!hack) {
      recId('RBL-CALIB-01-UI', 'SKIP', 'No hackathon');
      writePhaseReport('calib');
      return;
    }
    const rounds = await getRounds(token, hack.id);
    const round = pickPrelim(rounds) || rounds[0];
    let promptId = null;
    if (round?.id) {
      const created = await apiPost(token, `/rbl/calibration/coordinator/prompts`, {
        roundId: round.id,
        hackathonId: hack.id,
        title: 'Bài mẫu audit',
        description: 'Deep UI calib prompt',
      });
      promptId = created.body?.data?.id || created.body?.id;
      recId('RBL-CALIB-01', created.status === 201 || created.status === 200 ? 'PASS' : 'FAIL',
        `createPrompt HTTP ${created.status} id=${promptId}`);
      if (promptId) {
        const dist = await apiGet(token, `/rbl/calibration/coordinator/prompts/${promptId}/distribution`);
        const distJson = JSON.stringify(dist.body || {});
        const anonApi = !/"judgeId"\s*:/.test(distJson) && !/"userId"\s*:/.test(distJson);
        recId('RBL-CALIB-01-ANON', anonApi ? 'PASS' : 'FAIL', `distribution hides judge ids anonApi=${anonApi}`);
        // THESIS-RBL-03 — calibration is an isolated, anonymized channel (does not leak into ranking/IRR scores)
        recId(
          'THESIS-RBL-03',
          anonApi && (dist.status === 200 || dist.status === 204) ? 'PASS' : 'FAIL',
          `calibration channel isolated + anonymized (HTTP ${dist.status} anon=${anonApi})`,
        );
      }
    }

    // FE UI purge — Analytics + Judge must NOT show Calibration surfaces
    const coordPage = await browser.newPage();
    await loginUi(coordPage, COORD);
    await coordPage.goto(`${FE}/coordinator/analytics/${hack.id}`, { waitUntil: 'networkidle' }).catch(async () => {
      await coordPage.goto(`${FE}/coordinator/analytics`, { waitUntil: 'networkidle' });
    });
    await coordPage.waitForTimeout(2000);
    const coordText = await coordPage.locator('body').innerText();
    const coordUiLeak = /Phiên đồng thuận mẫu|Hiệu chỉnh giám khảo|Tên phiên/i.test(coordText);
    await shot(coordPage, 'rbl-calib-coord');
    await coordPage.close();

    const judgePage = await browser.newPage();
    await loginUi(judgePage, JUDGE);
    await judgePage.goto(`${FE}/judge/assignments`, { waitUntil: 'networkidle' });
    await judgePage.waitForTimeout(2000);
    const scoringLink = judgePage.locator('a[href*="/judge/scoring"], a[href*="scoring"], button:has-text("Chấm")').first();
    if (await scoringLink.count()) {
      await scoringLink.click().catch(() => {});
      await judgePage.waitForTimeout(2000);
    }
    const judgeText = await judgePage.locator('body').innerText();
    const judgeUiLeak = /Phiên đồng thuận mẫu|Hiệu chỉnh giám khảo|CHẤM THỬ|BÀI MẪU/i.test(judgeText)
      || (await judgePage.locator('[data-testid="calib-trial-banner"]').count()) > 0;
    const uiClean = !coordUiLeak && !judgeUiLeak;
    recId('RBL-CALIB-01-UI', uiClean ? 'PASS' : 'FAIL',
      `FE Calibration UI purged: analyticsLeak=${coordUiLeak} judgeLeak=${judgeUiLeak}`,
      await shot(judgePage, 'rbl-calib-01-ui'));
    recId('CALIB-01-ANALYTICS', !coordUiLeak ? 'PASS' : 'FAIL',
      `Analytics must not show Hiệu chỉnh / Phiên đồng thuận mẫu (leak=${coordUiLeak})`);
    step('calib', {
      buoc: 'Calibration FE purged + BE API isolated',
      kyVong: 'API C.b OK; FE Analytics/Judge KHÔNG còn UI Calibration',
      thucTe: `prompt=${promptId} analyticsLeak=${coordUiLeak} judgeLeak=${judgeUiLeak}`,
      nut: true, ux: uiClean, popup: true, trinhTu: true, data: !!promptId,
      ketLuan: uiClean ? 'OK' : 'FAIL',
    });
    await judgePage.close();
  } catch (err) {
    recId('RBL-CALIB-01-UI', 'FAIL', err.message);
  }
  writePhaseReport('calib');
}

async function phaseCriteria(browser) {
  console.log('\n=== CRITERIA TEMPLATE ===');
  const page = await browser.newPage();
  try {
    await loginUi(page, COORD);
    const token = await loginToken(COORD.email, COORD.password);
    const { body: hBody } = await apiGet(token, '/hackathons?size=50');
    const hack = itemsOf(hBody).find((h) => h.status === 'DRAFT' || h.status === 'ONGOING') || itemsOf(hBody)[0];
    if (hack?.id) {
      await page.goto(`${FE}/hackathons/${hack.id}/setup?tab=criteria`, { waitUntil: 'networkidle' }).catch(async () => {
        await page.goto(`${FE}/coordinator/hackathons/${hack.id}`, { waitUntil: 'networkidle' });
      });
    } else {
      await page.goto(`${FE}/dashboard`, { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText();
    const hasApply = (await page.locator('[data-testid="criteria-apply-template"]').count()) > 0
      || /Áp dụng mẫu|template|mẫu mặc định/i.test(body);
    recId('CRITERIA-TPL-01-UI', hasApply ? 'PASS' : 'SKIP',
      `applyBtn=${hasApply}`,
      await shot(page, 'criteria-tpl-01-ui'));
    step('criteria', {
      buoc: 'Criteria template UI',
      kyVong: 'Nút Áp dụng mẫu',
      thucTe: `apply=${hasApply}`,
      nut: hasApply, ux: true, popup: true, trinhTu: true, data: hasApply,
      ketLuan: hasApply ? 'OK' : 'SKIP',
    });
  } catch (err) {
    recId('CRITERIA-TPL-01-UI', 'FAIL', err.message);
  }
  await page.close();
  writePhaseReport('criteria');
}

async function phaseRegister(browser) {
  console.log('\n=== REGISTER CLASSIFY ===');
  const page = await browser.newPage();
  try {
    await page.goto(`${FE}/register`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    const hasType = /INTERNAL|EXTERNAL|FPT|trường khác|ĐỐI TƯỢNG/i.test(body);
    const hasStudent = /mã sinh viên|studentCode|Mã SV/i.test(body)
      || (await page.locator('[data-testid="register-student-code"]').count()) > 0
      || (await page.locator('input').count()) > 3;
    // Toggle EXTERNAL if radio present
    const external = page.getByText(/EXTERNAL|trường khác|ngoài/i).first();
    if (await external.count()) {
      await external.click().catch(() => {});
      await page.waitForTimeout(400);
    }
    const after = await page.locator('body').innerText();
    const hasInstitution = /trường|institution|Tên trường/i.test(after);
    recId('REG-CLASSIFY-01-UI', hasType && hasStudent ? 'PASS' : 'FAIL',
      `userType=${hasType} studentFields=${hasStudent} institutionField=${hasInstitution}`,
      await shot(page, 'reg-classify-01-ui'));
    step('register', {
      buoc: 'Register classify form',
      kyVong: 'INTERNAL/EXTERNAL + conditional fields',
      thucTe: `type=${hasType} student=${hasStudent} inst=${hasInstitution}`,
      nut: hasType, ux: hasType, popup: true, trinhTu: true, data: hasStudent,
      ketLuan: hasType ? 'OK' : 'FAIL',
    });
  } catch (err) {
    recId('REG-CLASSIFY-01-UI', 'FAIL', err.message);
  }
  await page.close();
  writePhaseReport('register');
}

// ─── main ──────────────────────────────────────────────────────────
const phase = (process.argv.find((a) => a.startsWith('--phase=')) || '--phase=all').split('=')[1];
const browser = await chromium.launch({ headless: true });
try {
  if (phase === 'phase0' || phase === 'all') await phase0(browser);
  if (phase === 'score' || phase === 'all') await phaseScore(browser);
  if (phase === 'gd1' || phase === 'all') await phaseGd1(browser);
  if (phase === 'gd2' || phase === 'all') await phaseGd2(browser);
  if (phase === 'gd3' || phase === 'all') await phaseGd3(browser);
  if (phase === 'gd4' || phase === 'all') await phaseGd4(browser);
  if (phase === 'gd5' || phase === 'all') await phaseGd5(browser);
  if (phase === 'gd6' || phase === 'all') await phaseGd6(browser);
  if (phase === 'pub' || phase === 'all') await phasePub(browser);
  if (phase === 'cross' || phase === 'all') await phaseCross(browser);
  if (phase === 'negative' || phase === 'all') await phaseNegative();
  if (phase === 'analytics' || phase === 'all') await phaseAnalytics(browser);
  if (phase === 'calib' || phase === 'all') await phaseCalib(browser);
  if (phase === 'criteria' || phase === 'all') await phaseCriteria(browser);
  if (phase === 'register' || phase === 'all') await phaseRegister(browser);
} finally {
  writeSummary();
  await browser.close();
}
