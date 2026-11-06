import { BoundaryError } from '../../shared/instructor-contracts/schema';
import { emailAddress, randomToken, type AuthConfig } from './primitives';

export type FirebaseUser = {
  uid: string;
  email: string;
  verified: boolean;
  disabled: boolean;
  passwordAt: number;
  validSince: number;
};
export interface CredentialProvider {
  readonly issuer: string;
  provision(uid: string, email: string): Promise<void>;
  provisionOwner(uid: string, email: string, password: string): Promise<void>;
  login(email: string, password: string): Promise<FirebaseUser>;
  current(uid: string): Promise<FirebaseUser>;
  action(email: string): Promise<string>;
  inspect(code: string): Promise<string>;
  reset(code: string, password: string): Promise<string>;
  verifyEmail(uid: string): Promise<void>;
}
export type FirebaseConfig = AuthConfig & {
  project: string;
  apiKey: string;
  serviceEmail: string;
  privateKey: string;
};
export function firebaseConfig(env: {
  APP_ENV: string;
  AUTH_ORIGIN?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_SERVICE_ACCOUNT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
}): FirebaseConfig | null {
  try {
    const origin = new URL(env.AUTH_ORIGIN ?? '');
    const secure = origin.protocol === 'https:';
    if (
      origin.origin !== env.AUTH_ORIGIN ||
      (!secure &&
        !(
          env.APP_ENV === 'development' &&
          origin.protocol === 'http:' &&
          ['127.0.0.1', 'localhost'].includes(origin.hostname)
        ))
    )
      return null;
    if (
      !env.FIREBASE_PROJECT_ID ||
      !/^[a-z][a-z0-9-]{4,62}$/.test(env.FIREBASE_PROJECT_ID) ||
      !env.FIREBASE_API_KEY ||
      !env.FIREBASE_SERVICE_ACCOUNT_EMAIL ||
      !env.FIREBASE_PRIVATE_KEY
    )
      return null;
    return {
      origin: origin.origin,
      secure,
      clientId: '',
      clientSecret: '',
      project: env.FIREBASE_PROJECT_ID,
      apiKey: env.FIREBASE_API_KEY,
      serviceEmail: env.FIREBASE_SERVICE_ACCOUNT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  } catch {
    return null;
  }
}
export function nusEmail(value: unknown) {
  const email = emailAddress(value);
  if (
    !['u.nus.edu', 'u.duke.nus.edu', 'u.yale-nus.edu.sg'].includes(
      email.split('@')[1],
    )
  )
    throw new BoundaryError('INVALID_CONTRACT');
  return email;
}
export function passwordValue(value: unknown): string {
  if (
    typeof value !== 'string' ||
    [...value].length < 8 ||
    [...value].length > 64
  )
    throw new BoundaryError('INVALID_CONTRACT');
  return value;
}
export class ProviderFailure extends Error {
  constructor(readonly code: string) {
    super('Identity service could not complete the request.');
  }
}
export async function boundedProviderJson(
  response: Response,
): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 65536) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  try {
    const value: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    );
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  }
}
const base64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
const encode = (value: unknown) =>
  base64(new TextEncoder().encode(JSON.stringify(value)));
/** Fixed provider hosts, no browser-supplied endpoints; bounded and injectable for conformance checks. */
export class FirebaseCredentials implements CredentialProvider {
  readonly issuer: string;
  private access?: { token: string; until: number };
  constructor(
    private config: FirebaseConfig,
    private transport: typeof fetch = fetch.bind(globalThis),
  ) {
    this.issuer = 'https://securetoken.google.com/' + config.project;
  }
  private async request(
    url: string,
    input: unknown,
    bearer?: string,
  ): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      const oauth = url === 'https://oauth2.googleapis.com/token';
      response = await this.transport(url, {
        method: 'POST',
        // Workers does not implement redirect:error. Never forward credentials to a redirect.
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': oauth
            ? 'application/x-www-form-urlencoded'
            : 'application/json',
          ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
        },
        body: oauth
          ? new URLSearchParams(input as Record<string, string>).toString()
          : JSON.stringify(input),
      });
    } catch {
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    }
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    }
    const data = await boundedProviderJson(response);
    if (!response.ok) {
      const error = data.error as { message?: unknown } | undefined;
      throw new ProviderFailure(
        typeof error?.message === 'string'
          ? error.message.split(' : ')[0]
          : 'UNAVAILABLE',
      );
    }
    return data;
  }
  private async oauth() {
    if (this.access && this.access.until > Date.now()) return this.access.token;
    const now = Math.floor(Date.now() / 1000);
    const unsigned =
      encode({ alg: 'RS256', typ: 'JWT' }) +
      '.' +
      encode({
        iss: this.config.serviceEmail,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      });
    const pem = this.config.privateKey.replace(
      /-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,
      '',
    );
    let key: CryptoKey;
    try {
      key = await crypto.subtle.importKey(
        'pkcs8',
        Uint8Array.from(atob(pem), (v) => v.charCodeAt(0)),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign'],
      );
    } catch {
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    }
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(unsigned),
    );
    const data = await this.request('https://oauth2.googleapis.com/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: unsigned + '.' + base64(new Uint8Array(signature)),
    });
    if (
      typeof data.access_token !== 'string' ||
      typeof data.expires_in !== 'number' ||
      data.expires_in < 60
    )
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    this.access = {
      token: data.access_token,
      until: Date.now() + Math.min(data.expires_in - 60, 3540) * 1000,
    };
    return this.access.token;
  }
  private async admin(method: string, input: unknown) {
    return this.request(
      'https://identitytoolkit.googleapis.com/v1/projects/' +
        this.config.project +
        '/accounts' +
        method,
      input,
      await this.oauth(),
    );
  }
  private publicCall(method: string, input: unknown) {
    return this.request(
      'https://identitytoolkit.googleapis.com/v1/accounts:' +
        method +
        '?key=' +
        encodeURIComponent(this.config.apiKey),
      input,
    );
  }
  private async proofCall(input: unknown) {
    try {
      return await this.publicCall('resetPassword', input);
    } catch (error) {
      if (
        error instanceof ProviderFailure &&
        [
          'INVALID_OOB_CODE',
          'EXPIRED_OOB_CODE',
          'USER_DISABLED',
          'EMAIL_NOT_FOUND',
        ].includes(error.code)
      )
        throw new BoundaryError('UNAUTHENTICATED');
      throw error;
    }
  }
  async current(uid: string): Promise<FirebaseUser> {
    const data = await this.admin(':lookup', { localId: [uid] });
    const users = data.users;
    if (!Array.isArray(users) || users.length !== 1)
      throw new BoundaryError('UNAUTHENTICATED');
    const u = users[0] as Record<string, unknown>;
    if (
      u.localId !== uid ||
      typeof u.email !== 'string' ||
      (u.emailVerified !== undefined && typeof u.emailVerified !== 'boolean') ||
      (u.disabled !== undefined && typeof u.disabled !== 'boolean') ||
      !Number.isFinite(Number(u.passwordUpdatedAt)) ||
      !Number.isFinite(Number(u.validSince))
    )
      throw new BoundaryError('UNAUTHENTICATED');
    return {
      uid,
      email: emailAddress(u.email),
      verified: u.emailVerified === true,
      disabled: u.disabled === true,
      passwordAt: Number(u.passwordUpdatedAt),
      validSince: Number(u.validSince),
    };
  }
  async provision(uid: string, email: string) {
    return this.provisionOwner(uid, email, randomToken());
  }
  async provisionOwner(uid: string, email: string, password: string) {
    passwordValue(password);
    try {
      await this.admin('', {
        localId: uid,
        email,
        password,
        emailVerified: false,
        disabled: false,
      });
    } catch (e) {
      // Only a retry of OUR reserved UID is recoverable. Never bind an email collision.
      if (
        !(e instanceof ProviderFailure) ||
        !['DUPLICATE_LOCAL_ID', 'EMAIL_EXISTS'].includes(e.code)
      )
        throw e;
    }
    const user = await this.current(uid);
    if (user.email !== email || user.disabled)
      throw new BoundaryError('UNAUTHENTICATED');
  }
  async login(email: string, password: string) {
    let data: Record<string, unknown>;
    try {
      data = await this.publicCall('signInWithPassword', {
        email,
        password,
        returnSecureToken: true,
      });
    } catch (e) {
      if (
        e instanceof ProviderFailure &&
        [
          'INVALID_LOGIN_CREDENTIALS',
          'EMAIL_NOT_FOUND',
          'INVALID_PASSWORD',
          'USER_DISABLED',
          'TOO_MANY_ATTEMPTS_TRY_LATER',
        ].includes(e.code)
      )
        throw new BoundaryError('UNAUTHENTICATED');
      throw e;
    }
    if (typeof data.localId !== 'string' || data.email !== email)
      throw new BoundaryError('UNAUTHENTICATED');
    return this.current(data.localId);
  }
  async inspect(code: string) {
    const data = await this.proofCall({ oobCode: code });
    if (data.requestType !== 'PASSWORD_RESET' || typeof data.email !== 'string')
      throw new BoundaryError('UNAUTHENTICATED');
    return emailAddress(data.email);
  }
  /** Generate a proof only. The mail transport delivers the Codewise URL; no Firebase template edit. */
  async action(email: string) {
    const data = await this.admin(':sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email,
      returnOobLink: true,
    });
    if (typeof data.oobLink !== 'string')
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    const link = new URL(data.oobLink),
      code = link.searchParams.get('oobCode');
    if (
      link.protocol !== 'https:' ||
      link.searchParams.get('mode') !== 'resetPassword' ||
      !code ||
      !/^[A-Za-z0-9_-]{1,2048}$/.test(code)
    )
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    return code;
  }
  async reset(code: string, password: string) {
    const data = await this.proofCall({
      oobCode: code,
      newPassword: password,
    });
    if (typeof data.email !== 'string')
      throw new BoundaryError('UNAUTHENTICATED');
    return emailAddress(data.email);
  }
  async verifyEmail(uid: string) {
    await this.admin(':update', { localId: uid, emailVerified: true });
  }
}
