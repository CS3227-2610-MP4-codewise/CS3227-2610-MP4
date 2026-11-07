import { it, expect } from 'vitest';
import { assessmentDatabase } from './database';
import { fixture } from './fixture';
it('IAL-05/06 concurrent correction release and current withdrawal commit only one visibility transition', async () => {
  const db = await assessmentDatabase();
  try {
    const f = await fixture(db.db),
      r = f.request('/', 'POST');
    let v = await f
      .service()
      .create(r, { attemptId: f.attempt.attemptId, requestKey: 'race_create' });
    v = await f
      .service()
      .save(f.request('/', 'PUT'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        feedback: {
          ...v.revision.feedback,
          criteria: v.revision.feedback.criteria.map((c) => ({
            ...c,
            score: 4,
            explanation: 'Source inspection.',
          })),
        },
      });
    const approve = async () => {
      v = await f
        .service()
        .approve(r, v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          expectedAvailabilityRevision: v.head.availabilityRevision,
        });
    };
    const command = (key: string) => ({
      schemaVersion: 1,
      assessmentId: v.head.id,
      assessmentRevisionId: v.head.headRevisionId,
      expectedAvailabilityRevision: v.head.availabilityRevision,
      idempotencyKey: key,
    });
    await approve();
    await f.service().release(r, v.head.id, command('race_first'));
    v = await f.service().load(f.request(), v.head.id);
    v = await f
      .service()
      .correct(r, v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        sourceRevisionId: v.head.headRevisionId,
      });
    await approve();
    const races = await Promise.allSettled([
      f.service().release(r, v.head.id, command('race_second')),
      f
        .service()
        .withdraw(r, v.head.id, {
          schemaVersion: 1,
          assessmentId: v.head.id,
          releaseVersion: 1,
          expectedAvailabilityRevision: v.head.availabilityRevision,
          idempotencyKey: 'race_withdraw',
          reason: 'Synthetic race check',
        }),
    ]);
    expect(races.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const current = await f.repository.currentness(
      v.head.id,
      new Date().toISOString(),
    );
    expect(current.availabilityRevision).toBe(3);
    if (current.currentReleaseVersion === 2)
      expect(current.withdrawnReleaseVersions).toEqual([]);
    else {
      expect(current.currentReleaseVersion).toBeNull();
      expect(current.withdrawnReleaseVersions).toEqual([1]);
    }
    expect(
      (await f.service().audit(f.request(), v.head.id)).events.filter(
        (e) => e.action === 'release' || e.action === 'withdraw',
      ),
    ).toHaveLength(2);
  } finally {
    await db.close();
  }
}, 30000);
it('IAL-06 rollback prevents partial withdrawal/tombstone and preserves private reasons only in authorized audit', async () => {
  const db = await assessmentDatabase();
  try {
    const f = await fixture(db.db),
      r = f.request('/', 'POST');
    let v = await f
      .service()
      .create(r, {
        attemptId: f.attempt.attemptId,
        requestKey: 'withdraw_create',
      });
    v = await f
      .service()
      .save(f.request('/', 'PUT'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        feedback: {
          ...v.revision.feedback,
          criteria: v.revision.feedback.criteria.map((c) => ({
            ...c,
            score: 4,
            explanation: 'Source inspection.',
          })),
        },
      });
    v = await f
      .service()
      .approve(r, v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        expectedAvailabilityRevision: 1,
      });
    await f
      .service()
      .release(r, v.head.id, {
        schemaVersion: 1,
        assessmentId: v.head.id,
        assessmentRevisionId: v.head.headRevisionId,
        expectedAvailabilityRevision: 1,
        idempotencyKey: 'withdraw_release',
      });
    const cmd = {
      schemaVersion: 1,
      assessmentId: v.head.id,
      releaseVersion: 1,
      expectedAvailabilityRevision: 2,
      idempotencyKey: 'withdraw_failure',
      reason: 'Private synthetic withdrawal reason',
    };
    await db.db
      .prepare(
        "CREATE TRIGGER withdrawal_failure BEFORE INSERT ON instructor_assessment_withdrawals BEGIN SELECT RAISE(ABORT,'synthetic rollback'); END",
      )
      .run();
    await expect(f.service().withdraw(r, v.head.id, cmd)).rejects.toMatchObject(
      { code: 'UPSTREAM_UNAVAILABLE' },
    );
    expect(
      (await f.repository.currentness(v.head.id, new Date().toISOString()))
        .availabilityRevision,
    ).toBe(2);
    expect(
      (await f.repository.publicState(v.head.id, 1, new Date().toISOString()))
        .feedback.state,
    ).toBe('released');
    await db.db.prepare('DROP TRIGGER withdrawal_failure').run();
    const tomb = await f.service().withdraw(r, v.head.id, cmd);
    expect(JSON.stringify(tomb)).not.toContain(cmd.reason);
    expect(
      (await f.service().audit(f.request(), v.head.id)).events.some(
        (e) => e.private_reason === cmd.reason,
      ),
    ).toBe(true);
  } finally {
    await db.close();
  }
}, 30000);
