import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { CourseAuthority } from '../../src/server/courses/authority';
import type { TrustedPrincipal } from '../../src/server/instructor/ports/contracts';

let mf: Miniflare;
let db: D1Database;
let authority: CourseAuthority;
const now = 1_800_000_000_000;
const actor = (userId: string, sessionHandle: string) =>
  ({ userId, sessionHandle }) as TrustedPrincipal;
const instructor = actor('instructor', 'session-i');
const student = actor('student', 'session-s');
const outsider = actor('outsider', 'session-o');

beforeAll(async () => {
  mf = new Miniflare({
    ...convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response()}}',
      compatibilityDate: '2026-11-04',
      d1Databases: { DB: 'course-test' },
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
    db.prepare(
      'CREATE TABLE instructor_assignment_drafts(id TEXT PRIMARY KEY, course_id TEXT NOT NULL)',
    ),
    db.prepare(
      'CREATE TABLE instructor_assignment_publications(id TEXT PRIMARY KEY, course_id TEXT NOT NULL)',
    ),
  ]);
  const migration = await readFile(
    'src/server/db/migrations/0007_courses.sql',
    'utf8',
  );
  await db.batch(
    migration
      .split(/^-- statement\s*$/m)
      .map((s) => s.trim())
      .filter((s) => s.replace(/^--.*$/gm, '').trim())
      .map((s) => db.prepare(s)),
  );
  await db.batch([
    ...['instructor', 'student', 'outsider'].map((id) =>
      db.prepare('INSERT INTO auth_accounts VALUES(?,1)').bind(id),
    ),
    ...[
      ['session-i', 'instructor'],
      ['session-s', 'student'],
      ['session-o', 'outsider'],
    ].map(([session, user]) =>
      db
        .prepare('INSERT INTO auth_sessions VALUES(?,?,NULL,?,?)')
        .bind(session, user, now + 60000, now),
    ),
    db.prepare(
      "INSERT INTO courses(id,name) VALUES ('course-one','First course'),('course-two','Second course')",
    ),
    db.prepare(
      "INSERT INTO course_memberships(course_id,user_id,role) VALUES ('course-one','instructor','instructor'),('course-one','student','student'),('course-two','outsider','instructor')",
    ),
    db.prepare(
      "INSERT INTO instructor_assignment_drafts VALUES ('draft-one','course-one'),('duplicate','course-one')",
    ),
    db.prepare(
      "INSERT INTO instructor_assignment_publications VALUES ('version-one','course-one'),('duplicate','course-two')",
    ),
  ]);
  authority = new CourseAuthority(db, () => now);
});
afterAll(async () => {
  await mf.dispose();
});

describe('course authority', () => {
  it('lists only current instructor memberships and denies cross-course access', async () => {
    expect(await authority.list(instructor)).toEqual([
      { id: 'course-one', name: 'First course' },
    ]);
    expect(await authority.list(student)).toEqual([]);
    await expect(
      authority.requireCourse(instructor, 'course-one', 'instructor-write'),
    ).resolves.toBeUndefined();
    await expect(
      authority.requireCourse(instructor, 'course-two', 'instructor-read'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      authority.requireCourse(student, 'course-one', 'instructor-write'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('authorizes drafts and published objects by authoritative course', async () => {
    await expect(
      authority.requireObject(
        instructor,
        { kind: 'assignment', id: 'draft-one' },
        'write',
      ),
    ).resolves.toEqual({ courseId: 'course-one' });
    await expect(
      authority.requireObject(
        student,
        { kind: 'assignment', id: 'draft-one' },
        'read',
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      authority.requireObject(
        student,
        { kind: 'assignment', id: 'version-one' },
        'read',
      ),
    ).resolves.toEqual({ courseId: 'course-one' });
    await expect(
      authority.requireObject(
        student,
        { kind: 'assignment', id: 'version-one' },
        'write',
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      authority.requireObject(
        outsider,
        { kind: 'assignment', id: 'version-one' },
        'read',
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      authority.requireObject(
        instructor,
        { kind: 'assignment', id: 'duplicate' },
        'read',
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('denies revoked memberships and sessions immediately', async () => {
    await db
      .prepare(
        "UPDATE course_memberships SET active=0 WHERE user_id='instructor'",
      )
      .run();
    await expect(
      authority.requireCourse(instructor, 'course-one', 'instructor-read'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await db
      .prepare("UPDATE auth_sessions SET revoked_at=? WHERE id='session-s'")
      .bind(now)
      .run();
    await expect(
      authority.requireCourse(student, 'course-one', 'student-read'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
