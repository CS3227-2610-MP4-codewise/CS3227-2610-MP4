import { BoundaryError } from '../../shared/instructor-contracts/schema';
import {
  createCourseSchema,
  type CreateCourse,
  type Course,
} from '../../shared/courses';
import type { TrustedPrincipal } from '../instructor/ports/contracts';

// All predicates use aliases a (account) and s (session). Provider currentness is
// checked by ManagedAuthRoutes; these joins recheck the local facts at commit.
const owner = `EXISTS(SELECT 1 FROM auth_owner_bootstrap o
 JOIN auth_administrators d ON d.user_id=o.account_id
 WHERE o.singleton=1 AND o.completed_at IS NOT NULL AND o.account_id=a.id
 AND o.issuer=a.issuer AND o.subject=a.subject AND o.email=a.email
 AND o.password_at=s.provider_password_at AND o.valid_since=s.provider_valid_since)`;
const instructor = `EXISTS(SELECT 1 FROM course_memberships m
 JOIN courses c ON c.id=m.course_id AND c.active=1
 WHERE m.user_id=a.id AND m.role='instructor' AND m.active=1)`;
const current = `a.id=? AND a.active=1 AND s.id=? AND s.revoked_at IS NULL
 AND s.expires_at>? AND s.last_seen>?`;
const eligible = (reconcile: boolean) => `(${instructor} OR (${owner} AND (
 EXISTS(SELECT 1 FROM course_creator_capabilities p WHERE p.user_id=a.id AND p.active=1)
 ${reconcile ? 'OR NOT EXISTS(SELECT 1 FROM course_creator_capabilities p WHERE p.user_id=a.id)' : ''})))`;

export class CourseCreation {
  constructor(
    readonly db: D1Database,
    readonly clock: () => number = Date.now,
  ) {}

  private bindings(p: TrustedPrincipal, now: number) {
    return [p.userId, p.sessionHandle, now, now - 30 * 60_000];
  }
  async canCreate(p: TrustedPrincipal) {
    return !!(await this.db
      .prepare(
        `SELECT 1 FROM auth_accounts a JOIN auth_sessions s ON s.user_id=a.id
      WHERE ${current} AND ${eligible(true)}`,
      )
      .bind(...this.bindings(p, this.clock()))
      .first());
  }

  async create(
    p: TrustedPrincipal,
    raw: CreateCourse,
  ): Promise<{ course: Course; created: boolean }> {
    const input = createCourseSchema.parse(raw),
      now = this.clock(),
      candidate = crypto.randomUUID(),
      guard = crypto.randomUUID();
    const args = this.bindings(p, now);
    const scope = [p.userId, input.requestKey];
    const receipt = `SELECT 1 FROM course_creation_receipts WHERE user_id=? AND request_key=?`;
    try {
      const results = await this.db.batch([
        // Reconcile an owner bootstrapped AFTER migration installation. Inactive
        // capability rows are permanent tombstones, never upserted/reactivated.
        this.db
          .prepare(
            `INSERT INTO course_creator_capabilities(user_id,active,granted_at)
          SELECT a.id,1,? FROM auth_accounts a JOIN auth_sessions s ON s.user_id=a.id
          WHERE ${current} AND ${owner}
          AND NOT EXISTS(SELECT 1 FROM course_creator_capabilities p WHERE p.user_id=a.id)`,
          )
          .bind(now, ...args),
        this.db
          .prepare(
            `INSERT INTO course_write_guards(id,allowed) SELECT ?,CASE WHEN EXISTS(
          SELECT 1 FROM auth_accounts a JOIN auth_sessions s ON s.user_id=a.id
          WHERE ${current} AND ${eligible(false)}) THEN 1 ELSE 0 END`,
          )
          .bind(guard, ...args),
        this.db
          .prepare(
            `INSERT INTO course_creation_guards(id,compatible) SELECT ?,CASE WHEN NOT EXISTS(
          SELECT 1 FROM course_creation_receipts r WHERE r.user_id=? AND r.request_key=? AND (
          r.name<>? OR NOT EXISTS(SELECT 1 FROM courses c JOIN course_memberships m ON m.course_id=c.id
            WHERE c.id=r.course_id AND c.active=1 AND m.user_id=r.user_id AND m.role='instructor' AND m.active=1)
          )) THEN 1 ELSE 0 END`,
          )
          .bind(guard, ...scope, input.name),
        this.db
          .prepare(
            `INSERT INTO courses(id,name) SELECT ?,? WHERE NOT EXISTS(${receipt})`,
          )
          .bind(candidate, input.name, ...scope),
        this.db
          .prepare(
            `INSERT INTO course_memberships(course_id,user_id,role)
          SELECT id,?,'instructor' FROM courses WHERE id=?`,
          )
          .bind(p.userId, candidate),
        this.db
          .prepare(
            `INSERT INTO course_creation_receipts(user_id,request_key,name,course_id,created_at)
          SELECT ?,?,?,id,? FROM courses WHERE id=?`,
          )
          .bind(p.userId, input.requestKey, input.name, now, candidate),
        this.db
          .prepare('DELETE FROM course_creation_guards WHERE id=?')
          .bind(guard),
        this.db
          .prepare('DELETE FROM course_write_guards WHERE id=?')
          .bind(guard),
      ]);
      // Reauthorize the result too: a response racing revocation cannot be an
      // access grant. An uncertain response is recovered with the same key.
      const row = await this.db
        .prepare(
          `SELECT c.id,c.name FROM course_creation_receipts r
        JOIN courses c ON c.id=r.course_id AND c.active=1
        JOIN course_memberships m ON m.course_id=c.id AND m.user_id=r.user_id AND m.role='instructor' AND m.active=1
        JOIN auth_accounts a ON a.id=r.user_id JOIN auth_sessions s ON s.user_id=a.id
        WHERE r.user_id=? AND r.request_key=? AND ${current} AND ${eligible(false)}`,
        )
        .bind(...scope, ...this.bindings(p, this.clock()))
        .first<Course>();
      if (!row) throw new BoundaryError('FORBIDDEN');
      return { course: row, created: results[5].meta.changes === 1 };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('course_authorization_guard')
      )
        throw new BoundaryError('FORBIDDEN');
      if (
        error instanceof Error &&
        error.message.includes('course_creation_compatibility')
      )
        throw new BoundaryError('IDEMPOTENCY_CONFLICT');
      throw error;
    }
  }
}
