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
import {
  nusEmail,
  passwordValue,
  ProofRejected,
  type CredentialProvider,
} from './firebase';
import { requireMailer, type AuthMailer } from './mail';
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
import { isReservedOwnerSubject, type OwnerBootstrap } from './owner';
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
class InvitationDispatchFailure extends Error {
  constructor(readonly state: 'failed' | 'unknown') {
    super('Invitation dispatch did not complete.');
  }
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
    readonly owner?: OwnerBootstrap,
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
    const ownerStatus = await this.managed.ownerStatus(
      user,
      this.credentials.issuer,
    );
    if (
      user.disabled ||
      ownerStatus === 'invalid' ||
      (!user.verified && ownerStatus !== 'valid') ||
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
    let dispatchStarted = false;
    let failed = false;
    try {
      const mailer = requireMailer(this.mailer),
        provider = this.credentials!;
      const registered = await this.managed.account(i.email, provider.issuer);
      if (registered && !i.target_role) throw new BoundaryError('FORBIDDEN');
      let proof = '';
      if (!registered) {
        let proofUid = i.firebase_uid;
        try {
          await provider.provision(i.firebase_uid, i.email);
          if (i.target_role)
            await this.managed.recordRecoveryCandidate(i.email, i.firebase_uid);
        } catch (error) {
          if (!i.target_role) throw error;
          const candidate = await provider.lookupEmail(i.email);
          if (
            !candidate ||
            candidate.disabled ||
            candidate.email !== i.email ||
            candidate.uid === i.firebase_uid
          )
            throw error;
          await this.managed.recordRecoveryCandidate(i.email, candidate.uid);
          proofUid = candidate.uid;
        }
        if (isReservedOwnerSubject(proofUid))
          throw new BoundaryError('FORBIDDEN');
        const code = await provider.action(i.email);
        const ticket = randomToken();
        await this.managed.action(
          ticket,
          { uid: proofUid, email: i.email },
          i.id,
          null,
          token,
        );
        proof = '&ticket=' + ticket + '&code=' + encodeURIComponent(code);
      }
      const url = this.config!.origin + '/sign-in#invite=' + token + proof;
      if (authorize) await authorize();
      await this.managed.pending(token);
      dispatchStarted = true;
      const receipt = await mailer.send(i.email, url);
      await this.managed.receipt(i.id, receipt.state, receipt.messageId, token);
    } catch {
      failed = true;
    }
    try {
      await this.managed.unlockDispatch(i.id, claim);
    } catch {
      failed = true;
    }
    if (failed)
      throw new InvitationDispatchFailure(
        dispatchStarted ? 'unknown' : 'failed',
      );
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
        'invitation/preview',
        'invitation/join',
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
        if (path === 'invitation/preview' || path === 'invitation/join') {
          const input =
            path === 'invitation/preview'
              ? object(raw, ['invite'])
              : object(raw, ['invite', 'password'], '$', [
                  'ticket',
                  'code',
                  'roles',
                  'mode',
                ]);
          const invite = bearer(input.invite);
          let i;
          try {
            i = await store.courseInvitation(invite);
          } catch (error) {
            if (path !== 'invitation/preview') throw error;
            const legacy = await store.pending(invite);
            if (
              legacy.target_role !== null ||
              (await store.account(legacy.email, this.credentials.issuer))
            )
              throw error;
            let other = false;
            if (readCookie(request, cookieName(config, 'session'))) {
              try {
                await this.requireSession(request);
                other = true;
              } catch {
                /* expired session */
              }
            }
            return json({ legacy: true, session: other ? 'other' : 'none' });
          }
          let account = await store.account(i.email, this.credentials.issuer);
          if (!account && !(await store.recoveryCandidate(i.email))) {
            const existing = await this.credentials.current(i.firebase_uid);
            if (existing.email !== i.email || existing.disabled)
              throw new BoundaryError('UNAUTHENTICATED');
            await store.recordRecoveryCandidate(i.email, existing.uid);
          }
          const recovery = !account;
          const roles =
            i.accepted_at === null
              ? await store.pendingRoles(i)
              : await store.acceptedRoles(i);
          let signed:
            | Awaited<ReturnType<ManagedAuthRoutes['requireSession']>>
            | undefined;
          if (readCookie(request, cookieName(config, 'session'))) {
            try {
              signed = await this.requireSession(request);
            } catch {
              /* expired session */
            }
          }
          const sessionState = !signed
            ? 'none'
            : signed.session.email === i.email &&
                account?.id === signed.session.user_id
              ? 'matching'
              : 'other';
          if (path === 'invitation/preview')
            return json({
              courseName: i.course_name,
              role: i.target_role,
              roles,
              recovery,
              registered: !!account?.active,
              session: sessionState,
            });
          if (sessionState === 'other') throw new BoundaryError('FORBIDDEN');
          const requested =
            input.roles === undefined
              ? i.accepted_at === null
                ? [i.target_role!]
                : roles
              : input.roles;
          assert(
            Array.isArray(requested) &&
              requested.length >= 1 &&
              requested.length <= 2 &&
              requested.every((r) => r === 'student' || r === 'instructor') &&
              new Set(requested).size === requested.length,
            '$.roles',
          );
          if (
            roles.length !== requested.length ||
            roles.some((r) => !requested.includes(r))
          )
            throw new BoundaryError('INVALID_CONTRACT');
          const password = passwordValue(input.password);
          await store.rate('password:' + i.email, 5);
          const setupProof = account
            ? null
            : await store.proof(bearer(input.ticket), 'setup', invite);
          if (
            setupProof &&
            (await this.credentials.inspect(codeValue(input.code))) !== i.email
          )
            throw new BoundaryError('UNAUTHENTICATED');
          const setupClaim = account
            ? null
            : await store.lockSetup(i.email, setupProof!);
          let uncertainReset = false;
          let resetOutcome: 'succeeded' | 'rejected' | null = null;
          try {
            if (setupClaim)
              account = await store.account(i.email, this.credentials.issuer);
            let user;
            if (account) {
              if (!account.active || account.subject !== i.firebase_uid)
                throw new BoundaryError('UNAUTHENTICATED');
              const before = await this.credentials.current(account.subject);
              user = await this.credentials.login(i.email, password);
              const ownerStatus = await store.ownerStatus(
                user,
                this.credentials.issuer,
              );
              if (
                user.uid !== account.subject ||
                user.disabled ||
                (!user.verified && ownerStatus !== 'valid') ||
                ownerStatus === 'invalid' ||
                before.passwordAt !== user.passwordAt ||
                before.validSince !== user.validSince
              )
                throw new BoundaryError('UNAUTHENTICATED');
            } else {
              const proof = await store.proof(
                bearer(input.ticket),
                'setup',
                invite,
              );
              if (
                (await this.credentials.inspect(codeValue(input.code))) !==
                i.email
              )
                throw new BoundaryError('UNAUTHENTICATED');
              const recovering =
                recovery &&
                (await store.recoveryCandidate(i.email))?.firebase_uid ===
                  proof.firebase_uid;
              if (
                recovering &&
                input.mode !== 'existing' &&
                input.mode !== 'reset'
              )
                throw new BoundaryError('INVALID_CONTRACT');
              if (!recovering && input.mode !== undefined)
                throw new BoundaryError('INVALID_CONTRACT');
              const before = await this.credentials.current(proof.firebase_uid);
              if (isReservedOwnerSubject(proof.firebase_uid))
                throw new BoundaryError('FORBIDDEN');
              if (
                before.disabled ||
                before.email !== i.email ||
                (await store.account(i.email, this.credentials.issuer))
              )
                throw new BoundaryError('UNAUTHENTICATED');
              if (!recovering) throw new BoundaryError('UNAUTHENTICATED');
              if (recovering && input.mode === 'existing') {
                const login = await this.credentials.login(i.email, password);
                if (
                  login.uid !== proof.firebase_uid ||
                  login.disabled ||
                  login.passwordAt !== before.passwordAt ||
                  login.validSince !== before.validSince
                )
                  throw new BoundaryError('UNAUTHENTICATED');
              }
              await store.consume(proof);
              if (!recovering || input.mode === 'reset') {
                uncertainReset = true;
                await store.beginSetupReset(i.email, setupClaim!, proof);
                let resetEmail;
                try {
                  resetEmail = await this.credentials.reset(
                    codeValue(input.code),
                    password,
                  );
                } catch (error) {
                  if (error instanceof ProofRejected) resetOutcome = 'rejected';
                  throw error;
                }
                if (resetEmail !== i.email)
                  throw new BoundaryError('UNAUTHENTICATED');
                resetOutcome = 'succeeded';
              }
              await this.credentials.verifyEmail(proof.firebase_uid);
              user = await this.credentials.current(proof.firebase_uid);
              if (!user.verified || user.disabled || user.email !== i.email)
                throw new BoundaryError('UNAUTHENTICATED');
              if (recovering)
                await store.bindRecovery(
                  i,
                  proof,
                  setupClaim!,
                  this.credentials.issuer,
                );
            }
            const sessionToken =
              signed?.token ??
              (account
                ? await store.loginManaged(
                    browser,
                    user,
                    this.credentials.issuer,
                    '/workspace',
                    null,
                  )
                : await store.admitCourseUser(
                    browser,
                    user,
                    this.credentials.issuer,
                    invite,
                  ));
            const verifiedRequest = new Request(request.url, {
              headers: {
                cookie: cookieName(config, 'session') + '=' + sessionToken,
              },
            });
            const current = await this.requireSession(verifiedRequest);
            try {
              await store.acceptCourse(
                invite,
                current.session,
                requested as ('student' | 'instructor')[],
              );
            } catch (error) {
              const fresh = await store.pendingRoles(
                await store.courseInvitation(invite),
              );
              if (
                fresh.length &&
                (fresh.length !== requested.length ||
                  fresh.some((role) => !requested.includes(role)))
              )
                throw new BoundaryError('INVALID_CONTRACT');
              throw error;
            }
            return json({ ok: true }, 200, {
              'Set-Cookie': setCookie(
                config,
                'session',
                sessionToken,
                ABSOLUTE / 1000,
              ),
            });
          } finally {
            if (setupClaim && resetOutcome) {
              await store.finishSetupReset(i.email, setupClaim, resetOutcome);
              uncertainReset = false;
            }
            if (setupClaim && !uncertainReset)
              await store.unlockSetup(i.email, setupClaim);
          }
        }
        if (path === 'login') {
          const input = object(raw, ['email', 'password'], '$', ['returnTo']);
          const email = nusEmail(input.email),
            password = passwordValue(input.password);
          await store.rate('password:' + email, 5);
          await this.owner?.ensure(email, password, browser);
          const account = await store.account(email, this.credentials.issuer);
          const before = account
            ? await this.credentials.current(account.subject)
            : null;
          const user = await this.credentials.login(email, password);
          const ownerStatus = await store.ownerStatus(
            user,
            this.credentials.issuer,
          );
          if (
            !account ||
            !account.active ||
            account.subject !== user.uid ||
            !before ||
            before.passwordAt !== user.passwordAt ||
            before.validSince !== user.validSince ||
            ownerStatus === 'invalid' ||
            (!user.verified && ownerStatus !== 'valid') ||
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
                if (
                  !user.disabled &&
                  user.verified &&
                  user.email === email &&
                  (await store.ownerStatus(user, credentials.issuer)) === 'none'
                ) {
                  const ticket = randomToken();
                  const code = await credentials.action(email);
                  await store.action(ticket, user, null, account.id);
                  await this.mailer!.send(
                    email,
                    config.origin +
                      '/auth/reset#ticket=' +
                      ticket +
                      '&code=' +
                      encodeURIComponent(code),
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
          setup
            ? ['invite', 'ticket', 'code', 'password']
            : ['ticket', 'code', 'password'],
        );
        const code = codeValue(input.code),
          password = passwordValue(input.password),
          token = setup ? bearer(input.invite) : undefined;
        const proof = await store.proof(
          bearer(input.ticket),
          setup ? 'setup' : 'reset',
          token,
        );
        if (isReservedOwnerSubject(proof.firebase_uid))
          throw new BoundaryError('FORBIDDEN');
        if (setup && (await store.pending(token!)).target_role !== null)
          throw new BoundaryError('FORBIDDEN');
        if ((await this.credentials.inspect(code)) !== proof.email)
          throw new BoundaryError('UNAUTHENTICATED');
        const setupClaim = setup
          ? await store.lockSetup(proof.email, proof)
          : null;
        let uncertainReset = false;
        let resetOutcome: 'succeeded' | 'rejected' | null = null;
        try {
          if (
            setup &&
            (await store.account(proof.email, this.credentials.issuer))
          )
            throw new BoundaryError('FORBIDDEN');
          if ((await this.credentials.inspect(code)) !== proof.email)
            throw new BoundaryError('UNAUTHENTICATED');
          const before = await this.credentials.current(proof.firebase_uid);
          if (before.disabled || before.email !== proof.email)
            throw new BoundaryError('UNAUTHENTICATED');
          await store.consume(proof);
          uncertainReset = setup;
          if (setupClaim)
            await store.beginSetupReset(proof.email, setupClaim, proof);
          let resetEmail;
          try {
            resetEmail = await this.credentials.reset(code, password);
          } catch (error) {
            if (error instanceof ProofRejected && setupClaim)
              resetOutcome = 'rejected';
            throw error;
          }
          if (resetEmail !== proof.email)
            throw new BoundaryError('UNAUTHENTICATED');
          if (setupClaim) resetOutcome = 'succeeded';
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
        } finally {
          if (setupClaim && resetOutcome) {
            await store.finishSetupReset(proof.email, setupClaim, resetOutcome);
            uncertainReset = false;
          }
          if (setupClaim && !uncertainReset)
            await store.unlockSetup(proof.email, setupClaim);
        }
      }
      const { token, session, principal } = await this.requireSession(request);
      if (path === 'session' && request.method === 'GET')
        return json({
          session: this.view(session),
          email: session.email,
          administrator: session.administrator === 1,
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
      if (path === 'people' && request.method === 'GET') {
        const course = id(url.searchParams.get('courseId'), '$.courseId'),
          cursor = url.searchParams.get('after') ?? '';
        assert(cursor.length <= 254, '$.after');
        await this.authorize(principal, course, false);
        return json(await store.people(session, course, cursor));
      }
      if (path === 'people/remove' && request.method === 'POST') {
        const input = object(await readAuthBody(request), [
          'courseId',
          'userId',
        ]);
        const course = id(input.courseId, '$.courseId'),
          userId = id(input.userId, '$.userId');
        await this.authorize(principal, course, true);
        await store.removePerson(session, course, userId);
        return json({ ok: true });
      }
      if (path === 'invitations' && request.method === 'GET') {
        const course = id(url.searchParams.get('courseId'), '$.courseId'),
          cursor = url.searchParams.get('after') ?? '';
        assert(cursor.length <= 128, '$.after');
        await this.authorize(principal, course, false);
        return json(await store.list(session, course, cursor));
      }
      if (path === 'invitations' && request.method === 'POST') {
        const input = object(await readAuthBody(request), [
            'courseId',
            'email',
            'targetRole',
          ]),
          course = id(input.courseId, '$.courseId'),
          email = nusEmail(input.email);
        assert(
          input.targetRole === 'student' || input.targetRole === 'instructor',
          '$.targetRole',
        );
        await this.authorize(principal, course, true);
        requireMailer(this.mailer);
        await store.rate('instructor:' + session.user_id, 10);
        const result = await store.createManagedInvite(
          session,
          course,
          email,
          this.credentials.issuer,
          input.targetRole,
        );
        if (!result.token)
          return json(
            { invitation: inviteView(result.invitation), reused: true },
            200,
          );
        await this.authorize(principal, course, true);
        try {
          await this.setupMail(result.invitation, result.token, async () => {
            await this.requireSession(request);
            await this.authorize(principal, course, true);
          });
        } catch (error) {
          await store.receipt(
            result.invitation.id,
            error instanceof InvitationDispatchFailure
              ? error.state
              : 'unknown',
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
        if (action[2] === 'revoke') await store.revoke(i, session);
        else {
          requireMailer(this.mailer);
          const next = await store.rotate(i, session);
          await this.authorize(principal, course, true);
          try {
            await this.setupMail(i, next, async () => {
              await this.requireSession(request);
              await this.authorize(principal, course, true);
            });
          } catch (error) {
            await store.receipt(
              i.id,
              error instanceof InvitationDispatchFailure
                ? error.state
                : 'unknown',
              undefined,
              next,
            );
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
