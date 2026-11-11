import {
  courseCreationSchema,
  courseListSchema,
  courseResultSchema,
  verifiedCoursesSchema,
  type CreateCourse,
} from '../../../shared/courses';
import { BoundaryError } from '../../../shared/instructor-contracts/schema';

function responseError(status: number) {
  return new BoundaryError(
    status === 401
      ? 'UNAUTHENTICATED'
      : status === 403
        ? 'FORBIDDEN'
        : status === 404
          ? 'NOT_FOUND'
          : status === 409
            ? 'IDEMPOTENCY_CONFLICT'
            : status === 400
              ? 'INVALID_CONTRACT'
              : status === 429
                ? 'RATE_LIMITED'
                : 'UPSTREAM_UNAVAILABLE',
  );
}

export async function courseRequest(
  path: string,
  csrf?: string,
  input?: CreateCourse,
) {
  const response = await fetch('/api/courses' + path, {
    method: input ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: input
      ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' }
      : {},
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  if (!response.ok) throw responseError(response.status);
  return response.json() as Promise<unknown>;
}
export const courseClient = {
  list: async () => courseListSchema.parse(await courseRequest('')).courses,
  selected: async (id: string) =>
    courseResultSchema.parse(await courseRequest('/' + encodeURIComponent(id)))
      .course,
  eligibility: async () =>
    courseCreationSchema.parse(await courseRequest('/creation')).canCreate,
  create: async (input: CreateCourse, csrf: string) =>
    courseResultSchema.parse(await courseRequest('', csrf, input)).course,
  verify: async (ids: string[], csrf: string) => {
    const response = await fetch('/api/courses/contexts/verify', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw responseError(response.status);
    return verifiedCoursesSchema.parse(await response.json()).courses;
  },
};
