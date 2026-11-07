import { beforeAll, afterAll, it, expect } from 'vitest';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authDatabase } from '../auth/database';
import { SyntheticFirebase } from '../auth/synthetic-firebase';
import { ManagedStore } from '../../src/server/auth/managed-store';
import { ManagedAuthRoutes } from '../../src/server/auth/managed-routes';
import { OwnerBootstrap } from '../../src/server/auth/owner';
import {
  cookieName,
  csrfToken,
  hash,
  randomToken,
} from '../../src/server/auth/primitives';
import { CourseCreation } from '../../src/server/courses/creation';
import { CourseAuthority } from '../../src/server/courses/authority';
import { courseHandler } from '../../src/server/courses/http';
import type { TrustedPrincipal } from '../../src/server/instructor/ports/contracts';

const config = {
  origin: 'https://app.example.test',
  secure: true,
  clientId: '',
  clientSecret: '',
};
const provider = new SyntheticFirebase();
let database: Awaited<ReturnType<typeof authDatabase>>,
  db: D1Database,
  store: ManagedStore,
  creation: CourseCreation,
  authority: CourseAuthority,
  auth: ManagedAuthRoutes;
let owner: Actor, before: unknown, persistence: string;
type Actor = { token: string; uid: string; p: TrustedPrincipal };
async function migrate(name: string) {
  const sql = await readFile('src/server/db/migrations/' + name, 'utf8');
  await db.batch(
    sql
      .split(/^-- statement\s*$/m)
      .map((s) => s.trim())
      .filter((s) => s.replace(/^--.*$/gm, '').trim())
      .map((s) => db.prepare(s)),
  );
}
function wire() {
  db = database.db;
  store = new ManagedStore(db);
  creation = new CourseCreation(db);
  authority = new CourseAuthority(db);
  auth = new ManagedAuthRoutes(store, config, provider, undefined, authority);
}
async function actor(role?: 'student' | 'instructor'): Promise<Actor> {
  const uid = crypto.randomUUID(),
    email = uid + '@u.nus.edu',
    invite = randomToken();
  await provider.provision(uid, email);
  await provider.verifyEmail(uid);
  await db
    .prepare(
      'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(?,?,?,?,?)',
    )
    .bind(
      crypto.randomUUID(),
      await hash(invite),
      email,
      Date.now(),
      Date.now() + 86400000,
    )
    .run();
  const token = await store.loginManaged(
    randomToken(),
    await provider.current(uid),
    provider.issuer,
    '/workspace',
    invite,
  );
  const s = await store.session(token);
  if (role) {
    const course = crypto.randomUUID();
    await db.batch([
      db
        .prepare('INSERT INTO courses(id,name) VALUES(?,?)')
        .bind(course, 'Existing course'),
      db
        .prepare(
          'INSERT INTO course_memberships(course_id,user_id,role) VALUES(?,?,?)',
        )
        .bind(course, s.user_id, role),
    ]);
  }
  return {
    token,
    uid,
    p: { userId: s.user_id, sessionHandle: s.id } as TrustedPrincipal,
  };
}
const command = (name = 'Programming studio') => ({
  name,
  requestKey: crypto.randomUUID(),
});
async function call(
  who: Actor,
  input?: unknown,
  path = '',
  headers: Record<string, string> = {},
) {
  return courseHandler(
    new Request(config.origin + '/api/courses' + path, {
      method: input === undefined ? 'GET' : 'POST',
      headers: {
        cookie: cookieName(config, 'session') + '=' + who.token,
        'x-csrf-token': await csrfToken(who.token),
        ...(input === undefined
          ? {}
          : { origin: config.origin, 'content-type': 'application/json' }),
        ...headers,
      },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    }),
    auth,
    store,
    authority,
    creation,
  );
}
const counts = async () =>
  Promise.all(
    ['courses', 'course_memberships', 'course_creation_receipts'].map(
      async (table) =>
        (await db
          .prepare(`SELECT COUNT(*) AS n FROM ${table}`)
          .first<{ n: number }>())!.n,
    ),
  );
function batchBarrier(change: () => Promise<unknown>) {
  let reached = false;
  const wrapped = new Proxy(db, {
    get(target, property) {
      if (property === 'batch')
        return async (statements: D1PreparedStatement[]) => {
          reached = true;
          await change();
          return target.batch(statements);
        };
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return { db: wrapped, reached: () => reached };
}

beforeAll(async () => {
  persistence = await mkdtemp(join(tmpdir(), 'codewise-course-test-'));
  database = await authDatabase(persistence);
  wire();
  for (const migration of [
    '0001_platform_metadata.sql',
    '0002_instructor_assignments.sql',
    '0007_courses.sql',
    '0008_instructor_assessments.sql',
  ])
    await migrate(migration);
  const bootstrap = new OwnerBootstrap(store, provider, {
    email: 'synthetic-owner@u.nus.edu',
    password: 'testpass',
  });
  await bootstrap.ensure(
    'synthetic-owner@u.nus.edu',
    'testpass',
    randomToken(),
  );
  const row = (await db.prepare('SELECT * FROM auth_owner_bootstrap').first())!;
  const uid = row.subject as string,
    token = await store.loginManaged(
      randomToken(),
      await provider.current(uid),
      provider.issuer,
      '/workspace',
      null,
    );
  const session = await store.session(token);
  owner = {
    token,
    uid,
    p: {
      userId: session.user_id,
      sessionHandle: session.id,
    } as TrustedPrincipal,
  };
  await actor('student');
  before = await snapshot();
  await migrate('0009_course_creation.sql');
}, 30000);
afterAll(async () => {
  await database?.close();
});
async function snapshot() {
  return Promise.all(
    [
      'auth_accounts',
      'auth_owner_bootstrap',
      'course_memberships',
      'auth_invites',
    ].map(
      async (table) =>
        (await db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())
          .results,
    ),
  );
}

it('additively reconciles the exact completed owner without changing existing accounts, invites, memberships or bootstrap', async () => {
  expect(await snapshot()).toEqual(before);
  expect(await creation.canCreate(owner.p)).toBe(true);
  expect(await authority.list(owner.p)).toEqual([]);
  expect(
    await db
      .prepare('SELECT COUNT(*) AS n FROM course_creator_capabilities')
      .first(),
  ).toEqual({ n: 1 });
  const response = await call(owner, command());
  expect(response.status).toBe(201);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const body = (await response.json()) as { course: { id: string } };
  expect((await call(owner, undefined, '/' + body.course.id)).status).toBe(200);
});

it('discovers/reconciles a missing late-bootstrap capability but never reactivates an inactive tombstone', async () => {
  await db
    .prepare('DELETE FROM course_creator_capabilities WHERE user_id=?')
    .bind(owner.p.userId)
    .run();
  // No membership branch: use a rollback-safe temporary deactivation of created membership.
  await db
    .prepare('UPDATE course_memberships SET active=0 WHERE user_id=?')
    .bind(owner.p.userId)
    .run();
  expect(await creation.canCreate(owner.p)).toBe(true);
  expect(
    await db
      .prepare(
        'SELECT user_id FROM course_creator_capabilities WHERE user_id=?',
      )
      .bind(owner.p.userId)
      .first(),
  ).toBeNull();
  expect((await call(owner, command('Late bootstrap'))).status).toBe(201);
  await db.batch([
    db
      .prepare(
        'UPDATE course_creator_capabilities SET active=0 WHERE user_id=?',
      )
      .bind(owner.p.userId),
    db
      .prepare('UPDATE course_memberships SET active=0 WHERE user_id=?')
      .bind(owner.p.userId),
  ]);
  expect(await creation.canCreate(owner.p)).toBe(false);
  expect((await call(owner, command())).status).toBe(403);
});

it('denies student-only, ordinary admins, email impersonation, and unknown privilege fields', async () => {
  const student = await actor('student');
  await db
    .prepare('INSERT INTO auth_administrators VALUES(?)')
    .bind(student.p.userId)
    .run();
  expect(await creation.canCreate(student.p)).toBe(false);
  const start = await counts();
  expect((await call(student, command())).status).toBe(403);
  expect(
    (await call(student, { ...command(), administrator: true })).status,
  ).toBe(400);
  const alias = provider.users.get(owner.uid)!.email;
  await db
    .prepare('UPDATE auth_accounts SET email=? WHERE id=?')
    .bind(alias, student.p.userId)
    .run();
  expect(await creation.canCreate(student.p)).toBe(false);
  expect(await counts()).toEqual(start);
});

it('racing HTTP retries and two repository instances commit one course/membership/receipt', async () => {
  const teacher = await actor('instructor'),
    input = command('Concurrent course'),
    start = await counts();
  const responses = await Promise.all([
    call(teacher, input),
    call(teacher, input),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 201]);
  const bodies = await Promise.all(responses.map((r) => r.json()));
  expect(bodies[0]).toEqual(bodies[1]);
  expect(await counts()).toEqual(start.map((n) => n + 1));
  const input2 = command('Two repositories');
  const outcomes = await Promise.all([
    creation.create(teacher.p, input2),
    new CourseCreation(db).create(teacher.p, input2),
  ]);
  expect(outcomes[0].course).toEqual(outcomes[1].course);
  expect(outcomes.filter((r) => r.created)).toHaveLength(1);
  expect((await call(teacher, { ...input, name: 'Different' })).status).toBe(
    409,
  );
  expect(
    (await call(teacher, { ...input, name: '  Concurrent course  ' })).status,
  ).toBe(200);
  const other = await actor('instructor');
  expect((await call(other, input)).status).toBe(201);
});

it.each(['course_memberships', 'course_creation_receipts'])(
  'real SQL failure in %s rolls back course, membership and receipt and permits safe retry',
  async (table) => {
    const teacher = await actor('instructor'),
      input = command('Rollback'),
      start = await counts();
    await db
      .prepare(
        `CREATE TRIGGER test_failure BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT,'synthetic_fault'); END`,
      )
      .run();
    try {
      const response = await call(teacher, input);
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain('synthetic_fault');
      expect(await counts()).toEqual(start);
    } finally {
      await db.prepare('DROP TRIGGER test_failure').run();
    }
    expect((await call(teacher, input)).status).toBe(201);
  },
);

it.each(['session', 'account', 'membership', 'course'])(
  'denies %s revocation after route prechecks immediately before actual D1 batch',
  async (kind) => {
    const teacher = await actor('instructor'),
      input = command('Revocation gap');
    const prechecked = await auth.requireSession(
      new Request(config.origin, {
        headers: {
          cookie: cookieName(config, 'session') + '=' + teacher.token,
        },
      }),
    );
    expect(await creation.canCreate(prechecked.principal)).toBe(true);
    const start = await counts();
    const barrier = batchBarrier(async () => {
      if (kind === 'session')
        await db
          .prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?')
          .bind(Date.now(), teacher.p.sessionHandle)
          .run();
      if (kind === 'account')
        await db
          .prepare('UPDATE auth_accounts SET active=0 WHERE id=?')
          .bind(teacher.p.userId)
          .run();
      if (kind === 'membership')
        await db
          .prepare('UPDATE course_memberships SET active=0 WHERE user_id=?')
          .bind(teacher.p.userId)
          .run();
      if (kind === 'course')
        await db
          .prepare(
            'UPDATE courses SET active=0 WHERE id IN (SELECT course_id FROM course_memberships WHERE user_id=?)',
          )
          .bind(teacher.p.userId)
          .run();
    });
    await expect(new CourseCreation(barrier.db).create(teacher.p, input))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(barrier.reached()).toBe(true);
    expect(await counts()).toEqual(start);
  },
);

it.each(['capability', 'admin'])(
  'denies first owner %s revocation at commit',
  async (kind) => {
    await db
      .prepare(
        'UPDATE course_creator_capabilities SET active=1 WHERE user_id=?',
      )
      .bind(owner.p.userId)
      .run();
    expect(await creation.canCreate(owner.p)).toBe(true);
    const start = await counts();
    const barrier = batchBarrier(async () => {
      if (kind === 'capability')
        await db
          .prepare(
            'UPDATE course_creator_capabilities SET active=0 WHERE user_id=?',
          )
          .bind(owner.p.userId)
          .run();
      else
        await db
          .prepare('DELETE FROM auth_administrators WHERE user_id=?')
          .bind(owner.p.userId)
          .run();
    });
    await expect(new CourseCreation(barrier.db).create(owner.p, command()))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(barrier.reached()).toBe(true);
    expect(await counts()).toEqual(start);
  },
);

it('accepted retry cannot restore revoked membership or inactive course even with other instructor authority', async () => {
  const teacher = await actor('instructor'),
    input = command('Revoked receipt');
  const result = await creation.create(teacher.p, input);
  await db
    .prepare('UPDATE course_memberships SET active=0 WHERE course_id=?')
    .bind(result.course.id)
    .run();
  expect((await call(teacher, input)).status).toBe(409);
  expect((await call(teacher, undefined, '/' + result.course.id)).status).toBe(
    403,
  );
  const input2 = command('Inactive receipt'),
    result2 = await creation.create(teacher.p, input2);
  await db
    .prepare('UPDATE courses SET active=0 WHERE id=?')
    .bind(result2.course.id)
    .run();
  expect((await call(teacher, input2)).status).toBe(409);
});

it('enforces actual session-bound CSRF, origin, provider currentness, input bounds and GET no-op', async () => {
  const teacher = await actor('instructor'),
    input = command(),
    start = await counts();
  for (const headers of [
    { 'x-csrf-token': '' },
    { 'x-csrf-token': await csrfToken(randomToken()) },
    { origin: '' },
    { origin: 'null' },
    { origin: 'https://evil.example' },
  ])
    expect((await call(teacher, input, '', headers)).status).toBe(403);
  expect(
    (await call(teacher, input, '', { 'content-type': 'text/plain' })).status,
  ).toBe(400);
  expect(
    (await call(teacher, { ...input, name: 'x'.repeat(9000) })).status,
  ).toBe(400);
  for (const name of ['', ' ', 'x'.repeat(121), 'bad\u0000name', '\ud800'])
    expect((await call(teacher, { ...input, name })).status).toBe(400);
  expect((await call(teacher, undefined, '/creation')).status).toBe(200);
  expect((await call(teacher, undefined)).status).toBe(200);
  expect(await counts()).toEqual(start);
  provider.users.get(teacher.uid)!.passwordAt++;
  expect((await call(teacher, input)).status).toBe(401);
  expect(await counts()).toEqual(start);
});

it('expired and idle sessions cannot create; unrelated-course reads remain forbidden', async () => {
  for (const field of ['expires_at', 'last_seen']) {
    const teacher = await actor('instructor');
    await db
      .prepare(`UPDATE auth_sessions SET ${field}=? WHERE id=?`)
      .bind(
        field === 'expires_at' ? Date.now() + 1 : Date.now() - 1800001,
        teacher.p.sessionHandle,
      )
      .run();
    if (field === 'expires_at')
      await new Promise((resolve) => setTimeout(resolve, 5));
    expect((await call(teacher, command())).status).toBe(401);
  }
  const a = await actor('instructor'),
    b = await actor('instructor');
  const created = await creation.create(a.p, command());
  expect((await call(b, undefined, '/' + created.course.id)).status).toBe(403);
});

it('opens the acknowledged 101st course outside bounded list and survives a real D1 persistence restart', async () => {
  const teacher = await actor('instructor');
  await db.batch(
    Array.from({ length: 100 }, () => crypto.randomUUID()).flatMap((id) => [
      db
        .prepare('INSERT INTO courses(id,name) VALUES(?,?)')
        .bind(id, 'AAA earlier'),
      db
        .prepare(
          "INSERT INTO course_memberships(course_id,user_id,role) VALUES(?,?,'instructor')",
        )
        .bind(id, teacher.p.userId),
    ]),
  );
  const input = command('ZZZ acknowledged'),
    result = await creation.create(teacher.p, input);
  expect(await authority.list(teacher.p)).toHaveLength(100);
  expect(
    (await authority.list(teacher.p)).some((c) => c.id === result.course.id),
  ).toBe(false);
  expect((await call(teacher, undefined, '/' + result.course.id)).status).toBe(
    200,
  );
  const pinned = await db.prepare('SELECT * FROM auth_owner_bootstrap').first();
  await database.close();
  database = await authDatabase(persistence);
  wire();
  expect((await creation.create(teacher.p, input)).course).toEqual(
    result.course,
  );
  expect((await call(teacher, undefined, '/' + result.course.id)).status).toBe(
    200,
  );
  expect(
    await db.prepare('SELECT * FROM auth_owner_bootstrap').first(),
  ).toEqual(pinned);
  expect(
    await db
      .prepare('SELECT active FROM course_creator_capabilities WHERE user_id=?')
      .bind(owner.p.userId)
      .first(),
  ).toEqual({ active: 1 });
}, 30000);
