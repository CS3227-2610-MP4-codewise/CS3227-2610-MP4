import { afterEach, expect, it, vi } from 'vitest';
import { courseClient, courseRequest } from './client';
afterEach(() => vi.unstubAllGlobals());
it.each([
  [401, 'UNAUTHENTICATED'],
  [403, 'FORBIDDEN'],
  [404, 'NOT_FOUND'],
  [503, 'UPSTREAM_UNAVAILABLE'],
  [429, 'RATE_LIMITED'],
])(
  'preserves %s recovery semantics across course and bulk verification reads',
  async (status, code) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: status as number })),
    );
    await expect(courseRequest('/contexts')).rejects.toMatchObject({ code });
    await expect(
      courseClient.verify(['course-a'], 'csrf'),
    ).rejects.toMatchObject({ code });
  },
);
it('keeps bulk verification same-origin, no-store and CSRF protected', async () => {
  const fetch = vi.fn(async () =>
    Response.json({ courses: [{ id: 'course-a', name: 'A' }] }),
  );
  vi.stubGlobal('fetch', fetch);
  expect(await courseClient.verify(['course-a'], 'csrf')).toEqual([
    { id: 'course-a', name: 'A' },
  ]);
  expect(fetch).toHaveBeenCalledWith(
    '/api/courses/contexts/verify',
    expect.objectContaining({
      credentials: 'same-origin',
      cache: 'no-store',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf' },
      body: JSON.stringify({ ids: ['course-a'] }),
    }),
  );
});
