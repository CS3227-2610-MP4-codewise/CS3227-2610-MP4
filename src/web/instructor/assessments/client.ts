import type {
  AssessmentView,
  DraftFeedback,
} from '../../../shared/instructor-contracts/assessment';
import { draftFeedbackSchema } from '../../../shared/instructor-contracts/assessment';
import type { Publication } from '../../../shared/instructor-contracts/publication';
import { publicationSchema } from '../../../shared/instructor-contracts/publication';
import type { Attempt } from '../../../shared/instructor-contracts/submission';
import { attemptSchema } from '../../../shared/instructor-contracts/submission';
import {
  BoundaryError,
  errorCodes,
  type ErrorCode,
  object,
  id,
  text,
  integer,
  timestamp,
  array,
  literal,
} from '../../../shared/instructor-contracts/schema';
export type Workspace = AssessmentView & {
  publication: Publication;
  attempt: Attempt;
};
export function workspace(v: unknown): Workspace {
  const o = object(v, [
      'head',
      'revision',
      'history',
      'historyCursor',
      'releases',
      'publication',
      'attempt',
    ]),
    h = object(o.head, [
      'id',
      'courseId',
      'attemptId',
      'publicationId',
      'evidence',
      'headRevisionId',
      'approvedRevisionId',
      'availabilityRevision',
      'currentReleaseVersion',
      'maximumReleaseVersion',
    ]);
  const revision = (v: unknown, p: string) => {
    const r = object(
      v,
      [
        'id',
        'assessmentId',
        'parentRevisionId',
        'actorId',
        'createdAt',
        'provenance',
        'feedback',
      ],
      p,
    );
    return {
      id: id(r.id, p + '.id'),
      assessmentId: id(r.assessmentId, p + '.assessmentId'),
      parentRevisionId:
        r.parentRevisionId === null
          ? null
          : id(r.parentRevisionId, p + '.parentRevisionId'),
      actorId: id(r.actorId, p + '.actorId'),
      createdAt: timestamp(r.createdAt, p + '.createdAt'),
      provenance: literal(r.provenance, 'manual', p + '.provenance'),
      feedback: draftFeedbackSchema.parse(r.feedback),
    };
  };
  return {
    head: {
      id: id(h.id, '$.id'),
      courseId: id(h.courseId, '$.courseId'),
      attemptId: id(h.attemptId, '$.attemptId'),
      publicationId: id(h.publicationId, '$.publicationId'),
      evidence: text(h.evidence, '$.evidence', 256),
      headRevisionId: id(h.headRevisionId, '$.headRevisionId'),
      approvedRevisionId:
        h.approvedRevisionId === null
          ? null
          : id(h.approvedRevisionId, '$.approvedRevisionId'),
      availabilityRevision: integer(
        h.availabilityRevision,
        '$.availabilityRevision',
      ),
      currentReleaseVersion:
        h.currentReleaseVersion === null
          ? null
          : integer(h.currentReleaseVersion, '$.currentReleaseVersion'),
      maximumReleaseVersion: integer(
        h.maximumReleaseVersion,
        '$.maximumReleaseVersion',
        0,
      ),
    },
    revision: revision(o.revision, '$.revision'),
    history: array(
      o.history,
      (v, p) => {
        const r = object(
          v,
          [
            'id',
            'assessmentId',
            'parentRevisionId',
            'actorId',
            'createdAt',
            'provenance',
          ],
          p,
        );
        return {
          id: id(r.id, p + '.id'),
          assessmentId: id(r.assessmentId, p + '.assessmentId'),
          parentRevisionId:
            r.parentRevisionId === null
              ? null
              : id(r.parentRevisionId, p + '.parentRevisionId'),
          actorId: id(r.actorId, p + '.actorId'),
          createdAt: timestamp(r.createdAt, p + '.createdAt'),
          provenance: literal(r.provenance, 'manual', p + '.provenance'),
        };
      },
      '$.history',
      0,
      50,
    ),
    historyCursor:
      o.historyCursor === null
        ? null
        : String(integer(Number(o.historyCursor), '$.historyCursor')),
    releases: array(
      o.releases,
      (v, p) => {
        const r = object(
          v,
          ['version', 'revisionId', 'releasedAt', 'withdrawnAt'],
          p,
        );
        return {
          version: integer(r.version, p + '.version'),
          revisionId: id(r.revisionId, p + '.revisionId'),
          releasedAt: timestamp(r.releasedAt, p + '.releasedAt'),
          withdrawnAt:
            r.withdrawnAt === null
              ? null
              : timestamp(r.withdrawnAt, p + '.withdrawnAt'),
        };
      },
      '$.releases',
      0,
      100,
    ),
    publication: publicationSchema.parse(o.publication),
    attempt: attemptSchema.parse(o.attempt),
  };
}
export interface AssessmentClient {
  load(id: string, revision?: string, cursor?: string): Promise<Workspace>;
  save(
    id: string,
    revision: string,
    feedback: DraftFeedback,
  ): Promise<Workspace>;
  action(
    id: string,
    action: 'approve' | 'release' | 'withdraw' | 'correct',
    body: unknown,
  ): Promise<void>;
}
export function assessmentClient(csrf: string): AssessmentClient {
  const send = async (path: string, method = 'GET', body?: unknown) => {
    const r = await fetch('/__assessment-preview/api' + path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const v = await r.json();
    if (!r.ok) {
      const code = (v as { error?: { code?: unknown } })?.error?.code;
      throw new BoundaryError(
        typeof code === 'string' && errorCodes.includes(code as ErrorCode)
          ? (code as ErrorCode)
          : 'UPSTREAM_UNAVAILABLE',
      );
    }
    return v;
  };
  return {
    load: async (id, revision, cursor) =>
      workspace(
        await send(
          '/assessments/' +
            encodeURIComponent(id) +
            '?' +
            new URLSearchParams({
              ...(revision ? { revisionId: revision } : {}),
              ...(cursor ? { cursor } : {}),
            }),
        ),
      ),
    save: async (id, revision, feedback) =>
      workspace(
        await send('/assessments/' + encodeURIComponent(id), 'PUT', {
          expectedRevisionId: revision,
          feedback,
        }),
      ),
    action: async (id, action, body) => {
      await send(
        '/assessments/' + encodeURIComponent(id) + '/' + action,
        'POST',
        body,
      );
    },
  };
}
