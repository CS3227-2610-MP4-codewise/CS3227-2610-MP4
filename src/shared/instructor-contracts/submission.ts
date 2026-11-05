import {
  schema,
  object,
  literal,
  id,
  timestamp,
  integer,
  source,
  text,
  array,
  unique,
  assert,
  sourceHash,
  type Infer,
} from './schema';
import { publicationSchema } from './publication';
export const attemptSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'attemptId',
    'assignmentVersionId',
    'courseId',
    'submittedByUserId',
    'submittedAt',
    'answers',
  ]);
  const answers = array(
    o.answers,
    (v, p) => {
      const a = object(
        v,
        [
          'submittedAnswerId',
          'questionVersionId',
          'rubricVersionId',
          'draftRevision',
          'source',
          'sourceHash',
        ],
        p,
      );
      const hash = text(a.sourceHash, p + '.sourceHash', 64);
      assert(/^[0-9a-f]{64}$/.test(hash), p + '.sourceHash', 'hash');
      return {
        submittedAnswerId: id(a.submittedAnswerId, p + '.submittedAnswerId'),
        questionVersionId: id(a.questionVersionId, p + '.questionVersionId'),
        rubricVersionId: id(a.rubricVersionId, p + '.rubricVersionId'),
        draftRevision: integer(a.draftRevision, p + '.draftRevision'),
        source: source(a.source, p + '.source'),
        sourceHash: hash,
      };
    },
    '$.answers',
    1,
    20,
  );
  unique(
    answers.map((a) => a.submittedAnswerId),
    '$.answers',
  );
  unique(
    answers.map((a) => a.questionVersionId),
    '$.answers',
  );
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    attemptId: id(o.attemptId, '$.attemptId'),
    assignmentVersionId: id(o.assignmentVersionId, '$.assignmentVersionId'),
    courseId: id(o.courseId, '$.courseId'),
    submittedByUserId: id(o.submittedByUserId, '$.submittedByUserId'),
    submittedAt: timestamp(o.submittedAt, '$.submittedAt'),
    answers,
  };
});
export type Attempt = Infer<typeof attemptSchema>;
export async function validateAttempt(
  value: unknown,
  published: unknown,
): Promise<Attempt> {
  const a = attemptSchema.parse(value),
    p = publicationSchema.parse(published);
  assert(
    a.courseId === p.courseId &&
      a.assignmentVersionId === p.assignmentVersionId,
    '$',
    'publication_join',
  );
  assert(a.answers.length === p.questions.length, '$.answers', 'coverage');
  for (const answer of a.answers) {
    const q = p.questions.find(
      (q) => q.questionVersionId === answer.questionVersionId,
    );
    assert(
      q && q.rubricVersionId === answer.rubricVersionId,
      '$.answers',
      'rubric_join',
    );
    assert(
      (await sourceHash(answer.source)) === answer.sourceHash,
      '$.answers',
      'hash_mismatch',
    );
  }
  return a;
}
