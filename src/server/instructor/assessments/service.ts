import {
  BoundaryError,
  assert,
  id,
  object,
  schema,
  sourceHash,
  integer,
  array,
  unique,
} from '../../../shared/instructor-contracts/schema';
import {
  draftFeedbackSchema,
  saveAssessmentSchema,
  reviewAssessmentSchema,
  type DraftFeedback,
  type AssessmentHead,
} from '../../../shared/instructor-contracts/assessment';
import { publicationSchema } from '../../../shared/instructor-contracts/publication';
import {
  attemptSchema,
  validateAttempt,
} from '../../../shared/instructor-contracts/submission';
import {
  validateFeedbackElements,
  validateRelease,
  releaseCommandSchema,
  withdrawalCommandSchema,
  assertApproval,
  currentnessToken,
  type Release,
} from '../../../shared/instructor-contracts/release';
import type {
  IdentityCoursePort,
  SubmissionReadPort,
  PublicationReadPort,
  TrustedPrincipal,
  ReleaseReadPort,
  AIGatewayPort,
} from '../ports/contracts';
import { MAX_ATTEMPT_RELEASES_BATCH } from '../ports/contracts';
import {
  validateAssessmentDraft,
  type AssessmentDraft,
} from '../../../shared/instructor-contracts/ai';
import type { AssignmentService } from '../assignments/service';
import { AssessmentRepository, type Receipt } from './repository';
export function publicationAdapter(
  service: AssignmentService,
  request: Request,
): PublicationReadPort {
  return {
    async getAuthorized(_p, version) {
      return (await service.privateVersion(request, version)).publication;
    },
  };
}
export class AssessmentService {
  constructor(
    readonly repository: AssessmentRepository,
    readonly identity: IdentityCoursePort | undefined,
    readonly submissions: SubmissionReadPort | undefined,
    readonly publications: PublicationReadPort | undefined,
    readonly clock: () => Date = () => new Date(),
    readonly nextId: () => string = () => crypto.randomUUID(),
    readonly ai?: AIGatewayPort<'assessment-draft', AssessmentDraft>,
  ) {}
  async session(request: Request) {
    if (!this.identity) throw new BoundaryError('UNAUTHENTICATED');
    return this.identity.requireSession(request);
  }
  private async scope(
    request: Request,
    value: string,
    write = false,
    student = false,
  ) {
    const principal = await this.session(request),
      target = id(value, '$.assessmentId'),
      meta = await this.repository.scope(target);
    if (!meta) throw new BoundaryError('NOT_FOUND');
    const scope = await this.identity!.requireObject(
      principal,
      { kind: 'assessment', id: target },
      write ? 'write' : 'read',
    );
    if (scope.courseId !== meta.courseId) throw new BoundaryError('FORBIDDEN');
    await this.identity!.requireCourse(
      principal,
      meta.courseId,
      student ? 'student-read' : write ? 'instructor-write' : 'instructor-read',
    );
    if (write) await this.identity!.requireMutationOrigin(request);
    return {
      principal,
      courseId: meta.courseId,
      attemptId: meta.attemptId,
      evidence: meta.evidence,
    };
  }
  private async evidence(
    principal: TrustedPrincipal,
    attemptId: string,
    courseId: string,
  ) {
    if (!this.submissions || !this.publications)
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    const raw = await this.submissions.getAuthorized(principal, attemptId);
    if (raw.attemptId !== attemptId || raw.courseId !== courseId)
      throw new BoundaryError('STALE_EVIDENCE');
    const publication = publicationSchema.parse(
      await this.publications.getAuthorized(principal, raw.assignmentVersionId),
    );
    if (publication.courseId !== courseId)
      throw new BoundaryError('STALE_EVIDENCE');
    const attempt = await validateAttempt(raw, publication);
    const fingerprint =
      (await sourceHash(JSON.stringify(attempt))) +
      ':' +
      (await sourceHash(JSON.stringify(publication)));
    return { publication, attempt, fingerprint };
  }
  private async context(request: Request, value: string, write = false) {
    const scope = await this.scope(request, value, write),
      view = await this.repository.read(value),
      evidence = await this.evidence(
        scope.principal,
        view.head.attemptId,
        scope.courseId,
      );
    if (
      view.head.evidence !== evidence.fingerprint ||
      view.head.publicationId !== evidence.publication.assignmentVersionId
    )
      throw new BoundaryError('STALE_EVIDENCE');
    return { ...scope, ...view, ...evidence };
  }
  private scopeKey(
    actor: string,
    course: string,
    operation: string,
    key: string,
    assessment?: string,
  ) {
    return JSON.stringify([actor, course, assessment ?? '', operation, key]);
  }
  private async receipt(scope: string, raw: unknown) {
    const fingerprint = await sourceHash(JSON.stringify(raw)),
      r = await this.repository.receipt(scope);
    if (r && r.fingerprint !== fingerprint)
      throw new BoundaryError('IDEMPOTENCY_CONFLICT');
    return { fingerprint, r };
  }
  private async validate(
    feedback: DraftFeedback,
    e: Awaited<ReturnType<AssessmentService['evidence']>>,
    complete = false,
  ) {
    const criteria: Release['criteria'] = feedback.criteria.map((c) => {
      const q = e.publication.questions.find(
          (q) =>
            q.questionVersionId === c.questionVersionId &&
            q.rubricVersionId === c.rubricVersionId,
        ),
        criterion = q?.criteria.find((r) => r.criterionId === c.criterionId);
      assert(criterion, '$.criteria', 'rubric_join');
      if (complete)
        assert(
          c.score !== null && c.explanation.trim().length > 0,
          '$.criteria',
          'incomplete',
        );
      return {
        ...c,
        comparisonKey: criterion.comparisonKey,
        minimumScore: criterion.minimumScore,
        maximumScore: criterion.maximumScore,
        score: c.score ?? criterion.minimumScore,
        explanation: complete
          ? c.explanation
          : c.explanation || 'Pending explanation',
      };
    });
    if (complete)
      for (const a of feedback.annotations)
        assert(a.explanation.trim().length > 0, '$.annotations', 'incomplete');
    const annotations = feedback.annotations.map((a) => ({
      ...a,
      explanation: complete
        ? a.explanation
        : a.explanation || 'Pending explanation',
    }));
    await validateFeedbackElements(
      criteria,
      annotations,
      e.publication,
      e.attempt,
    );
    return { criteria, annotations };
  }
  async create(request: Request, raw: unknown) {
    const principal = await this.session(request),
      cmd = schema((v) => {
        const o = object(v, ['attemptId', 'requestKey']);
        return {
          attemptId: id(o.attemptId, '$.attemptId'),
          requestKey: id(o.requestKey, '$.requestKey'),
        };
      }).parse(raw);
    const scope = await this.identity!.requireObject(
      principal,
      { kind: 'submission', id: cmd.attemptId },
      'write',
    );
    await this.identity!.requireCourse(
      principal,
      scope.courseId,
      'instructor-write',
    );
    await this.identity!.requireMutationOrigin(request);
    const e = await this.evidence(principal, cmd.attemptId, scope.courseId),
      assessmentId = 'assessment_' + (await sourceHash(cmd.attemptId));
    const key = this.scopeKey(
        principal.userId,
        scope.courseId,
        'create',
        cmd.requestKey,
      ),
      old = await this.receipt(key, cmd);
    if (old.r) return this.load(request, old.r.assessment_id);
    const feedback = draftFeedbackSchema.parse({
      criteria: e.publication.questions.flatMap((q) =>
        q.criteria.map((c) => ({
          questionVersionId: q.questionVersionId,
          rubricVersionId: q.rubricVersionId,
          criterionId: c.criterionId,
          score: null,
          explanation: '',
        })),
      ),
      annotations: [],
    });
    const revisionId = this.nextId(),
      head: AssessmentHead = {
        id: assessmentId,
        courseId: scope.courseId,
        attemptId: cmd.attemptId,
        publicationId: e.publication.assignmentVersionId,
        evidence: e.fingerprint,
        headRevisionId: revisionId,
        approvedRevisionId: null,
        availabilityRevision: 1,
        currentReleaseVersion: null,
        maximumReleaseVersion: 0,
      };
    // Reauthorize after asynchronous evidence resolution, before any write.
    const final = await this.identity!.requireObject(
      principal,
      { kind: 'submission', id: cmd.attemptId },
      'write',
    );
    if (final.courseId !== scope.courseId) throw new BoundaryError('FORBIDDEN');
    await this.identity!.requireCourse(
      principal,
      scope.courseId,
      'instructor-write',
    );
    await this.identity!.requireMutationOrigin(request);
    await this.session(request);
    try {
      await this.repository.create(
        head,
        {
          id: revisionId,
          assessmentId,
          parentRevisionId: null,
          actorId: principal.userId,
          createdAt: this.clock().toISOString(),
          provenance: 'manual',
          feedback,
        },
        {
          scope: key,
          fingerprint: old.fingerprint,
          assessment_id: assessmentId,
          operation: 'create',
          version: null,
          revision_id: revisionId,
        },
        principal,
      );
    } catch (error) {
      await this.session(request);
      await this.identity!.requireCourse(
        principal,
        scope.courseId,
        'instructor-write',
      );
      const winner = await this.receipt(key, cmd);
      if (!winner.r) throw error;
    }
    return this.load(request, assessmentId);
  }
  async load(
    request: Request,
    value: string,
    cursor?: string,
    selected?: string,
  ) {
    const c = await this.context(request, value);
    const page =
      cursor || selected
        ? await this.repository.read(
            value,
            cursor ? integer(Number(cursor), '$.cursor') : undefined,
            selected ? id(selected, '$.revisionId') : undefined,
          )
        : c;
    await this.scope(request, value);
    return {
      head: page.head,
      revision: page.revision,
      history: page.history,
      historyCursor: page.historyCursor,
      releases: page.releases,
      publication: c.publication,
      attempt: c.attempt,
    };
  }
  async save(request: Request, value: string, raw: unknown) {
    const c = await this.context(request, value, true),
      cmd = saveAssessmentSchema.parse(raw);
    if (cmd.expectedRevisionId !== c.head.headRevisionId)
      throw new BoundaryError('REVISION_CONFLICT');
    await this.validate(cmd.feedback, c);
    if (JSON.stringify(cmd.feedback) === JSON.stringify(c.revision.feedback))
      return this.load(request, value);
    const revisionId = this.nextId(),
      now = this.clock().toISOString();
    await this.context(request, value, true);
    await this.repository.commit(
      c.head,
      { ...c.head, headRevisionId: revisionId, approvedRevisionId: null },
      c.principal.userId,
      'save',
      now,
      {
        principal: c.principal,
        revision: {
          id: revisionId,
          assessmentId: value,
          parentRevisionId: c.head.headRevisionId,
          actorId: c.principal.userId,
          createdAt: now,
          provenance: 'manual',
          feedback: cmd.feedback,
        },
      },
    );
    return this.load(request, value);
  }
  async generateAI(request: Request, value: string, raw: unknown) {
    const cmd = schema((v) => {
      const o = object(v, [
        'expectedRevisionId',
        'requestKey',
        'includePrivateReferences',
      ]);
      assert(
        typeof o.includePrivateReferences === 'boolean',
        '$.includePrivateReferences',
      );
      return {
        expectedRevisionId: id(o.expectedRevisionId, '$.expectedRevisionId'),
        requestKey: id(o.requestKey, '$.requestKey'),
        includePrivateReferences: o.includePrivateReferences as boolean,
      };
    }).parse(raw);
    const c = await this.context(request, value, true);
    if (c.head.headRevisionId !== cmd.expectedRevisionId)
      throw new BoundaryError('REVISION_CONFLICT');
    if (!this.ai) throw new BoundaryError('AI_DISABLED');
    const outcome = await this.ai.request(c.principal, {
      schemaVersion: 1,
      action: 'assessment-draft',
      courseId: c.courseId,
      idempotencyKey: cmd.requestKey,
      evidenceRefs: [{ kind: 'submission', attemptId: c.attemptId }],
      outputTokenLimit: 512,
      includePrivateReferences: cmd.includePrivateReferences,
    });
    const fresh = await this.context(request, value, true);
    if (
      fresh.principal.userId !== c.principal.userId ||
      fresh.head.headRevisionId !== cmd.expectedRevisionId ||
      fresh.fingerprint !== c.fingerprint
    )
      throw new BoundaryError('STALE_EVIDENCE');
    if (outcome.status !== 'succeeded') return { status: outcome.status };
    const payload = await validateAssessmentDraft(
      outcome.payload,
      fresh.publication,
      fresh.attempt,
    );
    await this.repository.saveAICandidate(
      {
        id: outcome.requestId,
        assessment_id: value,
        actor_id: c.principal.userId,
        expected_revision_id: cmd.expectedRevisionId,
        evidence: c.fingerprint,
        payload: JSON.stringify(payload),
        prompt_version: outcome.promptVersion,
        model_version: outcome.modelVersion,
        created_at: this.clock().toISOString(),
      },
      c.courseId,
      c.principal,
    );
    await this.scope(request, value);
    return {
      status: 'succeeded' as const,
      candidateId: outcome.requestId,
      payload,
      promptVersion: outcome.promptVersion,
      modelVersion: outcome.modelVersion,
    };
  }
  async recoverAI(request: Request, value: string) {
    const c = await this.context(request, value);
    if (!this.ai) throw new BoundaryError('AI_DISABLED');
    const candidate = await this.repository.latestAICandidate(
      value,
      c.principal.userId,
      c.head.headRevisionId,
    );
    if (!candidate) return { status: 'none' as const };
    const outcome = await this.ai.readAuthorized(c.principal, candidate.id);
    if (
      outcome.status !== 'succeeded' ||
      candidate.evidence !== c.fingerprint ||
      outcome.promptVersion !== candidate.prompt_version ||
      outcome.modelVersion !== candidate.model_version
    )
      throw new BoundaryError('STALE_EVIDENCE');
    const payload = await validateAssessmentDraft(
      outcome.payload,
      c.publication,
      c.attempt,
    );
    if (JSON.stringify(payload) !== candidate.payload)
      throw new BoundaryError('STALE_EVIDENCE');
    const final = await this.context(request, value);
    if (
      final.head.headRevisionId !== c.head.headRevisionId ||
      final.principal.userId !== c.principal.userId
    )
      throw new BoundaryError('STALE_EVIDENCE');
    return {
      status: 'succeeded' as const,
      candidateId: candidate.id,
      payload,
      promptVersion: candidate.prompt_version,
      modelVersion: candidate.model_version,
    };
  }
  async adoptAI(request: Request, value: string, raw: unknown) {
    const cmd = schema((v) => {
      const o = object(v, ['candidateId', 'expectedRevisionId']);
      return {
        candidateId: id(o.candidateId, '$.candidateId'),
        expectedRevisionId: id(o.expectedRevisionId, '$.expectedRevisionId'),
      };
    }).parse(raw);
    const c = await this.context(request, value, true);
    if (c.head.headRevisionId !== cmd.expectedRevisionId)
      throw new BoundaryError('REVISION_CONFLICT');
    const candidate = await this.repository.aiCandidate(
      value,
      c.principal.userId,
      cmd.candidateId,
    );
    if (!candidate) throw new BoundaryError('NOT_FOUND');
    if (
      candidate.expected_revision_id !== cmd.expectedRevisionId ||
      candidate.evidence !== c.fingerprint
    )
      throw new BoundaryError('STALE_EVIDENCE');
    if (!this.ai) throw new BoundaryError('AI_DISABLED');
    const outcome = await this.ai.readAuthorized(c.principal, candidate.id);
    if (outcome.status !== 'succeeded')
      throw new BoundaryError('STALE_EVIDENCE');
    const payload = await validateAssessmentDraft(
      outcome.payload,
      c.publication,
      c.attempt,
    );
    if (
      JSON.stringify(payload) !== candidate.payload ||
      outcome.promptVersion !== candidate.prompt_version ||
      outcome.modelVersion !== candidate.model_version
    )
      throw new BoundaryError('STALE_EVIDENCE');
    const feedback = draftFeedbackSchema.parse({
      criteria: payload.criteria.map(
        ({
          questionVersionId,
          rubricVersionId,
          criterionId,
          score,
          explanation,
        }) => ({
          questionVersionId,
          rubricVersionId,
          criterionId,
          score,
          explanation,
        }),
      ),
      annotations: payload.annotations,
    });
    await this.validate(feedback, c, true);
    await this.context(request, value, true);
    const revisionId = this.nextId(),
      now = this.clock().toISOString();
    await this.repository.commit(
      c.head,
      { ...c.head, headRevisionId: revisionId, approvedRevisionId: null },
      c.principal.userId,
      'adopt-ai',
      now,
      {
        principal: c.principal,
        aiCandidateId: candidate.id,
        revision: {
          id: revisionId,
          assessmentId: value,
          parentRevisionId: c.head.headRevisionId,
          actorId: c.principal.userId,
          createdAt: now,
          provenance: 'manual',
          feedback,
        },
      },
    );
    return this.load(request, value);
  }
  async correct(request: Request, value: string, raw: unknown) {
    const c = await this.context(request, value, true),
      cmd = schema((v) => {
        const o = object(v, ['expectedRevisionId', 'sourceRevisionId']);
        return {
          expectedRevisionId: id(o.expectedRevisionId, '$.expectedRevisionId'),
          sourceRevisionId: id(o.sourceRevisionId, '$.sourceRevisionId'),
        };
      }).parse(raw);
    if (cmd.expectedRevisionId !== c.head.headRevisionId)
      throw new BoundaryError('REVISION_CONFLICT');
    const source = await this.repository.read(
      value,
      undefined,
      cmd.sourceRevisionId,
    );
    await this.validate(source.revision.feedback, c);
    const revisionId = this.nextId(),
      now = this.clock().toISOString();
    await this.context(request, value, true);
    await this.repository.commit(
      c.head,
      { ...c.head, headRevisionId: revisionId, approvedRevisionId: null },
      c.principal.userId,
      'correction',
      now,
      {
        principal: c.principal,
        revision: {
          id: revisionId,
          assessmentId: value,
          parentRevisionId: c.head.headRevisionId,
          actorId: c.principal.userId,
          createdAt: now,
          provenance: 'manual',
          feedback: source.revision.feedback,
        },
      },
    );
    return this.load(request, value);
  }
  async approve(request: Request, value: string, raw: unknown) {
    const c = await this.context(request, value, true),
      cmd = reviewAssessmentSchema.parse(raw);
    if (
      cmd.expectedRevisionId !== c.head.headRevisionId ||
      cmd.expectedAvailabilityRevision !== c.head.availabilityRevision
    )
      throw new BoundaryError('REVISION_CONFLICT');
    await this.validate(c.revision.feedback, c, true);
    await this.context(request, value, true);
    await this.repository.commit(
      c.head,
      { ...c.head, approvedRevisionId: c.head.headRevisionId },
      c.principal.userId,
      'approve',
      this.clock().toISOString(),
      { principal: c.principal },
    );
    return this.load(request, value);
  }
  async release(
    request: Request,
    value: string,
    raw: unknown,
  ): Promise<Release> {
    const c = await this.context(request, value, true),
      cmd = releaseCommandSchema.parse(raw);
    if (cmd.assessmentId !== value) throw new BoundaryError('INVALID_CONTRACT');
    const key = this.scopeKey(
        c.principal.userId,
        c.courseId,
        'release',
        cmd.idempotencyKey,
        value,
      ),
      receipt = await this.receipt(key, cmd);
    const replay = async (r: Receipt) => {
      await this.context(request, value, true);
      const state = await this.repository.publicState(
        value,
        r.version!,
        this.clock().toISOString(),
      );
      if (state.feedback.state === 'withdrawn')
        throw new BoundaryError('STALE_EVIDENCE');
      return state.feedback;
    };
    if (receipt.r) return replay(receipt.r);
    assertApproval({
      expectedAssessmentRevisionId: cmd.assessmentRevisionId,
      approvedRevisionId: c.head.approvedRevisionId ?? 'not_approved',
      actualAssessmentRevisionId: c.head.headRevisionId,
      expectedAvailabilityRevision: cmd.expectedAvailabilityRevision,
      actualAvailabilityRevision: c.head.availabilityRevision,
    });
    assert(c.head.maximumReleaseVersion < 10000, '$.releaseVersion', 'limit');
    const feedback = await this.validate(c.revision.feedback, c, true),
      release = await validateRelease(
        {
          schemaVersion: 1,
          id: value,
          submissionAttemptId: c.attempt.attemptId,
          assessmentRevisionId: cmd.assessmentRevisionId,
          releaseVersion: c.head.maximumReleaseVersion + 1,
          releasedAt: this.clock().toISOString(),
          state: 'released',
          ...feedback,
        },
        c.publication,
        c.attempt,
      );
    await this.context(request, value, true);
    try {
      await this.repository.commit(
        c.head,
        {
          ...c.head,
          currentReleaseVersion: release.releaseVersion,
          maximumReleaseVersion: release.releaseVersion,
          availabilityRevision: c.head.availabilityRevision + 1,
        },
        c.principal.userId,
        'release',
        release.releasedAt,
        {
          release,
          principal: c.principal,
          receipt: {
            scope: key,
            fingerprint: receipt.fingerprint,
            assessment_id: value,
            operation: 'release',
            version: release.releaseVersion,
            revision_id: release.assessmentRevisionId,
          },
        },
      );
    } catch (error) {
      await this.context(request, value, true);
      const winner = await this.receipt(key, cmd);
      if (winner.r) return replay(winner.r);
      throw error;
    }
    return release;
  }
  async withdraw(request: Request, value: string, raw: unknown) {
    const c = await this.context(request, value, true),
      cmd = withdrawalCommandSchema.parse(raw);
    if (cmd.assessmentId !== value) throw new BoundaryError('INVALID_CONTRACT');
    const key = this.scopeKey(
        c.principal.userId,
        c.courseId,
        'withdraw',
        cmd.idempotencyKey,
        value,
      ),
      receipt = await this.receipt(key, cmd);
    if (receipt.r) {
      await this.context(request, value, true);
      return (
        await this.repository.publicState(
          value,
          cmd.releaseVersion,
          this.clock().toISOString(),
        )
      ).feedback;
    }
    if (cmd.expectedAvailabilityRevision !== c.head.availabilityRevision)
      throw new BoundaryError('REVISION_CONFLICT');
    const prior = await this.repository.publicState(
      value,
      cmd.releaseVersion,
      this.clock().toISOString(),
    );
    if (prior.feedback.state === 'withdrawn')
      throw new BoundaryError('REVISION_CONFLICT');
    const now = this.clock().toISOString();
    await this.context(request, value, true);
    try {
      await this.repository.commit(
        c.head,
        {
          ...c.head,
          currentReleaseVersion:
            c.head.currentReleaseVersion === cmd.releaseVersion
              ? null
              : c.head.currentReleaseVersion,
          availabilityRevision: c.head.availabilityRevision + 1,
        },
        c.principal.userId,
        'withdraw',
        now,
        {
          principal: c.principal,
          withdraw: { version: cmd.releaseVersion, reason: cmd.reason },
          receipt: {
            scope: key,
            fingerprint: receipt.fingerprint,
            assessment_id: value,
            operation: 'withdraw',
            version: cmd.releaseVersion,
            revision_id: null,
          },
        },
      );
    } catch (error) {
      await this.context(request, value, true);
      const winner = await this.receipt(key, cmd);
      if (winner.r)
        return (
          await this.repository.publicState(
            value,
            cmd.releaseVersion,
            this.clock().toISOString(),
          )
        ).feedback;
      throw error;
    }
    return (await this.repository.publicState(value, cmd.releaseVersion, now))
      .feedback;
  }
  async feedbackPreview(request: Request, value: string, version: number) {
    await this.context(request, value);
    const state = await this.repository.publicState(
      value,
      integer(version, '$.releaseVersion'),
      this.clock().toISOString(),
    );
    await this.context(request, value);
    const current = await this.repository.currentness(
      value,
      this.clock().toISOString(),
    );
    if (currentnessToken(current) !== currentnessToken(state.currentness))
      throw new BoundaryError('STALE_EVIDENCE');
    return state;
  }
  async audit(request: Request, value: string, cursor?: string) {
    await this.context(request, value);
    const result = await this.repository.audit(
      value,
      cursor ? integer(Number(cursor), '$.cursor') : undefined,
    );
    await this.scope(request, value);
    return result;
  }
  consumer(request: Request): ReleaseReadPort {
    const authorize = async (principal: TrustedPrincipal, value: string) => {
      const scope = await this.scope(request, value, false, true);
      if (
        scope.principal.userId !== principal.userId ||
        scope.principal.sessionHandle !== principal.sessionHandle
      )
        throw new BoundaryError('FORBIDDEN');
      if (!this.submissions) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
      const attempt = attemptSchema.parse(
        await this.submissions.getAuthorized(scope.principal, scope.attemptId),
      );
      if (
        attempt.attemptId !== scope.attemptId ||
        attempt.courseId !== scope.courseId ||
        attempt.submittedByUserId !== scope.principal.userId
      )
        throw new BoundaryError('FORBIDDEN');
      if (
        (await sourceHash(JSON.stringify(attempt))) !==
        scope.evidence.split(':')[0]
      )
        throw new BoundaryError('STALE_EVIDENCE');
    };
    return {
      attemptReleases: async (p, attemptIds) => {
        const ids = array(
          attemptIds,
          (v, path) => id(v, path),
          '$.attemptIds',
          1,
          MAX_ATTEMPT_RELEASES_BATCH,
        );
        unique(ids, '$.attemptIds');
        // student-released-feedback D1, amended 2026-11-12 (OPS-01): one request-bound session
        // check and one D1 batch authorize the whole batch, instead of a per-attempt `authorize`.
        // The batch verifies in SQL that every attempt is the caller's own with current Student
        // membership; one miss fails the call. Only metadata is disclosed; content reads
        // (`getAuthorized`) keep the full per-attempt `authorize` and evidence check.
        const current = await this.session(request);
        if (
          current.userId !== p.userId ||
          current.sessionHandle !== p.sessionHandle
        )
          throw new BoundaryError('FORBIDDEN');
        const { owned, found } = await this.repository.attemptReleases(
          ids,
          current,
          this.clock(),
        );
        for (const attemptId of ids) {
          const course = owned.get(attemptId);
          const entry = found.get(attemptId);
          if (!course || (entry && entry.courseId !== course))
            throw new BoundaryError('FORBIDDEN');
        }
        return new Map(
          ids.map((attemptId) => {
            const entry = found.get(attemptId);
            return [
              attemptId,
              entry && entry.releaseVersions.length > 0
                ? {
                    assessmentId: entry.assessmentId,
                    currentness: entry.currentness,
                    releaseVersions: entry.releaseVersions,
                  }
                : null,
            ] as const;
          }),
        );
      },
      getAuthorized: async (p, value, version) => {
        await authorize(p, value);
        const state = await this.repository.publicState(
          value,
          integer(version, '$.releaseVersion'),
          this.clock().toISOString(),
        );
        await authorize(p, value);
        const current = await this.repository.currentness(
          value,
          this.clock().toISOString(),
        );
        if (currentnessToken(current) !== currentnessToken(state.currentness))
          throw new BoundaryError('STALE_EVIDENCE');
        return state.feedback;
      },
      currentness: async (p, value) => {
        await authorize(p, value);
        const current = await this.repository.currentness(
          value,
          this.clock().toISOString(),
        );
        await authorize(p, value);
        return current;
      },
    };
  }
}
