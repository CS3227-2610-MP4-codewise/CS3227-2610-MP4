import { describe, expect, it } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
// @ts-expect-error Local helper is a standalone Node module.
import { seedPlan } from './seed-courses-plan.mjs';

const account = ['acct-1', 'https://securetoken.google.com/p', 'uid-1'];

async function database() {
  const mf = new Miniflare({
    ...convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response()}}',
      compatibilityDate: '2026-11-04',
      d1Databases: { DB: 'seed-test' },
    }),
  });
  const db = (await mf.getD1Database('DB')) as unknown as D1Database;
  await db.batch([
    db.prepare(
      'CREATE TABLE auth_accounts (id TEXT PRIMARY KEY, issuer TEXT, subject TEXT, active INTEGER)',
    ),
    db.prepare(
      'CREATE TABLE courses (id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120), active INTEGER NOT NULL DEFAULT 1)',
    ),
    db.prepare(
      'CREATE TABLE course_memberships (course_id TEXT NOT NULL REFERENCES courses(id), user_id TEXT NOT NULL REFERENCES auth_accounts(id), role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(course_id,user_id,role))',
    ),
    db
      .prepare('INSERT INTO auth_accounts VALUES (?,?,?,1),(?,?,?,0)')
      .bind(...account, 'acct-2', 'https://securetoken.google.com/p', 'uid-2'),
  ]);
  return { mf, db };
}
const run = (db: D1Database, sql: string) =>
  db.batch(
    sql
      .split(/;\s*\n?/)
      .filter((s) => s.trim())
      .map((s) => db.prepare(s)),
  );
const memberships = async (db: D1Database, user: string) =>
  (
    await db
      .prepare(
        "SELECT COUNT(*) AS n FROM course_memberships WHERE user_id=? AND role='student' AND active=1",
      )
      .bind(user)
      .first<{ n: number }>()
  )?.n;

describe('local >100-course seed helper', () => {
  it('rejects malformed, oversized and non-local arguments', () => {
    for (const args of [
      ['seed', '0', ...account],
      ['seed', '301', ...account],
      ['seed', '1e2', ...account],
      ['seed', '105', 'acct;DROP', account[1], account[2]],
      ['grant', '105', ...account],
      ['seed', '105', ...account, '--remote'],
    ])
      expect(() => seedPlan(args)).toThrow();
  });

  it('seeds idempotent Student memberships only for the identified active account, and removes them', async () => {
    const { mf, db } = await database();
    try {
      const plan = seedPlan(['seed', '105', ...account]);
      expect(plan.ids).toHaveLength(105);
      expect(plan.ids[104]).toBe('synthetic-student-105');
      await run(db, plan.sql);
      await run(db, plan.sql);
      expect(await memberships(db, 'acct-1')).toBe(105);
      expect(
        (
          await db
            .prepare(
              "SELECT COUNT(*) AS n FROM course_memberships WHERE role<>'student'",
            )
            .first<{ n: number }>()
        )?.n,
      ).toBe(0);

      await run(db, seedPlan(['seed', '5', 'acct-2', account[1], 'uid-2']).sql);
      await run(
        db,
        seedPlan(['seed', '5', 'acct-1', account[1], 'wrong-subject']).sql,
      );
      expect(await memberships(db, 'acct-2')).toBe(0);
      expect(await memberships(db, 'acct-1')).toBe(105);

      await run(db, seedPlan(['remove', '105', ...account]).sql);
      expect(await memberships(db, 'acct-1')).toBe(0);
      expect(
        (
          await db
            .prepare('SELECT COUNT(*) AS n FROM courses WHERE active=1')
            .first<{ n: number }>()
        )?.n,
      ).toBe(0);
    } finally {
      await mf.dispose();
    }
  });
});
