import {
  BoundaryError,
  ContractError,
  toSafeError,
} from '../../../shared/instructor-contracts/schema';
import type { AssignmentService } from './service';
export const PREVIEW_API = '/__instructor-preview/api';
export async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ContractError('$', 'json');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 1048576) {
      await reader.cancel();
      throw new ContractError('$', 'size');
    }
    chunks.push(part.value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(buffer),
    ) as unknown;
  } catch {
    throw new ContractError('$', 'json');
  }
}
export function assignmentHandler(
  service: AssignmentService,
  base = PREVIEW_API,
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url),
      path = url.pathname.startsWith(base + '/')
        ? url.pathname.slice(base.length)
        : '';
    const json = (body: unknown, status = 200) =>
      Response.json(body, {
        status,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    try {
      await service.session(request);
      if (path === '/assignments' && request.method === 'GET')
        return json(
          await service.list(
            request,
            url.searchParams.get('courseId') ?? '',
            url.searchParams.get('cursor') ?? '',
          ),
        );
      if (path === '/assignments' && request.method === 'POST')
        return json(
          await service.create(request, await readJson(request)),
          201,
        );
      const draft = path.match(/^\/assignments\/([^/]+)\/draft$/);
      if (draft && request.method === 'GET')
        return json(await service.load(request, decodeURIComponent(draft[1])));
      if (draft && request.method === 'PUT')
        return json(
          await service.save(
            request,
            decodeURIComponent(draft[1]),
            await readJson(request),
          ),
        );
      const publish = path.match(/^\/assignments\/([^/]+)\/publish$/);
      if (publish && request.method === 'POST')
        return json(
          await service.publish(
            request,
            decodeURIComponent(publish[1]),
            await readJson(request),
          ),
        );
      const history = path.match(/^\/assignments\/([^/]+)\/publications$/);
      if (history && request.method === 'GET')
        return json(
          await service.history(request, decodeURIComponent(history[1])),
        );
      const version = path.match(/^\/publications\/([^/]+)(\/private)?$/);
      if (version && request.method === 'GET')
        return json(
          version[2]
            ? await service.privateVersion(
                request,
                decodeURIComponent(version[1]),
              )
            : await service.publicVersion(
                request,
                decodeURIComponent(version[1]),
              ),
        );
      throw new BoundaryError('NOT_FOUND');
    } catch (error) {
      const safe = toSafeError(error, crypto.randomUUID()),
        code = safe.error.code;
      const status =
        code === 'UNAUTHENTICATED'
          ? 401
          : code === 'FORBIDDEN'
            ? 403
            : code === 'NOT_FOUND'
              ? 404
              : code === 'INVALID_CONTRACT'
                ? 422
                : code === 'REVISION_CONFLICT' ||
                    code === 'IDEMPOTENCY_CONFLICT'
                  ? 409
                  : 503;
      return json(safe, status);
    }
  };
}
