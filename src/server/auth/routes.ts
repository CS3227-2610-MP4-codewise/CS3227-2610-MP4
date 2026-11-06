import {
  BoundaryError,
  assert,
  object,
  toSafeError,
} from '../../shared/instructor-contracts/schema';
import { sessionViewSchema } from '../../shared/instructor-contracts/identity';
import type { TrustedPrincipal } from '../instructor/ports/contracts';
import { AuthStore, type Session } from './store';
import type { IdentityProvider } from './provider';
import {
  ABSOLUTE,
  LOGIN_TTL,
  cookieName,
  csrfToken,
  emailAddress,
  randomToken,
  readCookie,
  requireOrigin,
  requireSameSite,
  returnDestination,
  setCookie,
  verifyCsrf,
  type AuthConfig,
} from './primitives';

export interface DestinationAuthorization {
  /** Keith owns this decision. Must authorize every object/course in the destination. */
  authorize(principal: TrustedPrincipal, destination: string): Promise<void>;
}
export const authHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) => Response.json(value, { status, headers: { ...authHeaders, ...headers } });
const redirect = (destination: string, cookie?: string) =>
  new Response(null, {
    status: 303,
    headers: {
      ...authHeaders,
      Location: destination,
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    },
  });
async function body(request: Request) {
  assert(
    request.headers.get('content-type')?.split(';')[0] === 'application/json',
    '$',
    'content_type',
  );
  const reader = request.body?.getReader();
  assert(reader, '$', 'body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      assert(size <= 2048, '$', 'size');
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ) as unknown;
  } catch {
    throw new BoundaryError('INVALID_CONTRACT');
  }
}
export class AuthRoutes {
  constructor(
    readonly store: AuthStore,
    readonly config: AuthConfig | null,
    readonly provider?: IdentityProvider,
    readonly destinations?: DestinationAuthorization,
  ) {}
  async requireSession(request: Request) {
    if (!this.config) throw new BoundaryError('UNAUTHENTICATED');
    const token = readCookie(request, cookieName(this.config, 'session'));
    if (!token) throw new BoundaryError('UNAUTHENTICATED');
    const session = await this.store.session(token);
    return {
      token,
      session,
      principal: {
        userId: session.user_id,
        sessionHandle: session.id,
      } as TrustedPrincipal,
    };
  }
  async requireMutationOrigin(request: Request) {
    if (!this.config) throw new BoundaryError('UNAUTHENTICATED');
    requireOrigin(request, this.config);
    const { token } = await this.requireSession(request);
    await verifyCsrf(request, token);
  }
  view(session: Session) {
    return sessionViewSchema.parse({
      schemaVersion: 1,
      userId: session.user_id,
      expiresAt: new Date(
        Math.min(session.expires_at, session.last_seen + 30 * 60_000),
      ).toISOString(),
    });
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url),
      path = url.pathname,
      config = this.config;
    try {
      if (path === '/api/auth/bootstrap' && request.method === 'GET') {
        if (!config) return json({ configured: false, csrfToken: '' });
        requireSameSite(request, config);
        const token =
          readCookie(request, cookieName(config, 'preauth')) ?? randomToken();
        return json(
          { configured: true, csrfToken: await csrfToken(token) },
          200,
          {
            'Set-Cookie': setCookie(config, 'preauth', token, LOGIN_TTL / 1000),
          },
        );
      }
      if (!config || !this.provider)
        return json(
          {
            error: {
              code: 'UPSTREAM_UNAVAILABLE',
              message: 'Sign-in is not configured.',
              requestId: crypto.randomUUID(),
            },
          },
          503,
        );
      if (url.origin !== config.origin) throw new BoundaryError('FORBIDDEN');
      if (path === '/api/auth/login' && request.method === 'POST') {
        requireOrigin(request, config);
        const browser = readCookie(request, cookieName(config, 'preauth'));
        if (!browser) throw new BoundaryError('UNAUTHENTICATED');
        await verifyCsrf(request, browser);
        const input = object(await body(request), [], '$', [
          'invite',
          'returnTo',
        ]);
        const invite = input.invite ?? null;
        assert(
          invite === null ||
            (typeof invite === 'string' && /^[a-f0-9]{64}$/.test(invite)),
          '$.invite',
        );
        await this.store.rate(
          'login:' + request.headers.get('cf-connecting-ip'),
          10,
        );
        const t = await this.store.begin(
          browser,
          invite,
          returnDestination(input.returnTo),
          readCookie(request, cookieName(config, 'session')),
        );
        return json({ url: await this.provider.authorization(t) });
      }
      if (path === '/api/auth/callback' && request.method === 'GET') {
        try {
          const browser = readCookie(request, cookieName(config, 'preauth')),
            state = url.searchParams.get('state');
          if (
            !browser ||
            !state ||
            !/^[a-f0-9]{64}$/.test(state) ||
            url.searchParams.getAll('state').length !== 1
          )
            throw new BoundaryError('UNAUTHENTICATED');
          const transaction = await this.store.claim(state, browser);
          if (url.searchParams.has('error'))
            return redirect('/sign-in?notice=cancelled');
          const identity = await this.provider.exchange(url, transaction);
          const token = await this.store.complete(transaction, identity);
          const response = redirect(
            '/auth/finish',
            setCookie(config, 'session', token, ABSOLUTE / 1000),
          );
          response.headers.append(
            'Set-Cookie',
            setCookie(config, 'preauth', '', 0),
          );
          return response;
        } catch {
          return redirect('/sign-in?notice=failed');
        }
      }
      const { token, session, principal } = await this.requireSession(request);
      if (path === '/api/auth/session' && request.method === 'GET')
        return json({
          session: this.view(session),
          email: session.email,
          administrator: !!session.administrator,
          csrfToken: await csrfToken(token),
        });
      if (request.method === 'POST') {
        requireOrigin(request, config);
        await verifyCsrf(request, token);
      }
      if (path === '/api/auth/logout' && request.method === 'POST') {
        object(await body(request), []);
        await this.store.logout(token);
        return json({ ok: true }, 200, {
          'Set-Cookie': setCookie(config, 'session', '', 0),
        });
      }
      if (path === '/api/auth/invitations' && request.method === 'GET') {
        const cursor = url.searchParams.get('after') ?? '';
        assert(cursor.length <= 128, '$.after');
        return json(await this.store.invitations(session, cursor));
      }
      if (path === '/api/auth/invitations' && request.method === 'POST') {
        const input = object(await body(request), ['email']);
        await this.store.requireAdmin(session);
        await this.store.rate('invite:' + session.user_id, 10);
        const result = await this.store.createInvite(
          session,
          emailAddress(input.email),
        );
        return json(
          {
            invitation: result.invitation,
            url: config.origin + '/sign-in#invite=' + result.token,
          },
          201,
        );
      }
      const revoke = path.match(
        /^\/api\/auth\/invitations\/([a-zA-Z0-9-]{1,128})\/revoke$/,
      );
      if (revoke && request.method === 'POST') {
        object(await body(request), []);
        await this.store.revokeInvite(session, revoke[1]);
        return json({ ok: true });
      }
      if (path === '/api/auth/workspace' && request.method === 'GET') {
        if (!this.destinations)
          return json({ state: 'unavailable', destination: null });
        const destination = returnDestination(session.return_path);
        await this.destinations.authorize(principal, destination);
        return json({ state: 'authorized', destination });
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
