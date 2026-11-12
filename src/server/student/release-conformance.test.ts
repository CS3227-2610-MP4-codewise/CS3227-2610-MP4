import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { principal } from './test-fixture';
import { composedEnvironment, PRIVATE_MARKERS } from './composed-fixture';
import { releaseContractSuite } from '../../../workflow/contracts/instructor-contracts';
import { AssessmentRepository } from '../instructor/assessments/repository';
import { verifyAssessmentProducer } from '../../../workflow/assessment-preview/conformance';
import {
  assertCurrentRelease,
  currentnessSchema,
  currentnessToken,
  projectRelease,
  type Currentness,
  type Release,
  type Withdrawn,
} from '../../shared/instructor-contracts/release';
import { feedbackSummarySchema } from '../../shared/student-feedback';

/**
 * student-released-feedback 5.3 (SF-08, C-REL): Darryl's reusable C-REL conformance checks run
 * from Keith's consumer against the real composed producer on local D1. Instructor transitions use
 * the real `AssessmentWorkflow`; every read and currentness check goes through the student
 * consumer (`studentReleasePort` as the submitting student), cross-checked against the student
 * HTTP routes. Synthetic data only. `releaseProtocolContractSuite` targets the synthetic protocol
 * model rather than the D1 producer and is not run here.
 */
let env: Awaited<ReturnType<typeof composedEnvironment>>;
let result: Awaited<ReturnType<typeof verifyAssessmentProducer>>;
let attempt = '';
let assessmentId = '';
let firstCurrent: Currentness | undefined;
let released = false;
let prereleaseReads = 0;
let historicalTombstone: Release | Withdrawn | undefined;
const reads: { version: number; state: string }[] = [];

beforeAll(async () => {
  env = await composedEnvironment('student-release-conformance-test');
  const version = await env.assignment();
  attempt = await env.submitted('s1', version, 'conformance');
  const student = () => env.port('s1');
  const ids = async () => {
    const v = await env.instructor.approve(assessmentId);
    return { assessmentId, assessmentRevisionId: v.head.headRevisionId };
  };
  result = await verifyAssessmentProducer({
    prepareReviewed: async () => {
      const v = await env.instructor.graded(attempt, 'conformance', 4);
      assessmentId = v.head.id;
      return ids();
    },
    correctReviewed: async () => {
      await env.instructor.correct(assessmentId);
      return ids();
    },
    release: async (command) => {
      const r = await env.instructor
        .service()
        .release(env.instructor.request('POST'), assessmentId, command);
      released = true;
      if (r.releaseVersion === 1 && !firstCurrent)
        firstCurrent = await student().currentness(
          principal('s1'),
          assessmentId,
        );
      return r;
    },
    withdraw: (command) =>
      env.instructor
        .service()
        .withdraw(env.instructor.request('POST'), assessmentId, command),
    read: async (releaseVersion) => {
      const value = await student().getAuthorized(
        principal('s1'),
        assessmentId,
        releaseVersion,
      );
      // The student HTTP route must return exactly what the consumer port returns.
      const http = await env.call(
        `attempts/${attempt}/feedback/${releaseVersion}`,
        's1',
      );
      expect(http.status).toBe(200);
      expect(http.json).toEqual(value);
      expect(http.text).not.toMatch(PRIVATE_MARKERS);
      reads.push({ version: releaseVersion, state: value.state });
      if (releaseVersion === 1 && value.state === 'withdrawn')
        historicalTombstone ??= value;
      return value;
    },
    // Before the first release, the student consumer correctly answers NOT_FOUND (Darryl's
    // release-existence rule, PR #33), so the suite's pre-release currentness, used only to
    // build the instructor's release command, is read on the producer side. Every
    // currentness after a release goes through the student consumer.
    currentness: async () => {
      if (!released) {
        await expect(
          student().currentness(principal('s1'), assessmentId),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });
        prereleaseReads++;
        return new AssessmentRepository(env.db).currentness(
          assessmentId,
          new Date().toISOString(),
        );
      }
      return student().currentness(principal('s1'), assessmentId);
    },
  });
}, 60000);
afterAll(async () => {
  await env?.mf.dispose();
});

describe('C-REL producer conformance from the student consumer (5.3)', () => {
  it('passes verifyAssessmentProducer with reads through the student consumer', async () => {
    expect(result.first.releaseVersion).toBe(1);
    expect(prereleaseReads).toBe(1);
    expect(result.correction.releaseVersion).toBe(2);
    expect(result.historicalWithdrawal.releaseVersion).toBe(1);
    expect(result.final).toMatchObject({
      currentReleaseVersion: null,
      withdrawnReleaseVersions: [1, 2],
    });
    expect(reads).toEqual([
      { version: 1, state: 'superseded' },
      { version: 1, state: 'withdrawn' },
      { version: 2, state: 'released' },
      { version: 2, state: 'withdrawn' },
    ]);
    // Final student view: withdrawn, both tombstones, nothing revived.
    const summary = await env.call(`attempts/${attempt}/feedback`, 's1');
    expect(feedbackSummarySchema.parse(summary.json)).toMatchObject({
      state: 'withdrawn',
      versions: [
        { releaseVersion: 2, state: 'withdrawn' },
        { releaseVersion: 1, state: 'withdrawn' },
      ],
    });
    expect(summary.text).not.toMatch(/criteria|PRIVATE-/);
  });

  it('denies a foreign student and the instructor through the consumer', async () => {
    for (const user of ['s2', 'inst']) {
      await expect(
        env.port(user).currentness(principal(user), assessmentId),
      ).rejects.toMatchObject({
        code: expect.stringMatching(/^(FORBIDDEN|NOT_FOUND)$/),
      });
      expect(
        (await env.call(`attempts/${attempt}/feedback`, user)).status,
      ).toBe(404);
    }
  });
});

/**
 * Darryl's `releaseContractSuite`, invoked directly with the real producer's values (first
 * release, its currentness and the real v1 tombstone), as read through the student consumer.
 * Its later snapshots derive from the input since the 2026-11-13 fix (Keith, under Darryl's
 * one-file grant). The explicit checks below remain as an additional consumer-side layer.
 */
releaseContractSuite('Keith consumer over the composed producer', () => {
  if (!firstCurrent || !historicalTombstone)
    throw new Error('conformance run did not capture its values');
  return {
    release: result.first,
    current: firstCurrent,
    withdrawn: historicalTombstone,
    project: projectRelease,
  };
});

/** Explicit consumer-side checks on the same real values. */
describe('C-REL projection and currentness properties on real producer values (5.3)', () => {
  it('projects private metadata away and keeps tombstones content-free', () => {
    const release = result.first;
    expect(
      projectRelease({
        ...release,
        privateReference: 'PRIVATE_SYNTHETIC_SENTINEL',
        auditSecret: 'hidden',
      }),
    ).toEqual(release);
    const tombstone = projectRelease({
      ...(historicalTombstone as object),
      criteria: release.criteria,
      privateReason: 'hidden',
    });
    expect(tombstone).toEqual(historicalTombstone);
    expect(JSON.stringify(tombstone)).not.toMatch(/criteria|privateReason/);
  });

  it('rejects stale tokens and never shows withdrawn or superseded content as current', async () => {
    const first = firstCurrent!;
    const token = currentnessToken(first);
    expect(assertCurrentRelease(result.first, first, token)).toEqual(
      result.first,
    );
    // Every later real snapshot has a different token, so first-release content is stale.
    expect(currentnessToken(result.final)).not.toBe(token);
    expect(() =>
      assertCurrentRelease(result.first, result.final, token),
    ).toThrow();
    expect(() =>
      assertCurrentRelease(result.correction, result.final),
    ).toThrow();
    expect(() =>
      assertCurrentRelease({ ...result.first, state: 'superseded' }, first),
    ).toThrow();
    expect(() =>
      assertCurrentRelease(
        { ...result.first, submissionAttemptId: 'foreign' },
        first,
      ),
    ).toThrow();
    expect(
      currentnessSchema.safeParse({
        ...first,
        withdrawnReleaseVersions: [first.currentReleaseVersion],
      }).success,
    ).toBe(false);
  });
});
