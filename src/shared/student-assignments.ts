import {
  schema,
  object,
  literal,
  id,
  text,
  title,
  timestamp,
  array,
  assert,
  fail,
  unique,
  type Infer,
} from './instructor-contracts/schema';

/** SD-02/04: closed student listing envelope. Parsing validates shape, never authority. */
export const STUDENT_ASSIGNMENT_PAGE = 50;
export const STUDENT_CURSOR_MAX = 512;
const routeId = /^[A-Za-z0-9_-]{1,128}$/;

export function routeIdentifier(value: unknown, path: string): string {
  const s = text(value, path, 128);
  assert(routeId.test(s), path, 'id');
  return s;
}

export function studentCursor(value: unknown, path = '$.cursor'): string {
  const s = text(value, path, STUDENT_CURSOR_MAX);
  assert(/^[A-Za-z0-9_-]+$/.test(s), path, 'cursor');
  return s;
}

function base64url(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Opaque position after the last returned (deadlineAt, assignmentId); not authority. */
export function encodeCursor(deadlineAt: string, assignmentId: string) {
  return base64url(JSON.stringify([deadlineAt, assignmentId]));
}

export function decodeCursor(value: string): {
  deadlineAt: string;
  assignmentId: string;
} {
  studentCursor(value);
  let parsed: unknown;
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    parsed = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      ),
    );
  } catch {
    fail('$.cursor', 'cursor');
  }
  assert(Array.isArray(parsed) && parsed.length === 2, '$.cursor', 'cursor');
  const [deadlineAt, assignmentId] = parsed as unknown[];
  const result = {
    deadlineAt: timestamp(deadlineAt, '$.cursor'),
    assignmentId: id(assignmentId, '$.cursor'),
  };
  // Canonical encoding only, so one position has exactly one cursor string.
  assert(
    encodeCursor(result.deadlineAt, result.assignmentId) === value,
    '$.cursor',
    'cursor',
  );
  return result;
}

function item(value: unknown, path: string) {
  const o = object(
    value,
    [
      'assignmentId',
      'assignmentVersionId',
      'title',
      'publishedAt',
      'deadlineAt',
    ],
    path,
  );
  return {
    assignmentId: id(o.assignmentId, path + '.assignmentId'),
    assignmentVersionId: routeIdentifier(
      o.assignmentVersionId,
      path + '.assignmentVersionId',
    ),
    title: title(o.title, path + '.title'),
    publishedAt: timestamp(o.publishedAt, path + '.publishedAt'),
    deadlineAt: timestamp(o.deadlineAt, path + '.deadlineAt'),
  };
}

export const studentAssignmentPageSchema = schema((value) => {
  const o = object(value, ['schemaVersion', 'course', 'items', 'nextCursor']);
  const course = object(o.course, ['id', 'name'], '$.course');
  const items = array(o.items, item, '$.items', 0, STUDENT_ASSIGNMENT_PAGE);
  unique(
    items.map((i) => i.assignmentId),
    '$.items',
  );
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    course: {
      id: routeIdentifier(course.id, '$.course.id'),
      name: text(course.name, '$.course.name', 480),
    },
    items,
    nextCursor: o.nextCursor === null ? null : studentCursor(o.nextCursor),
  };
});
export type StudentAssignmentPage = Infer<typeof studentAssignmentPageSchema>;
export type StudentAssignmentItem = StudentAssignmentPage['items'][number];
