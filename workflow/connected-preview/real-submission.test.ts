import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import type { Miniflare } from 'miniflare';
import {
  createDatabase,
  iso,
  NOW,
  principal,
  publish,
  seedPeople,
  testSessions,
} from '../../src/server/student/test-fixture';
import { StudentWork } from '../../src/server/student/work';
import { D1SubmissionCatalog } from '../../src/server/student/catalog';
import {
  draftSaveRequestSchema,
  submitRequestSchema,
} from '../../src/shared/student-work';
import { CourseAuthority } from '../../src/server/courses/authority';
import { D1Assignments } from '../../src/server/instructor/assignments/repository';
import { AssignmentService } from '../../src/server/instructor/assignments/service';
import { AssessmentRepository } from '../../src/server/instructor/assessments/repository';
import { AssessmentWorkflow } from '../../src/server/instructor/assessments/workflow';
import { D1OwnedAttemptReader } from '../../src/server/instructor/assessments/owned-attempt';
import { releaseHandler } from '../../src/server/instructor/assessments/release-http';
import { syntheticAssessmentGateway } from './worker';

let mf: Miniflare;
let db: D1Database;
beforeAll(async () => {
  ({ mf, db } = await createDatabase('real-assessment-integration'));
  for (const name of [
    '0008_instructor_assessments.sql',
    '0013_ai_gateway.sql',
    '0014_assessment_ai_candidates.sql',
    '0016_instructor_ai_recovery.sql',
  ]) {
    const sql = await readFile('src/server/db/migrations/' + name, 'utf8');
    await db.batch(
      sql
        .split(/^-- statement\s*$/m)
        .filter((s) => s.replace(/^--.*$/gm, '').trim())
        .map((s) => db.prepare(s)),
    );
  }
  await seedPeople(
    db,
    ['learner', 'peer', 'teacher', 'outsider'],
    [
      ['course-a', 'learner', 'student'],
      ['course-a', 'peer', 'student'],
      ['course-a', 'teacher', 'instructor'],
      ['course-b', 'outsider', 'instructor'],
    ],
  );
  await db
    .prepare('UPDATE auth_sessions SET expires_at=?, last_seen=?')
    .bind(Date.now() + 3600000, Date.now())
    .run();
  await publish(db, {
    course: 'course-a',
    assignment: 'assignment',
    version: 'publication',
    number: 1,
    deadline: iso(NOW + 600000),
  });
}, 60000);
afterAll(async () => {
  await mf?.dispose();
});

describe(
  'real submission and instructor assessment',
  { timeout: 120000 },
  () => {
    it('submits immutable work and creates, approves and releases its assessment', async () => {
      const work = new StudentWork(db, () => NOW);
      for (const question of ['qv-publication-0', 'qv-publication-1']) {
        await work.save(
          principal('learner'),
          question,
          draftSaveRequestSchema.parse({
            schemaVersion: 1,
            baseRevision: 0,
            source: 'print(1)\n',
          }),
        );
      }
      const draft = await work.work(principal('learner'), 'publication');
      const submitted = await work.submit(
        principal('learner'),
        'publication',
        submitRequestSchema.parse({
          schemaVersion: 1,
          idempotencyKey: 'submit-one',
          answers: draft.questions.map((q) => ({
            questionVersionId: q.questionVersionId,
            draftRevision: q.revision,
            sourceHash: q.sourceHash,
          })),
        }),
      );
      const authority = new CourseAuthority(db);
      const identity = {
        requireSession: async (r: Request) =>
          (await testSessions.requireSession(r)).principal,
        requireMutationOrigin: testSessions.requireMutationOrigin,
        requireCourse: authority.requireCourse.bind(authority),
        requireObject: authority.requireObject.bind(authority),
      };
      const storage = new D1Assignments(db, { enforceAuthority: true });
      const assignments = new AssignmentService(storage, identity);
      const repository = new AssessmentRepository(db, {
        guardedBatch: (s, p, c) => storage.guarded(s, p, c),
      });
      const request = new Request(
        'https://app.example.test/api/instructor/assessments',
        {
          method: 'POST',
          headers: {
            'x-test-user': 'teacher',
            origin: 'https://app.example.test',
            'x-csrf': 'valid',
          },
        },
      );
      const catalog = new D1SubmissionCatalog(db);
      const workflow = new AssessmentWorkflow(
        request,
        identity,
        assignments,
        repository,
        catalog,
        undefined,
        new D1OwnedAttemptReader(db),
      );
      await expect(
        catalog.getAuthorized(principal('outsider'), submitted.attemptId),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      let view = await workflow.service.create(request, {
        attemptId: submitted.attemptId,
        requestKey: 'create-one',
      });
      expect(view.attempt.answers.every((a) => a.source === 'print(1)\n')).toBe(
        true,
      );
      // The actual submission producer and assessment gateway are composed with a synthetic provider transport.
      const assessmentPath = '/api/instructor/assessments/' + view.head.id;
      const aiRequest = (
        user: string,
        action: string,
        method = 'GET',
        body?: unknown,
      ) =>
        new Request('https://app.example.test' + assessmentPath + action, {
          method,
          headers: {
            'x-test-user': user,
            origin: 'https://app.example.test',
            'x-csrf': 'valid',
            'content-type': 'application/json',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
      const aiWorkflow = (r: Request) =>
        new AssessmentWorkflow(
          r,
          identity,
          assignments,
          repository,
          catalog,
          syntheticAssessmentGateway(db, () => 1_800_000_000_000),
          new D1OwnedAttemptReader(db),
        ).handle();
      const generated = await aiWorkflow(
        aiRequest('teacher', '/generate-ai', 'POST', {
          expectedRevisionId: view.head.headRevisionId,
          requestKey: 'real_submission_ai',
          includePrivateReferences: false,
        }),
      );
      expect(
        generated.status,
        JSON.stringify(await generated.clone().json()),
      ).toBe(200);
      const candidate = (await generated.json()) as {
        status: string;
        candidateId: string;
      };
      expect(candidate.status).toBe('succeeded');
      expect(
        (await aiWorkflow(aiRequest('outsider', '/ai-candidate'))).status,
      ).toBe(403);
      const recovered = await aiWorkflow(aiRequest('teacher', '/ai-candidate'));
      expect(await recovered.json()).toMatchObject({
        status: 'succeeded',
        candidateId: candidate.candidateId,
      });
      expect(
        (await repository.read(view.head.id)).head.approvedRevisionId,
      ).toBeNull();
      const feedbackRequest = (user: string, suffix: string) =>
        new Request(
          `https://app.example.test/api/student/released-feedback/${view.head.id}/${suffix}`,
          { headers: { 'x-test-user': user } },
        );
      const feedback = (user: string, suffix: string) => {
        const req = feedbackRequest(user, suffix);
        return releaseHandler(req, identity, workflow.service.consumer(req));
      };
      expect((await feedback('learner', 'currentness')).status).toBe(404);
      await work.save(
        principal('learner'),
        'qv-publication-0',
        draftSaveRequestSchema.parse({
          schemaVersion: 1,
          baseRevision: 1,
          source: 'print(2)\n',
        }),
      );
      view = await workflow.service.save(request, view.head.id, {
        expectedRevisionId: view.head.headRevisionId,
        feedback: {
          ...view.revision.feedback,
          criteria: view.revision.feedback.criteria.map((c) => ({
            ...c,
            score: 4,
            explanation: 'Reviewed manually.',
          })),
        },
      });
      view = await workflow.service.approve(request, view.head.id, {
        expectedRevisionId: view.head.headRevisionId,
        expectedAvailabilityRevision: view.head.availabilityRevision,
      });
      const release = await workflow.service.release(request, view.head.id, {
        schemaVersion: 1,
        assessmentId: view.head.id,
        assessmentRevisionId: view.head.headRevisionId,
        expectedAvailabilityRevision: view.head.availabilityRevision,
        idempotencyKey: 'release-one',
      });
      expect(release.submissionAttemptId).toBe(submitted.attemptId);
      const releasedResponse = await feedback('learner', '1');
      expect(releasedResponse.status).toBe(200);
      expect(await releasedResponse.json()).toMatchObject({
        submissionAttemptId: submitted.attemptId,
        state: 'released',
      });
      expect((await feedback('outsider', '1')).status).toBe(404);
      expect((await feedback('peer', '1')).status).toBe(404);
      expect((await feedback('teacher', '1')).status).toBe(404);
      expect((await feedback('learner', 'currentness')).status).toBe(200);
      await db
        .prepare(
          `UPDATE course_memberships SET active=0 WHERE user_id='learner' AND course_id='course-a'`,
        )
        .run();
      expect((await feedback('learner', '1')).status).toBe(404);
      await db
        .prepare(
          `UPDATE course_memberships SET active=1 WHERE user_id='learner' AND course_id='course-a'`,
        )
        .run();
      await db
        .prepare(
          "UPDATE auth_sessions SET revoked_at=? WHERE id='session-learner'",
        )
        .bind(Date.now())
        .run();
      expect((await feedback('learner', '1')).status).toBe(404);
      await db
        .prepare(
          "UPDATE auth_sessions SET revoked_at=NULL WHERE id='session-learner'",
        )
        .run();
      let corrected = await workflow.service.correct(request, view.head.id, {
        expectedRevisionId: view.head.headRevisionId,
        sourceRevisionId: view.head.headRevisionId,
      });
      await expect(
        workflow.service.release(request, view.head.id, {
          schemaVersion: 1,
          assessmentId: view.head.id,
          assessmentRevisionId: corrected.head.headRevisionId,
          expectedAvailabilityRevision: corrected.head.availabilityRevision,
          idempotencyKey: 'unapproved',
        }),
      ).rejects.toBeDefined();
      corrected = await workflow.service.approve(request, view.head.id, {
        expectedRevisionId: corrected.head.headRevisionId,
        expectedAvailabilityRevision: corrected.head.availabilityRevision,
      });
      await workflow.service.release(request, view.head.id, {
        schemaVersion: 1,
        assessmentId: view.head.id,
        assessmentRevisionId: corrected.head.headRevisionId,
        expectedAvailabilityRevision: corrected.head.availabilityRevision,
        idempotencyKey: 'release-two',
      });
      expect(await (await feedback('learner', '1')).json()).toMatchObject({
        state: 'superseded',
      });
      const latest = await workflow.service.load(request, view.head.id);
      await workflow.service.withdraw(request, view.head.id, {
        schemaVersion: 1,
        assessmentId: view.head.id,
        releaseVersion: 1,
        expectedAvailabilityRevision: latest.head.availabilityRevision,
        idempotencyKey: 'withdraw-one',
        reason: 'Private reason',
      });
      const tombstone = await (await feedback('learner', '1')).json();
      expect(tombstone).toMatchObject({ state: 'withdrawn' });
      expect(JSON.stringify(tombstone)).not.toMatch(
        /Private reason|criteria|source/,
      );
      expect(JSON.stringify(release)).not.toContain('PRIVATE-REFERENCE-MARKER');
      expect(
        (await workflow.service.load(request, view.head.id)).attempt.answers[0]
          .source,
      ).toBe('print(1)\n');
    });
  },
);
