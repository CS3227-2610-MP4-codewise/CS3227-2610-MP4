import { describe, expect, it } from 'vitest';
import {
  createDatabase,
  principal,
} from '../../src/server/student/test-fixture';
import { StudentAssignments } from '../../src/server/student/repository';
import { StudentWork } from '../../src/server/student/work';
// @ts-expect-error Local helper is a standalone Node module.
import { seedPlan } from './seed-courses-plan.mjs';

const account = ['acct-1', 'https://securetoken.google.com/p', 'uid-1'];
const run = (db: D1Database, sql: string) =>
  db.batch(
    sql
      .split(/;\s*\n/)
      .filter((s) => s.trim())
      .map((s) => db.prepare(s)),
  );

describe('local student-drafts seed (synthetic only)', () => {
  it('publishes one assignment with questions and a future deadline for the identified student', async () => {
    const { mf, db } = await createDatabase('seed-work');
    try {
      await db.batch([
        db.prepare('ALTER TABLE auth_accounts ADD COLUMN issuer TEXT'),
        db.prepare('ALTER TABLE auth_accounts ADD COLUMN subject TEXT'),
        db
          .prepare("INSERT INTO auth_accounts VALUES ('acct-1',1,?,?)")
          .bind(account[1], account[2]),
        db.prepare("INSERT INTO auth_accounts VALUES ('other',1,'x','y')"),
        db
          .prepare(
            "INSERT INTO auth_sessions VALUES ('session-acct-1','acct-1',NULL,?,?)",
          )
          .bind(Date.now() + 3_600_000, Date.now()),
        db
          .prepare(
            "INSERT INTO auth_sessions VALUES ('session-other','other',NULL,?,?)",
          )
          .bind(Date.now() + 3_600_000, Date.now()),
      ]);
      await run(db, seedPlan(['seed', '2', ...account]).sql);
      const plan = seedPlan(['seed-work', '2', ...account]);
      await run(db, plan.sql);
      await run(db, plan.sql); // idempotent
      const work = new StudentWork(db);
      const w = await work.work(
        principal('acct-1'),
        'synthetic-work-publication',
      );
      expect(w.questions).toHaveLength(2);
      expect(Date.parse(w.deadlineAt)).toBeGreaterThan(Date.now());
      const pub = await new StudentAssignments(db).publication(
        principal('acct-1'),
        'synthetic-work-publication',
      );
      expect(JSON.stringify(pub)).not.toContain('synthetic-reference');
      // another account gets nothing, and a non-matching account seeds nothing
      await expect(
        work.work(principal('other'), 'synthetic-work-publication'),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(() =>
        seedPlan(['seed-work', '2', ...account, 'x', 'y']),
      ).toThrow();
    } finally {
      await mf.dispose();
    }
  }, 60000);
});
