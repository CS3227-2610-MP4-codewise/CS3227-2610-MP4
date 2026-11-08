import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { assessmentDatabase } from './database';
import { fixture } from './fixture';
import { AssessmentService } from '../../src/server/instructor/assessments/service';
import { draftFeedbackSchema } from '../../src/shared/instructor-contracts/assessment';
import {
  assertCurrentRelease,
  currentnessToken,
  withdrawnSchema,
  releaseSchema,
} from '../../src/shared/instructor-contracts/release';
import { sourceHash } from '../../src/shared/instructor-contracts/schema';
import { readFile } from 'node:fs/promises';
import type { AIGatewayPort } from '../../src/server/instructor/ports/contracts';
import type { AssessmentDraft } from '../../src/shared/instructor-contracts/ai';
let database: Awaited<ReturnType<typeof assessmentDatabase>>,
  f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => {
  database = await assessmentDatabase();
  f = await fixture(database.db);
}, 20000);
afterEach(async () => {
  await database?.close();
});
const create = () =>
  f.service().create(f.request('/', 'POST'), {
    attemptId: f.attempt.attemptId,
    requestKey: 'create_assessment',
  });
async function graded() {
  let v = await create();
  v = await f.service().save(f.request('/', 'PUT'), v.head.id, {
    expectedRevisionId: v.head.headRevisionId,
    feedback: {
      ...v.revision.feedback,
      criteria: v.revision.feedback.criteria.map((c) => ({
        ...c,
        score: 4.25,
        explanation:
          'Static inspection supports this award; code was not executed.',
      })),
    },
  });
  return v;
}
async function approved() {
  let v = await graded();
  v = await f.service().approve(f.request('/', 'POST'), v.head.id, {
    expectedRevisionId: v.head.headRevisionId,
    expectedAvailabilityRevision: v.head.availabilityRevision,
  });
  return v;
}
const command = (v: Awaited<ReturnType<typeof create>>, key = 'release_1') => ({
  schemaVersion: 1,
  assessmentId: v.head.id,
  assessmentRevisionId: v.head.headRevisionId,
  expectedAvailabilityRevision: v.head.availabilityRevision,
  idempotencyKey: key,
});
async function release() {
  const v = await approved();
  const r = await f
    .service()
    .release(f.request('/', 'POST'), v.head.id, command(v));
  return { v, r };
}
const withdrawal = (
  v: Awaited<ReturnType<typeof create>>,
  version: number,
  key = 'withdraw_1',
) => ({
  schemaVersion: 1,
  assessmentId: v.head.id,
  releaseVersion: version,
  expectedAvailabilityRevision: v.head.availabilityRevision,
  idempotencyKey: key,
  reason: 'Private instructor correction reason',
});
describe(
  'IAL instructor assessment with real local D1 and synthetic external ports',
  { timeout: 20000 },
  () => {
    it('keeps a validated synthetic AI candidate private until explicit adoption', async () => {
      const sql = await readFile(
        'src/server/db/migrations/0014_assessment_ai_candidates.sql',
        'utf8',
      );
      await database.db.batch(
        sql
          .split(/^-- statement\s*$/m)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => database.db.prepare(s)),
      );
      const v = await create();
      const draft: AssessmentDraft = {
        kind: 'assessment-draft',
        codeExecuted: false,
        reviewFlags: [],
        annotations: [],
        criteria: v.publication.questions.flatMap((q) =>
          q.criteria.map((c) => ({
            questionVersionId: q.questionVersionId,
            rubricVersionId: q.rubricVersionId,
            criterionId: c.criterionId,
            comparisonKey: c.comparisonKey,
            minimumScore: c.minimumScore,
            maximumScore: c.maximumScore,
            score: 3,
            explanation: 'Synthetic review',
          })),
        ),
      };
      const outcome = {
        schemaVersion: 1 as const,
        action: 'assessment-draft' as const,
        status: 'succeeded' as const,
        requestId: 'candidate_test',
        evidenceKey: 'e_test',
        promptVersion: 'prompt_v1',
        modelVersion: 'synthetic',
        latencyMs: 1,
        retries: 0,
        usage: { status: 'unavailable' as const },
        payload: draft,
      };
      const gateway: AIGatewayPort<'assessment-draft', AssessmentDraft> = {
        request: async () => outcome,
        readAuthorized: async () => outcome,
      };
      const base = f.service();
      const service = new AssessmentService(
        f.repository,
        f.identity,
        base.submissions,
        base.publications,
        undefined,
        undefined,
        gateway,
      );
      const revoking = new AssessmentService(
        f.repository,
        f.identity,
        base.submissions,
        base.publications,
        undefined,
        undefined,
        {
          ...gateway,
          request: async () => {
            f.state.revoked = true;
            return outcome;
          },
        },
      );
      await expect(
        revoking.generateAI(f.request('/', 'POST'), v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          requestKey: 'revocation_test',
          includePrivateReferences: false,
        }),
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
      f.state.revoked = false;
      expect(
        await database.db
          .prepare('SELECT count(*) AS n FROM instructor_ai_candidates')
          .first('n'),
      ).toBe(0);
      draft.criteria[0].score = Infinity;
      await expect(
        service.generateAI(f.request('/', 'POST'), v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          requestKey: 'invalid_test',
          includePrivateReferences: false,
        }),
      ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
      expect(
        await database.db
          .prepare('SELECT count(*) AS n FROM instructor_ai_candidates')
          .first('n'),
      ).toBe(0);
      draft.criteria[0].score = 3;
      const answer = v.attempt.answers[0];
      const q = v.publication.questions.find(
        (item) => item.questionVersionId === answer.questionVersionId,
      )!;
      draft.annotations.push({
        submittedAnswerId: answer.submittedAnswerId,
        questionVersionId: q.questionVersionId,
        rubricVersionId: q.rubricVersionId,
        criterionId: q.criteria[0].criterionId,
        startLine: 1,
        endLine: 1,
        excerpt: 'fabricated synthetic text',
        explanation: 'Invalid evidence',
      });
      await expect(
        service.generateAI(f.request('/', 'POST'), v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          requestKey: 'fabricated_test',
          includePrivateReferences: false,
        }),
      ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
      expect(
        await database.db
          .prepare('SELECT count(*) AS n FROM instructor_ai_candidates')
          .first('n'),
      ).toBe(0);
      draft.annotations = [];
      const candidate = await service.generateAI(
        f.request('/', 'POST'),
        v.head.id,
        {
          expectedRevisionId: v.head.headRevisionId,
          requestKey: 'generate_test',
          includePrivateReferences: false,
        },
      );
      expect(candidate.status).toBe('succeeded');
      expect(await service.recoverAI(f.request(), v.head.id)).toMatchObject({
        status: 'succeeded',
        candidateId: 'candidate_test',
      });
      expect(
        (
          await service.generateAI(f.request('/', 'POST'), v.head.id, {
            expectedRevisionId: v.head.headRevisionId,
            requestKey: 'generate_test',
            includePrivateReferences: false,
          })
        ).status,
      ).toBe('succeeded');
      expect(
        (await service.load(f.request(), v.head.id)).head.headRevisionId,
      ).toBe(v.head.headRevisionId);
      f.state.revoked = true;
      await expect(
        service.adoptAI(f.request('/', 'POST'), v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          candidateId: 'candidate_test',
        }),
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
      f.state.revoked = false;
      const adopted = await service.adoptAI(f.request('/', 'POST'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        candidateId: 'candidate_test',
      });
      expect(adopted.head.headRevisionId).not.toBe(v.head.headRevisionId);
      expect(adopted.head.approvedRevisionId).toBeNull();
      expect(adopted.revision.provenance).toBe('ai-assisted');
      expect(adopted.head.currentReleaseVersion).toBeNull();
      expect(
        await database.db
          .prepare(
            'SELECT candidate_id FROM instructor_ai_adoptions WHERE revision_id=?',
          )
          .bind(adopted.head.headRevisionId)
          .first(),
      ).toMatchObject({ candidate_id: 'candidate_test' });
      await expect(
        service.adoptAI(f.request('/', 'POST'), v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          candidateId: 'candidate_test',
        }),
      ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
      const changedFeedback = structuredClone(adopted.revision.feedback);
      changedFeedback.criteria[0].explanation =
        'Instructor edit during generation';
      const staleGateway: AIGatewayPort<'assessment-draft', AssessmentDraft> = {
        ...gateway,
        request: async () => {
          await service.save(f.request('/', 'PUT'), v.head.id, {
            expectedRevisionId: adopted.head.headRevisionId,
            feedback: changedFeedback,
          });
          return { ...outcome, requestId: 'candidate_stale' };
        },
      };
      const staleService = new AssessmentService(
        f.repository,
        f.identity,
        base.submissions,
        base.publications,
        undefined,
        undefined,
        staleGateway,
      );
      await expect(
        staleService.generateAI(f.request('/', 'POST'), v.head.id, {
          expectedRevisionId: adopted.head.headRevisionId,
          requestKey: 'stale_test',
          includePrivateReferences: false,
        }),
      ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
      expect(
        await f.repository.aiCandidate(
          v.head.id,
          f.principal.userId,
          'candidate_stale',
        ),
      ).toBeNull();
    });
    it('creates one assessment per attempt, persists partial drafts and rejects changed create keys', async () => {
      let v = await create();
      const again = await create();
      expect(again.head.id).toBe(v.head.id);
      const feedback = structuredClone(v.revision.feedback);
      feedback.criteria[0].score = 2.5;
      v = await f.service().save(f.request('/', 'PUT'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        feedback,
      });
      expect(
        (await f.service().load(f.request(), v.head.id)).revision.feedback,
      ).toEqual(feedback);
      expect(v.history).toHaveLength(2);
      await expect(
        f.service().approve(f.request('/', 'POST'), v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          expectedAvailabilityRevision: 1,
        }),
      ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
      const raw = await database.db
        .prepare('SELECT * FROM instructor_assessments')
        .first();
      expect(JSON.stringify(raw)).not.toContain('def greet');
      expect(JSON.stringify(raw)).not.toContain('PRIVATE_REFERENCE');
    });
    it('denies missing, foreign, revoked, origin/CSRF and browser role authority before private reads', async () => {
      const v = await create(),
        read = vi.spyOn(f.repository, 'read');
      f.state.foreign = true;
      await expect(
        f.service().load(f.request(), v.head.id),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(read).not.toHaveBeenCalled();
      f.state.foreign = false;
      f.state.revoked = true;
      await expect(
        f.service().load(f.request(), v.head.id),
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
      f.state.revoked = false;
      const forged = new Request('http://127.0.0.1:5177/', {
        method: 'PUT',
        headers: {
          Cookie: 'cw_assessment_fixture=synthetic_test_token',
          Origin: 'https://foreign.example',
          'X-Role': 'instructor',
        },
      });
      await expect(
        f.service().save(forged, v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          feedback: v.revision.feedback,
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(
        new AssessmentService(
          f.repository,
          undefined,
          f.service().submissions,
          f.service().publications,
        ).load(f.request(), v.head.id),
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
      await expect(
        new AssessmentService(
          f.repository,
          f.identity,
          undefined,
          undefined,
        ).load(f.request(), v.head.id),
      ).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
    });
    it('rejects precision, invalid supplied bounds, missing/foreign criteria and unknown fields without changing history', async () => {
      const v = await create();
      for (const value of [NaN, Infinity, -1, -0, 5.01, 1.234]) {
        const feedback = structuredClone(v.revision.feedback);
        feedback.criteria[0].score = value;
        await expect(
          f.service().save(f.request('/', 'PUT'), v.head.id, {
            expectedRevisionId: v.head.headRevisionId,
            feedback,
          }),
        ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
      }
      for (const criteria of [
        [],
        v.revision.feedback.criteria.slice(1),
        v.revision.feedback.criteria.map((c) => ({
          ...c,
          criterionId: 'foreign',
        })),
      ]) {
        await expect(
          f.service().save(f.request('/', 'PUT'), v.head.id, {
            expectedRevisionId: v.head.headRevisionId,
            feedback: { criteria, annotations: [] },
          }),
        ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
      }
      expect(() =>
        draftFeedbackSchema.parse({
          ...v.revision.feedback,
          role: 'instructor',
        }),
      ).toThrow();
      expect(
        (await f.service().load(f.request(), v.head.id)).history,
      ).toHaveLength(1);
    });
    it('validates exact inclusive source observations including final empty LF line', async () => {
      let v = await graded();
      const answer = f.attempt.answers[0],
        note = {
          submittedAnswerId: answer.submittedAnswerId,
          questionVersionId: answer.questionVersionId,
          rubricVersionId: answer.rubricVersionId,
          criterionId: v.revision.feedback.criteria[0].criterionId,
          startLine: 1,
          endLine: 2,
          excerpt: answer.source.split('\n').slice(0, 2).join('\n'),
          explanation: 'Source evidence',
        };
      for (const bad of [
        { ...note, endLine: 99 },
        { ...note, excerpt: 'invented' },
        { ...note, submittedAnswerId: 'foreign' },
        { ...note, criterionId: 'foreign' },
      ]) {
        await expect(
          f.service().save(f.request('/', 'PUT'), v.head.id, {
            expectedRevisionId: v.head.headRevisionId,
            feedback: { ...v.revision.feedback, annotations: [bad] },
          }),
        ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
      }
      const last = answer.source.split('\n').length;
      v = await f.service().save(f.request('/', 'PUT'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        feedback: {
          ...v.revision.feedback,
          annotations: [
            note,
            { ...note, startLine: last, endLine: last, excerpt: '' },
          ],
        },
      });
      expect(v.revision.feedback.annotations[1].excerpt).toBe('');
    });
    it('keeps publication and attempt pinned after republish and rejects mutated immutable evidence', async () => {
      const v = await create();
      let d = await f.publicationService.load(
        f.request(),
        f.publication.assignmentId,
      );
      d = await f.publicationService.save(
        f.request('/', 'PUT'),
        d.assignmentId,
        {
          expectedRevision: d.revision,
          payload: { ...d.payload, title: 'A later publication' },
        },
      );
      await f.publicationService.publish(
        f.request('/', 'POST'),
        d.assignmentId,
        { expectedRevision: d.revision, idempotencyKey: 'publish_2' },
      );
      expect(
        (await f.service().load(f.request(), v.head.id)).publication.title,
      ).toBe('Small Python programs');
      f.attempt.answers[0].source = 'changed\n';
      f.attempt.answers[0].sourceHash = await sourceHash(
        f.attempt.answers[0].source,
      );
      await expect(
        f.service().load(f.request(), v.head.id),
      ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
    });
    it('rejects stale saves and handles competing saves with exactly one immutable winner', async () => {
      const v = await create();
      const a = structuredClone(v.revision.feedback),
        b = structuredClone(a);
      a.criteria[0].score = 1;
      b.criteria[0].score = 2;
      const outcomes = await Promise.allSettled(
        [a, b].map((feedback) =>
          f.service().save(f.request('/', 'PUT'), v.head.id, {
            expectedRevisionId: v.head.headRevisionId,
            feedback,
          }),
        ),
      );
      expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(
        (await f.service().load(f.request(), v.head.id)).history,
      ).toHaveLength(2);
      await expect(
        f.service().save(f.request('/', 'PUT'), v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          feedback: a,
        }),
      ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    });
    it('separates approval from release and invalidates approval after an edit', async () => {
      let v = await graded();
      await expect(
        f.service().release(f.request('/', 'POST'), v.head.id, command(v)),
      ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
      v = await f.service().approve(f.request('/', 'POST'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        expectedAvailabilityRevision: 1,
      });
      const old = command(v),
        feedback = structuredClone(v.revision.feedback);
      feedback.criteria[0].score = 3;
      v = await f.service().save(f.request('/', 'PUT'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        feedback,
      });
      expect(v.head.approvedRevisionId).toBeNull();
      expect(v.head.currentReleaseVersion).toBeNull();
      await expect(
        f.service().release(f.request('/', 'POST'), v.head.id, old),
      ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    });
    it('atomically releases concurrent matching commands once and rejects changed payload/new-key duplicates', async () => {
      const v = await approved(),
        cmd = command(v);
      const releases = await Promise.all(
        [1, 2].map(() =>
          f.service().release(f.request('/', 'POST'), v.head.id, cmd),
        ),
      );
      expect(releases[0]).toEqual(releases[1]);
      expect(releaseSchema.parse(releases[0]).releaseVersion).toBe(1);
      expect(
        (await f.repository.currentness(v.head.id, new Date().toISOString()))
          .availabilityRevision,
      ).toBe(2);
      await expect(
        f.service().release(f.request('/', 'POST'), v.head.id, {
          ...cmd,
          assessmentRevisionId: 'changed',
        }),
      ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
      const current = await f.service().load(f.request(), v.head.id);
      await expect(
        f
          .service()
          .release(
            f.request('/', 'POST'),
            v.head.id,
            command(current, 'new_key'),
          ),
      ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    }, 20000);
    it('rolls back release root, receipt and audit when a child statement fails', async () => {
      const v = await approved();
      await database.db
        .prepare(
          "CREATE TRIGGER injected_release_failure BEFORE INSERT ON instructor_assessment_releases BEGIN SELECT RAISE(ABORT,'synthetic failure'); END",
        )
        .run();
      await expect(
        f.service().release(f.request('/', 'POST'), v.head.id, command(v)),
      ).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
      expect(
        (await f.repository.currentness(v.head.id, new Date().toISOString()))
          .currentReleaseVersion,
      ).toBeNull();
      expect(
        await database.db
          .prepare(
            "SELECT count(*) AS n FROM instructor_assessment_audit WHERE action='release'",
          )
          .first('n'),
      ).toBe(0);
      expect(
        await database.db
          .prepare(
            "SELECT count(*) AS n FROM instructor_assessment_receipts WHERE operation='release'",
          )
          .first('n'),
      ).toBe(0);
    });
    it('keeps old release current during correction, then supersedes it with fresh reviewed release', async () => {
      const { v, r } = await release();
      let next = await f.service().correct(f.request('/', 'POST'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        sourceRevisionId: v.head.headRevisionId,
      });
      expect(next.head.currentReleaseVersion).toBe(1);
      expect(next.head.approvedRevisionId).toBeNull();
      next = await f.service().approve(f.request('/', 'POST'), v.head.id, {
        expectedRevisionId: next.head.headRevisionId,
        expectedAvailabilityRevision: next.head.availabilityRevision,
      });
      const corrected = await f
        .service()
        .release(f.request('/', 'POST'), v.head.id, command(next, 'release_2'));
      expect(corrected.releaseVersion).toBe(2);
      expect(
        (await f.repository.publicState(v.head.id, 1, r.releasedAt)).feedback
          .state,
      ).toBe('superseded');
      expect(
        (
          await f
            .service()
            .load(f.request(), v.head.id, undefined, v.head.headRevisionId)
        ).revision.id,
      ).toBe(v.head.headRevisionId);
    }, 20000);
    it('implements historical/current tombstones, once-only retry and no historical revival', async () => {
      const { v } = await release();
      let next = await f.service().correct(f.request('/', 'POST'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        sourceRevisionId: v.head.headRevisionId,
      });
      next = await f.service().approve(f.request('/', 'POST'), v.head.id, {
        expectedRevisionId: next.head.headRevisionId,
        expectedAvailabilityRevision: 2,
      });
      await f
        .service()
        .release(f.request('/', 'POST'), v.head.id, command(next, 'release_2'));
      let current = await f.service().load(f.request(), v.head.id);
      const cmd = withdrawal(current, 1);
      const tomb = await f
        .service()
        .withdraw(f.request('/', 'POST'), v.head.id, cmd);
      expect(withdrawnSchema.parse(tomb).releaseVersion).toBe(1);
      expect(
        await f.service().withdraw(f.request('/', 'POST'), v.head.id, cmd),
      ).toEqual(tomb);
      current = await f.service().load(f.request(), v.head.id);
      expect(current.head.currentReleaseVersion).toBe(2);
      expect(current.head.availabilityRevision).toBe(4);
      await f
        .service()
        .withdraw(
          f.request('/', 'POST'),
          v.head.id,
          withdrawal(current, 2, 'withdraw_2'),
        );
      const state = await f.repository.currentness(
        v.head.id,
        new Date().toISOString(),
      );
      expect(state.currentReleaseVersion).toBeNull();
      expect(state.withdrawnReleaseVersions).toEqual([1, 2]);
      expect(JSON.stringify(tomb)).not.toMatch(/criteria|reason|actor|source/);
    }, 20000);
    it('does not resurrect withdrawn release receipts and denies revoked replay', async () => {
      const { v } = await release(),
        current = await f.service().load(f.request(), v.head.id);
      await f
        .service()
        .withdraw(f.request('/', 'POST'), v.head.id, withdrawal(current, 1));
      await expect(
        f.service().release(f.request('/', 'POST'), v.head.id, command(v)),
      ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
      f.state.revoked = true;
      await expect(
        f
          .service()
          .withdraw(f.request('/', 'POST'), v.head.id, withdrawal(current, 1)),
      ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    });
    it('provides self-only safe feedback/currentness, rejects stale token and returns tombstones', async () => {
      const { v, r } = await release();
      f.state.role = 'student';
      Object.assign(f.principal, { userId: 'student_synthetic' });
      const consumer = f.service().consumer(f.request());
      const before = await consumer.currentness(f.principal, v.head.id);
      const publicFeedback = await consumer.getAuthorized(
        f.principal,
        v.head.id,
        1,
      );
      expect(assertCurrentRelease(publicFeedback, before)).toEqual(r);
      const originalSource = f.attempt.answers[0].source;
      f.attempt.answers[0].source = 'changed evidence';
      f.attempt.answers[0].sourceHash = await sourceHash(
        f.attempt.answers[0].source,
      );
      await expect(
        consumer.getAuthorized(f.principal, v.head.id, 1),
      ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
      await expect(
        consumer.currentness(f.principal, v.head.id),
      ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
      f.attempt.answers[0].source = originalSource;
      f.attempt.answers[0].sourceHash = await sourceHash(originalSource);
      expect(JSON.stringify(publicFeedback)).not.toMatch(
        /PRIVATE_REFERENCE|actorId|provenance/,
      );
      Object.assign(f.principal, { userId: 'foreign_student' });
      await expect(
        consumer.getAuthorized(f.principal, v.head.id, 1),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      Object.assign(f.principal, { userId: 'instructor_synthetic' });
      f.state.role = 'instructor';
      const current = await f.service().load(f.request(), v.head.id);
      await f
        .service()
        .withdraw(f.request('/', 'POST'), v.head.id, withdrawal(current, 1));
      Object.assign(f.principal, { userId: 'student_synthetic' });
      f.state.role = 'student';
      expect(
        (await consumer.getAuthorized(f.principal, v.head.id, 1)).state,
      ).toBe('withdrawn');
      expect(() =>
        assertCurrentRelease(
          r,
          { ...before, availabilityRevision: before.availabilityRevision + 1 },
          currentnessToken(before),
        ),
      ).toThrow();
    });
    it('protects immutable revisions/releases/audit and preserves metadata on service restart', async () => {
      const { v } = await release();
      for (const table of [
        'instructor_assessment_revisions',
        'instructor_assessment_releases',
        'instructor_assessment_audit',
        'instructor_assessment_receipts',
      ]) {
        await expect(
          database.db.prepare('DELETE FROM ' + table).run(),
        ).rejects.toThrow();
        await expect(
          database.db
            .prepare(
              'UPDATE ' +
                table +
                ' SET ' +
                (table.endsWith('revisions')
                  ? 'actor_id'
                  : table.endsWith('releases')
                    ? 'released_at'
                    : table.endsWith('audit')
                      ? 'actor_id'
                      : 'fingerprint') +
                "='changed'",
            )
            .run(),
        ).rejects.toThrow();
      }
      expect(
        (await f.service().load(f.request(), v.head.id)).head
          .currentReleaseVersion,
      ).toBe(1);
      expect(
        (await f.service().audit(f.request(), v.head.id)).events.some(
          (e) => e.action === 'approve',
        ),
      ).toBe(true);
    });
  },
);
