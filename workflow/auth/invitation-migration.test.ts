import { afterAll, beforeAll, expect, it } from 'vitest';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authDatabase } from './database';

let database: Awaited<ReturnType<typeof authDatabase>>;
let persist: string;

beforeAll(async () => {
  persist = await mkdtemp(join(tmpdir(), 'codewise-invitation-migration-'));
  database = await authDatabase(persist);
  await database.db
    .prepare(
      'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at,course_id,firebase_uid) VALUES(?,?,?,?,?,?,?)',
    )
    .bind('legacy', 'legacy-hash', 'legacy@u.nus.edu', 1, 100, 'course', 'uid')
    .run();
  const courses = await readFile(
    'src/server/db/migrations/0007_courses.sql',
    'utf8',
  );
  await database.db.batch(
    courses
      .split(/^-- statement\s*$/m)
      .filter((s) => s.replace(/^--.*$/gm, '').trim())
      .map((s) => database.db.prepare(s)),
  );
  const sql = await readFile(
    'src/server/db/migrations/0010_invitation_target_role.sql',
    'utf8',
  );
  await database.db.batch(
    sql.split(/^-- statement\s*$/m).map((s) => database.db.prepare(s)),
  );
});

afterAll(async () => {
  await database?.close();
});

it('preserves legacy invitations without assigning a role, including across restart', async () => {
  expect(
    await database.db
      .prepare(
        'SELECT email,course_id,firebase_uid,target_role FROM auth_invites WHERE id=?',
      )
      .bind('legacy')
      .first(),
  ).toEqual({
    email: 'legacy@u.nus.edu',
    course_id: 'course',
    firebase_uid: 'uid',
    target_role: null,
  });
  await database.close();
  database = await authDatabase(persist);
  expect(
    await database.db
      .prepare('SELECT target_role FROM auth_invites WHERE id=?')
      .bind('legacy')
      .first(),
  ).toEqual({ target_role: null });
  await expect(
    database.db
      .prepare(
        "UPDATE auth_invites SET target_role='instructor' WHERE id='legacy'",
      )
      .run(),
  ).rejects.toThrow();
});

it('rejects invalid roles and role invitations without instructor authority', async () => {
  await expect(
    database.db
      .prepare(
        "INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at,target_role) VALUES('bad','bad','bad@u.nus.edu',1,100,'admin')",
      )
      .run(),
  ).rejects.toThrow();
  await expect(
    database.db
      .prepare(
        "INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at,target_role) VALUES('new','new','new@u.nus.edu',1,100,'student')",
      )
      .run(),
  ).rejects.toThrow();
});
