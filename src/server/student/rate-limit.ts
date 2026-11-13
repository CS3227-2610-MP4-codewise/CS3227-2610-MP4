import { BoundaryError } from '../../shared/instructor-contracts/schema';

/**
 * SW-11 / decision 13: per-student request rate. A rate, not an attempt cap (SW-07 keeps
 * unlimited attempts). Keyed by the authenticated account and the action, never the IP.
 */
export type StudentAction = 'save' | 'submit' | 'progress';
export const STUDENT_RATE_LIMITS: Record<StudentAction, number> = {
  save: 12,
  submit: 3,
  // student-progress SP-04: at most one model call per POST; the gateway adds provider quotas.
  progress: 3,
};
export const STUDENT_RATE_WINDOW_MS = 60_000;
export const STUDENT_RETRY_AFTER_SECONDS = 60;

export interface RateLimiter {
  /** Resolves when allowed; throws BoundaryError('RATE_LIMITED') when over the limit. */
  limit(action: StudentAction, accountId: string): Promise<void>;
}

/** Development and tests only: no limit. Production composes `d1RateLimiter`. */
export const unlimited: RateLimiter = { limit: async () => {} };

/**
 * Backed by the existing D1 limiter (`AuthStore.rate`, fixed 60 s buckets). The Workers Rate
 * Limiting binding was dropped on 2026-11-12: on the deployment account it refused nothing
 * (workflow/evidence/student-drafts/rate-limit.md).
 */
export function d1RateLimiter(store: {
  rate(key: string, limit: number, window?: number): Promise<void>;
}): RateLimiter {
  return {
    limit: (action, accountId) =>
      store.rate(
        `student-${action}:${accountId}`,
        STUDENT_RATE_LIMITS[action],
        STUDENT_RATE_WINDOW_MS,
      ),
  };
}

export const isRateLimited = (error: unknown) =>
  error instanceof BoundaryError && error.code === 'RATE_LIMITED';
