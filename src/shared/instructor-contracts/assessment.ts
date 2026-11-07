import {
  schema,
  object,
  array,
  id,
  score,
  text,
  unique,
  assert,
  type Infer,
} from './schema';
import { annotation, type Release } from './release';
export const draftFeedbackSchema = schema((v) => {
  const o = object(v, ['criteria', 'annotations']);
  const criteria = array(
    o.criteria,
    (v, p) => {
      const c = object(
        v,
        [
          'questionVersionId',
          'rubricVersionId',
          'criterionId',
          'score',
          'explanation',
        ],
        p,
      );
      return {
        questionVersionId: id(c.questionVersionId, p + '.questionVersionId'),
        rubricVersionId: id(c.rubricVersionId, p + '.rubricVersionId'),
        criterionId: id(c.criterionId, p + '.criterionId'),
        score: c.score === null ? null : score(c.score, p + '.score'),
        explanation: text(c.explanation, p + '.explanation', 8192, true),
      };
    },
    '$.criteria',
    1,
    1000,
  );
  unique(
    criteria.map((c) =>
      JSON.stringify([c.questionVersionId, c.rubricVersionId, c.criterionId]),
    ),
    '$.criteria',
  );
  const annotations = array(
    o.annotations,
    (v, p) => {
      const a = object(
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
      const parsed = annotation(
        { ...a, explanation: a.explanation === '' ? 'pending' : a.explanation },
        p,
      );
      return {
        ...parsed,
        explanation: text(a.explanation, p + '.explanation', 8192, true),
      };
    },
    '$.annotations',
  );
  return { criteria, annotations };
});
export type DraftFeedback = Infer<typeof draftFeedbackSchema>;
export const saveAssessmentSchema = schema((v) => {
  const o = object(v, ['expectedRevisionId', 'feedback']);
  return {
    expectedRevisionId: id(o.expectedRevisionId, '$.expectedRevisionId'),
    feedback: draftFeedbackSchema.parse(o.feedback),
  };
});
export const reviewAssessmentSchema = schema((v) => {
  const o = object(v, ['expectedRevisionId', 'expectedAvailabilityRevision']);
  assert(
    Number.isSafeInteger(o.expectedAvailabilityRevision) &&
      Number(o.expectedAvailabilityRevision) > 0,
    '$.expectedAvailabilityRevision',
  );
  return {
    expectedRevisionId: id(o.expectedRevisionId, '$.expectedRevisionId'),
    expectedAvailabilityRevision: Number(o.expectedAvailabilityRevision),
  };
});
export type AssessmentHead = {
  id: string;
  courseId: string;
  attemptId: string;
  publicationId: string;
  evidence: string;
  headRevisionId: string;
  approvedRevisionId: string | null;
  availabilityRevision: number;
  currentReleaseVersion: number | null;
  maximumReleaseVersion: number;
};
export type AssessmentRevision = {
  id: string;
  assessmentId: string;
  parentRevisionId: string | null;
  actorId: string;
  createdAt: string;
  provenance: 'manual';
  feedback: DraftFeedback;
};
export type AssessmentView = {
  head: AssessmentHead;
  revision: AssessmentRevision;
  history: Omit<AssessmentRevision, 'feedback'>[];
  historyCursor: string | null;
  releases: Array<{
    version: number;
    revisionId: string;
    releasedAt: string;
    withdrawnAt: string | null;
  }>;
};
export type FeedbackRelease = Release;
