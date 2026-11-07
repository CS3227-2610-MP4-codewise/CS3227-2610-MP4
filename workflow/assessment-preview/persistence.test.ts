import { it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { assessmentDatabase } from './database';
import { fixture } from './fixture';
it('IAL-02/05 persisted manual revisions survive a closed/reopened D1 runtime', async () => {
  const directory = await mkdtemp(
    join(tmpdir(), 'codewise-assessment-restart-'),
  );
  const target = resolve(directory),
    temporaryRoot = resolve(tmpdir()) + sep;
  if (!target.startsWith(temporaryRoot))
    throw Error('Unexpected temporary directory');
  let db: Awaited<ReturnType<typeof assessmentDatabase>> | undefined;
  try {
    db = await assessmentDatabase(directory);
    let f = await fixture(db.db);
    let v = await f.service().create(f.request('/', 'POST'), {
      attemptId: f.attempt.attemptId,
      requestKey: 'persistent_create',
    });
    const feedback = structuredClone(v.revision.feedback);
    feedback.criteria[0].score = 2.25;
    v = await f.service().save(f.request('/', 'PUT'), v.head.id, {
      expectedRevisionId: v.head.headRevisionId,
      feedback,
    });
    await db.db
      .prepare(
        "UPDATE _assessment_migrations SET name='0007_instructor_assessments.sql' WHERE name='0008_instructor_assessments.sql'",
      )
      .run();
    await db.close();
    db = undefined;
    db = await assessmentDatabase(directory);
    f = await fixture(db.db);
    const reopened = await f.service().load(f.request(), v.head.id);
    expect(reopened.head.headRevisionId).toBe(v.head.headRevisionId);
    expect(reopened.revision.feedback).toEqual(feedback);
    expect(
      await db.db
        .prepare(
          "SELECT name FROM _assessment_migrations WHERE name='0008_instructor_assessments.sql'",
        )
        .first('name'),
    ).toBe('0008_instructor_assessments.sql');
  } finally {
    await db?.close();
    await rm(target, { recursive: true, force: true });
  }
}, 20000);
it('IAL-04/08 revision history is bounded metadata with a cursor and exact selected content', async () => {
  const db = await assessmentDatabase();
  try {
    const f = await fixture(db.db),
      v = await f.service().create(f.request('/', 'POST'), {
        attemptId: f.attempt.attemptId,
        requestKey: 'history_create',
      });
    await db.db.batch(
      Array.from({ length: 53 }, (_, n) =>
        db.db
          .prepare(
            'INSERT INTO instructor_assessment_revisions VALUES(?,?,?,?,?,?,?)',
          )
          .bind(
            'synthetic_history_' + n,
            v.head.id,
            v.head.headRevisionId,
            'instructor_synthetic',
            new Date(1794000000000 + n).toISOString(),
            JSON.stringify(v.revision.feedback),
            'manual',
          ),
      ),
    );
    const page = await f.service().load(f.request(), v.head.id);
    expect(page.history).toHaveLength(50);
    expect(page.historyCursor).not.toBeNull();
    expect(page.history.every((r) => !('feedback' in r))).toBe(true);
    const next = await f
      .service()
      .load(f.request(), v.head.id, page.historyCursor!);
    expect(next.history).toHaveLength(4);
    expect(next.historyCursor).toBeNull();
    expect(
      next.history.every((r) => !page.history.some((p) => p.id === r.id)),
    ).toBe(true);
    expect(
      (
        await f
          .service()
          .load(f.request(), v.head.id, undefined, 'synthetic_history_10')
      ).revision.feedback,
    ).toEqual(v.revision.feedback);
  } finally {
    await db.close();
  }
}, 20000);
