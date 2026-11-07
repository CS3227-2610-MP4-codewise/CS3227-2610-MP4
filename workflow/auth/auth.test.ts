import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { authDatabase } from './database';
import { AuthStore } from '../../src/server/auth/store';
import { AuthRoutes } from '../../src/server/auth/routes';
import {
  ABSOLUTE,
  IDLE,
  INVITE_TTL,
  authConfig,
  cookieName,
  csrfToken,
  hash,
  randomToken,
  readCookie,
  returnDestination,
  setCookie,
  verifyCsrf,
} from '../../src/server/auth/primitives';
import { sessionViewSchema } from '../../src/shared/instructor-contracts/identity';
import { authViewSchema } from '../../src/shared/auth';
import { takeInvitation } from '../../src/web/auth/client';
import { trustedSessionChecks } from './conformance';
import examples from './examples.json';
import { invitationListSchema, workspaceSchema } from '../../src/shared/auth';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
const config = {
  origin: 'https://app.example.test',
  clientId: 'synthetic-client',
  clientSecret: 'synthetic-not-a-credential',
  secure: true,
};
let database: Awaited<ReturnType<typeof authDatabase>>,
  store: AuthStore,
  now = Date.now();
const identity = (
  subject = crypto.randomUUID(),
  email = 'member@example.test',
) => ({ issuer: 'https://accounts.google.com', subject, email });
async function invitation(email = 'member@example.test') {
  const token = randomToken();
  await database.db
    .prepare(
      'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(?,?,?,?,?)',
    )
    .bind(crypto.randomUUID(), await hash(token), email, now, now + INVITE_TTL)
    .run();
  return token;
}
async function transaction(invite: string | null) {
  const browser = randomToken(),
    start = await store.begin(browser, invite, '/workspace');
  return store.claim(start.state, browser);
}
async function member() {
  const id = identity(),
    token = await store.complete(await transaction(await invitation()), id);
  return { id, token, session: await store.session(token) };
}
const request = (
  path: string,
  token?: string,
  method = 'GET',
  extra: Record<string, string> = {},
  data: unknown = {},
) =>
  new Request(config.origin + '/api/auth/' + path, {
    method,
    headers: {
      ...(token ? { cookie: cookieName(config, 'session') + '=' + token } : {}),
      ...(method === 'POST'
        ? { origin: config.origin, 'content-type': 'application/json' }
        : {}),
      ...extra,
    },
    ...(method === 'POST' ? { body: JSON.stringify(data) } : {}),
  });
describe('SH-AUTH real local D1 / SHA-01–06 AUTH-01–03 CON-03/07', () => {
  beforeAll(async () => {
    database = await authDatabase();
    store = new AuthStore(database.db, () => now);
  });
  afterAll(async () => {
    await database?.close();
  });
  it('requires invitation, never links two subjects by matching email, consumes once atomically', async () => {
    const invite = await invitation(),
      a = identity();
    const token = await store.complete(await transaction(invite), a);
    expect((await store.session(token)).email).toBe(a.email);
    await expect(
      store.complete(await transaction(invite), identity()),
    ).rejects.toThrow();
    await expect(
      store.complete(await transaction(null), identity()),
    ).rejects.toThrow();
    expect(
      await database.db
        .prepare('SELECT count(*) AS n FROM auth_accounts WHERE email=?')
        .bind(a.email)
        .first('n'),
    ).toBe(1);
    expect(await store.complete(await transaction(null), a)).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });
  it('serializes competing subjects and existing subject mapping races', async () => {
    const invite = await invitation();
    const ts = await Promise.all([transaction(invite), transaction(invite)]);
    const results = await Promise.allSettled(
      ts.map((t) => store.complete(t, identity())),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const a = await member(),
      fresh = await invitation();
    const transactions = await Promise.all([
      transaction(fresh),
      transaction(fresh),
    ]);
    const same = await Promise.allSettled(
      transactions.map((t) => store.complete(t, a.id)),
    );
    expect(same.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('keeps the same account when Google changes its verified email without email auto-linking', async () => {
    const a = await member(),
      changed = { ...a.id, email: 'changed@example.test' };
    const token = await store.complete(await transaction(null), changed),
      current = await store.session(token);
    expect(current.user_id).toBe(a.session.user_id);
    expect(current.email).toBe(changed.email);
    await expect(
      store.complete(
        await transaction(null),
        identity(crypto.randomUUID(), changed.email),
      ),
    ).rejects.toThrow();
  });
  it('maps concurrent fresh logins to exactly one issuer/subject account', async () => {
    const id = identity(),
      a = await transaction(await invitation()),
      b = await transaction(await invitation());
    const tokens = await Promise.all([
      store.complete(a, id),
      store.complete(b, id),
    ]);
    expect((await store.session(tokens[0])).user_id).toBe(
      (await store.session(tokens[1])).user_id,
    );
    expect(
      await database.db
        .prepare(
          'SELECT count(*) AS n FROM auth_accounts WHERE issuer=? AND subject=?',
        )
        .bind(id.issuer, id.subject)
        .first('n'),
    ).toBe(1);
  });
  it('rechecks disabled accounts after callback lookup and revoked admin sessions at write', async () => {
    const a = await member(),
      t = await transaction(null);
    await database.db
      .prepare('UPDATE auth_accounts SET active=0 WHERE id=?')
      .bind(a.session.user_id)
      .run();
    await expect(store.complete(t, a.id)).rejects.toThrow();
    const b = await member();
    await database.db
      .prepare('INSERT INTO auth_administrators VALUES(?)')
      .bind(b.session.user_id)
      .run();
    await store.logout(b.token);
    await expect(
      store.createInvite(b.session, 'denied@example.test'),
    ).rejects.toThrow();
  });
  it('binds callbacks to browser; replay and expired state fail', async () => {
    const browser = randomToken(),
      start = await store.begin(browser, null, '/workspace');
    await expect(store.claim(start.state, randomToken())).rejects.toThrow();
    await store.claim(start.state, browser);
    await expect(store.claim(start.state, browser)).rejects.toThrow();
    const expired = await store.begin(browser, null, '/workspace');
    now += 10 * 60_000;
    await expect(store.claim(expired.state, browser)).rejects.toThrow();
  });
  it('composes callback cookies, cancellation, cross-browser refusal and one-use routes without reflecting secrets', async () => {
    const browser = randomToken(),
      start = await store.begin(browser, await invitation(), '/workspace'),
      exchange = vi.fn(async () => identity());
    const routes = new AuthRoutes(store, config, {
      authorization: vi.fn(),
      exchange,
    });
    const callback = (
      state: string,
      cookie = browser,
      suffix = 'code=synthetic-code',
    ) =>
      new Request(
        config.origin + '/api/auth/callback?' + suffix + '&state=' + state,
        { headers: { cookie: cookieName(config, 'preauth') + '=' + cookie } },
      );
    const refused = await routes.fetch(callback(start.state, randomToken()));
    expect(refused.headers.get('location')).toBe('/sign-in?notice=failed');
    expect(exchange).not.toHaveBeenCalled();
    const result = await routes.fetch(callback(start.state));
    expect(result.headers.get('location')).toBe('/auth/finish');
    expect(result.headers.getSetCookie()).toHaveLength(2);
    expect(result.headers.get('referrer-policy')).toBe('no-referrer');
    expect(exchange).toHaveBeenCalledOnce();
    expect(
      (await routes.fetch(callback(start.state))).headers.get('location'),
    ).toBe('/sign-in?notice=failed');
    const cancelled = await store.begin(browser, null, '/workspace');
    expect(
      (
        await routes.fetch(
          callback(
            cancelled.state,
            browser,
            'error=access_denied&error_description=PRIVATE',
          ),
        )
      ).headers.get('location'),
    ).toBe('/sign-in?notice=cancelled');
    expect(exchange).toHaveBeenCalledOnce();
  });
  it('rolls back account creation when revoked/expired invite is observed at commit', async () => {
    for (const kind of ['revoked', 'expired']) {
      const token = await invitation(),
        t = await transaction(token),
        a = identity();
      if (kind === 'revoked')
        await database.db
          .prepare('UPDATE auth_invites SET revoked_at=? WHERE token_hash=?')
          .bind(now, await hash(token))
          .run();
      else
        await database.db
          .prepare(
            'UPDATE auth_invites SET created_at=?,expires_at=? WHERE token_hash=?',
          )
          .bind(now - 1, now, await hash(token))
          .run();
      await expect(store.complete(t, a)).rejects.toThrow();
      expect(
        await database.db
          .prepare('SELECT id FROM auth_accounts WHERE subject=?')
          .bind(a.subject)
          .first(),
      ).toBeNull();
    }
  });
  it('cannot reactivate a disabled account or resurrect logout/idle/absolute expiry', async () => {
    const a = await member();
    await store.logout(a.token);
    await expect(store.session(a.token)).rejects.toThrow();
    const b = await member();
    now += IDLE;
    await expect(store.session(b.token)).rejects.toThrow();
    const c = await member();
    now++;
    await database.db
      .prepare('UPDATE auth_sessions SET last_seen=?,expires_at=? WHERE id=?')
      .bind(now, now, c.session.id)
      .run();
    await expect(store.session(c.token)).rejects.toThrow();
    const d = await member();
    await database.db
      .prepare('UPDATE auth_accounts SET active=0 WHERE id=?')
      .bind(d.session.user_id)
      .run();
    await expect(store.session(d.token)).rejects.toThrow();
    await expect(
      store.complete(await transaction(await invitation()), d.id),
    ).rejects.toThrow();
    expect(ABSOLUTE).toBe(8 * 60 * 60_000);
  });
  it('rotates the old browser session atomically only after successful authentication', async () => {
    const a = await member(),
      browser = randomToken(),
      start = await store.begin(browser, null, '/workspace', a.token),
      t = await store.claim(start.state, browser);
    const replacement = await store.complete(t, a.id);
    await expect(store.session(a.token)).rejects.toThrow();
    expect((await store.session(replacement)).user_id).toBe(a.session.user_id);
    const second = await member(),
      b = randomToken(),
      s = await store.begin(b, null, '/workspace', second.token);
    await expect(
      store.complete(await store.claim(s.state, b), identity()),
    ).rejects.toThrow();
    expect((await store.session(second.token)).user_id).toBe(
      second.session.user_id,
    );
  });
  it('rechecks admin authority at writes and lists only public status metadata', async () => {
    const a = await member();
    await expect(
      store.createInvite(a.session, 'new@example.test'),
    ).rejects.toThrow();
    await database.db
      .prepare('INSERT INTO auth_administrators VALUES(?)')
      .bind(a.session.user_id)
      .run();
    const r = await store.createInvite(a.session, 'new@example.test');
    expect(
      JSON.stringify(await store.invitations(a.session, '')),
    ).not.toContain(r.token);
    await store.revokeInvite(a.session, r.invitation.id);
    expect(
      (
        await database.db
          .prepare('SELECT revoked_at FROM auth_invites WHERE id=?')
          .bind(r.invitation.id)
          .first()
      )?.revoked_at,
    ).toBe(now);
    await database.db
      .prepare('DELETE FROM auth_administrators WHERE user_id=?')
      .bind(a.session.user_id)
      .run();
    await expect(
      store.createInvite(a.session, 'new@example.test'),
    ).rejects.toThrow();
    await expect(
      store.revokeInvite(a.session, r.invitation.id),
    ).rejects.toThrow();
  });
  it('enforces route CSRF/origin; projects closed C-ID; never calls a private reader before Keith authorization', async () => {
    const a = await member(),
      provider = { authorization: vi.fn(), exchange: vi.fn() },
      routes = new AuthRoutes(store, config, provider);
    const response = await routes.fetch(request('session', a.token));
    const value = authViewSchema.parse(await response.json());
    sessionViewSchema.parse(value.session);
    expect(Object.keys(value.session).sort()).toEqual([
      'expiresAt',
      'schemaVersion',
      'userId',
    ]);
    expect(
      (await routes.fetch(request('logout', a.token, 'POST'))).status,
    ).toBe(403);
    expect(
      (
        await routes.fetch(
          request('logout', a.token, 'POST', {
            'x-csrf-token': value.csrfToken,
            origin: 'https://evil.test',
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      await (await routes.fetch(request('workspace', a.token))).json(),
    ).toEqual({ state: 'unavailable', destination: null });
    const authorize = vi.fn(async () => {
      throw new Error('deny');
    });
    const guarded = new AuthRoutes(store, config, provider, { authorize });
    expect((await guarded.fetch(request('workspace', a.token))).status).toBe(
      503,
    );
    expect(authorize).toHaveBeenCalledOnce();
    expect(
      (
        await routes.fetch(
          request('logout', a.token, 'POST', {
            'x-csrf-token': value.csrfToken,
          }),
        )
      ).status,
    ).toBe(200);
    expect((await routes.fetch(request('session', a.token))).status).toBe(401);
  });
  it('fails configured-disabled, rejects forged browser privileges and never opens feature routes', async () => {
    const routes = new AuthRoutes(store, null);
    expect(await (await routes.fetch(request('bootstrap'))).json()).toEqual({
      configured: false,
      csrfToken: '',
    });
    expect((await routes.fetch(request('session'))).status).toBe(503);
    const active = new AuthRoutes(store, config, {
      authorization: vi.fn(),
      exchange: vi.fn(),
    });
    expect(
      (
        await active.fetch(
          request(
            'invitations',
            randomToken(),
            'POST',
            {},
            { email: 'x@example.test', role: 'instructor' },
          ),
        )
      ).status,
    ).toBe(401);
  });
  trustedSessionChecks('Actual local D1 SH-AUTH', async () => {
    const a = await member(),
      routes = new AuthRoutes(store, config, {
        authorization: vi.fn(),
        exchange: vi.fn(),
      });
    return {
      request: request('workspace', a.token),
      requireSession: async (r: Request) =>
        (await routes.requireSession(r)).principal,
      revoke: () => store.logout(a.token),
    };
  });
});
describe('auth transport and UI capability handling', () => {
  it('validates exact synthetic public handoff examples and rejects role/private envelope widening', () => {
    sessionViewSchema.parse(examples.sessionView);
    invitationListSchema.parse(examples.invitationList);
    workspaceSchema.parse(examples.unavailableWorkspace);
    workspaceSchema.parse(examples.authorizedDestination);
    expect(() =>
      sessionViewSchema.parse({ ...examples.sessionView, role: 'instructor' }),
    ).toThrow();
    expect(() =>
      invitationListSchema.parse({
        ...examples.invitationList,
        token: 'private',
      }),
    ).toThrow();
  });
  it('persists the authoritative D1 session across runtime restart', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'codewise-auth-restart-'));
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !directory.includes('codewise-auth-restart-')
    )
      throw new Error('Unsafe test cleanup');
    let db = await authDatabase(directory);
    try {
      const s = new AuthStore(db.db),
        now = Date.now(),
        raw = randomToken(),
        browser = randomToken();
      await db.db
        .prepare(
          'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          await hash(raw),
          'restart@example.test',
          now,
          now + INVITE_TTL,
        )
        .run();
      const t = await s.begin(browser, raw, '/workspace'),
        token = await s.complete(
          await s.claim(t.state, browser),
          identity('restart', 'restart@example.test'),
        );
      await db.close();
      db = await authDatabase(directory);
      expect((await new AuthStore(db.db).session(token)).email).toBe(
        'restart@example.test',
      );
    } finally {
      await db.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 30000);
  it('rejects unsafe returns and insecure production config', () => {
    for (const value of [
      '//evil.test',
      'https://evil.test',
      '/workspace?role=admin',
      '/%2f%2fevil',
      '/workspace#x',
      '/instructor/assignments/../x',
      '/workspace\\x',
    ])
      expect(() => returnDestination(value)).toThrow();
    expect(returnDestination('/instructor/assignments/id_1')).toContain('id_1');
    expect(
      authConfig({
        APP_ENV: 'production',
        AUTH_ORIGIN: 'http://localhost',
        GOOGLE_CLIENT_ID: 'x',
        GOOGLE_CLIENT_SECRET: 'x',
      }),
    ).toBeNull();
  });
  it('uses secure cookies and session-bound CSRF, denies ambiguous cookies', async () => {
    const bearer = randomToken(),
      csrf = await csrfToken(bearer);
    await verifyCsrf(
      new Request('https://example.test', {
        headers: { 'x-csrf-token': csrf },
      }),
      bearer,
    );
    await expect(
      verifyCsrf(
        new Request('https://example.test', {
          headers: { 'x-csrf-token': csrf },
        }),
        randomToken(),
      ),
    ).rejects.toThrow();
    expect(setCookie(config, 'session', bearer, 10)).toContain(
      '__Host-codewise-session=',
    );
    expect(setCookie(config, 'session', bearer, 10)).toContain('; Secure');
    expect(() =>
      readCookie(
        new Request('https://example.test', {
          headers: { cookie: 'x=' + bearer + '; x=' + bearer },
        }),
        'x',
      ),
    ).toThrow();
  });
  it('clears invitation fragments before requests without local storage', () => {
    const token = randomToken(),
      replace = vi.fn();
    expect(
      takeInvitation(
        { hash: '#invite=' + token, pathname: '/sign-in', search: '' },
        replace,
      ),
    ).toBe(token);
    expect(replace).toHaveBeenCalledWith('/sign-in');
    replace.mockClear();
    expect(
      takeInvitation(
        { hash: '#workspaces', pathname: '/', search: '' },
        replace,
      ),
    ).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    expect(
      takeInvitation(
        { hash: '#invite=bad', pathname: '/sign-in', search: '' },
        replace,
      ),
    ).toBeNull();
  });
});
