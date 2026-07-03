/**
 * Negative abuse probes — gọi API sai → expect ErrorCode (không mutate dữ liệu).
 * Chạy qua probe-seeds.mjs cùng slug/account probes.
 */
const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const JUDGE_PASSWORD = process.env.E2E_JUDGE_PASSWORD || 'Judge@dev1';

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
    throw new Error(json?.error?.message || `HTTP ${res.status}`);
  }
  return json?.data ?? json;
}

async function login(email, password) {
  const data = await apiRequest('POST', '/auth/login', { body: { email, password } });
  return data.accessToken;
}

async function findHackathonBySlug(slug, token) {
  const list = await apiRequest('GET', '/hackathons?size=60', { token });
  const items = Array.isArray(list) ? list : list?.items || [];
  return items.find((h) => h.slug === slug) || null;
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

/** @type {Record<string, () => Promise<void>>} */
const NEGATIVE_PROBES = {
  async 'team-on-draft'() {
    const orphanToken = await login('student.e2e.orphan1@fpt.edu.vn', STUDENT_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const draft = await findHackathonBySlug('seal-gd1-incomplete', coordToken);
    if (!draft?.id) throw new Error('seal-gd1-incomplete not found');
    await apiRequest('POST', '/me/teams', {
      token: orphanToken,
      body: { hackathonId: draft.id, teamName: 'Probe Draft Team' },
      expectErrorCode: 'HACKATHON_NOT_ONGOING',
    });
  },

  async 'user-in-another-team'() {
    const studentToken = await login('student.e2e.t01.leader@fpt.edu.vn', STUDENT_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-e2e-2026', coordToken);
    if (!hackathon?.id) throw new Error('seal-e2e-2026 not found');
    await apiRequest('POST', '/me/teams', {
      token: studentToken,
      body: { hackathonId: hackathon.id, teamName: 'Probe Second Team' },
      expectErrorCode: 'USER_IN_ANOTHER_TEAM',
    });
  },

  async 'registration-elsewhere'() {
    const studentToken = await login('student.e2e.t01.leader@fpt.edu.vn', STUDENT_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const target = await findHackathonBySlug('seal-gd3-prelim-open', coordToken);
    if (!target?.id) throw new Error('seal-gd3-prelim-open not found');
    await apiRequest('POST', `/me/hackathons/${target.id}/register`, {
      token: studentToken,
      expectErrorCode: 'REGISTRATION_ALREADY_ACTIVE_ELSEWHERE',
    });
  },

  async 'invalid-repo-platform'() {
    const studentToken = await login('student.gd3.leader06@fpt.edu.vn', STUDENT_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd3-prelim-open', coordToken);
    if (!hackathon?.id) throw new Error('seal-gd3-prelim-open not found');
    const teams = await apiRequest('GET', '/me/teams', { token: studentToken });
    const teamList = Array.isArray(teams) ? teams : teams?.items || [];
    const team = teamList.find((t) => String(t.hackathonId) === String(hackathon.id));
    const teamId = team?.id || team?.teamId;
    const trackId = team?.trackId || team?.track_id;
    if (!teamId) throw new Error('gd3 leader06 team not found');
    const rounds = await apiRequest('GET', `/hackathons/${hackathon.id}/rounds`, { token: coordToken });
    const prelim = findPrelim(Array.isArray(rounds) ? rounds : []);
    if (!prelim?.id) throw new Error('prelim round not found');
    await apiMultipartRequest('/submissions', {
      token: studentToken,
      fields: {
        teamId,
        roundId: prelim.id,
        trackId,
        repoUrl: 'https://drive.google.com/file/d/probe-invalid-repo',
      },
      expectErrorCode: 'INVALID_REPO_PLATFORM',
    });
  },

  async 'scoring-not-open'() {
    const judgeToken = await login('judge1@fpt.edu.vn', JUDGE_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd3-scoring-gate', coordToken);
    if (!hackathon?.id) throw new Error('seal-gd3-scoring-gate not found');
    const rounds = await apiRequest('GET', `/hackathons/${hackathon.id}/rounds`, { token: coordToken });
    const roundList = Array.isArray(rounds) ? rounds : [];
    const prelim = findPrelim(roundList);
    if (!prelim?.id) throw new Error('prelim not found');
    const tracks = await apiRequest('GET', `/hackathons/${hackathon.id}/tracks`, { token: coordToken });
    const trackList = Array.isArray(tracks) ? tracks : tracks?.items || [];
    const track = trackList[0];
    if (!track?.id) throw new Error('track not found');
    const queue = await apiRequest('GET', `/presentation/queue?roundId=${prelim.id}&trackId=${track.id}`, {
      token: coordToken,
    });
    const slots = extractQueueItems(queue);
    const waiting = slots.find((s) => isQueueStatus(s, 'WAITING'));
    if (!waiting) throw new Error('no WAITING slot in seal-gd3-scoring-gate');
    const submissionId = waiting.submissionId ?? waiting.submission_id;
    if (!submissionId) throw new Error('WAITING slot missing submissionId');
    const criteria = await apiRequest('GET', `/tracks/${track.id}/criteria`, { token: judgeToken });
    const critList = Array.isArray(criteria) ? criteria : criteria?.items || [];
    const criterion = critList[0];
    if (!criterion?.id) throw new Error('no criteria on track');
    await apiRequest('POST', '/scores', {
      token: judgeToken,
      body: { submissionId, criterionId: criterion.id, scoreValue: 7.5, scoreType: 'NORMAL' },
      expectErrorCode: 'SCORING_NOT_OPEN',
    });
  },

  async 'archived-mutation'() {
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const archived = await findHackathonBySlug('seal-fall-2025-finished', coordToken);
    if (!archived?.id) throw new Error('seal-fall-2025-finished not found');
    const eventEnd = archived.eventEnd || archived.event_end || '2025-11-15';
    await apiRequest('POST', `/hackathons/${archived.id}/events`, {
      token: coordToken,
      body: {
        type: 'WORKSHOP',
        title: 'Probe archived mutation',
        location: 'Hall',
        startsAt: `${eventEnd}T09:00:00`,
        endsAt: `${eventEnd}T11:00:00`,
      },
      expectErrorCode: 'HACKATHON_ARCHIVED',
    });
  },

  async 'oauth-token-invalid'() {
    await apiRequest('POST', '/auth/oauth/google', {
      body: { idToken: 'probe-invalid-oauth-token-00000000' },
      expectErrorCode: 'OAUTH_TOKEN_INVALID',
    });
  },

  async 'duplicate-email'() {
    await apiRequest('POST', '/auth/register', {
      body: {
        fullName: 'Probe Duplicate',
        email: COORD_EMAIL,
        password: 'ProbeDup@12345',
        confirmPassword: 'ProbeDup@12345',
      },
      expectErrorCode: 'ACCOUNT_DUPLICATE_EMAIL',
    });
  },

  async 'invalid-credentials'() {
    await apiRequest('POST', '/auth/login', {
      body: { email: COORD_EMAIL, password: 'WrongPassword@probe1' },
      expectErrorCode: 'INVALID_CREDENTIALS',
    });
  },

  async 'forbidden-wrong-role'() {
    const studentToken = await login('student.e2e.t01.leader@fpt.edu.vn', STUDENT_PASSWORD);
    await apiRequest('GET', '/users/lookup/coordinator?q=probe', {
      token: studentToken,
      expectErrorCode: 'FORBIDDEN',
    });
  },

  async 'scoring-locked'() {
    const judgeToken = await login('judge1@fpt.edu.vn', JUDGE_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd3-tiebreak-hybrid', coordToken);
    if (!hackathon?.id) throw new Error('seal-gd3-tiebreak-hybrid not found');
    const rounds = await apiRequest('GET', `/hackathons/${hackathon.id}/rounds`, { token: coordToken });
    const prelim = findPrelim(Array.isArray(rounds) ? rounds : []);
    if (!prelim?.id) throw new Error('prelim not found');
    if (!prelim.scoringLocked && !prelim.scoring_locked) {
      throw new Error('expected prelim scoringLocked=true on seal-gd3-tiebreak-hybrid');
    }
    const tracks = await apiRequest('GET', `/hackathons/${hackathon.id}/tracks`, { token: coordToken });
    const trackList = Array.isArray(tracks) ? tracks : tracks?.items || [];
    const track = trackList[0];
    if (!track?.id) throw new Error('track not found');
    const queue = await apiRequest('GET', `/presentation/queue?roundId=${prelim.id}&trackId=${track.id}`, {
      token: coordToken,
    });
    const slots = extractQueueItems(queue);
    const slot = slots.find((s) => s.submissionId ?? s.submission_id);
    if (!slot) throw new Error('no submission slot on tiebreak-hybrid');
    const submissionId = slot.submissionId ?? slot.submission_id;
    const criteria = await apiRequest('GET', `/tracks/${track.id}/criteria`, { token: judgeToken });
    const critList = Array.isArray(criteria) ? criteria : criteria?.items || [];
    const criterion = critList[0];
    if (!criterion?.id) throw new Error('no criteria on track');
    await apiRequest('POST', '/scores', {
      token: judgeToken,
      body: { submissionId, criterionId: criterion.id, scoreValue: 8, scoreType: 'NORMAL' },
      expectErrorCode: 'SCORING_LOCKED',
    });
  },

  async 'email-verification-token-invalid'() {
    await apiRequest('POST', '/auth/verify-email', {
      body: { token: 'probe-invalid-email-verification-token' },
      expectErrorCode: 'EMAIL_VERIFICATION_TOKEN_INVALID',
    });
  },

  async 'journey-idor'() {
    const studentToken = await login('student.e2e.t01.leader@fpt.edu.vn', STUDENT_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd3-prelim-open', coordToken);
    if (!hackathon?.id) throw new Error('seal-gd3-prelim-open not found');
    const teams = await apiRequest('GET', `/teams?hackathonId=${hackathon.id}`, { token: coordToken });
    const teamList = Array.isArray(teams) ? teams : teams?.items || [];
    const foreignTeam = teamList[0];
    if (!foreignTeam?.id) throw new Error('no team on seal-gd3-prelim-open');
    await apiRequest('GET', `/teams/${foreignTeam.id}/journey`, {
      token: studentToken,
      expectErrorCode: 'FORBIDDEN',
    });
  },

  async 'queue-cross-hackathon'() {
    const studentToken = await login('student.e2e.t01.leader@fpt.edu.vn', STUDENT_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug('seal-gd3-scoring-gate', coordToken);
    if (!hackathon?.id) throw new Error('seal-gd3-scoring-gate not found');
    const rounds = await apiRequest('GET', `/hackathons/${hackathon.id}/rounds`, { token: coordToken });
    const prelim = findPrelim(Array.isArray(rounds) ? rounds : []);
    if (!prelim?.id) throw new Error('prelim not found');
    await apiRequest('GET', `/presentation/queue?roundId=${prelim.id}`, {
      token: studentToken,
      expectErrorCode: 'FORBIDDEN',
    });
  },

  /** Fall lane — SV Spring không thuộc kỳ Fall không được chọn track Fall */
  async 'fall-track-cross-season'() {
    const studentToken = await login('student.e2e.t01.leader@fpt.edu.vn', STUDENT_PASSWORD);
    const coordToken = await login(COORD_EMAIL, COORD_PASSWORD);
    const fall = await findHackathonBySlug('seal-fall-ongoing-2026', coordToken);
    if (!fall?.id) throw new Error('seal-fall-ongoing-2026 not found');
    const tracks = await apiRequest('GET', `/hackathons/${fall.id}/tracks`, { token: coordToken });
    const trackList = Array.isArray(tracks) ? tracks : tracks?.items || [];
    const track = trackList[0];
    if (!track?.id) throw new Error('fall track not found');
    await apiRequest('POST', `/me/tracks/${track.id}/select`, {
      token: studentToken,
      expectErrorCode: 'NOT_APPLICABLE',
    });
  },
};

/**
 * @returns {Promise<{ key: string, pass: boolean, reason?: string }[]>}
 */
export async function probeNegatives() {
  const results = [];
  for (const [key, fn] of Object.entries(NEGATIVE_PROBES)) {
    try {
      await fn();
      results.push({ key, pass: true });
    } catch (err) {
      results.push({ key, pass: false, reason: err.message });
    }
  }
  return results;
}

export const NEGATIVE_PROBE_KEYS = Object.keys(NEGATIVE_PROBES);
