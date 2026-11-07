import { BoundaryError } from '../../shared/instructor-contracts/schema';
import { nusEmail, passwordValue, type CredentialProvider } from './firebase';
import { hash, randomToken } from './primitives';
import type { ManagedStore } from './managed-store';

export type OwnerConfig = { email: string; password: string };
export function ownerConfig(env: {
  BOOTSTRAP_OWNER_EMAIL?: string;
  BOOTSTRAP_OWNER_PASSWORD?: string;
}): OwnerConfig | null {
  try {
    if (!env.BOOTSTRAP_OWNER_EMAIL || !env.BOOTSTRAP_OWNER_PASSWORD)
      return null;
    return {
      email: nusEmail(env.BOOTSTRAP_OWNER_EMAIL),
      password: passwordValue(env.BOOTSTRAP_OWNER_PASSWORD),
    };
  } catch {
    return null;
  }
}
type OwnerRecord = {
  issuer: string;
  subject: string;
  email: string;
  account_id: string | null;
  completed_at: number | null;
};
/** Reserved bootstrap subject stays protected across environments sharing the provider. */
export async function ownerSubject(issuer: string, email: string) {
  return 'cw-owner-' + (await hash(issuer + '|' + email)).slice(0, 56);
}
/** Reserved bootstrap subjects are never recovered through mailbox proof. */
export function isReservedOwnerSubject(uid: string) {
  return /^cw-owner-[a-f0-9]{56}$/.test(uid);
}
/** Explicit operator secrets authorize a single persistent identity; no defaults, routes or course grants. */
export class OwnerBootstrap {
  constructor(
    private store: ManagedStore,
    private provider: CredentialProvider,
    private config: OwnerConfig,
  ) {}
  async ensure(email: string, password: string, browser: string) {
    if (email !== this.config.email) return;
    const db = this.store.db,
      now = this.store.clock();
    const prior = await db
      .prepare(
        'SELECT issuer,subject,email,account_id,completed_at FROM auth_owner_bootstrap WHERE singleton=1',
      )
      .first<OwnerRecord>();
    if (prior?.completed_at !== null && prior?.completed_at !== undefined)
      return; // Permanent, including disabled/revoked owners.
    const expected = await hash(this.config.password),
      actual = await hash(password);
    let different = 0;
    for (let n = 0; n < expected.length; n++)
      different |= expected.charCodeAt(n) ^ actual.charCodeAt(n);
    if (different) return; // No bootstrap writes/provider provisioning before operator proof.
    const uid = await ownerSubject(this.provider.issuer, email);
    await db
      .prepare(
        'INSERT INTO auth_owner_bootstrap(singleton,issuer,subject,email,created_at) VALUES(1,?,?,?,?) ON CONFLICT(singleton) DO NOTHING',
      )
      .bind(this.provider.issuer, uid, email, now)
      .run();
    const claim = randomToken();
    const reserved = await db
      .prepare(
        'UPDATE auth_owner_bootstrap SET claim_id=?,lease_until=? WHERE singleton=1 AND completed_at IS NULL AND issuer=? AND subject=? AND email=? AND lease_until<=? RETURNING subject',
      )
      .bind(claim, now + 120000, this.provider.issuer, uid, email, now)
      .first();
    if (!reserved) throw new BoundaryError('RATE_LIMITED');
    let admissionCookie: string | undefined;
    try {
      const existing = await this.store.account(email, this.provider.issuer);
      const anyEmail = await db
        .prepare('SELECT issuer,subject FROM auth_accounts WHERE email=?')
        .bind(email)
        .first<{ issuer: string; subject: string }>();
      if (
        (existing && (!existing.active || existing.subject !== uid)) ||
        (anyEmail &&
          (anyEmail.issuer !== this.provider.issuer ||
            anyEmail.subject !== uid))
      )
        throw new BoundaryError('FORBIDDEN');
      await this.provider.provisionOwner(uid, email, password);
      const user = await this.provider.login(email, password);
      if (user.uid !== uid || user.email !== email || user.disabled)
        throw new BoundaryError('UNAUTHENTICATED');
      let accountId = existing?.id;
      if (!accountId) {
        const invite = randomToken();
        await db
          .prepare(
            'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(?,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            await hash(invite),
            email,
            now,
            8640000000000000,
          )
          .run();
        admissionCookie = await this.store.loginManaged(
          browser,
          user,
          this.provider.issuer,
          '/workspace',
          invite,
        );
        accountId = (await this.store.session(admissionCookie)).user_id;
      }
      const current = await this.provider.current(uid);
      if (
        current.disabled ||
        current.email !== email ||
        current.passwordAt !== user.passwordAt ||
        current.validSince !== user.validSince
      )
        throw new BoundaryError('UNAUTHENTICATED');
      const completeAt = this.store.clock();
      await db.batch([
        db
          .prepare(
            `UPDATE auth_owner_bootstrap SET account_id=?,completed_at=?,password_at=?,valid_since=?
          WHERE singleton=1 AND completed_at IS NULL AND claim_id=? AND lease_until>?
          AND EXISTS(SELECT 1 FROM auth_accounts a WHERE a.id=? AND a.issuer=auth_owner_bootstrap.issuer AND a.subject=auth_owner_bootstrap.subject AND a.email=auth_owner_bootstrap.email AND a.active=1)`,
          )
          .bind(
            accountId,
            completeAt,
            current.passwordAt,
            current.validSince,
            claim,
            completeAt,
            accountId,
          ),
        db
          .prepare(
            `INSERT INTO auth_administrators(user_id) SELECT account_id FROM auth_owner_bootstrap WHERE singleton=1 AND completed_at=? AND claim_id=? AND lease_until>? ON CONFLICT(user_id) DO NOTHING`,
          )
          .bind(completeAt, claim, completeAt),
      ]);
      if (
        (await this.store.ownerStatus(current, this.provider.issuer)) !==
        'valid'
      )
        throw new BoundaryError('UNAUTHENTICATED');
    } finally {
      if (admissionCookie) await this.store.logout(admissionCookie);
      await db
        .prepare(
          'UPDATE auth_owner_bootstrap SET claim_id=NULL,lease_until=0 WHERE singleton=1 AND claim_id=?',
        )
        .bind(claim)
        .run();
    }
  }
}
