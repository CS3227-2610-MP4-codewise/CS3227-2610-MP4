import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import { authDatabase } from './database';
import { SyntheticFirebase } from './synthetic-firebase';
import { ManagedStore } from '../../src/server/auth/managed-store';
import { ManagedAuthRoutes } from '../../src/server/auth/managed-routes';
import { OwnerBootstrap, ownerConfig } from '../../src/server/auth/owner';
import { passwordValue } from '../../src/server/auth/firebase';
import {
  csrfToken,
  cookieName,
  randomToken,
  hash,
} from '../../src/server/auth/primitives';

const config = {
  origin: 'https://app.example.test',
  secure: true,
  clientId: '',
  clientSecret: '',
};
const email = 'operator-owner@u.nus.edu',
  password = 'testpass';
let database: Awaited<ReturnType<typeof authDatabase>>,
  store: ManagedStore,
  provider: SyntheticFirebase,
  now = Date.now();
function routes(bootstrap = true) {
  return new ManagedAuthRoutes(
    store,
    config,
    provider,
    undefined,
    undefined,
    undefined,
    undefined,
    bootstrap
      ? new OwnerBootstrap(store, provider, { email, password })
      : undefined,
  );
}
async function request(
  path: string,
  input?: unknown,
  options: {
    target?: ManagedAuthRoutes;
    token?: string;
    session?: boolean;
    origin?: string;
  } = {},
) {
  const token = options.token ?? randomToken(),
    kind = options.session ? 'session' : 'preauth';
  return (options.target ?? routes()).fetch(
    new Request(config.origin + '/api/auth/' + path, {
      method: input === undefined ? 'GET' : 'POST',
      headers: {
        cookie: cookieName(config, kind) + '=' + token,
        'X-CSRF-Token': await csrfToken(token),
        ...(input === undefined
          ? {}
          : {
              Origin: options.origin ?? config.origin,
              'Content-Type': 'application/json',
            }),
      },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    }),
  );
}
const login = () => request('login', { email, password });
const tokenOf = (response: Response) =>
  response.headers.get('set-cookie')!.split('=')[1].split(';')[0];
async function fresh() {
  provider = new SyntheticFirebase();
  store = new ManagedStore(database.db, () => now);
}
beforeAll(async () => {
  database = await authDatabase();
  await fresh();
});
afterAll(async () => {
  await database?.close();
});

beforeEach(() => {
  now += 61000;
});

describe('one-time operator owner bootstrap in actual isolated D1', () => {
  it('validates explicit owner configuration and revised Unicode password bounds', () => {
    expect(ownerConfig({})).toBeNull();
    expect(
      ownerConfig({
        BOOTSTRAP_OWNER_EMAIL: email,
        BOOTSTRAP_OWNER_PASSWORD: 'short',
      }),
    ).toBeNull();
    expect(
      ownerConfig({
        BOOTSTRAP_OWNER_EMAIL: email,
        BOOTSTRAP_OWNER_PASSWORD: password,
      }),
    ).toEqual({ email, password });
    for (const count of [7, 65])
      expect(() => passwordValue('😀'.repeat(count))).toThrow();
    for (const count of [8, 64])
      expect(passwordValue('😀'.repeat(count))).toBe('😀'.repeat(count));
  });
  it('makes no bootstrap writes for wrong credentials, forged browser flags or cross-origin requests', async () => {
    const spy = vi.spyOn(provider, 'provisionOwner');
    expect(
      (await request('login', { email, password: 'wrongpass' })).status,
    ).toBe(401);
    expect(
      (await request('login', { email, password, administrator: true })).status,
    ).toBe(400);
    expect(
      (
        await request(
          'login',
          { email, password },
          { origin: 'https://attacker.example' },
        )
      ).status,
    ).toBe(403);
    expect(
      await database.db
        .prepare('SELECT singleton FROM auth_owner_bootstrap')
        .first(),
    ).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it('bootstraps once, retains an unverified mailbox, and survives a new app instance without bootstrap secrets', async () => {
    const response = await login();
    expect(response.status).toBe(200);
    const token = tokenOf(response);
    const marker = await database.db
      .prepare('SELECT * FROM auth_owner_bootstrap')
      .first<{ subject: string; account_id: string; completed_at: number }>();
    expect(marker?.completed_at).not.toBeNull();
    expect(provider.users.get(marker!.subject)?.verified).toBe(false);
    expect(
      (await database.db
        .prepare('SELECT COUNT(*) AS n FROM auth_accounts')
        .first<{ n: number }>())!.n,
    ).toBe(1);
    const session = await request('session', undefined, {
      target: routes(false),
      session: true,
      token,
    });
    expect(session.status).toBe(200);
    expect(await session.json()).toMatchObject({
      email,
      administrator: true,
      session: { userId: marker!.account_id },
    });
    expect(
      (await request('login', { email, password }, { target: routes(false) }))
        .status,
    ).toBe(200);
    expect(
      (
        await request(
          'login',
          { email, password },
          {
            target: new ManagedAuthRoutes(
              store,
              config,
              provider,
              undefined,
              undefined,
              undefined,
              undefined,
              new OwnerBootstrap(store, provider, {
                email: 'other@u.nus.edu',
                password: 'different-pass',
              }),
            ),
          },
        )
      ).status,
    ).toBe(200);
    expect(
      (await database.db
        .prepare('SELECT COUNT(*) AS n FROM auth_owner_bootstrap')
        .first<{ n: number }>())!.n,
    ).toBe(1);
  });
  it('owner is not course authority and no fabricated workspace or mail permission is returned', async () => {
    const response = await login(),
      token = tokenOf(response);
    expect(
      await (
        await request('workspace', undefined, { session: true, token })
      ).json(),
    ).toEqual({ state: 'unavailable', destination: null });
    expect(
      (
        await request(
          'invitations',
          { email: 'student@u.nus.edu', courseId: 'invented' },
          { session: true, token },
        )
      ).status,
    ).toBe(503);
  });
  it('completion is immutable and a changed provider credential cannot take over even with emailVerified=true', async () => {
    const response = await login(),
      token = tokenOf(response),
      marker = await database.db
        .prepare('SELECT subject FROM auth_owner_bootstrap')
        .first<{ subject: string }>();
    await expect(
      database.db
        .prepare(
          'UPDATE auth_owner_bootstrap SET completed_at=NULL,account_id=NULL,password_at=NULL,valid_since=NULL',
        )
        .run(),
    ).rejects.toThrow();
    await expect(
      database.db.prepare('DELETE FROM auth_owner_bootstrap').run(),
    ).rejects.toThrow();
    const user = provider.users.get(marker!.subject)!;
    user.passwordAt++;
    user.validSince++;
    user.verified = true;
    expect(
      (await request('session', undefined, { token, session: true })).status,
    ).toBe(401);
    expect((await login()).status).toBe(401);
    const admins = await database.db
      .prepare('SELECT COUNT(*) AS n FROM auth_administrators')
      .first<{ n: number }>();
    expect(admins!.n).toBe(1);
    user.passwordAt--;
    user.validSince--;
    user.verified = false; // Restore the isolated fixture for later state tests only.
  });
  it('does not reactivate or recreate a disabled owner and admin revocation removes the unverified exception', async () => {
    const marker = await database.db
      .prepare('SELECT account_id,subject FROM auth_owner_bootstrap')
      .first<{ account_id: string; subject: string }>();
    await database.db
      .prepare('UPDATE auth_accounts SET active=0 WHERE id=?')
      .bind(marker!.account_id)
      .run();
    expect((await login()).status).toBe(401);
    await database.db
      .prepare('UPDATE auth_accounts SET active=1 WHERE id=?')
      .bind(marker!.account_id)
      .run();
    await database.db
      .prepare('DELETE FROM auth_administrators WHERE user_id=?')
      .bind(marker!.account_id)
      .run();
    expect((await login()).status).toBe(401);
    expect(
      await database.db
        .prepare('SELECT user_id FROM auth_administrators')
        .first(),
    ).toBeNull();
  });
});

describe('bootstrap concurrency and interrupted provisioning', () => {
  it('expires a provisioning lease before completion without granting owner access, then permits a trusted retry', async () => {
    const isolated = await authDatabase();
    let clock = Date.now();
    const localStore = new ManagedStore(isolated.db, () => clock),
      firebase = new SyntheticFirebase();
    try {
      const original = firebase.current.bind(firebase);
      let calls = 0;
      const spy = vi
        .spyOn(firebase, 'current')
        .mockImplementation(async (uid) => {
          const user = await original(uid);
          if (++calls === 2) clock += 120001;
          return user;
        });
      const owner = new OwnerBootstrap(localStore, firebase, {
        email,
        password,
      });
      await expect(
        owner.ensure(email, password, randomToken()),
      ).rejects.toThrow();
      spy.mockRestore();
      expect(
        await isolated.db
          .prepare('SELECT user_id FROM auth_administrators')
          .first(),
      ).toBeNull();
      expect(
        (await isolated.db
          .prepare('SELECT completed_at FROM auth_owner_bootstrap')
          .first<{ completed_at: number | null }>())!.completed_at,
      ).toBeNull();
      expect(
        (await isolated.db
          .prepare(
            'SELECT COUNT(*) AS n FROM auth_sessions WHERE revoked_at IS NULL',
          )
          .first<{ n: number }>())!.n,
      ).toBe(0);
      await owner.ensure(email, password, randomToken());
      expect(
        (await isolated.db
          .prepare('SELECT COUNT(*) AS n FROM auth_administrators')
          .first<{ n: number }>())!.n,
      ).toBe(1);
    } finally {
      await isolated.close();
    }
  });
  it('admits one owner across concurrent first logins and safely retries after partial provider failure', async () => {
    const isolated = await authDatabase();
    const localStore = new ManagedStore(isolated.db),
      firebase = new SyntheticFirebase(),
      owner = new OwnerBootstrap(localStore, firebase, { email, password });
    try {
      const original = firebase.provisionOwner.bind(firebase);
      let failed = false;
      const spy = vi
        .spyOn(firebase, 'provisionOwner')
        .mockImplementation(async (...args) => {
          await original(...args);
          if (!failed) {
            failed = true;
            throw Error('synthetic interrupted provisioning');
          }
        });
      await expect(
        owner.ensure(email, password, randomToken()),
      ).rejects.toThrow();
      spy.mockRestore();
      const results = await Promise.allSettled([
        owner.ensure(email, password, randomToken()),
        owner.ensure(email, password, randomToken()),
      ]);
      expect(results.some((result) => result.status === 'fulfilled')).toBe(
        true,
      );
      expect(
        (await isolated.db
          .prepare('SELECT COUNT(*) AS n FROM auth_accounts')
          .first<{ n: number }>())!.n,
      ).toBe(1);
      expect(
        (await isolated.db
          .prepare('SELECT COUNT(*) AS n FROM auth_administrators')
          .first<{ n: number }>())!.n,
      ).toBe(1);
      expect(firebase.users.size).toBe(1);
      expect([...firebase.users.values()][0].verified).toBe(false);
      expect(
        (await isolated.db
          .prepare(
            'SELECT COUNT(*) AS n FROM auth_sessions WHERE revoked_at IS NULL',
          )
          .first<{ n: number }>())!.n,
      ).toBe(0);
    } finally {
      await isolated.close();
    }
  });
  it('refuses preexisting email collisions rather than resetting or linking a foreign UID', async () => {
    const isolated = await authDatabase(),
      localStore = new ManagedStore(isolated.db),
      firebase = new SyntheticFirebase();
    try {
      await firebase.provision('foreign-subject', email);
      firebase.passwords.set('foreign-subject', password);
      await expect(
        new OwnerBootstrap(localStore, firebase, { email, password }).ensure(
          email,
          password,
          randomToken(),
        ),
      ).rejects.toThrow();
      expect(
        await isolated.db.prepare('SELECT id FROM auth_accounts').first(),
      ).toBeNull();
      expect(
        await isolated.db
          .prepare('SELECT user_id FROM auth_administrators')
          .first(),
      ).toBeNull();
      expect(firebase.passwords.get('foreign-subject')).toBe(password);
    } finally {
      await isolated.close();
    }
  });
  it('ordinary unverified Firebase users never receive owner admission', async () => {
    const uid = crypto.randomUUID(),
      address = 'not-owner@u.nus.edu',
      invite = randomToken(),
      browser = randomToken();
    await provider.provision(uid, address);
    provider.passwords.set(uid, password);
    await database.db
      .prepare(
        'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        await hash(invite),
        address,
        now,
        now + 86400000,
      )
      .run();
    await store.loginManaged(
      browser,
      await provider.current(uid),
      provider.issuer,
      '/workspace',
      invite,
    );
    expect(
      (
        await request(
          'login',
          { email: address, password },
          { target: routes(false) },
        )
      ).status,
    ).toBe(401);
  });
});
