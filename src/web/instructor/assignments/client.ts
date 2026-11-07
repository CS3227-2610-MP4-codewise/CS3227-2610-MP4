import {
  draftSchema,
  draftListSchema,
  historySchema,
  publicationResultSchema,
  privatePublicationSchema,
  type AssignmentClient,
} from '../../../shared/instructor-contracts/authoring';
import { safeErrorSchema } from '../../../shared/instructor-contracts/identity';
import { describeIssue } from './messages';
import { authRequest } from '../../auth/client';
import { authViewSchema } from '../../../shared/auth';
import { BoundaryError } from '../../../shared/instructor-contracts/schema';
function makeClient(
  base: string,
  courseId: string,
  live: boolean,
): AssignmentClient {
  async function call(
    path: string,
    method = 'GET',
    body?: unknown,
  ): Promise<unknown> {
    let csrf = '';
    if (live && method !== 'GET') {
      try {
        csrf = authViewSchema.parse(await authRequest('session')).csrfToken;
      } catch (error) {
        if (
          error instanceof BoundaryError &&
          error.code === 'UNAUTHENTICATED'
        ) {
          throw new Error(
            'Your session is unavailable. Sign in again to recover access.',
          );
        }
        throw new Error(
          'Could not verify your session. Your edits are retained; try again.',
        );
      }
    }
    const response = await fetch(base + path, {
      method,
      credentials: 'same-origin',
      headers: body
        ? {
            'Content-Type': 'application/json',
            ...(live ? { 'X-CSRF-Token': csrf } : {}),
          }
        : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new Error('Assignments are unavailable. Try again later.');
    }
    if (!response.ok) {
      const { error } = safeErrorSchema.parse(value);
      const text: Record<string, string> = {
        UNAUTHENTICATED: live
          ? 'Your session is unavailable. Sign in again to recover access.'
          : 'Your session is unavailable. Reopen the local preview to recover access.',
        FORBIDDEN: 'Access denied. Your edits remain in memory.',
        NOT_FOUND: 'This assignment is unavailable in your course.',
        REVISION_CONFLICT:
          'Save conflict: a newer draft exists. Your edits are still here. Copy what you need, then use Draft options to reload the saved draft.',
        IDEMPOTENCY_CONFLICT:
          'This publication retry no longer matches the saved revision.',
        INVALID_CONTRACT:
          error.issues?.map(describeIssue).join(' ') ??
          'Check the assignment fields and try again.',
      };
      throw new Error(
        text[error.code] ??
          'The request failed. Your edits are retained; try again.',
      );
    }
    return value;
  }
  return {
    async list(cursor = '') {
      return draftListSchema.parse(
        await call(
          '/assignments?courseId=' +
            encodeURIComponent(courseId) +
            '&cursor=' +
            encodeURIComponent(cursor),
        ),
      );
    },
    async create(requestKey) {
      return draftSchema.parse(
        await call('/assignments', 'POST', {
          courseId,
          requestKey,
        }),
      );
    },
    async load(id) {
      return draftSchema.parse(
        await call(`/assignments/${encodeURIComponent(id)}/draft`),
      );
    },
    async save(id, value) {
      return draftSchema.parse(
        await call(
          `/assignments/${encodeURIComponent(id)}/draft`,
          'PUT',
          value,
        ),
      );
    },
    async publish(id, value) {
      return publicationResultSchema.parse(
        await call(
          `/assignments/${encodeURIComponent(id)}/publish`,
          'POST',
          value,
        ),
      );
    },
    async history(id) {
      return historySchema.parse(
        await call(`/assignments/${encodeURIComponent(id)}/publications`),
      );
    },
    async snapshot(id) {
      return privatePublicationSchema.parse(
        await call(`/publications/${encodeURIComponent(id)}/private`),
      );
    },
  };
}
export const previewClient = makeClient(
  '/__instructor-preview/api',
  'course_synthetic',
  false,
);
export function instructorClient(courseId: string) {
  return makeClient('/api/instructor', courseId, true);
}
