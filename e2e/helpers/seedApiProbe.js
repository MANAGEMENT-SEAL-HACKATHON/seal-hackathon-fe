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

/** @type {Record<string, { status?: string, prelimActive?: boolean, prelimLocked?: boolean, finalActive?: boolean }>} */
const SLUG_EXPECTATIONS = {
  'seal-e2e-2026': { status: 'ONGOING', prelimActive: false },
  'seal-fall-2025-finished': { status: 'FINISHED' },
  'seal-gd3-prelim-open': { status: 'ONGOING', prelimActive: true },
  'seal-gd4-advance-ready': { status: 'ONGOING', prelimLocked: true, finalActive: false },
  'seal-gd5-final-active': { status: 'ONGOING', finalActive: true },
  'seal-gd6-pending-confirm': { status: 'PENDING_CONFIRM', prelimLocked: true },
};

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

  return { slug, pass: true };
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
