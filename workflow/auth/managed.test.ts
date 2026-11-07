import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { authDatabase } from './database';
import { ManagedStore } from '../../src/server/auth/managed-store';
import { ManagedAuthRoutes } from '../../src/server/auth/managed-routes';
import {
  FirebaseCredentials,
  ProofRejected,
  firebaseConfig,
  nusEmail,
  passwordValue,
  boundedProviderJson,
} from '../../src/server/auth/firebase';
import { type AuthMailer, AuthEmail } from '../../src/server/auth/mail';
import {
  cookieName,
  csrfToken,
  hash,
  randomToken,
} from '../../src/server/auth/primitives';
import { managedInvitationListSchema } from '../../src/shared/managed-auth';
import examples from './firebase-examples.json';
import { sessionViewSchema } from '../../src/shared/instructor-contracts/identity';
import { BoundaryError } from '../../src/shared/instructor-contracts/schema';
import { takeAuthProof } from '../../src/web/auth/client';
import { trustedSessionChecks } from './conformance';
// @ts-expect-error Local operator is a standalone Node module.
import { operatorPlan } from './operator-plan.mjs';
const config = {
  origin: 'https://app.example.test',
  secure: true,
  clientId: '',
  clientSecret: '',
};
const password = 'synthetic student passphrase';
import { SyntheticFirebase } from './synthetic-firebase';

let database: Awaited<ReturnType<typeof authDatabase>>,
  store: ManagedStore,
  now = Date.now();
const provider = new SyntheticFirebase(),
  sent: { email: string; text: string }[] = [];
let mailState: 'queued' | 'failed' | 'unknown' = 'queued';
const mailer: AuthMailer = {
  async send(email, continuation) {
    const text = continuation;
    sent.push({ email, text });
    return { state: mailState, messageId: 'synthetic-receipt' };
  },
};
const courses = { requireCourse: vi.fn(async () => {}) };
const queued: Array<() => Promise<void>> = [];
const routes = () =>
  new ManagedAuthRoutes(
    store,
    config,
    provider,
    mailer,
    courses,
    undefined,
    (work) => queued.push(work),
  );
async function call(
  path: string,
  input?: unknown,
  token?: string,
  kind: 'session' | 'preauth' = 'preauth',
  target = routes(),
  origin = config.origin,
) {
  const response = await target.fetch(
    new Request(config.origin + '/api/auth/' + path, {
      method: input === undefined ? 'GET' : 'POST',
      headers: {
        ...(token
          ? {
              cookie: cookieName(config, kind) + '=' + token,
              'x-csrf-token': await csrfToken(token),
            }
          : {}),
        ...(input === undefined
          ? {}
          : { 'content-type': 'application/json', origin }),
      },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    }),
  );
  while (queued.length) await queued.shift()!();
  return response;
}
async function seed() {
  const uid = crypto.randomUUID(),
    email = uid + '@u.nus.edu',
    invite = randomToken(),
    browser = randomToken();
  await provider.provision(uid, email);
  await provider.verifyEmail(uid);
  provider.passwords.set(uid, password);
  await database.db
    .prepare(
      'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(?,?,?,?,?)',
    )
    .bind(crypto.randomUUID(), await hash(invite), email, now, now + 86400000)
    .run();
  const token = await store.loginManaged(
    browser,
    await provider.current(uid),
    provider.issuer,
    '/workspace',
    invite,
  );
  const session = await store.session(token);
  await database.db
    .prepare(
      "INSERT INTO course_memberships(course_id,user_id,role) VALUES('course-one',?,'instructor')",
    )
    .bind(session.user_id)
    .run();
  return { uid, email, token, browser, session };
}
function readMail(text: string) {
  const link = new URL(text);
  return takeAuthProof(link, () => {});
}
async function invite(
  admin: Awaited<ReturnType<typeof seed>>,
  email = crypto.randomUUID() + '@u.nus.edu',
) {
  // Explicit legacy null-role fixture tests retained admission-only compatibility.
  const token = randomToken(),
    inviteId = crypto.randomUUID();
  const prior = await database.db
    .prepare(
      'SELECT firebase_uid FROM auth_invites WHERE email=? AND firebase_uid IS NOT NULL ORDER BY created_at DESC LIMIT 1',
    )
    .bind(email)
    .first<{ firebase_uid: string }>();
  await database.db
    .prepare(
      'INSERT INTO auth_invites(id,token_hash,email,created_by,creator_session,created_at,expires_at,course_id,firebase_uid) VALUES(?,?,?,?,?,?,?,?,?)',
    )
    .bind(
      inviteId,
      await hash(token),
      email,
      admin.session.user_id,
      admin.session.id,
      now,
      8640000000000000,
      'course-one',
      prior?.firebase_uid ?? crypto.randomUUID(),
    )
    .run();
  expect(
    (await call('setup/request', { invite: token }, randomToken())).status,
  ).toBe(202);
  const mail = sent.filter((s) => s.email === email).at(-1)!;
  const proof = readMail(mail.text);
  return {
    id: inviteId,
    email,
    invite: proof.invite!,
    code: proof.code!,
    ticket: proof.ticket!,
  };
}
describe('Firebase native mail real isolated D1, synthetic provider boundaries', () => {
  beforeAll(async () => {
    database = await authDatabase();
    for (const name of [
      '0007_courses.sql',
      '0010_invitation_target_role.sql',
      '0011_invitation_identity_recovery.sql',
    ]) {
      const sql = await readFile('src/server/db/migrations/' + name, 'utf8');
      await database.db.batch(
        sql
          .split(/^-- statement\s*$/m)
          .map((s) => s.trim())
          .filter((s) => s.replace(/^--.*$/gm, '').trim())
          .map((s) => database.db.prepare(s)),
      );
    }
    await database.db
      .prepare(
        "INSERT INTO courses(id,name) VALUES('course-one','Synthetic course')",
      )
      .run();
    store = new ManagedStore(database.db, () => now);
  });
  afterAll(async () => {
    await database?.close();
  });
  trustedSessionChecks('Firebase managed', async () => {
    const user = await seed(),
      target = routes();
    return {
      request: new Request(config.origin + '/api/private', {
        headers: { cookie: cookieName(config, 'session') + '=' + user.token },
      }),
      requireSession: async (request: Request) =>
        (await target.requireSession(request)).principal,
      revoke: () => store.logout(user.token),
    };
  });
  it('invitation setup, password login, closed C-ID and unavailable workspace', async () => {
    const admin = await seed(),
      i = await invite(admin),
      browser = randomToken();
    expect((await call('setup/confirm', undefined)).status).toBe(401);
    const setup = await call(
      'setup/confirm',
      { invite: i.invite, code: i.code, ticket: i.ticket, password },
      browser,
    );
    expect(setup.status).toBe(200);
    expect(setup.headers.has('set-cookie')).toBe(false);
    const login = await call('login', { email: i.email, password }, browser);
    expect(login.status).toBe(200);
    const token = login.headers.get('set-cookie')!.split('=')[1].split(';')[0];
    const data = (await (
      await call('session', undefined, token, 'session')
    ).json()) as { session: unknown };
    expect(sessionViewSchema.parse(data.session).schemaVersion).toBe(1);
    expect(
      await (await call('workspace', undefined, token, 'session')).json(),
    ).toEqual({ state: 'unavailable', destination: null });
    expect(
      (
        await call(
          'setup/confirm',
          { invite: i.invite, code: i.code, ticket: i.ticket, password },
          browser,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await call(
          'login',
          { email: i.email, password: 'incorrect synthetic passphrase' },
          browser,
        )
      ).status,
    ).toBe(401);
  });
  it('rejects a different mailbox proof or dispatch ticket without consuming valid admission', async () => {
    const admin = await seed(),
      first = await invite(admin),
      second = await invite(admin),
      browser = randomToken();
    for (const input of [
      {
        invite: first.invite,
        ticket: first.ticket,
        code: second.code,
        password,
      },
      {
        invite: first.invite,
        ticket: second.ticket,
        code: first.code,
        password,
      },
      { invite: first.invite, code: first.code, password },
    ])
      expect((await call('setup/confirm', input, browser)).status).not.toBe(
        200,
      );
    expect(await store.account(first.email, provider.issuer)).toBeNull();
    expect(
      (
        await call(
          'setup/confirm',
          {
            invite: first.invite,
            ticket: first.ticket,
            code: first.code,
            password,
          },
          browser,
        )
      ).status,
    ).toBe(200);
  });
  it('non-expiring admission and expiring proof, without scanner side effects', async () => {
    const admin = await seed(),
      i = await invite(admin),
      browser = randomToken();
    now += 14 * 86400000;
    expect((await store.pending(i.invite)).id).toBe(i.id);
    expect(
      (
        await call(
          'setup/confirm',
          { invite: i.invite, code: i.code, ticket: i.ticket, password },
          browser,
        )
      ).status,
    ).toBe(401);
    expect(
      (await call('setup/request', { invite: i.invite }, browser)).status,
    ).toBe(202);
    expect(
      (
        await database.db
          .prepare('SELECT accepted_at FROM auth_invites WHERE id=?')
          .bind(i.id)
          .first<{ accepted_at: number | null }>()
      )?.accepted_at,
    ).toBeNull();
  });
  it('missing/denied Keith stops records/mail; other instructors cannot read or revoke', async () => {
    const admin = await seed(),
      email = crypto.randomUUID() + '@u.nus.edu',
      before = sent.length;
    const absent = new ManagedAuthRoutes(store, config, provider, mailer);
    expect(
      (
        await call(
          'invitations',
          { courseId: 'course-one', email, targetRole: 'student' },
          admin.token,
          'session',
          absent,
        )
      ).status,
    ).toBe(503);
    courses.requireCourse.mockRejectedValueOnce(new BoundaryError('FORBIDDEN'));
    expect(
      (
        await call(
          'invitations',
          { courseId: 'course-one', email, targetRole: 'student' },
          admin.token,
          'session',
        )
      ).status,
    ).toBe(403);
    expect(sent.length).toBe(before);
    const i = await invite(admin),
      other = await seed();
    await database.db
      .prepare(
        "UPDATE course_memberships SET active=0 WHERE course_id='course-one' AND user_id=?",
      )
      .bind(other.session.user_id)
      .run();
    courses.requireCourse.mockRejectedValueOnce(new BoundaryError('FORBIDDEN'));
    expect(
      (
        await call(
          'invitations/' + i.id + '/revoke',
          { courseId: 'course-one' },
          other.token,
          'session',
        )
      ).status,
    ).toBe(403);
    expect(
      managedInvitationListSchema.parse(
        await (
          await call(
            'invitations?courseId=course-one',
            undefined,
            other.token,
            'session',
          )
        ).json(),
      ).items,
    ).toEqual([]);
  });
  it('cross-origin, forged role and suffix-domain denial occurs before send', async () => {
    const admin = await seed(),
      before = sent.length;
    expect(
      (
        await call(
          'invitations',
          { courseId: 'course-one', email: 'x@u.nus.edu.attacker.test' },
          admin.token,
          'session',
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await call(
          'invitations',
          { courseId: 'course-one', email: 'x@u.nus.edu', role: 'instructor' },
          admin.token,
          'session',
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await call(
          'invitations',
          {
            courseId: 'course-one',
            email: 'x@u.nus.edu',
            targetRole: 'student',
          },
          admin.token,
          'session',
          routes(),
          'https://attacker.test',
        )
      ).status,
    ).toBe(403);
    expect(sent.length).toBe(before);
  });
  it('resend rotates proofs, lists exclude capabilities, revocation blocks setup', async () => {
    const admin = await seed(),
      i = await invite(admin),
      browser = randomToken();
    expect(
      (
        await call(
          'invitations/' + i.id + '/resend',
          { courseId: 'course-one' },
          admin.token,
          'session',
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await call(
          'setup/confirm',
          { invite: i.invite, code: i.code, ticket: i.ticket, password },
          browser,
        )
      ).status,
    ).toBe(401);
    const list = await (
      await call(
        'invitations?courseId=course-one',
        undefined,
        admin.token,
        'session',
      )
    ).text();
    expect(list).not.toContain(i.invite);
    expect(list).not.toContain('firebase_uid');
    expect(
      (
        await call(
          'invitations/' + i.id + '/revoke',
          { courseId: 'course-one' },
          admin.token,
          'session',
        )
      ).status,
    ).toBe(200);
  });
  it('reset changes password, rejects replay and revokes opaque sessions', async () => {
    const user = await seed();
    expect(
      (await call('reset/request', { email: user.email }, user.browser)).status,
    ).toBe(202);
    const mail = sent.filter((s) => s.email === user.email).at(-1)!;
    const { code, ticket } = readMail(mail.text);
    expect(
      (
        await call(
          'reset/confirm',
          { code, ticket, password: 'replacement synthetic passphrase' },
          user.browser,
        )
      ).status,
    ).toBe(200);
    expect(
      (await call('session', undefined, user.token, 'session')).status,
    ).toBe(401);
    expect(
      (await call('reset/confirm', { code, ticket, password }, user.browser))
        .status,
    ).toBe(401);
    expect(
      (await call('login', { email: user.email, password }, user.browser))
        .status,
    ).toBe(401);
    expect(
      (
        await call(
          'login',
          { email: user.email, password: 'replacement synthetic passphrase' },
          user.browser,
        )
      ).status,
    ).toBe(200);
  });
  it('external reset/disable invalidates D1 session; provider outage fails closed', async () => {
    const user = await seed();
    provider.users.get(user.uid)!.passwordAt++;
    expect(
      (await call('session', undefined, user.token, 'session')).status,
    ).toBe(401);
    const disabled = await seed();
    provider.users.get(disabled.uid)!.disabled = true;
    expect(
      (await call('session', undefined, disabled.token, 'session')).status,
    ).toBe(401);
    const unavailable = await seed();
    provider.unavailable = true;
    expect(
      (await call('session', undefined, unavailable.token, 'session')).status,
    ).toBe(503);
    provider.unavailable = false;
  });
  it('generic reset parity, consistent cooldown, unsolicited provider account denied', async () => {
    const user = await seed(),
      browser = randomToken(),
      unknown = crypto.randomUUID() + '@u.nus.edu';
    const known = await call('reset/request', { email: user.email }, browser),
      absent = await call('reset/request', { email: unknown }, browser);
    expect([known.status, absent.status]).toEqual([202, 202]);
    expect(await known.json()).toEqual(await absent.json());
    expect(
      (await call('reset/request', { email: unknown }, browser)).status,
    ).toBe(429);
    const uid = crypto.randomUUID();
    await provider.provision(uid, unknown);
    await provider.verifyEmail(uid);
    provider.passwords.set(uid, password);
    expect(
      (await call('login', { email: unknown, password }, browser)).status,
    ).toBe(401);
  });
  it('unknown transport outcomes never claim accepted invitation or inbox delivery', async () => {
    const admin = await seed();
    mailState = 'unknown';
    const i = await invite(admin);
    mailState = 'queued';
    const list = managedInvitationListSchema.parse(
      await (
        await call(
          'invitations?courseId=course-one',
          undefined,
          admin.token,
          'session',
        )
      ).json(),
    );
    expect(list.items.find((v) => v.id === i.id)).toMatchObject({
      status: 'pending',
      sendState: 'unknown',
    });
  });
  it('rejects old-password authentication racing a provider credential change', async () => {
    const user = await seed(),
      original = provider.login.bind(provider);
    const spy = vi
      .spyOn(provider, 'login')
      .mockImplementationOnce(async (email, value) => {
        const authenticated = await original(email, value);
        provider.users.get(authenticated.uid)!.passwordAt++;
        provider.users.get(authenticated.uid)!.validSince++;
        return provider.current(authenticated.uid);
      });
    expect(
      (await call('login', { email: user.email, password }, user.browser))
        .status,
    ).toBe(401);
    spy.mockRestore();
  });
  it('reinvites using trusted prior UID provenance, without linking arbitrary email accounts', async () => {
    const admin = await seed(),
      i = await invite(admin),
      uid = (await store.pending(i.invite)).firebase_uid;
    await call(
      'invitations/' + i.id + '/revoke',
      { courseId: 'course-one' },
      admin.token,
      'session',
    );
    now += 91000;
    const replacement = await invite(admin, i.email);
    expect((await store.pending(replacement.invite)).firebase_uid).toBe(uid);
    expect(
      (
        await call(
          'setup/confirm',
          {
            invite: replacement.invite,
            code: replacement.code,
            ticket: replacement.ticket,
            password,
          },
          randomToken(),
        )
      ).status,
    ).toBe(200);
  });
  it('acknowledges recovery before any provider/mail dispatch for known and unknown accounts', async () => {
    const user = await seed(),
      browser = randomToken(),
      work: Array<() => Promise<void>> = [];
    const target = new ManagedAuthRoutes(
      store,
      config,
      provider,
      mailer,
      courses,
      undefined,
      (fn) => work.push(fn),
    );
    const providerRead = vi.spyOn(provider, 'current'),
      mail = vi.spyOn(mailer, 'send');
    const before = providerRead.mock.calls.length,
      sentBefore = mail.mock.calls.length;
    expect(
      (
        await call(
          'reset/request',
          { email: user.email },
          browser,
          'preauth',
          target,
        )
      ).status,
    ).toBe(202);
    expect(
      (
        await call(
          'reset/request',
          { email: crypto.randomUUID() + '@u.nus.edu' },
          browser,
          'preauth',
          target,
        )
      ).status,
    ).toBe(202);
    expect(providerRead.mock.calls.length).toBe(before);
    expect(mail.mock.calls.length).toBe(sentBefore);
    expect(work).toHaveLength(2);
    for (const dispatch of work) await dispatch();
    providerRead.mockRestore();
    mail.mockRestore();
  });
  it('rechecks invitation and instructor authority after provider awaits, before dispatch', async () => {
    for (const revoke of ['invitation', 'authority']) {
      const admin = await seed(),
        email = crypto.randomUUID() + '@u.nus.edu',
        before = sent.length;
      let release!: () => void, entered!: () => void;
      const held = new Promise<void>((resolve) => {
          release = resolve;
        }),
        started = new Promise<void>((resolve) => {
          entered = resolve;
        });
      const original = provider.action.bind(provider);
      const spy = vi
        .spyOn(provider, 'action')
        .mockImplementationOnce(async (address) => {
          entered();
          await held;
          return original(address);
        });
      const sending = call(
        'invitations',
        { courseId: 'course-one', email, targetRole: 'student' },
        admin.token,
        'session',
      );
      await started;
      const i = await database.db
        .prepare('SELECT * FROM auth_invites WHERE email=?')
        .bind(email)
        .first<import('../../src/server/auth/managed-store').ManagedInvite>();
      await expect(store.rotate(i!, admin.session)).rejects.toThrow(); // In-flight provider generation is serialized.
      if (revoke === 'invitation') await store.revoke(i!, admin.session);
      else
        courses.requireCourse.mockRejectedValue(new BoundaryError('FORBIDDEN'));
      release();
      expect((await sending).status).toBe(201);
      expect(sent.length).toBe(before);
      spy.mockRestore();
      courses.requireCourse.mockImplementation(async () => {});
    }
  });
  it('fences stale action/receipt writes without invalidating a fresh generation', async () => {
    const admin = await seed(),
      i = await invite(admin),
      row = await store.pending(i.invite);
    const next = await store.rotate(row, admin.session),
      fresh = await provider.action(i.email);
    await store.action(
      fresh,
      { uid: row.firebase_uid, email: i.email },
      i.id,
      null,
      next,
    );
    await expect(
      store.action(
        randomToken(),
        { uid: row.firebase_uid, email: i.email },
        i.id,
        null,
        i.invite,
      ),
    ).rejects.toThrow();
    expect((await store.proof(fresh, 'setup', next)).email).toBe(i.email);
    await store.receipt(i.id, 'queued', 'new-synthetic', next);
    await store.receipt(i.id, 'failed', 'old-synthetic', i.invite);
    expect(
      (await store.owned(admin.session.user_id, 'course-one', i.id)).send_state,
    ).toBe('queued');
  });
  it('trusted operator bootstrap/mapping preserve IDs and Firebase disable/revoke target exact identities', async () => {
    const uid = crypto.randomUUID(),
      email = crypto.randomUUID() + '@u.nus.edu';
    await provider.provision(uid, email);
    await provider.verifyEmail(uid);
    provider.passwords.set(uid, password);
    const bootstrap = operatorPlan(
      ['bootstrap-firebase', 'synthetic-project', uid, email],
      now,
    );
    await database.db.batch(
      bootstrap.sql
        .split(';')
        .map((sql: string) => sql.trim())
        .filter(Boolean)
        .map((sql: string) => database.db.prepare(sql)),
    );
    const account = await store.account(email, provider.issuer);
    expect(account?.subject).toBe(uid);
    const token = await store.loginManaged(
      randomToken(),
      await provider.current(uid),
      provider.issuer,
      '/workspace',
      null,
    );
    const wrong = operatorPlan(
      ['disable-firebase', 'wrong-project', uid, account!.id],
      now,
    );
    await database.db.batch(
      wrong.sql
        .split(';')
        .map((sql: string) => sql.trim())
        .filter(Boolean)
        .map((sql: string) => database.db.prepare(sql)),
    );
    expect((await store.account(email, provider.issuer))?.active).toBe(1);
    const disable = operatorPlan(
      ['disable-firebase', 'synthetic-project', uid, account!.id],
      now,
    );
    await database.db.batch(
      disable.sql
        .split(';')
        .map((sql: string) => sql.trim())
        .filter(Boolean)
        .map((sql: string) => database.db.prepare(sql)),
    );
    expect((await call('session', undefined, token, 'session')).status).toBe(
      401,
    );
    expect((await store.account(email, provider.issuer))?.active).toBe(0);
    const legacyEmail = crypto.randomUUID() + '@u.nus.edu',
      legacySubject = crypto.randomUUID(),
      capability = randomToken(),
      browser = randomToken();
    await database.db
      .prepare(
        'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        await hash(capability),
        legacyEmail,
        now,
        now + 86400000,
      )
      .run();
    const start = await store.begin(browser, capability, '/workspace'),
      oldToken = await store.complete(await store.claim(start.state, browser), {
        issuer: 'https://accounts.google.com',
        subject: legacySubject,
        email: legacyEmail,
      });
    const legacy = await store.session(oldToken),
      newUid = crypto.randomUUID();
    await provider.provision(newUid, legacyEmail);
    await provider.verifyEmail(newUid);
    provider.passwords.set(newUid, password);
    const mapping = operatorPlan(
      [
        'map-firebase',
        'synthetic-project',
        newUid,
        legacy.user_id,
        legacySubject,
      ],
      now,
    );
    await database.db.batch(
      mapping.sql
        .split(';')
        .map((sql: string) => sql.trim())
        .filter(Boolean)
        .map((sql: string) => database.db.prepare(sql)),
    );
    expect((await store.account(legacyEmail, provider.issuer))?.id).toBe(
      legacy.user_id,
    );
    await expect(store.session(oldToken)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    const fresh = await store.loginManaged(
      browser,
      await provider.current(newUid),
      provider.issuer,
      '/workspace',
      null,
    );
    expect((await store.session(fresh)).user_id).toBe(legacy.user_id);
  });
  it('competing confirmation succeeds once and provider collision requires proof before linking', async () => {
    const admin = await seed(),
      i = await invite(admin),
      browser = randomToken();
    const results = await Promise.all([
      call(
        'setup/confirm',
        { invite: i.invite, code: i.code, ticket: i.ticket, password },
        browser,
      ),
      call(
        'setup/confirm',
        { invite: i.invite, code: i.code, ticket: i.ticket, password },
        browser,
      ),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    const email = crypto.randomUUID() + '@u.nus.edu';
    await provider.provision(crypto.randomUUID(), email);
    const r = await call(
      'invitations',
      { email, courseId: 'course-one', targetRole: 'student' },
      admin.token,
      'session',
    );
    expect(r.status).toBe(201);
    expect(
      ((await r.json()) as { invitation: { sendState: string } }).invitation
        .sendState,
    ).toBe('queued');
    expect(await store.account(email, provider.issuer)).toBeNull();
  });
});
describe('provider request contracts', () => {
  it('maps a definitively invalid Firebase reset proof to ProofRejected', async () => {
    const transport = vi.fn(async () =>
      Response.json(
        { error: { message: 'INVALID_OOB_CODE' } },
        { status: 400 },
      ),
    );
    const firebase = new FirebaseCredentials(
      {
        ...config,
        project: 'synthetic-project',
        apiKey: 'synthetic',
        serviceEmail: 'server@example.test',
        privateKey: '',
      },
      transport as typeof fetch,
    );
    const error = await firebase
      .reset('synthetic-proof', password)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProofRejected);
    expect(error).toBeInstanceOf(BoundaryError);
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('uses Worker-compatible manual redirects and rejects redirects without forwarding any request', async () => {
    const transport = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.redirect).toBe('manual');
        return new Response(null, {
          status: 302,
          headers: { Location: 'https://attacker.example/collect' },
        });
      },
    );
    const firebase = new FirebaseCredentials(
      {
        ...config,
        project: 'synthetic-project',
        apiKey: 'synthetic',
        serviceEmail: 'server@example.test',
        privateKey: '',
      },
      transport as typeof fetch,
    );
    await expect(firebase.inspect('synthetic-proof')).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('snapshots a live Location before replaceState clears its query', () => {
    const continuation =
      config.origin +
      '/sign-in#invite=' +
      'b'.repeat(64) +
      '&ticket=' +
      'a'.repeat(64);
    const location = new URL(
      config.origin +
        '/auth/action?' +
        new URLSearchParams({
          mode: 'resetPassword',
          oobCode: 'synthetic-live-proof',
          continueUrl: continuation,
        }),
    );
    const proof = takeAuthProof(location, (path) => {
      location.href = new URL(path, location.origin).href;
    });
    expect(proof).toEqual({
      invite: 'b'.repeat(64),
      ticket: 'a'.repeat(64),
      code: 'synthetic-live-proof',
    });
    expect(location.href).toBe(config.origin + '/sign-in');
  });
  it('native action handler strips secrets, validates the exact origin and rejects duplicate or unsupported actions', () => {
    const ticket = 'a'.repeat(64),
      invite = 'b'.repeat(64),
      replace = vi.fn();
    const native = (continuation: string, mode = 'resetPassword') =>
      new URL(
        config.origin +
          '/auth/action?' +
          new URLSearchParams({
            mode,
            oobCode: 'synthetic-proof',
            continueUrl: continuation,
          }),
      );
    const accepted = native(
      config.origin + '/sign-in#invite=' + invite + '&ticket=' + ticket,
    );
    expect(takeAuthProof(accepted, replace)).toEqual({
      invite,
      ticket,
      code: 'synthetic-proof',
    });
    expect(replace.mock.calls.at(-1)).toEqual(['/sign-in']);
    for (const link of [
      native('https://attacker.example/sign-in#ticket=' + ticket),
      native(config.origin + '/workspace#ticket=' + ticket),
      native(config.origin + '/auth/reset#ticket=' + ticket, 'verifyEmail'),
      new URL(accepted.href + '&oobCode=second-code'),
      native(
        config.origin + '/auth/reset#ticket=' + ticket + '&ticket=' + ticket,
      ),
      native(config.origin + '/auth/reset'),
    ]) {
      const result = takeAuthProof(link, replace);
      expect(result.code).toBeNull();
      expect(replace.mock.calls.at(-1)![0]).toMatch(/^\/auth\/reset$/);
    }
    expect(
      takeAuthProof(
        new URL(
          config.origin + '/sign-in#invite=' + invite + '&code=legacy-code',
        ),
        replace,
      ).code,
    ).toBeNull();
  });
  it('builds direct same-origin Codewise proof links without a Firebase email template', async () => {
    const transport = {
      send: vi.fn(async () => ({ state: 'queued' as const })),
    };
    const mailer = new AuthEmail(
      { sender: 'sender@gmail.com', origin: config.origin },
      transport,
    );
    const link =
      config.origin +
      '/auth/reset#ticket=' +
      'a'.repeat(64) +
      '&code=synthetic-code';
    expect((await mailer.send('x@u.nus.edu', link)).state).toBe('queued');
    expect(transport.send.mock.calls[0][0]).toMatchObject({
      sender: 'sender@gmail.com',
      recipient: 'x@u.nus.edu',
      subject: 'Reset your Codewise password',
    });
    expect(transport.send.mock.calls[0][0].text).toContain(link);
    await expect(
      mailer.send('x@u.nus.edu', 'https://attacker.example/auth/reset'),
    ).rejects.toThrow();
    await expect(
      mailer.send(
        'x@u.nus.edu',
        config.origin + '/auth/reset#code=synthetic-code',
      ),
    ).rejects.toThrow();
    expect(transport.send).toHaveBeenCalledTimes(1);
  });
  it('preserves ordinary page anchors and removes only auth capabilities', () => {
    const replace = vi.fn();
    expect(
      takeAuthProof(
        { pathname: '/', search: '', hash: '#workspaces' },
        replace,
      ),
    ).toEqual({ invite: null, code: null, ticket: null });
    expect(replace).not.toHaveBeenCalled();
    expect(
      takeAuthProof(
        {
          pathname: '/auth/reset',
          search: '',
          hash: '#code=synthetic-code&ticket=' + 'a'.repeat(64),
        },
        replace,
      ).code,
    ).toBe('synthetic-code');
    expect(replace).toHaveBeenCalledWith('/auth/reset');
  });
  it('validates configuration, exact domains, Unicode password bounds and closed DTOs', () => {
    expect(
      managedInvitationListSchema.parse(examples.invitationList).items[0]
        .status,
    ).toBe('pending');
    expect(sessionViewSchema.parse(examples.session).userId).toBe(
      'synthetic-user',
    );
    expect(firebaseConfig({ APP_ENV: 'development' })).toBeNull();
    expect(nusEmail('Student@U.NUS.EDU')).toBe('student@u.nus.edu');
    expect(() => nusEmail('x@u.nus.edu.attacker.test')).toThrow();
    expect(() => passwordValue('short')).toThrow();
    expect(passwordValue('😀'.repeat(64))).toBe('😀'.repeat(64));
    expect(() => passwordValue('😀'.repeat(65))).toThrow();
    expect(() =>
      managedInvitationListSchema.parse({
        items: [],
        nextCursor: null,
        role: 'instructor',
      }),
    ).toThrow();
  });
  it('maps expired provider proofs to safe authentication failure', async () => {
    const firebase = new FirebaseCredentials(
      {
        ...config,
        project: 'synthetic-project',
        apiKey: 'synthetic',
        serviceEmail: 'synthetic@example.test',
        privateKey: '',
      },
      vi.fn(async () =>
        Response.json(
          { error: { message: 'EXPIRED_OOB_CODE' } },
          { status: 400 },
        ),
      ) as typeof fetch,
    );
    await expect(firebase.inspect('expired-synthetic')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await expect(
      firebase.reset('expired-synthetic', password),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
  it('bounds provider response size and rejects malformed data', async () => {
    await expect(boundedProviderJson(new Response('['))).rejects.toThrow();
    await expect(
      boundedProviderJson(new Response('x'.repeat(65537))),
    ).rejects.toThrow();
  });
  it('Firebase signs OAuth, uses exact project/UID and validates provider reset purpose/email', async () => {
    const keys = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    );
    const pem = btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.exportKey('pkcs8', keys.privateKey),
        ),
      ),
    );
    const calls: { url: string; input: Record<string, unknown> }[] = [];
    const transport = vi.fn(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        const target = String(url);
        if (target === 'https://oauth2.googleapis.com/token') {
          const form = new URLSearchParams(String(init?.body));
          expect(form.get('grant_type')).toBe(
            'urn:ietf:params:oauth:grant-type:jwt-bearer',
          );
          const jwt = form.get('assertion')!.split('.'),
            sig = Uint8Array.from(
              atob(jwt[2].replace(/-/g, '+').replace(/_/g, '/')),
              (v) => v.charCodeAt(0),
            );
          expect(
            await crypto.subtle.verify(
              'RSASSA-PKCS1-v1_5',
              keys.publicKey,
              sig,
              new TextEncoder().encode(jwt[0] + '.' + jwt[1]),
            ),
          ).toBe(true);
          return Response.json({
            access_token: 'synthetic-access',
            expires_in: 3600,
          });
        }
        const input = JSON.parse(String(init?.body)) as Record<string, unknown>;
        calls.push({ url: target, input });
        if (target.includes('accounts:signInWithPassword'))
          return Response.json({
            localId: 'synthetic-uid',
            email: 'x@u.nus.edu',
          });
        if (target.endsWith(':lookup'))
          return Response.json({
            users: [
              {
                localId: 'synthetic-uid',
                email: 'x@u.nus.edu',
                emailVerified: true,
                passwordUpdatedAt: 1,
                validSince: '1',
              },
            ],
          });
        if (target.endsWith(':sendOobCode'))
          return Response.json({
            oobLink:
              'https://synthetic-project.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=synthetic-code',
          });
        if (target.includes('accounts:resetPassword'))
          return Response.json({
            requestType: 'PASSWORD_RESET',
            email: 'x@u.nus.edu',
          });
        return Response.json({});
      },
    );
    const firebase = new FirebaseCredentials(
      {
        ...config,
        project: 'synthetic-project',
        apiKey: 'synthetic-api',
        serviceEmail: 'synthetic@example.test',
        privateKey:
          '-----BEGIN PRIVATE KEY-----\n' + pem + '\n-----END PRIVATE KEY-----',
      },
      transport as typeof fetch,
    );
    expect((await firebase.login('x@u.nus.edu', password)).uid).toBe(
      'synthetic-uid',
    );
    expect(await firebase.action('x@u.nus.edu')).toBe('synthetic-code');
    expect(await firebase.inspect('synthetic-code')).toBe('x@u.nus.edu');
    expect(await firebase.reset('synthetic-code', password)).toBe(
      'x@u.nus.edu',
    );
    await firebase.provisionOwner('synthetic-uid', 'x@u.nus.edu', 'testpass');
    expect(
      calls.some(
        (c) =>
          c.input.localId === 'synthetic-uid' &&
          c.input.password === 'testpass' &&
          c.input.emailVerified === false,
      ),
    ).toBe(true);
    await firebase.verifyEmail('synthetic-uid');
    expect(
      calls.some((c) =>
        c.url.includes('/projects/synthetic-project/accounts:lookup'),
      ),
    ).toBe(true);
    expect(calls.some((c) => c.input.emailVerified === true)).toBe(true);
  });
});
