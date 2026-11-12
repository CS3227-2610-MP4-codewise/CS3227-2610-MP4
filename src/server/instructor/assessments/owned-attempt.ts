import {
  currentStudentGuard,
  studentGuardBindings,
} from '../../courses/authority';
import { readAttempt } from '../../student/attempts';
import type { SubmissionReadPort } from '../ports/contracts';

/** Request principal must still own the attempt and hold current Student membership. */
export class D1OwnedAttemptReader implements SubmissionReadPort {
  constructor(
    readonly db: D1Database,
    readonly clock: () => number = Date.now,
  ) {}
  getAuthorized(
    principal: Parameters<SubmissionReadPort['getAuthorized']>[0],
    attemptId: string,
  ) {
    return readAttempt(
      this.db,
      attemptId,
      `a.user_id=?4 AND ${currentStudentGuard('a.course_id')}`,
      studentGuardBindings(principal, this.clock()),
    );
  }
}
