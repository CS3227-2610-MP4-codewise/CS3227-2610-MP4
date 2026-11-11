import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { D1SubmissionCatalog } from './catalog';
import { StudentWork } from './work';
import { StudentAssignments } from './repository';
import {
  NOW,
  PRIVATE,
  createDatabase,
  iso,
  principal,
  publish,
  seedPeople,
} from './test-fixture';
import { submissionContractSuite } from '../../../workflow/contracts/instructor-contracts';
import {
  draftSaveRequestSchema,
  submitRequestSchema,
} from '../../shared/student-work';
import type { Publication } from '../../shared/instructor-contracts/publication';
import type { Attempt } from '../../shared/instructor-contracts/submission';
import { validateAttempt } from '../../shared/instructor-contracts/submission';

/** SW-09, C-SUB: the real D1 catalog; synthetic fixtures only. */
let mf: Miniflare;
let db: D1Database;
let catalog: D1SubmissionCatalog;
let work: StudentWork;
let snapshot: { publication: Publication; attempt: Attempt };
const clock = () => NOW;
const DRAFT_MARKER = 'DRAFT-ONLY-MARKER';
const save = (base: number, source: string) =>
  draftSaveRequestSchema.parse({
    schemaVersion: 1,
    baseRevision: base,
    source,
  });
async function submit(
  user: string,
  version: string,
  qs: string[],
  key: string,
  tag: string,
) {
  for (const q of qs) {
    const w = await work.work(principal(user), version);
    const rev = w.questions.find((x) => x.questionVersionId === q)!.revision;
    await work.save(
      principal(user),
      q,
      save(rev, tag.startsWith('print(') ? tag + '\n' : `print('${tag}')\n`),
    );
  }
  const w = await work.work(principal(user), version);
  return work.submit(
    principal(user),
    version,
    submitRequestSchema.parse({
      schemaVersion: 1,
      idempotencyKey: key,
      answers: w.questions.map((q) => ({
        questionVersionId: q.questionVersionId,
        draftRevision: q.revision,
        sourceHash: q.sourceHash,
      })),
    }),
  );
}
const pubOf = (id: string) => ({
  ...snapshot.publication,
  assignmentVersionId: id,
});
const qs = (v: string) => [`qv-${v}-0`, `qv-${v}-1`];
const code = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as { code: string }).code;
  }
  return 'no error';
};

beforeAll(async () => {
  ({ mf, db } = await createDatabase('student-catalog-test'));
  await seedPeople(
    db,
    ['s1', 's2', 's3', 'inst', 'inst-b', 'dual'],
    [
      ['course-a', 's1', 'student'],
      ['course-a', 's2', 'student'],
      ['course-a', 's3', 'student'],
      ['course-a', 'inst', 'instructor'],
      ['course-b', 'inst-b', 'instructor'],
      ['course-a', 'dual', 'student'],
      ['course-b', 'dual', 'instructor'],
    ],
  );
  await publish(db, {
    course: 'course-a',
    assignment: 'asg',
    version: 'v1',
    number: 1,
    deadline: iso(NOW + 600_000),
  });
  work = new StudentWork(db, clock);
  catalog = new D1SubmissionCatalog(db, clock);
  const r = await submit('s1', 'v1', qs('v1'), 'k1', 'print(1)');
  const publication = await new StudentAssignments(db, clock).publication(
    principal('s1'),
    'v1',
  );
  snapshot = {
    publication,
    attempt: await catalog.getAuthorized(principal('inst'), r.attemptId),
  };
}, 60000);
afterAll(async () => {
  await mf.dispose();
});

// Darryl's factory suite, executed against the real catalog's output (detached snapshots).
submissionContractSuite('D1SubmissionCatalog', () => structuredClone(snapshot));

describe('6.1 D1SubmissionCatalog (SW-09, C-SUB)', () => {
  it('is not sample mode and returns the attempt in the validated contract shape', async () => {
    expect(catalog.sampleMode).toBe(false);
    expect(snapshot.attempt.submittedByUserId).toBe('s1');
    await expect(
      validateAttempt(snapshot.attempt, snapshot.publication),
    ).resolves.toBeTruthy();
    expect(JSON.stringify(snapshot.attempt)).not.toContain(PRIVATE);
  });
  it('returns scope and lists the latest attempt per student, keeping earlier attempts readable', async () => {
    const first = (
      await catalog.list(principal('inst'), snapshot.publication)
    )[0];
    const second = await submit('s1', 'v1', qs('v1'), 'k2', 'second');
    await submit('s2', 'v1', qs('v1'), 'k3', 'other student');
    const listed = await catalog.list(principal('inst'), snapshot.publication);
    expect(listed).toHaveLength(2);
    expect(
      listed.every(
        (x) => x.sample === false && /^Student [0-9a-f]{8}$/.test(x.label),
      ),
    ).toBe(true);
    expect(listed.map((x) => x.attemptId)).toContain(second.attemptId);
    expect(listed.map((x) => x.attemptId)).not.toContain(first.attemptId);
    expect(new Set(listed.map((x) => x.label)).size).toBe(2);
    expect(JSON.stringify(listed)).not.toMatch(/s1|s2|email/);
    expect(await catalog.scope(principal('inst'), first.attemptId)).toEqual({
      courseId: 'course-a',
    });
    const earlier = await catalog.getAuthorized(
      principal('inst'),
      first.attemptId,
    );
    expect(earlier.answers[0].source).toBe('print(1)\n');
  });
  it('never returns drafts', async () => {
    await work.save(principal('s3'), 'qv-v1-0', save(0, `${DRAFT_MARKER}\n`));
    expect(
      JSON.stringify(
        await catalog.list(principal('inst'), snapshot.publication),
      ),
    ).not.toContain(DRAFT_MARKER);
    // a draft edited after submitting does not alter the committed attempt
    await submit('s3', 'v1', qs('v1'), 'k4', 'committed');
    await work.save(
      principal('s3'),
      'qv-v1-0',
      save(2, `${DRAFT_MARKER}-later\n`),
    );
    const listed = await catalog.list(principal('inst'), snapshot.publication);
    for (const item of listed) {
      const a = await catalog.getAuthorized(principal('inst'), item.attemptId);
      expect(JSON.stringify(a)).not.toContain(DRAFT_MARKER);
    }
    // a student with only drafts has no entry
    await work.save(principal('s3'), 'qv-v1-1', save(1, 'x\n'));
    const noAttempt = await catalog.getAuthorized(
      principal('inst'),
      listed[0].attemptId,
    );
    expect(noAttempt.answers).toHaveLength(2);
  });
  it('answers not found for non-instructors, other-course instructors and missing attempts', async () => {
    const id = (await catalog.list(principal('inst'), snapshot.publication))[0]
      .attemptId;
    for (const user of ['s1', 's2', 'inst-b', 'dual']) {
      expect(await code(catalog.getAuthorized(principal(user), id))).toBe(
        'NOT_FOUND',
      );
      expect(await code(catalog.scope(principal(user), id))).toBe('NOT_FOUND');
      expect(
        await code(catalog.list(principal(user), snapshot.publication)),
      ).toBe('NOT_FOUND');
    }
    expect(
      await code(catalog.getAuthorized(principal('inst'), 'missing')),
    ).toBe('NOT_FOUND');
    expect(await code(catalog.scope(principal('inst'), 'missing'))).toBe(
      'NOT_FOUND',
    );
  });
  it('fails closed for a revoked instructor session', async () => {
    const id = (await catalog.list(principal('inst'), snapshot.publication))[0]
      .attemptId;
    await db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='inst'")
      .run();
    try {
      expect(await code(catalog.getAuthorized(principal('inst'), id))).toBe(
        'NOT_FOUND',
      );
    } finally {
      await db
        .prepare("UPDATE course_memberships SET active=1 WHERE user_id='inst'")
        .run();
    }
  });
  it('reports malformed stored data as unavailable, not as a client error', async () => {
    // Rows inserted directly (bypassing the producer) to simulate corrupt storage.
    const insert = async (id: string, hash: string, rubric: string) => {
      await db.batch([
        db
          .prepare(
            `INSERT INTO student_attempts(id,user_id,course_id,assignment_id,publication_id,submitted_at,idempotency_key,fingerprint) VALUES(?, 's3','course-a','asg','v1',?,?,?)`,
          )
          .bind(id, iso(NOW), 'bad-' + id, 'd'.repeat(64)),
        ...qs('v1').map((q, i) =>
          db
            .prepare(
              `INSERT INTO student_attempt_answers(id,attempt_id,question_version_id,rubric_version_id,draft_revision,source,source_hash) VALUES(?,?,?,?,1,'x',?)`,
            )
            .bind(id + i, id, q, i === 0 ? rubric : `rv-v1-${i}`, hash),
        ),
      ]);
    };
    await insert('bad-hash', 'e'.repeat(64), 'rv-v1-0');
    await insert(
      'bad-rubric',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'rv-v1-1',
    );
    expect(
      await code(catalog.getAuthorized(principal('inst'), 'bad-hash')),
    ).toBe('UPSTREAM_UNAVAILABLE');
    expect(
      await code(catalog.getAuthorized(principal('inst'), 'bad-rubric')),
    ).toBe('UPSTREAM_UNAVAILABLE');
  });
});

describe('repair round: assignment-level latest, ordering and cap', () => {
  const deadline = iso(NOW + 600_000);
  it('lists a student only on the publication holding their latest assignment attempt', async () => {
    await publish(db, {
      course: 'course-a',
      assignment: 'asg-lat',
      version: 'lat-v1',
      number: 1,
      deadline,
    });
    const a1 = await submit('s1', 'lat-v1', qs('lat-v1'), 'lat-1', 'one');
    expect(
      (await catalog.list(principal('inst'), pubOf('lat-v1'))).map(
        (x) => x.attemptId,
      ),
    ).toEqual([a1.attemptId]);
    await publish(db, {
      course: 'course-a',
      assignment: 'asg-lat',
      version: 'lat-v2',
      number: 2,
      deadline,
    });
    const a2 = await submit('s1', 'lat-v2', qs('lat-v2'), 'lat-2', 'two');
    expect(await catalog.list(principal('inst'), pubOf('lat-v1'))).toEqual([]);
    expect(
      (await catalog.list(principal('inst'), pubOf('lat-v2'))).map(
        (x) => x.attemptId,
      ),
    ).toEqual([a2.attemptId]);
    // the earlier attempt stays readable by id
    expect(
      (await catalog.getAuthorized(principal('inst'), a1.attemptId))
        .assignmentVersionId,
    ).toBe('lat-v1');
  });
  it('orders by submitted_at then insert sequence, even when a later row has an earlier time', async () => {
    await publish(db, {
      course: 'course-a',
      assignment: 'asg-ord',
      version: 'ord-v1',
      number: 1,
      deadline,
    });
    let t = NOW + 2000;
    const timed = new StudentWork(db, () => t);
    const run = async (key: string) => {
      const w = await timed.work(principal('s2'), 'ord-v1');
      for (const q of w.questions)
        await timed.save(
          principal('s2'),
          q.questionVersionId,
          save(q.revision, key + '\n'),
        );
      const full = await timed.work(principal('s2'), 'ord-v1');
      return timed.submit(
        principal('s2'),
        'ord-v1',
        submitRequestSchema.parse({
          schemaVersion: 1,
          idempotencyKey: key,
          answers: full.questions.map((q) => ({
            questionVersionId: q.questionVersionId,
            draftRevision: q.revision,
            sourceHash: q.sourceHash,
          })),
        }),
      );
    };
    const later = await run('ord-a'); // seq lower, submitted at NOW+2000
    t = NOW + 1000;
    const earlier = await run('ord-b'); // seq higher, submitted earlier
    expect(
      (await catalog.list(principal('inst'), pubOf('ord-v1'))).map(
        (x) => x.attemptId,
      ),
    ).toEqual([later.attemptId]);
    const history = await timed.history(principal('s2'), 'ord-v1', null);
    expect(history.items.map((x) => x.attemptId)).toEqual([
      later.attemptId,
      earlier.attemptId,
    ]);
    const paged = await timed.history(principal('s2'), 'ord-v1', null);
    expect(paged.nextCursor).toBeNull();
  });
  it('fails closed instead of silently capping the listing', async () => {
    const capped = new D1SubmissionCatalog(db, clock, 1);
    expect(
      await code(capped.list(principal('inst'), snapshot.publication)),
    ).toBe('UPSTREAM_UNAVAILABLE');
    const exact = new D1SubmissionCatalog(db, clock, 100);
    expect(
      (await exact.list(principal('inst'), snapshot.publication)).length,
    ).toBeGreaterThan(1);
  });
});
