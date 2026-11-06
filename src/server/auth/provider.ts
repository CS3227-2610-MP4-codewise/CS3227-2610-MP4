import * as oidc from 'openid-client';
import {
  BoundaryError,
  assert,
} from '../../shared/instructor-contracts/schema';
import { GOOGLE_ISSUER, emailAddress, type AuthConfig } from './primitives';
import type { Transaction, VerifiedIdentity } from './store';

export interface IdentityProvider {
  authorization(input: {
    state: string;
    nonce: string;
    verifier: string;
  }): Promise<string>;
  exchange(url: URL, transaction: Transaction): Promise<VerifiedIdentity>;
}
/** Only this real provider is composed in the deployed Worker. */
export class GoogleProvider implements IdentityProvider {
  private configuration: Promise<oidc.Configuration> | undefined;
  constructor(
    private settings: AuthConfig,
    private transport?: oidc.CustomFetch,
  ) {}
  private config() {
    return (this.configuration ??= oidc
      .discovery(
        new URL(GOOGLE_ISSUER),
        this.settings.clientId,
        {
          client_secret: this.settings.clientSecret,
          id_token_signed_response_alg: 'RS256',
        },
        oidc.ClientSecretPost(this.settings.clientSecret),
        {
          execute: [oidc.enableNonRepudiationChecks],
          timeout: 10,
          ...(this.transport ? { [oidc.customFetch]: this.transport } : {}),
        },
      )
      .catch((e) => {
        this.configuration = undefined;
        throw e;
      }));
  }
  async authorization(input: {
    state: string;
    nonce: string;
    verifier: string;
  }) {
    return oidc.buildAuthorizationUrl(await this.config(), {
      redirect_uri: this.settings.origin + '/api/auth/callback',
      response_type: 'code',
      scope: 'openid email',
      state: input.state,
      nonce: input.nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(input.verifier),
      code_challenge_method: 'S256',
    }).href;
  }
  async exchange(url: URL, t: Transaction) {
    const tokens = await oidc.authorizationCodeGrant(await this.config(), url, {
      expectedState: url.searchParams.get('state')!,
      expectedNonce: t.nonce,
      pkceCodeVerifier: t.verifier,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (
      !claims ||
      claims.iss !== GOOGLE_ISSUER ||
      typeof claims.sub !== 'string' ||
      !claims.sub ||
      claims.sub.length > 255 ||
      claims.email_verified !== true
    )
      throw new BoundaryError('UNAUTHENTICATED');
    assert(typeof claims.email === 'string', '$.email');
    return {
      issuer: GOOGLE_ISSUER,
      subject: claims.sub,
      email: emailAddress(claims.email),
    };
  }
}
