import { BoundaryError } from '../../shared/instructor-contracts/schema';
import type { Invitation } from '../../shared/auth';
import {
  ABSOLUTE,
  IDLE,
  INVITE_TTL,
  LOGIN_TTL,
  hash,
  randomToken,
} from './primitives';

export type Transaction = {
  id: string;
  nonce: string;
  verifier: string;
  invite_hash: string | null;
  return_path: string;
  claim_id: string;
  old_session_hash: string | null;
};
export type Session = {
  id: string;
  user_id: string;
  email: string;
  expires_at: number;
  last_seen: number;
  return_path: string;
  administrator: number;
};
export type VerifiedIdentity = {
  issuer: string;
  subject: string;
  email: string;
};
type InviteRow = {
  id: string;
  email: string;
  created_at: number;
  expires_at: number;
  revoked_at: number | null;
  accepted_at: number | null;
};
const iso = (n: number) => new Date(n).toISOString();
export function projectInvite(r: InviteRow, now: number): Invitation {
  return {
    id: r.id,
    email: r.email,
    createdAt: iso(r.created_at),
    expiresAt: iso(r.expires_at),
    status:
      r.accepted_at !== null
        ? 'accepted'
        : r.revoked_at !== null
          ? 'revoked'
          : r.expires_at <= now
            ? 'expired'
            : 'pending',
  };
}

/** Authoritative SH-AUTH storage. D1 batches roll back all statements on a failed guard. */
export class AuthStore {
  constructor(
    readonly db: D1Database,
    readonly clock: () => number = Date.now,
  ) {}
  async rate(key: string, limit: number, window = 60_000) {
    const now = this.clock(),
      bucket = await hash(key + ':' + Math.floor(now / window));
    const row = await this.db
      .prepare(
        'INSERT INTO auth_rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count',
      )
      .bind(bucket, now + window)
      .first<{ count: number }>();
    if (!row || row.count > limit) throw new BoundaryError('RATE_LIMITED');
    await this.db.batch([
      this.db
        .prepare(
          'DELETE FROM auth_rate_limits WHERE bucket IN (SELECT bucket FROM auth_rate_limits WHERE expires_at<=? LIMIT 100)',
        )
        .bind(now),
      this.db
        .prepare(
          'DELETE FROM auth_transactions WHERE id IN (SELECT id FROM auth_transactions WHERE expires_at<=? LIMIT 100)',
        )
        .bind(now),
      this.db
        .prepare(
          'DELETE FROM auth_sessions WHERE id IN (SELECT id FROM auth_sessions WHERE expires_at<=? LIMIT 100)',
        )
        .bind(now),
    ]);
  }
  async begin(
    browser: string,
    invite: string | null,
    returnPath: string,
    oldToken?: string | null,
  ) {
    const now = this.clock(),
      state = randomToken(),
      nonce = randomToken(),
      verifier = randomToken();
    await this.db
      .prepare(
        'INSERT INTO auth_transactions(id,state_hash,browser_hash,nonce,verifier,invite_hash,return_path,created_at,expires_at,old_session_hash) VALUES(?,?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        await hash(state),
        await hash(browser),
        nonce,
        verifier,
        invite ? await hash(invite) : null,
        returnPath,
        now,
        now + LOGIN_TTL,
        oldToken ? await hash(oldToken) : null,
      )
      .run();
    return { state, nonce, verifier };
  }
  async claim(state: string, browser: string): Promise<Transaction> {
    const row = await this.db
      .prepare(
        'UPDATE auth_transactions SET used_at=?,claim_id=? WHERE state_hash=? AND browser_hash=? AND used_at IS NULL AND expires_at>? RETURNING id,nonce,verifier,invite_hash,return_path,claim_id,old_session_hash',
      )
      .bind(
        this.clock(),
        randomToken(),
        await hash(state),
        await hash(browser),
        this.clock(),
      )
      .first<Transaction>();
    if (!row) throw new BoundaryError('UNAUTHENTICATED');
    return row;
  }
  async complete(t: Transaction, identity: VerifiedIdentity) {
    const now = this.clock(),
      token = randomToken(),
      sessionId = crypto.randomUUID();
    // INSERT SELECT avoids invoking the new-account trigger for existing subjects.
    await this.db.batch([
      this.db
        .prepare(
          'INSERT INTO auth_accounts(id,issuer,subject,email,created_at,signup_tx) SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM auth_accounts WHERE issuer=? AND subject=?)',
        )
        .bind(
          crypto.randomUUID(),
          identity.issuer,
          identity.subject,
          identity.email,
          now,
          t.id,
          identity.issuer,
          identity.subject,
        ),
      // Verified email is mutable contact data; issuer/subject alone retain identity.
      this.db
        .prepare(
          'UPDATE auth_accounts SET email=? WHERE issuer=? AND subject=? AND active=1',
        )
        .bind(identity.email, identity.issuer, identity.subject),
      // Match current verified email for invite redemption, including existing accounts.
      this.db
        .prepare(
          `INSERT INTO auth_sessions(id,token_hash,user_id,login_tx,callback_claim,created_at,last_seen,expires_at,return_path)
    VALUES(?,?,(SELECT id FROM auth_accounts WHERE issuer=? AND subject=? AND active=1 AND
     (? IS NULL OR email=?)),?,?,?,?,?,?)`,
        )
        .bind(
          sessionId,
          await hash(token),
          identity.issuer,
          identity.subject,
          t.invite_hash,
          identity.email,
          t.id,
          t.claim_id,
          now,
          now,
          now + ABSOLUTE,
          t.return_path,
        ),
      this.db
        .prepare(
          'UPDATE auth_invites SET accepted_by=(SELECT user_id FROM auth_sessions WHERE id=?),accepted_at=? WHERE token_hash=? AND accepted_by IS NULL AND revoked_at IS NULL AND expires_at>?',
        )
        .bind(sessionId, now, t.invite_hash, now),
      this.db
        .prepare(
          'UPDATE auth_transactions SET completed_at=? WHERE id=? AND claim_id=?',
        )
        .bind(now, t.id, t.claim_id),
      this.db
        .prepare(
          'UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL',
        )
        .bind(now, t.old_session_hash),
    ]);
    return token;
  }
  async session(token: string): Promise<Session> {
    const now = this.clock(),
      tokenHash = await hash(token);
    const touched = await this.db
      .prepare(
        `UPDATE auth_sessions SET last_seen=MAX(last_seen,?) WHERE token_hash=? AND revoked_at IS NULL AND expires_at>? AND last_seen>?
   AND EXISTS(SELECT 1 FROM auth_accounts a WHERE a.id=user_id AND a.active=1) RETURNING id`,
      )
      .bind(now, tokenHash, now, now - IDLE)
      .first();
    if (!touched) throw new BoundaryError('UNAUTHENTICATED');
    const row = await this.db
      .prepare(
        `SELECT s.id,s.user_id,a.email,s.expires_at,s.last_seen,s.return_path,EXISTS(SELECT 1 FROM auth_administrators d WHERE d.user_id=a.id) AS administrator
   FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND a.active=1 AND s.expires_at>? AND s.last_seen>?`,
      )
      .bind(tokenHash, now, now - IDLE)
      .first<Session>();
    if (!row) throw new BoundaryError('UNAUTHENTICATED');
    return row;
  }
  async logout(token: string) {
    await this.db
      .prepare(
        'UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL',
      )
      .bind(this.clock(), await hash(token))
      .run();
  }
  private adminSql = `EXISTS(SELECT 1 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id JOIN auth_administrators d ON d.user_id=a.id WHERE s.id=? AND s.revoked_at IS NULL AND a.active=1 AND s.expires_at>? AND s.last_seen>?)`;
  async requireAdmin(s: Session) {
    const now = this.clock();
    const row = await this.db
      .prepare(`SELECT 1 AS ok WHERE ${this.adminSql}`)
      .bind(s.id, now, now - IDLE)
      .first();
    if (!row) throw new BoundaryError('FORBIDDEN');
  }
  async createInvite(s: Session, email: string) {
    await this.requireAdmin(s);
    const now = this.clock(),
      token = randomToken(),
      id = crypto.randomUUID();
    await this.db
      .prepare(
        'INSERT INTO auth_invites(id,token_hash,email,created_by,creator_session,created_at,expires_at) VALUES(?,?,?,?,?,?,?)',
      )
      .bind(
        id,
        await hash(token),
        email,
        s.user_id,
        s.id,
        now,
        now + INVITE_TTL,
      )
      .run();
    return {
      token,
      invitation: projectInvite(
        {
          id,
          email,
          created_at: now,
          expires_at: now + INVITE_TTL,
          revoked_at: null,
          accepted_at: null,
        },
        now,
      ),
    };
  }
  async invitations(s: Session, cursor: string) {
    await this.requireAdmin(s);
    const now = this.clock();
    const rows = await this.db
      .prepare(
        `SELECT id,email,created_at,expires_at,revoked_at,accepted_at FROM auth_invites WHERE id>? AND ${this.adminSql} ORDER BY id LIMIT 51`,
      )
      .bind(cursor, s.id, now, now - IDLE)
      .all<InviteRow>();
    return {
      items: rows.results.slice(0, 50).map((r) => projectInvite(r, now)),
      nextCursor: rows.results.length > 50 ? rows.results[49].id : null,
    };
  }
  async revokeInvite(s: Session, id: string) {
    await this.requireAdmin(s);
    const now = this.clock();
    await this.db
      .prepare(
        `UPDATE auth_invites SET revoked_at=? WHERE id=? AND accepted_at IS NULL AND revoked_at IS NULL AND ${this.adminSql}`,
      )
      .bind(now, id, s.id, now, now - IDLE)
      .run();
    await this.requireAdmin(s);
  }
}
