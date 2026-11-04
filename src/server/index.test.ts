import { describe, expect, it, vi } from 'vitest';
import worker from './index';
import type { Environment } from './environment';

function environment(databaseFails = false): Environment {
  return {
    APP_ENV: 'staging',
    APP_VERSION: 'test-version',
    DB: {
      prepare: () => ({
        first: async () => {
          if (databaseFails) throw new Error('private-provider-detail');
          return { value: '1' };
        },
      }),
    } as unknown as D1Database,
    ASSETS: {
      fetch: vi.fn(async () => new Response('<html>shell</html>')),
    } as unknown as Fetcher,
  };
}

describe('deployment and API boundaries (OPS-03, AUTH-02 foundation)', () => {
  it('reports the deployed revision and verifies schema readiness', async () => {
    const response = await worker.fetch(
      new Request('https://example.test/api/health'),
      environment(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'ok',
      environment: 'staging',
      version: 'test-version',
      database: 'ok',
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('fails health without leaking database error details', async () => {
    const response = await worker.fetch(
      new Request('https://example.test/api/health'),
      environment(true),
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private-provider-detail');
  });

  it.each(['/api/submissions/another-user', '/api/instructor', '/api'])(
    'never serves SPA HTML or feature data at %s',
    async (path) => {
      const env = environment();
      const response = await worker.fetch(
        new Request(`https://example.test${path}`),
        env,
      );
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({
        error: { code: 'NOT_FOUND' },
      });
      expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    },
  );

  it('adds content restrictions to the app shell', async () => {
    const response = await worker.fetch(
      new Request('https://example.test/'),
      environment(),
    );
    expect(response.headers.get('Content-Security-Policy')).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
