import { BoundaryError, id } from '../../shared/instructor-contracts/schema';
import type {
  IdentityCoursePort,
  ObjectTarget,
  TrustedPrincipal,
} from '../instructor/ports/contracts';
import { creatorEligibilitySql } from './creation';

type CourseAction = Parameters<IdentityCoursePort['requireCourse']>[2];

/** Current course authority, derived exclusively from the same D1 store as sessions. */
export class CourseAuthority {
  constructor(
    readonly db: D1Database,
    readonly clock: () => number = Date.now,
  ) {}

  async contexts(
    principal: TrustedPrincipal,
    studentAfter = '',
    instructorAfter = '',
  ) {
    const now = this.clock();
    const rows = await this.db
      .prepare(
        `WITH current AS (
      SELECT a.id, ${creatorEligibilitySql(true)} AS can_create
      FROM auth_accounts a JOIN auth_sessions s ON s.user_id=a.id
      WHERE a.id=? AND a.active=1 AND s.id=? AND s.revoked_at IS NULL
        AND s.expires_at>? AND s.last_seen>?
    ), memberships AS (
      SELECT m.role,c.id,c.name FROM current x JOIN course_memberships m ON m.user_id=x.id AND m.active=1
      JOIN courses c ON c.id=m.course_id AND c.active=1
      WHERE m.role IN ('student','instructor')
    ), ranked AS (
      SELECT role,id,name,ROW_NUMBER() OVER (PARTITION BY role ORDER BY id) AS n
      FROM memberships WHERE (role='student' AND id>?) OR (role='instructor' AND id>?)
    ), roles AS (SELECT 'student' AS role UNION ALL SELECT 'instructor')
    SELECT roles.role, ranked.id, ranked.name,
      (EXISTS(SELECT 1 FROM memberships m WHERE m.role=roles.role)
        OR (roles.role='instructor' AND current.can_create)) AS allowed
    FROM current CROSS JOIN roles LEFT JOIN ranked ON ranked.role=roles.role AND ranked.n<=101
    ORDER BY roles.role,ranked.n`,
      )
      .bind(
        principal.userId,
        principal.sessionHandle,
        now,
        now - 30 * 60_000,
        studentAfter,
        instructorAfter,
      )
      .all<{
        role: 'student' | 'instructor';
        id: string | null;
        name: string | null;
        allowed: number;
      }>();
    if (!rows.results.length) throw new BoundaryError('UNAUTHENTICATED');
    return (['student', 'instructor'] as const).flatMap((role) => {
      const matching = rows.results.filter((row) => row.role === role);
      if (!matching[0]?.allowed) return [];
      const courses = matching
        .filter(
          (row): row is typeof row & { id: string; name: string } =>
            row.id !== null && row.name !== null,
        )
        .map(({ id, name }) => ({ id, name }));
      return [
        {
          role,
          courses: courses.slice(0, 100),
          nextCursor: courses.length > 100 ? courses[99].id : null,
        },
      ];
    });
  }

  async verifyInstructorCourses(principal: TrustedPrincipal, ids: string[]) {
    const now = this.clock();
    const rows = await this.db
      .prepare(
        `SELECT c.id,c.name FROM json_each(?) requested
      JOIN courses c ON c.id=requested.value AND c.active=1
      JOIN course_memberships m ON m.course_id=c.id AND m.role='instructor' AND m.active=1
      JOIN auth_accounts a ON a.id=m.user_id AND a.active=1
      JOIN auth_sessions s ON s.user_id=a.id AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?
      WHERE a.id=? ORDER BY c.id`,
      )
      .bind(
        JSON.stringify(ids),
        principal.sessionHandle,
        now,
        now - 30 * 60_000,
        principal.userId,
      )
      .all<{ id: string; name: string }>();
    if (rows.results.length !== ids.length)
      throw new BoundaryError('FORBIDDEN');
    return rows.results;
  }

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
    role: 'student' | 'instructor' = 'instructor',
  ): Promise<{ id: string; name: string }[]> {
    const now = this.clock();
    const result = await this.db
      .prepare(
        `SELECT DISTINCT c.id, c.name FROM courses c
      JOIN course_memberships m ON m.course_id=c.id AND m.active=1 AND m.role=?
      JOIN auth_accounts a ON a.id=m.user_id AND a.active=1
      JOIN auth_sessions s ON s.user_id=a.id AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?
      WHERE m.user_id=? AND c.active=1 ORDER BY c.name,c.id LIMIT 100`,
      )
      .bind(
        role,
        principal.sessionHandle,
        now,
        now - 30 * 60_000,
        principal.userId,
      )
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
