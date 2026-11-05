import type { PublishedQuestion } from '../contracts';
import {
  schema,
  object,
  literal,
  id,
  timestamp,
  title,
  text,
  source,
  score,
  array,
  unique,
  assert,
  inspectJson,
  type Infer,
} from './schema';
export function criterion(v: unknown, p: string) {
  const o = object(
    v,
    [
      'criterionId',
      'comparisonKey',
      'descriptor',
      'minimumScore',
      'maximumScore',
    ],
    p,
  );
  const minimumScore = score(o.minimumScore, p + '.minimumScore'),
    maximumScore = score(o.maximumScore, p + '.maximumScore');
  assert(minimumScore < maximumScore, p, 'bounds');
  return {
    criterionId: id(o.criterionId, p + '.criterionId'),
    comparisonKey: id(o.comparisonKey, p + '.comparisonKey'),
    descriptor: text(o.descriptor, p + '.descriptor', 4000),
    minimumScore,
    maximumScore,
  };
}
function question(v: unknown, p: string) {
  const o = object(
    v,
    [
      'questionId',
      'questionVersionId',
      'title',
      'instructions',
      'language',
      'starterCode',
      'rubricId',
      'rubricVersionId',
      'criteria',
    ],
    p,
  );
  const criteria = array(o.criteria, criterion, p + '.criteria', 1, 50);
  unique(
    criteria.map((c) => c.criterionId),
    p + '.criteria',
  );
  unique(
    criteria.map((c) => c.comparisonKey),
    p + '.criteria',
  );
  return {
    questionId: id(o.questionId, p + '.questionId'),
    questionVersionId: id(o.questionVersionId, p + '.questionVersionId'),
    title: title(o.title, p + '.title'),
    instructions: text(o.instructions, p + '.instructions', 16384),
    language: literal(o.language, 'python', p + '.language'),
    starterCode: source(o.starterCode, p + '.starterCode'),
    rubricId: id(o.rubricId, p + '.rubricId'),
    rubricVersionId: id(o.rubricVersionId, p + '.rubricVersionId'),
    criteria,
  };
}
export const publicationSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'assignmentId',
    'assignmentVersionId',
    'courseId',
    'title',
    'publishedAt',
    'deadlineAt',
    'questions',
  ]);
  const questions = array(o.questions, question, '$.questions', 1, 20);
  for (const key of [
    'questionId',
    'questionVersionId',
    'rubricId',
    'rubricVersionId',
  ] as const)
    unique(
      questions.map((q) => q[key]),
      '$.questions',
    );
  const publishedAt = timestamp(o.publishedAt, '$.publishedAt'),
    deadlineAt = timestamp(o.deadlineAt, '$.deadlineAt');
  assert(deadlineAt > publishedAt, '$.deadlineAt', 'deadline');
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    assignmentId: id(o.assignmentId, '$.assignmentId'),
    assignmentVersionId: id(o.assignmentVersionId, '$.assignmentVersionId'),
    courseId: id(o.courseId, '$.courseId'),
    title: title(o.title, '$.title'),
    publishedAt,
    deadlineAt,
    questions,
  };
});
export type Publication = Infer<typeof publicationSchema>;
export function projectPublication(value: unknown): Publication {
  inspectJson(value);
  assert(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    '$',
    'object',
  );
  const o = value as Record<string, unknown>;
  assert(o.state === 'published', '$.state', 'not_published');
  const questions = array(
    o.questions,
    (v, p) => {
      assert(
        v !== null && typeof v === 'object' && !Array.isArray(v),
        p,
        'object',
      );
      const q = v as Record<string, unknown>;
      if (q.privateReference !== undefined)
        source(q.privateReference, p + '.privateReference');
      return {
        questionId: q.questionId,
        questionVersionId: q.questionVersionId,
        title: q.title,
        instructions: q.instructions,
        language: q.language,
        starterCode: q.starterCode,
        rubricId: q.rubricId,
        rubricVersionId: q.rubricVersionId,
        criteria: array(
          q.criteria,
          (v, p) => {
            assert(v !== null && typeof v === 'object', p, 'object');
            const c = v as Record<string, unknown>;
            return {
              criterionId: c.criterionId,
              comparisonKey: c.comparisonKey,
              descriptor: c.descriptor,
              minimumScore: c.minimumScore,
              maximumScore: c.maximumScore,
            };
          },
          p + '.criteria',
          1,
          50,
        ),
      };
    },
    '$.questions',
    1,
    20,
  );
  return publicationSchema.parse({
    schemaVersion: o.schemaVersion,
    assignmentId: o.assignmentId,
    assignmentVersionId: o.assignmentVersionId,
    courseId: o.courseId,
    title: o.title,
    publishedAt: o.publishedAt,
    deadlineAt: o.deadlineAt,
    questions,
  });
}
export function toLegacyQuestion(
  q: Publication['questions'][number],
  assignmentVersionId: string,
): PublishedQuestion {
  // Explicit compatibility projection; logical questionId is never substituted.
  const checked = question(q, '$.question');
  return {
    id: checked.questionVersionId,
    assignmentVersionId: id(assignmentVersionId, '$.assignmentVersionId'),
    title: checked.title,
    instructions: checked.instructions,
    language: checked.language,
    starterCode: checked.starterCode,
  };
}
