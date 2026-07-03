import { test, expect } from '@playwright/test';

async function importApiHelpers() {
  return import(`./helpers/api.js?ts=${Date.now()}-${Math.random()}`);
}

test.describe('E2E api helpers', () => {
  test('waitForBackendReady retries login until accessToken is available', async () => {
    const calls = [];
    const originalFetch = global.fetch;
    global.fetch = async (url, options = {}) => {
      calls.push({ url, options });
      if (calls.length < 3) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ message: 'warming up' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { accessToken: 'token-123' } }),
      };
    };

    try {
      const { waitForBackendReady } = await importApiHelpers();
      await expect(waitForBackendReady({
        email: 'coord@fpt.edu.vn',
        password: 'Coordinator@dev1',
        timeoutMs: 100,
        intervalMs: 1,
      })).resolves.toBe(true);
      expect(calls).toHaveLength(3);
      expect(calls.at(-1)?.url).toContain('/auth/login');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('waitForSeedSlug polls hackathon list until target slug exists', async () => {
    const originalFetch = global.fetch;
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            items: attempts < 3 ? [] : [{ id: 99, slug: 'seal-gd5-final-active' }],
          },
        }),
      };
    };

    try {
      const { waitForSeedSlug } = await importApiHelpers();
      await expect(waitForSeedSlug('seal-gd5-final-active', 'bearer-token', {
        timeoutMs: 100,
        intervalMs: 1,
      })).resolves.toEqual({ id: 99, slug: 'seal-gd5-final-active' });
      expect(attempts).toBe(3);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('waitForLoginToken returns accessToken after transient failures', async () => {
    const originalFetch = global.fetch;
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      if (attempts < 3) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ message: 'temporary auth error' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { accessToken: 'token-xyz' } }),
      };
    };

    try {
      const { waitForLoginToken } = await importApiHelpers();
      await expect(waitForLoginToken('coord@fpt.edu.vn', 'Coordinator@dev1', {
        timeoutMs: 100,
        intervalMs: 1,
      })).resolves.toBe('token-xyz');
      expect(attempts).toBe(3);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
