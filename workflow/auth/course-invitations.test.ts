import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { authDatabase } from './database';
import { SyntheticFirebase } from './synthetic-firebase';
import { ManagedStore } from '../../src/server/auth/managed-store';
import { ManagedAuthRoutes } from '../../src/server/auth/managed-routes';
import { CourseAuthority } from '../../src/server/courses/authority';
import type { AuthMailer } from '../../src/server/auth/mail';
import { ProofRejected } from '../../src/server/auth/firebase';
import {
  cookieName,
  csrfToken,
  hash,
  randomToken,
} from '../../src/server/auth/primitives';

const config = {
  origin: 'https://app.example.test',
  secure: true,
  clientId: '',
  clientSecret: '',
};
const password = 'synthetic password 42';
const provider = new SyntheticFirebase();
const sent: { email: string; url: string }[] = [];
let deliveryState: 'queued' | 'failed' | 'unknown' = 'queued';
const mailer: AuthMailer = {
  async send(email, url) {
    sent.push({ email, url });
    return { state: deliveryState, messageId: 'synthetic' };
  },
};
let database: Awaited<ReturnType<typeof authDatabase>>;
let store: ManagedStore;
let routes: ManagedAuthRoutes;

async function migrate(name: string) {
  const sql = await readFile('src/server/db/migrations/' + name, 'utf8');
  await database.db.batch(
    sql
      .split(/^-- statement\s*$/m)
      .map((s) => s.trim())
      .filter((s) => s.replace(/^--.*$/gm, '').trim())
      .map((s) => database.db.prepare(s)),
  );
}

async function actor() {
  const uid = crypto.randomUUID(),
    email = uid + '@u.nus.edu',
    invite = randomToken();
  await provider.provision(uid, email);
  await provider.verifyEmail(uid);
  provider.passwords.set(uid, password);
  await database.db
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
  const session = await store.session(token);
  return { uid, email, token, session };
}

async function course(owner: Awaited<ReturnType<typeof actor>>) {
  const id = crypto.randomUUID();
  await database.db.batch([
    database.db
      .prepare('INSERT INTO courses(id,name) VALUES(?,?)')
      .bind(id, 'Synthetic course'),
    database.db
      .prepare(
        "INSERT INTO course_memberships(course_id,user_id,role) VALUES(?,?,'instructor')",
      )
      .bind(id, owner.session.user_id),
  ]);
  return id;
}

async function call(
  path: string,
  input: unknown | undefined,
  browser: string,
  session?: string,
) {
  const cookies = [cookieName(config, 'preauth') + '=' + browser];
  if (session) cookies.push(cookieName(config, 'session') + '=' + session);
  return routes.fetch(
    new Request(config.origin + '/api/auth/' + path, {
      method: input === undefined ? 'GET' : 'POST',
      headers: {
        'cf-connecting-ip': browser,
        cookie: cookies.join('; '),
        'x-csrf-token': await csrfToken(
          path.startsWith('invitation/') ? browser : (session ?? browser),
        ),
        ...(input === undefined
          ? {}
          : { origin: config.origin, 'content-type': 'application/json' }),
      },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    }),
  );
}

async function invite(
  owner: Awaited<ReturnType<typeof actor>>,
  courseId: string,
  email: string,
  targetRole: 'student' | 'instructor',
) {
  const response = await call(
    'invitations',
    { courseId, email, targetRole },
    randomToken(),
    owner.token,
  );
  expect(response.status).toBe(201);
  const data = (await response.json()) as { invitation: { id: string } };
  const message = sent.filter((s) => s.email === email).at(-1);
  expect(message).toBeDefined();
  const fields = new URLSearchParams(new URL(message!.url).hash.slice(1));
  return {
    id: data.invitation.id,
    invite: fields.get('invite')!,
    ticket: fields.get('ticket'),
    code: fields.get('code'),
  };
}

async function membership(courseId: string, email: string, role: string) {
  return database.db
    .prepare(
      'SELECT m.active FROM course_memberships m JOIN auth_accounts a ON a.id=m.user_id WHERE m.course_id=? AND a.email=? AND m.role=?',
    )
    .bind(courseId, email, role)
    .first<{ active: number }>();
}

describe('course-role invitations against isolated D1 and synthetic mail/provider', () => {
  beforeAll(async () => {
    database = await authDatabase();
    await migrate('0007_courses.sql');
    await migrate('0008_instructor_assessments.sql');
    await migrate('0009_course_creation.sql');
    await migrate('0010_invitation_target_role.sql');
    await migrate('0011_invitation_identity_recovery.sql');
    store = new ManagedStore(database.db);
    routes = new ManagedAuthRoutes(
      store,
      config,
      provider,
      mailer,
      new CourseAuthority(database.db),
    );
  }, 30000);
  afterAll(async () => {
    await database?.close();
  });

  it('joins a new recipient only on explicit POST and creates the exact invited role', async () => {
    const owner = await actor(),
      courseId = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu';
    const i = await invite(owner, courseId, email, 'student'),
      browser = randomToken();
    expect(i.invite).toBeTruthy();
    await call('invitation/preview?invite=' + i.invite, undefined, browser);
    expect(await membership(courseId, email, 'student')).toBeNull();
    expect(
      (
        await database.db
          .prepare('SELECT accepted_at FROM auth_invites WHERE id=?')
          .bind(i.id)
          .first<{ accepted_at: number | null }>()
      )?.accepted_at,
    ).toBeNull();
    const preview = await call(
      'invitation/preview',
      { invite: i.invite },
      browser,
    );
    expect(preview.status).toBe(200);
    expect(await membership(courseId, email, 'student')).toBeNull();
    const joined = await call(
      'invitation/join',
      {
        invite: i.invite,
        ticket: i.ticket,
        code: i.code,
        password,
        mode: 'reset',
      },
      browser,
    );
    expect(joined.status).toBe(200);
    expect(await membership(courseId, email, 'student')).toEqual({ active: 1 });
    expect(await membership(courseId, email, 'instructor')).toBeNull();
    expect(
      provider.passwords.get(
        (await store.account(email, provider.issuer))!.subject,
      ),
    ).toBe(password);
  });

  it('adds an instructor role to a registered account without resetting its password or removing student membership', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    await database.db
      .prepare(
        "INSERT INTO course_memberships(course_id,user_id,role) VALUES(?,?,'student')",
      )
      .bind(courseId, recipient.session.user_id)
      .run();
    const i = await invite(owner, courseId, recipient.email, 'instructor'),
      browser = randomToken();
    expect(
      (await call('invitation/join', { invite: i.invite, password }, browser))
        .status,
    ).toBe(200);
    expect(await membership(courseId, recipient.email, 'instructor')).toEqual({
      active: 1,
    });
    expect(await membership(courseId, recipient.email, 'student')).toEqual({
      active: 1,
    });
    expect(provider.passwords.get(recipient.uid)).toBe(password);
    expect((await store.account(recipient.email, provider.issuer))?.id).toBe(
      recipient.session.user_id,
    );
  });

  it('rejects a different signed-in account and leaves the invitation pending', async () => {
    const owner = await actor(),
      recipient = await actor(),
      wrong = await actor(),
      courseId = await course(owner);
    const i = await invite(owner, courseId, recipient.email, 'student');
    expect(
      (
        await call(
          'invitation/join',
          { invite: i.invite, password },
          randomToken(),
          wrong.token,
        )
      ).status,
    ).not.toBe(200);
    expect(await membership(courseId, recipient.email, 'student')).toBeNull();
    expect(await membership(courseId, wrong.email, 'student')).toBeNull();
    expect(
      (
        await database.db
          .prepare('SELECT accepted_at FROM auth_invites WHERE id=?')
          .bind(i.id)
          .first<{ accepted_at: number | null }>()
      )?.accepted_at,
    ).toBeNull();
  });

  it('does not grant if the inviter loses course authority before acceptance', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    const i = await invite(owner, courseId, recipient.email, 'student');
    await database.db
      .prepare(
        "UPDATE course_memberships SET active=0 WHERE course_id=? AND user_id=? AND role='instructor'",
      )
      .bind(courseId, owner.session.user_id)
      .run();
    expect(
      (
        await call(
          'invitation/join',
          { invite: i.invite, password },
          randomToken(),
        )
      ).status,
    ).not.toBe(200);
    expect(await membership(courseId, recipient.email, 'student')).toBeNull();
  });

  it('accepts separate concurrent invitations into one account and never resurrects a revoked receipt', async () => {
    const owner = await actor(),
      recipient = await actor(),
      firstCourse = await course(owner),
      secondCourse = await course(owner);
    const first = await invite(owner, firstCourse, recipient.email, 'student');
    const second = await invite(
      owner,
      secondCourse,
      recipient.email,
      'instructor',
    );
    const results = await Promise.all(
      [first, second].map((i) =>
        call('invitation/join', { invite: i.invite, password }, randomToken()),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(await membership(firstCourse, recipient.email, 'student')).toEqual({
      active: 1,
    });
    expect(
      await membership(secondCourse, recipient.email, 'instructor'),
    ).toEqual({ active: 1 });
    await database.db
      .prepare(
        "UPDATE course_memberships SET active=0 WHERE course_id=? AND user_id=? AND role='student'",
      )
      .bind(firstCourse, recipient.session.user_id)
      .run();
    await call(
      'invitation/join',
      { invite: first.invite, password },
      randomToken(),
    );
    expect(await membership(firstCourse, recipient.email, 'student')).toEqual({
      active: 0,
    });
    expect((await store.account(recipient.email, provider.issuer))?.id).toBe(
      recipient.session.user_id,
    );
  }, 30000);

  it('does not grant on provider failure or a revoked invitation', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    const i = await invite(owner, courseId, recipient.email, 'student');
    provider.unavailable = true;
    try {
      expect(
        (
          await call(
            'invitation/join',
            { invite: i.invite, password },
            randomToken(),
          )
        ).status,
      ).not.toBe(200);
    } finally {
      provider.unavailable = false;
    }
    expect(await membership(courseId, recipient.email, 'student')).toBeNull();
    expect(
      (
        await call(
          'invitations/' + i.id + '/revoke',
          { courseId },
          randomToken(),
          owner.token,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await call(
          'invitation/join',
          { invite: i.invite, password },
          randomToken(),
        )
      ).status,
    ).not.toBe(200);
    expect(await membership(courseId, recipient.email, 'student')).toBeNull();
  });

  it('rejects an expired new-recipient proof without admitting the account or granting membership', async () => {
    const owner = await actor(),
      courseId = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu';
    const i = await invite(owner, courseId, email, 'instructor');
    await database.db
      .prepare('UPDATE auth_actions SET expires_at=? WHERE invite_id=?')
      .bind(Date.now() - 1, i.id)
      .run();
    expect(
      (
        await call(
          'invitation/join',
          {
            invite: i.invite,
            ticket: i.ticket,
            code: i.code,
            password,
            mode: 'reset',
          },
          randomToken(),
        )
      ).status,
    ).not.toBe(200);
    expect(await store.account(email, provider.issuer)).toBeNull();
    expect(await membership(courseId, email, 'instructor')).toBeNull();
  });

  it('handles racing submissions of one invitation without duplicate membership', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    const i = await invite(owner, courseId, recipient.email, 'student');
    const results = await Promise.all(
      [0, 1].map(() =>
        call('invitation/join', { invite: i.invite, password }, randomToken()),
      ),
    );
    expect(results.some((r) => r.status === 200)).toBe(true);
    expect(await membership(courseId, recipient.email, 'student')).toEqual({
      active: 1,
    });
    expect(
      await database.db
        .prepare(
          'SELECT COUNT(*) AS n FROM course_memberships WHERE course_id=? AND user_id=? AND role=?',
        )
        .bind(courseId, recipient.session.user_id, 'student')
        .first(),
    ).toEqual({ n: 1 });
  });

  it('rolls back acceptance if membership insertion fails, allowing a retry', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    const i = await invite(owner, courseId, recipient.email, 'student');
    await database.db
      .prepare(
        `CREATE TRIGGER synthetic_membership_failure BEFORE INSERT ON course_memberships WHEN NEW.course_id='${courseId}' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END`,
      )
      .run();
    try {
      expect(
        (
          await call(
            'invitation/join',
            { invite: i.invite, password },
            randomToken(),
          )
        ).status,
      ).not.toBe(200);
      expect(await membership(courseId, recipient.email, 'student')).toBeNull();
      expect(
        (
          await database.db
            .prepare('SELECT accepted_at FROM auth_invites WHERE id=?')
            .bind(i.id)
            .first<{ accepted_at: number | null }>()
        )?.accepted_at,
      ).toBeNull();
    } finally {
      await database.db
        .prepare('DROP TRIGGER synthetic_membership_failure')
        .run();
    }
    expect(
      (
        await call(
          'invitation/join',
          { invite: i.invite, password },
          randomToken(),
        )
      ).status,
    ).toBe(200);
    expect(await membership(courseId, recipient.email, 'student')).toEqual({
      active: 1,
    });
  });

  it('denies student and foreign instructor invitation commands', async () => {
    const owner = await actor(),
      student = await actor(),
      foreign = await actor(),
      courseId = await course(owner);
    await database.db
      .prepare(
        "INSERT INTO course_memberships(course_id,user_id,role) VALUES(?,?,'student')",
      )
      .bind(courseId, student.session.user_id)
      .run();
    const email = crypto.randomUUID() + '@u.nus.edu';
    for (const who of [student, foreign]) {
      expect(
        (
          await call(
            'invitations',
            { courseId, email, targetRole: 'instructor' },
            randomToken(),
            who.token,
          )
        ).status,
      ).toBe(403);
    }
    expect(
      await database.db
        .prepare('SELECT id FROM auth_invites WHERE email=?')
        .bind(email)
        .first(),
    ).toBeNull();
  });

  it('concurrent invitations for a previously unregistered recipient converge on one account', async () => {
    const owner = await actor(),
      firstCourse = await course(owner),
      secondCourse = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu';
    const first = await invite(owner, firstCourse, email, 'student');
    const second = await invite(owner, secondCourse, email, 'instructor');
    expect(
      (
        await call(
          'invitation/join',
          {
            invite: first.invite,
            ticket: first.ticket,
            code: first.code,
            password,
            mode: 'reset',
          },
          randomToken(),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await call(
          'invitation/join',
          { invite: second.invite, password },
          randomToken(),
        )
      ).status,
    ).toBe(200);
    expect(await membership(firstCourse, email, 'student')).toEqual({
      active: 1,
    });
    expect(await membership(secondCourse, email, 'instructor')).toEqual({
      active: 1,
    });
    expect(
      await database.db
        .prepare('SELECT COUNT(*) AS n FROM auth_accounts WHERE email=?')
        .bind(email)
        .first(),
    ).toEqual({ n: 1 });
  });

  it('serializes simultaneous first-time setup and recovers the other invitation without resetting the password', async () => {
    const owner = await actor(),
      firstCourse = await course(owner),
      secondCourse = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu';
    const first = await invite(owner, firstCourse, email, 'student');
    const second = await invite(owner, secondCourse, email, 'instructor');
    const results = await Promise.all(
      [first, second].map((i) =>
        call(
          'invitation/join',
          {
            invite: i.invite,
            ticket: i.ticket,
            code: i.code,
            password,
            mode: 'reset',
          },
          randomToken(),
        ),
      ),
    );
    expect(results.some((r) => r.status === 200)).toBe(true);
    const account = await store.account(email, provider.issuer);
    expect(account).not.toBeNull();
    const passwordVersion = (await provider.current(account!.subject))
      .passwordAt;
    for (const i of [first, second]) {
      expect(
        (
          await call(
            'invitation/join',
            { invite: i.invite, password },
            randomToken(),
          )
        ).status,
      ).toBe(200);
    }
    expect((await provider.current(account!.subject)).passwordAt).toBe(
      passwordVersion,
    );
    expect(await membership(firstCourse, email, 'student')).toEqual({
      active: 1,
    });
    expect(await membership(secondCourse, email, 'instructor')).toEqual({
      active: 1,
    });
  });

  it('lets another current course instructor list, resend and revoke with honest send states', async () => {
    const owner = await actor(),
      colleague = await actor(),
      courseId = await course(owner),
      recipient = await actor();
    await database.db
      .prepare(
        "INSERT INTO course_memberships(course_id,user_id,role) VALUES(?,?,'instructor')",
      )
      .bind(courseId, colleague.session.user_id)
      .run();
    deliveryState = 'unknown';
    try {
      const i = await invite(owner, courseId, recipient.email, 'instructor');
      const listing = await call(
        'invitations?courseId=' + courseId,
        undefined,
        randomToken(),
        colleague.token,
      );
      expect(listing.status).toBe(200);
      const body = (await listing.json()) as {
        items: Array<{
          id: string;
          targetRole: string;
          status: string;
          sendState: string;
        }>;
      };
      expect(body.items.find((row) => row.id === i.id)).toMatchObject({
        targetRole: 'instructor',
        status: 'pending',
        sendState: 'unknown',
      });
      deliveryState = 'failed';
      expect(
        (
          await call(
            'invitations/' + i.id + '/resend',
            { courseId },
            randomToken(),
            colleague.token,
          )
        ).status,
      ).toBe(200);
      expect(
        await database.db
          .prepare('SELECT send_state FROM auth_invites WHERE id=?')
          .bind(i.id)
          .first(),
      ).toEqual({ send_state: 'failed' });
      expect(
        (
          await call(
            'invitations/' + i.id + '/revoke',
            { courseId },
            randomToken(),
            colleague.token,
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await database.db
            .prepare('SELECT revoked_at FROM auth_invites WHERE id=?')
            .bind(i.id)
            .first<{ revoked_at: number | null }>()
        )?.revoked_at,
      ).not.toBeNull();
      expect(
        (
          await call(
            'invitation/join',
            { invite: i.invite, password },
            randomToken(),
          )
        ).status,
      ).not.toBe(200);
    } finally {
      deliveryState = 'queued';
    }
  });

  it('does not steal an expired-looking setup lock or change the provider password', async () => {
    const owner = await actor(),
      courseId = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu';
    const i = await invite(owner, courseId, email, 'student');
    await database.db
      .prepare(
        "INSERT INTO auth_course_setup_locks(email,claim_id,expires_at,phase) VALUES(?,?,?,'resetting')",
      )
      .bind(email, 'held-by-other-setup', Date.now() - 1000)
      .run();
    const row = await database.db
      .prepare('SELECT firebase_uid FROM auth_invites WHERE id=?')
      .bind(i.id)
      .first<{ firebase_uid: string }>();
    const version = (await provider.current(row!.firebase_uid)).passwordAt;
    expect(
      (
        await call(
          'invitation/join',
          {
            invite: i.invite,
            ticket: i.ticket,
            code: i.code,
            password,
            mode: 'reset',
          },
          randomToken(),
        )
      ).status,
    ).not.toBe(200);
    expect((await provider.current(row!.firebase_uid)).passwordAt).toBe(
      version,
    );
    expect(await store.account(email, provider.issuer)).toBeNull();
    expect(await membership(courseId, email, 'student')).toBeNull();
    expect(
      await database.db
        .prepare('SELECT claim_id FROM auth_course_setup_locks WHERE email=?')
        .bind(email)
        .first(),
    ).toEqual({ claim_id: 'held-by-other-setup' });
  });

  it('cannot use a legacy setup proof to reset an already registered account', async () => {
    const recipient = await actor(),
      token = randomToken(),
      ticket = randomToken(),
      inviteId = crypto.randomUUID(),
      code = await provider.action(recipient.email);
    await database.db
      .prepare(
        'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at,course_id,firebase_uid) VALUES(?,?,?,?,?,?,?)',
      )
      .bind(
        inviteId,
        await hash(token),
        recipient.email,
        Date.now(),
        Date.now() + 86400000,
        'legacy-course',
        recipient.uid,
      )
      .run();
    await store.action(
      ticket,
      { uid: recipient.uid, email: recipient.email },
      inviteId,
      null,
      token,
    );
    const version = (await provider.current(recipient.uid)).passwordAt;
    expect(
      (
        await call(
          'setup/confirm',
          {
            invite: token,
            ticket,
            code,
            password: 'different synthetic password',
          },
          randomToken(),
        )
      ).status,
    ).not.toBe(200);
    expect(provider.passwords.get(recipient.uid)).toBe(password);
    expect((await provider.current(recipient.uid)).passwordAt).toBe(version);
    expect(
      await membership('legacy-course', recipient.email, 'student'),
    ).toBeNull();
  });

  it('unlocks after a definitive provider proof rejection', async () => {
    const owner = await actor(),
      courseId = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu';
    const i = await invite(owner, courseId, email, 'student');
    const rejection = vi
      .spyOn(provider, 'reset')
      .mockRejectedValueOnce(new ProofRejected());
    try {
      expect(
        (
          await call(
            'invitation/join',
            {
              invite: i.invite,
              ticket: i.ticket,
              code: i.code,
              password,
              mode: 'reset',
            },
            randomToken(),
          )
        ).status,
      ).not.toBe(200);
      expect(
        await database.db
          .prepare('SELECT email FROM auth_course_setup_locks WHERE email=?')
          .bind(email)
          .first(),
      ).toBeNull();
      expect(await store.account(email, provider.issuer)).toBeNull();
      expect(await membership(courseId, email, 'student')).toBeNull();
    } finally {
      rejection.mockRestore();
    }
  });

  it('retains the lock after an uncertain provider reset outcome', async () => {
    const owner = await actor(),
      firstCourse = await course(owner),
      secondCourse = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu';
    const first = await invite(owner, firstCourse, email, 'student');
    const second = await invite(owner, secondCourse, email, 'instructor');
    const uid = (await database.db
      .prepare('SELECT firebase_uid FROM auth_invites WHERE id=?')
      .bind(first.id)
      .first<{ firebase_uid: string }>())!.firebase_uid;
    const reset = provider.reset.bind(provider);
    const interrupted = vi
      .spyOn(provider, 'reset')
      .mockImplementationOnce(async (code, value) => {
        await reset(code, value);
        throw new Error('synthetic unknown provider result');
      });
    try {
      expect(
        (
          await call(
            'invitation/join',
            {
              invite: first.invite,
              ticket: first.ticket,
              code: first.code,
              password,
              mode: 'reset',
            },
            randomToken(),
          )
        ).status,
      ).not.toBe(200);
    } finally {
      interrupted.mockRestore();
    }
    const version = (await provider.current(uid)).passwordAt;
    expect(await store.account(email, provider.issuer)).toBeNull();
    expect(
      await database.db
        .prepare('SELECT phase FROM auth_course_setup_locks WHERE email=?')
        .bind(email)
        .first(),
    ).toEqual({ phase: 'resetting' });
    expect(
      (
        await call(
          'invitation/join',
          {
            invite: second.invite,
            ticket: second.ticket,
            code: second.code,
            password: 'another synthetic password',
            mode: 'reset',
          },
          randomToken(),
        )
      ).status,
    ).not.toBe(200);
    expect((await provider.current(uid)).passwordAt).toBe(version);
    expect(provider.passwords.get(uid)).toBe(password);
    expect(await membership(firstCourse, email, 'student')).toBeNull();
    expect(await membership(secondCourse, email, 'instructor')).toBeNull();
  });

  it('rechecks membership and session inside resend and revoke mutations', async () => {
    for (const action of ['resend', 'revoke'] as const) {
      for (const removal of ['membership', 'session'] as const) {
        const owner = await actor(),
          recipient = await actor(),
          courseId = await course(owner);
        const i = await invite(owner, courseId, recipient.email, 'student');
        const before = await database.db
          .prepare('SELECT token_hash,revoked_at FROM auth_invites WHERE id=?')
          .bind(i.id)
          .first();
        const method = action === 'resend' ? 'rotate' : 'revoke';
        const original = store[method].bind(store);
        const hook = vi
          .spyOn(store, method)
          .mockImplementationOnce(async (invitation, session) => {
            if (removal === 'membership') {
              await database.db
                .prepare(
                  "UPDATE course_memberships SET active=0 WHERE course_id=? AND user_id=? AND role='instructor'",
                )
                .bind(courseId, owner.session.user_id)
                .run();
            } else {
              await database.db
                .prepare('UPDATE auth_sessions SET revoked_at=? WHERE id=?')
                .bind(Date.now(), owner.session.id)
                .run();
            }
            return original(invitation, session);
          });
        try {
          expect(
            (
              await call(
                'invitations/' + i.id + '/' + action,
                { courseId },
                randomToken(),
                owner.token,
              )
            ).status,
          ).not.toBe(200);
        } finally {
          hook.mockRestore();
        }
        expect(
          await database.db
            .prepare(
              'SELECT token_hash,revoked_at FROM auth_invites WHERE id=?',
            )
            .bind(i.id)
            .first(),
        ).toEqual(before);
      }
    }
  }, 30000);

  it('makes the role, course, recipient, provider UID and inviter immutable', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    const i = await invite(owner, courseId, recipient.email, 'student');
    for (const [field, value] of [
      ['target_role', 'instructor'],
      ['course_id', 'another-course'],
      ['email', 'another@u.nus.edu'],
      ['firebase_uid', 'another-uid'],
      ['created_by', recipient.session.user_id],
    ]) {
      await expect(
        database.db
          .prepare(`UPDATE auth_invites SET ${field}=? WHERE id=?`)
          .bind(value, i.id)
          .run(),
      ).rejects.toThrow();
    }
    const row = await database.db
      .prepare(
        'SELECT target_role,course_id,email,firebase_uid,created_by FROM auth_invites WHERE id=?',
      )
      .bind(i.id)
      .first();
    expect(row).toEqual({
      target_role: 'student',
      course_id: courseId,
      email: recipient.email,
      firebase_uid: recipient.uid,
      created_by: owner.session.user_id,
    });
  });

  it('reports an adapter exception after dispatch as unknown, not failed or accepted', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    const timeout = vi
      .spyOn(mailer, 'send')
      .mockImplementationOnce(async (email, url) => {
        sent.push({ email, url });
        throw new Error('synthetic timeout after accepting message');
      });
    try {
      const response = await call(
        'invitations',
        { courseId, email: recipient.email, targetRole: 'student' },
        randomToken(),
        owner.token,
      );
      expect(response.status).toBe(201);
      const body = (await response.json()) as {
        invitation: { id: string; sendState: string; status: string };
      };
      expect(body.invitation).toMatchObject({
        sendState: 'unknown',
        status: 'pending',
      });
      expect(sent.some((message) => message.email === recipient.email)).toBe(
        true,
      );
      expect(
        await database.db
          .prepare('SELECT send_state,accepted_at FROM auth_invites WHERE id=?')
          .bind(body.invitation.id)
          .first(),
      ).toEqual({ send_state: 'unknown', accepted_at: null });
      expect(await membership(courseId, recipient.email, 'student')).toBeNull();
    } finally {
      timeout.mockRestore();
    }
  });
  it('groups same-course roles, deduplicates repeated role and accepts either link atomically', async () => {
    for (const selected of ['student', 'instructor'] as const) {
      const owner = await actor(),
        recipient = await actor(),
        courseId = await course(owner);
      const student = await invite(owner, courseId, recipient.email, 'student');
      const instructor = await invite(
        owner,
        courseId,
        recipient.email,
        'instructor',
      );
      const duplicate = await call(
        'invitations',
        { courseId, email: recipient.email, targetRole: 'student' },
        randomToken(),
        owner.token,
      );
      expect(duplicate.status).toBe(200);
      expect(await duplicate.json()).toMatchObject({ reused: true });
      const listing = await call(
        'invitations?courseId=' + courseId,
        undefined,
        randomToken(),
        owner.token,
      );
      const list = (await listing.json()) as {
        items: { email: string; targetRoles: string[] }[];
      };
      expect(list.items).toHaveLength(1);
      expect(list.items[0].targetRoles).toEqual(['instructor', 'student']);
      const chosen = selected === 'student' ? student : instructor;
      const preview = await call(
        'invitation/preview',
        { invite: chosen.invite },
        randomToken(),
      );
      expect(await preview.json()).toMatchObject({
        roles: ['instructor', 'student'],
      });
      const join = await call(
        'invitation/join',
        { invite: chosen.invite, password, roles: ['instructor', 'student'] },
        randomToken(),
      );
      expect(join.status).toBe(200);
      expect(await membership(courseId, recipient.email, 'student')).toEqual({
        active: 1,
      });
      expect(await membership(courseId, recipient.email, 'instructor')).toEqual(
        { active: 1 },
      );
      const other = selected === 'student' ? instructor : student;
      const replay = await call(
        'invitation/join',
        { invite: other.invite, password },
        randomToken(),
      );
      expect(replay.status).toBe(200);
    }
  }, 30000);

  it('rejects a role added after the recipient preview and grants neither role', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    const first = await invite(owner, courseId, recipient.email, 'student');
    const preview = await call(
      'invitation/preview',
      { invite: first.invite },
      randomToken(),
    );
    expect(await preview.json()).toMatchObject({ roles: ['student'] });
    await invite(owner, courseId, recipient.email, 'instructor');
    const join = await call(
      'invitation/join',
      { invite: first.invite, password, roles: ['student'] },
      randomToken(),
    );
    expect(join.status).not.toBe(200);
    expect(await membership(courseId, recipient.email, 'student')).toBeNull();
    expect(
      await membership(courseId, recipient.email, 'instructor'),
    ).toBeNull();
  }, 30000);

  it('accepts both roles from the earlier proof for a new recipient and keeps one identity', async () => {
    const owner = await actor(),
      courseId = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu';
    const first = await invite(owner, courseId, email, 'student');
    await invite(owner, courseId, email, 'instructor');
    const joined = await call(
      'invitation/join',
      {
        invite: first.invite,
        ticket: first.ticket,
        code: first.code,
        password,
        mode: 'reset',
        roles: ['instructor', 'student'],
      },
      randomToken(),
    );
    expect(joined.status).toBe(200);
    expect(await membership(courseId, email, 'student')).toEqual({ active: 1 });
    expect(await membership(courseId, email, 'instructor')).toEqual({
      active: 1,
    });
    expect(
      await database.db
        .prepare('SELECT COUNT(*) AS n FROM auth_accounts WHERE email=?')
        .bind(email)
        .first(),
    ).toEqual({ n: 1 });
  }, 30000);

  it('does not grant either role when a second inviter loses authority', async () => {
    const owner = await actor(),
      second = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    await database.db
      .prepare(
        "INSERT INTO course_memberships(course_id,user_id,role) VALUES(?,?,'instructor')",
      )
      .bind(courseId, second.session.user_id)
      .run();
    const first = await invite(owner, courseId, recipient.email, 'student');
    await invite(second, courseId, recipient.email, 'instructor');
    await database.db
      .prepare(
        "UPDATE course_memberships SET active=0 WHERE course_id=? AND user_id=? AND role='instructor'",
      )
      .bind(courseId, second.session.user_id)
      .run();
    const result = await call(
      'invitation/join',
      { invite: first.invite, password, roles: ['instructor', 'student'] },
      randomToken(),
    );
    expect(result.status).not.toBe(200);
    expect(await membership(courseId, recipient.email, 'student')).toBeNull();
    expect(
      await membership(courseId, recipient.email, 'instructor'),
    ).toBeNull();
  }, 30000);

  it('groups legacy records with role invitations without leaving a usable link after group revocation', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    const role = await invite(owner, courseId, recipient.email, 'student');
    const legacyToken = randomToken(),
      legacyId = crypto.randomUUID();
    await database.db
      .prepare(
        'INSERT INTO auth_invites(id,token_hash,email,created_by,creator_session,created_at,expires_at,course_id,firebase_uid) VALUES(?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        legacyId,
        await hash(legacyToken),
        recipient.email,
        owner.session.user_id,
        owner.session.id,
        Date.now() + 1,
        8640000000000000,
        courseId,
        recipient.uid,
      )
      .run();
    const listed = (await (
      await call(
        'invitations?courseId=' + courseId,
        undefined,
        randomToken(),
        owner.token,
      )
    ).json()) as { items: { id: string; targetRoles: string[] }[] };
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]).toMatchObject({
      id: role.id,
      targetRoles: ['student'],
    });
    expect(
      (
        await call(
          'invitations/' + listed.items[0].id + '/revoke',
          { courseId },
          randomToken(),
          owner.token,
        )
      ).status,
    ).toBe(200);
    const rows = await database.db
      .prepare(
        'SELECT COUNT(*) AS n FROM auth_invites WHERE course_id=? AND email=? AND revoked_at IS NULL',
      )
      .bind(courseId, recipient.email)
      .first();
    expect(rows).toEqual({ n: 0 });
  }, 30000);

  it('reports a failed role delivery conservatively and targets it for resend', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    const first = await invite(owner, courseId, recipient.email, 'student');
    const second = await invite(owner, courseId, recipient.email, 'instructor');
    await database.db
      .prepare("UPDATE auth_invites SET send_state='failed' WHERE id=?")
      .bind(first.id)
      .run();
    const listed = (await (
      await call(
        'invitations?courseId=' + courseId,
        undefined,
        randomToken(),
        owner.token,
      )
    ).json()) as { items: { id: string; sendState: string }[] };
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]).toMatchObject({
      id: first.id,
      sendState: 'failed',
    });
    expect(second.id).not.toBe(first.id);
    expect(
      (
        await call(
          'invitations/' + first.id + '/resend',
          { courseId },
          randomToken(),
          owner.token,
        )
      ).status,
    ).toBe(200);
  }, 30000);

  it('does not disclose a duplicate invitation after instructor authority is revoked', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    await invite(owner, courseId, recipient.email, 'student');
    const account = store.account.bind(store);
    const spy = vi
      .spyOn(store, 'account')
      .mockImplementationOnce(async (...args) => {
        await database.db
          .prepare(
            "UPDATE course_memberships SET active=0 WHERE course_id=? AND user_id=? AND role='instructor'",
          )
          .bind(courseId, owner.session.user_id)
          .run();
        return account(...args);
      });
    try {
      const response = await call(
        'invitations',
        { courseId, email: recipient.email, targetRole: 'student' },
        randomToken(),
        owner.token,
      );
      expect(response.status).not.toBe(200);
      expect(JSON.stringify(await response.json())).not.toContain(
        recipient.email,
      );
    } finally {
      spy.mockRestore();
    }
  }, 30000);

  it('does not generate recovery mail or reset the pinned owner identity from another environment', async () => {
    const instructor = await actor(),
      courseId = await course(instructor),
      email = crypto.randomUUID() + '@u.nus.edu';
    const uid =
      'cw-owner-' + (await hash(provider.issuer + '|' + email)).slice(0, 56);
    await provider.provisionOwner(uid, email, password);
    const version = (await provider.current(uid)).passwordAt,
      beforeMail = sent.length;
    const result = await call(
      'invitations',
      { courseId, email, targetRole: 'student' },
      randomToken(),
      instructor.token,
    );
    expect(result.status).toBe(201);
    expect(await result.json()).toMatchObject({
      invitation: { sendState: 'failed' },
    });
    expect(sent.length).toBe(beforeMail);
    expect(provider.passwords.get(uid)).toBe(password);
    expect((await provider.current(uid)).passwordAt).toBe(version);
    expect(await store.account(email, provider.issuer)).toBeNull();
  }, 30000);

  it('protects the reserved owner UID even if its provider email changed', async () => {
    const instructor = await actor(),
      courseId = await course(instructor);
    const alias = crypto.randomUUID() + '@u.nus.edu',
      changed = crypto.randomUUID() + '@u.nus.edu';
    const uid =
      'cw-owner-' + (await hash(provider.issuer + '|' + alias)).slice(0, 56);
    await provider.provisionOwner(uid, alias, password);
    provider.users.get(uid)!.email = changed;
    const version = (await provider.current(uid)).passwordAt,
      beforeMail = sent.length;
    const result = await call(
      'invitations',
      { courseId, email: changed, targetRole: 'student' },
      randomToken(),
      instructor.token,
    );
    expect(result.status).toBe(201);
    expect(await result.json()).toMatchObject({
      invitation: { sendState: 'failed' },
    });
    expect(sent.length).toBe(beforeMail);
    expect(provider.passwords.get(uid)).toBe(password);
    expect((await provider.current(uid)).passwordAt).toBe(version);
    expect(await store.account(changed, provider.issuer)).toBeNull();
  }, 30000);

  it('rejects an older legacy proof for a reserved owner identity', async () => {
    const email = crypto.randomUUID() + '@u.nus.edu',
      uid =
        'cw-owner-' + (await hash(provider.issuer + '|' + email)).slice(0, 56);
    await provider.provisionOwner(uid, email, password);
    const token = randomToken(),
      ticket = randomToken(),
      code = await provider.action(email),
      inviteId = crypto.randomUUID();
    await database.db
      .prepare(
        'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at,course_id,firebase_uid) VALUES(?,?,?,?,?,?,?)',
      )
      .bind(
        inviteId,
        await hash(token),
        email,
        Date.now(),
        8640000000000000,
        'legacy-course',
        uid,
      )
      .run();
    await store.action(ticket, { uid, email }, inviteId, null, token);
    const response = await call(
      'setup/confirm',
      { invite: token, ticket, code, password: 'changed synthetic password' },
      randomToken(),
    );
    expect(response.status).not.toBe(200);
    expect(provider.passwords.get(uid)).toBe(password);
    expect(await store.account(email, provider.issuer)).toBeNull();
  }, 30000);

  it('does not acknowledge a grouped retry when one requested membership was revoked', async () => {
    const owner = await actor(),
      recipient = await actor(),
      courseId = await course(owner);
    const first = await invite(owner, courseId, recipient.email, 'student');
    await invite(owner, courseId, recipient.email, 'instructor');
    expect(
      (
        await call(
          'invitation/join',
          { invite: first.invite, password, roles: ['instructor', 'student'] },
          randomToken(),
        )
      ).status,
    ).toBe(200);
    await database.db
      .prepare(
        "UPDATE course_memberships SET active=0 WHERE course_id=? AND user_id=? AND role='instructor'",
      )
      .bind(courseId, recipient.session.user_id)
      .run();
    await expect(
      store.acceptCourse(first.invite, recipient.session, [
        'instructor',
        'student',
      ]),
    ).rejects.toThrow();
    expect(await membership(courseId, recipient.email, 'instructor')).toEqual({
      active: 0,
    });
  }, 30000);

  it('recovers an existing provider identity only after mailbox proof and the explicit existing-password choice', async () => {
    const owner = await actor(),
      courseId = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu',
      uid = crypto.randomUUID();
    await provider.provision(uid, email);
    provider.passwords.set(uid, password);
    const before = (await provider.current(uid)).passwordAt;
    const i = await invite(owner, courseId, email, 'student');
    expect((await store.recoveryCandidate(email))?.firebase_uid).toBe(uid);
    expect(
      await (
        await call('invitation/preview', { invite: i.invite }, randomToken())
      ).json(),
    ).toMatchObject({ recovery: true, registered: false });
    expect(
      (
        await call(
          'invitation/join',
          {
            invite: i.invite,
            ticket: i.ticket,
            code: i.code,
            password: 'wrong password',
            mode: 'existing',
          },
          randomToken(),
        )
      ).status,
    ).not.toBe(200);
    expect((await provider.current(uid)).passwordAt).toBe(before);
    expect(
      (
        await call(
          'invitation/join',
          {
            invite: i.invite,
            ticket: i.ticket,
            code: i.code,
            password,
            mode: 'existing',
          },
          randomToken(),
        )
      ).status,
    ).toBe(200);
    expect((await store.account(email, provider.issuer))?.subject).toBe(uid);
    expect(provider.passwords.get(uid)).toBe(password);
    expect((await provider.current(uid)).passwordAt).toBe(before);
    expect(await membership(courseId, email, 'student')).toEqual({ active: 1 });
  }, 30000);

  it('recognizes a password changed after an earlier invitation and requires explicit recovery', async () => {
    const owner = await actor(),
      courseId = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu';
    const i = await invite(owner, courseId, email, 'student');
    const uid = (await database.db
      .prepare('SELECT firebase_uid FROM auth_invites WHERE id=?')
      .bind(i.id)
      .first<{ firebase_uid: string }>())!.firebase_uid;
    const changed = 'changed synthetic password';
    provider.passwords.set(uid, changed);
    provider.users.get(uid)!.passwordAt++;
    expect(
      (
        await call(
          'invitation/join',
          { invite: i.invite, ticket: i.ticket, code: i.code, password },
          randomToken(),
        )
      ).status,
    ).not.toBe(200);
    expect(provider.passwords.get(uid)).toBe(changed);
    expect(
      await (
        await call('invitation/preview', { invite: i.invite }, randomToken())
      ).json(),
    ).toMatchObject({ recovery: true });
    expect(
      (
        await call(
          'invitation/join',
          {
            invite: i.invite,
            ticket: i.ticket,
            code: i.code,
            password: changed,
            mode: 'existing',
          },
          randomToken(),
        )
      ).status,
    ).toBe(200);
    expect(provider.passwords.get(uid)).toBe(changed);
  }, 30000);

  it('renews proof safely when verified identity binding succeeded but admission failed', async () => {
    const owner = await actor(),
      courseId = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu',
      uid = crypto.randomUUID();
    await provider.provision(uid, email);
    provider.passwords.set(uid, password);
    const i = await invite(owner, courseId, email, 'student');
    const fail = vi
      .spyOn(store, 'admitCourseUser')
      .mockRejectedValueOnce(new Error('synthetic admission failure'));
    try {
      expect(
        (
          await call(
            'invitation/join',
            {
              invite: i.invite,
              ticket: i.ticket,
              code: i.code,
              password,
              mode: 'existing',
            },
            randomToken(),
          )
        ).status,
      ).not.toBe(200);
    } finally {
      fail.mockRestore();
    }
    expect((await store.recoveryCandidate(email))?.verified_at).not.toBeNull();
    expect(await store.account(email, provider.issuer)).toBeNull();
    expect(
      (await call('setup/request', { invite: i.invite }, randomToken())).status,
    ).toBe(202);
    const last = sent.filter((m) => m.email === email).at(-1)!;
    const fragment = new URLSearchParams(new URL(last.url).hash.slice(1));
    expect(
      (
        await call(
          'invitation/join',
          {
            invite: i.invite,
            ticket: fragment.get('ticket'),
            code: fragment.get('code'),
            password,
            mode: 'existing',
          },
          randomToken(),
        )
      ).status,
    ).toBe(200);
    expect((await store.account(email, provider.issuer))?.subject).toBe(uid);
    expect(provider.passwords.get(uid)).toBe(password);
  }, 30000);

  it('resets an existing provider identity only after explicit reset choice and valid proof', async () => {
    const owner = await actor(),
      courseId = await course(owner),
      email = crypto.randomUUID() + '@u.nus.edu',
      uid = crypto.randomUUID();
    await provider.provision(uid, email);
    provider.passwords.set(uid, password);
    const i = await invite(owner, courseId, email, 'instructor');
    const newPassword = 'new synthetic password 42';
    expect(
      (
        await call(
          'invitation/join',
          {
            invite: i.invite,
            ticket: i.ticket,
            code: i.code,
            password: newPassword,
          },
          randomToken(),
        )
      ).status,
    ).not.toBe(200);
    expect(provider.passwords.get(uid)).toBe(password);
    expect(
      (
        await call(
          'invitation/join',
          {
            invite: i.invite,
            ticket: i.ticket,
            code: i.code,
            password: newPassword,
            mode: 'reset',
          },
          randomToken(),
        )
      ).status,
    ).toBe(200);
    expect(provider.passwords.get(uid)).toBe(newPassword);
    expect((await store.account(email, provider.issuer))?.subject).toBe(uid);
    expect(await membership(courseId, email, 'instructor')).toEqual({
      active: 1,
    });
  }, 30000);
});
