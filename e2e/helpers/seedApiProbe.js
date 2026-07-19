/**
 * API state probe for 6 happy-path dev seed slugs.
 * Run: npm run probe:seeds (requires BE dev on :8080)
 */
import { BE_DEV_SLUGS } from './devSeedCatalogSlugs.js';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';

/** @typedef {{ pass: boolean, reason?: string, detail?: string }} ProbeResult */

/**
 * @param {string} method
 * @param {string} path
 * @param {{ token?: string, body?: object, expectErrorCode?: string }} [opts]
 */
async function apiRequest(method, path, { token, body, expectErrorCode } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  const code = json?.error?.code;
  if (expectErrorCode) {
    if (code !== expectErrorCode) {
      throw new Error(`expected ${expectErrorCode}, got ${code || res.status} — ${json?.error?.message || ''}`);
    }
    return { status: res.status, body: json };
  }
  if (!res.ok) {
    const err = new Error(json?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = code;
    throw err;
  }
  return json?.data ?? json;
}

async function login(email, password) {
  const data = await apiRequest('POST', '/auth/login', { body: { email, password } });
  return data.accessToken;
}

function findPrelim(rounds) {
  return (
    rounds.find((r) => {
      if (/chung kết|final/i.test(String(r.name || ''))) return false;
      if (r.roundType === 'FINAL' || r.isFinal || r.is_final) return false;
      return true;
    }) ?? null
  );
}

function findFinal(rounds) {
  return (
    rounds.find((r) => {
      if (r.isFinal || r.is_final || r.roundType === 'FINAL') return true;
      return /chung kết|final/i.test(String(r.name || ''));
    }) ?? null
  );
}

function roundIsActive(round) {
  return !!(round?.isActive ?? round?.is_active);
}

function roundIsScoringLocked(round) {
  return !!(round?.scoringLocked ?? round?.scoring_locked);
}

/** @type {Record<string, { status?: string, prelimActive?: boolean, prelimLocked?: boolean, finalActive?: boolean, chainFromGd4?: boolean }>} */
const SLUG_EXPECTATIONS = {
  'seal-e2e-2026': { status: 'ONGOING', prelimActive: false },
  'seal-fall-2025-finished': { status: 'FINISHED' },
  'seal-gd3-prelim-open': { status: 'ONGOING', prelimActive: true },
  'seal-gd4-advance-ready': { status: 'ONGOING', prelimLocked: true, finalActive: false, chainFromGd4: true },
  'seal-gd4-tiebreak-submission-time': { status: 'ONGOING', prelimLocked: true, finalActive: false, chainFromGd4: true },
  'seal-gd4-tiebreak-manual': { status: 'ONGOING', prelimLocked: true, finalActive: false, chainFromGd4: true },
  'seal-gd4-wildcard-gap': { status: 'ONGOING', prelimLocked: true, finalActive: false, chainFromGd4: true },
  'seal-gd5-final-active': { status: 'ONGOING', finalActive: true, chainFromGd4: true },
  'seal-gd6-pending-confirm': { status: 'PENDING_CONFIRM', prelimLocked: true, chainFromGd4: true },
};

const MILESTONE_EVENT_TYPES = ['KICKOFF', 'WORKSHOP', 'AWARDS'];

/**
 * GĐ4+ slugs must carry full chain: GĐ1 events, GĐ2 locked teams, GĐ3 prelim ranking (xem lại điểm SL).
 * @param {{ id: number|string, slug: string, coordToken: string, rounds: any[] }} ctx
 * @returns {Promise<ProbeResult>}
 */
async function probeHistoricalChain(ctx) {
  const exp = SLUG_EXPECTATIONS[ctx.slug];
  if (!exp?.chainFromGd4) {
    return { pass: true };
  }

  const events = await apiRequest('GET', `/hackathons/${ctx.id}/events`, { token: ctx.coordToken });
  const eventList = Array.isArray(events) ? events : events?.items || [];
  const types = new Set(eventList.map((e) => e.type || e.eventType));
  for (const type of MILESTONE_EVENT_TYPES) {
    if (!types.has(type)) {
      return { pass: false, reason: `GĐ1 thiếu event ${type} (slug chỉ test GĐ4 là sai)` };
    }
  }

  const teams = await apiRequest('GET', `/teams?hackathonId=${ctx.id}`, { token: ctx.coordToken });
  const teamList = Array.isArray(teams) ? teams : teams?.items || [];
  if (teamList.length === 0) {
    return { pass: false, reason: 'GĐ2 thiếu teams — không có nền lottery/đội' };
  }
  const unlocked = teamList.filter((t) => !(t.isLocked ?? t.is_locked));
  if (unlocked.length > 0) {
    return {
      pass: false,
      reason: `GĐ2: ${unlocked.length} đội chưa khóa — seed không đủ chuỗi trước GĐ4`,
    };
  }

  const prelim = findPrelim(ctx.rounds);
  if (!prelim) {
    return { pass: false, reason: 'GĐ3 thiếu vòng Sơ loại' };
  }
  if (!roundIsScoringLocked(prelim)) {
    return { pass: false, reason: 'GĐ3 prelim chưa khóa chấm — không xem lại điểm SL' };
  }

  const ranking = await apiRequest('GET', `/rounds/${prelim.id}/ranking`, { token: ctx.coordToken });
  const rankList = Array.isArray(ranking) ? ranking : ranking?.items || [];
  if (rankList.length === 0) {
    return {
      pass: false,
      reason: 'GĐ3 ranking trống — user ở GĐ4 không xem lại điểm Sơ loại được',
    };
  }

  return { pass: true, detail: `chain ok: ${eventList.length} events, ${teamList.length} teams, ${rankList.length} ranked` };
}

/**
 * @param {{ id: number|string, slug: string, coordToken: string, rounds: any[], hackathon: any }} ctx
 * @returns {Promise<ProbeResult>}
 */
async function probeBaseExpectations(ctx) {
  const exp = SLUG_EXPECTATIONS[ctx.slug];
  if (!exp) {
    return { pass: false, reason: `no SLUG_EXPECTATIONS for ${ctx.slug}` };
  }

  const status = ctx.hackathon.status || ctx.hackathon.hackathonStatus;
  if (exp.status && status !== exp.status) {
    if (status === 'FINISHED' && exp.status === 'PENDING_CONFIRM') {
      return {
        pass: false,
        reason:
          'Lỗi State: Slug đã bị mutate thành FINISHED. Restart BE (Gd6PendingConfirmDataSeeder.repairForFullChainRetest) để reset GĐ6 seed trước khi chạy lại probe.',
      };
    }
    return { pass: false, reason: `status expected ${exp.status}, got ${status}` };
  }

  const prelim = findPrelim(ctx.rounds);
  const finalRound = findFinal(ctx.rounds);

  if (exp.prelimActive != null) {
    if (!prelim) return { pass: false, reason: 'prelim round missing' };
    if (roundIsActive(prelim) !== exp.prelimActive) {
      return {
        pass: false,
        reason: `prelim.is_active expected ${exp.prelimActive}, got ${roundIsActive(prelim)}`,
      };
    }
  }

  if (exp.prelimLocked != null) {
    if (!prelim) return { pass: false, reason: 'prelim round missing' };
    if (roundIsScoringLocked(prelim) !== exp.prelimLocked) {
      return {
        pass: false,
        reason: `prelim.scoring_locked expected ${exp.prelimLocked}, got ${roundIsScoringLocked(prelim)}`,
      };
    }
  }

  if (exp.finalActive != null) {
    if (!finalRound) return { pass: false, reason: 'final round missing' };
    if (roundIsActive(finalRound) !== exp.finalActive) {
      return {
        pass: false,
        reason: `final.is_active expected ${exp.finalActive}, got ${roundIsActive(finalRound)}`,
      };
    }
  }

  return { pass: true };
}

/** @param {string} slug */
export async function probeSlug(slug, coordToken, hackathonBySlug) {
  const hackathon = hackathonBySlug.get(slug);
  if (!hackathon) {
    return { slug, pass: false, reason: 'slug not found in API' };
  }

  const rounds = await apiRequest('GET', `/hackathons/${hackathon.id}/rounds`, { token: coordToken });
  const roundList = Array.isArray(rounds) ? rounds : [];

  const ctx = {
    id: hackathon.id,
    slug,
    coordToken,
    rounds: roundList,
    hackathon,
  };

  const base = await probeBaseExpectations(ctx);
  if (!base.pass) {
    return { slug, ...base };
  }

  const chain = await probeHistoricalChain(ctx);
  if (!chain.pass) {
    return { slug, ...chain };
  }

  return { slug, pass: true, detail: chain.detail };
}

export async function runAllProbes() {
  const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
  const list = await apiRequest('GET', '/hackathons?size=60', { token: coordToken });
  const items = Array.isArray(list) ? list : list?.items || [];
  const hackathonBySlug = new Map(items.map((h) => [h.slug, h]));

  const results = [];
  for (const slug of BE_DEV_SLUGS) {
    try {
      results.push(await probeSlug(slug, coordToken, hackathonBySlug));
    } catch (err) {
      results.push({
        slug,
        pass: false,
        reason: err.message,
        detail: err.code || String(err.status || ''),
      });
    }
  }

  return results;
}
