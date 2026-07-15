import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const SILENT_MS = 5000;
const FALLBACK_POLL_MS = 3000;

function createFallbackController({ onFallbackPoll, now }) {
  let lastMessageAt = now();
  let fallbackIntervalId = null;
  let syncFallback = false;

  const stopFallback = () => {
    if (fallbackIntervalId != null) {
      clearInterval(fallbackIntervalId);
      fallbackIntervalId = null;
    }
    syncFallback = false;
  };

  const startFallback = () => {
    if (fallbackIntervalId != null) return;
    syncFallback = true;
    fallbackIntervalId = setInterval(() => {
      onFallbackPoll?.();
    }, FALLBACK_POLL_MS);
    onFallbackPoll?.();
  };

  return {
    markMessage() {
      lastMessageAt = now();
      stopFallback();
    },
    tickSilentCheck() {
      if (now() - lastMessageAt >= SILENT_MS) startFallback();
    },
    get syncFallback() {
      return syncFallback;
    },
    dispose() {
      stopFallback();
    },
  };
}

describe('WS timer sync fallback (T-04a/b/c)', () => {
  let realNow;
  let fakeNow;

  beforeEach(() => {
    realNow = Date.now;
    fakeNow = realNow();
    Date.now = () => fakeNow;
  });

  afterEach(() => {
    Date.now = realNow;
  });

  const advance = (ms) => {
    fakeNow += ms;
  };

  it('T-04a: shows fallback badge after 5s silent', () => {
    const ctrl = createFallbackController({ now: () => Date.now() });
    assert.equal(ctrl.syncFallback, false);
    advance(5000);
    ctrl.tickSilentCheck();
    assert.equal(ctrl.syncFallback, true);
    ctrl.dispose();
  });

  it('T-04b: polls while in fallback', async () => {
    let polls = 0;
    const ctrl = createFallbackController({
      onFallbackPoll: () => {
        polls += 1;
      },
      now: () => Date.now(),
    });
    advance(5000);
    ctrl.tickSilentCheck();
    assert.equal(polls, 1);
    await new Promise((r) => setTimeout(r, FALLBACK_POLL_MS + 50));
    assert.ok(polls >= 2);
    ctrl.dispose();
  });

  it('T-04c: WS message stops poll and clears badge', async () => {
    let polls = 0;
    const ctrl = createFallbackController({
      onFallbackPoll: () => {
        polls += 1;
      },
      now: () => Date.now(),
    });
    advance(5000);
    ctrl.tickSilentCheck();
    assert.equal(ctrl.syncFallback, true);
    const before = polls;
    ctrl.markMessage();
    assert.equal(ctrl.syncFallback, false);
    await new Promise((r) => setTimeout(r, FALLBACK_POLL_MS + 50));
    assert.equal(polls, before);
    ctrl.dispose();
  });
});
