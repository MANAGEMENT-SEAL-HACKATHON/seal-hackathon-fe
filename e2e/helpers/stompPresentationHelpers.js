/**
 * Module 3 — STOMP presentation-queue helpers for Playwright Node.
 * Uses @stomp/stompjs + `ws` polyfill (NOT sockjs-client — Rủi ro 1).
 */
import { Client } from '@stomp/stompjs';
import WebSocket from 'ws';
import { expect, request as playwrightRequest } from '@playwright/test';
import { login } from './api.js';

const BE_ORIGIN = (process.env.BE_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/api\/v1\/?$/, '');
const BE_BASE = process.env.BE_BASE_URL || 'http://localhost:8080/api/v1';
const WS_URL = process.env.E2E_WS_URL || `${BE_ORIGIN.replace(/^http/, 'ws')}/ws`;

/**
 * Connect STOMP over native WebSocket.
 * @param {{ token: string, onConnect?: () => void }} opts
 * @returns {Promise<import('@stomp/stompjs').Client>}
 */
export async function connectStomp({ token, onConnect } = {}) {
  if (!token) throw new Error('connectStomp requires Bearer token');

  const client = new Client({
    brokerURL: WS_URL,
    // Node: polyfill WebSocket via `ws` (Rủi ro 1)
    webSocketFactory: () => new WebSocket(WS_URL),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 0,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`STOMP connect timeout: ${WS_URL}`)), 20_000);
    client.onConnect = () => {
      clearTimeout(timer);
      onConnect?.();
      resolve();
    };
    client.onStompError = (frame) => {
      clearTimeout(timer);
      reject(new Error(`STOMP error: ${frame?.headers?.message || frame?.body || 'unknown'}`));
    };
    client.onWebSocketError = (err) => {
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    client.activate();
  });

  return client;
}

/** @param {import('@stomp/stompjs').Client | null | undefined} client */
export async function disposeStomp(client) {
  if (!client) return;
  try {
    await client.deactivate();
  } catch {
    // ignore
  }
}

export function presentationQueueTopic(roundId, trackId = null) {
  if (trackId != null) {
    return `/topic/rounds/${roundId}/tracks/${trackId}/presentation-queue`;
  }
  return `/topic/rounds/${roundId}/presentation-queue`;
}

/**
 * Subscribe queue topic(s); push parsed JSON bodies into `messages` array.
 * @returns {{ unsubscribe: () => void, messages: any[] }}
 */
export function subscribePresentationQueue(client, { roundId, trackId = null, messages = [] } = {}) {
  if (!client?.connected) throw new Error('STOMP client not connected');
  const topics = [presentationQueueTopic(roundId)];
  if (trackId != null) topics.push(presentationQueueTopic(roundId, trackId));

  const subs = topics.map((destination) =>
    client.subscribe(destination, (frame) => {
      let body = null;
      try {
        body = JSON.parse(frame.body);
      } catch {
        body = frame.body;
      }
      messages.push({ destination, body, at: Date.now() });
    }),
  );

  return {
    messages,
    unsubscribe: () => {
      for (const s of subs) {
        try {
          s.unsubscribe();
        } catch {
          // ignore
        }
      }
    },
  };
}

/**
 * Wait until a queued STOMP message matches predicate.
 * @param {any[]} messages
 * @param {(msg: { body: any }) => boolean} predicate
 * @param {number} [timeout]
 */
export async function waitForQueueMessage(messages, predicate, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const hit = messages.find((m) => {
      try {
        return predicate(m);
      } catch {
        return false;
      }
    });
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `waitForQueueMessage timeout after ${timeout}ms; got ${messages.length} msgs: ${JSON.stringify(messages).slice(0, 800)}`,
  );
}

/** Extract timer.phase / item statuses from PresentationQueueResponse-like body. */
export function queuePhases(body) {
  const tracks = body?.tracks || body?.groups || [];
  const phases = [];
  const statuses = [];
  for (const t of tracks) {
    for (const it of t.items || t.teams || []) {
      const st = String(it.status || it.queueStatus || '').toUpperCase();
      if (st) statuses.push(st);
      const phase = String(it.timer?.phase || it.timerPhase || '').toUpperCase();
      if (phase) phases.push(phase);
    }
  }
  return { phases, statuses };
}

/**
 * Fire the same mutating request from two independent Coord APIRequestContexts.
 * @returns {Promise<{ resA: import('@playwright/test').APIResponse, resB: import('@playwright/test').APIResponse, jsonA: any, jsonB: any, dispose: () => Promise<void> }>}
 */
export async function raceTwoCoordRequests(path, {
  method = 'POST',
  body = {},
  email = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn',
  password = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1',
} = {}) {
  const tokenA = await login(email, password);
  const tokenB = await login(email, password);

  const ctxA = await playwrightRequest.newContext({
    baseURL: BE_ORIGIN,
    extraHTTPHeaders: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
  });
  const ctxB = await playwrightRequest.newContext({
    baseURL: BE_ORIGIN,
    extraHTTPHeaders: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
  });

  const url = path.startsWith('/api/') ? path : `/api/v1${path.startsWith('/') ? path : `/${path}`}`;
  const opts = body != null ? { data: body } : undefined;

  let resA;
  let resB;
  try {
    if (method === 'PATCH') {
      [resA, resB] = await Promise.all([ctxA.patch(url, opts), ctxB.patch(url, opts)]);
    } else if (method === 'PUT') {
      [resA, resB] = await Promise.all([ctxA.put(url, opts), ctxB.put(url, opts)]);
    } else if (method === 'DELETE') {
      [resA, resB] = await Promise.all([ctxA.delete(url, opts), ctxB.delete(url, opts)]);
    } else {
      [resA, resB] = await Promise.all([ctxA.post(url, opts), ctxB.post(url, opts)]);
    }
  } catch (err) {
    await ctxA.dispose().catch(() => {});
    await ctxB.dispose().catch(() => {});
    throw err;
  }

  const jsonA = await resA.json().catch(() => ({}));
  const jsonB = await resB.json().catch(() => ({}));

  return {
    resA,
    resB,
    jsonA,
    jsonB,
    dispose: async () => {
      await ctxA.dispose();
      await ctxB.dispose();
    },
  };
}

/**
 * Rủi ro 2–3: exactly one 2xx winner; never 500; loser is 4xx business.
 * @param {import('@playwright/test').APIResponse} resA
 * @param {import('@playwright/test').APIResponse} resB
 * @param {any} jsonA
 * @param {any} jsonB
 * @param {RegExp | string[]} [allowedLoserCodes]
 */
export function assertOneWinnerNo500(resA, resB, jsonA, jsonB, allowedLoserCodes = null) {
  const sA = resA.status();
  const sB = resB.status();
  expect(sA, `A status must not be 500: ${JSON.stringify(jsonA)}`).not.toBe(500);
  expect(sB, `B status must not be 500: ${JSON.stringify(jsonB)}`).not.toBe(500);

  const oks = [
    { res: resA, json: jsonA, status: sA },
    { res: resB, json: jsonB, status: sB },
  ].filter((x) => x.status >= 200 && x.status < 300);

  expect(
    oks.length,
    `Expected exactly 1 success (Lost Update if 2). A=${sA} B=${sB} jsonA=${JSON.stringify(jsonA)} jsonB=${JSON.stringify(jsonB)}`,
  ).toBe(1);

  const loser = [resA, resB].find((r) => !(r.status() >= 200 && r.status() < 300));
  expect(loser).toBeTruthy();
  expect(loser.status()).toBeGreaterThanOrEqual(400);
  expect(loser.status()).toBeLessThan(500);

  if (allowedLoserCodes) {
    const loserJson = loser === resA ? jsonA : jsonB;
    const code = String(loserJson?.error?.code || loserJson?.code || '');
    if (allowedLoserCodes instanceof RegExp) {
      expect(code).toMatch(allowedLoserCodes);
    } else {
      expect(allowedLoserCodes.map(String)).toContain(code);
    }
  }
}

/** Convenience REST via fetch (coord token). */
export async function apiFetch(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BE_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, data: json?.data ?? json, status: res.status };
}

export { BE_ORIGIN, BE_BASE, WS_URL };
