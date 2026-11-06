import {
  draftSchema,
  draftListSchema,
  historySchema,
  publicationResultSchema,
  privatePublicationSchema,
  type AssignmentClient,
} from '../../../shared/instructor-contracts/authoring';
import { safeErrorSchema } from '../../../shared/instructor-contracts/identity';
const base = '/__instructor-preview/api';
async function call(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(base + path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const value: unknown = await response.json();
  if (!response.ok) {
    const { error } = safeErrorSchema.parse(value);
    const text: Record<string, string> = {
      UNAUTHENTICATED:
        'Your session is unavailable. Reopen the local preview to recover access.',
      FORBIDDEN: 'Access denied. Your edits remain in memory.',
      NOT_FOUND: 'This assignment is unavailable in your course.',
      REVISION_CONFLICT:
        'Save conflict: a newer draft exists. Your edits are retained. Reopen only after copying or discarding them.',
      IDEMPOTENCY_CONFLICT:
        'This publication retry no longer matches the saved revision.',
      INVALID_CONTRACT:
        'Check the fields: ' +
        (error.issues?.map((i) => `${i.path} (${i.code})`).join(', ') ??
          'invalid content'),
    };
    throw new Error(
      text[error.code] ??
        'The request failed. Your edits are retained; try again.',
    );
  }
  return value;
}
export const previewClient: AssignmentClient = {
  async list(cursor = '') {
    return draftListSchema.parse(
      await call(
        '/assignments?courseId=course_synthetic&cursor=' +
          encodeURIComponent(cursor),
      ),
    );
  },
  async create(requestKey) {
    return draftSchema.parse(
      await call('/assignments', 'POST', {
        courseId: 'course_synthetic',
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
      await call(`/assignments/${encodeURIComponent(id)}/draft`, 'PUT', value),
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
