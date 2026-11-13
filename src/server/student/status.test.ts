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
  assignmentStatusPageSchema,
  draftSaveRequestSchema,
  submitRequestSchema,
  type AssignmentStatus,
} from '../../shared/student-work';

/**
 * AS-01, AS-02 on local D1 with the in-memory C-REL fake (fixture runs, not producer integration).
 * The server clock is NOW; Due soon is (NOW, NOW + 24 h].
 */
let mf: Miniflare;
let db: D1Database;
const clock = () => NOW;
let work: StudentWork;
let counter = 0;
const HOUR = 3_600_000;

async function submitted(user: string, version: string) {
  const tag = 't' + ++counter;
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
/** Publishes version 1 of a new assignment; returns its assignment and version IDs. */
async function assignment(deadline = NOW + 48 * HOUR, course = 'course-a') {
  const k = 's' + ++counter;
  await publish(db, {
    course,
    assignment: 'asg-' + k,
    version: 'ver-' + k,
    number: 1,
    deadline: iso(deadline),
  });
  return { assignment: 'asg-' + k, version: 'ver-' + k };
}
async function call(
  query: string,
  port: StudentReleasePort | undefined,
  user?: string,
  course = 'course-a',
) {
  const response = await studentHandler(
    new Request(
      `https://app.example.test/api/student/courses/${course}/assignment-status${query}`,
      { headers: user ? { 'x-test-user': user } : {} },
    ),
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
const query = (ids: string[]) =>
  '?' + ids.map((i) => 'id=' + encodeURIComponent(i)).join('&');
async function statuses(
  ids: string[],
  port: StudentReleasePort | undefined,
  user = 's1',
): Promise<Record<string, AssignmentStatus>> {
  const r = await call(query(ids), port, user);
  expect(r.status).toBe(200);
  return Object.fromEntries(
    assignmentStatusPageSchema
      .parse(r.json)
      .items.map((i) => [i.assignmentId, i.status]),
  );
}

beforeAll(async () => {
  ({ mf, db } = await createDatabase('student-status-test'));
  await seedPeople(
    db,
    ['s1', 's2', 'inst', 'gone'],
    [
      ['course-a', 's1', 'student'],
      ['course-a', 's2', 'student'],
      ['course-a', 'inst', 'instructor'],
      ['course-a', 'gone', 'student'],
      ['course-b', 's2', 'student'],
    ],
  );
  work = new StudentWork(db, clock);
}, 30000);
afterAll(async () => {
  await mf?.dispose();
});

describe('status derivation and priority (AS-01)', () => {
  it('derives each tag in priority order from the latest attempt', async () => {
    const released = await assignment(NOW + 2 * HOUR);
    const submittedOnly = await assignment(NOW + 2 * HOUR);
    const earlierFeedback = await assignment();
    const withdrawn = await assignment();
    const due = await assignment(NOW + 2 * HOUR);
    const later = await assignment();
    const fake = new FakeReleasePort();
    const r1 = await submitted('s1', released.version);
    fake.assess(r1, 's1');
    fake.release(r1);
    await submitted('s1', submittedOnly.version);
    const e1 = await submitted('s1', earlierFeedback.version);
    fake.assess(e1, 's1');
    fake.release(e1);
    await submitted('s1', earlierFeedback.version); // latest, unreleased
    const w1 = await submitted('s1', withdrawn.version);
    fake.assess(w1, 's1');
    fake.release(w1);
    fake.withdraw(w1, 1);
    fake.calls.length = 0;
    expect(
      await statuses(
        [
          released.assignment,
          submittedOnly.assignment,
          earlierFeedback.assignment,
          withdrawn.assignment,
          due.assignment,
          later.assignment,
        ],
        fake,
      ),
    ).toEqual({
      [released.assignment]: 'feedback-released',
      [submittedOnly.assignment]: 'submitted',
      [earlierFeedback.assignment]: 'submitted',
      [withdrawn.assignment]: 'submitted',
      [due.assignment]: 'due-soon',
      [later.assignment]: 'none',
    });
    // One batched producer call for the four latest attempts.
    expect(fake.calls).toEqual(['attemptReleases:4']);
  });

  it('applies the Due soon boundaries against the server clock', async () => {
    const exact = await assignment(NOW + 24 * HOUR);
    const over = await assignment(NOW + 24 * HOUR + 1000);
    const minute = await assignment(NOW + 60_000);
    const passed = await assignment(NOW - 1000);
    expect(
      await statuses(
        [exact, over, minute, passed].map((a) => a.assignment),
        undefined,
      ),
    ).toEqual({
      [exact.assignment]: 'due-soon',
      [over.assignment]: 'none',
      [minute.assignment]: 'due-soon',
      [passed.assignment]: 'none',
    });
  });

  it('counts an attempt on an earlier publication as Submitted', async () => {
    const a = await assignment(NOW + 2 * HOUR);
    await submitted('s1', a.version);
    await publish(db, {
      course: 'course-a',
      assignment: a.assignment,
      version: a.version + '-v2',
      number: 2,
      deadline: iso(NOW + 3 * HOUR),
    });
    expect(await statuses([a.assignment], undefined)).toEqual({
      [a.assignment]: 'submitted',
    });
  });

  it('reads only the caller’s own attempts', async () => {
    const a = await assignment(NOW + 2 * HOUR);
    const other = await submitted('s2', a.version);
    const fake = new FakeReleasePort();
    fake.assess(other, 's2');
    fake.release(other);
    expect(await statuses([a.assignment], fake, 's1')).toEqual({
      [a.assignment]: 'due-soon',
    });
    expect(await statuses([a.assignment], fake, 's2')).toEqual({
      [a.assignment]: 'feedback-released',
    });
  });

  it('answers a full page of 50 IDs with no producer call when nothing was submitted', async () => {
    const page = [];
    for (let i = 0; i < 50; i++) page.push((await assignment()).assignment);
    const fake = new FakeReleasePort();
    const result = await statuses(page, fake);
    expect(Object.keys(result)).toHaveLength(50);
    expect(Object.values(result).every((s) => s === 'none')).toBe(true);
    expect(fake.calls).toEqual([]);
  });
});

describe('authorization and failure (AS-02)', () => {
  it('requires a session and is no-store', async () => {
    const a = await assignment();
    const anonymous = await call(query([a.assignment]), undefined);
    expect(anonymous.status).toBe(401);
    expect(anonymous.text).not.toContain(a.assignment);
    const ok = await call(query([a.assignment]), undefined, 's1');
    expect(ok.headers.get('cache-control')).toContain('no-store');
  });

  it('omits IDs outside the course and unknown IDs without revealing them', async () => {
    const inA = await assignment();
    const inB = await assignment(NOW + 2 * HOUR, 'course-b');
    expect(
      await statuses(
        [inA.assignment, inB.assignment, 'missing-id'],
        undefined,
        's2',
      ),
    ).toEqual({ [inA.assignment]: 'none' });
  });

  it('gives the uniform 404 to non-members, instructors, revoked members and inactive courses', async () => {
    const a = await assignment();
    const q = query([a.assignment]);
    const notMember = await call(q, undefined, 's1', 'course-b');
    expect(notMember.status).toBe(404);
    expect((await call(q, undefined, 'inst')).status).toBe(404);
    await db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='gone'")
      .run();
    try {
      expect((await call(q, undefined, 'gone')).status).toBe(404);
    } finally {
      await db
        .prepare("UPDATE course_memberships SET active=1 WHERE user_id='gone'")
        .run();
    }
    await db.prepare("UPDATE courses SET active=0 WHERE id='course-a'").run();
    try {
      const inactive = await call(q, undefined, 's1');
      expect(inactive.status).toBe(404);
      expect(inactive.json.error.code).toBe(notMember.json.error.code);
      expect(inactive.json.error.message).toBe(notMember.json.error.message);
    } finally {
      await db.prepare("UPDATE courses SET active=1 WHERE id='course-a'").run();
    }
  });

  it('rejects malformed queries with 400 and no status data', async () => {
    const a = await assignment();
    const many = Array.from({ length: 51 }, (_, i) => 'x' + i);
    for (const q of [
      '',
      '?ids=' + a.assignment,
      query([a.assignment]) + '&cursor=x',
      query([a.assignment, a.assignment]),
      query(many),
      '?id=',
    ]) {
      const r = await call(q, undefined, 's1');
      expect(r.status).toBe(400);
      expect(r.text).not.toContain('"items"');
    }
  });

  it('falls back to own data when the release producer is absent or failing', async () => {
    const a = await assignment(NOW + 2 * HOUR);
    const attempt = await submitted('s1', a.version);
    const fake = new FakeReleasePort();
    fake.assess(attempt, 's1');
    fake.release(attempt);
    expect(await statuses([a.assignment], undefined)).toEqual({
      [a.assignment]: 'submitted',
    });
    fake.unavailable = true;
    expect(await statuses([a.assignment], fake)).toEqual({
      [a.assignment]: 'submitted',
    });
  });

  it('never returns attempt IDs, times, scores or private data', async () => {
    const a = await assignment(NOW + 2 * HOUR);
    const attempt = await submitted('s1', a.version);
    const fake = new FakeReleasePort();
    fake.assess(attempt, 's1');
    fake.release(attempt);
    const r = await call(query([a.assignment]), fake, 's1');
    expect(r.status).toBe(200);
    expect(r.text).not.toContain(attempt);
    expect(r.text).not.toMatch(
      /score|criteria|deadline|submitted_?at|\d{4}-\d{2}-\d{2}T/i,
    );
    expect(r.text).not.toContain(PRIVATE);
  });
});
