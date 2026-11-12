import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assessmentDatabase } from './database';
import { fixture } from './fixture';
import { currentnessSchema } from '../../src/shared/instructor-contracts/release';

/**
 * student-released-feedback 5.1 (SF-01, SF-05, C-REL): producer tests for
 * `ReleaseReadPort.attemptReleases`, written by Keith in the 2026-11-12 window beside Darryl's
 * assessment tests, for Darryl's review. Synthetic fixture on local D1.
 */
let database: Awaited<ReturnType<typeof assessmentDatabase>>,
  f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => {
  database = await assessmentDatabase();
  f = await fixture(database.db);
}, 20000);
afterEach(async () => {
  await database?.close();
});

const own = () => f.attempt.attemptId;
const asStudent = () => {
  f.state.role = 'student';
  Object.assign(f.principal, { userId: 'student_synthetic' });
};
const asInstructor = () => {
  f.state.role = 'instructor';
  Object.assign(f.principal, { userId: 'instructor_synthetic' });
};
const lookup = (ids: string[]) =>
  f.service().consumer(f.request()).attemptReleases(f.principal, ids);

async function created() {
  return f.service().create(f.request('/', 'POST'), {
    attemptId: own(),
    requestKey: 'create_assessment',
  });
}
async function approve(v: Awaited<ReturnType<typeof created>>) {
  return f.service().approve(f.request('/', 'POST'), v.head.id, {
    expectedRevisionId: v.head.headRevisionId,
    expectedAvailabilityRevision: v.head.availabilityRevision,
  });
}
async function releaseNext(
  v: Awaited<ReturnType<typeof created>>,
  key: string,
) {
  return f.service().release(f.request('/', 'POST'), v.head.id, {
    schemaVersion: 1,
    assessmentId: v.head.id,
    assessmentRevisionId: v.head.headRevisionId,
    expectedAvailabilityRevision: v.head.availabilityRevision,
    idempotencyKey: key,
  });
}
async function graded() {
  const v = await created();
  return f.service().save(f.request('/', 'PUT'), v.head.id, {
    expectedRevisionId: v.head.headRevisionId,
    feedback: {
      ...v.revision.feedback,
      criteria: v.revision.feedback.criteria.map((c) => ({
        ...c,
        score: 4,
        explanation: 'Static inspection only; code was not executed.',
      })),
    },
  });
}
async function withdraw(id: string, version: number, key: string) {
  const current = await f.service().load(f.request(), id);
  await f.service().withdraw(f.request('/', 'POST'), id, {
    schemaVersion: 1,
    assessmentId: id,
    releaseVersion: version,
    expectedAvailabilityRevision: current.head.availabilityRevision,
    idempotencyKey: key,
    reason: 'Private instructor correction reason',
  });
}

describe('ReleaseReadPort.attemptReleases (student-released-feedback D1)', () => {
  it('rejects empty, oversized and duplicate batches before any read', async () => {
    asStudent();
    for (const ids of [
      [],
      Array.from({ length: 51 }, (_, i) => 'attempt_' + i),
      [own(), own()],
    ])
      await expect(lookup(ids)).rejects.toMatchObject({
        code: 'INVALID_CONTRACT',
      });
  });

  it('returns null with no assessment and for an assessed but unreleased attempt', async () => {
    asStudent();
    expect((await lookup([own()])).get(own())).toBeNull();
    asInstructor();
    await approve(await graded());
    asStudent();
    const found = await lookup([own()]);
    expect([...found.keys()]).toEqual([own()]);
    expect(found.get(own())).toBeNull();
    expect(JSON.stringify([...found])).not.toMatch(
      /score|explanation|approv|revision_|actor/i,
    );
  }, 20000);

  it('fails the whole batch when one attempt is foreign, and for a foreign or revoked caller', async () => {
    asInstructor();
    await releaseNext(await approve(await graded()), 'release_1');
    asStudent();
    await expect(lookup([own(), 'attempt_foreign'])).rejects.toMatchObject({
      code: expect.stringMatching(/^(FORBIDDEN|NOT_FOUND)$/),
    });
    await expect(lookup(['attempt_foreign'])).rejects.toMatchObject({
      code: expect.stringMatching(/^(FORBIDDEN|NOT_FOUND)$/),
    });
    Object.assign(f.principal, { userId: 'foreign_student' });
    await expect(lookup([own()])).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    asStudent();
    f.state.revoked = true;
    await expect(lookup([own()])).rejects.toMatchObject({
      code: expect.stringMatching(/^(FORBIDDEN|UNAUTHENTICATED)$/),
    });
  }, 20000);

  it('lists superseded and withdrawn versions through the K5 sequence without revival', async () => {
    asInstructor();
    const v = await approve(await graded());
    await releaseNext(v, 'release_1');
    asStudent();
    let entry = (await lookup([own()])).get(own())!;
    expect(entry.assessmentId).toBe(v.head.id);
    expect(entry.releaseVersions).toEqual([1]);
    expect(currentnessSchema.parse(entry.currentness)).toMatchObject({
      submissionAttemptId: own(),
      currentReleaseVersion: 1,
      withdrawnReleaseVersions: [],
    });

    asInstructor();
    let next = await f.service().correct(f.request('/', 'POST'), v.head.id, {
      expectedRevisionId: v.head.headRevisionId,
      sourceRevisionId: v.head.headRevisionId,
    });
    next = await approve(next);
    await releaseNext(next, 'release_2');
    asStudent();
    entry = (await lookup([own()])).get(own())!;
    expect(entry.releaseVersions).toEqual([1, 2]);
    expect(entry.currentness.currentReleaseVersion).toBe(2);

    asInstructor();
    await withdraw(v.head.id, 1, 'withdraw_1');
    asStudent();
    entry = (await lookup([own()])).get(own())!;
    expect(entry.releaseVersions).toEqual([1, 2]);
    expect(entry.currentness).toMatchObject({
      currentReleaseVersion: 2,
      withdrawnReleaseVersions: [1],
    });

    asInstructor();
    await withdraw(v.head.id, 2, 'withdraw_2');
    asStudent();
    entry = (await lookup([own()])).get(own())!;
    expect(entry.releaseVersions).toEqual([1, 2]);
    expect(entry.currentness).toMatchObject({
      currentReleaseVersion: null,
      withdrawnReleaseVersions: [1, 2],
    });
    expect(entry.currentness.availabilityRevision).toBeGreaterThan(3);
  }, 30000);
});
