import { BoundaryError, id } from '../../shared/instructor-contracts/schema';
import {
  currentStudentGuard,
  studentGuardBindings,
} from '../courses/authority';
import { AssessmentRepository } from '../instructor/assessments/repository';
import { AssessmentService } from '../instructor/assessments/service';
import type {
  IdentityCoursePort,
  SubmissionReadPort,
  TrustedPrincipal,
} from '../instructor/ports/contracts';
import type { StudentReleasePort } from './feedback';
import type { StudentWork } from './work';

/**
 * SF-01, C-REL (student-released-feedback 5.2; Darryl's go-ahead recorded 2026-11-12 in
 * workflow/Ownership.md): Darryl's real producer, `AssessmentService.consumer`, composed with
 * student read ports. The instructor workflow's object checks authorize instructors only, so
 * the student path supplies its own:
 *
 * - `requireObject` reads an `assessment` or `submission` only when it belongs to the caller's
 *   own attempt and the caller holds current Student membership in that attempt's course. The
 *   check is one SQL statement with `currentStudentGuard`; the assessment's attempt and course
 *   come from the producer's own `AssessmentRepository.scope`, and nothing else is read from
 *   assessment tables here. Writes are refused.
 * - `SubmissionReadPort` is `StudentWork.attempt`, the same guarded own-attempt read the
 *   student routes use; it produces the same attempt projection as the instructor catalog.
 *
 * Session, mutation-origin and course checks are the shared SH-AUTH/SH-ID ones, unchanged.
 * Real D1 only; loopback samples never reach this port.
 */
export function studentReleasePort(
  db: D1Database,
  identity: IdentityCoursePort,
  work: StudentWork,
  request: Request,
): StudentReleasePort {
  const repository = new AssessmentRepository(db);
  const ownAttemptCourse = async (
    principal: TrustedPrincipal,
    attemptId: string,
  ) => {
    const row = await db
      .prepare(
        `SELECT a.course_id FROM student_attempts a
         WHERE a.id=?5 AND a.user_id=?4 AND ${currentStudentGuard('a.course_id')}`,
      )
      .bind(...studentGuardBindings(principal, work.clock()), attemptId)
      .first<{ course_id: string }>();
    if (!row) throw new BoundaryError('FORBIDDEN');
    return row.course_id;
  };
  const studentIdentity: IdentityCoursePort = {
    ...identity,
    async requireObject(principal, target, action) {
      if (action !== 'read') throw new BoundaryError('FORBIDDEN');
      const targetId = id(target.id, '$.id');
      if (target.kind === 'submission')
        return { courseId: await ownAttemptCourse(principal, targetId) };
      if (target.kind === 'assessment') {
        const meta = await repository.scope(targetId);
        if (!meta) throw new BoundaryError('NOT_FOUND');
        const courseId = await ownAttemptCourse(principal, meta.attemptId);
        if (courseId !== meta.courseId) throw new BoundaryError('FORBIDDEN');
        return { courseId };
      }
      throw new BoundaryError('NOT_FOUND');
    },
  };
  const submissions: SubmissionReadPort = {
    getAuthorized: (principal, attemptId) => work.attempt(principal, attemptId),
  };
  // The consumer reads no publication, so no publication port is supplied.
  return new AssessmentService(
    repository,
    studentIdentity,
    submissions,
    undefined,
  ).consumer(request);
}
