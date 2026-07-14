/**
 * Module 4 — Permission / IDOR helpers (API + STOMP deny).
 * STOMP: ERROR frame via onStompError (không assert disconnect — Rủi ro 1).
 */
import { expect } from '@playwright/test';
import { login, findHackathonBySlug, findPrelimRound, getRounds } from './api.js';
import {
  connectStomp,
  disposeStomp,
  presentationQueueTopic,
} from './stompPresentationHelpers.js';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';

export const ROLES = {
  student: {
    email: process.env.E2E_STUDENT_EMAIL || 'student.e2e.t01.leader@fpt.edu.vn',
    password: process.env.E2E_STUDENT_PASSWORD || 'Student@dev1',
  },
  judge: {
    email: process.env.E2E_JUDGE_EMAIL || 'judge1@fpt.edu.vn',
    password: process.env.E2E_JUDGE_PASSWORD || 'Judge@dev1',
  },
  guest: {
    email: process.env.E2E_GUEST_EMAIL || 'guestjudge@gmail.com',
    password: process.env.E2E_GUEST_PASSWORD || 'GuestJudge@dev1',
  },
  coord: {
    email: process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn',
    password: process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1',
  },
};

export const DENY_CODES = [
  'FORBIDDEN',
  'CROSS_HACKATHON_VIOLATION',
  'JUDGE_NOT_ASSIGNED',
  'JUDGE_NOT_ASSIGNED_TO_TRACK',
  'NOT_TEAM_MEMBER',
  'ACCESS_DENIED',
  'NOT_TRACK_CONTROLLER',
  'NOT_ROUND_CONTROLLER',
];

/** @param {'student'|'judge'|'guest'|'coord'} role */
export async function loginRole(role) {
  const cred = ROLES[role];
  if (!cred) throw new Error(`Unknown role: ${role}`);
  return login(cred.email, cred.password);
}

export async function apiRaw(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return {
    res,
    json,
    data: json?.data ?? json,
    code: String(json?.error?.code || json?.code || ''),
    status: res.status,
  };
}

export async function apiMultipartRaw(path, { token, fields } = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields || {})) {
    if (value != null) form.append(key, String(value));
  }
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, { method: 'POST', headers, body: form });
  const json = await res.json().catch(() => ({}));
  return {
    res,
    json,
    data: json?.data ?? json,
    code: String(json?.error?.code || json?.code || ''),
    status: res.status,
  };
}

export function assertNever500(status, json, label = '') {
  expect(status, `${label} must not be 500: ${JSON.stringify(json)}`).not.toBe(500);
}

/**
 * @param {{ status: number, code?: string, json?: any }} result
 * @param {{ codes?: string[], statusMin?: number, statusMax?: number, label?: string }} [opts]
 */
export function assertDenied(result, opts = {}) {
  const {
    codes = DENY_CODES,
    statusMin = 400,
    statusMax = 499,
    label = 'deny',
  } = opts;
  const status = result.status ?? result.res?.status?.();
  const code = String(result.code || result.json?.error?.code || '');
  assertNever500(status, result.json, label);
  expect(status, `${label} status`).toBeGreaterThanOrEqual(statusMin);
  expect(status, `${label} status`).toBeLessThanOrEqual(statusMax);
  if (codes?.length) {
    const ok = codes.some((c) => code === c || code.includes(c));
    expect(
      ok,
      `${label}: expected code in [${codes.join(', ')}], got "${code}" status=${status} body=${JSON.stringify(result.json).slice(0, 400)}`,
    ).toBe(true);
  }
}

/** Coord positive — 2xx only. */
export function assertAllowed(result, label = 'allow') {
  const status = result.status ?? result.res?.status?.();
  assertNever500(status, result.json, label);
  expect(
    status >= 200 && status < 300,
    `${label}: expected 2xx, got ${status} ${JSON.stringify(result.json).slice(0, 400)}`,
  ).toBe(true);
}

export function extractQueueItems(queue) {
  if (!queue) return [];
  if (Array.isArray(queue.tracks)) {
    return queue.tracks.flatMap((t) => (Array.isArray(t.items) ? t.items : []));
  }
  return queue?.slots || queue?.items || (Array.isArray(queue) ? queue : []);
}

/**
 * Resolve foreign seed IDs for Module 4 matrix.
 * @param {string} coordToken
 */
export async function resolveForeignTargets(coordToken) {
  const pick = async (slug) => {
    const h = await findHackathonBySlug(slug, coordToken);
    if (!h?.id) return null;
    const prelim = await findPrelimRound(h.id, coordToken);
    const rounds = await getRounds(h.id, coordToken);
    const final =
      rounds.find((r) => r.isFinal || r.is_final) ||
      rounds.find((r) => /chung kết|final/i.test(String(r.name || ''))) ||
      null;
    return { hackathon: h, prelim, final, rounds };
  };

  const [prelimOpen, scoringLive, teamsEdge, lateReview, judgeEdge, scoringGate] =
    await Promise.all([
      pick('seal-gd3-prelim-open'),
      pick('seal-gd3-scoring-live'),
      pick('seal-gd2-teams-edge'),
      pick('seal-gd3-late-review'),
      pick('seal-gd5-judge-edge'),
      pick('seal-gd3-scoring-gate'),
    ]);

  return { prelimOpen, scoringLive, teamsEdge, lateReview, judgeEdge, scoringGate };
}

/**
 * First scorable submission + criterion from a round queue (coord view).
 */
export async function resolveScorableSlot(coordToken, roundId, trackId = null) {
  const qPath =
    trackId != null
      ? `/presentation/queue?roundId=${roundId}&trackId=${trackId}`
      : `/presentation/queue?roundId=${roundId}`;
  const queue = await apiRaw('GET', qPath, { token: coordToken });
  const items = extractQueueItems(queue.data);
  const slot = items.find((s) => s.submissionId ?? s.submission_id);
  if (!slot) return null;
  const submissionId = slot.submissionId ?? slot.submission_id;
  const tid = trackId ?? slot.trackId ?? slot.track_id;
  let criterionId = null;
  if (tid) {
    const crit = await apiRaw('GET', `/tracks/${tid}/criteria`, { token: coordToken });
    const list = Array.isArray(crit.data) ? crit.data : crit.data?.items || [];
    criterionId = list[0]?.id ?? null;
  }
  return { submissionId, trackId: tid, criterionId, slot };
}

/**
 * STOMP subscribe deny — ERROR frame within timeout (Rủi ro 1).
 * CONNECT may succeed; SUBSCRIBE must ERROR. Soft-pass forbidden.
 *
 * @param {{ token: string, destination: string, timeoutMs?: number }} opts
 */
export async function expectStompSubscribeDenied({
  token,
  destination,
  timeoutMs = 5_000,
} = {}) {
  if (!token) throw new Error('expectStompSubscribeDenied requires token');
  if (!destination) throw new Error('expectStompSubscribeDenied requires destination');

  const client = await connectStomp({ token });

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `STOMP subscribe still OK after ${timeoutMs}ms — security hole (no ERROR frame) dest=${destination}`,
          ),
        );
      }, timeoutMs);

      // Attach BEFORE subscribe (Rủi ro 1)
      client.onStompError = (frame) => {
        clearTimeout(timer);
        resolve(frame);
      };

      try {
        client.subscribe(destination, () => {
          clearTimeout(timer);
          reject(
            new Error(
              `SUBSCRIBE message callback fired — expected deny for ${destination}`,
            ),
          );
        });
      } catch (err) {
        clearTimeout(timer);
        // sync throw counts as deny
        resolve(err);
      }
    });
  } finally {
    await disposeStomp(client);
  }
}

export { presentationQueueTopic, disposeStomp, connectStomp, BE_BASE };
