import {
  schema,
  object,
  literal,
  id,
  text,
  timestamp,
  integer,
  array,
  assert,
  unique,
  canonicalizeSource,
  source,
  oneOf,
  type Infer,
} from './instructor-contracts/schema';
import {
  routeIdentifier,
  STUDENT_ASSIGNMENT_PAGE,
} from './student-assignments';
import { feedbackReleasedFlag } from './student-feedback';

/**
 * SW-01–SW-09: closed schemaVersion 1 request/response shapes for student working copies and
 * attempts. Parsing validates shape only, never authority. No private reference, unreleased
 * assessment or other user's data appears in any shape here.
 */
export const MAX_SOURCE_BYTES = 32768;
export const MAX_QUESTIONS = 20;
export const STUDENT_ATTEMPT_PAGE = 50;
/** JSON escaping can inflate a 32 KiB source, so the save body bound covers 6 bytes per source byte (control characters) plus envelope. */
export const MAX_SAVE_BODY_BYTES = 6 * MAX_SOURCE_BYTES + 1024;
export const MAX_SUBMIT_BODY_BYTES = 16384;

const hex64 = (v: unknown, p: string) => {
  const s = text(v, p, 64);
  assert(/^[0-9a-f]{64}$/.test(s), p, 'hash');
  return s;
};
const version = (v: unknown, p: string) => literal(v, 1, p);

export const draftSaveRequestSchema = schema((v) => {
  const o = object(v, ['schemaVersion', 'baseRevision', 'source']);
  return {
    schemaVersion: version(o.schemaVersion, '$.schemaVersion'),
    baseRevision: integer(o.baseRevision, '$.baseRevision', 0),
    // K4: LF-normalised on arrival; the 32 KiB bound applies after normalisation.
    source: canonicalizeSource(o.source),
  };
});
export type DraftSaveRequest = Infer<typeof draftSaveRequestSchema>;

const currentDraft = (v: unknown, p: string) => {
  const o = object(v, ['revision', 'source', 'sourceHash'], p);
  return {
    revision: integer(o.revision, p + '.revision', 0),
    source: source(o.source, p + '.source'),
    sourceHash: hex64(o.sourceHash, p + '.sourceHash'),
  };
};

export const draftSaveResponseSchema = schema((v) => {
  const o = object(v, ['schemaVersion', 'revision', 'sourceHash', 'savedAt']);
  return {
    schemaVersion: version(o.schemaVersion, '$.schemaVersion'),
    revision: integer(o.revision, '$.revision', 1),
    sourceHash: hex64(o.sourceHash, '$.sourceHash'),
    savedAt: timestamp(o.savedAt, '$.savedAt'),
  };
});
export type DraftSaveResponse = Infer<typeof draftSaveResponseSchema>;

export const draftConflictSchema = schema((v) => {
  const o = object(v, ['schemaVersion', 'error', 'current']);
  const e = object(o.error, ['code', 'message', 'requestId'], '$.error');
  return {
    schemaVersion: version(o.schemaVersion, '$.schemaVersion'),
    error: {
      code: literal(e.code, 'CONFLICT_REVISION', '$.error.code'),
      message: text(e.message, '$.error.message', 200),
      requestId: id(e.requestId, '$.error.requestId'),
    },
    current: currentDraft(o.current, '$.current'),
  };
});
export type DraftConflict = Infer<typeof draftConflictSchema>;

export const workResponseSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'assignmentId',
    'assignmentVersionId',
    'latestAssignmentVersionId',
    'deadlineAt',
    'attemptCount',
    'questions',
  ]);
  const questions = array(
    o.questions,
    (q, p) => {
      const d = object(
        q,
        [
          'questionVersionId',
          'position',
          'revision',
          'source',
          'sourceHash',
          'updatedAt',
        ],
        p,
      );
      return {
        questionVersionId: routeIdentifier(
          d.questionVersionId,
          p + '.questionVersionId',
        ),
        position: integer(d.position, p + '.position', 0, MAX_QUESTIONS),
        revision: integer(d.revision, p + '.revision', 0),
        source: source(d.source, p + '.source'),
        sourceHash: hex64(d.sourceHash, p + '.sourceHash'),
        updatedAt: d.updatedAt === null ? null : timestamp(d.updatedAt, p),
      };
    },
    '$.questions',
    1,
    MAX_QUESTIONS,
  );
  unique(
    questions.map((q) => q.questionVersionId),
    '$.questions',
  );
  return {
    schemaVersion: version(o.schemaVersion, '$.schemaVersion'),
    assignmentId: id(o.assignmentId, '$.assignmentId'),
    assignmentVersionId: routeIdentifier(
      o.assignmentVersionId,
      '$.assignmentVersionId',
    ),
    latestAssignmentVersionId: routeIdentifier(
      o.latestAssignmentVersionId,
      '$.latestAssignmentVersionId',
    ),
    deadlineAt: timestamp(o.deadlineAt, '$.deadlineAt'),
    attemptCount: integer(o.attemptCount, '$.attemptCount', 0),
    questions,
  };
});
export type WorkResponse = Infer<typeof workResponseSchema>;

export const moveRequestSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'questionVersionId',
    'targetQuestionVersionId',
    'targetBaseRevision',
  ]);
  return {
    schemaVersion: version(o.schemaVersion, '$.schemaVersion'),
    questionVersionId: routeIdentifier(
      o.questionVersionId,
      '$.questionVersionId',
    ),
    targetQuestionVersionId: routeIdentifier(
      o.targetQuestionVersionId,
      '$.targetQuestionVersionId',
    ),
    targetBaseRevision: integer(
      o.targetBaseRevision,
      '$.targetBaseRevision',
      0,
    ),
  };
});
export type MoveRequest = Infer<typeof moveRequestSchema>;

export const submitRequestSchema = schema((v) => {
  const o = object(v, ['schemaVersion', 'idempotencyKey', 'answers']);
  const answers = array(
    o.answers,
    (a, p) => {
      const x = object(
        a,
        ['questionVersionId', 'draftRevision', 'sourceHash'],
        p,
      );
      return {
        questionVersionId: routeIdentifier(
          x.questionVersionId,
          p + '.questionVersionId',
        ),
        draftRevision: integer(x.draftRevision, p + '.draftRevision', 1),
        sourceHash: hex64(x.sourceHash, p + '.sourceHash'),
      };
    },
    '$.answers',
    1,
    MAX_QUESTIONS,
  );
  unique(
    answers.map((a) => a.questionVersionId),
    '$.answers',
  );
  return {
    schemaVersion: version(o.schemaVersion, '$.schemaVersion'),
    idempotencyKey: routeIdentifier(o.idempotencyKey, '$.idempotencyKey'),
    answers,
  };
});
export type SubmitRequest = Infer<typeof submitRequestSchema>;

export const submitResponseSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'attemptId',
    'assignmentVersionId',
    'submittedAt',
    'replayed',
  ]);
  assert(typeof o.replayed === 'boolean', '$.replayed', 'boolean');
  return {
    schemaVersion: version(o.schemaVersion, '$.schemaVersion'),
    attemptId: id(o.attemptId, '$.attemptId'),
    assignmentVersionId: routeIdentifier(
      o.assignmentVersionId,
      '$.assignmentVersionId',
    ),
    submittedAt: timestamp(o.submittedAt, '$.submittedAt'),
    replayed: o.replayed,
  };
});
export type SubmitResponse = Infer<typeof submitResponseSchema>;

export const attemptHistorySchema = schema((v) => {
  const o = object(v, ['schemaVersion', 'items', 'nextCursor']);
  const items = array(
    o.items,
    (x, p) => {
      const i = object(
        x,
        [
          'attemptId',
          'assignmentVersionId',
          'submittedAt',
          'answerCount',
          'feedbackReleased',
        ],
        p,
      );
      return {
        attemptId: id(i.attemptId, p + '.attemptId'),
        assignmentVersionId: routeIdentifier(
          i.assignmentVersionId,
          p + '.assignmentVersionId',
        ),
        submittedAt: timestamp(i.submittedAt, p + '.submittedAt'),
        answerCount: integer(
          i.answerCount,
          p + '.answerCount',
          1,
          MAX_QUESTIONS,
        ),
        // SF-07: true only when the attempt has a current release at load time.
        feedbackReleased: feedbackReleasedFlag(
          i.feedbackReleased,
          p + '.feedbackReleased',
        ),
      };
    },
    '$.items',
    0,
    STUDENT_ATTEMPT_PAGE,
  );
  return {
    schemaVersion: version(o.schemaVersion, '$.schemaVersion'),
    items,
    nextCursor: o.nextCursor === null ? null : historyCursor(o.nextCursor),
  };
});
export type AttemptHistory = Infer<typeof attemptHistorySchema>;

/** Opaque history position: the insert sequence of the last returned attempt. */
export function historyCursor(v: unknown, p = '$.cursor'): string {
  const s = text(v, p, 16);
  assert(/^[1-9][0-9]{0,14}$/.test(s), p, 'cursor');
  return s;
}

/**
 * SW-07: SHA-256 over canonical JSON of the publication and the confirmed answers, sorted by
 * question version. The client key is never part of the fingerprint.
 */
export async function answersFingerprint(
  publicationId: string,
  answers: ReadonlyArray<{
    questionVersionId: string;
    draftRevision: number;
    sourceHash: string;
  }>,
): Promise<string> {
  const rows = answers
    .map((a) => [a.questionVersionId, a.draftRevision, a.sourceHash] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify({ publicationId, answers: rows })),
  );
  return Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * AS-01/02: one learner-status value per assignment of a course list page. The server derives it
 * from the caller's own attempts, current releases and its own clock; it never carries attempt IDs,
 * times, scores or release content.
 */
export const ASSIGNMENT_STATUSES = [
  'feedback-released',
  'submitted',
  'due-soon',
  'none',
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];
/** AS-01: Due soon covers deadlines after now and at most this far ahead. */
export const DUE_SOON_MS = 24 * 60 * 60 * 1000;

export const assignmentStatusPageSchema = schema((v) => {
  const o = object(v, ['schemaVersion', 'items']);
  const items = array(
    o.items,
    (x, p) => {
      const i = object(x, ['assignmentId', 'status'], p);
      return {
        assignmentId: id(i.assignmentId, p + '.assignmentId'),
        status: oneOf(i.status, ASSIGNMENT_STATUSES, p + '.status'),
      };
    },
    '$.items',
    0,
    STUDENT_ASSIGNMENT_PAGE,
  );
  unique(
    items.map((i) => i.assignmentId),
    '$.items',
  );
  return { schemaVersion: version(o.schemaVersion, '$.schemaVersion'), items };
});
export type AssignmentStatusPage = Infer<typeof assignmentStatusPageSchema>;

/**
 * AS-02: the repeated `id` query values of a status request: one list page at most, unique, each a
 * valid assignment ID. Any other key is rejected by the caller.
 */
export function assignmentStatusIds(values: readonly string[]): string[] {
  assert(
    values.length >= 1 && values.length <= STUDENT_ASSIGNMENT_PAGE,
    '$.id',
    'length',
  );
  const ids = values.map((value, index) => id(value, `$.id[${index}]`));
  unique(ids, '$.id');
  return ids;
}
