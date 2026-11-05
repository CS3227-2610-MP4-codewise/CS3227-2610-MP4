import {
  schema,
  object,
  literal,
  id,
  timestamp,
  integer,
  score,
  text,
  array,
  unique,
  assert,
  oneOf,
  excerpt,
  inspectJson,
  BoundaryError,
  type Infer,
} from './schema';
import { criterion, publicationSchema } from './publication';
import { validateAttempt } from './submission';
export function criterionFeedback(v: unknown, p: string) {
  const o = object(
    v,
    [
      'questionVersionId',
      'rubricVersionId',
      'criterionId',
      'comparisonKey',
      'minimumScore',
      'maximumScore',
      'score',
      'explanation',
    ],
    p,
  );
  const bounds = criterion(
    {
      criterionId: o.criterionId,
      comparisonKey: o.comparisonKey,
      descriptor: 'feedback',
      minimumScore: o.minimumScore,
      maximumScore: o.maximumScore,
    },
    p,
  );
  const award = score(o.score, p + '.score');
  assert(
    award >= bounds.minimumScore && award <= bounds.maximumScore,
    p,
    'bounds',
  );
  return {
    questionVersionId: id(o.questionVersionId, p + '.questionVersionId'),
    rubricVersionId: id(o.rubricVersionId, p + '.rubricVersionId'),
    criterionId: bounds.criterionId,
    comparisonKey: bounds.comparisonKey,
    minimumScore: bounds.minimumScore,
    maximumScore: bounds.maximumScore,
    score: award,
    explanation: text(o.explanation, p + '.explanation'),
  };
}
export function annotation(v: unknown, p: string) {
  const o = object(
    v,
    [
      'submittedAnswerId',
      'questionVersionId',
      'rubricVersionId',
      'criterionId',
      'startLine',
      'endLine',
      'excerpt',
      'explanation',
    ],
    p,
  );
  const startLine = integer(o.startLine, p + '.startLine'),
    endLine = integer(o.endLine, p + '.endLine');
  assert(startLine <= endLine, p, 'lines');
  return {
    submittedAnswerId: id(o.submittedAnswerId, p + '.submittedAnswerId'),
    questionVersionId: id(o.questionVersionId, p + '.questionVersionId'),
    rubricVersionId: id(o.rubricVersionId, p + '.rubricVersionId'),
    criterionId: id(o.criterionId, p + '.criterionId'),
    startLine,
    endLine,
    excerpt: text(o.excerpt, p + '.excerpt', 32768, true),
    explanation: text(o.explanation, p + '.explanation'),
  };
}
const criterionKey = (c: {
  questionVersionId: string;
  rubricVersionId: string;
  criterionId: string;
}) => JSON.stringify([c.questionVersionId, c.rubricVersionId, c.criterionId]);
export const releaseSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'id',
    'submissionAttemptId',
    'assessmentRevisionId',
    'releaseVersion',
    'releasedAt',
    'state',
    'criteria',
    'annotations',
  ]);
  const criteria = array(o.criteria, criterionFeedback, '$.criteria', 1, 1000);
  unique(criteria.map(criterionKey), '$.criteria');
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    id: id(o.id, '$.id'),
    submissionAttemptId: id(o.submissionAttemptId, '$.submissionAttemptId'),
    assessmentRevisionId: id(o.assessmentRevisionId, '$.assessmentRevisionId'),
    releaseVersion: integer(o.releaseVersion, '$.releaseVersion'),
    releasedAt: timestamp(o.releasedAt, '$.releasedAt'),
    state: oneOf(o.state, ['released', 'superseded'] as const, '$.state'),
    criteria,
    annotations: array(o.annotations, annotation, '$.annotations'),
  };
});
export type Release = Infer<typeof releaseSchema>;
export const withdrawnSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'id',
    'submissionAttemptId',
    'releaseVersion',
    'state',
    'withdrawnAt',
  ]);
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    id: id(o.id, '$.id'),
    submissionAttemptId: id(o.submissionAttemptId, '$.submissionAttemptId'),
    releaseVersion: integer(o.releaseVersion, '$.releaseVersion'),
    state: literal(o.state, 'withdrawn', '$.state'),
    withdrawnAt: timestamp(o.withdrawnAt, '$.withdrawnAt'),
  };
});
export type Withdrawn = Infer<typeof withdrawnSchema>;
export const currentnessSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'assessmentId',
    'submissionAttemptId',
    'availabilityRevision',
    'currentReleaseVersion',
    'withdrawnReleaseVersions',
    'checkedAt',
  ]);
  const currentReleaseVersion =
    o.currentReleaseVersion === null
      ? null
      : integer(o.currentReleaseVersion, '$.currentReleaseVersion');
  const withdrawnReleaseVersions = array(
    o.withdrawnReleaseVersions,
    (v, p) => integer(v, p),
    '$.withdrawnReleaseVersions',
    0,
    10000,
  );
  unique(withdrawnReleaseVersions, '$.withdrawnReleaseVersions');
  assert(
    currentReleaseVersion === null ||
      !withdrawnReleaseVersions.includes(currentReleaseVersion),
    '$.currentReleaseVersion',
    'withdrawn_current',
  );
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    assessmentId: id(o.assessmentId, '$.assessmentId'),
    submissionAttemptId: id(o.submissionAttemptId, '$.submissionAttemptId'),
    availabilityRevision: integer(
      o.availabilityRevision,
      '$.availabilityRevision',
    ),
    currentReleaseVersion,
    withdrawnReleaseVersions,
    checkedAt: timestamp(o.checkedAt, '$.checkedAt'),
  };
});
export type Currentness = Infer<typeof currentnessSchema>;
export function currentnessToken(c: Currentness): string {
  const checked = currentnessSchema.parse(c);
  return JSON.stringify([
    checked.assessmentId,
    checked.availabilityRevision,
    checked.currentReleaseVersion,
  ]);
}
export function assertCurrentRelease(
  value: unknown,
  current: unknown,
  expectedToken?: string,
): Release {
  const r = releaseSchema.parse(value),
    c = currentnessSchema.parse(current);
  if (
    r.id !== c.assessmentId ||
    r.submissionAttemptId !== c.submissionAttemptId ||
    r.state !== 'released' ||
    r.releaseVersion !== c.currentReleaseVersion ||
    c.withdrawnReleaseVersions.includes(r.releaseVersion) ||
    (expectedToken !== undefined && expectedToken !== currentnessToken(c))
  )
    throw new BoundaryError('STALE_EVIDENCE');
  return r;
}
export async function validateFeedbackElements(
  criteria: Release['criteria'],
  annotations: Release['annotations'],
  published: unknown,
  attempt: unknown,
): Promise<void> {
  inspectJson({ criteria, annotations });
  criteria = array(criteria, criterionFeedback, '$.criteria', 1, 1000);
  annotations = array(annotations, annotation, '$.annotations');
  const p = publicationSchema.parse(published),
    a = await validateAttempt(attempt, p);
  const expected = p.questions.flatMap((q) =>
    q.criteria.map((c) => ({
      ...c,
      questionVersionId: q.questionVersionId,
      rubricVersionId: q.rubricVersionId,
    })),
  );
  assert(criteria.length === expected.length, '$.criteria', 'coverage');
  unique(criteria.map(criterionKey), '$.criteria');
  for (const c of criteria) {
    const match = expected.find((e) => criterionKey(e) === criterionKey(c));
    assert(
      match &&
        c.comparisonKey === match.comparisonKey &&
        c.minimumScore === match.minimumScore &&
        c.maximumScore === match.maximumScore,
      '$.criteria',
      'rubric_join',
    );
  }
  for (const note of annotations) {
    const answer = a.answers.find(
      (x) => x.submittedAnswerId === note.submittedAnswerId,
    );
    assert(
      answer &&
        answer.questionVersionId === note.questionVersionId &&
        answer.rubricVersionId === note.rubricVersionId &&
        expected.some((e) => criterionKey(e) === criterionKey(note)),
      '$.annotations',
      'answer_join',
    );
    assert(
      note.excerpt === excerpt(answer.source, note.startLine, note.endLine),
      '$.annotations',
      'excerpt_mismatch',
    );
  }
}
export async function validateRelease(
  value: unknown,
  published: unknown,
  attempt: unknown,
): Promise<Release> {
  const r = releaseSchema.parse(value);
  const a = await validateAttempt(attempt, published);
  assert(
    r.submissionAttemptId === a.attemptId,
    '$.submissionAttemptId',
    'attempt_join',
  );
  await validateFeedbackElements(r.criteria, r.annotations, published, a);
  return r;
}
export function assertApproval(value: unknown): void {
  inspectJson(value);
  const o = object(value, [
    'expectedAssessmentRevisionId',
    'approvedRevisionId',
    'actualAssessmentRevisionId',
    'expectedAvailabilityRevision',
    'actualAvailabilityRevision',
  ]);
  for (const k of [
    'expectedAssessmentRevisionId',
    'approvedRevisionId',
    'actualAssessmentRevisionId',
  ])
    id(o[k], '$.' + k);
  integer(o.expectedAvailabilityRevision, '$.expectedAvailabilityRevision');
  integer(o.actualAvailabilityRevision, '$.actualAvailabilityRevision');
  if (
    o.expectedAssessmentRevisionId !== o.actualAssessmentRevisionId ||
    o.approvedRevisionId !== o.actualAssessmentRevisionId ||
    o.expectedAvailabilityRevision !== o.actualAvailabilityRevision
  )
    throw new BoundaryError('REVISION_CONFLICT');
}
export function projectRelease(value: unknown): Release | Withdrawn {
  inspectJson(value);
  assert(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    '$',
    'object',
  );
  const o = value as Record<string, unknown>;
  if (o.state === 'withdrawn')
    return withdrawnSchema.parse({
      schemaVersion: o.schemaVersion,
      id: o.id,
      submissionAttemptId: o.submissionAttemptId,
      releaseVersion: o.releaseVersion,
      state: o.state,
      withdrawnAt: o.withdrawnAt,
    });
  const criteria = array(
    o.criteria,
    (v, p) => {
      assert(v !== null && typeof v === 'object', p, 'object');
      const c = v as Record<string, unknown>;
      return {
        questionVersionId: c.questionVersionId,
        rubricVersionId: c.rubricVersionId,
        criterionId: c.criterionId,
        comparisonKey: c.comparisonKey,
        minimumScore: c.minimumScore,
        maximumScore: c.maximumScore,
        score: c.score,
        explanation: c.explanation,
      };
    },
    '$.criteria',
    1,
    1000,
  );
  const annotations = array(
    o.annotations,
    (v, p) => {
      assert(v !== null && typeof v === 'object', p, 'object');
      const a = v as Record<string, unknown>;
      return {
        submittedAnswerId: a.submittedAnswerId,
        questionVersionId: a.questionVersionId,
        rubricVersionId: a.rubricVersionId,
        criterionId: a.criterionId,
        startLine: a.startLine,
        endLine: a.endLine,
        excerpt: a.excerpt,
        explanation: a.explanation,
      };
    },
    '$.annotations',
  );
  return releaseSchema.parse({
    schemaVersion: o.schemaVersion,
    id: o.id,
    submissionAttemptId: o.submissionAttemptId,
    assessmentRevisionId: o.assessmentRevisionId,
    releaseVersion: o.releaseVersion,
    releasedAt: o.releasedAt,
    state: o.state,
    criteria,
    annotations,
  });
}

/** Command schemas describe future producer protocols; they do not write storage. */
export const releaseCommandSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'assessmentId',
    'assessmentRevisionId',
    'expectedAvailabilityRevision',
    'idempotencyKey',
  ]);
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    assessmentId: id(o.assessmentId, '$.assessmentId'),
    assessmentRevisionId: id(o.assessmentRevisionId, '$.assessmentRevisionId'),
    expectedAvailabilityRevision: integer(
      o.expectedAvailabilityRevision,
      '$.expectedAvailabilityRevision',
    ),
    idempotencyKey: id(o.idempotencyKey, '$.idempotencyKey'),
  };
});
export const withdrawalCommandSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'assessmentId',
    'releaseVersion',
    'expectedAvailabilityRevision',
    'idempotencyKey',
    'reason',
  ]);
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    assessmentId: id(o.assessmentId, '$.assessmentId'),
    releaseVersion: integer(o.releaseVersion, '$.releaseVersion'),
    expectedAvailabilityRevision: integer(
      o.expectedAvailabilityRevision,
      '$.expectedAvailabilityRevision',
    ),
    idempotencyKey: id(o.idempotencyKey, '$.idempotencyKey'),
    reason: text(o.reason, '$.reason', 1024),
  };
});
