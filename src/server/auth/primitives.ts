import {
  BoundaryError,
  assert,
} from '../../shared/instructor-contracts/schema';
export const IDLE = 30 * 60_000,
  ABSOLUTE = 8 * 60 * 60_000,
  INVITE_TTL = 24 * 60 * 60_000,
  LOGIN_TTL = 10 * 60_000;
export const GOOGLE_ISSUER = 'https://accounts.google.com';
export type AuthConfig = {
  origin: string;
  clientId: string;
  clientSecret: string;
  secure: boolean;
};
export function authConfig(env: {
  APP_ENV: string;
  AUTH_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}): AuthConfig | null {
  try {
    if (!env.AUTH_ORIGIN || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)
      return null;
    const origin = new URL(env.AUTH_ORIGIN);
    const secure = origin.protocol === 'https:';
    if (
      origin.origin !== env.AUTH_ORIGIN ||
      origin.username ||
      origin.password ||
      (!secure &&
        !(
          env.APP_ENV === 'development' &&
          origin.protocol === 'http:' &&
          ['127.0.0.1', 'localhost'].includes(origin.hostname)
        ))
    )
      return null;
    return {
      origin: origin.origin,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      secure,
    };
  } catch {
    return null;
  }
}
export const randomToken = () =>
  hex(crypto.getRandomValues(new Uint8Array(32)));
export const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export async function hash(value: string) {
  return hex(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  );
}
export function cookieName(config: AuthConfig, kind: 'session' | 'preauth') {
  return (config.secure ? '__Host-codewise-' : 'codewise-dev-') + kind;
}
export function readCookie(request: Request, name: string): string | null {
  const matches = (request.headers.get('cookie') ?? '')
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c.startsWith(name + '='));
  if (matches.length === 0) return null;
  if (matches.length !== 1) throw new BoundaryError('UNAUTHENTICATED');
  const value = matches[0].slice(name.length + 1);
  if (!/^[a-f0-9]{64}$/.test(value)) throw new BoundaryError('UNAUTHENTICATED');
  return value;
}
export function setCookie(
  config: AuthConfig,
  kind: 'session' | 'preauth',
  value: string,
  maxAge: number,
) {
  return `${cookieName(config, kind)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config.secure ? '; Secure' : ''}`;
}
async function csrfKey(bearer: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(bearer),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}
const csrfMessage = new TextEncoder().encode('codewise:csrf:v1');
export async function csrfToken(bearer: string) {
  return hex(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', await csrfKey(bearer), csrfMessage),
    ),
  );
}
export async function verifyCsrf(request: Request, bearer: string) {
  const token = request.headers.get('x-csrf-token') ?? '';
  if (!/^[a-f0-9]{64}$/.test(token)) throw new BoundaryError('FORBIDDEN');
  const bytes = Uint8Array.from(token.match(/../g)!, (v) => parseInt(v, 16));
  if (
    !(await crypto.subtle.verify(
      'HMAC',
      await csrfKey(bearer),
      bytes,
      csrfMessage,
    ))
  )
    throw new BoundaryError('FORBIDDEN');
}
export function requireOrigin(request: Request, config: AuthConfig) {
  if (request.headers.get('origin') !== config.origin)
    throw new BoundaryError('FORBIDDEN');
}
export function requireSameSite(request: Request, config: AuthConfig) {
  const origin = request.headers.get('origin');
  if (
    (origin && origin !== config.origin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new BoundaryError('FORBIDDEN');
}
export function returnDestination(value: unknown): string {
  if (value === undefined) return '/workspace';
  assert(
    typeof value === 'string' &&
      value.length <= 256 &&
      !/[\s\\%?#]/.test(value),
    '$.returnTo',
    'destination',
  );
  assert(
    value === '/workspace' ||
      /^\/instructor\/(?:assignments|review|assessments)\/[A-Za-z0-9_-]{1,128}$/.test(
        value,
      ),
    '$.returnTo',
    'destination',
  );
  return value;
}
export function emailAddress(value: unknown): string {
  assert(
    typeof value === 'string' &&
      value.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    '$.email',
    'email',
  );
  return value.toLowerCase();
}
