/**
 * Module 3 — STOMP presentation-queue after REST shuffle/advance/timer.
 * Revived on live seed seal-gd3-prelim-open (fresh queue each BE restart).
 * Connect via @stomp/stompjs + ws (no sockjs-client in Node).
 *
 * Run:
 *   E2E_MUTATING=1 npx playwright test e2e/websocket-queue-timer.spec.js --project=mutating-e2e --workers=1
 */
import { test, expect } from '@playwright/test';
import {
  findHackathonBySlug,
  findPrelimRound,
  isBackendReady,
  login,
} from './helpers/api.js';
import { isMutatingEnabled } from './helpers/progressionApiHelpers.js';
import {
  connectStomp,
  disposeStomp,
  subscribePresentationQueue,
  waitForQueueMessage,
  queuePhases,
  apiFetch,
} from './helpers/stompPresentationHelpers.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const SLUG = 'seal-gd3-prelim-open';

test.describe('WebSocket queue/timer STOMP', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  /** @type {any} */
  let ctx = {
    token: null,
    hackathonId: null,
    roundId: null,
    trackId: null,
    client: null,
  };

  test.beforeAll(async () => {
    expect(isMutatingEnabled(), 'E2E_MUTATING=1 required').toBeTruthy();
    const ready = await isBackendReady();
    expect(ready, 'BE not reachable').toBeTruthy();
    ctx.token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(SLUG, ctx.token);
    expect(hackathon?.id, `Seed ${SLUG} missing — restart BE`).toBeTruthy();
    ctx.hackathonId = hackathon.id;
    const prelim = await findPrelimRound(ctx.hackathonId, ctx.token);
    expect(prelim?.id, 'Prelim round missing').toBeTruthy();
    ctx.roundId = prelim.id;

    const tracks = await apiFetch('GET', `/rounds/${ctx.roundId}/tracks`, ctx.token);
    const list = Array.isArray(tracks.data) ? tracks.data : tracks.data?.items || [];
    ctx.trackId = list[0]?.id ?? null;
    expect(ctx.trackId, 'Track missing on prelim').toBeTruthy();
  });

  test.afterEach(async () => {
    await disposeStomp(ctx.client);
    ctx.client = null;
  });

  test('1) STOMP connect + subscribe round presentation-queue', async () => {
    ctx.client = await connectStomp({ token: ctx.token });
    expect(ctx.client.connected).toBeTruthy();
    const { messages, unsubscribe } = subscribePresentationQueue(ctx.client, {
      roundId: ctx.roundId,
      trackId: ctx.trackId,
    });
    expect(messages).toEqual([]);
    unsubscribe();
  });

  test('2) REST shuffle (or timer) ? STOMP broadcast with queue payload', async () => {
    ctx.client = await connectStomp({ token: ctx.token });
    const { messages, unsubscribe } = subscribePresentationQueue(ctx.client, {
      roundId: ctx.roundId,
      trackId: ctx.trackId,
    });

    // Small delay so subscription is active before mutate
    await new Promise((r) => setTimeout(r, 300));

    // Fresh seed: queue not shuffled ? shuffle creates the queue and broadcasts.
    const shuffle = await apiFetch('POST', `/presentation/queue/shuffle`, ctx.token, {
      roundId: ctx.roundId,
      trackIds: ctx.trackId != null ? [ctx.trackId] : undefined,
    });
    expect(shuffle.status, `shuffle must not 500: ${JSON.stringify(shuffle.json).slice(0, 300)}`).not.toBe(500);
    if (!shuffle.res.ok) {
      // Already shuffled by a previous run — nudge timer to force a broadcast.
      const q = new URLSearchParams({ roundId: String(ctx.roundId) });
      if (ctx.trackId != null) q.set('trackId', String(ctx.trackId));
      let action = await apiFetch('POST', `/presentation/timer/qa?${q}`, ctx.token, {});
      if (!action.res.ok) {
        action = await apiFetch('POST', `/presentation/timer/start?${q}`, ctx.token, {});
      }
      expect(action.status).not.toBe(500);
    }

    const msg = await waitForQueueMessage(
      messages,
      (m) => {
        const { phases, statuses } = queuePhases(m.body);
        return (
          phases.some((p) => /PRESENTING|QA|PAUSED|SETUP|ENDED|IDLE/i.test(p)) ||
          statuses.some((s) => /PRESENTING|WAITING|DONE/i.test(s)) ||
          Number(m.body?.roundId) === Number(ctx.roundId)
        );
      },
      25_000,
    );

    expect(msg.body).toBeTruthy();
    unsubscribe();
  });

  test('3) REST advance/timer mutations ? STOMP reflects updates', async () => {
    ctx.client = await connectStomp({ token: ctx.token });
    const { messages, unsubscribe } = subscribePresentationQueue(ctx.client, {
      roundId: ctx.roundId,
      trackId: ctx.trackId,
    });
    await new Promise((r) => setTimeout(r, 300));

    const q = new URLSearchParams({ roundId: String(ctx.roundId) });
    if (ctx.trackId != null) q.set('trackId', String(ctx.trackId));

    const before = messages.length;

    // Advance the queue so a team is PRESENTING (broadcasts), then start + pause timer.
    const next = await apiFetch(
      'PATCH',
      `/presentation/queue/next?roundId=${ctx.roundId}&trackId=${ctx.trackId}`,
      ctx.token,
      {},
    );
    expect(next.status, `queue/next must not 500: ${JSON.stringify(next.json).slice(0, 300)}`).not.toBe(500);

    const start = await apiFetch('POST', `/presentation/timer/start?${q}`, ctx.token, {});
    expect(start.status).not.toBe(500);
    const pause = await apiFetch('POST', `/presentation/timer/pause?${q}`, ctx.token, {});
    expect(pause.status).not.toBe(500);

    // At least one of the mutations above must have produced a broadcast.
    const anyMutationOk = next.res.ok || start.res.ok || pause.res.ok;
    expect(
      anyMutationOk,
      `all mutations rejected: next=${next.status} start=${start.status} pause=${pause.status}`,
    ).toBeTruthy();

    const msg = await waitForQueueMessage(messages, () => messages.length > before, 25_000);
    expect(msg).toBeTruthy();
    const { phases, statuses } = queuePhases(msg.body);
    expect(phases.length + statuses.length).toBeGreaterThan(0);
    unsubscribe();
  });
});
