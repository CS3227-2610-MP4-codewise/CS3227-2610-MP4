import { BoundaryError } from '../../shared/instructor-contracts/schema';
import { LOGIN_TTL, hash, randomToken } from './primitives';
import { AuthStore, type Session } from './store';
import type { FirebaseUser } from './firebase';

export type ManagedInvite = {
  id: string;
  email: string;
  created_by: string;
  course_id: string;
  token_hash: string;
  firebase_uid: string;
  created_at: number;
  accepted_at: number | null;
  revoked_at: number | null;
  send_state: 'queued' | 'failed' | 'unknown';
  sent_at: number | null;
};
export type ActionProof = {
  id: string;
  email: string;
  firebase_uid: string;
  invite_id: string | null;
  user_id: string | null;
  purpose: 'setup' | 'reset';
  invite_generation: string | null;
};
export function inviteView(i: ManagedInvite) {
  return {
    id: i.id,
    email: i.email,
    courseId: i.course_id,
    createdAt: new Date(i.created_at).toISOString(),
    status:
      i.accepted_at !== null
        ? 'accepted'
        : i.revoked_at !== null
          ? 'revoked'
          : 'pending',
    sendState: i.send_state,
    sentAt: i.sent_at === null ? null : new Date(i.sent_at).toISOString(),
  };
}
export class ManagedStore extends AuthStore {
  async cooldown(key: string, duration = 90_000) {
    const now = this.clock();
    const row = await this.db
      .prepare(
        'INSERT INTO auth_cooldowns(key,until_at) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET until_at=excluded.until_at WHERE until_at<=? RETURNING key',
      )
      .bind(await hash(key), now + duration, now)
      .first();
    if (!row) throw new BoundaryError('RATE_LIMITED');
    await this.db
      .prepare('DELETE FROM auth_actions WHERE expires_at<=?')
      .bind(now - 86400000)
      .run();
    await this.db
      .prepare('DELETE FROM auth_cooldowns WHERE until_at<=?')
      .bind(now - 86400000)
      .run();
  }
  async account(email: string, issuer: string) {
    return this.db
      .prepare(
        'SELECT id,subject,active FROM auth_accounts WHERE email=? AND issuer=?',
      )
      .bind(email, issuer)
      .first<{ id: string; subject: string; active: number }>();
  }
  async createManagedInvite(
    s: Session,
    course: string,
    email: string,
    issuer: string,
  ) {
    const existing = await this.account(email, issuer);
    if (
      existing ||
      (await this.db
        .prepare('SELECT id FROM auth_accounts WHERE email=?')
        .bind(email)
        .first())
    )
      throw new BoundaryError('INVALID_CONTRACT');
    await this.cooldown('invite:' + s.user_id + ':' + email);
    const pending = await this.db
      .prepare(
        'SELECT id FROM auth_invites WHERE email=? AND accepted_at IS NULL AND revoked_at IS NULL AND course_id IS NOT NULL',
      )
      .bind(email)
      .first();
    if (pending) throw new BoundaryError('INVALID_CONTRACT');
    const prior = await this.db
      .prepare(
        'SELECT firebase_uid FROM auth_invites WHERE email=? AND firebase_uid IS NOT NULL ORDER BY created_at DESC LIMIT 1',
      )
      .bind(email)
      .first<{ firebase_uid: string }>();
    const token = randomToken(),
      uid = prior?.firebase_uid ?? crypto.randomUUID(),
      id = crypto.randomUUID(),
      now = this.clock();
    await this.db
      .prepare(
        'INSERT INTO auth_invites(id,token_hash,email,created_by,creator_session,created_at,expires_at,course_id,firebase_uid) VALUES(?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        id,
        await hash(token),
        email,
        s.user_id,
        s.id,
        now,
        8640000000000000,
        course,
        uid,
      )
      .run();
    return { token, invitation: await this.owned(s.user_id, course, id) };
  }
  async owned(userId: string, course: string, id: string) {
    const i = await this.db
      .prepare(
        'SELECT * FROM auth_invites WHERE id=? AND created_by=? AND course_id=?',
      )
      .bind(id, userId, course)
      .first<ManagedInvite>();
    if (!i) throw new BoundaryError('FORBIDDEN');
    return i;
  }
  async pending(token: string) {
    const i = await this.db
      .prepare(
        'SELECT * FROM auth_invites WHERE token_hash=? AND course_id IS NOT NULL AND firebase_uid IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL',
      )
      .bind(await hash(token))
      .first<ManagedInvite>();
    if (!i) throw new BoundaryError('UNAUTHENTICATED');
    return i;
  }
  async rotate(i: ManagedInvite) {
    await this.cooldown('resend:' + i.id);
    const token = randomToken();
    const row = await this.db
      .prepare(
        "UPDATE auth_invites SET token_hash=?,send_state='unknown' WHERE id=? AND accepted_at IS NULL AND revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM auth_mail_locks l WHERE l.invite_id=auth_invites.id AND l.expires_at>?) RETURNING id",
      )
      .bind(await hash(token), i.id, this.clock())
      .first();
    if (!row) throw new BoundaryError('RATE_LIMITED');
    await this.db
      .prepare(
        'UPDATE auth_actions SET consumed_at=? WHERE invite_id=? AND consumed_at IS NULL',
      )
      .bind(this.clock(), i.id)
      .run();
    return token;
  }
  async list(userId: string, course: string, cursor: string) {
    const rows = await this.db
      .prepare(
        'SELECT * FROM auth_invites WHERE created_by=? AND course_id=? AND id>? ORDER BY id LIMIT 51',
      )
      .bind(userId, course, cursor)
      .all<ManagedInvite>();
    return {
      items: rows.results.slice(0, 50).map(inviteView),
      nextCursor: rows.results.length > 50 ? rows.results[49].id : null,
    };
  }
  async revoke(i: ManagedInvite) {
    await this.db
      .prepare(
        'UPDATE auth_invites SET revoked_at=? WHERE id=? AND accepted_at IS NULL',
      )
      .bind(this.clock(), i.id)
      .run();
  }
  async receipt(id: string, state: string, messageId?: string, token?: string) {
    await this.db
      .prepare(
        'UPDATE auth_invites SET send_state=?,sent_at=?,message_id=? WHERE id=? AND token_hash=?',
      )
      .bind(
        state,
        this.clock(),
        messageId ?? null,
        id,
        token ? await hash(token) : '',
      )
      .run();
  }
  async lockDispatch(i: ManagedInvite, token: string) {
    const claim = randomToken(),
      now = this.clock();
    const row = await this.db
      .prepare(
        'INSERT INTO auth_mail_locks(invite_id,claim_id,expires_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM auth_invites WHERE id=? AND token_hash=? AND accepted_at IS NULL AND revoked_at IS NULL) ON CONFLICT(invite_id) DO UPDATE SET claim_id=excluded.claim_id,expires_at=excluded.expires_at WHERE expires_at<=? RETURNING claim_id',
      )
      .bind(i.id, claim, now + 120000, i.id, await hash(token), now)
      .first();
    if (!row) throw new BoundaryError('RATE_LIMITED');
    return claim;
  }
  async unlockDispatch(id: string, claim: string) {
    await this.db
      .prepare('DELETE FROM auth_mail_locks WHERE invite_id=? AND claim_id=?')
      .bind(id, claim)
      .run();
  }
  async action(
    code: string,
    user: { uid: string; email: string },
    inviteId: string | null,
    userId: string | null,
    token?: string,
  ) {
    const now = this.clock();
    await this.db.batch([
      this.db
        .prepare(
          'UPDATE auth_actions SET consumed_at=? WHERE firebase_uid=? AND consumed_at IS NULL',
        )
        .bind(now, user.uid),
      this.db
        .prepare(
          'INSERT INTO auth_actions(id,code_hash,email,firebase_uid,invite_id,user_id,purpose,created_at,expires_at,invite_generation) VALUES(?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          await hash(code),
          user.email,
          user.uid,
          inviteId,
          userId,
          inviteId ? 'setup' : 'reset',
          now,
          now + LOGIN_TTL,
          token ? await hash(token) : null,
        ),
    ]);
  }
  async proof(code: string, purpose: 'setup' | 'reset', token?: string) {
    const row = await this.db
      .prepare(
        'SELECT * FROM auth_actions WHERE code_hash=? AND purpose=? AND consumed_at IS NULL AND expires_at>?',
      )
      .bind(await hash(code), purpose, this.clock())
      .first<ActionProof>();
    if (!row) throw new BoundaryError('UNAUTHENTICATED');
    if (purpose === 'setup') {
      const invite = token ? await this.pending(token) : null;
      if (
        !invite ||
        invite.id !== row.invite_id ||
        invite.firebase_uid !== row.firebase_uid ||
        invite.token_hash !== row.invite_generation ||
        invite.email !== row.email
      )
        throw new BoundaryError('UNAUTHENTICATED');
    } else {
      const user = await this.db
        .prepare(
          'SELECT id FROM auth_accounts WHERE id=? AND subject=? AND email=? AND active=1',
        )
        .bind(row.user_id, row.firebase_uid, row.email)
        .first();
      if (!user) throw new BoundaryError('UNAUTHENTICATED');
    }
    return row;
  }
  async consume(proof: ActionProof) {
    const now = this.clock();
    const row = await this.db
      .prepare(
        'UPDATE auth_actions SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND expires_at>? RETURNING id',
      )
      .bind(now, proof.id, now)
      .first();
    if (!row) throw new BoundaryError('UNAUTHENTICATED');
    // Revoke before external mutation. Unknown provider outcome cannot leave old app cookies usable.
    if (proof.user_id) await this.revokeAll(proof.user_id);
  }
  async revokeAll(userId: string) {
    await this.db
      .prepare(
        'UPDATE auth_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL',
      )
      .bind(this.clock(), userId)
      .run();
  }
  async loginManaged(
    browser: string,
    user: FirebaseUser,
    issuer: string,
    returnPath: string,
    invite: string | null,
    oldToken?: string | null,
  ) {
    const start = await this.begin(browser, invite, returnPath, oldToken);
    const token = await this.complete(await this.claim(start.state, browser), {
      issuer,
      subject: user.uid,
      email: user.email,
    });
    await this.db
      .prepare(
        'UPDATE auth_sessions SET provider_password_at=?,provider_valid_since=? WHERE token_hash=?',
      )
      .bind(user.passwordAt, user.validSince, await hash(token))
      .run();
    return token;
  }
  async binding(s: Session) {
    return this.db
      .prepare(
        'SELECT a.issuer,a.subject,s.provider_password_at,s.provider_valid_since FROM auth_accounts a JOIN auth_sessions s ON s.user_id=a.id WHERE s.id=? AND s.revoked_at IS NULL',
      )
      .bind(s.id)
      .first<{
        issuer: string;
        subject: string;
        provider_password_at: number | null;
        provider_valid_since: number | null;
      }>();
  }
}
