import {
  schema,
  object,
  array,
  literal,
  id,
  text,
  title,
  score,
  timestamp,
  canonicalizeSource,
  unique,
  integer,
  type Infer,
} from './schema';
import { publicationSchema, type Publication } from './publication';
const looseTitle = (v: unknown, p: string) => (v === '' ? '' : title(v, p));
export const authoringSchema = schema((v) => {
  const o = object(v, ['title', 'deadlineAt', 'questions']);
  const questions = array(
    o.questions,
    (v, p) => {
      const q = object(
        v,
        [
          'questionId',
          'rubricId',
          'title',
          'instructions',
          'language',
          'starterCode',
          'privateReference',
          'criteria',
        ],
        p,
      );
      const criteria = array(
        q.criteria,
        (v, p) => {
          const c = object(
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
          return {
            criterionId: id(c.criterionId, p + '.criterionId'),
            comparisonKey:
              c.comparisonKey === ''
                ? ''
                : id(c.comparisonKey, p + '.comparisonKey'),
            descriptor: text(c.descriptor, p + '.descriptor', 4000, true),
            minimumScore:
              c.minimumScore === null
                ? null
                : score(c.minimumScore, p + '.minimumScore'),
            maximumScore:
              c.maximumScore === null
                ? null
                : score(c.maximumScore, p + '.maximumScore'),
          };
        },
        p + '.criteria',
        0,
        50,
      );
      unique(
        criteria.map((c) => c.criterionId),
        p + '.criteria',
      );
      return {
        questionId: id(q.questionId, p + '.questionId'),
        rubricId: id(q.rubricId, p + '.rubricId'),
        title: looseTitle(q.title, p + '.title'),
        instructions: text(q.instructions, p + '.instructions', 16384, true),
        language: literal(q.language, 'python', p + '.language'),
        starterCode: canonicalizeSource(q.starterCode),
        privateReference: canonicalizeSource(q.privateReference),
        criteria,
      };
    },
    '$.questions',
    0,
    20,
  );
  unique(
    questions.map((q) => q.questionId),
    '$.questions',
  );
  unique(
    questions.map((q) => q.rubricId),
    '$.questions',
  );
  return {
    title: looseTitle(o.title, '$.title'),
    deadlineAt:
      o.deadlineAt === null ? null : timestamp(o.deadlineAt, '$.deadlineAt'),
    questions,
  };
});
export type Authoring = Infer<typeof authoringSchema>;
export const emptyAuthoring = (): Authoring => ({
  title: '',
  deadlineAt: null,
  questions: [],
});
export const draftSchema = schema((v) => {
  const o = object(v, [
    'schemaVersion',
    'assignmentId',
    'courseId',
    'revision',
    'createdAt',
    'updatedAt',
    'payload',
  ]);
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    assignmentId: id(o.assignmentId, '$.assignmentId'),
    courseId: id(o.courseId, '$.courseId'),
    revision: integer(o.revision, '$.revision'),
    createdAt: timestamp(o.createdAt, '$.createdAt'),
    updatedAt: timestamp(o.updatedAt, '$.updatedAt'),
    payload: authoringSchema.parse(o.payload),
  };
});
export type AssignmentDraft = Infer<typeof draftSchema>;
export const saveDraftSchema = schema((v) => {
  const o = object(v, ['expectedRevision', 'payload']);
  return {
    expectedRevision: integer(o.expectedRevision, '$.expectedRevision'),
    payload: authoringSchema.parse(o.payload),
  };
});
export const publishDraftSchema = schema((v) => {
  const o = object(v, ['expectedRevision', 'idempotencyKey']);
  return {
    expectedRevision: integer(o.expectedRevision, '$.expectedRevision'),
    idempotencyKey: id(o.idempotencyKey, '$.idempotencyKey'),
  };
});
export const createDraftSchema = schema((v) => {
  const o = object(v, ['courseId', 'requestKey']);
  return {
    courseId: id(o.courseId, '$.courseId'),
    requestKey: id(o.requestKey, '$.requestKey'),
  };
});
export type DraftSummary = {
  assignmentId: string;
  courseId: string;
  revision: number;
  title: string;
  updatedAt: string;
};
export type PublicationSummary = {
  assignmentVersionId: string;
  publicationNumber: number;
  sourceDraftRevision: number;
  publishedAt: string;
};
export type PublicationResult = PublicationSummary & {
  publication: Publication;
};
export type PrivatePublication = PublicationResult & {
  privateReferences: { questionVersionId: string; source: string }[];
};
function summary(v: unknown, p = '$'): PublicationSummary {
  const o = object(
    v,
    [
      'assignmentVersionId',
      'publicationNumber',
      'sourceDraftRevision',
      'publishedAt',
    ],
    p,
  );
  return {
    assignmentVersionId: id(o.assignmentVersionId, p + '.assignmentVersionId'),
    publicationNumber: integer(o.publicationNumber, p + '.publicationNumber'),
    sourceDraftRevision: integer(
      o.sourceDraftRevision,
      p + '.sourceDraftRevision',
    ),
    publishedAt: timestamp(o.publishedAt, p + '.publishedAt'),
  };
}
export const historySchema = schema((v) => array(v, summary, '$', 0, 100));
function result(
  v: unknown,
  privateRead: boolean,
): PublicationResult | PrivatePublication {
  const keys = [
    'assignmentVersionId',
    'publicationNumber',
    'sourceDraftRevision',
    'publishedAt',
    'publication',
  ];
  if (privateRead) keys.push('privateReferences');
  const o = object(v, keys),
    publication = publicationSchema.parse(o.publication);
  const metadata = summary(
    Object.fromEntries(
      [
        'assignmentVersionId',
        'publicationNumber',
        'sourceDraftRevision',
        'publishedAt',
      ].map((k) => [k, o[k]]),
    ),
  );
  const base = { ...metadata, publication };
  if (!privateRead) return base;
  return {
    ...base,
    privateReferences: array(
      o.privateReferences,
      (v, p) => {
        const ref = object(v, ['questionVersionId', 'source'], p);
        return {
          questionVersionId: id(
            ref.questionVersionId,
            p + '.questionVersionId',
          ),
          source: canonicalizeSource(ref.source),
        };
      },
      '$.privateReferences',
      1,
      20,
    ),
  };
}
export const publicationResultSchema = schema(
  (v) => result(v, false) as PublicationResult,
);
export const privatePublicationSchema = schema(
  (v) => result(v, true) as PrivatePublication,
);
export const draftListSchema = schema((v) => {
  const o = object(v, ['items', 'nextCursor']);
  return {
    items: array(
      o.items,
      (v, p) => {
        const r = object(
          v,
          ['assignmentId', 'courseId', 'revision', 'title', 'updatedAt'],
          p,
        );
        return {
          assignmentId: id(r.assignmentId, p + '.assignmentId'),
          courseId: id(r.courseId, p + '.courseId'),
          revision: integer(r.revision, p + '.revision'),
          title: looseTitle(r.title, p + '.title'),
          updatedAt: timestamp(r.updatedAt, p + '.updatedAt'),
        };
      },
      '$.items',
      0,
      50,
    ),
    nextCursor: o.nextCursor === null ? null : id(o.nextCursor, '$.nextCursor'),
  };
});
export interface AssignmentClient {
  list(
    cursor?: string,
  ): Promise<{ items: DraftSummary[]; nextCursor: string | null }>;
  create(requestKey: string): Promise<AssignmentDraft>;
  load(id: string): Promise<AssignmentDraft>;
  save(
    id: string,
    value: Infer<typeof saveDraftSchema>,
  ): Promise<AssignmentDraft>;
  publish(
    id: string,
    value: Infer<typeof publishDraftSchema>,
  ): Promise<PublicationResult>;
  history(id: string): Promise<PublicationSummary[]>;
  snapshot(versionId: string): Promise<PrivatePublication>;
}
