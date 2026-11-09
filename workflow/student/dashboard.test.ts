import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { StudentAssignments } from '../../src/server/student/repository';
import { studentHandler } from '../../src/server/student/http';
import { createApplication } from '../../src/server/index';
import { BoundaryError } from '../../src/shared/instructor-contracts/schema';
import { publicationSchema } from '../../src/shared/instructor-contracts/publication';
import {
  encodeCursor,
  studentAssignmentPageSchema,
} from '../../src/shared/student-assignments';
import type { TrustedPrincipal } from '../../src/server/instructor/ports/contracts';

/** SD-01–04, AUTH-01–03, SUB-01: synthetic fixtures only; no real learners or code. */
let mf: Miniflare;
let db: D1Database;
let reads: StudentAssignments;
const PRIVATE = 'PRIVATE-REFERENCE-MARKER';
const DRAFT = 'DRAFT-ONLY-MARKER';
const principal = (user: string): TrustedPrincipal =>
  ({ userId: user, sessionHandle: 'session-' + user }) as TrustedPrincipal;
const sessions = {
  async requireSession(request: Request) {
    const user = request.headers.get('x-test-user');
    if (!user) throw new BoundaryError('UNAUTHENTICATED');
    return { principal: principal(user) };
  },
};
const call = (path: string, user?: string, method = 'GET') =>
  studentHandler(
    new Request('https://app.example.test' + path, {
      method,
      headers: user ? { 'x-test-user': user } : {},
    }),
    sessions,
    reads,
  );
const iso = (day: number) =>
  new Date(Date.UTC(2026, 10, 1 + day, 12)).toISOString();

async function publish(
  course: string,
  assignment: string,
  version: string,
  number: number,
  deadline: string,
  title = 'Synthetic ' + assignment,
  publishedAt = iso(-10 + number),
) {
  await db.batch([
    db
      .prepare(
        `INSERT INTO instructor_assignment_drafts(id,course_id,revision,payload,created_by,create_key,created_at,updated_at)
         VALUES(?,?,?,?, 'instructor-a', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, payload=excluded.payload`,
      )
      .bind(
        assignment,
        course,
        number,
        JSON.stringify({ title: DRAFT, deadlineAt: null, questions: [] }),
        'key-' + assignment,
        iso(-20),
        iso(-20),
      ),
    db
      .prepare(
        `INSERT INTO instructor_assignment_publications(id,assignment_id,course_id,publication_number,source_revision,published_by,published_at,request_key,fingerprint,title,deadline_at)
         VALUES(?,?,?,?,?,'instructor-a',?,?,'fingerprint-secret',?,?)`,
      )
      .bind(
        version,
        assignment,
        course,
        number,
        number,
        publishedAt,
        'req-' + version,
        title,
        deadline,
      ),
    db
      .prepare(
        `INSERT INTO instructor_question_versions(id,question_id,publication_id,position,title,instructions,language,starter_code,private_reference)
         VALUES(?, 'q1', ?, 0, 'Question one', ?, 'python', ?, ?)`,
      )
      .bind(
        'qv-' + version,
        version,
        'Use **loops** for version ' + version,
        'def solve():\n    return ' + number + '\n',
        PRIVATE,
      ),
    db
      .prepare(
        "INSERT INTO instructor_rubric_versions(id,rubric_id,question_version_id) VALUES(?, 'r1', ?)",
      )
      .bind('rv-' + version, 'qv-' + version),
    db
      .prepare(
        "INSERT INTO instructor_criterion_versions(rubric_version_id,criterion_id,position,comparison_key,descriptor,minimum_units,maximum_units) VALUES(?, 'c1', 0, 'k1', 'Correct output', 0, 500)",
      )
      .bind('rv-' + version),
  ]);
}

beforeAll(async () => {
  mf = new Miniflare({
    ...convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response()}}',
      compatibilityDate: '2026-11-04',
      d1Databases: { DB: 'student-dashboard-test' },
    }),
  });
  db = (await mf.getD1Database('DB')) as unknown as D1Database;
  await db.batch([
    db.prepare(
      'CREATE TABLE auth_accounts(id TEXT PRIMARY KEY, active INTEGER NOT NULL)',
    ),
    db.prepare(
      'CREATE TABLE auth_sessions(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, revoked_at INTEGER, expires_at INTEGER, last_seen INTEGER)',
    ),
  ]);
  for (const migration of [
    '0002_instructor_assignments.sql',
    '0007_courses.sql',
  ]) {
    const sql = await readFile('src/server/db/migrations/' + migration, 'utf8');
    await db.batch(
      sql
        .split(/^-- statement\s*$/m)
        .map((s) => s.trim())
        .filter((s) => s.replace(/^--.*$/gm, '').trim())
        .map((s) => db.prepare(s)),
    );
  }
  const now = Date.now();
  const users = ['student', 'instructor', 'dual', 'other', 'revoked'];
  await db.batch([
    ...users.flatMap((u) => [
      db.prepare('INSERT INTO auth_accounts VALUES (?,1)').bind(u),
      db
        .prepare('INSERT INTO auth_sessions VALUES (?,?,NULL,?,?)')
        .bind('session-' + u, u, now + 3_600_000, now),
    ]),
    ...[
      ['course-a', 'Synthetic course A'],
      ['course-b', 'Synthetic course B'],
      ['course-empty', 'Synthetic empty course'],
      ['course-big', 'Synthetic large course'],
    ].map(([id, name]) =>
      db.prepare('INSERT INTO courses(id,name) VALUES (?,?)').bind(id, name),
    ),
    ...[
      ['course-a', 'student', 'student'],
      ['course-empty', 'student', 'student'],
      ['course-big', 'student', 'student'],
      ['course-a', 'instructor', 'instructor'],
      ['course-a', 'dual', 'instructor'],
      ['course-b', 'dual', 'student'],
      ['course-b', 'other', 'student'],
      ['course-a', 'revoked', 'student'],
    ].map(([c, u, r]) =>
      db
        .prepare(
          'INSERT INTO course_memberships(course_id,user_id,role) VALUES (?,?,?)',
        )
        .bind(c, u, r),
    ),
  ]);
  // course-a: alpha V1/V2 (latest V2), beta past deadline, gamma/delta equal deadline, draft-only.
  await publish('course-a', 'alpha', 'alpha-v1', 1, iso(5), 'Alpha first');
  await publish('course-a', 'alpha', 'alpha-v2', 2, iso(7), 'Alpha second');
  await publish('course-a', 'beta', 'beta-v1', 1, iso(-3));
  await publish('course-a', 'delta', 'delta-v1', 1, iso(9));
  await publish('course-a', 'gamma', 'gamma-v1', 1, iso(9));
  await db
    .prepare(
      `INSERT INTO instructor_assignment_drafts(id,course_id,revision,payload,created_by,create_key,created_at,updated_at)
       VALUES('unpublished','course-a',1,?,'instructor-a','key-unpublished',?,?)`,
    )
    .bind(JSON.stringify({ title: DRAFT }), iso(-1), iso(-1))
    .run();
  await publish('course-b', 'bravo', 'bravo-v1', 1, iso(4));
  for (let i = 0; i < 51; i++)
    await publish(
      'course-big',
      'big-' + String(i).padStart(2, '0'),
      'big-v-' + i,
      1,
      iso(1 + (i % 7)),
    );
  reads = new StudentAssignments(db);
}, 60000);
afterAll(async () => {
  await mf.dispose();
});

describe('student assignment listing', () => {
  it('lists latest publications in deadline order, keeping past deadlines and excluding drafts', async () => {
    const response = await call(
      '/api/student/courses/course-a/assignments',
      'student',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const text = await response.text();
    const page = studentAssignmentPageSchema.parse(JSON.parse(text));
    expect(page.course).toEqual({ id: 'course-a', name: 'Synthetic course A' });
    expect(page.items.map((i) => i.assignmentVersionId)).toEqual([
      'beta-v1',
      'alpha-v2',
      'delta-v1',
      'gamma-v1',
    ]);
    expect(page.items[1]).toEqual({
      assignmentId: 'alpha',
      assignmentVersionId: 'alpha-v2',
      title: 'Alpha second',
      publishedAt: iso(-8),
      deadlineAt: iso(7),
    });
    expect(page.nextCursor).toBeNull();
    for (const marker of [DRAFT, PRIVATE, 'fingerprint-secret', 'unpublished'])
      expect(text).not.toContain(marker);
  });

  it('pages 51 rows as 50 + 1 with a deterministic cursor over unchanged data', async () => {
    const first = await reads.list(principal('student'), 'course-big', null);
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).not.toBeNull();
    const second = await reads.list(
      principal('student'),
      'course-big',
      first.nextCursor,
    );
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    const all = [...first.items, ...second.items].map((i) => i.assignmentId);
    expect(new Set(all).size).toBe(51);
    const keys = [...first.items, ...second.items].map(
      (i) => i.deadlineAt + '|' + i.assignmentId,
    );
    expect(keys).toEqual([...keys].sort());
    const again = await reads.list(principal('student'), 'course-big', null);
    expect(again).toEqual(first);
    expect(first.nextCursor!.length).toBeLessThanOrEqual(512);
  });

  it('returns the course envelope for an empty authorized course', async () => {
    const page = await reads.list(principal('student'), 'course-empty', null);
    expect(page).toEqual({
      schemaVersion: 1,
      course: { id: 'course-empty', name: 'Synthetic empty course' },
      items: [],
      nextCursor: null,
    });
  });

  it('denies instructor-only, cross-course and missing courses identically', async () => {
    const bodies: string[] = [];
    for (const [user, course] of [
      ['instructor', 'course-a'],
      ['dual', 'course-a'],
      ['other', 'course-a'],
      ['student', 'course-b'],
      ['student', 'course-missing'],
    ]) {
      const response = await call(
        `/api/student/courses/${course}/assignments`,
        user,
      );
      expect(response.status, user + ':' + course).toBe(404);
      const body = await response.json<{ error: Record<string, unknown> }>();
      expect(body.error.code).toBe('NOT_FOUND');
      bodies.push(JSON.stringify({ ...body.error, requestId: '' }));
    }
    expect(new Set(bodies).size).toBe(1);
    // A dual-role account sees only its Student course.
    expect(
      (await call('/api/student/courses/course-b/assignments', 'dual')).status,
    ).toBe(200);
  });

  it('rejects malformed, non-canonical, duplicate and unknown query input', async () => {
    const valid = encodeCursor(iso(5), 'alpha');
    for (const query of [
      '?cursor=***',
      '?cursor=' + 'A'.repeat(513),
      '?cursor=' + btoa('["not-a-time","alpha"]').replace(/=+$/, ''),
      '?cursor=' + valid + 'A',
      '?cursor=' + valid + '&cursor=' + valid,
      '?page=2',
      '?cursor=',
    ]) {
      const response = await call(
        '/api/student/courses/course-a/assignments' + query,
        'student',
      );
      expect(response.status, query).toBe(400);
    }
    const ok = await call(
      '/api/student/courses/course-a/assignments?cursor=' + valid,
      'student',
    );
    expect(ok.status).toBe(200);
    const page = studentAssignmentPageSchema.parse(await ok.json());
    expect(page.items.map((i) => i.assignmentId)).toEqual([
      'alpha',
      'delta',
      'gamma',
    ]);
  });

  it('requires a session and rejects writes', async () => {
    expect(
      (await call('/api/student/courses/course-a/assignments')).status,
    ).toBe(401);
    expect(
      (
        await call(
          '/api/student/courses/course-a/assignments',
          'student',
          'POST',
        )
      ).status,
    ).toBe(404);
  });

  it('rechecks membership, account and session at disclosure', async () => {
    const path = '/api/student/courses/course-a/assignments';
    expect((await call(path, 'revoked')).status).toBe(200);
    // Each change models revocation after the route-level session pre-check.
    for (const [revoke, restore] of [
      [
        "UPDATE course_memberships SET active=0 WHERE user_id='revoked'",
        "UPDATE course_memberships SET active=1 WHERE user_id='revoked'",
      ],
      [
        "UPDATE auth_accounts SET active=0 WHERE id='revoked'",
        "UPDATE auth_accounts SET active=1 WHERE id='revoked'",
      ],
      [
        "UPDATE auth_sessions SET revoked_at=1 WHERE user_id='revoked'",
        "UPDATE auth_sessions SET revoked_at=NULL WHERE user_id='revoked'",
      ],
      [
        "UPDATE courses SET active=0 WHERE id='course-a'",
        "UPDATE courses SET active=1 WHERE id='course-a'",
      ],
    ]) {
      await db.prepare(revoke).run();
      expect((await call(path, 'revoked')).status, revoke).toBe(404);
      expect(
        (await call('/api/student/publications/alpha-v1', 'revoked')).status,
      ).toBe(404);
      await db.prepare(restore).run();
    }
    expect((await call(path, 'revoked')).status).toBe(200);
  });
});

describe('student exact-version overview', () => {
  it('returns the requested version after a newer publication, without private fields', async () => {
    const response = await call(
      '/api/student/publications/alpha-v1',
      'student',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const text = await response.text();
    const publication = publicationSchema.parse(JSON.parse(text));
    expect(publication.assignmentVersionId).toBe('alpha-v1');
    expect(publication.title).toBe('Alpha first');
    expect(publication.questions[0].starterCode).toContain('return 1');
    expect(publication.questions[0].criteria[0]).toMatchObject({
      minimumScore: 0,
      maximumScore: 5,
    });
    for (const marker of [PRIVATE, DRAFT, 'fingerprint-secret'])
      expect(text).not.toContain(marker);
    const latest = publicationSchema.parse(
      await (
        await call('/api/student/publications/alpha-v2', 'student')
      ).json(),
    );
    expect(latest.questions[0].starterCode).toContain('return 2');
  });

  it('denies missing, instructor-only and cross-course versions without substitution', async () => {
    for (const [user, version] of [
      ['student', 'alpha-v9'],
      ['instructor', 'alpha-v1'],
      ['dual', 'alpha-v1'],
      ['student', 'bravo-v1'],
      ['student', 'alpha'],
    ]) {
      const response = await call('/api/student/publications/' + version, user);
      expect(response.status, user + ':' + version).toBe(404);
    }
    expect(
      (await call('/api/student/publications/bravo-v1', 'dual')).status,
    ).toBe(200);
    expect(
      (await call('/api/student/publications/alpha-v1?x=1', 'student')).status,
    ).toBe(400);
  });

  it('keeps the maximum authorized overview payload bounded', async () => {
    const response = await call(
      '/api/student/publications/alpha-v1',
      'student',
    );
    expect((await response.text()).length).toBeLessThan(4096);
  });
});

describe('maximum authorized overview payload', () => {
  async function seed(
    version: string,
    instructions: string,
    starter: string,
    descriptor: string,
    criteria: number,
  ) {
    await db.batch([
      db
        .prepare(
          `INSERT INTO instructor_assignment_drafts(id,course_id,revision,payload,created_by,create_key,created_at,updated_at)
           VALUES(?,'course-a',1,'{}','instructor-a',?,?,?)`,
        )
        .bind('a-' + version, 'k-' + version, iso(-20), iso(-20)),
      db
        .prepare(
          `INSERT INTO instructor_assignment_publications(id,assignment_id,course_id,publication_number,source_revision,published_by,published_at,request_key,fingerprint,title,deadline_at)
           VALUES(?,?,'course-a',1,1,'instructor-a',?,?,'fp',?,?)`,
        )
        .bind(
          version,
          'a-' + version,
          iso(-5),
          'r-' + version,
          'T'.repeat(200),
          iso(10),
        ),
    ]);
    for (let q = 0; q < 20; q++)
      await db.batch([
        db
          .prepare(
            `INSERT INTO instructor_question_versions(id,question_id,publication_id,position,title,instructions,language,starter_code,private_reference)
             VALUES(?,?,?,?,?,?,'python',?,?)`,
          )
          .bind(
            version + '-q' + q,
            'q' + q,
            version,
            q,
            'Q'.repeat(200),
            instructions,
            starter,
            PRIVATE,
          ),
        db
          .prepare(
            'INSERT INTO instructor_rubric_versions(id,rubric_id,question_version_id) VALUES(?,?,?)',
          )
          .bind(version + '-r' + q, 'r' + q, version + '-q' + q),
        ...Array.from({ length: criteria }, (_, c) =>
          db
            .prepare(
              'INSERT INTO instructor_criterion_versions(rubric_version_id,criterion_id,position,comparison_key,descriptor,minimum_units,maximum_units) VALUES(?,?,?,?,?,0,100)',
            )
            .bind(version + '-r' + q, 'c' + c, c, 'k' + c, descriptor),
        ),
      ]);
  }

  it('serves the largest publication C-PUB accepts and records the size', async () => {
    const version = 'max-v1';
    const starter = 'x = 1\n'.repeat(5000);
    const shape = (instructions: number) => ({
      schemaVersion: 1,
      assignmentId: 'a-' + version,
      assignmentVersionId: version,
      courseId: 'course-a',
      title: 'T'.repeat(200),
      publishedAt: iso(-5),
      deadlineAt: iso(10),
      questions: Array.from({ length: 20 }, (_, q) => ({
        questionId: 'q' + q,
        questionVersionId: version + '-q' + q,
        title: 'Q'.repeat(200),
        instructions: 'I'.repeat(instructions),
        language: 'python',
        starterCode: starter,
        rubricId: 'r' + q,
        rubricVersionId: version + '-r' + q,
        criteria: Array.from({ length: 30 }, (_, c) => ({
          criterionId: 'c' + c,
          comparisonKey: 'k' + c,
          descriptor: 'D'.repeat(100),
          minimumScore: 0,
          maximumScore: 1,
        })),
      })),
    });
    // C-PUB caps total string and key content at 1 MiB; find the largest accepted size.
    let low = 0,
      high = 16384;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (publicationSchema.safeParse(shape(mid)).success) low = mid;
      else high = mid - 1;
    }
    expect(publicationSchema.safeParse(shape(low + 1)).success).toBe(false);
    await seed(version, 'I'.repeat(low), starter, 'D'.repeat(100), 30);
    const started = performance.now();
    const response = await call(
      '/api/student/publications/' + version,
      'student',
    );
    const body = await response.text();
    const elapsed = performance.now() - started;
    expect(response.status).toBe(200);
    const publication = publicationSchema.parse(JSON.parse(body));
    expect(publication.questions).toHaveLength(20);
    expect(publication.questions.map((q) => q.questionVersionId)).toEqual(
      Array.from({ length: 20 }, (_, q) => version + '-q' + q),
    );
    expect(publication.questions[19].criteria).toHaveLength(30);
    expect(body).not.toContain(PRIVATE);
    const bytes = new TextEncoder().encode(body).length;
    // Recorded in implementation evidence; bound is C-PUB-derived (~5.0 MB).
    console.info(
      JSON.stringify({
        maxOverviewBytes: bytes,
        elapsedMs: Math.round(elapsed),
      }),
    );
    expect(bytes).toBeLessThan(5_500_000);
  }, 60000);

  it('pins question and rubric version IDs to the requested publication', async () => {
    const v1 = publicationSchema.parse(
      await (
        await call('/api/student/publications/alpha-v1', 'student')
      ).json(),
    );
    const v2 = publicationSchema.parse(
      await (
        await call('/api/student/publications/alpha-v2', 'student')
      ).json(),
    );
    expect(v1.questions[0]).toMatchObject({
      questionVersionId: 'qv-alpha-v1',
      rubricVersionId: 'rv-alpha-v1',
    });
    expect(v2.questions[0]).toMatchObject({
      questionVersionId: 'qv-alpha-v2',
      rubricVersionId: 'rv-alpha-v2',
    });
  });
});

describe('application wiring', () => {
  it('routes /api/student/ through the authenticated boundary', async () => {
    const app = createApplication();
    const response = await app.fetch(
      new Request('https://app.example.test/api/student/publications/alpha-v1'),
      { DB: db, APP_ENV: 'test', APP_VERSION: 'test' } as never,
    );
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toContain('Alpha');
  });
});
