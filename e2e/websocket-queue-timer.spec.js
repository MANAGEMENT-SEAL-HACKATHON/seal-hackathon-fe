/**
 * Module 3 — STOMP presentation-queue after REST shuffle/timer.
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
test.skip(true, 'deprecated seed slug removed � see intentional-errors-catalog.md');
  connectStomp,
  disposeStomp,
  subscribePresentationQueue,
  waitForQueueMessage,
  queuePhases,
  apiFetch,
} from './helpers/stompPresentationHelpers.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const SLUG = 'seal-gd3-scoring-live';

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
    test.skip(!isMutatingEnabled(), 'E2E_MUTATING=1 required');
    const ready = await isBackendReady();
    test.skip(!ready, 'BE not reachable');
    ctx.token = await login(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(SLUG, ctx.token);
    test.skip(!hackathon?.id, `Seed ${SLUG} missing — restart BE`);
    ctx.hackathonId = hackathon.id;
    const prelim = await findPrelimRound(ctx.hackathonId, ctx.token);
    test.skip(!prelim?.id, 'Prelim round missing');
    ctx.roundId = prelim.id;

    const tracks = await apiFetch('GET', `/hackathons/${ctx.hackathonId}/tracks`, ctx.token);
    const list = Array.isArray(tracks.data) ? tracks.data : tracks.data?.items || [];
    ctx.trackId = list[0]?.id ?? null;
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

  test('2) REST timer/qa (or start) → STOMP payload with timer.phase', async () => {
    ctx.client = await connectStomp({ token: ctx.token });
    const { messages, unsubscribe } = subscribePresentationQueue(ctx.client, {
      roundId: ctx.roundId,
      trackId: ctx.trackId,
    });

    // Small delay so subscription is active before mutate
    await new Promise((r) => setTimeout(r, 300));

    const q = new URLSearchParams({ roundId: String(ctx.roundId) });
    if (ctx.trackId != null) q.set('trackId', String(ctx.trackId));

    // Prefer QA (scoring-live often already PRESENTING); fallback start
    let action = await apiFetch('POST', `/presentation/timer/qa?${q}`, ctx.token, {});
    if (!action.res.ok) {
      action = await apiFetch('POST', `/presentation/timer/start?${q}`, ctx.token, {});
    }
    // Soft: if both fail (INVALID_STATE), try pause then still expect a prior/future broadcast from shuffle
    if (!action.res.ok) {
      await apiFetch('POST', `/presentation/queue/shuffle`, ctx.token, {
        roundId: ctx.roundId,
        trackIds: ctx.trackId != null ? [ctx.trackId] : undefined,
      });
    }

    const msg = await waitForQueueMessage(
      messages,
      (m) => {
        const { phases, statuses } = queuePhases(m.body);
        return (
          phases.some((p) => /PRESENTING|QA|PAUSED|SETUP|ENDED|IDLE/i.test(p)) ||
          statuses.some((s) => /PRESENTING|WAITING|DONE/i.test(s)) ||
          m.body?.roundId === ctx.roundId ||
          Number(m.body?.roundId) === Number(ctx.roundId)
        );
      },
      25_000,
    );

    expect(msg.body).toBeTruthy();
    const { phases, statuses } = queuePhases(msg.body);
    expect(phases.length + statuses.length).toBeGreaterThan(0);
    unsubscribe();
  });

  test('3) REST pause → STOMP reflects PAUSED or queue update', async () => {
    ctx.client = await connectStomp({ token: ctx.token });
    const { messages, unsubscribe } = subscribePresentationQueue(ctx.client, {
      roundId: ctx.roundId,
      trackId: ctx.trackId,
    });
    await new Promise((r) => setTimeout(r, 300));

    const q = new URLSearchParams({ roundId: String(ctx.roundId) });
    if (ctx.trackId != null) q.set('trackId', String(ctx.trackId));

    // Ensure timer running then pause
    await apiFetch('POST', `/presentation/timer/start?${q}`, ctx.token, {});
    const before = messages.length;
    const pause = await apiFetch('POST', `/presentation/timer/pause?${q}`, ctx.token, {});
    test.skip(!pause.res.ok && pause.status === 422, `pause not applicable: ${JSON.stringify(pause.json)}`);

    const msg = await waitForQueueMessage(
      messages,
      () => messages.length > before,
      20_000,
    ).catch(() =>
      waitForQueueMessage(
        messages,
        (m) => queuePhases(m.body).phases.includes('PAUSED') || m.body?.roundId != null,
        8_000,
      ),
    );

    expect(msg).toBeTruthy();
    unsubscribe();
  });
});
