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
import {
  draftSaveRequestSchema,
  submitRequestSchema,
} from '../../shared/student-work';

/**
 * Synthetic local-D1 composition for student-released-feedback 5.2–5.4 tests: Keith's student
 * routes and `studentReleasePort` (Darryl's real `AssessmentService.consumer`) with the real
 * instructor `AssessmentWorkflow` and C-SUB catalog. Users: s1, s2, gone (students), inst
 * (instructor), all in course-a. Not a deployment or live-provider check.
 */
export async function composedEnvironment(
  name: string,
  /** Optional instrumentation (e.g. read counting); the default is the plain local D1. */
  wrap: (db: D1Database) => D1Database = (db) => db,
) {
  const created = await createDatabase(name, [
    '0008_instructor_assessments.sql',
  ]);
  const mf = created.mf,
    db = wrap(created.db);
  const clock = () => NOW;
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
  const work = new StudentWork(db, clock);
  const authority = new CourseAuthority(db, clock);
  const identity: IdentityCoursePort = {
    async requireSession(request) {
      return (await testSessions.requireSession(request)).principal;
    },
    async requireMutationOrigin() {},
    requireCourse: authority.requireCourse.bind(authority),
    requireObject: authority.requireObject.bind(authority),
  };
  let counter = 0;
  const userRequest = (user: string, method = 'GET', path = '/') =>
    new Request('https://app.example.test' + path, {
      method,
      headers: { 'x-test-user': user },
    });

  /** The student consumer port for `user`, built per request as in `src/server/index.ts`. */
  const port = (user: string) =>
    studentReleasePort(db, identity, work, userRequest(user));

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

  /** Darryl's real instructor workflow, acting as `inst`. */
  const service = () =>
    new AssessmentWorkflow(
      userRequest('inst'),
      identity,
      new AssignmentService(new D1Assignments(db), identity),
      new AssessmentRepository(db),
      new D1SubmissionCatalog(db, clock),
    ).service;
  const inst = (method = 'GET') =>
    userRequest('inst', method, '/api/instructor/assessments');

  const instructor = {
    service,
    request: inst,
    /** Creates an assessment for `attemptId` and saves scores; not approved or released. */
    async graded(attemptId: string, key: string, score = 3.5) {
      const v = await service().create(inst('POST'), {
        attemptId,
        requestKey: 'create-' + key,
      });
      return service().save(inst('PUT'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        feedback: {
          ...v.revision.feedback,
          criteria: v.revision.feedback.criteria.map((c) => ({
            ...c,
            score,
            explanation: 'Static inspection only; code was not executed.',
          })),
        },
      });
    },
    async approve(id: string) {
      const v = await service().load(inst(), id);
      return service().approve(inst('POST'), id, {
        expectedRevisionId: v.head.headRevisionId,
        expectedAvailabilityRevision: v.head.availabilityRevision,
      });
    },
    async approveAndRelease(id: string, key: string) {
      const v = await instructor.approve(id);
      return service().release(inst('POST'), id, {
        schemaVersion: 1,
        assessmentId: id,
        assessmentRevisionId: v.head.headRevisionId,
        expectedAvailabilityRevision: v.head.availabilityRevision,
        idempotencyKey: 'release-' + key,
      });
    },
    async correct(id: string) {
      const v = await service().load(inst(), id);
      return service().correct(inst('POST'), id, {
        expectedRevisionId: v.head.headRevisionId,
        sourceRevisionId: v.head.headRevisionId,
      });
    },
    async withdraw(id: string, version: number, key: string) {
      const v = await service().load(inst(), id);
      return service().withdraw(inst('POST'), id, {
        schemaVersion: 1,
        assessmentId: id,
        releaseVersion: version,
        expectedAvailabilityRevision: v.head.availabilityRevision,
        idempotencyKey: 'withdraw-' + key,
        reason: 'PRIVATE-WITHDRAWAL-REASON',
      });
    },
  };

  /** A student API request through `studentHandler`, composed as in `src/server/index.ts`. */
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
    return {
      status: response.status,
      headers: response.headers,
      text,
      json: JSON.parse(text),
    };
  }

  return {
    mf,
    db,
    work,
    identity,
    port,
    assignment,
    submitted,
    instructor,
    call,
  };
}

/** Private markers that must never appear in a student response. */
export const PRIVATE_MARKERS =
  /PRIVATE-|reason|approv|actor|provenance|privateReference|evidence|headRevision/i;
