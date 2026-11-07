import {
  courseCreationSchema,
  courseListSchema,
  courseResultSchema,
  type CreateCourse,
} from '../../../shared/courses';
import { BoundaryError } from '../../../shared/instructor-contracts/schema';

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
  if (!response.ok)
    throw new BoundaryError(
      response.status === 401
        ? 'UNAUTHENTICATED'
        : response.status === 403
          ? 'FORBIDDEN'
          : response.status === 409
            ? 'IDEMPOTENCY_CONFLICT'
            : response.status === 400
              ? 'INVALID_CONTRACT'
              : response.status === 429
                ? 'RATE_LIMITED'
                : 'UPSTREAM_UNAVAILABLE',
    );
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
};
