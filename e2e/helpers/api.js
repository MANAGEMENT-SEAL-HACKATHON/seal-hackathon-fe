const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export async function login(email, password) {
  const data = await apiRequest('POST', '/auth/login', { body: { email, password } });
  return data.accessToken;
}

export async function waitForLoginToken(email, password, {
  timeoutMs = 90_000,
  intervalMs = 2_000,
} = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    try {
      const token = await login(email, password);
      if (token) {
        return token;
      }
    } catch {
      // Keep polling until auth is ready.
    }

    if (Date.now() + intervalMs > deadline) {
      break;
    }
    await sleep(intervalMs);
  }

  return null;
}

export async function waitForBackendReady({
  email = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn',
  password = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1',
  timeoutMs = 90_000,
  intervalMs = 2_000,
} = {}) {
  const token = await waitForLoginToken(email, password, { timeoutMs, intervalMs });
  return Boolean(token);
}

export async function findHackathonBySlug(slug, token) {
  const data = await apiRequest('GET', '/hackathons?size=200', { token });
  const items = Array.isArray(data) ? data : data?.items || [];
  return items.find((h) => h.slug === slug) || null;
}

export async function waitForSeedSlug(slug, token, {
  timeoutMs = 90_000,
  intervalMs = 2_000,
} = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    try {
      const hackathon = await findHackathonBySlug(slug, token);
      if (hackathon) {
        return hackathon;
      }
    } catch {
      // Keep polling while seed list is still warming up.
    }

    if (Date.now() + intervalMs > deadline) {
      break;
    }
    await sleep(intervalMs);
  }

  return null;
}

export async function getRounds(hackathonId, token) {
  const data = await apiRequest('GET', `/hackathons/${hackathonId}/rounds`, { token });
  return Array.isArray(data) ? data : data?.items || [];
}

export async function findPrelimRound(hackathonId, token) {
  const rounds = await getRounds(hackathonId, token);
  const final = findFinalRoundFromList(rounds);
  return (
    rounds.find((r) => {
      const name = String(r.name || '');
      if (final && r.id === final.id) return false;
      if (/chung kết|final/i.test(name)) return false;
      if (r.isFinal || r.is_final) return false;
      return true;
    }) || rounds[0] || null
  );
}

function findFinalRoundFromList(rounds) {
  return (
    rounds.find((r) => r.isFinal || r.is_final) ||
    rounds.find((r) => /chung kết|final/i.test(String(r.name || ''))) ||
    null
  );
}

export async function findFinalRound(hackathonId, token) {
  const rounds = await getRounds(hackathonId, token);
  return findFinalRoundFromList(rounds);
}

export async function isBackendReady() {
  return waitForBackendReady();
}

/**
 * Poll until all slugs exist or timeout. Returns list of slugs still missing.
 * @param {string[]} slugs
 * @param {string} token
 */
export async function waitForAllSeedSlugs(slugs, token, {
  timeoutMs = 180_000,
  intervalMs = 2_000,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  const pending = new Set(slugs);

  while (pending.size > 0 && Date.now() <= deadline) {
    for (const slug of [...pending]) {
      try {
        const hackathon = await findHackathonBySlug(slug, token);
        if (hackathon) {
          pending.delete(slug);
        }
      } catch {
        // Keep polling.
      }
    }

    if (pending.size === 0) {
      break;
    }

    if (Date.now() + intervalMs > deadline) {
      break;
    }
    await sleep(intervalMs);
  }

  return [...pending];
}

export async function getHackathon(hackathonId, token) {
  return apiRequest('GET', `/hackathons/${hackathonId}`, { token });
}
