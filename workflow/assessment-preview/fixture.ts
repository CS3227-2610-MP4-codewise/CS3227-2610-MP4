/** Synthetic external producers, only for isolated tests and loopback preview. */
import { AssignmentService } from '../../src/server/instructor/assignments/service';
import { D1Assignments } from '../../src/server/instructor/assignments/repository';
import { AssessmentRepository } from '../../src/server/instructor/assessments/repository';
import {
  AssessmentService,
  publicationAdapter,
} from '../../src/server/instructor/assessments/service';
import type {
  IdentityCoursePort,
  TrustedPrincipal,
  SubmissionReadPort,
} from '../../src/server/instructor/ports/contracts';
import {
  sourceHash,
  BoundaryError,
} from '../../src/shared/instructor-contracts/schema';
import type { Attempt } from '../../src/shared/instructor-contracts/submission';
export const origin = 'http://127.0.0.1:5177',
  cookieName = 'cw_assessment_fixture',
  course = 'course_assessment_synthetic';
export async function fixture(db: D1Database, token = 'synthetic_test_token') {
  const assignments = new D1Assignments(db),
    repository = new AssessmentRepository(db);
  const state = {
    revoked: false,
    role: 'instructor' as 'instructor' | 'student',
    userId: 'instructor_synthetic',
    foreign: false,
  };
  const principal = {
    userId: state.userId,
    sessionHandle: token,
  } as TrustedPrincipal;
  const request = (path = '/', method = 'GET', body?: unknown) =>
    new Request(origin + path, {
      method,
      headers: {
        Cookie: cookieName + '=' + token,
        Origin: origin,
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  const identity: IdentityCoursePort = {
    async requireSession(r) {
      const cookies = (r.headers.get('cookie') ?? '')
        .split(';')
        .map((c) => c.trim())
        .filter((c) => c.startsWith(cookieName + '='));
      if (
        state.revoked ||
        cookies.length !== 1 ||
        cookies[0] !== cookieName + '=' + token
      )
        throw new BoundaryError('UNAUTHENTICATED');
      return principal;
    },
    async requireCourse(p, c, action) {
      if (
        state.revoked ||
        p !== principal ||
        c !== course ||
        state.foreign ||
        (state.role === 'student' && action !== 'student-read')
      )
        throw new BoundaryError('FORBIDDEN');
    },
    async requireObject(p, target, action) {
      if (
        state.revoked ||
        p !== principal ||
        state.foreign ||
        (state.role === 'student' && action === 'write')
      )
        throw new BoundaryError('FORBIDDEN');
      if (target.kind === 'assignment') {
        const s = await assignments.scope(target.id);
        if (s) return s;
      }
      if (
        target.kind === 'submission' &&
        target.id === 'attempt_assessment_synthetic'
      )
        return { courseId: course };
      if (target.kind === 'assessment') {
        const s = await repository.scope(target.id);
        if (s) return s;
      }
      throw new BoundaryError('NOT_FOUND');
    },
    async requireMutationOrigin(r) {
      if (
        r.headers.get('origin') !== origin ||
        r.headers.get('x-csrf-token') !== token
      )
        throw new BoundaryError('FORBIDDEN');
    },
  };
  const publicationService = new AssignmentService(
    assignments,
    identity,
    () => new Date('2026-11-07T00:00:00.000Z'),
  );
  let draft = await publicationService.create(request('/', 'POST'), {
    courseId: course,
    requestKey: 'assessment_fixture_assignment',
  });
  if (!draft.payload.title) {
    draft = await publicationService.save(
      request('/', 'PUT'),
      draft.assignmentId,
      {
        expectedRevision: draft.revision,
        payload: {
          title: 'Small Python programs',
          deadlineAt: '2030-12-01T00:00:00.000Z',
          questions: [1, 2].map((n) => ({
            questionId: 'fixture_question_' + n,
            rubricId: 'fixture_rubric_' + n,
            title: n === 1 ? 'Greeting a reader' : 'Adding values',
            instructions:
              n === 1
                ? 'Return a greeting for the supplied name.'
                : 'Find the sum of a list of values.',
            language: 'python',
            starterCode:
              n === 1 ? 'def greet(name):\n    pass\n' : 'total = 0\n',
            privateReference: 'PRIVATE_REFERENCE_SYNTHETIC',
            criteria: [
              {
                criterionId: 'correctness_' + n,
                comparisonKey: 'correctness_' + n,
                descriptor: 'The source meets the question requirements',
                minimumScore: 0,
                maximumScore: 5,
              },
              {
                criterionId: 'clarity_' + n,
                comparisonKey: 'clarity_' + n,
                descriptor: 'Names and structure communicate the approach',
                minimumScore: 0,
                maximumScore: 5,
              },
            ],
          })),
        },
      },
    );
  }
  const publication = (
    await publicationService.publish(request('/', 'POST'), draft.assignmentId, {
      expectedRevision: draft.revision,
      idempotencyKey: 'assessment_fixture_publication',
    })
  ).publication;
  const sources = [
    'def greet(name):\n    return "Hello, " + name\n\nprint(greet("Ada"))\n',
    'total = 0\nfor value in [1, 2, 3]:\n    total += value\nprint(total)\n',
  ];
  const attempt: Attempt = {
    schemaVersion: 1,
    attemptId: 'attempt_assessment_synthetic',
    assignmentVersionId: publication.assignmentVersionId,
    courseId: course,
    submittedByUserId: 'student_synthetic',
    submittedAt: '2026-11-07T00:30:00.000Z',
    answers: await Promise.all(
      publication.questions.map(async (q, n) => ({
        submittedAnswerId: 'fixture_answer_' + n,
        questionVersionId: q.questionVersionId,
        rubricVersionId: q.rubricVersionId,
        draftRevision: 1,
        source: sources[n],
        sourceHash: await sourceHash(sources[n]),
      })),
    ),
  };
  const submissions: SubmissionReadPort = {
    async getAuthorized(p, id) {
      if (p !== principal || state.revoked || id !== attempt.attemptId)
        throw new BoundaryError('FORBIDDEN');
      return structuredClone(attempt);
    },
  };
  const service = (r: Request = request()) =>
    new AssessmentService(
      repository,
      identity,
      submissions,
      publicationAdapter(publicationService, r),
      undefined,
      undefined,
      undefined,
      {
        async getAuthorized(p, id) {
          if (
            state.role !== 'student' ||
            p.userId !== attempt.submittedByUserId
          )
            throw new BoundaryError('FORBIDDEN');
          return submissions.getAuthorized(p, id);
        },
      },
    );
  return {
    repository,
    assignments,
    publicationService,
    publication,
    attempt,
    identity,
    principal,
    state,
    request,
    service,
  };
}
