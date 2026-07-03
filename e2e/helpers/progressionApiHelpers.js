const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';

export function isMutatingEnabled() {
  return process.env.E2E_MUTATING === '1';
}

async function apiRequest(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || json?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = json?.error?.code;
    throw err;
  }
  return json?.data ?? json;
}

export async function getHackathon(hackathonId, token) {
  return apiRequest('GET', `/hackathons/${hackathonId}`, { token });
}

export async function getRoundRanking(roundId, token) {
  return apiRequest('GET', `/rounds/${roundId}/ranking`, { token });
}

export async function getTiebreak(roundId, token) {
  return apiRequest('GET', `/rounds/${roundId}/tiebreak`, { token });
}

export async function getWildcardCandidates(roundId, token) {
  return apiRequest('GET', `/rounds/${roundId}/wildcard-candidates`, { token });
}

export async function getPrizes(hackathonId, token) {
  return apiRequest('GET', `/hackathons/${hackathonId}/prizes`, { token });
}

export async function getReadiness(hackathonId, target, token) {
  return apiRequest('GET', `/hackathons/${hackathonId}/readiness?target=${target}`, { token });
}

export async function findFinalRound(hackathonId, token) {
  const rounds = await apiRequest('GET', `/hackathons/${hackathonId}/rounds`, { token });
  const list = Array.isArray(rounds) ? rounds : rounds?.items || [];
  return list.find((r) => r.isFinal || r.is_final) || null;
}

export async function publishRound(roundId, token) {
  return apiRequest('PATCH', `/rounds/${roundId}/publish`, { token });
}

export async function advanceRound(roundId, payload, token) {
  return apiRequest('POST', `/rounds/${roundId}/advance`, { token, body: payload });
}

export { apiRequest };
