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
  assessmentDraftSchema,
  type AssessmentDraft,
} from '../../../shared/instructor-contracts/ai';
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
  oneOf,
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
      provenance: oneOf(
        r.provenance,
        ['manual', 'ai-assisted'] as const,
        p + '.provenance',
      ),
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
          provenance: oneOf(
            r.provenance,
            ['manual', 'ai-assisted'] as const,
            p + '.provenance',
          ),
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
  generateAI?(
    id: string,
    revision: string,
    key: string,
    includePrivateReferences: boolean,
  ): Promise<{ candidateId: string; payload: AssessmentDraft }>;
  recoverAI?(
    id: string,
  ): Promise<{ candidateId: string; payload: AssessmentDraft } | null>;
  resumeAI?(
    id: string,
  ): Promise<{ candidateId: string; payload: AssessmentDraft } | null>;
  adoptAI?(
    id: string,
    revision: string,
    candidateId: string,
  ): Promise<Workspace>;
}
export function assessmentClient(
  csrf: string,
  prefix = '/__assessment-preview/api',
): AssessmentClient {
  const send = async (path: string, method = 'GET', body?: unknown) => {
    const r = await fetch(prefix + path, {
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
    recoverAI: async (assessmentId) => {
      const value = await send(
        '/assessments/' + encodeURIComponent(assessmentId) + '/ai-candidate',
      );
      if ((value as { status?: unknown }).status === 'none') return null;
      if (
        ['pending', 'running'].includes(
          String((value as { status?: unknown }).status),
        )
      )
        throw new Error('AI_PENDING');
      if (
        ['failed', 'expired'].includes(
          String((value as { status?: unknown }).status),
        )
      )
        throw new Error('AI_FAILED');
      const result = object(value, [
        'status',
        'candidateId',
        'payload',
        'promptVersion',
        'modelVersion',
      ]);
      literal(result.status, 'succeeded', '$.status');
      return {
        candidateId: id(result.candidateId, '$.candidateId'),
        payload: assessmentDraftSchema.parse(result.payload),
      };
    },
    resumeAI: async (assessmentId) => {
      const value = await send(
        '/assessments/' + encodeURIComponent(assessmentId) + '/resume-ai',
        'POST',
        {},
      );
      if ((value as { status?: unknown }).status === 'none') return null;
      if (
        ['pending', 'running'].includes(
          String((value as { status?: unknown }).status),
        )
      )
        throw new Error('AI_PENDING');
      if (
        ['failed', 'expired'].includes(
          String((value as { status?: unknown }).status),
        )
      )
        throw new Error('AI_FAILED');
      const result = object(value, [
        'status',
        'candidateId',
        'payload',
        'promptVersion',
        'modelVersion',
      ]);
      literal(result.status, 'succeeded', '$.status');
      return {
        candidateId: id(result.candidateId, '$.candidateId'),
        payload: assessmentDraftSchema.parse(result.payload),
      };
    },
    generateAI: async (
      assessmentId,
      revision,
      key,
      includePrivateReferences,
    ) => {
      const value = await send(
        '/assessments/' + encodeURIComponent(assessmentId) + '/generate-ai',
        'POST',
        {
          expectedRevisionId: revision,
          requestKey: key,
          includePrivateReferences,
        },
      );
      if (
        (value as { status?: unknown }).status === 'pending' ||
        (value as { status?: unknown }).status === 'running'
      )
        throw new Error('AI_PENDING');
      if (
        (value as { status?: unknown }).status === 'failed' ||
        (value as { status?: unknown }).status === 'expired'
      )
        throw new Error('AI_FAILED');
      const result = object(value, [
        'status',
        'candidateId',
        'payload',
        'promptVersion',
        'modelVersion',
      ]);
      literal(result.status, 'succeeded', '$.status');
      return {
        candidateId: id(result.candidateId, '$.candidateId'),
        payload: assessmentDraftSchema.parse(result.payload),
      };
    },
    adoptAI: async (assessmentId, revision, candidateId) =>
      workspace(
        await send(
          '/assessments/' + encodeURIComponent(assessmentId) + '/adopt-ai',
          'POST',
          { expectedRevisionId: revision, candidateId },
        ),
      ),
  };
}
