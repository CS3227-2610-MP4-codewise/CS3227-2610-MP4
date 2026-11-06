import { beforeAll, describe, it, expect } from 'vitest';
import type { CustomFetch } from 'openid-client';
import { GoogleProvider } from '../../src/server/auth/provider';
import { GOOGLE_ISSUER, randomToken } from '../../src/server/auth/primitives';
import type { Transaction } from '../../src/server/auth/store';
let key: CryptoKeyPair, wrong: CryptoKeyPair, jwk: JsonWebKey;
const encode = (v: unknown) =>
  Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString(
    'base64url',
  );
const config = {
  origin: 'https://app.example.test',
  clientId: 'synthetic-client',
  clientSecret: 'synthetic-not-a-credential',
  secure: true,
};
beforeAll(async () => {
  const algorithm = {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  };
  key = await crypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
  wrong = await crypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
  jwk = await crypto.subtle.exportKey('jwk', key.publicKey);
});
async function setup(
  overrides: Record<string, unknown> = {},
  wrongSignature = false,
) {
  const state = randomToken(),
    nonce = randomToken(),
    verifier = randomToken(),
    now = Math.floor(Date.now() / 1000);
  const t: Transaction = {
    id: crypto.randomUUID(),
    nonce,
    verifier,
    claim_id: randomToken(),
    invite_hash: null,
    old_session_hash: null,
    return_path: '/workspace',
  };
  const claims = {
    iss: GOOGLE_ISSUER,
    sub: 'synthetic-subject',
    aud: config.clientId,
    iat: now,
    exp: now + 300,
    nonce,
    email: 'invitee@example.test',
    email_verified: true,
    ...overrides,
  };
  const unsigned =
    encode({ alg: 'RS256', kid: 'synthetic-key', typ: 'JWT' }) +
    '.' +
    encode(claims);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    (wrongSignature ? wrong : key).privateKey,
    new TextEncoder().encode(unsigned),
  );
  const transport: CustomFetch = async (url, options) => {
    if (url === GOOGLE_ISSUER + '/.well-known/openid-configuration')
      return Response.json({
        issuer: GOOGLE_ISSUER,
        authorization_endpoint: GOOGLE_ISSUER + '/o/oauth2/v2/auth',
        token_endpoint: 'https://oauth2.googleapis.com/token',
        jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        token_endpoint_auth_methods_supported: ['client_secret_post'],
      });
    if (url === 'https://www.googleapis.com/oauth2/v3/certs')
      return Response.json({
        keys: [{ ...jwk, kid: 'synthetic-key', alg: 'RS256', use: 'sig' }],
      });
    if (url === 'https://oauth2.googleapis.com/token') {
      const params = new URLSearchParams(options.body as string);
      expect(params.get('code_verifier')).toBe(verifier);
      expect(params.get('redirect_uri')).toBe(
        config.origin + '/api/auth/callback',
      );
      return Response.json({
        access_token: 'synthetic-access',
        token_type: 'Bearer',
        expires_in: 300,
        id_token: unsigned + '.' + Buffer.from(signature).toString('base64url'),
      });
    }
    throw new Error('Unexpected synthetic provider request');
  };
  return {
    provider: new GoogleProvider(config, transport),
    t,
    url: new URL(
      config.origin + '/api/auth/callback?code=synthetic-code&state=' + state,
    ),
    state,
  };
}
describe('maintained OIDC adapter signed synthetic protocol (not live Google)', () => {
  it('requires PKCE/S256, exact callback, state/nonce and verified issuer/subject/email', async () => {
    const { provider, t, url, state } = await setup();
    const authorization = new URL(
      await provider.authorization({
        state,
        nonce: t.nonce,
        verifier: t.verifier,
      }),
    );
    expect(authorization.searchParams.get('code_challenge_method')).toBe(
      'S256',
    );
    expect(authorization.searchParams.get('code_challenge')).not.toBe(
      t.verifier,
    );
    expect(authorization.searchParams.get('state')).toBe(state);
    expect(await provider.exchange(url, t)).toEqual({
      issuer: GOOGLE_ISSUER,
      subject: 'synthetic-subject',
      email: 'invitee@example.test',
    });
  });
  it.each([
    { nonce: 'wrong' },
    { aud: 'wrong' },
    { iss: 'https://evil.test' },
    { exp: 1 },
    { email_verified: false },
    { sub: '' },
  ])('rejects invalid verified claims %j', async (overrides) => {
    const { provider, t, url } = await setup(overrides);
    await expect(provider.exchange(url, t)).rejects.toThrow();
  });
  it('rejects wrong signing key despite valid claims and TLS endpoint', async () => {
    const { provider, t, url } = await setup({}, true);
    await expect(provider.exchange(url, t)).rejects.toThrow();
  });
});
