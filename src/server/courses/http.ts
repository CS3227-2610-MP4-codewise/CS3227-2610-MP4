import { createCourseSchema } from '../../shared/courses';
import {
  BoundaryError,
  assert,
  toSafeError,
} from '../../shared/instructor-contracts/schema';
import { authHeaders, readAuthBody } from '../auth/routes';
import type { ManagedAuthRoutes } from '../auth/managed-routes';
import type { ManagedStore } from '../auth/managed-store';
import type { CourseAuthority } from './authority';
import type { CourseCreation } from './creation';

export async function courseHandler(
  request: Request,
  auth: ManagedAuthRoutes,
  store: ManagedStore,
  authority: CourseAuthority,
  creation: CourseCreation,
) {
  const json = (body: unknown, status = 200, extra = {}) =>
    Response.json(body, { status, headers: { ...authHeaders, ...extra } });
  try {
    const { principal } = await auth.requireSession(request);
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/courses/creation')
      return json({ canCreate: await creation.canCreate(principal) });
    const selected = /^\/api\/courses\/([A-Za-z0-9_-]{1,128})$/.exec(
      url.pathname,
    );
    if (request.method === 'GET' && selected) {
      await authority.requireCourse(principal, selected[1], 'instructor-read');
      const course = await authority.get(principal, selected[1]);
      return json({ course });
    }
    if (request.method === 'GET' && url.pathname === '/api/courses')
      return json({ courses: await authority.list(principal) });
    if (request.method === 'POST' && url.pathname === '/api/courses') {
      await auth.requireMutationOrigin(request);
      const input = createCourseSchema.parse(await readAuthBody(request, 2048));
      assert(url.search === '', '$', 'query');
      await store.rate('course-create:' + principal.userId, 10);
      const result = await creation.create(principal, input);
      return json({ course: result.course }, result.created ? 201 : 200);
    }
    throw new BoundaryError('NOT_FOUND');
  } catch (error) {
    const code =
      error instanceof BoundaryError ? error.code : 'UPSTREAM_UNAVAILABLE';
    return json(
      toSafeError(error, crypto.randomUUID()),
      code === 'INVALID_CONTRACT'
        ? 400
        : code === 'UNAUTHENTICATED'
          ? 401
          : code === 'FORBIDDEN'
            ? 403
            : code === 'NOT_FOUND'
              ? 404
              : code === 'IDEMPOTENCY_CONFLICT'
                ? 409
                : code === 'RATE_LIMITED'
                  ? 429
                  : 503,
      code === 'RATE_LIMITED' ? { 'Retry-After': '60' } : {},
    );
  }
}
