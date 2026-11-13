import {
  progressViewSchema,
  type ProgressView,
} from '../../shared/student-progress';
import { REQUEST_TIMEOUT_MS } from './work-model';

/**
 * student-progress SP-09: the browser client for one course's progress. Every response is parsed
 * closed; a body that fails validation is treated as unavailable and never rendered.
 */
export type ProgressErrorKind =
  | 'session'
  | 'unavailable'
  | 'invalid'
  | 'stale'
  | 'rate-limited'
  | 'ai-disabled'
  | 'rejected'
  | 'service'
  | 'network';

export class ProgressError extends Error {
  constructor(
    readonly kind: ProgressErrorKind,
    readonly retryAfterSeconds = 0,
  ) {
    super('Progress request failed.');
  }
}

/** UI-08: one truthful sentence per failure; no provider details. */
export const progressFailureText: Record<ProgressErrorKind, string> = {
  session: 'Your session has ended. Sign in again to continue.',
  unavailable: 'This is not available to you.',
  invalid: 'The request could not be sent. Reload the page and try again.',
  stale:
    'Your released feedback changed while the explanation was being prepared. Reload to see the current evidence.',
  'rate-limited': 'Too many requests. Wait a moment before trying again.',
  'ai-disabled': 'Progress explanations are not available right now.',
  rejected:
    'The explanation did not pass our checks, so it is not shown. You can try again.',
  service:
    'The explanation service is not available right now. Try again later.',
  network: 'This could not be loaded. Check your connection and try again.',
};

type Fetcher = typeof fetch;

async function failure(response: Response): Promise<ProgressError> {
  const s = response.status;
  if (s === 401) return new ProgressError('session');
  if (s === 403 || s === 404) return new ProgressError('unavailable');
  if (s === 400) return new ProgressError('invalid');
  if (s === 409) return new ProgressError('stale');
  if (s === 429) {
    const seconds = Number(response.headers.get('Retry-After'));
    return new ProgressError(
      'rate-limited',
      Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 300) : 60,
    );
  }
  let code: unknown;
  try {
    code = ((await response.json()) as { error?: { code?: unknown } }).error
      ?.code;
  } catch {
    code = undefined;
  }
  if (code === 'AI_DISABLED') return new ProgressError('ai-disabled');
  if (code === 'INVALID_CONTRACT') return new ProgressError('rejected');
  return new ProgressError(s === 503 ? 'service' : 'network');
}

export function progressApi(
  fetcher: Fetcher = (...a) => fetch(...a),
  csrf: () => string = () => '',
) {
  async function call(
    method: 'GET' | 'POST',
    courseId: string,
    signal?: AbortSignal,
    body?: unknown,
  ): Promise<ProgressView> {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS * 4);
    signal?.addEventListener('abort', () => timeout.abort());
    let response: Response;
    try {
      response = await fetcher(
        '/api/student/courses/' + encodeURIComponent(courseId) + '/progress',
        {
          method,
          credentials: 'same-origin',
          cache: 'no-store',
          signal: timeout.signal,
          headers:
            method === 'GET'
              ? {}
              : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf() },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ProgressError('network');
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw await failure(response);
    let value: ProgressView;
    try {
      value = progressViewSchema.parse(await response.json());
    } catch {
      throw new ProgressError('unavailable');
    }
    // Bind the response to the requested course.
    if (value.courseId !== courseId) throw new ProgressError('unavailable');
    return value;
  }
  return {
    view: (courseId: string, signal: AbortSignal) =>
      call('GET', courseId, signal),
    generate: (courseId: string, idempotencyKey: string) =>
      call('POST', courseId, undefined, { idempotencyKey }),
  };
}
