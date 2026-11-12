import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { StudentWork } from './work';
import { StudentAssignments } from './repository';
import { studentHandler } from './http';
import type { StudentReleasePort } from './feedback';
import {
  FakeReleasePort,
  NOW,
  PRIVATE,
  createDatabase,
  iso,
  principal,
  publish,
  seedPeople,
  testSessions,
} from './test-fixture';
import {
  draftSaveRequestSchema,
  submitRequestSchema,
  attemptHistorySchema,
} from '../../shared/student-work';
import {
  feedbackSummarySchema,
  feedbackVersionSchema,
} from '../../shared/student-feedback';
import { currentnessToken } from '../../shared/instructor-contracts/release';

/**
 * SF-01, SF-02, SF-05, SF-07, SF-08 (fixture runs only): student feedback routes on local D1
 * against the in-memory C-REL fake. These are not integration with the real producer.
 */
let mf: Miniflare;
let db: D1Database;
const clock = () => NOW;
let work: StudentWork;
let counter = 0;

async function submitted(user: string, version: string, tag: string) {
  const w = await work.work(principal(user), version);
  for (const q of w.questions)
    await work.save(
      principal(user),
      q.questionVersionId,
      draftSaveRequestSchema.parse({
        schemaVersion: 1,
        baseRevision: q.revision,
        source: `print('${tag}')\n`,
      }),
    );
  const fresh = await work.work(principal(user), version);
  const result = await work.submit(
    principal(user),
    version,
    submitRequestSchema.parse({
      schemaVersion: 1,
      idempotencyKey: 'key-' + tag,
      answers: fresh.questions.map((q) => ({
        questionVersionId: q.questionVersionId,
        draftRevision: q.revision,
        sourceHash: q.sourceHash,
      })),
    }),
  );
  return result.attemptId;
}
async function assignment() {
  const k = 'f' + ++counter;
  await publish(db, {
    course: 'course-a',
    assignment: 'asg-' + k,
    version: 'ver-' + k,
    number: 1,
    deadline: iso(NOW + 600_000),
  });
  return 'ver-' + k;
}
async function call(
  path: string,
  port: StudentReleasePort | undefined,
  user?: string,
) {
  const response = await studentHandler(
    new Request('https://app.example.test/api/student/' + path, {
      headers: user ? { 'x-test-user': user } : {},
    }),
    testSessions,
    new StudentAssignments(db, clock),
    work,
    port ? () => port : undefined,
  );
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    text,
    json: JSON.parse(text),
  };
}
const PRIVATE_KEYS =
  /reason|approv|reviewer|actor|provenance|privateReference|PRIVATE-REFERENCE|draftRevision|prompt/i;

beforeAll(async () => {
  ({ mf, db } = await createDatabase('student-feedback-test'));
  await seedPeople(
    db,
    ['s1', 's2', 'inst', 'gone'],
    [
      ['course-a', 's1', 'student'],
      ['course-a', 's2', 'student'],
      ['course-a', 'inst', 'instructor'],
      ['course-a', 'gone', 'student'],
    ],
  );
  work = new StudentWork(db, clock);
}, 30000);
afterAll(async () => {
  await mf?.dispose();
});

describe('FakeReleasePort (fixture self-test, K5)', () => {
  it('reproduces the v1 → v2 → withdraw v1 → withdraw v2 states exactly', async () => {
    const fake = new FakeReleasePort();
    const p = principal('s1');
    fake.assess('att', 's1');
    expect((await fake.attemptReleases(p, ['att'])).get('att')).toBeNull();
    fake.release('att');
    const read = async () =>
      (await fake.attemptReleases(p, ['att'])).get('att')!;
    expect((await read()).currentness).toMatchObject({
      availabilityRevision: 1,
      currentReleaseVersion: 1,
      withdrawnReleaseVersions: [],
    });
    fake.release('att');
    let e = await read();
    expect(e.releaseVersions).toEqual([1, 2]);
    expect(e.currentness).toMatchObject({
      availabilityRevision: 2,
      currentReleaseVersion: 2,
    });
    expect((await fake.getAuthorized(p, e.assessmentId, 1)).state).toBe(
      'superseded',
    );
    fake.withdraw('att', 1);
    e = await read();
    expect(e.currentness).toMatchObject({
      availabilityRevision: 3,
      currentReleaseVersion: 2,
      withdrawnReleaseVersions: [1],
    });
    expect(await fake.getAuthorized(p, e.assessmentId, 1)).toMatchObject({
      state: 'withdrawn',
    });
    fake.withdraw('att', 2);
    e = await read();
    expect(e.currentness).toMatchObject({
      availabilityRevision: 4,
      currentReleaseVersion: null,
      withdrawnReleaseVersions: [1, 2],
    });
    for (const v of [1, 2])
      expect(
        Object.keys(await fake.getAuthorized(p, e.assessmentId, v)).sort(),
      ).toEqual(
        [
          'id',
          'releaseVersion',
          'schemaVersion',
          'state',
          'submissionAttemptId',
          'withdrawnAt',
        ].sort(),
      );
  });

  it('injects a commit inside the read and denies another user', async () => {
    const fake = new FakeReleasePort();
    fake.assess('att', 's1');
    fake.release('att');
    const e = (await fake.attemptReleases(principal('s1'), ['att'])).get(
      'att',
    )!;
    fake.duringRead = () => fake.release('att');
    await expect(
      fake.getAuthorized(principal('s1'), e.assessmentId, 1),
    ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
    const after = await fake.currentness(principal('s1'), e.assessmentId);
    expect(currentnessToken(after)).not.toBe(currentnessToken(e.currentness));
    await expect(
      fake.attemptReleases(principal('s2'), ['att']),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('GET /api/student/attempts/:id/feedback (SF-01, SF-02, SF-05)', () => {
  it('requires a session and gives every non-owner the uniform 404 with no producer call', async () => {
    const version = await assignment();
    const attempt = await submitted('s1', version, 'deny');
    const fake = new FakeReleasePort();
    fake.assess(attempt, 's1');
    fake.release(attempt);
    expect((await call(`attempts/${attempt}/feedback`, fake)).status).toBe(401);
    const bodies = new Set<string>();
    for (const [user, id] of [
      ['s2', attempt],
      ['inst', attempt],
      ['s1', 'attempt-unknown'],
      ['s1', attempt + '/feedback/1/x'],
    ] as const) {
      const r = await call(`attempts/${id}/feedback`, fake, user);
      expect(r.status).toBe(404);
      expect(r.text).not.toMatch(/criteria|score|assessment-/);
      bodies.add(
        JSON.stringify({
          ...r.json,
          error: { ...r.json.error, requestId: 'x' },
        }),
      );
    }
    const v = await call(`attempts/${attempt}/feedback/1`, fake, 's2');
    expect(v.status).toBe(404);
    expect(bodies.size).toBe(1);
    expect(fake.calls).toEqual([]);
  });

  it('gives a revoked member the uniform 404 before the producer', async () => {
    const version = await assignment();
    const attempt = await submitted('gone', version, 'gone');
    const fake = new FakeReleasePort();
    fake.assess(attempt, 'gone');
    fake.release(attempt);
    await db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='gone'")
      .run();
    try {
      const r = await call(`attempts/${attempt}/feedback`, fake, 'gone');
      expect(r.status).toBe(404);
      expect(fake.calls).toEqual([]);
    } finally {
      await db
        .prepare("UPDATE course_memberships SET active=1 WHERE user_id='gone'")
        .run();
    }
  });

  it('reports none for no assessment and for an unreleased draft', async () => {
    const version = await assignment();
    const attempt = await submitted('s1', version, 'none');
    const fake = new FakeReleasePort();
    let r = await call(`attempts/${attempt}/feedback`, fake, 's1');
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ schemaVersion: 1, state: 'none' });
    fake.assess(attempt, 's1');
    r = await call(`attempts/${attempt}/feedback`, fake, 's1');
    expect(r.json).toEqual({ schemaVersion: 1, state: 'none' });
    expect(r.headers.get('cache-control')).toContain('no-store');
  });

  it('serves the current release, replaced history and tombstones through K5', async () => {
    const version = await assignment();
    const attempt = await submitted('s1', version, 'k5');
    const fake = new FakeReleasePort();
    fake.assess(attempt, 's1');
    const v1 = fake.release(attempt);
    let r = await call(`attempts/${attempt}/feedback`, fake, 's1');
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toContain('no-store');
    let s = feedbackSummarySchema.parse(r.json);
    expect(s).toMatchObject({
      state: 'released',
      versions: [{ releaseVersion: 1, state: 'released' }],
      release: v1,
    });
    expect(r.text).not.toMatch(PRIVATE_KEYS);

    fake.release(attempt);
    s = feedbackSummarySchema.parse(
      (await call(`attempts/${attempt}/feedback`, fake, 's1')).json,
    );
    expect(s.state === 'released' && s.release.releaseVersion).toBe(2);
    expect(s.state !== 'none' && s.versions).toEqual([
      { releaseVersion: 2, state: 'released' },
      { releaseVersion: 1, state: 'superseded' },
    ]);
    r = await call(`attempts/${attempt}/feedback/1`, fake, 's1');
    expect(r.status).toBe(200);
    expect(feedbackVersionSchema.parse(r.json)).toMatchObject({
      releaseVersion: 1,
      state: 'superseded',
    });

    fake.withdraw(attempt, 1);
    r = await call(`attempts/${attempt}/feedback/1`, fake, 's1');
    expect(r.json).toMatchObject({ state: 'withdrawn', releaseVersion: 1 });
    expect(r.text).not.toMatch(/criteria|explanation|reason/);

    fake.withdraw(attempt, 2);
    r = await call(`attempts/${attempt}/feedback`, fake, 's1');
    s = feedbackSummarySchema.parse(r.json);
    expect(s).toMatchObject({
      state: 'withdrawn',
      versions: [
        { releaseVersion: 2, state: 'withdrawn' },
        { releaseVersion: 1, state: 'withdrawn' },
      ],
    });
    expect(r.text).not.toMatch(/criteria|explanation|"release"/);
    expect(
      (await call(`attempts/${attempt}/feedback/3`, fake, 's1')).status,
    ).toBe(404);
    expect(
      (await call(`attempts/${attempt}/feedback/0`, fake, 's1')).status,
    ).toBe(404);
  });

  it('returns 409 STALE_FEEDBACK when a release lands during or after the read', async () => {
    const version = await assignment();
    const attempt = await submitted('s1', version, 'race');
    const fake = new FakeReleasePort();
    fake.assess(attempt, 's1');
    fake.release(attempt);
    for (const hook of ['duringRead', 'afterRead'] as const) {
      fake[hook] = () => fake.release(attempt);
      const r = await call(`attempts/${attempt}/feedback`, fake, 's1');
      expect(r.status).toBe(409);
      expect(r.json.error.code).toBe('STALE_FEEDBACK');
      expect(r.text).not.toMatch(/criteria|explanation/);
    }
    fake.afterRead = () => fake.withdraw(attempt, 1);
    const old = await call(`attempts/${attempt}/feedback/1`, fake, 's1');
    expect(old.status).toBe(409);
    const retry = feedbackSummarySchema.parse(
      (await call(`attempts/${attempt}/feedback`, fake, 's1')).json,
    );
    expect(retry.state === 'released' && retry.release.releaseVersion).toBe(3);
  });

  it('never shows a release for another assessment or attempt as current', async () => {
    const version = await assignment();
    const attempt = await submitted('s1', version, 'mismatch');
    const fake = new FakeReleasePort();
    fake.assess(attempt, 's1');
    fake.release(attempt);
    const foreignRelease: StudentReleasePort = {
      attemptReleases: (p, ids) => fake.attemptReleases(p, ids),
      currentness: (p, id) => fake.currentness(p, id),
      getAuthorized: async (p, id, v) => ({
        ...(await fake.getAuthorized(p, id, v)),
        id: 'assessment-other',
      }),
    };
    const foreignAttempt: StudentReleasePort = {
      ...foreignRelease,
      getAuthorized: (p, id, v) => fake.getAuthorized(p, id, v),
      attemptReleases: async (p, ids) => {
        const m = await fake.attemptReleases(p, ids);
        const e = m.get(attempt)!;
        m.set(attempt, {
          ...e,
          currentness: { ...e.currentness, submissionAttemptId: 'other' },
        });
        return m;
      },
    };
    for (const port of [foreignRelease, foreignAttempt]) {
      const r = await call(`attempts/${attempt}/feedback`, port, 's1');
      expect(r.status).toBe(409);
      expect(r.text).not.toMatch(/criteria|explanation/);
    }
  });

  it('fails closed with 503 without a port, after the own-attempt check', async () => {
    const version = await assignment();
    const attempt = await submitted('s1', version, 'noport');
    expect(
      (await call(`attempts/${attempt}/feedback`, undefined, 's1')).status,
    ).toBe(503);
    expect(
      (await call(`attempts/${attempt}/feedback`, undefined, 's2')).status,
    ).toBe(404);
    const fake = new FakeReleasePort();
    fake.unavailable = true;
    expect(
      (await call(`attempts/${attempt}/feedback`, fake, 's1')).status,
    ).toBe(503);
  });
});

describe('history feedbackReleased marker (SF-07)', () => {
  it('flags only current releases with one producer call per page', async () => {
    const version = await assignment();
    const [a1, a2, a3, a4] = [
      await submitted('s1', version, 'h1'),
      await submitted('s1', version, 'h2'),
      await submitted('s1', version, 'h3'),
      await submitted('s1', version, 'h4'),
    ];
    const fake = new FakeReleasePort();
    fake.assess(a2, 's1');
    fake.release(a2);
    fake.assess(a3, 's1');
    fake.release(a3);
    fake.withdraw(a3, 1); // withdrawn-only
    fake.assess(a4, 's1'); // assessed, unreleased
    const r = await call(`publications/${version}/attempts`, fake, 's1');
    expect(r.status).toBe(200);
    const page = attemptHistorySchema.parse(r.json);
    expect(
      Object.fromEntries(
        page.items.map((i) => [i.attemptId, i.feedbackReleased]),
      ),
    ).toEqual({ [a1]: false, [a2]: true, [a3]: false, [a4]: false });
    expect(fake.calls).toEqual(['attemptReleases:4']);
    expect(r.text).not.toMatch(/score|criteria/);
    expect(r.text).not.toContain(PRIVATE);
  });

  it('gives no marker to a stale row and keeps the list when the port is absent or failing', async () => {
    const version = await assignment();
    const a1 = await submitted('s1', version, 'st1');
    const a2 = await submitted('s1', version, 'st2');
    const fake = new FakeReleasePort();
    for (const a of [a1, a2]) {
      fake.assess(a, 's1');
      fake.release(a);
    }
    const stale: StudentReleasePort = {
      ...fake,
      getAuthorized: (p, id, v) => fake.getAuthorized(p, id, v),
      currentness: (p, id) => fake.currentness(p, id),
      attemptReleases: async (p, ids) => {
        const m = await fake.attemptReleases(p, ids);
        const e = m.get(a1)!;
        m.set(a1, {
          ...e,
          currentness: { ...e.currentness, submissionAttemptId: a2 },
        });
        return m;
      },
    };
    let page = attemptHistorySchema.parse(
      (await call(`publications/${version}/attempts`, stale, 's1')).json,
    );
    expect(page.items.find((i) => i.attemptId === a1)!.feedbackReleased).toBe(
      false,
    );
    expect(page.items.find((i) => i.attemptId === a2)!.feedbackReleased).toBe(
      true,
    );
    const none = await call(
      `publications/${version}/attempts`,
      undefined,
      's1',
    );
    expect(none.status).toBe(200);
    page = attemptHistorySchema.parse(none.json);
    expect(page.items.every((i) => !i.feedbackReleased)).toBe(true);
    fake.unavailable = true;
    const failing = await call(`publications/${version}/attempts`, fake, 's1');
    expect(failing.status).toBe(200);
    expect(
      attemptHistorySchema
        .parse(failing.json)
        .items.every((i) => !i.feedbackReleased),
    ).toBe(true);
  });
});
