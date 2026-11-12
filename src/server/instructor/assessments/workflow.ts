import {
  BoundaryError,
  id,
  object,
  toSafeError,
} from '../../../shared/instructor-contracts/schema';
import type { Publication } from '../../../shared/instructor-contracts/publication';
import type {
  IdentityCoursePort,
  SubmissionReadPort,
  TrustedPrincipal,
} from '../ports/contracts';
import type { AssignmentService } from '../assignments/service';
import { readJson } from '../assignments/http';
import { AssessmentRepository } from './repository';
import { AssessmentService, publicationAdapter } from './service';
import { assessmentHandler } from './http';
import { assessmentResolver } from '../../ai/assessment';
import type { GatewayResolver } from '../../ai/gateway';
import type { AssessmentDraft } from '../../../shared/instructor-contracts/ai';
import type { AIGatewayPort } from '../ports/contracts';
export type AssessmentGatewayFactory = (
  resolver: GatewayResolver<'assessment-draft', AssessmentDraft>,
) => AIGatewayPort<'assessment-draft', AssessmentDraft>;
export interface SubmissionCatalog extends SubmissionReadPort {
  readonly sampleMode: boolean;
  scope(
    principal: TrustedPrincipal,
    attemptId: string,
  ): Promise<{ courseId: string }>;
  list(
    principal: TrustedPrincipal,
    publication: Publication,
  ): Promise<
    Array<{
      attemptId: string;
      submittedAt: string;
      label: string;
      sample: boolean;
    }>
  >;
}
export class AssessmentWorkflow {
  readonly service: AssessmentService;
  constructor(
    readonly request: Request,
    readonly base: IdentityCoursePort,
    readonly assignments: AssignmentService,
    readonly repository: AssessmentRepository,
    readonly submissions?: SubmissionCatalog,
    gatewayFactory?: AssessmentGatewayFactory,
    ownedAttempts?: SubmissionReadPort,
  ) {
    const identity: IdentityCoursePort = {
      ...base,
      requireObject: async (p, target, action) => {
        if (target.kind === 'assessment') {
          const scope = await repository.scope(target.id);
          if (!scope) throw new BoundaryError('NOT_FOUND');
          await base.requireCourse(
            p,
            scope.courseId,
            action === 'write' ? 'instructor-write' : 'instructor-read',
          );
          return { courseId: scope.courseId };
        }
        if (target.kind === 'submission') {
          if (!submissions) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
          const scope = await submissions.scope(p, target.id);
          await base.requireCourse(
            p,
            scope.courseId,
            action === 'write' ? 'instructor-write' : 'instructor-read',
          );
          return scope;
        }
        return base.requireObject(p, target, action);
      },
    };
    const resolver = assessmentResolver(
      async (principal, courseId, attemptId) => {
        const current = await base.requireSession(request);
        if (
          current.userId !== principal.userId ||
          current.sessionHandle !== principal.sessionHandle
        )
          throw new BoundaryError('FORBIDDEN');
        const match = /^\/api\/instructor\/assessments\/([^/]+)/.exec(
          new URL(request.url).pathname,
        );
        if (!match) throw new BoundaryError('FORBIDDEN');
        const view = await this.service.load(
          request,
          decodeURIComponent(match[1]),
        );
        if (
          view.head.courseId !== courseId ||
          view.attempt.attemptId !== attemptId
        )
          throw new BoundaryError('FORBIDDEN');
        return { publication: view.publication, attempt: view.attempt };
      },
      async (principal, courseId, versionId) => {
        const current = await base.requireSession(request);
        if (
          current.userId !== principal.userId ||
          current.sessionHandle !== principal.sessionHandle
        )
          throw new BoundaryError('FORBIDDEN');
        await base.requireCourse(current, courseId, 'instructor-read');
        const result = await assignments.privateVersion(request, versionId);
        if (
          result.publication.courseId !== courseId ||
          result.publication.assignmentVersionId !== versionId
        )
          throw new BoundaryError('FORBIDDEN');
        return result.privateReferences;
      },
    );
    this.service = new AssessmentService(
      repository,
      identity,
      submissions,
      publicationAdapter(assignments, request),
      undefined,
      undefined,
      gatewayFactory?.(resolver),
      ownedAttempts,
    );
  }
  async authorizeDestination(principal: TrustedPrincipal, destination: string) {
    const match = /^\/instructor\/assessments\/([A-Za-z0-9_-]{1,128})$/.exec(
      destination,
    );
    if (!match) throw new BoundaryError('FORBIDDEN');
    await this.service.load(this.request, match[1]);
    if (
      (await this.base.requireSession(this.request)).userId !== principal.userId
    )
      throw new BoundaryError('FORBIDDEN');
  }
  async handle() {
    const request = this.request,
      url = new URL(request.url),
      path = url.pathname.slice('/api/instructor'.length),
      json = (v: unknown, status = 200) =>
        Response.json(v, {
          status,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        });
    try {
      const principal = await this.base.requireSession(request);
      if (path === '/review' && request.method === 'GET') {
        const courseId = id(url.searchParams.get('courseId'), '$.courseId');
        await this.base.requireCourse(principal, courseId, 'instructor-read');
        return json({
          ...(await this.assignments.list(
            request,
            courseId,
            url.searchParams.get('cursor') ?? '',
          )),
          available: !!this.submissions,
          sampleMode: this.submissions?.sampleMode === true,
        });
      }
      const versions = /^\/review\/assignments\/([^/]+)$/.exec(path);
      if (versions && request.method === 'GET') {
        const assignmentId = id(
            decodeURIComponent(versions[1]),
            '$.assignmentId',
          ),
          draft = await this.assignments.load(request, assignmentId);
        return json({
          assignmentId,
          title: draft.payload.title,
          courseId: draft.courseId,
          publications: await this.assignments.history(request, assignmentId),
          available: !!this.submissions,
          sampleMode: this.submissions?.sampleMode === true,
        });
      }
      const published =
        /^\/review\/publications\/([^/]+)(\/sample-assessment)?$/.exec(path);
      if (published) {
        const versionId = id(
            decodeURIComponent(published[1]),
            '$.assignmentVersionId',
          ),
          publication = (
            await this.assignments.privateVersion(request, versionId)
          ).publication;
        await this.base.requireCourse(
          principal,
          publication.courseId,
          published[2] ? 'instructor-write' : 'instructor-read',
        );
        if (!published[2] && request.method === 'GET')
          return json({
            publication,
            available: !!this.submissions,
            sampleMode: this.submissions?.sampleMode === true,
            attempts: this.submissions
              ? await this.submissions.list(principal, publication)
              : [],
          });
        if (published[2] && request.method === 'POST') {
          await this.base.requireMutationOrigin(request);
          if (!this.submissions?.sampleMode)
            throw new BoundaryError('UPSTREAM_UNAVAILABLE');
          const body = object(await readJson(request), ['requestKey']);
          const attempts = await this.submissions.list(principal, publication);
          if (attempts.length !== 1 || !attempts[0].sample)
            throw new BoundaryError('UPSTREAM_UNAVAILABLE');
          return json(
            await this.service.create(request, {
              attemptId: attempts[0].attemptId,
              requestKey: id(body.requestKey, '$.requestKey'),
            }),
            201,
          );
        }
      }
      const feedback = /^\/assessments\/([^/]+)\/feedback\/(\d+)$/.exec(path);
      if (feedback && request.method === 'GET')
        return json(
          await this.service.feedbackPreview(
            request,
            decodeURIComponent(feedback[1]),
            Number(feedback[2]),
          ),
        );
      return assessmentHandler(this.service, '/api/instructor')(request);
    } catch (e) {
      const safe = toSafeError(e, crypto.randomUUID()),
        code = safe.error.code;
      return json(
        safe,
        code === 'UNAUTHENTICATED'
          ? 401
          : code === 'FORBIDDEN'
            ? 403
            : code === 'NOT_FOUND'
              ? 404
              : code === 'INVALID_CONTRACT'
                ? 400
                : [
                      'REVISION_CONFLICT',
                      'IDEMPOTENCY_CONFLICT',
                      'STALE_EVIDENCE',
                    ].includes(code)
                  ? 409
                  : 503,
      );
    }
  }
}
