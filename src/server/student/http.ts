import {
  BoundaryError,
  ContractError,
  assert,
  toSafeError,
  type Schema,
} from '../../shared/instructor-contracts/schema';
import { studentCursor } from '../../shared/student-assignments';
import { STUDENT_RETRY_AFTER_SECONDS } from './rate-limit';
import {
  MAX_SAVE_BODY_BYTES,
  MAX_SUBMIT_BODY_BYTES,
  draftSaveRequestSchema,
  assignmentStatusIds,
  historyCursor,
  moveRequestSchema,
  submitRequestSchema,
} from '../../shared/student-work';
import { authHeaders } from '../auth/routes';
import type { TrustedPrincipal } from '../instructor/ports/contracts';
import type { StudentAssignments } from './repository';
import { StudentWorkError, type StudentWork } from './work';
import { StudentFeedback, type StudentReleasePort } from './feedback';

/** Minimal session port so the handler depends only on trusted SH-AUTH resolution. */
export interface StudentSessions {
  requireSession(request: Request): Promise<{ principal: TrustedPrincipal }>;
  /** Origin and CSRF check; required for every mutation. Absent means mutations fail closed. */
  requireMutationOrigin?(request: Request): Promise<void>;
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
          : code === 'CONFLICT_REVISION' ||
              code === 'STALE_PUBLICATION' ||
              code === 'DEADLINE_PASSED' ||
              code === 'STALE_FEEDBACK' ||
              code === 'IDEMPOTENCY_MISMATCH'
            ? 409
            : 503;

const id = '([A-Za-z0-9_-]{1,128})';
const route = (path: string) => new RegExp('^/api/student/' + path + '$');
const routes = {
  listing: route(`courses/${id}/assignments`),
  status: route(`courses/${id}/assignment-status`),
  overview: route(`publications/${id}`),
  work: route(`publications/${id}/work`),
  move: route(`publications/${id}/drafts/move`),
  attempts: route(`publications/${id}/attempts`),
  draft: route(`drafts/${id}`),
  attempt: route(`attempts/${id}`),
  feedback: route(`attempts/${id}/feedback`),
  feedbackVersion: route(`attempts/${id}/feedback/([1-9][0-9]{0,8})`),
};

/** Reads at most `max` bytes of a JSON body; larger bodies fail before parsing. */
async function boundedJson<T>(
  request: Request,
  max: number,
  parser: Schema<T>,
): Promise<T> {
  const reader = request.body?.getReader();
  if (!reader) throw new ContractError('$', 'json');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > max) {
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
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(buffer),
    );
  } catch {
    throw new ContractError('$', 'json');
  }
  return parser.parse(value);
}

/**
 * SD-01–04, SW-01–SW-08, AUTH-01–03: student dashboard and working-copy API.
 * Denied and missing objects share one non-enumerating 404 response; every response is no-store.
 */
export async function studentHandler(
  request: Request,
  sessions: StudentSessions,
  reads: StudentAssignments,
  work?: StudentWork,
  /** SF-01, design D3: the composed C-REL producer for this request; absent means 503. */
  feedback?: (request: Request) => StudentReleasePort,
): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers:
        status === 429
          ? {
              ...authHeaders,
              'Retry-After': String(STUDENT_RETRY_AFTER_SECONDS),
            }
          : authHeaders,
    });
  try {
    const url = new URL(request.url);
    const match = (name: keyof typeof routes) =>
      routes[name].exec(url.pathname);
    const mutation = request.method !== 'GET';
    const listing = match('listing'),
      overview = match('overview'),
      status = match('status');
    const workRoute = match('work'),
      move = match('move'),
      attempts = match('attempts'),
      draft = match('draft'),
      attempt = match('attempt'),
      feedbackRoute = match('feedback'),
      feedbackVersion = match('feedbackVersion');
    const known =
      (request.method === 'GET' &&
        (listing ||
          overview ||
          status ||
          workRoute ||
          attempts ||
          attempt ||
          feedbackRoute ||
          feedbackVersion)) ||
      (request.method === 'PUT' && draft) ||
      (request.method === 'POST' && (move || attempts));
    if (!known) throw new BoundaryError('NOT_FOUND');
    if (mutation) {
      if (!sessions.requireMutationOrigin)
        throw new BoundaryError('UNAUTHENTICATED');
      await sessions.requireMutationOrigin(request);
    }
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
    if (overview) {
      assert(keys.length === 0, '$', 'query');
      return json(await reads.publication(principal, overview[1]));
    }
    if (!work) throw new BoundaryError('NOT_FOUND');
    if (workRoute) {
      assert(keys.length === 0, '$', 'query');
      return json(await work.work(principal, workRoute[1]));
    }
    if (draft) {
      assert(keys.length === 0, '$', 'query');
      const body = await boundedJson(
        request,
        MAX_SAVE_BODY_BYTES,
        draftSaveRequestSchema,
      );
      return json(await work.save(principal, draft[1], body));
    }
    if (move) {
      assert(keys.length === 0, '$', 'query');
      const body = await boundedJson(
        request,
        MAX_SUBMIT_BODY_BYTES,
        moveRequestSchema,
      );
      return json(await work.move(principal, move[1], body));
    }
    if (attempts && mutation) {
      assert(keys.length === 0, '$', 'query');
      const body = await boundedJson(
        request,
        MAX_SUBMIT_BODY_BYTES,
        submitRequestSchema,
      );
      const result = await work.submit(principal, attempts[1], body);
      return json(result, result.replayed ? 200 : 201);
    }
    if (status) {
      // AS-02: session (above), then course membership in SQL; only repeated `id` keys.
      assert(
        keys.length > 0 && keys.every((key) => key === 'id'),
        '$',
        'query',
      );
      const ids = assignmentStatusIds(url.searchParams.getAll('id'));
      const port = feedback?.(request);
      const releases = new StudentFeedback(work);
      return json(
        await work.assignmentStatus(principal, status[1], ids, (attemptIds) =>
          releases.released(principal, attemptIds, port),
        ),
      );
    }
    if (attempts) {
      assert(
        keys.every((key) => key === 'cursor') && keys.length <= 1,
        '$',
        'query',
      );
      const raw = url.searchParams.get('cursor');
      const port = feedback?.(request);
      const releases = new StudentFeedback(work);
      return json(
        await work.history(
          principal,
          attempts[1],
          raw === null ? null : historyCursor(raw),
          (ids) => releases.released(principal, ids, port),
        ),
      );
    }
    if (feedbackRoute || feedbackVersion) {
      // SF-01: session (above), then own attempt, then the producer; no caching anywhere.
      assert(keys.length === 0, '$', 'query');
      const releases = new StudentFeedback(work);
      const port = () => feedback?.(request);
      return json(
        feedbackRoute
          ? await releases.summary(principal, feedbackRoute[1], port())
          : await releases.version(
              principal,
              feedbackVersion![1],
              Number(feedbackVersion![2]),
              port(),
            ),
      );
    }
    assert(keys.length === 0, '$', 'query');
    return json(await work.attempt(principal, attempt![1]));
  } catch (error) {
    if (error instanceof StudentWorkError) {
      const requestId = crypto.randomUUID();
      const base = {
        code: error.code,
        message: 'Operation could not be completed.',
        requestId,
      };
      return json(
        error.current
          ? { schemaVersion: 1, error: base, current: error.current }
          : { error: base },
        statusOf(error.code),
      );
    }
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
