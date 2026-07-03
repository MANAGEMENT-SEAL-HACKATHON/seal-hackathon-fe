/**
 * API state probe for all 53 dev seed slugs.
 * Run: npm run probe:seeds (requires BE dev on :8080)
 */
import { BE_DEV_SLUGS } from './devSeedCatalogSlugs.js';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';

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

/**
 * Multipart POST (submissions) — BE chỉ nhận form-data, không JSON.
 */
async function apiMultipartRequest(path, { token, fields, expectErrorCode } = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields || {})) {
    if (value != null) form.append(key, String(value));
  }
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, { method: 'POST', headers, body: form });
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

function extractQueueItems(queue) {
  if (!queue) return [];
  if (Array.isArray(queue.tracks)) {
    return queue.tracks.flatMap((t) => (Array.isArray(t.items) ? t.items : []));
  }
  return queue?.slots || queue?.items || (Array.isArray(queue) ? queue : []);
}

function slotStatus(slot) {
  return slot?.queueStatus || slot?.queue_status || slot?.status || '';
}

function isQueueStatus(slot, status) {
  return String(slotStatus(slot)).toUpperCase() === status;
}

/** @type {Record<string, (ctx: ProbeContext) => Promise<ProbeResult>>} */
const CUSTOM_PROBES = {
  async 'seal-gd1-event-order-bad'(ctx) {
    const events = await apiRequest('GET', `/hackathons/${ctx.id}/events`, { token: ctx.coordToken });
    const list = Array.isArray(events) ? events : [];
    const milestone = list.filter((e) => ['KICKOFF', 'WORKSHOP', 'AWARDS'].includes(e.type));
    if (milestone.length !== 0) {
      return { pass: false, reason: 'expected 0 milestone events', detail: milestone.map((e) => e.type).join(', ') };
    }
    return { pass: true };
  },

  async 'seal-gd1-event-order-violation'(ctx) {
    const events = await apiRequest('GET', `/hackathons/${ctx.id}/events`, { token: ctx.coordToken });
    const types = (Array.isArray(events) ? events : []).map((e) => e.type);
    if (!types.includes('KICKOFF') || types.includes('WORKSHOP') || types.includes('AWARDS')) {
      return { pass: false, reason: 'expected KICKOFF only', detail: types.join(', ') };
    }
    const h = await apiRequest('GET', `/hackathons/${ctx.id}`, { token: ctx.coordToken });
    const eventEnd = h.eventEnd || h.event_end || '2026-08-15';
    await apiRequest('POST', `/hackathons/${ctx.id}/events`, {
      token: ctx.coordToken,
      body: {
        type: 'AWARDS',
        title: 'Probe AWARDS',
        location: 'Hall',
        startsAt: `${eventEnd}T17:30:00`,
        endsAt: `${eventEnd}T19:00:00`,
      },
      expectErrorCode: 'EVENT_ORDER_VIOLATION',
    });
    return { pass: true };
  },

  async 'seal-gd1-prelim-only'(ctx) {
    const rounds = await apiRequest('GET', `/hackathons/${ctx.id}/rounds`, { token: ctx.coordToken });
    const list = Array.isArray(rounds) ? rounds : [];
    if (findFinal(list)) {
      return { pass: false, reason: 'final round should not exist' };
    }
    const readiness = await apiRequest('GET', `/hackathons/${ctx.id}/readiness?target=ONGOING`, {
      token: ctx.coordToken,
    });
    const codes = (readiness.blockers || []).map((b) => b.code);
    if (!codes.includes('MISSING_FINAL_ROUND')) {
      return { pass: false, reason: 'missing MISSING_FINAL_ROUND blocker', detail: codes.join(', ') };
    }
    return { pass: true };
  },

  async 'seal-gd1-judge-final-early'(ctx) {
    const readiness = await apiRequest('GET', `/hackathons/${ctx.id}/readiness?target=FINAL_ROUND`, {
      token: ctx.coordToken,
    });
    if (readiness.ready !== false) {
      return { pass: false, reason: 'FINAL_ROUND readiness should be false' };
    }
    return { pass: true };
  },

  async 'seal-gd2-lottery-not-locked'(ctx) {
    const teams = await apiRequest('GET', `/teams?hackathonId=${ctx.id}&status=ACTIVE`, {
      token: ctx.coordToken,
    });
    const teamList = Array.isArray(teams) ? teams : teams?.items || [];
    const hasUnlocked = teamList.some((t) => !(t.isLocked ?? t.is_locked));
    if (!hasUnlocked) {
      return { pass: false, reason: 'expected at least one unlocked ACTIVE team' };
    }
    const prelim = findPrelim(ctx.rounds);
    if (!prelim) return { pass: false, reason: 'no prelim round' };
    try {
      await apiRequest('PATCH', `/hackathons/${ctx.id}/lottery`, {
        token: ctx.coordToken,
        body: { roundId: prelim.id },
        expectErrorCode: 'TEAM_NOT_LOCKED',
      });
    } catch (err) {
      if (!String(err.message).includes('REGISTRATION_CLOSED')) {
        throw err;
      }
    }
    return { pass: true };
  },

  async 'seal-gd2-round-active'(ctx) {
    const prelim = findPrelim(ctx.rounds);
    if (!prelim?.isActive && !prelim?.is_active && !roundIsActive(prelim)) {
      return { pass: false, reason: 'prelim should be active' };
    }
    await apiRequest('PATCH', `/hackathons/${ctx.id}/lottery`, {
      token: ctx.coordToken,
      body: { roundId: prelim.id },
      expectErrorCode: 'ROUND_ALREADY_ACTIVE',
    });
    return { pass: true };
  },

  async 'seal-fall-ongoing-2026'(ctx) {
    const h = ctx.hackathon;
    const season = h.season || h.Season;
    if (season !== 'Fall' && season !== 'FALL') {
      return { pass: false, reason: `expected season Fall, got ${season}` };
    }
    const prelim = findPrelim(ctx.rounds);
    if (prelim && roundIsActive(prelim)) {
      return { pass: false, reason: 'prelim should be inactive for track select' };
    }
    const tracks = await apiRequest('GET', `/hackathons/${ctx.id}/tracks`, { token: ctx.coordToken });
    const trackList = Array.isArray(tracks) ? tracks : tracks?.items || [];
    if (trackList.length === 0) {
      return { pass: false, reason: 'no tracks for Fall hackathon' };
    }
    const studentToken = await login('student.fall.t01.leader@fpt.edu.vn', STUDENT_PASSWORD);
    const teams = await apiRequest('GET', '/me/teams', { token: studentToken });
    const teamList = Array.isArray(teams) ? teams : teams?.items || [];
    const team = teamList.find((t) => String(t.hackathonId) === String(ctx.id));
    if (!team) return { pass: false, reason: 'fall leader team not found' };
    if (team.trackId != null) {
      return { pass: false, reason: 'leader should not have track yet (FR-U-15-F)' };
    }
    return { pass: true };
  },

  async 'seal-fall-2025-finished'(ctx) {
    const studentToken = await login('student.archive.fall2025@fpt.edu.vn', STUDENT_PASSWORD);
    const awards = await apiRequest('GET', '/me/annual-awards?year=2025', { token: studentToken });
    const list = Array.isArray(awards) ? awards : awards?.items || [];
    if (list.length === 0) {
      return { pass: false, reason: 'expected non-empty annual awards for archive student' };
    }
    return { pass: true };
  },

  async 'seal-gd3-mentor-track-only'(ctx) {
    const mentorEmail = 'mentor.trackonly@fpt.edu.vn';
    const mentorToken = await login(mentorEmail, process.env.E2E_MENTOR_PASSWORD || 'Mentor@dev1');
    const trackAssignments = await apiRequest('GET', '/me/mentor-track-assignments', { token: mentorToken });
    const tracks = Array.isArray(trackAssignments) ? trackAssignments : trackAssignments?.items || [];
    if (tracks.length === 0) {
      return { pass: false, reason: 'expected mentor track assignments' };
    }
    const rounds = await apiRequest('GET', '/me/mentor/rounds', { token: mentorToken });
    const roundList = Array.isArray(rounds) ? rounds : rounds?.items || [];
    if (roundList.length > 0) {
      return { pass: false, reason: 'expected empty mentor rounds (track-only bootstrap)' };
    }
    return { pass: true };
  },

  async 'seal-gd3-scoring-gate'(ctx) {
    const prelim = findPrelim(ctx.rounds);
    if (!prelim) return { pass: false, reason: 'no prelim round' };
    const tracks = await apiRequest('GET', `/hackathons/${ctx.id}/tracks`, { token: ctx.coordToken });
    const trackList = Array.isArray(tracks) ? tracks : tracks?.items || [];
    const track = trackList[0];
    if (!track?.id) return { pass: false, reason: 'no track' };
    const queue = await apiRequest('GET', `/presentation/queue?roundId=${prelim.id}&trackId=${track.id}`, {
      token: ctx.coordToken,
    });
    const slots = extractQueueItems(queue);
    const hasWaiting = slots.some((s) => isQueueStatus(s, 'WAITING'));
    const hasPresenting = slots.some((s) => isQueueStatus(s, 'PRESENTING'));
    if (!hasWaiting || !hasPresenting) {
      return {
        pass: false,
        reason: 'expected PRESENTING + WAITING slots',
        detail: `waiting=${hasWaiting} presenting=${hasPresenting}`,
      };
    }
    return { pass: true };
  },

  async 'seal-gd3-team-mentor-history'(ctx) {
    const teams = await apiRequest('GET', `/teams?hackathonId=${ctx.id}`, { token: ctx.coordToken });
    const teamList = Array.isArray(teams) ? teams : teams?.items || [];
    const team = teamList.find((t) => /GD3-MH-T01/i.test(String(t.teamName || t.team_name || '')));
    if (!team?.id) return { pass: false, reason: 'seed team GD3-MH-T01 not found' };
    const mentors = await apiRequest('GET', `/teams/${team.id}/mentors`, { token: ctx.coordToken });
    const items = Array.isArray(mentors) ? mentors : mentors?.items || [];
    if (items.length < 2) {
      return { pass: false, reason: `expected ≥2 mentor history rows, got ${items.length}` };
    }
    return { pass: true };
  },

  async 'seal-gd4-ck-unpublished'(ctx) {
    const finalRound = findFinal(ctx.rounds);
    if (!finalRound) return { pass: false, reason: 'no final round' };
    await apiRequest('PATCH', `/rounds/${finalRound.id}/activate`, {
      token: ctx.coordToken,
      expectErrorCode: 'RESULT_NOT_PUBLISHED',
    });
    return { pass: true };
  },

  async 'seal-gd5-edge-errors'(ctx) {
    const finalRound = findFinal(ctx.rounds);
    if (!finalRound) return { pass: false, reason: 'no final round' };
    if (finalRound.isActive || finalRound.is_active || roundIsActive(finalRound)) {
      return { pass: false, reason: 'CK should be inactive' };
    }
    const studentToken = await login('student.gd5e.leader01@fpt.edu.vn', STUDENT_PASSWORD);
    const teams = await apiRequest('GET', '/me/teams', { token: studentToken });
    const teamList = Array.isArray(teams) ? teams : teams?.items || [];
    const team = teamList.find((t) => String(t.hackathonId) === String(ctx.id) || t.hackathon?.id === ctx.id);
    if (!team) return { pass: false, reason: 'student team not found' };
    const teamId = team.id || team.teamId;
    await apiMultipartRequest('/submissions', {
      token: studentToken,
      fields: {
        teamId,
        roundId: finalRound.id,
        repoUrl: 'https://github.com/octocat/Hello-World',
      },
      expectErrorCode: 'ROUND_NOT_ACTIVE',
    });
    return { pass: true };
  },
};

/** @type {Record<string, { status?: string, prelimActive?: boolean, prelimLocked?: boolean, finalActive?: boolean, ckInactive?: boolean }>} */
const BASE_EXPECTATIONS = {
  'seal-e2e-2026': { status: 'ONGOING' },
  'seal-fall-2025-finished': { status: 'FINISHED' },
  'seal-gd1-incomplete': { status: 'DRAFT' },
  'seal-gd1-no-kickoff': { status: 'DRAFT' },
  'seal-gd1-no-awards': { status: 'ONGOING' },
  'seal-gd1-judge-final-early': { status: 'ONGOING' },
  'seal-gd1-event-order-bad': { status: 'ONGOING' },
  'seal-gd1-event-order-violation': { status: 'ONGOING' },
  'seal-gd1-prelim-only': { status: 'DRAFT' },
  'seal-gd2-teams-edge': { status: 'ONGOING' },
  'seal-gd2-registration-closed': { status: 'ONGOING' },
  'seal-gd2-lottery-not-locked': { status: 'ONGOING' },
  'seal-gd2-round-active': { status: 'ONGOING', prelimActive: true },
  'seal-fall-ongoing-2026': { status: 'ONGOING' },
  'seal-gd3-prelim-open': { status: 'ONGOING', prelimActive: true },
  'seal-gd3-late-review': { status: 'ONGOING', prelimActive: true },
  'seal-gd3-scoring-live': { status: 'ONGOING', prelimActive: true },
  'seal-gd3-scoring-gate': { status: 'ONGOING', prelimActive: true },
  'seal-gd3-tiebreak-hybrid': { status: 'ONGOING', prelimActive: false, prelimLocked: true },
  'seal-gd3-edge-errors': { status: 'ONGOING', prelimActive: false },
  'seal-gd3-calibration-timer': { status: 'ONGOING', prelimActive: true },
  'seal-gd3-judge-mentor-conflict': { status: 'ONGOING', prelimActive: true },
  'seal-gd3-round-config-edge': { status: 'ONGOING' },
  'seal-gd3-no-lottery': { status: 'ONGOING' },
  'seal-gd3-mentor-portal': { status: 'ONGOING', prelimActive: true },
  'seal-gd3-mentor-track-only': { status: 'ONGOING' },
  'seal-gd3-team-mentor-history': { status: 'ONGOING', prelimActive: true },
  'seal-gd4-advance-ready': { status: 'ONGOING', prelimLocked: true },
  'seal-gd4-ck-unpublished': { status: 'ONGOING', prelimLocked: true },
  'seal-gd4-published': { status: 'ONGOING', prelimLocked: true },
  'seal-gd4-tiebreak-gate': { status: 'ONGOING', prelimLocked: true },
  'seal-gd4-ck-activate-ready': { status: 'ONGOING', prelimLocked: true },
  'seal-gd4-edge-errors': { status: 'ONGOING', prelimLocked: true },
  'seal-gd4-wildcard-resolved': { status: 'ONGOING', prelimLocked: true },
  'seal-gd4-tiebreak-resolved': { status: 'ONGOING', prelimLocked: true },
  'seal-gd4-wildcard-disabled': { status: 'ONGOING', prelimLocked: true },
  'seal-gd4-judge-assign-warnings': { status: 'ONGOING', prelimLocked: true },
  'seal-gd4-ck-no-criteria': { status: 'ONGOING', prelimLocked: true },
  'seal-gd5-final-active': { status: 'ONGOING', finalActive: true },
  'seal-gd5-submit-open': { status: 'ONGOING', finalActive: true },
  'seal-gd5-scoring-live': { status: 'ONGOING', finalActive: true },
  'seal-gd5-calibration-timer': { status: 'ONGOING', finalActive: true },
  'seal-gd5-edge-errors': { status: 'ONGOING', ckInactive: true },
  'seal-gd5-late-hardlock': { status: 'ONGOING', finalActive: true },
  'seal-gd5-judge-edge': { status: 'ONGOING' },
  'seal-gd5-late-pending': { status: 'ONGOING', finalActive: true },
  'seal-gd5-not-advanced': { status: 'ONGOING', finalActive: true },
  'seal-gd6-pending-confirm': { status: 'PENDING_CONFIRM' },
  'seal-gd6-prizes-empty': { status: 'PENDING_CONFIRM' },
  'seal-gd6-confirm-ready': { status: 'PENDING_CONFIRM' },
  'seal-gd6-finished-export': { status: 'FINISHED' },
  'seal-gd6-edge-errors': { status: 'PENDING_CONFIRM' },
  'seal-gd6-prize-duplicate': { status: 'PENDING_CONFIRM' },
};

/**
 * @typedef {object} ProbeContext
 * @property {number|string} id
 * @property {string} slug
 * @property {string} coordToken
 * @property {object[]} rounds
 * @property {object} hackathon
 */

/** @param {ProbeContext} ctx */
async function probeBaseExpectations(ctx) {
  const exp = BASE_EXPECTATIONS[ctx.slug];
  if (!exp) {
    return { pass: false, reason: 'no base expectation defined' };
  }

  const status = ctx.hackathon.status;
  if (exp.status && status !== exp.status) {
    return { pass: false, reason: `status expected ${exp.status}, got ${status}` };
  }

  const prelim = findPrelim(ctx.rounds);
  const finalRound = findFinal(ctx.rounds);

  if (exp.prelimActive != null && prelim) {
    const active = roundIsActive(prelim);
    if (active !== exp.prelimActive) {
      return { pass: false, reason: `prelim.is_active expected ${exp.prelimActive}, got ${active}` };
    }
  }

  if (exp.prelimLocked != null && prelim) {
    const locked = roundIsScoringLocked(prelim);
    if (locked !== exp.prelimLocked) {
      return { pass: false, reason: `prelim.scoring_locked expected ${exp.prelimLocked}, got ${locked}` };
    }
  }

  if (exp.finalActive != null && finalRound) {
    const active = roundIsActive(finalRound);
    if (active !== exp.finalActive) {
      return { pass: false, reason: `final.is_active expected ${exp.finalActive}, got ${active}` };
    }
  }

  if (exp.ckInactive && finalRound) {
    if (roundIsActive(finalRound)) {
      return { pass: false, reason: 'CK should be inactive' };
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

  /** @type {ProbeContext} */
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

  const custom = CUSTOM_PROBES[slug];
  if (custom) {
    const customResult = await custom(ctx);
    if (!customResult.pass) {
      return { slug, ...customResult };
    }
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
