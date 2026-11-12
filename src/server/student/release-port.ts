import { AssessmentRepository } from '../instructor/assessments/repository';
import { AssessmentService } from '../instructor/assessments/service';
import { D1OwnedAttemptReader } from '../instructor/assessments/owned-attempt';
import type {
  IdentityCoursePort,
  TrustedPrincipal,
} from '../instructor/ports/contracts';
import type { StudentReleasePort } from './feedback';
import type { StudentWork } from './work';

/**
 * SF-01, C-REL (student-released-feedback 5.2; Keith's extension in workflow/Ownership.md):
 * Darryl's real producer, `AssessmentService.consumer`, for the student routes.
 *
 * - Content reads authorize through Darryl's `ownedAttempts` port (`D1OwnedAttemptReader`):
 *   the caller's own attempt with current Student membership, checked in SQL, plus his evidence
 *   check. `attemptReleases` authorizes its whole batch in one SQL check.
 * - OPS-01: a production session check costs 4 D1 queries and a provider lookup, and the
 *   producer re-resolves the session in every `authorize`. This port resolves it once per
 *   request. Revocation is still caught at each step, because every attempt read embeds
 *   `currentStudentGuard`, which re-checks the session row (revoked, expired, idle) in SQL.
 * - One clock serves the student guard and the producer.
 *
 * Real D1 only; loopback samples never reach this port.
 */
export function studentReleasePort(
  db: D1Database,
  identity: IdentityCoursePort,
  work: StudentWork,
  request: Request,
): StudentReleasePort {
  let session: Promise<TrustedPrincipal> | undefined;
  const studentIdentity: IdentityCoursePort = {
    ...identity,
    requireSession: (r) =>
      r === request
        ? (session ??= identity.requireSession(r))
        : identity.requireSession(r),
  };
  return new AssessmentService(
    new AssessmentRepository(db),
    studentIdentity,
    undefined,
    undefined,
    () => new Date(work.clock()),
    undefined,
    undefined,
    new D1OwnedAttemptReader(db, work.clock),
  ).consumer(request);
}
