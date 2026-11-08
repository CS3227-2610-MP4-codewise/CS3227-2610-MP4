import {
  BoundaryError,
  toSafeError,
} from '../../../shared/instructor-contracts/schema';
import { readJson } from '../assignments/http';
import type { AssessmentService } from './service';
export const ASSESSMENT_API = '/__assessment-preview/api';
export function assessmentHandler(
  service: AssessmentService,
  prefix = ASSESSMENT_API,
) {
  return async (request: Request) => {
    const headers = {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    const json = (v: unknown, status = 200) =>
      Response.json(v, { status, headers });
    try {
      await service.session(request);
      const url = new URL(request.url),
        path = url.pathname.startsWith(prefix + '/')
          ? url.pathname.slice(prefix.length)
          : '';
      if (path === '/assessments' && request.method === 'POST')
        return json(
          await service.create(request, await readJson(request)),
          201,
        );
      const match = path.match(
        /^\/assessments\/([^/]+)(?:\/(approve|release|withdraw|correct|audit|generate-ai|adopt-ai|ai-candidate))?$/,
      );
      if (!match) throw new BoundaryError('NOT_FOUND');
      const id = decodeURIComponent(match[1]),
        action = match[2];
      if (!action && request.method === 'GET')
        return json(
          await service.load(
            request,
            id,
            url.searchParams.get('cursor') ?? undefined,
            url.searchParams.get('revisionId') ?? undefined,
          ),
        );
      if (!action && request.method === 'PUT')
        return json(await service.save(request, id, await readJson(request)));
      if (action === 'audit' && request.method === 'GET')
        return json(
          await service.audit(
            request,
            id,
            url.searchParams.get('cursor') ?? undefined,
          ),
        );
      if (action === 'generate-ai' && request.method === 'POST')
        return json(
          await service.generateAI(request, id, await readJson(request)),
        );
      if (action === 'ai-candidate' && request.method === 'GET')
        return json(await service.recoverAI(request, id));
      if (action === 'adopt-ai' && request.method === 'POST')
        return json(
          await service.adoptAI(request, id, await readJson(request)),
        );
      if (request.method === 'POST' && action && action !== 'audit')
        return json(
          await service[
            action as 'approve' | 'release' | 'withdraw' | 'correct'
          ](request, id, await readJson(request)),
        );
      throw new BoundaryError('NOT_FOUND');
    } catch (error) {
      const safe = toSafeError(error, crypto.randomUUID()),
        code = safe.error.code;
      return json(
        safe,
        code === 'UNAUTHENTICATED'
          ? 401
          : code === 'FORBIDDEN'
            ? 403
            : code === 'NOT_FOUND'
              ? 404
              : code === 'INVALID_CONTRACT'
                ? 400
                : [
                      'REVISION_CONFLICT',
                      'IDEMPOTENCY_CONFLICT',
                      'STALE_EVIDENCE',
                    ].includes(code)
                  ? 409
                  : 503,
      );
    }
  };
}
