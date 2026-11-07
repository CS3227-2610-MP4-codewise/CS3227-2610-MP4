import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { D1Assignments } from '../../src/server/instructor/assignments/repository';
import type { TrustedPrincipal } from '../../src/server/instructor/ports/contracts';

let mf: Miniflare;
let db: D1Database;
let repo: D1Assignments;
const principal = {
  userId: 'instructor',
  sessionHandle: 'session-i',
} as TrustedPrincipal;

beforeAll(async () => {
  mf = new Miniflare({
    ...convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response()}}',
      compatibilityDate: '2026-11-04',
      d1Databases: { DB: 'guard-test' },
    }),
  });
  db = (await mf.getD1Database('DB')) as unknown as D1Database;
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
  const now = Date.now();
  await db.batch([
    db.prepare("INSERT INTO auth_accounts VALUES ('instructor',1)"),
    db
      .prepare(
        "INSERT INTO auth_sessions VALUES ('session-i','instructor',NULL,?,?)",
      )
      .bind(now + 600000, now),
    db.prepare("INSERT INTO courses(id,name) VALUES ('course-one','Course')"),
    db.prepare(
      "INSERT INTO course_memberships(course_id,user_id,role) VALUES ('course-one','instructor','instructor')",
    ),
  ]);
  repo = new D1Assignments(db, { enforceAuthority: true });
});
afterAll(async () => {
  await mf.dispose();
});

describe('atomic assignment authorization', () => {
  it('commits only with a current membership and session', async () => {
    const at = new Date().toISOString();
    const draft = await repo.create(
      'course-one',
      'instructor',
      'request-one',
      'draft-one',
      at,
      principal,
    );
    expect(draft.revision).toBe(1);
    // Model revocation after the route pre-check but before the repository write.
    await db
      .prepare(
        "UPDATE course_memberships SET active=0 WHERE user_id='instructor'",
      )
      .run();
    await expect(
      repo.create(
        'course-one',
        'instructor',
        'request-two',
        'draft-two',
        at,
        principal,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      repo.save('draft-one', 'course-one', 1, draft.payload, at, principal),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      repo.publish({
        publication: {
          schemaVersion: 1,
          state: 'published',
          assignmentId: 'draft-one',
          assignmentVersionId: 'version-one',
          courseId: 'course-one',
          title: 'Example',
          publishedAt: at,
          deadlineAt: at,
          questions: [],
        },
        questions: [],
        actorId: 'instructor',
        sourceRevision: 1,
        key: 'key-one',
        fingerprint: 'fingerprint',
        principal,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect((await repo.draft('draft-one', 'course-one')).revision).toBe(1);
    expect(
      await db
        .prepare(
          "SELECT id FROM instructor_assignment_drafts WHERE id='draft-two'",
        )
        .first(),
    ).toBeNull();
    expect(
      await db
        .prepare(
          "SELECT id FROM instructor_assignment_publications WHERE id='version-one'",
        )
        .first(),
    ).toBeNull();
    expect(
      (
        await db
          .prepare('SELECT COUNT(*) AS count FROM course_write_guards')
          .first<{ count: number }>()
      )?.count,
    ).toBe(0);
  });
  it('rejects a revoked session even if membership remains active', async () => {
    await db
      .prepare(
        "UPDATE course_memberships SET active=1 WHERE user_id='instructor'",
      )
      .run();
    await db
      .prepare("UPDATE auth_sessions SET revoked_at=? WHERE id='session-i'")
      .bind(Date.now())
      .run();
    await expect(
      repo.create(
        'course-one',
        'instructor',
        'request-three',
        'draft-three',
        new Date().toISOString(),
        principal,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(
      await db
        .prepare(
          "SELECT id FROM instructor_assignment_drafts WHERE id='draft-three'",
        )
        .first(),
    ).toBeNull();
  });
});
