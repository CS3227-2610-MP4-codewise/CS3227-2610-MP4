import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import type { TrustedPrincipal } from '../instructor/ports/contracts';

/** Synthetic test fixtures only: no real learners, code or credentials. */
export const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
export const iso = (ms: number) => new Date(ms).toISOString();
export const PRIVATE = 'PRIVATE-REFERENCE-MARKER';
export const principal = (user: string): TrustedPrincipal =>
  ({ userId: user, sessionHandle: 'session-' + user }) as TrustedPrincipal;

export async function createDatabase(name: string) {
  const mf = new Miniflare({
    ...convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response()}}',
      compatibilityDate: '2026-11-04',
      d1Databases: { DB: name },
    }),
  });
  const db = (await mf.getD1Database('DB')) as unknown as D1Database;
  await db.batch([
    db.prepare(
      'CREATE TABLE auth_accounts(id TEXT PRIMARY KEY, active INTEGER NOT NULL)',
    ),
    db.prepare(
      'CREATE TABLE auth_sessions(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, revoked_at INTEGER, expires_at INTEGER, last_seen INTEGER)',
    ),
  ]);
  for (const migration of [
    '0002_instructor_assignments.sql',
    '0007_courses.sql',
    '0015_student_submissions.sql',
  ]) {
    const sql = await readFile('src/server/db/migrations/' + migration, 'utf8');
    await db.batch(
      sql
        .split(/^-- statement\s*$/m)
        .map((s) => s.trim())
        .filter((s) => s.replace(/^--.*$/gm, '').trim())
        .map((s) => db.prepare(s)),
    );
  }
  return { mf, db };
}

export async function seedPeople(
  db: D1Database,
  users: string[],
  memberships: [string, string, 'student' | 'instructor'][],
  courses: string[] = ['course-a', 'course-b'],
) {
  await db.batch([
    ...users.flatMap((u) => [
      db.prepare('INSERT INTO auth_accounts VALUES (?,1)').bind(u),
      db
        .prepare('INSERT INTO auth_sessions VALUES (?,?,NULL,?,?)')
        .bind('session-' + u, u, NOW + 3_600_000, NOW),
    ]),
    ...courses.map((c) =>
      db
        .prepare('INSERT INTO courses(id,name) VALUES (?,?)')
        .bind(c, 'Synthetic ' + c),
    ),
    ...memberships.map(([c, u, r]) =>
      db
        .prepare(
          'INSERT INTO course_memberships(course_id,user_id,role) VALUES (?,?,?)',
        )
        .bind(c, u, r),
    ),
  ]);
}

/** Publishes assignment `assignment` as version `version` with `count` questions q0..qN. */
export async function publish(
  db: D1Database,
  o: {
    course: string;
    assignment: string;
    version: string;
    number: number;
    deadline: string;
    count?: number;
    starter?: (i: number) => string;
    /** Test only: leave this question position without a rubric version. */
    skipRubricFor?: number;
  },
) {
  const count = o.count ?? 2;
  await db.batch([
    db
      .prepare(
        `INSERT INTO instructor_assignment_drafts(id,course_id,revision,payload,created_by,create_key,created_at,updated_at)
         VALUES(?,?,?,?, 'instructor-a', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET revision=excluded.revision`,
      )
      .bind(
        o.assignment,
        o.course,
        o.number,
        JSON.stringify({ title: 'draft' }),
        'key-' + o.assignment,
        iso(NOW - 864e5),
        iso(NOW - 864e5),
      ),
    db
      .prepare(
        `INSERT INTO instructor_assignment_publications(id,assignment_id,course_id,publication_number,source_revision,published_by,published_at,request_key,fingerprint,title,deadline_at)
         VALUES(?,?,?,?,?,'instructor-a',?,?,'fingerprint-secret',?,?)`,
      )
      .bind(
        o.version,
        o.assignment,
        o.course,
        o.number,
        o.number,
        iso(NOW - 3600_000 + o.number),
        'req-' + o.version,
        'Synthetic ' + o.assignment,
        o.deadline,
      ),
    ...Array.from({ length: count }, (_, i) => [
      db
        .prepare(
          `INSERT INTO instructor_question_versions(id,question_id,publication_id,position,title,instructions,language,starter_code,private_reference)
           VALUES(?,?,?,?, 'Question', 'Use loops', 'python', ?, ?)`,
        )
        .bind(
          `qv-${o.version}-${i}`,
          'q' + i,
          o.version,
          i,
          o.starter?.(i) ?? `def solve${i}():\n    return ${i}\n`,
          PRIVATE,
        ),
      ...(i === o.skipRubricFor
        ? []
        : [
            db
              .prepare(
                'INSERT INTO instructor_rubric_versions(id,rubric_id,question_version_id) VALUES(?,?,?)',
              )
              .bind(`rv-${o.version}-${i}`, 'r' + i, `qv-${o.version}-${i}`),
            db
              .prepare(
                "INSERT INTO instructor_criterion_versions(rubric_version_id,criterion_id,position,comparison_key,descriptor,minimum_units,maximum_units) VALUES(?, 'c1', 0, 'k1', 'Correct output', 0, 500)",
              )
              .bind(`rv-${o.version}-${i}`),
          ]),
    ]).flat(),
  ]);
}

/** Sessions port for handler tests: header-selected user, origin and CSRF gate. */
export const ORIGIN = 'https://app.example.test';
export const testSessions = {
  async requireSession(request: Request) {
    const user = request.headers.get('x-test-user');
    if (!user) throw new BoundaryError('UNAUTHENTICATED');
    return { principal: principal(user) };
  },
  async requireMutationOrigin(request: Request) {
    if (
      request.headers.get('origin') !== ORIGIN ||
      request.headers.get('x-csrf') !== 'valid'
    )
      throw new BoundaryError('FORBIDDEN');
  },
};
