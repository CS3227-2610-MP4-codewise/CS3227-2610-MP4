import {
  BoundaryError,
  assert,
  object,
  toSafeError,
  id,
} from '../../shared/instructor-contracts/schema';
import type {
  IdentityCoursePort,
  TrustedPrincipal,
} from '../instructor/ports/contracts';
import {
  AuthRoutes,
  authHeaders,
  type DestinationAuthorization,
} from './routes';
import { ManagedStore, inviteView, type ManagedInvite } from './managed-store';
import { nusEmail, passwordValue, type CredentialProvider } from './firebase';
import { requireMailer, type AuthMailer } from './brevo';
import {
  ABSOLUTE,
  LOGIN_TTL,
  cookieName,
  csrfToken,
  randomToken,
  readCookie,
  requireOrigin,
  requireSameSite,
  returnDestination,
  setCookie,
  verifyCsrf,
  type AuthConfig,
} from './primitives';
import { readAuthBody } from './routes';
const json = (v: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(v, { status, headers: { ...authHeaders, ...headers } });
function bearer(v: unknown) {
  assert(typeof v === 'string' && /^[a-f0-9]{64}$/.test(v), '$.invite');
  return v;
}
function codeValue(v: unknown) {
  assert(
    typeof v === 'string' &&
      v.length > 0 &&
      v.length <= 2048 &&
      /^[A-Za-z0-9_-]+$/.test(v),
    '$.code',
  );
  return v;
}
export class ManagedAuthRoutes extends AuthRoutes {
  constructor(
    readonly managed: ManagedStore,
    config: AuthConfig | null,
    readonly credentials?: CredentialProvider,
    readonly mailer?: AuthMailer,
    readonly courses?: Pick<IdentityCoursePort, 'requireCourse'>,
    destinations?: DestinationAuthorization,
    readonly background?: (work: () => Promise<void>) => void,
  ) {
    super(managed, config, undefined, destinations);
  }
  override async requireSession(request: Request) {
    const result = await super.requireSession(request),
      binding = await this.managed.binding(result.session);
    if (
      !this.credentials ||
      !binding ||
      binding.issuer !== this.credentials.issuer
    )
      throw new BoundaryError('UNAUTHENTICATED');
    const user = await this.credentials.current(binding.subject);
    if (
      user.disabled ||
      !user.verified ||
      user.email !== result.session.email ||
      user.passwordAt !== binding.provider_password_at ||
      user.validSince !== binding.provider_valid_since
    ) {
      await this.managed.revokeAll(result.session.user_id);
      throw new BoundaryError('UNAUTHENTICATED');
    }
    return result;
  }
  private async authorize(
    principal: TrustedPrincipal,
    course: string,
    write: boolean,
  ) {
    if (!this.courses) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    await this.courses.requireCourse(
      principal,
      course,
      write ? 'instructor-write' : 'instructor-read',
    );
  }
  private async setupMail(
    i: ManagedInvite,
    token: string,
    authorize?: () => Promise<void>,
  ) {
    const claim = await this.managed.lockDispatch(i, token);
    try {
      const mailer = requireMailer(this.mailer),
        provider = this.credentials!;
      await provider.provision(i.firebase_uid, i.email);
      const code = await provider.action(i.email);
      await this.managed.action(
        code,
        { uid: i.firebase_uid, email: i.email },
        i.id,
        null,
        token,
      );
      const url =
        this.config!.origin +
        '/sign-in#invite=' +
        token +
        '&code=' +
        encodeURIComponent(code);
      if (authorize) await authorize();
      await this.managed.pending(token);
      const receipt = await mailer.send(
        i.email,
        'Your Codewise invitation',
        'Your instructor invited you to Codewise. Open this link to choose your password:\n' +
          url +
          '\nThe password setup proof expires after 10 minutes. Your invitation remains valid until accepted or revoked; reopen its link to request a fresh setup email. Course access is assigned separately.',
      );
      await this.managed.receipt(i.id, receipt.state, receipt.messageId, token);
      return receipt;
    } finally {
      await this.managed.unlockDispatch(i.id, claim);
    }
  }
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url),
      path = url.pathname.replace('/api/auth/', ''),
      config = this.config,
      store = this.managed;
    try {
      if (path === 'bootstrap' && request.method === 'GET') {
        if (!config || !this.credentials)
          return json({ configured: false, csrfToken: '' });
        requireSameSite(request, config);
        const browser =
          readCookie(request, cookieName(config, 'preauth')) ?? randomToken();
        return json(
          { configured: true, csrfToken: await csrfToken(browser) },
          200,
          {
            'Set-Cookie': setCookie(
              config,
              'preauth',
              browser,
              LOGIN_TTL / 1000,
            ),
          },
        );
      }
      if (!config || !this.credentials)
        throw new BoundaryError('UPSTREAM_UNAVAILABLE');
      if (url.origin !== config.origin) throw new BoundaryError('FORBIDDEN');
      requireSameSite(request, config);
      if (request.method === 'POST') requireOrigin(request, config);
      const publicPaths = [
        'login',
        'setup/request',
        'setup/confirm',
        'reset/request',
        'reset/confirm',
      ];
      if (request.method === 'POST' && publicPaths.includes(path)) {
        const browser = readCookie(request, cookieName(config, 'preauth'));
        if (!browser) throw new BoundaryError('UNAUTHENTICATED');
        await verifyCsrf(request, browser);
        await store.rate(
          'auth-ip:' + request.headers.get('cf-connecting-ip'),
          30,
        );
        const raw = await readAuthBody(request);
        if (path === 'login') {
          const input = object(raw, ['email', 'password'], '$', ['returnTo']);
          const email = nusEmail(input.email),
            password = passwordValue(input.password);
          await store.rate('password:' + email, 5);
          const account = await store.account(email, this.credentials.issuer);
          const before = account
            ? await this.credentials.current(account.subject)
            : null;
          const user = await this.credentials.login(email, password);
          if (
            !account ||
            !account.active ||
            account.subject !== user.uid ||
            !before ||
            before.passwordAt !== user.passwordAt ||
            before.validSince !== user.validSince ||
            !user.verified ||
            user.disabled
          )
            throw new BoundaryError('UNAUTHENTICATED');
          const token = await store.loginManaged(
            browser,
            user,
            this.credentials.issuer,
            returnDestination(input.returnTo),
            null,
            readCookie(request, cookieName(config, 'session')),
          );
          // Recheck after issuance; a concurrent provider reset can never produce usable stale credentials.
          const signed = new Request(request.url, {
            headers: { cookie: cookieName(config, 'session') + '=' + token },
          });
          await this.requireSession(signed);
          return json({ ok: true }, 200, {
            'Set-Cookie': setCookie(config, 'session', token, ABSOLUTE / 1000),
          });
        }
        if (path === 'setup/request') {
          const input = object(raw, ['invite']),
            token = bearer(input.invite),
            i = await store.pending(token);
          requireMailer(this.mailer);
          await store.cooldown('setup:' + i.id);
          await this.setupMail(i, token);
          return json({ ok: true }, 202);
        }
        if (path === 'reset/request') {
          const input = object(raw, ['email']),
            email = nusEmail(input.email);
          requireMailer(this.mailer);
          if (!this.background) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
          await store.cooldown('reset:' + email);
          const account = await store.account(email, this.credentials.issuer);
          const credentials = this.credentials;
          this.background(async () => {
            if (account?.active) {
              try {
                const user = await credentials.current(account.subject);
                if (!user.disabled && user.verified && user.email === email) {
                  const code = await credentials.action(email);
                  await store.action(code, user, null, account.id);
                  await this.mailer!.send(
                    email,
                    'Reset your Codewise password',
                    'Choose a new password using this single-use link (valid for 10 minutes):\n' +
                      config.origin +
                      '/auth/reset#code=' +
                      encodeURIComponent(code) +
                      '\nIf you did not request this, ignore this email.',
                  );
                }
              } catch {
                /* Generic acknowledgement for eligible known/unknown addresses. */
              }
            }
          });
          return json({ ok: true }, 202, { 'Retry-After': '90' });
        }
        const setup = path === 'setup/confirm';
        const input = object(
          raw,
          setup ? ['invite', 'code', 'password'] : ['code', 'password'],
        );
        const code = codeValue(input.code),
          password = passwordValue(input.password),
          token = setup ? bearer(input.invite) : undefined;
        const proof = await store.proof(code, setup ? 'setup' : 'reset', token);
        if ((await this.credentials.inspect(code)) !== proof.email)
          throw new BoundaryError('UNAUTHENTICATED');
        const before = await this.credentials.current(proof.firebase_uid);
        if (before.disabled || before.email !== proof.email)
          throw new BoundaryError('UNAUTHENTICATED');
        await store.consume(proof);
        if ((await this.credentials.reset(code, password)) !== proof.email)
          throw new BoundaryError('UNAUTHENTICATED');
        if (setup) {
          await this.credentials.verifyEmail(proof.firebase_uid);
          // Rechecks pending/revoked admission immediately before the D1 acceptance transaction.
          await store.pending(token!);
          const user = await this.credentials.current(proof.firebase_uid);
          if (!user.verified || user.disabled || user.email !== proof.email)
            throw new BoundaryError('UNAUTHENTICATED');
          const cookie = await store.loginManaged(
            browser,
            user,
            this.credentials.issuer,
            '/workspace',
            token!,
            readCookie(request, cookieName(config, 'session')),
          );
          await store.logout(cookie); // Setup completes admission; sign in explicitly with the new password.
        }
        return json({ ok: true });
      }
      const { token, session, principal } = await this.requireSession(request);
      if (path === 'session' && request.method === 'GET')
        return json({
          session: this.view(session),
          email: session.email,
          administrator: false,
          csrfToken: await csrfToken(token),
        });
      if (request.method === 'POST') await verifyCsrf(request, token);
      if (path === 'logout' && request.method === 'POST') {
        object(await readAuthBody(request), []);
        await store.logout(token);
        return json({ ok: true }, 200, {
          'Set-Cookie': setCookie(config, 'session', '', 0),
        });
      }
      if (path === 'workspace' && request.method === 'GET') {
        if (!this.destinations)
          return json({ state: 'unavailable', destination: null });
        const destination = returnDestination(session.return_path);
        await this.destinations.authorize(principal, destination);
        return json({ state: 'authorized', destination });
      }
      if (path === 'invitations' && request.method === 'GET') {
        const course = id(url.searchParams.get('courseId'), '$.courseId'),
          cursor = url.searchParams.get('after') ?? '';
        assert(cursor.length <= 128, '$.after');
        await this.authorize(principal, course, false);
        return json(await store.list(session.user_id, course, cursor));
      }
      if (path === 'invitations' && request.method === 'POST') {
        const input = object(await readAuthBody(request), [
            'courseId',
            'email',
          ]),
          course = id(input.courseId, '$.courseId'),
          email = nusEmail(input.email);
        await this.authorize(principal, course, true);
        requireMailer(this.mailer);
        await store.rate('instructor:' + session.user_id, 10);
        const result = await store.createManagedInvite(
          session,
          course,
          email,
          this.credentials.issuer,
        );
        await this.authorize(principal, course, true);
        try {
          await this.setupMail(result.invitation, result.token, async () => {
            await this.requireSession(request);
            await this.authorize(principal, course, true);
          });
        } catch {
          await store.receipt(
            result.invitation.id,
            'failed',
            undefined,
            result.token,
          );
        }
        return json(
          {
            invitation: inviteView(
              await store.owned(session.user_id, course, result.invitation.id),
            ),
          },
          201,
        );
      }
      const action = path.match(
        /^invitations\/([A-Za-z0-9-]{1,128})\/(resend|revoke)$/,
      );
      if (action && request.method === 'POST') {
        const input = object(await readAuthBody(request), ['courseId']),
          course = id(input.courseId, '$.courseId');
        await this.authorize(principal, course, true);
        const i = await store.owned(session.user_id, course, action[1]);
        if (action[2] === 'revoke') await store.revoke(i);
        else {
          requireMailer(this.mailer);
          const next = await store.rotate(i);
          await this.authorize(principal, course, true);
          try {
            await this.setupMail(i, next, async () => {
              await this.requireSession(request);
              await this.authorize(principal, course, true);
            });
          } catch {
            await store.receipt(i.id, 'failed', undefined, next);
          }
        }
        return json({ ok: true });
      }
      return json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not available.',
            requestId: crypto.randomUUID(),
          },
        },
        404,
      );
    } catch (error) {
      const code =
        error instanceof BoundaryError ? error.code : 'UPSTREAM_UNAVAILABLE';
      return json(
        toSafeError(error, crypto.randomUUID()),
        code === 'UNAUTHENTICATED'
          ? 401
          : code === 'FORBIDDEN'
            ? 403
            : code === 'INVALID_CONTRACT'
              ? 400
              : code === 'RATE_LIMITED'
                ? 429
                : 503,
      );
    }
  }
}
