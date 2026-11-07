import { BoundaryError, id } from '../../shared/instructor-contracts/schema';
import type {
  IdentityCoursePort,
  ObjectTarget,
  TrustedPrincipal,
} from '../instructor/ports/contracts';

type CourseAction = Parameters<IdentityCoursePort['requireCourse']>[2];

/** Current course authority, derived exclusively from the same D1 store as sessions. */
export class CourseAuthority {
  constructor(
    readonly db: D1Database,
    readonly clock: () => number = Date.now,
  ) {}

  private async membership(
    principal: TrustedPrincipal,
    courseId: string,
    role?: string,
  ) {
    const now = this.clock();
    return this.db
      .prepare(
        `SELECT m.role FROM course_memberships m
      JOIN courses c ON c.id=m.course_id AND c.active=1
      JOIN auth_accounts a ON a.id=m.user_id AND a.active=1
      JOIN auth_sessions s ON s.user_id=a.id AND s.id=? AND s.revoked_at IS NULL
        AND s.expires_at>? AND s.last_seen>?
      WHERE m.user_id=? AND m.course_id=? AND m.active=1 AND (? IS NULL OR m.role=?) LIMIT 1`,
      )
      .bind(
        principal.sessionHandle,
        now,
        now - 30 * 60_000,
        principal.userId,
        courseId,
        role ?? null,
        role ?? null,
      )
      .first<{ role: string }>();
  }

  async list(
    principal: TrustedPrincipal,
  ): Promise<{ id: string; name: string }[]> {
    const now = this.clock();
    const result = await this.db
      .prepare(
        `SELECT DISTINCT c.id, c.name FROM courses c
      JOIN course_memberships m ON m.course_id=c.id AND m.active=1 AND m.role='instructor'
      JOIN auth_accounts a ON a.id=m.user_id AND a.active=1
      JOIN auth_sessions s ON s.user_id=a.id AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?
      WHERE m.user_id=? AND c.active=1 ORDER BY c.name,c.id LIMIT 100`,
      )
      .bind(principal.sessionHandle, now, now - 30 * 60_000, principal.userId)
      .all<{ id: string; name: string }>();
    return result.results;
  }

  async requireCourse(
    principal: TrustedPrincipal,
    courseId: string,
    action: CourseAction,
  ): Promise<void> {
    id(courseId, '$.courseId');
    const role = action === 'student-read' ? undefined : 'instructor';
    if (!(await this.membership(principal, courseId, role)))
      throw new BoundaryError('FORBIDDEN');
  }

  /** A selected authorized course may fall outside the bounded first list page. */
  async get(principal: TrustedPrincipal, courseId: string) {
    await this.requireCourse(principal, courseId, 'instructor-read');
    const now = this.clock();
    const row = await this.db
      .prepare(
        `SELECT c.id,c.name FROM courses c
      JOIN course_memberships m ON m.course_id=c.id AND m.role='instructor' AND m.active=1
      JOIN auth_accounts a ON a.id=m.user_id AND a.active=1
      JOIN auth_sessions s ON s.user_id=a.id AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?
      WHERE c.id=? AND c.active=1 AND m.user_id=?`,
      )
      .bind(
        principal.sessionHandle,
        now,
        now - 30 * 60_000,
        courseId,
        principal.userId,
      )
      .first<{ id: string; name: string }>();
    if (!row) throw new BoundaryError('FORBIDDEN');
    return row;
  }

  async requireObject(
    principal: TrustedPrincipal,
    target: ObjectTarget,
    action: 'read' | 'write',
  ): Promise<{ courseId: string }> {
    id(target.id, '$.id');
    if (target.kind !== 'assignment') throw new BoundaryError('NOT_FOUND');
    const rows = await this.db
      .prepare(
        `SELECT course_id AS courseId, 'draft' AS kind FROM instructor_assignment_drafts WHERE id=?
      UNION ALL SELECT course_id AS courseId, 'publication' AS kind FROM instructor_assignment_publications WHERE id=?`,
      )
      .bind(target.id, target.id)
      .all<{ courseId: string; kind: string }>();
    // Ambiguous identifiers fail closed even if both records happen to belong to one course.
    if (rows.results.length !== 1) throw new BoundaryError('NOT_FOUND');
    const row = rows.results[0];
    const role =
      action === 'write' || row.kind === 'draft' ? 'instructor' : undefined;
    if (!(await this.membership(principal, row.courseId, role)))
      throw new BoundaryError('FORBIDDEN');
    return { courseId: row.courseId };
  }
}
