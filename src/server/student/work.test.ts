import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { StudentWork, StudentWorkError } from './work';
import { StudentAssignments } from './repository';
import { studentHandler } from './http';
import {
  NOW,
  ORIGIN,
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
  workResponseSchema,
} from '../../shared/student-work';
import { attemptSchema } from '../../shared/instructor-contracts/submission';
import { sourceHash } from '../../shared/instructor-contracts/schema';

/** SW-01–SW-08, K4, AUTH-01–03, C-SUB SUB-C01–C06: synthetic fixtures; local D1 only. */
let mf: Miniflare;
let db: D1Database;
let clockMs = NOW;
const clock = () => clockMs;
let work: StudentWork;
const DEADLINE = NOW + 600_000;

let counter = 0;
async function fresh(over: Partial<Parameters<typeof publish>[1]> = {}) {
  const k = 'p' + ++counter;
  const o = {
    course: 'course-a',
    assignment: 'asg-' + k,
    version: 'ver-' + k,
    number: 1,
    deadline: iso(DEADLINE),
    count: 2,
    ...over,
  };
  await publish(db, o);
  return {
    assignment: o.assignment,
    version: o.version,
    questions: Array.from(
      { length: o.count },
      (_, i) => `qv-${o.version}-${i}`,
    ),
  };
}
const saveReq = (base: number, source: string) =>
  draftSaveRequestSchema.parse({
    schemaVersion: 1,
    baseRevision: base,
    source,
  });
const submitReq = (
  key: string,
  answers: {
    questionVersionId: string;
    draftRevision: number;
    sourceHash: string;
  }[],
) =>
  submitRequestSchema.parse({ schemaVersion: 1, idempotencyKey: key, answers });
const count = async (table: string) =>
  (await db
    .prepare(`SELECT COUNT(*) AS n FROM ${table}`)
    .first<{ n: number }>())!.n;
async function saveAll(user: string, p: { questions: string[] }, tag = 'v') {
  for (const q of p.questions)
    await work.save(principal(user), q, saveReq(0, `print('${tag}-${q}')\n`));
}
async function confirmed(user: string, version: string) {
  const w = await work.work(principal(user), version);
  return w.questions.map((q) => ({
    questionVersionId: q.questionVersionId,
    draftRevision: q.revision,
    sourceHash: q.sourceHash,
  }));
}
async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  throw new Error('expected a failure');
}
async function call(
  path: string,
  o: {
    user?: string;
    method?: string;
    body?: unknown;
    origin?: string | null;
    csrf?: string | null;
    headers?: Record<string, string>;
  } = {},
) {
  const method = o.method ?? 'GET';
  const headers: Record<string, string> = { ...(o.headers ?? {}) };
  if (o.user) headers['x-test-user'] = o.user;
  if (method !== 'GET') {
    if (o.origin !== null) headers.origin = o.origin ?? ORIGIN;
    if (o.csrf !== null) headers['x-csrf'] = o.csrf ?? 'valid';
  }
  const response = await studentHandler(
    new Request('https://app.example.test' + path, {
      method,
      headers,
      body: o.body === undefined ? undefined : JSON.stringify(o.body),
    }),
    testSessions,
    new StudentAssignments(db, clock),
    work,
  );
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    text,
    json: JSON.parse(text),
  };
}

beforeAll(async () => {
  ({ mf, db } = await createDatabase('student-work-test'));
  await seedPeople(
    db,
    ['s1', 's2', 's3', 's4', 'other', 'inst', 'dual', 'gone'],
    [
      ['course-a', 's1', 'student'],
      ['course-a', 's2', 'student'],
      ['course-a', 's3', 'student'],
      ['course-a', 's4', 'student'],
      ['course-a', 'gone', 'student'],
      ['course-b', 'other', 'student'],
      ['course-a', 'inst', 'instructor'],
      ['course-a', 'dual', 'instructor'],
      ['course-b', 'dual', 'student'],
    ],
  );
  work = new StudentWork(db, clock);
}, 60000);
afterAll(async () => {
  await mf.dispose();
});

describe('2.1 migration 0015 constraints and schemas (SW-01/03/05/07)', () => {
  const draft = (over: Record<string, unknown> = {}) => {
    const v = {
      user: 's1',
      qv: 'qv-ver-p1-0',
      pub: 'ver-p1',
      course: 'course-a',
      rev: 1,
      source: 'x',
      hash: 'a'.repeat(64),
      ...over,
    };
    return db
      .prepare(
        `INSERT INTO student_drafts(user_id,question_version_id,publication_id,course_id,revision,source,source_hash,updated_at) VALUES(?,?,?,?,?,?,?,?)`,
      )
      .bind(v.user, v.qv, v.pub, v.course, v.rev, v.source, v.hash, 'now')
      .run();
  };
  it('enforces the draft primary key, revision >= 0, hash length, size and foreign keys', async () => {
    await fresh();
    await draft({ rev: 0 });
    await expect(draft()).rejects.toThrow(); // duplicate (user, question) primary key
    await expect(draft({ user: 's2', rev: -1 })).rejects.toThrow();
    await expect(draft({ user: 's2', hash: 'short' })).rejects.toThrow();
    await expect(
      draft({ user: 's2', source: 'x'.repeat(32769) }),
    ).rejects.toThrow();
    await draft({ user: 's2', source: 'é'.repeat(16384) }); // exactly 32768 bytes
    await expect(
      draft({ user: 's3', source: 'é'.repeat(16385) }),
    ).rejects.toThrow();
    await expect(draft({ user: 'nobody' })).rejects.toThrow(); // FK auth_accounts
    await expect(draft({ user: 's3', qv: 'missing' })).rejects.toThrow(); // FK question
    await expect(draft({ user: 's3', pub: 'missing' })).rejects.toThrow(); // FK publication
    await expect(draft({ user: 's3', course: 'missing' })).rejects.toThrow(); // FK course
  });
  it('enforces attempt and answer uniqueness, foreign keys and immutability', async () => {
    const attempt = (over: Record<string, unknown> = {}) => {
      const v = {
        id: 'att-1',
        user: 's1',
        key: 'k1',
        fp: 'b'.repeat(64),
        pub: 'ver-p1',
        ...over,
      };
      return db
        .prepare(
          `INSERT INTO student_attempts(id,user_id,course_id,assignment_id,publication_id,submitted_at,idempotency_key,fingerprint) VALUES(?,?, 'course-a','asg-p1',?, 'now',?,?)`,
        )
        .bind(v.id, v.user, v.pub, v.key, v.fp)
        .run();
    };
    await attempt();
    await expect(attempt({ id: 'att-2' })).rejects.toThrow(); // (user, assignment, key)
    await expect(attempt({ key: 'k2' })).rejects.toThrow(); // id unique
    await expect(
      attempt({ id: 'att-3', key: 'k3', pub: 'missing' }),
    ).rejects.toThrow();
    await attempt({ id: 'att-4', user: 's2' }); // other user may reuse the key
    const answer = (id: string, qv: string, rev = 1) =>
      db
        .prepare(
          `INSERT INTO student_attempt_answers(id,attempt_id,question_version_id,rubric_version_id,draft_revision,source,source_hash) VALUES(?, 'att-1', ?, 'rv-ver-p1-0', ?, 's', ?)`,
        )
        .bind(id, qv, rev, 'c'.repeat(64))
        .run();
    await answer('ans-1', 'qv-ver-p1-0');
    await expect(answer('ans-2', 'qv-ver-p1-0')).rejects.toThrow(); // (attempt, question)
    await expect(answer('ans-3', 'qv-ver-p1-1', 0)).rejects.toThrow(); // revision >= 1
    await expect(answer('ans-4', 'missing')).rejects.toThrow();
    await expect(
      db
        .prepare(
          "UPDATE student_attempts SET submitted_at='x' WHERE id='att-1'",
        )
        .run(),
    ).rejects.toThrow();
    await expect(
      db
        .prepare(
          "UPDATE student_attempt_answers SET source='x' WHERE id='ans-1'",
        )
        .run(),
    ).rejects.toThrow();
  });
  it('adds only student tables and copies no identity, course or publication data', async () => {
    const tables = await db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'student_%' ORDER BY name",
      )
      .all<{ name: string }>();
    expect(tables.results.map((t) => t.name)).toEqual([
      'student_attempt_answers',
      'student_attempts',
      'student_drafts',
    ]);
    for (const t of tables.results) {
      const cols = await db
        .prepare(`SELECT name FROM pragma_table_info('${t.name}')`)
        .all<{ name: string }>();
      for (const c of cols.results.map((x) => x.name))
        expect(c).not.toMatch(
          /email|display|name|title|deadline|private|starter|instructions/,
        );
    }
  });
  it('rejects unknown fields and enforces size bounds in the closed schemas', () => {
    expect(() =>
      draftSaveRequestSchema.parse({
        schemaVersion: 1,
        baseRevision: 0,
        source: 'x',
        extra: 1,
      }),
    ).toThrow();
    expect(() =>
      draftSaveRequestSchema.parse({
        schemaVersion: 2,
        baseRevision: 0,
        source: 'x',
      }),
    ).toThrow();
    expect(() => saveReq(-1, 'x')).toThrow();
    expect(() => saveReq(0, 'x'.repeat(32769))).toThrow();
    expect(saveReq(0, 'x'.repeat(32768)).source).toHaveLength(32768);
    // Size is checked after LF normalisation: 32768 bytes of CRLF-folded text is accepted.
    expect(saveReq(0, 'a\r\n'.repeat(10000)).source).toBe('a\n'.repeat(10000));
    expect(() => saveReq(0, 'abcdefg\r\n'.repeat(4200))).toThrow();
    const a = {
      questionVersionId: 'q',
      draftRevision: 1,
      sourceHash: 'a'.repeat(64),
    };
    expect(() => submitReq('k', [])).toThrow();
    expect(() =>
      submitReq(
        'k',
        Array.from({ length: 21 }, (_, i) => ({
          ...a,
          questionVersionId: 'q' + i,
        })),
      ),
    ).toThrow();
    expect(() => submitReq('k', [a, a])).toThrow(); // duplicate
    expect(() => submitReq('k', [{ ...a, draftRevision: 0 }])).toThrow();
    expect(() =>
      submitReq('k', [{ ...a, source: 'forged' } as never]),
    ).toThrow();
    expect(() =>
      submitRequestSchema.parse({
        schemaVersion: 1,
        idempotencyKey: 'k',
        answers: [a],
        submittedAt: 'x',
      }),
    ).toThrow();
  });
});

describe('2.2 repository: draft read, compare-and-swap save, move (SW-01–SW-03, K4)', () => {
  it('opens at revision 0 with the starter and no row written', async () => {
    const p = await fresh();
    const before = await count('student_drafts');
    const w = workResponseSchema.parse(
      await work.work(principal('s1'), p.version),
    );
    expect(w.questions.map((q) => [q.revision, q.updatedAt])).toEqual([
      [0, null],
      [0, null],
    ]);
    expect(w.questions[0].source).toBe('def solve0():\n    return 0\n');
    expect(w.questions[0].sourceHash).toBe(
      await sourceHash(w.questions[0].source),
    );
    expect(w.latestAssignmentVersionId).toBe(p.version);
    expect(w.attemptCount).toBe(0);
    expect(await count('student_drafts')).toBe(before);
  });
  it('saves from revision 0, then 1, and returns the server hash and time', async () => {
    const p = await fresh();
    const q = p.questions[0];
    const first = await work.save(principal('s1'), q, saveReq(0, 'a = 1\n'));
    expect(first).toMatchObject({
      revision: 1,
      sourceHash: await sourceHash('a = 1\n'),
      savedAt: iso(NOW),
    });
    const second = await work.save(principal('s1'), q, saveReq(1, 'a = 2\n'));
    expect(second.revision).toBe(2);
    const w = await work.work(principal('s1'), p.version);
    expect(w.questions[0]).toMatchObject({ revision: 2, source: 'a = 2\n' });
  });
  it('rejects a stale revision with the current row and leaves it unchanged', async () => {
    const p = await fresh();
    const q = p.questions[0];
    await work.save(principal('s1'), q, saveReq(0, 'one\n'));
    await work.save(principal('s1'), q, saveReq(1, 'two\n'));
    const e = (await failure(
      work.save(principal('s1'), q, saveReq(1, 'tab B\n')),
    )) as StudentWorkError;
    expect(e).toBeInstanceOf(StudentWorkError);
    expect(e.code).toBe('CONFLICT_REVISION');
    expect(e.current).toEqual({
      revision: 2,
      source: 'two\n',
      sourceHash: await sourceHash('two\n'),
    });
    // base 0 on an existing draft, and a base ahead of the server, are conflicts too
    expect(
      (
        (await failure(
          work.save(principal('s1'), q, saveReq(0, 'x\n')),
        )) as StudentWorkError
      ).code,
    ).toBe('CONFLICT_REVISION');
    expect(
      (
        (await failure(
          work.save(principal('s1'), q, saveReq(9, 'x\n')),
        )) as StudentWorkError
      ).current?.revision,
    ).toBe(2);
    expect(
      (await work.work(principal('s1'), p.version)).questions[0].source,
    ).toBe('two\n');
  });
  it('writes nothing when the hash is unchanged at the stored revision', async () => {
    const p = await fresh();
    const q = p.questions[0];
    await work.save(principal('s1'), q, saveReq(0, 'same\n'));
    clockMs = NOW + 5000;
    const again = await work.save(principal('s1'), q, saveReq(1, 'same\n'));
    clockMs = NOW;
    expect(again).toMatchObject({ revision: 1, savedAt: iso(NOW) });
    const row = await db
      .prepare(
        'SELECT revision,updated_at FROM student_drafts WHERE user_id=? AND question_version_id=?',
      )
      .bind('s1', q)
      .first<{ revision: number; updated_at: string }>();
    expect(row).toEqual({ revision: 1, updated_at: iso(NOW) });
  });
  it('normalises CRLF to LF, keeps the final LF, and hashes the stored text', async () => {
    const p = await fresh();
    const q = p.questions[0];
    const r = await work.save(principal('s1'), q, saveReq(0, 'a\r\nb\rc\r\n'));
    const row = await db
      .prepare('SELECT source FROM student_drafts WHERE question_version_id=?')
      .bind(q)
      .first<{ source: string }>();
    expect(row!.source).toBe('a\nb\nc\n');
    expect(r.sourceHash).toBe(await sourceHash('a\nb\nc\n'));
    expect(row!.source.endsWith('\n')).toBe(true);
  });
  it('accepts exactly 32 KiB and the database refuses more', async () => {
    const p = await fresh();
    const big = 'x'.repeat(32768);
    expect(
      (await work.save(principal('s1'), p.questions[0], saveReq(0, big)))
        .revision,
    ).toBe(1);
    expect(() => saveReq(0, big + 'y')).toThrow();
  });
  it('never exposes or uses another user draft or identity', async () => {
    const p = await fresh();
    await work.save(
      principal('s1'),
      p.questions[0],
      saveReq(0, 'SECRET-OWNER-DRAFT\n'),
    );
    const theirs = await work.work(principal('s2'), p.version);
    expect(JSON.stringify(theirs)).not.toContain('SECRET-OWNER-DRAFT');
    expect(theirs.questions[0].revision).toBe(0);
  });
  it('rejects a save after membership is revoked between the read and the write', async () => {
    const p = await fresh();
    await work.work(principal('gone'), p.version);
    await db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='gone'")
      .run();
    const before = await count('student_drafts');
    expect(
      (
        (await failure(
          work.save(principal('gone'), p.questions[0], saveReq(0, 'late\n')),
        )) as { code: string }
      ).code,
    ).toBe('NOT_FOUND');
    expect(await count('student_drafts')).toBe(before);
    // an update (base > 0) is also guarded in its own statement
    await db
      .prepare("UPDATE course_memberships SET active=1 WHERE user_id='gone'")
      .run();
    await work.save(principal('gone'), p.questions[0], saveReq(0, 'ok\n'));
    await db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='gone'")
      .run();
    expect(
      (
        (await failure(
          work.save(principal('gone'), p.questions[0], saveReq(1, 'late\n')),
        )) as { code: string }
      ).code,
    ).toBe('NOT_FOUND');
    expect(
      (await db
        .prepare(
          "SELECT source FROM student_drafts WHERE user_id='gone' AND question_version_id=?",
        )
        .bind(p.questions[0])
        .first<{ source: string }>())!.source,
    ).toBe('ok\n');
    await db
      .prepare("UPDATE course_memberships SET active=1 WHERE user_id='gone'")
      .run();
  });
  it('moves a draft onto the newer version as a new revision and leaves the old draft untouched', async () => {
    const v1 = await fresh({ count: 1 });
    const v2n = 'ver-move-2';
    await publish(db, {
      course: 'course-a',
      assignment: v1.assignment,
      version: v2n,
      number: 2,
      deadline: iso(DEADLINE),
      count: 1,
    });
    // question ids match across versions ('q0'); old draft saves keep working after republish
    await work.save(principal('s1'), v1.questions[0], saveReq(0, 'old work\n'));
    await work.save(
      principal('s1'),
      v1.questions[0],
      saveReq(1, 'old work 2\n'),
    );
    const w2 = await work.work(principal('s1'), v1.version);
    expect(w2.latestAssignmentVersionId).toBe(v2n);
    const target = `qv-${v2n}-0`;
    const moved = await work.move(principal('s1'), v2n, {
      schemaVersion: 1,
      questionVersionId: v1.questions[0],
      targetQuestionVersionId: target,
      targetBaseRevision: 0,
    });
    expect(moved.revision).toBe(1);
    const newer = await work.work(principal('s1'), v2n);
    expect(newer.questions[0]).toMatchObject({
      revision: 1,
      source: 'old work 2\n',
    });
    const old = await work.work(principal('s1'), v1.version);
    expect(old.questions[0]).toMatchObject({
      revision: 2,
      source: 'old work 2\n',
    });
    // moving again needs the current target revision (compare-and-swap)
    const stale = (await failure(
      work.move(principal('s1'), v2n, {
        schemaVersion: 1,
        questionVersionId: v1.questions[0],
        targetQuestionVersionId: target,
        targetBaseRevision: 0,
      }),
    )) as StudentWorkError;
    expect(stale.code).toBe('CONFLICT_REVISION');
    await work.save(
      principal('s1'),
      v1.questions[0],
      saveReq(2, 'old work 3\n'),
    );
    const again = await work.move(principal('s1'), v2n, {
      schemaVersion: 1,
      questionVersionId: v1.questions[0],
      targetQuestionVersionId: target,
      targetBaseRevision: 1,
    });
    expect(again.revision).toBe(2);
    // old draft still on its own version; reverse and foreign moves look missing
    expect(
      (await work.work(principal('s1'), v1.version)).questions[0].revision,
    ).toBe(3);
    for (const bad of [
      { questionVersionId: target, targetQuestionVersionId: v1.questions[0] }, // not newer
      { questionVersionId: 'qv-ver-p1-0', targetQuestionVersionId: target }, // other assignment
      {
        questionVersionId: v1.questions[0],
        targetQuestionVersionId: 'missing',
      },
    ])
      expect(
        (
          (await failure(
            work.move(principal('s1'), v2n, {
              schemaVersion: 1,
              targetBaseRevision: 0,
              ...bad,
            }),
          )) as { code: string }
        ).code,
      ).toBe('NOT_FOUND');
    expect(
      (
        (await failure(
          work.move(principal('s2'), v2n, {
            schemaVersion: 1,
            questionVersionId: v1.questions[0],
            targetQuestionVersionId: target,
            targetBaseRevision: 0,
          }),
        )) as { code: string }
      ).code,
    ).toBe('NOT_FOUND');
  });
});

describe('2.3 HTTP routes (SW-01/03, AUTH-01–03)', () => {
  it('requires a session on every route and answers 401 as no-store', async () => {
    const p = await fresh();
    const q = p.questions[0];
    for (const r of [
      call(`/api/student/publications/${p.version}/work`),
      call(`/api/student/drafts/${q}`, {
        method: 'PUT',
        body: { schemaVersion: 1, baseRevision: 0, source: 'x' },
      }),
      call(`/api/student/publications/${p.version}/attempts`),
      call(`/api/student/attempts/x`),
    ]) {
      const res = await r;
      expect(res.status).toBe(401);
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
  });
  it('treats an expired session as unauthenticated or not found, never as data', async () => {
    const p = await fresh();
    await db
      .prepare(
        "INSERT INTO auth_sessions VALUES('session-expired','s1',NULL,?,?)",
      )
      .bind(NOW - 1, NOW - 10_000)
      .run();
    const res = await studentHandler(
      new Request(
        `https://app.example.test/api/student/publications/${p.version}/work`,
      ),
      {
        requireSession: async () => ({
          principal: {
            userId: 's1',
            sessionHandle: 'session-expired',
          } as never,
        }),
      },
      new StudentAssignments(db, clock),
      work,
    );
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
  it('saves with a valid origin and CSRF, and rejects forged ones before any write', async () => {
    const p = await fresh();
    const q = p.questions[0];
    const path = `/api/student/drafts/${q}`;
    const body = { schemaVersion: 1, baseRevision: 0, source: 'hello\n' };
    const before = await count('student_drafts');
    for (const forged of [
      { origin: 'https://evil.example' },
      { origin: null },
      { csrf: 'wrong' },
      { csrf: null },
    ]) {
      const res = await call(path, {
        user: 's1',
        method: 'PUT',
        body,
        ...forged,
      });
      expect([401, 403, 404]).toContain(res.status);
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
    expect(await count('student_drafts')).toBe(before);
    const ok = await call(path, { user: 's1', method: 'PUT', body });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('cache-control')).toBe('no-store');
    expect(ok.json).toMatchObject({ schemaVersion: 1, revision: 1 });
    // a port without the mutation check fails closed
    const noOrigin = await studentHandler(
      new Request('https://app.example.test' + path, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
      { requireSession: testSessions.requireSession },
      new StudentAssignments(db, clock),
      work,
    );
    expect(noOrigin.status).toBe(401);
  });
  it('returns the conflict with the current row (409) and safe error shapes', async () => {
    const p = await fresh();
    const path = `/api/student/drafts/${p.questions[0]}`;
    await call(path, {
      user: 's1',
      method: 'PUT',
      body: { schemaVersion: 1, baseRevision: 0, source: 'A\n' },
    });
    const res = await call(path, {
      user: 's1',
      method: 'PUT',
      body: { schemaVersion: 1, baseRevision: 0, source: 'B\n' },
    });
    expect(res.status).toBe(409);
    expect(res.json.error.code).toBe('CONFLICT_REVISION');
    expect(res.json.current).toMatchObject({ revision: 1, source: 'A\n' });
    expect(Object.keys(res.json.error).sort()).toEqual([
      'code',
      'message',
      'requestId',
    ]);
    const bad = await call(path, {
      user: 's1',
      method: 'PUT',
      body: { schemaVersion: 1, baseRevision: 1, source: 'x'.repeat(40000) },
    });
    expect(bad.status).toBe(400);
    expect(bad.json.error.code).toBe('INVALID_CONTRACT');
    const huge = await call(path, {
      user: 's1',
      method: 'PUT',
      body: { schemaVersion: 1, baseRevision: 1, source: 'x'.repeat(200000) },
    });
    expect(huge.status).toBe(400);
    expect(huge.text).not.toContain('xxxx');
  });
  it('answers 404 identically for other students, instructors, outsiders and missing objects', async () => {
    const p = await fresh();
    await call(`/api/student/drafts/${p.questions[0]}`, {
      user: 's1',
      method: 'PUT',
      body: { schemaVersion: 1, baseRevision: 0, source: 'MINE-ONLY\n' },
    });
    const body = { schemaVersion: 1, baseRevision: 0, source: 'x\n' };
    const reads = [
      `/api/student/publications/${p.version}/work`,
      `/api/student/publications/${p.version}/attempts`,
      '/api/student/publications/missing/work',
    ];
    const seen = new Set<string>();
    for (const user of ['inst', 'other', 'dual']) {
      for (const path of reads) {
        const res = await call(path, { user });
        expect(res.status).toBe(404);
        expect(res.text).not.toContain('MINE-ONLY');
        seen.add(
          JSON.stringify({
            ...res.json,
            error: { ...res.json.error, requestId: '' },
          }),
        );
      }
      const write = await call(`/api/student/drafts/${p.questions[0]}`, {
        user,
        method: 'PUT',
        body,
      });
      expect(write.status).toBe(404);
      seen.add(
        JSON.stringify({
          ...write.json,
          error: { ...write.json.error, requestId: '' },
        }),
      );
    }
    expect(seen.size).toBe(1);
    // s2 is a student of the course with their own revision-0 copy, never s1's text
    const s2 = await call(`/api/student/publications/${p.version}/work`, {
      user: 's2',
    });
    expect(s2.text).not.toContain('MINE-ONLY');
    expect(await count('student_drafts')).toBeGreaterThan(0);
  });
  it('rejects cross-course and foreign question identifiers without writing', async () => {
    const p = await fresh();
    const b = await fresh({ course: 'course-b' });
    const before = await count('student_drafts');
    const body = { schemaVersion: 1, baseRevision: 0, source: 'x\n' };
    expect(
      (
        await call(`/api/student/drafts/${b.questions[0]}`, {
          user: 's1',
          method: 'PUT',
          body,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call(`/api/student/drafts/not-a-question`, {
          user: 's1',
          method: 'PUT',
          body,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call(`/api/student/publications/${b.version}/work`, {
          user: 's1',
        })
      ).status,
    ).toBe(404);
    const submitBody = {
      schemaVersion: 1,
      idempotencyKey: 'k',
      answers: [
        {
          questionVersionId: b.questions[0],
          draftRevision: 1,
          sourceHash: 'a'.repeat(64),
        },
      ],
    };
    expect(
      (
        await call(`/api/student/publications/${p.version}/attempts`, {
          user: 's1',
          method: 'POST',
          body: submitBody,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(`/api/student/publications/${b.version}/attempts`, {
          user: 's1',
          method: 'POST',
          body: submitBody,
        })
      ).status,
    ).toBe(404);
    expect(await count('student_drafts')).toBe(before);
  });
  it('exposes no private reference, fingerprint or other-user data', async () => {
    const p = await fresh();
    await saveAll('s1', p);
    const res = await call(`/api/student/publications/${p.version}/work`, {
      user: 's1',
    });
    for (const marker of [PRIVATE, 'fingerprint-secret', 'privateReference'])
      expect(res.text).not.toContain(marker);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect((await call('/api/student/unknown', { user: 's1' })).status).toBe(
      404,
    );
    expect(
      (await call(`/api/student/drafts/${p.questions[0]}`, { user: 's1' }))
        .status,
    ).toBe(404); // GET not allowed
  });
});

describe('3.1 guarded atomic submit (SW-05/06, C-SUB SUB-C01/C02/C05)', () => {
  const rows = async () => [
    await count('student_attempts'),
    await count('student_attempt_answers'),
  ];
  it('creates one attempt whose answers are copied from the stored drafts', async () => {
    const p = await fresh();
    await saveAll('s3', p);
    const conf = await confirmed('s3', p.version);
    const r = await work.submit(
      principal('s3'),
      p.version,
      submitReq('k-valid', conf),
    );
    expect(r).toMatchObject({
      replayed: false,
      submittedAt: iso(NOW),
      assignmentVersionId: p.version,
    });
    const attempt = attemptSchema.parse(
      await work.attempt(principal('s3'), r.attemptId),
    );
    expect(
      attempt.answers.map((a) => [
        a.questionVersionId,
        a.draftRevision,
        a.sourceHash,
      ]),
    ).toEqual(
      conf.map((c) => [c.questionVersionId, c.draftRevision, c.sourceHash]),
    );
    expect(attempt.answers[0].source).toBe(`print('v-${p.questions[0]}')\n`);
    expect(attempt.answers[0].rubricVersionId).toBe(`rv-${p.version}-0`);
    expect(attempt.submittedByUserId).toBe('s3');
    expect((await work.work(principal('s3'), p.version)).attemptCount).toBe(1);
  });
  it('rejects a changed draft for reconciliation and leaves no rows', async () => {
    const p = await fresh();
    await saveAll('s3', p);
    const conf = await confirmed('s3', p.version);
    await work.save(
      principal('s3'),
      p.questions[1],
      saveReq(1, 'changed after confirm\n'),
    );
    const before = await rows();
    const e = (await failure(
      work.submit(principal('s3'), p.version, submitReq('k-chg', conf)),
    )) as StudentWorkError;
    expect(e.code).toBe('CONFLICT_REVISION');
    expect(await rows()).toEqual(before);
  });
  it('rejects a revision-0 (never saved) question and a wrong hash', async () => {
    const p = await fresh();
    await work.save(principal('s3'), p.questions[0], saveReq(0, 'only one\n'));
    const conf = await confirmed('s3', p.version);
    const before = await rows();
    expect(
      (
        (await failure(
          work.submit(
            principal('s3'),
            p.version,
            submitReq('k-rev0', [conf[0], { ...conf[1], draftRevision: 1 }]),
          ),
        )) as StudentWorkError
      ).code,
    ).toBe('CONFLICT_REVISION');
    await work.save(principal('s3'), p.questions[1], saveReq(0, 'two\n'));
    const full = await confirmed('s3', p.version);
    expect(
      (
        (await failure(
          work.submit(
            principal('s3'),
            p.version,
            submitReq('k-hash', [
              full[0],
              { ...full[1], sourceHash: 'f'.repeat(64) },
            ]),
          ),
        )) as StudentWorkError
      ).code,
    ).toBe('CONFLICT_REVISION');
    expect(await rows()).toEqual(before);
  });
  it('rejects a stale publication', async () => {
    const p = await fresh({ count: 1 });
    await saveAll('s3', p);
    const conf = await confirmed('s3', p.version);
    await publish(db, {
      course: 'course-a',
      assignment: p.assignment,
      version: p.version + '-2',
      number: 2,
      deadline: iso(DEADLINE),
      count: 1,
    });
    const before = await rows();
    expect(
      (
        (await failure(
          work.submit(principal('s3'), p.version, submitReq('k-stale', conf)),
        )) as StudentWorkError
      ).code,
    ).toBe('STALE_PUBLICATION');
    expect(await rows()).toEqual(before);
  });
  it('rejects missing, duplicate and foreign questions with a contract error', async () => {
    const p = await fresh({ count: 3 });
    const other = await fresh({ count: 3 });
    await saveAll('s3', p);
    const conf = await confirmed('s3', p.version);
    const before = await rows();
    const code = async (answers: typeof conf, key: string) =>
      (
        (await failure(
          work.submit(principal('s3'), p.version, submitReq(key, answers)),
        )) as { code: string }
      ).code;
    expect(await code(conf.slice(0, 2), 'k-miss')).toBe('INVALID_CONTRACT');
    expect(
      await code(
        [
          ...conf.slice(0, 2),
          { ...conf[2], questionVersionId: other.questions[2] },
        ],
        'k-foreign',
      ),
    ).toBe('INVALID_CONTRACT');
    expect(() => submitReq('k-dup', [conf[0], conf[0], conf[1]])).toThrow();
    expect(await rows()).toEqual(before);
  });
  it('uses the injected server clock: 1 ms before, exactly at and after the deadline', async () => {
    const p = await fresh();
    await saveAll('s3', p);
    const conf = await confirmed('s3', p.version);
    const before = await rows();
    try {
      for (const [at, key] of [
        [DEADLINE, 'k-at'],
        [DEADLINE + 1, 'k-after'],
      ] as const) {
        clockMs = at;
        expect(
          (
            (await failure(
              work.submit(principal('s3'), p.version, submitReq(key, conf)),
            )) as StudentWorkError
          ).code,
        ).toBe('DEADLINE_PASSED');
      }
      expect(await rows()).toEqual(before);
      clockMs = DEADLINE - 1;
      const ok = await work.submit(
        principal('s3'),
        p.version,
        submitReq('k-before', conf),
      );
      expect(ok.submittedAt).toBe(iso(DEADLINE - 1));
    } finally {
      clockMs = NOW;
    }
  });
  it('ignores a forged client time (extra field rejected, header ignored)', async () => {
    const p = await fresh();
    await saveAll('s3', p);
    const conf = await confirmed('s3', p.version);
    const path = `/api/student/publications/${p.version}/attempts`;
    const withTime = await call(path, {
      user: 's3',
      method: 'POST',
      body: {
        schemaVersion: 1,
        idempotencyKey: 'k-forge',
        answers: conf,
        submittedAt: iso(NOW - 1000),
      },
    });
    expect(withTime.status).toBe(400);
    clockMs = DEADLINE + 5;
    try {
      const late = await call(path, {
        user: 's3',
        method: 'POST',
        body: { schemaVersion: 1, idempotencyKey: 'k-forge', answers: conf },
        headers: {
          date: new Date(NOW).toUTCString(),
          'x-client-time': iso(NOW),
        },
      });
      expect(late.status).toBe(409);
      expect(late.json.error.code).toBe('DEADLINE_PASSED');
    } finally {
      clockMs = NOW;
    }
    expect((await rows())[0]).toBeGreaterThanOrEqual(0);
  });
  it('fails closed when revoked between confirmation and the batch', async () => {
    const p = await fresh();
    await saveAll('gone', p);
    const conf = await confirmed('gone', p.version);
    await db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='gone'")
      .run();
    const before = await rows();
    expect(
      (
        (await failure(
          work.submit(principal('gone'), p.version, submitReq('k-rev', conf)),
        )) as { code: string }
      ).code,
    ).toBe('NOT_FOUND');
    expect(await rows()).toEqual(before);
    await db
      .prepare("UPDATE course_memberships SET active=1 WHERE user_id='gone'")
      .run();
  });
  it('fails closed when a draft changes inside the race window (guard, not the pre-check)', async () => {
    const p = await fresh();
    await saveAll('s4', p);
    const conf = await confirmed('s4', p.version);
    // Wrap the database so the competing save lands after the replay lookup, before the batch.
    let raced = false;
    const racing = {
      prepare: (q: string) => db.prepare(q),
      batch: async (s: D1PreparedStatement[]) => {
        if (!raced) {
          raced = true;
          await new StudentWork(db, clock).save(
            principal('s4'),
            p.questions[0],
            saveReq(1, 'race\n'),
          );
        }
        return db.batch(s);
      },
    } as unknown as D1Database;
    const before = await rows();
    const e = (await failure(
      new StudentWork(racing, clock).submit(
        principal('s4'),
        p.version,
        submitReq('k-race', conf),
      ),
    )) as StudentWorkError;
    expect(e.code).toBe('CONFLICT_REVISION');
    expect(await rows()).toEqual(before);
  });
  it('fails closed when republished inside the race window', async () => {
    const p = await fresh({ count: 1 });
    await saveAll('s4', p);
    const conf = await confirmed('s4', p.version);
    let raced = false;
    const racing = {
      prepare: (q: string) => db.prepare(q),
      batch: async (s: D1PreparedStatement[]) => {
        if (!raced) {
          raced = true;
          await publish(db, {
            course: 'course-a',
            assignment: p.assignment,
            version: p.version + '-r',
            number: 2,
            deadline: iso(DEADLINE),
            count: 1,
          });
        }
        return db.batch(s);
      },
    } as unknown as D1Database;
    const before = await rows();
    const e = (await failure(
      new StudentWork(racing, clock).submit(
        principal('s4'),
        p.version,
        submitReq('k-repub', conf),
      ),
    )) as StudentWorkError;
    expect(e.code).toBe('STALE_PUBLICATION');
    expect(await rows()).toEqual(before);
  });
});

describe('3.2 idempotent replay and fingerprint (SW-07, SUB-C03/C04/C06)', () => {
  it('returns the original for the same key and payload, including after the deadline', async () => {
    const p = await fresh();
    await saveAll('s3', p);
    const conf = await confirmed('s3', p.version);
    const first = await work.submit(
      principal('s3'),
      p.version,
      submitReq('k-replay', conf),
    );
    const again = await work.submit(
      principal('s3'),
      p.version,
      submitReq('k-replay', [...conf].reverse()),
    );
    expect(again).toMatchObject({
      attemptId: first.attemptId,
      replayed: true,
      submittedAt: first.submittedAt,
    });
    clockMs = DEADLINE + 1000;
    try {
      const late = await work.submit(
        principal('s3'),
        p.version,
        submitReq('k-replay', conf),
      );
      expect(late.attemptId).toBe(first.attemptId);
      const http = await call(
        `/api/student/publications/${p.version}/attempts`,
        {
          user: 's3',
          method: 'POST',
          body: { schemaVersion: 1, idempotencyKey: 'k-replay', answers: conf },
        },
      );
      expect(http.status).toBe(200);
    } finally {
      clockMs = NOW;
    }
    expect(
      (await work.history(principal('s3'), p.version, null)).items,
    ).toHaveLength(1);
  });
  it('returns 409 for the same key with a different payload and leaves the original', async () => {
    const p = await fresh();
    await saveAll('s3', p);
    const conf = await confirmed('s3', p.version);
    const first = await work.submit(
      principal('s3'),
      p.version,
      submitReq('k-mismatch', conf),
    );
    await work.save(principal('s3'), p.questions[0], saveReq(1, 'edited\n'));
    const changed = await confirmed('s3', p.version);
    const e = (await failure(
      work.submit(principal('s3'), p.version, submitReq('k-mismatch', changed)),
    )) as StudentWorkError;
    expect(e.code).toBe('IDEMPOTENCY_MISMATCH');
    const http = await call(`/api/student/publications/${p.version}/attempts`, {
      user: 's3',
      method: 'POST',
      body: {
        schemaVersion: 1,
        idempotencyKey: 'k-mismatch',
        answers: changed,
      },
    });
    expect(http.status).toBe(409);
    expect(http.json.error.code).toBe('IDEMPOTENCY_MISMATCH');
    const original = await work.attempt(principal('s3'), first.attemptId);
    expect(original.answers[0].source).toBe(`print('v-${p.questions[0]}')\n`);
    expect(
      (await work.history(principal('s3'), p.version, null)).items,
    ).toHaveLength(1);
  });
  it('produces one attempt for concurrent same-key replays', async () => {
    const p = await fresh();
    await saveAll('s4', p);
    const conf = await confirmed('s4', p.version);
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        work.submit(principal('s4'), p.version, submitReq('k-conc', conf)),
      ),
    );
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    const ids = new Set(
      results.map(
        (r) =>
          (r as PromiseFulfilledResult<{ attemptId: string }>).value.attemptId,
      ),
    );
    expect(ids.size).toBe(1);
    expect(
      (await work.history(principal('s4'), p.version, null)).items,
    ).toHaveLength(1);
    expect(await count('student_attempt_answers')).toBeGreaterThan(0);
    const n = await db
      .prepare(
        'SELECT COUNT(*) AS n FROM student_attempt_answers WHERE attempt_id=?',
      )
      .bind([...ids][0])
      .first<{ n: number }>();
    expect(n!.n).toBe(2);
  });
  it('gives a revoked member 404 on replay with no data', async () => {
    const p = await fresh();
    await saveAll('gone', p);
    const conf = await confirmed('gone', p.version);
    await work.submit(principal('gone'), p.version, submitReq('k-gone', conf));
    await db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='gone'")
      .run();
    try {
      const e = (await failure(
        work.submit(principal('gone'), p.version, submitReq('k-gone', conf)),
      )) as { code: string };
      expect(e.code).toBe('NOT_FOUND');
      const http = await call(
        `/api/student/publications/${p.version}/attempts`,
        {
          user: 'gone',
          method: 'POST',
          body: { schemaVersion: 1, idempotencyKey: 'k-gone', answers: conf },
        },
      );
      expect(http.status).toBe(404);
      expect(http.text).not.toContain('attemptId');
    } finally {
      await db
        .prepare("UPDATE course_memberships SET active=1 WHERE user_id='gone'")
        .run();
    }
  });
  it('allows unlimited distinct keys and keeps earlier attempts', async () => {
    const p = await fresh();
    await saveAll('s3', p);
    const conf = await confirmed('s3', p.version);
    const ids: string[] = [];
    for (let i = 0; i < 4; i++)
      ids.push(
        (
          await work.submit(
            principal('s3'),
            p.version,
            submitReq('k-many-' + i, conf),
          )
        ).attemptId,
      );
    expect(new Set(ids).size).toBe(4);
    const history = await work.history(principal('s3'), p.version, null);
    expect(history.items.map((i) => i.attemptId)).toEqual([...ids].reverse());
    for (const id of ids)
      expect((await work.attempt(principal('s3'), id)).answers).toHaveLength(2);
  });
});

describe('3.3 history and attempt reads (SW-08, SUB-04)', () => {
  it('is own-only and uniformly 404 for others', async () => {
    const p = await fresh();
    await saveAll('s3', p);
    const r = await work.submit(
      principal('s3'),
      p.version,
      submitReq('k-own', await confirmed('s3', p.version)),
    );
    for (const user of ['s1', 'inst', 'other', 'dual']) {
      expect(
        (await call(`/api/student/attempts/${r.attemptId}`, { user })).status,
      ).toBe(404);
    }
    const hist = await call(`/api/student/publications/${p.version}/attempts`, {
      user: 's1',
    });
    expect(hist.status).toBe(200);
    expect(hist.json.items).toEqual([]); // honest empty state for a member with no attempts
    expect(
      (
        await call(`/api/student/publications/${p.version}/attempts`, {
          user: 'inst',
        })
      ).status,
    ).toBe(404);
    const own = await call(`/api/student/attempts/${r.attemptId}`, {
      user: 's3',
    });
    expect(own.status).toBe(200);
    expect(own.headers.get('cache-control')).toBe('no-store');
    expect(
      (await call(`/api/student/attempts/unknown`, { user: 's3' })).status,
    ).toBe(404);
  });
  it('pages newest first in pages of 50 with a closed projection', async () => {
    const p = await fresh({ count: 1 });
    await saveAll('s2', p);
    const conf = await confirmed('s2', p.version);
    const ids: string[] = [];
    for (let i = 0; i < 51; i++)
      ids.push(
        (
          await work.submit(
            principal('s2'),
            p.version,
            submitReq('k-page-' + i, conf),
          )
        ).attemptId,
      );
    const first = await call(
      `/api/student/publications/${p.version}/attempts`,
      { user: 's2' },
    );
    const page1 = attemptHistorySchema.parse(first.json);
    expect(page1.items).toHaveLength(50);
    expect(page1.items[0].attemptId).toBe(ids[50]);
    expect(page1.nextCursor).not.toBeNull();
    for (const marker of [
      PRIVATE,
      'fingerprint',
      'idempotency',
      'source',
      'user',
    ])
      expect(first.text.toLowerCase()).not.toContain(marker.toLowerCase());
    const second = await call(
      `/api/student/publications/${p.version}/attempts?cursor=${page1.nextCursor}`,
      { user: 's2' },
    );
    const page2 = attemptHistorySchema.parse(second.json);
    expect(page2.items.map((i) => i.attemptId)).toEqual([ids[0]]);
    expect(page2.nextCursor).toBeNull();
    expect(
      (
        await call(
          `/api/student/publications/${p.version}/attempts?cursor=abc`,
          { user: 's2' },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await call(`/api/student/publications/${p.version}/attempts?x=1`, {
          user: 's2',
        })
      ).status,
    ).toBe(400);
  });
  it('returns the original source after later draft edits and exposes no private data', async () => {
    const p = await fresh();
    await saveAll('s3', p);
    const r = await work.submit(
      principal('s3'),
      p.version,
      submitReq('k-orig', await confirmed('s3', p.version)),
    );
    await work.save(
      principal('s3'),
      p.questions[0],
      saveReq(1, 'edited later\n'),
    );
    const res = await call(`/api/student/attempts/${r.attemptId}`, {
      user: 's3',
    });
    const attempt = attemptSchema.parse(res.json);
    expect(attempt.answers[0].source).toBe(`print('v-${p.questions[0]}')\n`);
    expect(res.text).not.toContain('edited later');
    for (const marker of [PRIVATE, 'fingerprint-secret'])
      expect(res.text).not.toContain(marker);
    expect(
      (await work.work(principal('s3'), p.version)).questions[0].source,
    ).toBe('edited later\n');
  });
});

describe('repair round: move, body bound, rubric coverage, receipt time', () => {
  it('accepts a 32 KiB control-character source whose JSON body is 6x larger', async () => {
    const p = await fresh({ count: 1 });
    const source = '\u0001'.repeat(32768);
    const raw = JSON.stringify({ schemaVersion: 1, baseRevision: 0, source });
    expect(raw.length).toBeGreaterThan(196608);
    const res = await call(`/api/student/drafts/${p.questions[0]}`, {
      user: 's1',
      method: 'PUT',
      body: { schemaVersion: 1, baseRevision: 0, source },
    });
    expect(res.status).toBe(200);
    expect(
      (
        await call(`/api/student/drafts/${p.questions[0]}`, {
          user: 's1',
          method: 'PUT',
          body: {
            schemaVersion: 1,
            baseRevision: 1,
            source: '\u0001'.repeat(32769),
          },
        })
      ).status,
    ).toBe(400);
  });
  it('rejects a move after revocation and maps other database failures to unavailable', async () => {
    const v1 = await fresh({ count: 1 });
    const v2 = v1.version + '-m';
    await publish(db, {
      course: 'course-a',
      assignment: v1.assignment,
      version: v2,
      number: 2,
      deadline: iso(DEADLINE),
      count: 1,
    });
    await work.save(principal('gone'), v1.questions[0], saveReq(0, 'mine\n'));
    const req = {
      schemaVersion: 1 as const,
      questionVersionId: v1.questions[0],
      targetQuestionVersionId: `qv-${v2}-0`,
      targetBaseRevision: 0,
    };
    const before = await count('student_drafts');
    await db
      .prepare("UPDATE course_memberships SET active=0 WHERE user_id='gone'")
      .run();
    try {
      expect(
        (
          (await failure(work.move(principal('gone'), v2, req))) as {
            code: string;
          }
        ).code,
      ).toBe('NOT_FOUND');
      expect(await count('student_drafts')).toBe(before);
    } finally {
      await db
        .prepare("UPDATE course_memberships SET active=1 WHERE user_id='gone'")
        .run();
    }
    const broken = {
      prepare: (q: string) => db.prepare(q),
      batch: async () => {
        throw new Error('D1_ERROR: disk i/o');
      },
    } as unknown as D1Database;
    expect(
      (
        (await failure(
          new StudentWork(broken, clock).move(principal('gone'), v2, req),
        )) as { code: string }
      ).code,
    ).toBe('UPSTREAM_UNAVAILABLE');
  });
  it('keeps the receipt time when the clock passes the deadline inside the race window', async () => {
    const p = await fresh();
    await saveAll('s4', p);
    const conf = await confirmed('s4', p.version);
    let moved = false;
    const racing = {
      prepare: (q: string) => db.prepare(q),
      batch: async (s: D1PreparedStatement[]) => {
        if (!moved) {
          moved = true;
          clockMs = DEADLINE + 10;
        }
        return db.batch(s);
      },
    } as unknown as D1Database;
    try {
      const r = await new StudentWork(racing, clock).submit(
        principal('s4'),
        p.version,
        submitReq('k-window', conf),
      );
      // The clock is read once at entry: the request was received before the deadline.
      expect(r.submittedAt).toBe(iso(NOW));
    } finally {
      clockMs = NOW;
    }
    // A request that arrives after the deadline is still rejected with no rows.
    clockMs = DEADLINE + 10;
    try {
      const before = [
        await count('student_attempts'),
        await count('student_attempt_answers'),
      ];
      expect(
        (
          (await failure(
            work.submit(
              principal('s4'),
              p.version,
              submitReq('k-window-2', conf),
            ),
          )) as StudentWorkError
        ).code,
      ).toBe('DEADLINE_PASSED');
      expect([
        await count('student_attempts'),
        await count('student_attempt_answers'),
      ]).toEqual(before);
    } finally {
      clockMs = NOW;
    }
  });
  it('aborts the batch when a question has no rubric instead of committing fewer answers', async () => {
    const p = await fresh({ skipRubricFor: 1 });
    await saveAll('s3', p);
    const conf = await confirmed('s3', p.version);
    const before = [
      await count('student_attempts'),
      await count('student_attempt_answers'),
    ];
    const e = (await failure(
      work.submit(principal('s3'), p.version, submitReq('k-norub', conf)),
    )) as { code: string };
    expect(e.code).toBe('UPSTREAM_UNAVAILABLE');
    expect([
      await count('student_attempts'),
      await count('student_attempt_answers'),
    ]).toEqual(before);
  });
  it('answers a move with a stale base onto a target without a draft with the starter at revision 0', async () => {
    const v1 = await fresh({ count: 1 });
    const v2 = v1.version + '-n';
    await publish(db, {
      course: 'course-a',
      assignment: v1.assignment,
      version: v2,
      number: 2,
      deadline: iso(DEADLINE),
      count: 1,
    });
    await work.save(principal('s2'), v1.questions[0], saveReq(0, 'mine\n'));
    const before = await count('student_drafts');
    const e = (await failure(
      work.move(principal('s2'), v2, {
        schemaVersion: 1,
        questionVersionId: v1.questions[0],
        targetQuestionVersionId: `qv-${v2}-0`,
        targetBaseRevision: 1,
      }),
    )) as StudentWorkError;
    expect(e.code).toBe('CONFLICT_REVISION');
    expect(e.current).toEqual({
      revision: 0,
      source: 'def solve0():\n    return 0\n',
      sourceHash: await sourceHash('def solve0():\n    return 0\n'),
    });
    expect(await count('student_drafts')).toBe(before);
  });
});
