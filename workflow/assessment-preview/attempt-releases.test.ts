import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { composedEnvironment } from '../../src/server/student/composed-fixture';
import { principal } from '../../src/server/student/test-fixture';
import { currentnessSchema } from '../../src/shared/instructor-contracts/release';

/**
 * student-released-feedback 5.1 and the batched-authorization amendment (SF-01, SF-05, OPS-01,
 * C-REL): producer tests for `ReleaseReadPort.attemptReleases`, written by Keith beside Darryl's
 * assessment tests for his review. They run on the composed local-D1 fixture because the batched
 * check reads student attempts and course membership in SQL. Synthetic data only.
 */
let env: Awaited<ReturnType<typeof composedEnvironment>>;
let version = '';
const lookup = (user: string, ids: string[], as = user) =>
  env.port(user).attemptReleases(principal(as), ids);

beforeAll(async () => {
  env = await composedEnvironment('attempt-releases-producer-test');
  version = await env.assignment();
}, 30000);
afterAll(async () => {
  await env?.mf.dispose();
});

describe('ReleaseReadPort.attemptReleases (batched authorization)', () => {
  it('rejects empty, oversized and duplicate batches before any read', async () => {
    const a = await env.submitted('s1', version, 'bounds');
    for (const ids of [
      [],
      Array.from({ length: 51 }, (_, i) => 'attempt_' + i),
      [a, a],
    ])
      await expect(lookup('s1', ids)).rejects.toMatchObject({
        code: 'INVALID_CONTRACT',
      });
  });

  it('returns null with no assessment and for an assessed but unreleased attempt', async () => {
    const none = await env.submitted('s1', version, 'none');
    const draft = await env.submitted('s1', version, 'draft');
    const v = await env.instructor.graded(draft, 'draft');
    await env.instructor.approve(v.head.id);
    const found = await lookup('s1', [none, draft]);
    expect([...found.entries()]).toEqual([
      [none, null],
      [draft, null],
    ]);
  }, 20000);

  it('fails the whole batch for one foreign or unknown attempt, another caller, an instructor or a session mismatch', async () => {
    const own = await env.submitted('s1', version, 'own');
    const other = await env.submitted('s2', version, 'other');
    const v = await env.instructor.graded(own, 'own');
    await env.instructor.approveAndRelease(v.head.id, 'own');
    const denied = { code: 'FORBIDDEN' };
    await expect(lookup('s1', [own, other])).rejects.toMatchObject(denied);
    await expect(lookup('s1', [own, 'attempt_unknown'])).rejects.toMatchObject(
      denied,
    );
    await expect(lookup('s2', [own])).rejects.toMatchObject(denied);
    await expect(lookup('inst', [own])).rejects.toMatchObject(denied);
    // The principal must be the request's own session.
    await expect(lookup('s1', [own], 's2')).rejects.toMatchObject(denied);
    expect((await lookup('s1', [own])).get(own)?.releaseVersions).toEqual([1]);
  }, 20000);

  it('denies a revoked member', async () => {
    const a = await env.submitted('gone', version, 'gone');
    expect((await lookup('gone', [a])).get(a)).toBeNull();
    await env.db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='gone'")
      .run();
    try {
      await expect(lookup('gone', [a])).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    } finally {
      await env.db
        .prepare("UPDATE course_memberships SET active=1 WHERE user_id='gone'")
        .run();
    }
  });

  it('lists superseded and withdrawn versions through the K5 sequence without revival', async () => {
    const a = await env.submitted('s1', version, 'k5');
    const v = await env.instructor.graded(a, 'k5');
    const read = async () => (await lookup('s1', [a])).get(a)!;
    await env.instructor.approveAndRelease(v.head.id, 'k5-1');
    let entry = await read();
    expect(entry.assessmentId).toBe(v.head.id);
    expect(entry.releaseVersions).toEqual([1]);
    expect(currentnessSchema.parse(entry.currentness)).toMatchObject({
      submissionAttemptId: a,
      currentReleaseVersion: 1,
      withdrawnReleaseVersions: [],
    });
    await env.instructor.correct(v.head.id);
    await env.instructor.approveAndRelease(v.head.id, 'k5-2');
    expect((await read()).releaseVersions).toEqual([1, 2]);
    await env.instructor.withdraw(v.head.id, 1, 'k5-1');
    expect((await read()).currentness).toMatchObject({
      currentReleaseVersion: 2,
      withdrawnReleaseVersions: [1],
    });
    await env.instructor.withdraw(v.head.id, 2, 'k5-2');
    entry = await read();
    expect(entry.releaseVersions).toEqual([1, 2]);
    expect(entry.currentness).toMatchObject({
      currentReleaseVersion: null,
      withdrawnReleaseVersions: [1, 2],
    });
    expect(Object.keys(entry).sort()).toEqual([
      'assessmentId',
      'currentness',
      'releaseVersions',
    ]);
  }, 30000);

  it('accepts a full page of 50 own attempts', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 50; i++)
      ids.push(await env.submitted('s1', version, 'page' + i));
    const found = await lookup('s1', ids);
    expect(found.size).toBe(50);
    expect([...found.values()].every((x) => x === null)).toBe(true);
  }, 60000);
});
