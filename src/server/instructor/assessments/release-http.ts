import {
  BoundaryError,
  toSafeError,
} from '../../../shared/instructor-contracts/schema';
import type { IdentityCoursePort, ReleaseReadPort } from '../ports/contracts';

/** Request-bound C-REL projection. Missing and unauthorized assessments are indistinguishable. */
export async function releaseHandler(
  request: Request,
  identity: IdentityCoursePort,
  consumer: ReleaseReadPort,
) {
  try {
    const url = new URL(request.url);
    const match =
      /^\/api\/student\/released-feedback\/([A-Za-z0-9_-]{1,128})\/(currentness|[1-9][0-9]*)$/.exec(
        url.pathname,
      );
    if (request.method !== 'GET' || !match || url.search)
      throw new BoundaryError('NOT_FOUND');
    const principal = await identity.requireSession(request);
    const result =
      match[2] === 'currentness'
        ? await consumer.currentness(principal, match[1])
        : await consumer.getAuthorized(principal, match[1], Number(match[2]));
    return Response.json(result, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const safe = toSafeError(error, crypto.randomUUID());
    const code = safe.error.code;
    const status =
      code === 'UNAUTHENTICATED'
        ? 401
        : code === 'NOT_FOUND' || code === 'FORBIDDEN'
          ? 404
          : code === 'INVALID_CONTRACT'
            ? 400
            : code === 'STALE_EVIDENCE'
              ? 409
              : 503;
    if (status === 404) safe.error.code = 'NOT_FOUND';
    return Response.json(safe, {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
}
