import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { StudentWork } from './work';
import { StudentAssignments } from './repository';
import { studentHandler } from './http';
import { studentReleasePort } from './release-port';
import { D1SubmissionCatalog } from './catalog';
import {
  NOW,
  createDatabase,
  iso,
  principal,
  publish,
  seedPeople,
  testSessions,
} from './test-fixture';
import { CourseAuthority } from '../courses/authority';
import { D1Assignments } from '../instructor/assignments/repository';
import { AssignmentService } from '../instructor/assignments/service';
import { AssessmentRepository } from '../instructor/assessments/repository';
import { AssessmentWorkflow } from '../instructor/assessments/workflow';
import type { IdentityCoursePort } from '../instructor/ports/contracts';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import {
  draftSaveRequestSchema,
  submitRequestSchema,
  attemptHistorySchema,
} from '../../shared/student-work';
import {
  feedbackSummarySchema,
  feedbackVersionSchema,
} from '../../shared/student-feedback';

/**
 * student-released-feedback 5.2 (SF-01, SF-02, SF-05, SF-07, C-REL): the student routes composed
 * with Darryl's real producer (`AssessmentService.consumer` via `studentReleasePort`) and the
 * real instructor assessment workflow, on local D1 with synthetic data. Not a deployment check.
 */
let mf: Miniflare;
let db: D1Database;
const clock = () => NOW;
let work: StudentWork;
let identity: IdentityCoursePort;
let counter = 0;

async function submitted(user: string, version: string, tag: string) {
  const w = await work.work(principal(user), version);
  for (const q of w.questions)
    await work.save(
      principal(user),
      q.questionVersionId,
      draftSaveRequestSchema.parse({
        schemaVersion: 1,
        baseRevision: q.revision,
        source: `total = 0\nprint('${tag}')\n`,
      }),
    );
  const fresh = await work.work(principal(user), version);
  return (
    await work.submit(
      principal(user),
      version,
      submitRequestSchema.parse({
        schemaVersion: 1,
        idempotencyKey: 'key-' + tag,
        answers: fresh.questions.map((q) => ({
          questionVersionId: q.questionVersionId,
          draftRevision: q.revision,
          sourceHash: q.sourceHash,
        })),
      }),
    )
  ).attemptId;
}
async function assignment() {
  const k = 'c' + ++counter;
  await publish(db, {
    course: 'course-a',
    assignment: 'asg-' + k,
    version: 'ver-' + k,
    number: 1,
    deadline: iso(NOW + 600_000),
  });
  return 'ver-' + k;
}

/** The instructor side through Darryl's real workflow and the real C-SUB catalog. */
function instructor() {
  const request = (method = 'GET') =>
    new Request('https://app.example.test/api/instructor/assessments', {
      method,
      headers: { 'x-test-user': 'inst' },
    });
  const service = () => {
    const r = request();
    return new AssessmentWorkflow(
      r,
      identity,
      new AssignmentService(new D1Assignments(db), identity),
      new AssessmentRepository(db),
      new D1SubmissionCatalog(db, clock),
    ).service;
  };
  return {
    async releasedAssessment(attemptId: string, key: string) {
      let v = await service().create(request('POST'), {
        attemptId,
        requestKey: 'create-' + key,
      });
      v = await service().save(request('PUT'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        feedback: {
          ...v.revision.feedback,
          criteria: v.revision.feedback.criteria.map((c) => ({
            ...c,
            score: 3.5,
            explanation: 'Static inspection only; code was not executed.',
          })),
        },
      });
      return v;
    },
    async approveAndRelease(id: string, key: string) {
      let v = await service().load(request(), id);
      v = await service().approve(request('POST'), id, {
        expectedRevisionId: v.head.headRevisionId,
        expectedAvailabilityRevision: v.head.availabilityRevision,
      });
      return service().release(request('POST'), id, {
        schemaVersion: 1,
        assessmentId: id,
        assessmentRevisionId: v.head.headRevisionId,
        expectedAvailabilityRevision: v.head.availabilityRevision,
        idempotencyKey: 'release-' + key,
      });
    },
    async correct(id: string) {
      const v = await service().load(request(), id);
      return service().correct(request('POST'), id, {
        expectedRevisionId: v.head.headRevisionId,
        sourceRevisionId: v.head.headRevisionId,
      });
    },
    async withdraw(id: string, version: number, key: string) {
      const v = await service().load(request(), id);
      return service().withdraw(request('POST'), id, {
        schemaVersion: 1,
        assessmentId: id,
        releaseVersion: version,
        expectedAvailabilityRevision: v.head.availabilityRevision,
        idempotencyKey: 'withdraw-' + key,
        reason: 'PRIVATE-WITHDRAWAL-REASON',
      });
    },
  };
}

async function call(path: string, user?: string) {
  const response = await studentHandler(
    new Request('https://app.example.test/api/student/' + path, {
      headers: user ? { 'x-test-user': user } : {},
    }),
    testSessions,
    new StudentAssignments(db, clock),
    work,
    (r) => studentReleasePort(db, identity, work, r),
  );
  const text = await response.text();
  return { status: response.status, text, json: JSON.parse(text) };
}
const PRIVATE =
  /PRIVATE-|reason|approv|actor|provenance|privateReference|evidence|headRevision/i;

beforeAll(async () => {
  ({ mf, db } = await createDatabase('student-release-port-test', [
    '0008_instructor_assessments.sql',
  ]));
  await seedPeople(
    db,
    ['s1', 's2', 'inst', 'gone'],
    [
      ['course-a', 's1', 'student'],
      ['course-a', 's2', 'student'],
      ['course-a', 'inst', 'instructor'],
      ['course-a', 'gone', 'student'],
    ],
  );
  work = new StudentWork(db, clock);
  const authority = new CourseAuthority(db, clock);
  identity = {
    async requireSession(request) {
      return (await testSessions.requireSession(request)).principal;
    },
    async requireMutationOrigin() {},
    requireCourse: authority.requireCourse.bind(authority),
    requireObject: authority.requireObject.bind(authority),
  };
}, 30000);
afterAll(async () => {
  await mf?.dispose();
});

describe('student feedback through the real composed producer (5.2)', () => {
  it('serves own released feedback (200) and denies a foreign student (404)', async () => {
    const version = await assignment();
    const attempt = await submitted('s1', version, 'own');
    const inst = instructor();
    expect((await call(`attempts/${attempt}/feedback`, 's1')).json).toEqual({
      schemaVersion: 1,
      state: 'none',
    });
    const v = await inst.releasedAssessment(attempt, 'own');
    // Saved but unreleased: still none, and no draft score or text leaks.
    const draft = await call(`attempts/${attempt}/feedback`, 's1');
    expect(draft.json).toEqual({ schemaVersion: 1, state: 'none' });
    expect(draft.text).not.toMatch(/3\.5|Static inspection/);

    await inst.approveAndRelease(v.head.id, 'own');
    const own = await call(`attempts/${attempt}/feedback`, 's1');
    expect(own.status).toBe(200);
    const summary = feedbackSummarySchema.parse(own.json);
    expect(summary.state).toBe('released');
    if (summary.state !== 'released') throw new Error('unreachable');
    expect(summary.release.submissionAttemptId).toBe(attempt);
    expect(summary.release.criteria.every((c) => c.score === 3.5)).toBe(true);
    expect(own.text).not.toMatch(PRIVATE);

    for (const user of ['s2', 'inst']) {
      const denied = await call(`attempts/${attempt}/feedback`, user);
      expect(denied.status).toBe(404);
      expect(denied.text).not.toMatch(/criteria|3\.5/);
    }
    // The port itself refuses a foreign caller, independent of the route's guard.
    await expect(
      studentReleasePort(
        db,
        identity,
        work,
        new Request('https://app.example.test/', {
          headers: { 'x-test-user': 's2' },
        }),
      ).attemptReleases(principal('s2'), [attempt]),
    ).rejects.toBeInstanceOf(BoundaryError);

    const history = attemptHistorySchema.parse(
      (await call(`publications/${version}/attempts`, 's1')).json,
    );
    expect(history.items.map((i) => i.feedbackReleased)).toEqual([true]);
  }, 30000);

  it('follows the K5 sequence on the real producer without revival', async () => {
    const version = await assignment();
    const attempt = await submitted('s1', version, 'k5');
    const inst = instructor();
    const v = await inst.releasedAssessment(attempt, 'k5');
    await inst.approveAndRelease(v.head.id, 'k5-1');
    await inst.correct(v.head.id);
    await inst.approveAndRelease(v.head.id, 'k5-2');
    let s = feedbackSummarySchema.parse(
      (await call(`attempts/${attempt}/feedback`, 's1')).json,
    );
    expect(s.state !== 'none' && s.versions).toEqual([
      { releaseVersion: 2, state: 'released' },
      { releaseVersion: 1, state: 'superseded' },
    ]);
    expect(
      feedbackVersionSchema.parse(
        (await call(`attempts/${attempt}/feedback/1`, 's1')).json,
      ).state,
    ).toBe('superseded');

    await inst.withdraw(v.head.id, 1, 'k5-1');
    const tomb = await call(`attempts/${attempt}/feedback/1`, 's1');
    expect(tomb.json).toMatchObject({ state: 'withdrawn', releaseVersion: 1 });
    expect(tomb.text).not.toMatch(/criteria|PRIVATE-WITHDRAWAL-REASON/);

    await inst.withdraw(v.head.id, 2, 'k5-2');
    const gone = await call(`attempts/${attempt}/feedback`, 's1');
    s = feedbackSummarySchema.parse(gone.json);
    expect(s).toMatchObject({
      state: 'withdrawn',
      versions: [
        { releaseVersion: 2, state: 'withdrawn' },
        { releaseVersion: 1, state: 'withdrawn' },
      ],
    });
    expect(gone.text).not.toMatch(/criteria|PRIVATE-WITHDRAWAL-REASON/);
    const history = attemptHistorySchema.parse(
      (await call(`publications/${version}/attempts`, 's1')).json,
    );
    expect(history.items.map((i) => i.feedbackReleased)).toEqual([false]);
  }, 30000);

  it('denies a revoked member with the uniform 404', async () => {
    const version = await assignment();
    const attempt = await submitted('gone', version, 'gone');
    const inst = instructor();
    const v = await inst.releasedAssessment(attempt, 'gone');
    await inst.approveAndRelease(v.head.id, 'gone');
    expect((await call(`attempts/${attempt}/feedback`, 'gone')).status).toBe(
      200,
    );
    await db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='gone'")
      .run();
    try {
      expect((await call(`attempts/${attempt}/feedback`, 'gone')).status).toBe(
        404,
      );
      await expect(
        studentReleasePort(
          db,
          identity,
          work,
          new Request('https://app.example.test/', {
            headers: { 'x-test-user': 'gone' },
          }),
        ).attemptReleases(principal('gone'), [attempt]),
      ).rejects.toBeInstanceOf(BoundaryError);
    } finally {
      await db
        .prepare("UPDATE course_memberships SET active=1 WHERE user_id='gone'")
        .run();
    }
  }, 30000);
});
