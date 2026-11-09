import {
  BoundaryError,
  assert,
  toSafeError,
} from '../../shared/instructor-contracts/schema';
import { studentCursor } from '../../shared/student-assignments';
import { authHeaders } from '../auth/routes';
import type { TrustedPrincipal } from '../instructor/ports/contracts';
import type { StudentAssignments } from './repository';

/** Minimal session port so the handler depends only on trusted SH-AUTH resolution. */
export interface StudentSessions {
  requireSession(request: Request): Promise<{ principal: TrustedPrincipal }>;
}

const statusOf = (code: string) =>
  code === 'INVALID_CONTRACT'
    ? 400
    : code === 'UNAUTHENTICATED'
      ? 401
      : code === 'NOT_FOUND' || code === 'FORBIDDEN'
        ? 404
        : code === 'RATE_LIMITED'
          ? 429
          : 503;

/**
 * SD-01–04, AUTH-01–03: read-only student dashboard API.
 * Denied and missing objects share one non-enumerating 404 response.
 */
export async function studentHandler(
  request: Request,
  sessions: StudentSessions,
  reads: StudentAssignments,
): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: authHeaders });
  try {
    if (request.method !== 'GET') throw new BoundaryError('NOT_FOUND');
    const url = new URL(request.url);
    const listing =
      /^\/api\/student\/courses\/([A-Za-z0-9_-]{1,128})\/assignments$/.exec(
        url.pathname,
      );
    const overview =
      /^\/api\/student\/publications\/([A-Za-z0-9_-]{1,128})$/.exec(
        url.pathname,
      );
    if (!listing && !overview) throw new BoundaryError('NOT_FOUND');
    const { principal } = await sessions.requireSession(request);
    const keys = [...url.searchParams.keys()];
    if (listing) {
      assert(
        keys.every((key) => key === 'cursor') && keys.length <= 1,
        '$',
        'query',
      );
      const raw = url.searchParams.get('cursor');
      const cursor = raw === null ? null : studentCursor(raw);
      return json(await reads.list(principal, listing[1], cursor));
    }
    assert(keys.length === 0, '$', 'query');
    return json(await reads.publication(principal, overview![1]));
  } catch (error) {
    const code =
      error instanceof BoundaryError ? error.code : 'UPSTREAM_UNAVAILABLE';
    // FORBIDDEN is reported as NOT_FOUND so course/version existence is not revealed.
    const safe = toSafeError(
      code === 'FORBIDDEN' ? new BoundaryError('NOT_FOUND') : error,
      crypto.randomUUID(),
    );
    return json(safe, statusOf(code));
  }
}
