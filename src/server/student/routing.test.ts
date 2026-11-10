import { describe, expect, it } from 'vitest';
import { createApplication } from '../index';
import type { Environment } from '../environment';

/** AUTH-01: the composed Worker exposes the new student routes only behind authentication. */
const env = {
  APP_ENV: 'staging',
  APP_VERSION: 't',
  DB: {
    prepare: () => {
      throw new Error('database must not be reached without a session');
    },
  } as unknown as D1Database,
  ASSETS: { fetch: async () => new Response('shell') } as unknown as Fetcher,
} as Environment;

describe('student work routing in the composed Worker', () => {
  it('answers unauthenticated reads and writes without touching storage', async () => {
    const app = createApplication();
    for (const [method, path] of [
      ['GET', '/api/student/publications/p/work'],
      ['PUT', '/api/student/drafts/q'],
      ['POST', '/api/student/publications/p/drafts/move'],
      ['POST', '/api/student/publications/p/attempts'],
      ['GET', '/api/student/publications/p/attempts'],
      ['GET', '/api/student/attempts/a'],
    ]) {
      const res = await app.fetch(
        new Request('https://app.example.test' + path, { method }),
        env,
      );
      expect(res.status).toBe(401);
      expect(res.headers.get('cache-control')).toBe('no-store');
      expect(res.headers.get('content-type')).toContain('json');
    }
  });
});
