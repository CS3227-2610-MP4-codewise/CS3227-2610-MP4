import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { principal } from './test-fixture';
import {
  composedEnvironment,
  PRIVATE_MARKERS as PRIVATE,
} from './composed-fixture';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import { attemptHistorySchema } from '../../shared/student-work';
import {
  feedbackSummarySchema,
  feedbackVersionSchema,
} from '../../shared/student-feedback';

/**
 * student-released-feedback 5.2 (SF-01, SF-02, SF-05, SF-07, C-REL): the student routes composed
 * with Darryl's real producer (`AssessmentService.consumer` via `studentReleasePort`) and the
 * real instructor assessment workflow, on local D1 with synthetic data. Not a deployment check.
 */
let env: Awaited<ReturnType<typeof composedEnvironment>>;
const call = (path: string, user?: string) => env.call(path, user);
const assignment = () => env.assignment();
const submitted = (user: string, version: string, tag: string) =>
  env.submitted(user, version, tag);
const instructor = () => ({
  releasedAssessment: (attemptId: string, key: string) =>
    env.instructor.graded(attemptId, key),
  approveAndRelease: env.instructor.approveAndRelease,
  correct: env.instructor.correct,
  withdraw: env.instructor.withdraw,
});

beforeAll(async () => {
  env = await composedEnvironment('student-release-port-test');
}, 30000);
afterAll(async () => {
  await env?.mf.dispose();
});

describe('student feedback through the real composed producer (5.2)', () => {
  it('serves own released feedback (200) and denies a foreign student (404)', async () => {
    const version = await assignment();
    const attempt = await submitted('s1', version, 'own');
    const inst = instructor();
    expect((await call(`attempts/${attempt}/feedback`, 's1')).json).toEqual({
      schemaVersion: 1,
      state: 'none',
    });
    const v = await inst.releasedAssessment(attempt, 'own');
    // Saved but unreleased: still none, and no draft score or text leaks.
    const draft = await call(`attempts/${attempt}/feedback`, 's1');
    expect(draft.json).toEqual({ schemaVersion: 1, state: 'none' });
    expect(draft.text).not.toMatch(/3\.5|Static inspection/);

    await inst.approveAndRelease(v.head.id, 'own');
    const own = await call(`attempts/${attempt}/feedback`, 's1');
    expect(own.status).toBe(200);
    const summary = feedbackSummarySchema.parse(own.json);
    expect(summary.state).toBe('released');
    if (summary.state !== 'released') throw new Error('unreachable');
    expect(summary.release.submissionAttemptId).toBe(attempt);
    expect(summary.release.criteria.every((c) => c.score === 3.5)).toBe(true);
    expect(own.text).not.toMatch(PRIVATE);

    for (const user of ['s2', 'inst']) {
      const denied = await call(`attempts/${attempt}/feedback`, user);
      expect(denied.status).toBe(404);
      expect(denied.text).not.toMatch(/criteria|3\.5/);
    }
    // The port itself refuses a foreign caller, independent of the route's guard.
    await expect(
      env.port('s2').attemptReleases(principal('s2'), [attempt]),
    ).rejects.toBeInstanceOf(BoundaryError);

    const history = attemptHistorySchema.parse(
      (await call(`publications/${version}/attempts`, 's1')).json,
    );
    expect(history.items.map((i) => i.feedbackReleased)).toEqual([true]);
  }, 30000);

  it('follows the K5 sequence on the real producer without revival', async () => {
    const version = await assignment();
    const attempt = await submitted('s1', version, 'k5');
    const inst = instructor();
    const v = await inst.releasedAssessment(attempt, 'k5');
    await inst.approveAndRelease(v.head.id, 'k5-1');
    await inst.correct(v.head.id);
    await inst.approveAndRelease(v.head.id, 'k5-2');
    let s = feedbackSummarySchema.parse(
      (await call(`attempts/${attempt}/feedback`, 's1')).json,
    );
    expect(s.state !== 'none' && s.versions).toEqual([
      { releaseVersion: 2, state: 'released' },
      { releaseVersion: 1, state: 'superseded' },
    ]);
    expect(
      feedbackVersionSchema.parse(
        (await call(`attempts/${attempt}/feedback/1`, 's1')).json,
      ).state,
    ).toBe('superseded');

    await inst.withdraw(v.head.id, 1, 'k5-1');
    const tomb = await call(`attempts/${attempt}/feedback/1`, 's1');
    expect(tomb.json).toMatchObject({ state: 'withdrawn', releaseVersion: 1 });
    expect(tomb.text).not.toMatch(/criteria|PRIVATE-WITHDRAWAL-REASON/);

    await inst.withdraw(v.head.id, 2, 'k5-2');
    const gone = await call(`attempts/${attempt}/feedback`, 's1');
    s = feedbackSummarySchema.parse(gone.json);
    expect(s).toMatchObject({
      state: 'withdrawn',
      versions: [
        { releaseVersion: 2, state: 'withdrawn' },
        { releaseVersion: 1, state: 'withdrawn' },
      ],
    });
    expect(gone.text).not.toMatch(/criteria|PRIVATE-WITHDRAWAL-REASON/);
    const history = attemptHistorySchema.parse(
      (await call(`publications/${version}/attempts`, 's1')).json,
    );
    expect(history.items.map((i) => i.feedbackReleased)).toEqual([false]);
  }, 30000);

  it('denies a revoked member with the uniform 404', async () => {
    const version = await assignment();
    const attempt = await submitted('gone', version, 'gone');
    const inst = instructor();
    const v = await inst.releasedAssessment(attempt, 'gone');
    await inst.approveAndRelease(v.head.id, 'gone');
    expect((await call(`attempts/${attempt}/feedback`, 'gone')).status).toBe(
      200,
    );
    await env.db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='gone'")
      .run();
    try {
      expect((await call(`attempts/${attempt}/feedback`, 'gone')).status).toBe(
        404,
      );
      await expect(
        env.port('gone').attemptReleases(principal('gone'), [attempt]),
      ).rejects.toBeInstanceOf(BoundaryError);
    } finally {
      await env.db
        .prepare("UPDATE course_memberships SET active=1 WHERE user_id='gone'")
        .run();
    }
  }, 30000);
});
