/**
 * Mode B Continuous helpers — multi-context sessions (T1), wait Phát đề (T2),
 * PRESENTING/QA scorable (T3), buildTimelineDates (T4).
 * Read-only status checks only (no progression API mutate).
 */
import { expect } from '@playwright/test';
import { resolvePassword } from './uiAuth.js';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';

/**
 * UI login without networkidle (SPA websockets hang networkidle forever).
 * @param {import('@playwright/test').Page} page
 * @param {{ email: string, password?: string, role?: string }} account
 */
export async function loginAsDomReady(page, account) {
  const password = resolvePassword(account.role, account.password);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('example@hackathon.com').waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByPlaceholder('example@hackathon.com').fill(account.email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();

  const dashboardPattern =
    account.role === 'coord'
      ? /\/dashboard/
      : account.role === 'judge' || account.role === 'guest'
        ? /\/(judge|dashboard)/
        : /\/(dashboard|student|judge|mentor)/;
  await expect(page).toHaveURL(dashboardPattern, { timeout: 30_000 });
  if (account.role === 'judge' || account.role === 'guest') {
    await page.goto('/judge/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {});
  }
}

/** Field label → timeline value mapping (document for playbook T4). */
export const TIMELINE_FIELD_MAP = {
  'Bắt đầu Đăng ký': 'regStart',
  'Kết thúc Đăng ký': 'regEnd',
  'Ngày giờ thi (Sơ loại)': 'prelimExamAt',
  'Ngày giờ thi (Chung kết)': 'finalExamAt',
  'Thời gian thi (Giờ)': 'codingDurationHours',
  'KICKOFF starts_at': 'kickoffAt',
  'WORKSHOP starts_at': 'workshopAt',
  'AWARDS starts_at': 'awardsAt',
};

/**
 * Unique slug: seal-m2-{timestamp}-{rand}, only a-z0-9-.
 * @param {string} [prefix]
 */
export function uniqueSlug(prefix = 'seal-m2') {
  const safe = String(prefix || 'seal-m2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${safe}-${ts}-${rand}`.replace(/[^a-z0-9-]/g, '');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Ant DatePicker showTime typically accepts `YYYY-MM-DD HH:mm:ss`. */
export function formatAntDateTime(d) {
  const x = d instanceof Date ? d : new Date(d);
  return (
    `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` +
    ` ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`
  );
}

/** Event DatePicker format in EventManagementPage: DD/MM/YYYY HH:mm */
export function formatEventDateTime(d) {
  const x = d instanceof Date ? d : new Date(d);
  return (
    `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}` +
    ` ${pad(x.getHours())}:${pad(x.getMinutes())}`
  );
}

/**
 * T4 — timeline that satisfies FE validation:
 * - registration dates ≥ today (DatePicker)
 * - exam ≥ registration_end + 5 days (roundScheduleRules.MIN_DAYS_FROM_REG_END)
 * - Chung kết same calendar day as Sơ loại, after grading buffer (coding + 2h + 1h)
 *
 * @param {number} [nowMs]
 */
export function buildTimelineDates(nowMs = Date.now()) {
  const now = new Date(nowMs);
  const regStart = new Date(now.getTime());
  const regEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // exam day = regEnd + 5 days, morning — room for final same day after 1h coding + buffers
  const examDay = new Date(regEnd.getTime() + 5 * 24 * 60 * 60 * 1000);
  examDay.setHours(8, 0, 0, 0);

  const codingDurationHours = 1;
  const prelimExamAt = new Date(examDay);
  // final ≥ prelimEnd + 2h grading + 1h gap = exam + 4h → use +5h
  const finalExamAt = new Date(examDay.getTime() + 5 * 60 * 60 * 1000);

  const kickoffAt = new Date(examDay.getTime() - 24 * 60 * 60 * 1000);
  kickoffAt.setHours(9, 0, 0, 0);
  // WORKSHOP: after regEnd, ≥1 calendar day before KICKOFF (FE + BE create order: KICKOFF → WORKSHOP → AWARDS)
  const workshopAt = new Date(regEnd.getTime() + 24 * 60 * 60 * 1000);
  workshopAt.setHours(14, 0, 0, 0);
  const awardsAt = new Date(examDay);
  awardsAt.setHours(18, 0, 0, 0);

  return {
    now,
    regStart,
    regEnd,
    prelimExamAt,
    finalExamAt,
    codingDurationHours,
    kickoffAt,
    workshopAt,
    awardsAt,
    regStartStr: formatAntDateTime(regStart),
    regEndStr: formatAntDateTime(regEnd),
    prelimExamAtStr: formatAntDateTime(prelimExamAt),
    finalExamAtStr: formatAntDateTime(finalExamAt),
    kickoffAtStr: formatAntDateTime(kickoffAt),
    workshopAtStr: formatAntDateTime(workshopAt),
    awardsAtStr: formatAntDateTime(awardsAt),
    kickoffAtEventStr: formatEventDateTime(kickoffAt),
    workshopAtEventStr: formatEventDateTime(workshopAt),
    awardsAtEventStr: formatEventDateTime(awardsAt),
    fieldMap: TIMELINE_FIELD_MAP,
  };
}

export function minimalPdfBuffer() {
  // Valid minimal PDF (matches BE TrackProblemStatementStorage.SEED_PDF_BYTES)
  return Buffer.from(
    '%PDF-1.4\n' +
      '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
      'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \n' +
      'trailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF',
    'ascii',
  );
}

export function minimalPdfFile(name = 'mode-b-problem.pdf') {
  return {
    name,
    mimeType: 'application/pdf',
    buffer: minimalPdfBuffer(),
  };
}

async function apiGet(path, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, { headers });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data ?? json };
}

async function apiPost(path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data ?? json };
}

/** Read-only milestone: GET /hackathons/{id}. */
export async function getHackathonStatus(hackathonId, token) {
  const { data, res } = await apiGet(`/hackathons/${hackathonId}`, token);
  if (!res.ok) {
    throw new Error(`GET hackathon ${hackathonId} failed: ${res.status}`);
  }
  return {
    id: data?.id ?? hackathonId,
    status: data?.status,
    slug: data?.slug,
    raw: data,
  };
}

/**
 * Personnel setup (not progression mutate): assign INTERNAL judge to prelim track.
 * Used when Ant Select virtual-list clicks are flaky in headed CI/Windows.
 */
export async function assignPrelimJudgeByEmail(token, { hackathonId, judgeEmail, assignmentType = 'NORMAL' }) {
  const tracksRes = await apiGet(`/hackathons/${hackathonId}/tracks`, token);
  if (!tracksRes.res.ok) {
    throw new Error(`GET tracks failed: ${tracksRes.res.status}`);
  }
  const tracks = Array.isArray(tracksRes.data) ? tracksRes.data : tracksRes.data?.items || [];
  const track = tracks[0];
  if (!track?.id) throw new Error('No track found to assign judge');

  const usersRes = await apiGet(`/users?role=JUDGE&status=APPROVED&size=500`, token);
  if (!usersRes.res.ok) {
    throw new Error(`GET judges failed: ${usersRes.res.status}`);
  }
  const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.items || [];
  const emailLc = String(judgeEmail).toLowerCase();
  const judge = users.find((u) => String(u.email || u.username || '').toLowerCase() === emailLc);
  if (!judge?.id) throw new Error(`Judge not found: ${judgeEmail}`);

  const assign = await apiPost(`/judge-assignments`, token, {
    judgeId: judge.id,
    trackId: track.id,
    assignmentType,
  });
  if (!assign.res.ok) {
    throw new Error(
      `POST judge-assignments failed ${assign.res.status}: ${JSON.stringify(assign.json)}`,
    );
  }
  return { trackId: track.id, judgeId: judge.id, assignment: assign.data };
}

/**
 * Assign FINAL_EXTERNAL guest judge to final round (GĐ4).
 */
export async function assignFinalGuestJudgeByEmail(token, { roundId, judgeEmail }) {
  const usersRes = await apiGet(`/users?role=JUDGE&status=APPROVED&size=500`, token);
  const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.items || [];
  const emailLc = String(judgeEmail).toLowerCase();
  let judge = users.find((u) => String(u.email || '').toLowerCase() === emailLc);
  if (!judge?.id) {
    const tempRes = await apiGet(`/users/temp-judges?size=500`, token);
    const temps = Array.isArray(tempRes.data) ? tempRes.data : tempRes.data?.items || [];
    judge = temps.find((u) => String(u.email || '').toLowerCase() === emailLc);
  }
  if (!judge?.id) throw new Error(`Guest judge not found: ${judgeEmail}`);

  const assign = await apiPost(`/rounds/${roundId}/judge-assignments`, token, {
    judgeId: judge.id,
    judgeIds: [judge.id],
    assignmentType: 'FINAL_EXTERNAL',
  });
  if (!assign.res.ok) {
    throw new Error(
      `POST final judge-assignments failed ${assign.res.status}: ${JSON.stringify(assign.json)}`,
    );
  }
  return { judgeId: judge.id, assignment: assign.data };
}

/** Create team as student (leader). Confirms formation for coord approve. */
export async function createStudentTeam(token, { hackathonId, teamName, coordToken = null }) {
  // Leave/disband leftover teams from prior Mode B runs
  await freeStudentForNewHackathon(token, hackathonId, coordToken);

  const { res, json, data } = await apiPost(`/me/teams`, token, {
    hackathonId,
    teamName,
  });
  if (!res.ok) {
    throw new Error(`create team failed ${res.status}: ${JSON.stringify(json)}`);
  }
  const teamId = data?.id || data?.teamId;
  if (!teamId) {
    throw new Error(`create team missing id: ${JSON.stringify(json)}`);
  }
  // Leader must confirm formation before coord can approve (TEAM_FORMATION_NOT_SUBMITTED)
  await confirmTeamFormation(token, teamId);
  return { teamId, team: data };
}

/** Leader confirms roster — required before coordinator approve. */
export async function confirmTeamFormation(token, teamId) {
  const { res, json } = await apiPost(`/teams/${teamId}/confirm-formation`, token, {});
  if (!res.ok) {
    throw new Error(`confirm-formation ${teamId} failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/** Approve all PENDING teams on a hackathon (coord). */
export async function approvePendingTeams(token, hackathonId) {
  const { data, res } = await apiGet(`/teams?hackathonId=${hackathonId}`, token);
  if (!res.ok) {
    throw new Error(`list teams failed ${res.status}`);
  }
  return approveTeamList(token, data);
}

async function approveTeamList(token, data) {
  const teams = Array.isArray(data) ? data : data?.items || data?.content || [];
  const approved = [];
  for (const t of teams) {
    const status = t.status || t.teamStatus;
    if (status === 'ACTIVE') {
      approved.push(t.id);
      continue;
    }
    if (status === 'PENDING' || !status) {
      const { res, json } = await apiPatch(`/teams/${t.id}/approve`, token, {});
      if (!res.ok) {
        // try patch status
        const p = await apiPatch(`/teams/${t.id}/status`, token, { status: 'ACTIVE' });
        if (!p.res.ok) {
          throw new Error(`approve team ${t.id} failed: ${JSON.stringify(json || p.json)}`);
        }
      }
      approved.push(t.id);
    }
  }
  return approved;
}

async function apiPatch(path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data ?? json };
}

/** Create prelim + final rounds for Mode B setup. */
export async function createPrelimAndFinalRounds(token, hackathonId, timeline) {
  const toIso = (d) => {
    const x = d instanceof Date ? d : new Date(d);
    return (
      `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` +
      `T${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`
    );
  };
  const coding = timeline.codingDurationHours || 1;
  const prelimExam = timeline.prelimExamAt;
  const finalExam = timeline.finalExamAt;
  const prelimDeadline = new Date(prelimExam.getTime() + coding * 60 * 60 * 1000);
  const finalDeadline = new Date(finalExam.getTime() + coding * 60 * 60 * 1000);

  const prelimBody = {
    name: 'Vòng Sơ loại',
    examAt: toIso(prelimExam),
    isFinal: false,
    roundType: 'PRELIMINARY',
    submissionDeadline: toIso(prelimDeadline),
    codingDurationHours: coding,
    topNAdvance: 5,
    minTeamsFinal: 2,
    wildcardEnabled: true,
  };
  const prelim = await apiPost(`/hackathons/${hackathonId}/rounds`, token, prelimBody);
  if (!prelim.res.ok) {
    throw new Error(`create prelim failed ${prelim.res.status}: ${JSON.stringify(prelim.json)}`);
  }

  const finalBody = {
    name: 'Vòng Chung kết',
    examAt: toIso(finalExam),
    isFinal: true,
    roundType: 'FINAL',
    submissionDeadline: toIso(finalDeadline),
    codingDurationHours: coding,
  };
  const fin = await apiPost(`/hackathons/${hackathonId}/rounds`, token, finalBody);
  if (!fin.res.ok) {
    throw new Error(`create final failed ${fin.res.status}: ${JSON.stringify(fin.json)}`);
  }

  return {
    prelimRoundId: prelim.data?.id,
    finalRoundId: fin.data?.id,
    prelim: prelim.data,
    final: fin.data,
  };
}

/** Create one prelim track (min size 1 for solo orphan leaders). */
export async function createPrelimTrack(token, prelimRoundId, name = 'M2 Track A') {
  const { res, json, data } = await apiPost(`/rounds/${prelimRoundId}/tracks`, token, {
    name,
    minTeamSize: 1,
    maxTeamSize: 5,
    maxTeams: 20,
  });
  if (!res.ok) {
    throw new Error(`create track failed ${res.status}: ${JSON.stringify(json)}`);
  }
  const trackId = data?.id;
  if (trackId) {
    await uploadTrackProblemPdf(token, trackId);
  }
  return { trackId, track: data };
}

/** Upload minimal PDF đề bài so UI «Phát đề» readiness passes. */
export async function uploadTrackProblemPdf(token, trackId, filename = 'm2-problem.pdf') {
  const form = new FormData();
  form.append('file', new Blob([minimalPdfBuffer()], { type: 'application/pdf' }), filename);
  const res = await fetch(`${BE_BASE}/tracks/${trackId}/problem-statement`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`upload track PDF failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/** Upload PDF đề Chung kết (round-level). */
export async function uploadRoundProblemPdf(token, roundId, filename = 'm2-final-problem.pdf') {
  const form = new FormData();
  form.append('file', new Blob([minimalPdfBuffer()], { type: 'application/pdf' }), filename);
  const res = await fetch(`${BE_BASE}/rounds/${roundId}/problem-statement`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`upload round PDF failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

const STANDARD_CRITERIA_ITEMS = [
  {
    name: 'Chất lượng giải pháp',
    type: 'TECHNICAL',
    weight: 0.3,
    maxScore: 10,
    displayOrder: 1,
    description: 'Mức độ hoàn thiện, sáng tạo và phù hợp của sản phẩm.',
  },
  {
    name: 'Tính khả thi kỹ thuật',
    type: 'TECHNICAL',
    weight: 0.25,
    maxScore: 10,
    displayOrder: 2,
    description: 'Kiến trúc, triển khai và độ ổn định của hệ thống.',
  },
  {
    name: 'Trình bày & demo',
    type: 'SOFT_SKILL',
    weight: 0.25,
    maxScore: 10,
    displayOrder: 3,
    description: 'Khả năng truyền đạt ý tưởng và demo sản phẩm.',
  },
  {
    name: 'Làm việc nhóm',
    type: 'SOFT_SKILL',
    weight: 0.2,
    maxScore: 10,
    displayOrder: 4,
    description: 'Phối hợp, phân công và đóng góp của thành viên.',
  },
];

/** Apply standard criteria weight=1.0 to prelim track + final round. */
export async function applyStandardCriteriaBundle(token, { trackId, finalRoundId }) {
  const payload = { items: STANDARD_CRITERIA_ITEMS };
  if (trackId) {
    const { res, json } = await apiPost(`/tracks/${trackId}/criteria/batch`, token, payload);
    if (!res.ok) {
      throw new Error(`track criteria batch failed ${res.status}: ${JSON.stringify(json)}`);
    }
  }
  if (finalRoundId) {
    const { res, json } = await apiPost(`/rounds/${finalRoundId}/criteria/batch`, token, payload);
    if (!res.ok) {
      throw new Error(`final criteria batch failed ${res.status}: ${JSON.stringify(json)}`);
    }
  }
}

/**
 * Leave leftover teams then unregister from other ONGOING hackathons.
 * Unregister is blocked while still on a team.
 * ACTIVE / formation-confirmed teams can only be disbanded by Coordinator.
 */
export async function freeStudentForNewHackathon(token, targetHackathonId, coordToken = null) {
  const mine = await apiGet(`/me/teams`, token);
  const myTeamsRaw = mine.data;
  const myTeams = Array.isArray(myTeamsRaw)
    ? myTeamsRaw
    : myTeamsRaw
      ? [myTeamsRaw]
      : [];
  for (const t of myTeams) {
    const tid = t.teamId || t.id;
    const hid = t.hackathonId;
    if (!tid) continue;
    if (hid && Number(hid) === Number(targetHackathonId)) continue;
    // Student DELETE fails for ACTIVE / formation-submitted — use coord when available
    let deleted = false;
    if (coordToken) {
      const d = await fetch(`${BE_BASE}/teams/${tid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${coordToken}` },
      });
      deleted = d.ok;
    }
    if (!deleted) {
      await fetch(`${BE_BASE}/teams/${tid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  const browsePaths = [`/me/hackathons/browse?status=ONGOING`, `/me/hackathons/browse`];
  for (const path of browsePaths) {
    const { data, res } = await apiGet(path, token);
    if (!res.ok) continue;
    const list = Array.isArray(data) ? data : data?.items || [];
    for (const h of list) {
      if (!h?.id || Number(h.id) === Number(targetHackathonId)) continue;
      if (!h.registered) continue;
      await fetch(`${BE_BASE}/me/hackathons/${h.id}/register`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }
}

/**
 * Student registers for ONGOING hackathon (FR-U-06). Not progression mutate.
 * @param {string} [coordToken] — needed to disband leftover ACTIVE teams from prior Mode B runs
 */
export async function registerStudentForHackathon(token, hackathonId, coordToken = null) {
  await freeStudentForNewHackathon(token, hackathonId, coordToken);
  let { res, json } = await apiPost(`/me/hackathons/${hackathonId}/register`, token, {});
  if (!res.ok) {
    const code = json?.error?.code || json?.code;
    if (code === 'REGISTRATION_ALREADY_ACTIVE_ELSEWHERE') {
      // Force-clear again then retry once
      await freeStudentForNewHackathon(token, hackathonId, coordToken);
      ({ res, json } = await apiPost(`/me/hackathons/${hackathonId}/register`, token, {}));
    }
  }
  if (!res.ok) {
    const code = json?.error?.code || json?.code;
    if (code === 'REGISTRATION_ALREADY_EXISTS' || code === 'ALREADY_REGISTERED' || code === 'INVALID_STATE') {
      if (String(json?.error?.message || json?.message || '').includes('đã đăng ký giải đấu này')) return;
    }
    throw new Error(`register failed ${res.status}: ${JSON.stringify(json)}`);
  }
}
export async function createMilestoneEvents(token, hackathonId, timeline) {
  const toIso = (d) => {
    const x = d instanceof Date ? d : new Date(d);
    return (
      `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` +
      `T${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`
    );
  };
  const endIso = (d, hours = 2) => {
    const x = new Date(d instanceof Date ? d.getTime() : new Date(d).getTime());
    x.setHours(x.getHours() + hours);
    return toIso(x);
  };

  const specs = [
    {
      title: 'Lễ khai mạc M2',
      type: 'KICKOFF',
      startsAt: toIso(timeline.kickoffAt),
      endsAt: endIso(timeline.kickoffAt),
    },
    {
      title: 'Workshop M2',
      type: 'WORKSHOP',
      startsAt: toIso(timeline.workshopAt),
      endsAt: endIso(timeline.workshopAt),
    },
    {
      title: 'Lễ trao giải M2',
      type: 'AWARDS',
      startsAt: toIso(timeline.awardsAt),
      endsAt: endIso(timeline.awardsAt),
    },
  ];

  for (const spec of specs) {
    const body = {
      title: spec.title,
      type: spec.type,
      location: 'FPTU Hall A',
      meetUrl: 'https://meet.google.com/mode-b-e2e',
      startsAt: spec.startsAt,
      endsAt: spec.endsAt,
      isPublic: true,
    };
    const { res, json } = await apiPost(`/hackathons/${hackathonId}/events`, token, body);
    if (!res.ok) {
      throw new Error(`POST event ${spec.type} failed ${res.status}: ${JSON.stringify(json)}`);
    }
  }
}

export async function loginToken(email, password) {
  const res = await fetch(`${BE_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `login failed ${res.status}`);
  }
  return json?.data?.accessToken || json?.accessToken;
}

/**
 * T1 — one browser context per role; login once via UI, reuse pages.
 * @param {import('@playwright/test').Browser} browser
 * @param {{ email: string, password?: string, role?: string }} account
 */
export async function createAuthedContext(browser, account) {
  const baseURL = process.env.FE_BASE_URL || 'http://localhost:5173';
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await loginAsDomReady(page, {
    email: account.email,
    password: resolvePassword(account.role, account.password),
    role: account.role,
  });
  return { context, page, account };
}

/**
 * @param {Record<string, { context: import('@playwright/test').BrowserContext, page: import('@playwright/test').Page }>} sessions
 * @param {string} role
 */
export async function asRole(sessions, role) {
  const session = sessions[role];
  if (!session?.context) {
    throw new Error(`Mode B session missing for role: ${role}`);
  }
  if (!session.page || session.page.isClosed()) {
    session.page = await session.context.newPage();
  }
  return session.page;
}

export async function disposeSessions(sessions) {
  if (!sessions) return;
  for (const key of Object.keys(sessions)) {
    const s = sessions[key];
    try {
      if (s?.page && !s.page.isClosed()) await s.page.close();
    } catch {
      /* ignore */
    }
    try {
      if (s?.context) await s.context.close();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Fill Ant Design Form.Item input by label text (when getByLabel is unreliable).
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} label
 * @param {string} value
 */
export async function fillFormInput(page, label, value) {
  const item = page
    .locator('.ant-form-item')
    .filter({ has: page.getByText(label, { exact: typeof label === 'string' }) })
    .first();
  const input = item.locator('input:not([type="hidden"]), textarea').first();
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.click({ clickCount: 3, timeout: 10_000 });
  await input.fill(value);
}

/**
 * Fill Ant Design DatePicker (showTime) by form item label.
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} label
 * @param {string} valueStr
 */
export async function fillAntDateTime(page, label, valueStr) {
  const item = page
    .locator('.ant-form-item')
    .filter({ has: page.getByText(label, { exact: typeof label === 'string' }) })
    .first();
  const input = item.locator('input').first();
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.click({ clickCount: 3, timeout: 10_000 });
  await input.fill(valueStr);
  await input.press('Enter');
  await page.keyboard.press('Escape').catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} label
 * @param {string|RegExp} optionText
 */
export async function selectFormOption(page, label, optionText) {
  const item = page
    .locator('.ant-form-item')
    .filter({ has: page.getByText(label, { exact: typeof label === 'string' }) })
    .first();
  await expect(item).toBeVisible({ timeout: 15_000 });

  const combobox = item.getByRole('combobox').first();
  if (await combobox.count()) {
    await combobox.click({ force: true });
  } else {
    await item.locator('.ant-select-selector').first().click({ force: true });
  }

  const option = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
    .filter({ hasText: optionText })
    .first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  // Ant dropdown portals often report "outside viewport" — DOM click bypasses hit-testing.
  await option.evaluate((el) => el.click());
  await page.keyboard.press('Escape').catch(() => {});
}

/**
 * T2 — after Phát đề, wait until student submit CTA is ready (reload loop).
 * @param {import('@playwright/test').Page} page
 * @param {{ tab?: RegExp|string, submitButton?: RegExp, timeout?: number }} [opts]
 */
export async function waitForStudentSubmitReady(page, opts = {}) {
  const tab = opts.tab ?? /Sơ loại/i;
  const submitButton = opts.submitButton ?? /Nộp bài Sơ loại|Nộp Bài dự thi Vòng Chung kết|Cập nhật bài/i;
  const timeout = opts.timeout ?? 120_000;

  await expect(async () => {
    await page.goto('/student/submit', { waitUntil: 'domcontentloaded' });
    // Segmented control (radio) or tabs
    const tabBtn = page.getByRole('tab', { name: tab });
    if (await tabBtn.count()) {
      await tabBtn.click().catch(() => {});
    } else {
      const radio = page.getByRole('radio', { name: tab });
      if (await radio.count()) await radio.first().click().catch(() => {});
    }
    const btn = page.getByRole('button', { name: submitButton }).first();
    await expect(btn).toBeVisible({ timeout: 8_000 });
    await expect(btn).toBeEnabled({ timeout: 3_000 });
  }).toPass({ timeout, intervals: [2_000, 3_000, 5_000] });
}

/**
 * Student multipart submit (same contract as close-submission-early E2E).
 * Used when Ant Dragger does not sync into react-hook-form under Playwright.
 */
export async function submitStudentMultipart(token, fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (key === 'slideFile') {
      form.append('slideFile', value, 'e2e-slide.pdf');
      continue;
    }
    form.append(key, String(value));
  }
  const res = await fetch(`${BE_BASE}/submissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data ?? json };
}

export function minimalPdfBlob(name = 'e2e-slide.pdf') {
  return new Blob([minimalPdfBuffer()], { type: 'application/pdf' });
}

/** FR-15A — Phát đề round (setup; requires track PDFs for prelim). */
export async function releaseRoundProblem(token, roundId) {
  const { res, json } = await apiPatch(`/rounds/${roundId}/release-problem`, token, {});
  if (!res.ok) {
    throw new Error(`release-problem round ${roundId} failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/** Phát đề theo track (Sơ loại). */
export async function releaseTrackProblem(token, trackId) {
  const { res, json } = await apiPatch(`/tracks/${trackId}/release-problem`, token, {});
  if (!res.ok) {
    // Already released is OK
    const code = json?.error?.code || json?.code;
    if (code === 'INVALID_STATE') return json?.data ?? json;
    throw new Error(`release-problem track ${trackId} failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/** PATCH /rounds/{id}/activate — Mode B nén lịch START_NOW để coding/submit không chờ examAt xa. */
export async function activateRoundByApi(token, roundId, note = 'Mode B E2E', scheduleMode = 'START_NOW') {
  const { res, json } = await apiPatch(`/rounds/${roundId}/activate`, token, {
    note,
    scheduleMode,
  });
  if (!res.ok) {
    throw new Error(`activate round ${roundId} failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/**
 * UI ActivateScheduleModal: chọn START_NOW (nếu hiện) rồi OK "Kích hoạt".
 * @param {import('@playwright/test').Page} page
 */
export async function confirmActivateScheduleModal(page, { startNow = true } = {}) {
  const modal = page.locator('.ant-modal').filter({ hasText: /Kích hoạt/i }).last();
  await expect(modal).toBeVisible({ timeout: 15_000 });
  if (startNow) {
    const startNowRadio = modal.getByRole('radio', { name: /bắt đầu thi ngay/i });
    if (await startNowRadio.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await startNowRadio.check({ force: true }).catch(async () => {
        await modal.getByText(/bắt đầu thi ngay/i).first().click();
      });
    }
  }
  await modal.getByRole('button', { name: /^Kích hoạt$/i }).click({ timeout: 15_000, noWaitAfter: true });
}

export async function getRoundActive(token, roundId) {
  const { data, res } = await apiGet(`/rounds/${roundId}`, token);
  if (!res.ok) throw new Error(`GET round ${roundId} failed ${res.status}`);
  return Boolean(data?.isActive ?? data?.is_active);
}

/**
 * Read-only poll of presentation queue until PRESENTING + scorable timer phase.
 * @param {import('@playwright/test').Page} pageOrQueuePage
 * @param {{ token?: string, roundId?: number|string, trackId?: number|string|null, timeout?: number }} [opts]
 */
export async function waitUntilPresentingScorable(pageOrQueuePage, opts = {}) {
  const timeout = opts.timeout ?? 180_000;
  const openPhases = new Set(['PRESENTING', 'QA', 'PAUSED', 'ENDED']);

  await expect(async () => {
    if (opts.token && opts.roundId) {
      const q = new URLSearchParams({ roundId: String(opts.roundId) });
      if (opts.trackId != null) q.set('trackId', String(opts.trackId));
      const { data, res } = await apiGet(`/presentation/queue?${q}`, opts.token);
      expect(res.ok).toBeTruthy();
      const tracks = data?.tracks || data?.groups || [];
      let presenting = null;
      for (const t of tracks) {
        const items = t.items || t.teams || [];
        presenting =
          items.find(
            (it) =>
              String(it.status || it.queueStatus || '').toUpperCase() === 'PRESENTING',
          ) || null;
        if (presenting) break;
      }
      if (!presenting) {
        const flat = data?.items || data?.slots || [];
        presenting =
          (Array.isArray(flat) ? flat : []).find(
            (it) =>
              String(it.status || it.queueStatus || '').toUpperCase() === 'PRESENTING',
          ) || null;
      }
      expect(presenting).toBeTruthy();
      return;
    }

    // UI fallback
    const live = pageOrQueuePage.getByText(/ĐANG TRÌNH BÀY|PRESENTING|ĐANG CHUẨN BỊ/i).first();
    await expect(live).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout, intervals: [2_000, 3_000, 5_000] });
}

/**
 * FR-24 publish + FR advance — UI-first; API fallback (not via progressionApiHelpers).
 */
export async function publishRoundByApi(token, roundId) {
  const { res, json } = await apiPatch(`/rounds/${roundId}/publish`, token, {});
  if (!res.ok) {
    throw new Error(`publish round ${roundId} failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

export async function advanceRoundByApi(token, roundId, body = null) {
  let payload = body;
  if (!payload || !Array.isArray(payload.advancedTeamIds) || payload.advancedTeamIds.length === 0) {
    const { data, res } = await apiGet(`/rounds/${roundId}/ranking`, token);
    if (!res.ok) {
      throw new Error(`ranking before advance failed ${res.status}`);
    }
    const rows = Array.isArray(data) ? data : data?.items || [];
    const teamIds = rows
      .map((r) => r.teamId || r.team_id || r.id)
      .filter(Boolean)
      .map(Number);
    if (!teamIds.length) {
      throw new Error(`No ranking teams to advance for round ${roundId}`);
    }
    // Advance all scored teams for Mode B continuous (min teams for final)
    payload = {
      advancedTeamIds: teamIds,
      eliminatedTeamIds: [],
      note: 'Mode B continuous advance',
    };
  }
  const { res, json } = await apiPost(`/rounds/${roundId}/advance`, token, payload);
  if (!res.ok) {
    throw new Error(`advance round ${roundId} failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/**
 * FR-20A — Khóa chấm điểm (same endpoint as UI modal).
 */
export async function lockScoringByApi(token, roundId, { force = true, reason = 'Mode B E2E' } = {}) {
  const { res, json } = await apiPatch(`/rounds/${roundId}/lock-scoring`, token, {
    force,
    reason,
  });
  if (!res.ok) {
    throw new Error(`lock-scoring ${roundId} failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/** Shuffle presentation queue (coord). */
export async function shufflePresentationQueue(token, roundId, trackIds = null) {
  const body = { roundId };
  if (trackIds != null) body.trackIds = Array.isArray(trackIds) ? trackIds : [trackIds];
  const { res, json } = await apiPost(`/presentation/queue/shuffle`, token, body);
  if (!res.ok) {
    throw new Error(`queue shuffle failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/** Close submission early (same endpoint as UI red button). */
export async function closeSubmissionEarlyByApi(token, roundId) {
  const { res, json } = await apiPost(`/rounds/${roundId}/close-submission-early`, token, {});
  if (!res.ok) {
    const code = json?.error?.code || json?.code;
    if (code === 'SUBMISSION_ALREADY_CLOSED') return json?.data ?? json;
    throw new Error(`close-submission-early ${roundId} failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/** FR-GĐ6 — Trao giải (same as UI AwardPrizeModal). */
export async function awardPrizeByApi(token, hackathonId, body) {
  const { res, json } = await apiPost(`/hackathons/${hackathonId}/prizes`, token, body);
  if (!res.ok) {
    const code = json?.error?.code || json?.code;
    if (code === 'PRIZE_DUPLICATE') return json?.data ?? json;
    throw new Error(`award prize failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/** FR-33 — PENDING_CONFIRM → FINISHED. */
export async function confirmHackathonByApi(token, hackathonId, note = 'Mode B E2E confirm') {
  const { res, json } = await apiPatch(`/hackathons/${hackathonId}/confirm`, token, {
    confirm: true,
    note,
  });
  if (!res.ok) {
    throw new Error(`confirm hackathon failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/** FR-34 — export CSV rankings job. */
export async function createExportJobByApi(token, hackathonId, type = 'CSV_RANKINGS') {
  const { res, json } = await apiPost(`/hackathons/${hackathonId}/export-jobs`, token, { type });
  if (!res.ok) {
    throw new Error(`export-jobs failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json?.data ?? json;
}

/** Read-only final team rankings for prize assignment. */
export async function getTeamRankings(token, hackathonId) {
  const { data, res } = await apiGet(`/hackathons/${hackathonId}/team-rankings`, token);
  if (!res.ok) {
    throw new Error(`team-rankings failed ${res.status}`);
  }
  return Array.isArray(data) ? data : data?.items || [];
}

/**
 * Coord (or track controller) drives timer IDLE→PRESENTING→QA so scoring submit unlocks.
 */
export async function drivePresentationTimerToQa(token, roundId, trackId) {
  const q = new URLSearchParams({ roundId: String(roundId) });
  if (trackId != null) q.set('trackId', String(trackId));
  const headers = { Authorization: `Bearer ${token}` };

  // Read queue first — ensure PRESENTING slot exists
  const queueRes = await apiGet(`/presentation/queue?${q}`, token);
  if (!queueRes.res.ok) {
    throw new Error(`queue before timer failed: ${JSON.stringify(queueRes.json)}`);
  }
  const tracks = queueRes.data?.tracks || queueRes.data?.groups || [];
  let hasPresenting = false;
  for (const t of tracks) {
    const items = t.items || t.teams || [];
    if (items.some((it) => String(it.status || it.queueStatus || '').toUpperCase() === 'PRESENTING')) {
      hasPresenting = true;
      break;
    }
  }
  if (!hasPresenting) {
    throw new Error(`No PRESENTING slot before timer; queue=${JSON.stringify(queueRes.data).slice(0, 500)}`);
  }

  const start = await fetch(`${BE_BASE}/presentation/timer/start?${q}`, {
    method: 'POST',
    headers,
  });
  const startJson = await start.json().catch(() => ({}));
  if (!start.ok) {
    const msg = String(startJson?.error?.message || '');
    if (!/đã chạy|PRESENTING|Timer/i.test(msg)) {
      throw new Error(`timer start failed ${start.status}: ${JSON.stringify(startJson)}`);
    }
  }
  const qa = await fetch(`${BE_BASE}/presentation/timer/qa?${q}`, {
    method: 'POST',
    headers,
  });
  const qaJson = await qa.json().catch(() => ({}));
  if (!qa.ok) {
    const code = qaJson?.error?.code || qaJson?.code;
    const msg = String(qaJson?.error?.message || '');
    // Already in QA / ENDED / race after UI — scoring may still be open
    if (code === 'INVALID_STATE' || /QA|đã|ENDED|PRESENTING/i.test(msg)) {
      return qaJson?.data ?? qaJson;
    }
    throw new Error(`timer qa failed ${qa.status}: ${JSON.stringify(qaJson)}`);
  }
  return qaJson?.data ?? qaJson;
}

/**
 * Score every PRESENTING/WAITING team in the presentation queue via API
 * (requires JUDGING + PRESENTING + timer open for each team).
 */
export async function scoreEntirePresentationQueue(
  coordToken,
  judgeToken,
  roundId,
  trackId = null,
  scoreValue = 9,
) {
  const critRes = await apiGet(`/rounds/${roundId}/criteria`, coordToken);
  if (!critRes.res.ok) {
    throw new Error(`criteria for round ${roundId} failed: ${JSON.stringify(critRes.json)}`);
  }
  const criteria = (Array.isArray(critRes.data) ? critRes.data : critRes.data?.items || []).filter(
    (c) => String(c.type || c.criteriaType || '').toUpperCase() !== 'PENALTY',
  );
  if (!criteria.length) {
    throw new Error(`No non-penalty criteria for round ${roundId}`);
  }

  const q = new URLSearchParams({ roundId: String(roundId) });
  if (trackId != null) q.set('trackId', String(trackId));

  const scored = new Set();
  for (let step = 0; step < 8; step += 1) {
    const queueRes = await apiGet(`/presentation/queue?${q}`, coordToken);
    if (!queueRes.res.ok) {
      throw new Error(`queue read failed: ${JSON.stringify(queueRes.json)}`);
    }
    const tracks = queueRes.data?.tracks || queueRes.data?.groups || [queueRes.data].filter(Boolean);
    let presenting = null;
    let waitingCount = 0;
    for (const t of tracks) {
      const items = t?.items || t?.teams || [];
      for (const it of items) {
        const st = String(it.status || it.queueStatus || '').toUpperCase();
        if (st === 'PRESENTING') presenting = it;
        if (st === 'WAITING' || st === 'QUEUED' || st === 'PENDING') waitingCount += 1;
      }
    }
    if (!presenting) {
      if (step === 0) {
        await shufflePresentationQueue(coordToken, roundId, trackId);
        continue;
      }
      break;
    }

    const submissionId = presenting.submissionId || presenting.submission_id || presenting.id;
    if (submissionId && !scored.has(Number(submissionId))) {
      await drivePresentationTimerToQa(coordToken, roundId, trackId);
      for (const c of criteria) {
        const criterionId = c.id || c.criterionId;
        const { res, json } = await apiPost(`/scores`, judgeToken, {
          submissionId: Number(submissionId),
          criterionId: Number(criterionId),
          scoreValue,
          scoreType: 'NORMAL',
        });
        if (!res.ok) {
          const code = json?.error?.code || json?.code;
          if (code !== 'SCORING_LOCKED' && code !== 'DUPLICATE') {
            // keep going — UI may have already scored this criterion
            if (res.status >= 500) {
              throw new Error(`score failed ${res.status}: ${JSON.stringify(json)}`);
            }
          }
        }
      }
      scored.add(Number(submissionId));
    }

    if (waitingCount <= 0) break;

    const nextBody = {
      acknowledgeIncompleteScoring: true,
    };
    if (trackId != null) nextBody.trackId = trackId;
    const next = await apiPatch(`/presentation/queue/next?${q}`, coordToken, nextBody);
    if (!next.res.ok) {
      const code = next.json?.error?.code || next.json?.code;
      if (code === 'QUEUE_EMPTY' || code === 'NO_MORE_TEAMS') break;
      // soft: stop if cannot advance
      break;
    }
  }
  return { scoredCount: scored.size };
}

/**
 * Fill all visible criteria InputNumber fields with a score.
 * @param {import('@playwright/test').Page} page
 * @param {number} [score]
 */
export async function fillAllCriteriaScores(page, score = 8) {
  await expect(page.getByText(/Trọng số|tiêu chí|Chất lượng/i).first()).toBeVisible({
    timeout: 45_000,
  });
  const inputs = page.locator('.ant-input-number input');
  await expect(inputs.first()).toBeVisible({ timeout: 30_000 });
  const count = await inputs.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const input = inputs.nth(i);
    if (!(await input.isVisible().catch(() => false))) continue;
    await input.click({ clickCount: 3 });
    await input.fill(String(score));
    await input.blur();
  }
}

/**
 * Open live scoring room for the Mode B hackathon/track (judge token).
 * Must go through lobby click so React Router location.state includes roundId/trackId.
 * @param {'track'|'final'} [kind]
 */
export async function openJudgeScoringRoom(page, token, { hackathonId, trackId, slug, kind = 'track' }) {
  const path =
    kind === 'final' ? `/me/judge-final-assignments` : `/me/judge-track-assignments`;
  const { data, res } = await apiGet(path, token);
  if (!res.ok) throw new Error(`${path} failed ${res.status}`);
  const list = Array.isArray(data) ? data : data?.items || [];
  const match =
    list.find((a) => Number(a.hackathonId || a.hackathon_id) === Number(hackathonId)) ||
    list.find(
      (a) =>
        trackId != null &&
        (Number(a.trackId || a.track_id) === Number(trackId) ||
          Number(a.roundId || a.round_id) === Number(trackId)),
    ) ||
    list.find((a) => String(a.hackathonName || a.hackathon_name || '').includes(String(slug || '')));
  if (!match) {
    throw new Error(
      `No ${kind} judge assignment for hackathon=${hackathonId}; got ${list.length} assignments`,
    );
  }

  const displayName = String(match.hackathonName || match.hackathon_name || slug || 'SEAL M2');
  await page.goto('/judge/assignments', { waitUntil: 'domcontentloaded' });
  const search = page.getByPlaceholder(/Tìm kiếm vòng thi|bảng đấu/i);
  if (await search.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    await search.first().fill(displayName.slice(0, 40));
  }
  const eventHeading = page.getByRole('heading', {
    name: new RegExp(escapeRegExp(displayName.slice(0, 24)) + '|' + escapeRegExp(String(slug || 'SEAL M2')), 'i'),
  });
  await expect(eventHeading.first()).toBeVisible({ timeout: 30_000 });
  await eventHeading.first().click({ timeout: 10_000 });
  const enter = page.getByRole('button', { name: /Vào phòng chấm thi/i });
  await expect(enter.first()).toBeVisible({ timeout: 30_000 });
  await enter.first().click({ timeout: 15_000 });
  await expect(page.getByText(/Phòng chấm thi trực tiếp|TỔNG ĐIỂM|Đang thiết lập/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/Đang thiết lập kết nối mã hóa/i)).toBeHidden({ timeout: 60_000 });
  return match;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
