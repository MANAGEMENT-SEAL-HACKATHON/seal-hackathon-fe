/**
 * Module 5 — Secondary portal helpers (matchmaking / invite / RBL / profile).
 * Profile: only fullName + finally restore (Rủi ro 2).
 * Invite: ACCEPTED or TEAM_MEMBER_FULL (Rủi ro 3).
 */
import { expect } from '@playwright/test';
import { login, findHackathonBySlug, findPrelimRound } from './api.js';

const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';

export const M5 = {
  orphan1: {
    email: 'student.e2e.orphan1@fpt.edu.vn',
    password: process.env.E2E_STUDENT_PASSWORD || 'Student@dev1',
  },
  pendingInvitee: {
    email: 'student.gd2.pending@gmail.com',
    password: process.env.E2E_STUDENT_PASSWORD || 'Student@dev1',
  },
  t02Leader: {
    email: 'student.gd2.hn.leader02@fpt.edu.vn',
    password: process.env.E2E_STUDENT_PASSWORD || 'Student@dev1',
  },
  t01Leader: {
    email: 'student.gd2.hcm.leader01@fpt.edu.vn',
    password: process.env.E2E_STUDENT_PASSWORD || 'Student@dev1',
  },
  poolBusy: {
    email: 'student.gd2.pool.busy@gmail.com',
    password: process.env.E2E_STUDENT_PASSWORD || 'Student@dev1',
  },
  profileStudent: {
    email: process.env.E2E_STUDENT_EMAIL || 'student.e2e.t01.leader@fpt.edu.vn',
    password: process.env.E2E_STUDENT_PASSWORD || 'Student@dev1',
  },
  coord: {
    email: process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn',
    password: process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1',
  },
};

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
    message: json?.message || json?.error?.message || '',
  };
}

export function assertNever500(status, json, label = '') {
  expect(status, `${label} must not be 500: ${JSON.stringify(json)}`).not.toBe(500);
}

export async function loginCred(cred) {
  return login(cred.email, cred.password);
}

export async function getMe(token) {
  return apiRaw('GET', '/users/me', { token });
}

export async function listMatchmaking(token, hackathonId) {
  return apiRaw('GET', `/teams/hackathons/${hackathonId}/matchmaking`, { token });
}

export async function listOrphans(token, hackathonId) {
  return apiRaw('GET', `/teams/hackathons/${hackathonId}/orphans`, { token });
}

export async function inviteMember(token, teamId, email) {
  return apiRaw('POST', `/teams/${teamId}/members/invite`, {
    token,
    body: { email },
  });
}

export async function respondInvite(token, teamId, userId, action) {
  return apiRaw('PATCH', `/teams/${teamId}/members/${userId}`, {
    token,
    body: { action },
  });
}

export async function getRblProgress(token, roundId) {
  return apiRaw('GET', `/rounds/${roundId}/rbl/progress`, { token });
}

export async function getRblVariance(token, roundId) {
  return apiRaw('GET', `/rounds/${roundId}/rbl/variance`, { token });
}

/**
 * Accept invite outcome: success ACCEPTED (2xx) OR TEAM_MEMBER_FULL / conflict (Rủi ro 3).
 */
export function assertInviteAcceptOutcome(result, label = 'invite accept') {
  assertNever500(result.status, result.json, label);
  const code = result.code;
  const ok =
    (result.status >= 200 && result.status < 300) ||
    ['TEAM_MEMBER_FULL', 'TEAM_FULL', 'USER_IN_ANOTHER_TEAM', 'INVALID_STATUS_TRANSITION'].includes(
      code,
    );
  expect(
    ok,
    `${label}: expected 2xx or TEAM_MEMBER_FULL/conflict, got ${result.status} ${code} ${JSON.stringify(result.json).slice(0, 300)}`,
  ).toBe(true);
}

/**
 * PATCH fullName with random suffix; always restore in finally (Rủi ro 2).
 * @param {string} token
 * @param {(tempName: string) => Promise<void>} fn
 */
export async function withPatchedFullName(token, fn) {
  const me = await getMe(token);
  const original = String(me.data?.fullName || me.data?.full_name || 'Student');
  const suffix = ` · m5-${Date.now().toString(36)}`;
  const tempName = `${original}${suffix}`.slice(0, 200);

  try {
    const patched = await apiRaw('PATCH', '/users/me', {
      token,
      body: { fullName: tempName },
    });
    assertNever500(patched.status, patched.json, 'patchMe temp');
    expect(patched.status).toBeGreaterThanOrEqual(200);
    expect(patched.status).toBeLessThan(300);
    const after = await getMe(token);
    expect(String(after.data?.fullName || '')).toBe(tempName);
    await fn(tempName);
  } finally {
    const restored = await apiRaw('PATCH', '/users/me', {
      token,
      body: { fullName: original },
    });
    assertNever500(restored.status, restored.json, 'patchMe restore');
    const check = await getMe(token);
    expect(
      String(check.data?.fullName || ''),
      `fullName must restore to original after Module 5 profile test`,
    ).toBe(original);
  }
}

/** Find team by name substring on hackathon. */
export async function findTeamByName(coordToken, hackathonId, nameRe) {
  const teams = await apiRaw('GET', `/teams?hackathonId=${hackathonId}&size=100`, {
    token: coordToken,
  });
  const list = Array.isArray(teams.data) ? teams.data : teams.data?.items || [];
  return (
    list.find((t) => nameRe.test(String(t.teamName || t.name || ''))) ||
    null
  );
}

export { findHackathonBySlug, findPrelimRound, BE_BASE };
