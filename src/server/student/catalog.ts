import { studentGuardBindings } from '../courses/authority';
import type { TrustedPrincipal } from '../instructor/ports/contracts';
import type { SubmissionCatalog } from '../instructor/assessments/workflow';
import {
  BoundaryError,
  ContractError,
  id,
} from '../../shared/instructor-contracts/schema';
import type { Publication } from '../../shared/instructor-contracts/publication';
import {
  validateAttempt,
  type Attempt,
} from '../../shared/instructor-contracts/submission';
import { readAttempt } from './attempts';
import { readPublication } from './repository';

/** Upper bound on one catalog listing; the port has no paging, so beyond it the listing fails closed. */
export const CATALOG_LIST_LIMIT = 1000;

/**
 * Current Instructor membership of the course, evaluated in SQL (same ?1–?4 bindings and
 * session checks as the student guard). The catalog does not trust a caller-side pre-check.
 */
function currentInstructorGuard(courseColumn: string) {
  return `EXISTS (SELECT 1 FROM course_memberships im
    JOIN courses ic ON ic.id=im.course_id AND ic.active=1
    JOIN auth_accounts ia ON ia.id=im.user_id AND ia.active=1
    JOIN auth_sessions iss ON iss.user_id=ia.id AND iss.id=?1 AND iss.revoked_at IS NULL
      AND iss.expires_at>?2 AND iss.last_seen>?3
    WHERE im.course_id=${courseColumn} AND im.user_id=?4 AND im.role='instructor' AND im.active=1)`;
}

async function opaqueLabel(courseId: string, userId: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(courseId + ':' + userId),
  );
  return (
    'Student ' +
    Array.from(new Uint8Array(digest).slice(0, 4), (x) =>
      x.toString(16).padStart(2, '0'),
    ).join('')
  );
}

/**
 * SW-09, C-SUB: the real producer for the instructor assessment workflow. Reads only committed
 * attempt tables; student_drafts is never referenced. Non-instructors and missing attempts are
 * indistinguishable (NOT_FOUND); stored data that fails the contract is UPSTREAM_UNAVAILABLE.
 */
export class D1SubmissionCatalog implements SubmissionCatalog {
  readonly sampleMode = false;
  constructor(
    readonly db: D1Database,
    readonly clock: () => number = Date.now,
    readonly limit: number = CATALOG_LIST_LIMIT,
  ) {}

  async getAuthorized(
    principal: TrustedPrincipal,
    attemptId: string,
  ): Promise<Attempt> {
    id(attemptId, '$.attemptId');
    const bind = studentGuardBindings(principal, this.clock());
    const attempt = await readAttempt(
      this.db,
      attemptId,
      currentInstructorGuard('a.course_id'),
      bind,
    );
    const publication = await readPublication(
      this.db,
      attempt.assignmentVersionId,
      currentInstructorGuard,
      bind,
    );
    try {
      return await validateAttempt(attempt, publication);
    } catch (error) {
      if (error instanceof ContractError)
        throw new BoundaryError('UPSTREAM_UNAVAILABLE');
      throw error;
    }
  }

  async scope(
    principal: TrustedPrincipal,
    attemptId: string,
  ): Promise<{ courseId: string }> {
    id(attemptId, '$.attemptId');
    const row = await this.db
      .prepare(
        `SELECT a.course_id FROM student_attempts a
         WHERE a.id=?5 AND ${currentInstructorGuard('a.course_id')}`,
      )
      .bind(...studentGuardBindings(principal, this.clock()), attemptId)
      .first<{ course_id: string }>();
    if (!row) throw new BoundaryError('NOT_FOUND');
    return { courseId: row.course_id };
  }

  /** Each student's latest committed attempt of this exact publication, newest first. */
  async list(principal: TrustedPrincipal, publication: Publication) {
    const bind = [
      ...studentGuardBindings(principal, this.clock()),
      publication.assignmentVersionId,
    ];
    const [exists, rows] = await this.db.batch<Record<string, unknown>>([
      this.db
        .prepare(
          `SELECT p.id FROM instructor_assignment_publications p
           WHERE p.id=?5 AND ${currentInstructorGuard('p.course_id')}`,
        )
        .bind(...bind),
      this.db
        .prepare(
          `SELECT a.id,a.submitted_at,a.user_id,a.course_id FROM student_attempts a
           WHERE a.publication_id=?5 AND ${currentInstructorGuard('a.course_id')}
             AND NOT EXISTS (SELECT 1 FROM student_attempts b
               WHERE b.user_id=a.user_id AND b.assignment_id=a.assignment_id
                 AND (b.submitted_at>a.submitted_at OR (b.submitted_at=a.submitted_at AND b.seq>a.seq)))
           ORDER BY a.submitted_at DESC, a.seq DESC LIMIT ?6`,
        )
        .bind(...bind, this.limit + 1),
    ]);
    if (!exists.results.length) throw new BoundaryError('NOT_FOUND');
    // No silent cap: more rows than the limit fails closed rather than hiding students.
    if (rows.results.length > this.limit)
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    return Promise.all(
      (
        rows.results as {
          id: string;
          submitted_at: string;
          user_id: string;
          course_id: string;
        }[]
      ).map(async (r) => ({
        attemptId: r.id,
        submittedAt: r.submitted_at,
        label: await opaqueLabel(r.course_id, r.user_id),
        sample: false,
      })),
    );
  }
}
