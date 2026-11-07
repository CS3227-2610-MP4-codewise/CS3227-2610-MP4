import { BoundaryError } from '../../shared/instructor-contracts/schema';
import { ABSOLUTE, IDLE, LOGIN_TTL, hash, randomToken } from './primitives';
import { AuthStore, type Session } from './store';
import type { FirebaseUser } from './firebase';

export type ManagedInvite = {
  id: string;
  email: string;
  created_by: string;
  course_id: string;
  token_hash: string;
  firebase_uid: string;
  target_role: 'student' | 'instructor' | null;
  acceptance_group?: string | null;
  grouped_roles?: string | null;
  grouped_send_state?: 'queued' | 'failed' | 'unknown';
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
    targetRole: i.target_role ?? null,
    targetRoles: i.grouped_roles
      ? i.grouped_roles.split(',')
      : i.target_role
        ? [i.target_role]
        : [],
    createdAt: new Date(i.created_at).toISOString(),
    status:
      i.accepted_at !== null
        ? 'accepted'
        : i.revoked_at !== null
          ? 'revoked'
          : 'pending',
    sendState: i.grouped_send_state ?? i.send_state,
    sentAt: i.sent_at === null ? null : new Date(i.sent_at).toISOString(),
  };
}
export class ManagedStore extends AuthStore {
  async ownerStatus(
    user: FirebaseUser,
    issuer: string,
  ): Promise<'none' | 'valid' | 'invalid'> {
    const row = await this.db
      .prepare(
        `SELECT o.*, EXISTS(SELECT 1 FROM auth_accounts a JOIN auth_administrators d ON d.user_id=a.id WHERE a.id=o.account_id AND a.issuer=o.issuer AND a.subject=o.subject AND a.email=o.email AND a.active=1) AS admitted FROM auth_owner_bootstrap o WHERE o.singleton=1 AND o.issuer=? AND o.subject=?`,
      )
      .bind(issuer, user.uid)
      .first<{
        completed_at: number | null;
        email: string;
        password_at: number | null;
        valid_since: number | null;
        admitted: number;
      }>();
    if (!row) return 'none';
    return row.completed_at !== null &&
      row.admitted === 1 &&
      row.email === user.email &&
      !user.disabled &&
      row.password_at === user.passwordAt &&
      row.valid_since === user.validSince
      ? 'valid'
      : 'invalid';
  }
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
  async recoveryCandidate(email: string) {
    return this.db
      .prepare(
        'SELECT firebase_uid,verified_at FROM auth_invitation_recovery_candidates WHERE email=?',
      )
      .bind(email)
      .first<{ firebase_uid: string; verified_at: number | null }>();
  }
  async recordRecoveryCandidate(email: string, uid: string) {
    const row = await this.db
      .prepare(
        `INSERT INTO auth_invitation_recovery_candidates(email,firebase_uid) VALUES(?,?)
        ON CONFLICT(email) DO UPDATE SET firebase_uid=excluded.firebase_uid WHERE firebase_uid=excluded.firebase_uid RETURNING firebase_uid`,
      )
      .bind(email, uid)
      .first();
    if (!row) throw new BoundaryError('FORBIDDEN');
  }
  async bindRecovery(
    i: ManagedInvite,
    proof: ActionProof,
    claim: string,
    issuer: string,
  ) {
    const now = this.clock(),
      guard = crypto.randomUUID();
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO course_write_guards(id,allowed) SELECT ?,CASE WHEN EXISTS(
        SELECT 1 FROM auth_invites i JOIN auth_actions p ON p.id=? AND p.invite_id=i.id AND p.firebase_uid=? AND p.email=i.email AND p.invite_generation=i.token_hash AND p.consumed_at IS NOT NULL AND p.expires_at>?
        JOIN auth_invitation_recovery_candidates r ON r.email=i.email AND r.firebase_uid=p.firebase_uid
        JOIN auth_course_setup_locks l ON l.email=i.email AND l.claim_id=?
        JOIN courses c ON c.id=i.course_id AND c.active=1
        JOIN course_memberships m ON m.course_id=i.course_id AND m.user_id=i.created_by AND m.role='instructor' AND m.active=1
        JOIN auth_accounts a ON a.id=m.user_id AND a.active=1
        WHERE i.id=? AND i.accepted_at IS NULL AND i.revoked_at IS NULL
        AND NOT EXISTS(SELECT 1 FROM auth_accounts existing WHERE existing.email=i.email OR (existing.subject=p.firebase_uid AND existing.issuer=?))
      ) THEN 1 ELSE 0 END`,
        )
        .bind(guard, proof.id, proof.firebase_uid, now, claim, i.id, issuer),
      this.db
        .prepare(
          'UPDATE auth_invitation_recovery_candidates SET verified_at=? WHERE email=? AND firebase_uid=?',
        )
        .bind(now, i.email, proof.firebase_uid),
      this.db
        .prepare(
          'UPDATE auth_invitation_identities SET firebase_uid=? WHERE email=?',
        )
        .bind(proof.firebase_uid, i.email),
      this.db
        .prepare(
          'UPDATE auth_invites SET firebase_uid=? WHERE email=? AND target_role IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL',
        )
        .bind(proof.firebase_uid, i.email),
      this.db.prepare('DELETE FROM course_write_guards WHERE id=?').bind(guard),
    ]);
  }
  async lockSetup(email: string) {
    const claim = randomToken(),
      now = this.clock();
    const row = await this.db
      .prepare(
        `INSERT INTO auth_course_setup_locks(email,claim_id,expires_at) VALUES(?,?,?)
      ON CONFLICT(email) DO UPDATE SET claim_id=excluded.claim_id,expires_at=excluded.expires_at
      WHERE phase='preparing' AND expires_at<=? RETURNING claim_id`,
      )
      .bind(email, claim, now + 120000, now)
      .first();
    if (!row) throw new BoundaryError('RATE_LIMITED');
    return claim;
  }
  async beginSetupReset(email: string, claim: string) {
    const row = await this.db
      .prepare(
        "UPDATE auth_course_setup_locks SET phase='resetting' WHERE email=? AND claim_id=? AND phase='preparing' RETURNING claim_id",
      )
      .bind(email, claim)
      .first();
    if (!row) throw new BoundaryError('RATE_LIMITED');
  }
  async unlockSetup(email: string, claim: string) {
    await this.db
      .prepare(
        'DELETE FROM auth_course_setup_locks WHERE email=? AND claim_id=?',
      )
      .bind(email, claim)
      .run();
  }
  private async duplicateInvite(
    s: Session,
    course: string,
    email: string,
    role: 'student' | 'instructor',
  ) {
    const now = this.clock();
    return this.db
      .prepare(
        `SELECT i.* FROM auth_invites i WHERE i.course_id=? AND i.email=? AND i.target_role=? AND i.accepted_at IS NULL AND i.revoked_at IS NULL
      AND EXISTS(SELECT 1 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id AND a.active=1 JOIN course_memberships m ON m.user_id=a.id AND m.course_id=i.course_id AND m.role='instructor' AND m.active=1 JOIN courses c ON c.id=m.course_id AND c.active=1 WHERE s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?) ORDER BY i.created_at,i.id LIMIT 1`,
      )
      .bind(course, email, role, s.id, s.user_id, now, now - IDLE)
      .first<ManagedInvite>();
  }
  async createManagedInvite(
    s: Session,
    course: string,
    email: string,
    issuer: string,
    role: 'student' | 'instructor',
  ) {
    const existing = await this.account(email, issuer);
    if (
      (!existing &&
        (await this.db
          .prepare('SELECT id FROM auth_accounts WHERE email=?')
          .bind(email)
          .first())) ||
      (existing && !existing.active)
    )
      throw new BoundaryError('INVALID_CONTRACT');
    const duplicate = await this.duplicateInvite(s, course, email, role);
    if (duplicate) return { token: null, invitation: duplicate };
    await this.cooldown(
      'invite:' + s.user_id + ':' + course + ':' + email + ':' + role,
    );
    const prior = await this.db
      .prepare(
        'SELECT firebase_uid FROM auth_invites WHERE email=? AND firebase_uid IS NOT NULL ORDER BY created_at DESC LIMIT 1',
      )
      .bind(email)
      .first<{ firebase_uid: string }>();
    await this.db
      .prepare(
        'INSERT OR IGNORE INTO auth_invitation_identities(email,firebase_uid) VALUES(?,?)',
      )
      .bind(
        email,
        existing?.subject ?? prior?.firebase_uid ?? crypto.randomUUID(),
      )
      .run();
    if (existing)
      await this.db
        .prepare(
          `UPDATE auth_invitation_identities SET firebase_uid=? WHERE email=? AND firebase_uid<>?
      AND NOT EXISTS(SELECT 1 FROM auth_invites WHERE email=? AND target_role IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL)`,
        )
        .bind(existing.subject, email, existing.subject, email)
        .run();
    const reserved = await this.db
      .prepare(
        'SELECT firebase_uid FROM auth_invitation_identities WHERE email=?',
      )
      .bind(email)
      .first<{ firebase_uid: string }>();
    if (!reserved || (existing && existing.subject !== reserved.firebase_uid))
      throw new BoundaryError('INVALID_CONTRACT');
    const token = randomToken(),
      uid = reserved.firebase_uid,
      id = crypto.randomUUID(),
      now = this.clock();
    const inserted = await this.db
      .prepare(
        `INSERT INTO auth_invites(id,token_hash,email,created_by,creator_session,created_at,expires_at,course_id,firebase_uid,target_role)
        SELECT ?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM auth_invites WHERE course_id=? AND email=? AND target_role=? AND accepted_at IS NULL AND revoked_at IS NULL) RETURNING id`,
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
        role,
        course,
        email,
        role,
      )
      .first();
    if (!inserted) {
      const raced = await this.duplicateInvite(s, course, email, role);
      if (!raced) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
      return { token: null, invitation: raced };
    }
    return { token, invitation: await this.owned(s.user_id, course, id) };
  }
  async owned(userId: string, course: string, id: string) {
    const i = await this.db
      .prepare(
        'SELECT * FROM auth_invites WHERE id=? AND course_id=? AND ? IS NOT NULL',
      )
      .bind(id, course, userId)
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
  async courseInvitation(token: string) {
    const i = await this.db
      .prepare(
        `SELECT i.*,c.name AS course_name FROM auth_invites i
      JOIN courses c ON c.id=i.course_id AND c.active=1
      JOIN course_memberships m ON m.course_id=i.course_id AND m.user_id=i.created_by AND m.role='instructor' AND m.active=1
      JOIN auth_accounts a ON a.id=i.created_by AND a.active=1
      WHERE i.token_hash=? AND i.target_role IS NOT NULL AND i.revoked_at IS NULL`,
      )
      .bind(await hash(token))
      .first<
        ManagedInvite & { course_name: string; accepted_by: string | null }
      >();
    if (!i) throw new BoundaryError('UNAUTHENTICATED');
    return i;
  }
  async pendingRoles(i: ManagedInvite) {
    const rows = await this.db
      .prepare(
        `SELECT DISTINCT target_role FROM auth_invites WHERE course_id=? AND email=? AND target_role IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL ORDER BY target_role`,
      )
      .bind(i.course_id, i.email)
      .all<{ target_role: 'student' | 'instructor' }>();
    return rows.results.map((r) => r.target_role);
  }
  async acceptedRoles(i: ManagedInvite) {
    if (!i.acceptance_group) return [i.target_role!];
    const rows = await this.db
      .prepare(
        'SELECT DISTINCT target_role FROM auth_invites WHERE course_id=? AND email=? AND acceptance_group=? AND accepted_by=? AND target_role IS NOT NULL ORDER BY target_role',
      )
      .bind(
        i.course_id,
        i.email,
        i.acceptance_group,
        (i as ManagedInvite & { accepted_by: string }).accepted_by,
      )
      .all<{ target_role: 'student' | 'instructor' }>();
    return rows.results.map((r) => r.target_role);
  }
  async admitCourseUser(
    browser: string,
    user: FirebaseUser,
    issuer: string,
    invite: string,
  ) {
    const start = await this.begin(browser, invite, '/workspace');
    const tx = await this.claim(start.state, browser);
    const now = this.clock(),
      token = randomToken(),
      sessionId = crypto.randomUUID();
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO auth_accounts(id,issuer,subject,email,created_at,signup_tx)
        SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM auth_accounts WHERE issuer=? AND subject=?)`,
        )
        .bind(
          crypto.randomUUID(),
          issuer,
          user.uid,
          user.email,
          now,
          tx.id,
          issuer,
          user.uid,
        ),
      this.db
        .prepare(
          `INSERT INTO auth_sessions(id,token_hash,user_id,login_tx,callback_claim,created_at,last_seen,expires_at,return_path,provider_password_at,provider_valid_since)
        VALUES(?,?,(SELECT id FROM auth_accounts WHERE issuer=? AND subject=? AND email=? AND active=1),?,?,?,?,?,?,?,?)`,
        )
        .bind(
          sessionId,
          await hash(token),
          issuer,
          user.uid,
          user.email,
          tx.id,
          tx.claim_id,
          now,
          now,
          now + ABSOLUTE,
          '/workspace',
          user.passwordAt,
          user.validSince,
        ),
      this.db
        .prepare(
          'UPDATE auth_transactions SET completed_at=? WHERE id=? AND claim_id=?',
        )
        .bind(now, tx.id, tx.claim_id),
    ]);
    return token;
  }
  async acceptCourse(
    token: string,
    session: Session,
    expectedRoles: ('student' | 'instructor')[],
  ) {
    const now = this.clock(),
      invitation = await this.courseInvitation(token);
    if (invitation.email !== session.email)
      throw new BoundaryError('FORBIDDEN');
    if (invitation.accepted_at !== null) {
      const current = await this.db
        .prepare(
          `SELECT 1 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id AND a.active=1 WHERE s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?
          AND (SELECT COUNT(DISTINCT m.role) FROM course_memberships m WHERE m.course_id=? AND m.user_id=s.user_id AND m.active=1 AND m.role IN (?,?))=?`,
        )
        .bind(
          session.id,
          session.user_id,
          now,
          now - IDLE,
          invitation.course_id,
          expectedRoles[0],
          expectedRoles[1] ?? expectedRoles[0],
          expectedRoles.length,
        )
        .first();
      if (invitation.accepted_by !== session.user_id || !current)
        throw new BoundaryError('FORBIDDEN');
      return;
    }
    const guard = crypto.randomUUID(),
      tokenHash = await hash(token);
    try {
      await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO course_write_guards(id,allowed) SELECT ?,CASE WHEN EXISTS(
        SELECT 1 FROM auth_invites i JOIN courses c ON c.id=i.course_id AND c.active=1
        JOIN course_memberships m ON m.course_id=c.id AND m.user_id=i.created_by AND m.role='instructor' AND m.active=1
        JOIN auth_accounts ia ON ia.id=i.created_by AND ia.active=1
        JOIN auth_sessions s ON s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?
        JOIN auth_accounts a ON a.id=s.user_id AND a.active=1 AND a.email=i.email AND a.subject=i.firebase_uid
        WHERE i.id=? AND i.token_hash=? AND i.target_role IN ('student','instructor') AND i.accepted_at IS NULL AND i.revoked_at IS NULL
        AND (SELECT COUNT(DISTINCT p.target_role) FROM auth_invites p WHERE p.course_id=i.course_id AND p.email=i.email AND p.target_role IS NOT NULL AND p.accepted_at IS NULL AND p.revoked_at IS NULL)=?
        AND NOT EXISTS(SELECT 1 FROM auth_invites p WHERE p.course_id=i.course_id AND p.email=i.email AND p.target_role IS NOT NULL AND p.accepted_at IS NULL AND p.revoked_at IS NULL AND (p.target_role NOT IN (?,?) OR p.firebase_uid<>i.firebase_uid OR NOT EXISTS(SELECT 1 FROM course_memberships tm JOIN auth_accounts ta ON ta.id=tm.user_id AND ta.active=1 WHERE tm.course_id=p.course_id AND tm.user_id=p.created_by AND tm.role='instructor' AND tm.active=1)))
      ) THEN 1 ELSE 0 END`,
          )
          .bind(
            guard,
            session.id,
            session.user_id,
            now,
            now - IDLE,
            invitation.id,
            tokenHash,
            expectedRoles.length,
            expectedRoles[0],
            expectedRoles[1] ?? expectedRoles[0],
          ),
        this.db
          .prepare(
            `INSERT INTO course_memberships(course_id,user_id,role,active) SELECT DISTINCT course_id,?,target_role,1 FROM auth_invites WHERE course_id=? AND email=? AND target_role IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL
        ON CONFLICT(course_id,user_id,role) DO UPDATE SET active=1`,
          )
          .bind(session.user_id, invitation.course_id, invitation.email),
        this.db
          .prepare(
            'UPDATE auth_invites SET accepted_by=?,accepted_at=?,acceptance_group=? WHERE course_id=? AND email=? AND target_role IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL',
          )
          .bind(
            session.user_id,
            now,
            guard,
            invitation.course_id,
            invitation.email,
          ),
        this.db
          .prepare('DELETE FROM course_write_guards WHERE id=?')
          .bind(guard),
      ]);
    } catch (error) {
      const receipt = await this.db
        .prepare(
          `SELECT 1 FROM auth_invites i
        JOIN courses c ON c.id=i.course_id AND c.active=1
        JOIN course_memberships teacher ON teacher.course_id=i.course_id AND teacher.user_id=i.created_by AND teacher.role='instructor' AND teacher.active=1
        JOIN auth_accounts ia ON ia.id=teacher.user_id AND ia.active=1
        JOIN course_memberships m ON m.course_id=i.course_id AND m.user_id=i.accepted_by AND m.role=i.target_role AND m.active=1
        JOIN auth_sessions s ON s.id=? AND s.user_id=m.user_id AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?
        JOIN auth_accounts a ON a.id=s.user_id AND a.active=1
        WHERE i.id=? AND i.token_hash=? AND i.accepted_by=? AND i.accepted_at IS NOT NULL AND i.revoked_at IS NULL
        AND (SELECT COUNT(DISTINCT mm.role) FROM course_memberships mm WHERE mm.course_id=i.course_id AND mm.user_id=i.accepted_by AND mm.active=1 AND mm.role IN (?,?))=?`,
        )
        .bind(
          session.id,
          now,
          now - IDLE,
          invitation.id,
          tokenHash,
          session.user_id,
          expectedRoles[0],
          expectedRoles[1] ?? expectedRoles[0],
          expectedRoles.length,
        )
        .first();
      if (!receipt) throw error;
    }
  }
  private actorGuard(s: Session, course: string, now: number, guard: string) {
    return this.db
      .prepare(
        `INSERT INTO course_write_guards(id,allowed) SELECT ?,CASE WHEN EXISTS(
      SELECT 1 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id AND a.active=1
      JOIN course_memberships m ON m.user_id=a.id AND m.course_id=? AND m.role='instructor' AND m.active=1
      JOIN courses c ON c.id=m.course_id AND c.active=1
      WHERE s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?) THEN 1 ELSE 0 END`,
      )
      .bind(guard, course, s.id, s.user_id, now, now - IDLE);
  }
  async rotate(i: ManagedInvite, s: Session) {
    await this.cooldown('resend:' + i.id);
    const token = randomToken(),
      now = this.clock(),
      guard = crypto.randomUUID(),
      nextHash = await hash(token);
    const results = await this.db.batch([
      this.actorGuard(s, i.course_id, now, guard),
      this.db
        .prepare(
          "UPDATE auth_invites SET token_hash=?,send_state='unknown' WHERE id=? AND token_hash=? AND accepted_at IS NULL AND revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM auth_mail_locks l WHERE l.invite_id=auth_invites.id AND l.expires_at>?) RETURNING id",
        )
        .bind(nextHash, i.id, i.token_hash, now),
      this.db
        .prepare(
          'UPDATE auth_actions SET consumed_at=? WHERE invite_id=? AND consumed_at IS NULL AND EXISTS(SELECT 1 FROM auth_invites WHERE id=? AND token_hash=?)',
        )
        .bind(now, i.id, i.id, nextHash),
      this.db.prepare('DELETE FROM course_write_guards WHERE id=?').bind(guard),
    ]);
    if (!results[1].results.length) throw new BoundaryError('RATE_LIMITED');
    return token;
  }
  async list(s: Session, course: string, cursor: string) {
    const now = this.clock();
    const rows = await this.db
      .prepare(
        `SELECT i.*, (SELECT GROUP_CONCAT(role, ',') FROM (SELECT DISTINCT p.target_role AS role FROM auth_invites p WHERE p.course_id=i.course_id AND p.email=i.email AND p.target_role IS NOT NULL AND (p.accepted_at IS NULL AND p.revoked_at IS NULL OR (i.accepted_at IS NOT NULL AND p.accepted_at IS NOT NULL)) ORDER BY p.target_role)) AS grouped_roles,
        CASE WHEN EXISTS(SELECT 1 FROM auth_invites p WHERE p.course_id=i.course_id AND p.email=i.email AND p.target_role IS NOT NULL AND p.accepted_at IS NULL AND p.revoked_at IS NULL AND p.send_state='failed') THEN 'failed'
        WHEN EXISTS(SELECT 1 FROM auth_invites p WHERE p.course_id=i.course_id AND p.email=i.email AND p.target_role IS NOT NULL AND p.accepted_at IS NULL AND p.revoked_at IS NULL AND p.send_state='unknown') THEN 'unknown' ELSE i.send_state END AS grouped_send_state
        FROM auth_invites i WHERE i.course_id=? AND i.id>? AND i.id=(SELECT p.id FROM auth_invites p WHERE p.course_id=i.course_id AND p.email=i.email ORDER BY CASE WHEN p.accepted_at IS NULL AND p.revoked_at IS NULL AND p.target_role IS NOT NULL THEN 0 WHEN p.accepted_at IS NULL AND p.revoked_at IS NULL THEN 1 WHEN p.accepted_at IS NOT NULL THEN 2 ELSE 3 END,CASE p.send_state WHEN 'failed' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END,p.created_at DESC,p.id DESC LIMIT 1) AND EXISTS (
         SELECT 1 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id AND a.active=1
         JOIN course_memberships m ON m.user_id=a.id AND m.course_id=i.course_id AND m.role='instructor' AND m.active=1
         JOIN courses c ON c.id=m.course_id AND c.active=1
         WHERE s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?) ORDER BY i.id LIMIT 51`,
      )
      .bind(course, cursor, s.id, s.user_id, now, now - IDLE)
      .all<ManagedInvite>();
    return {
      items: rows.results.slice(0, 50).map(inviteView),
      nextCursor: rows.results.length > 50 ? rows.results[49].id : null,
    };
  }
  async people(s: Session, course: string, cursor: string) {
    const now = this.clock();
    const rows = await this.db
      .prepare(
        `WITH people(email) AS (
      SELECT a.email FROM course_memberships m JOIN auth_accounts a ON a.id=m.user_id AND a.active=1 WHERE m.course_id=? AND m.active=1
      UNION SELECT i.email FROM auth_invites i WHERE i.course_id=? AND i.target_role IS NOT NULL AND i.accepted_at IS NULL AND i.revoked_at IS NULL
    ) SELECT p.email,
      EXISTS(SELECT 1 FROM course_creation_receipts r JOIN auth_accounts a ON a.id=r.user_id AND a.active=1 JOIN course_memberships m ON m.course_id=r.course_id AND m.user_id=a.id AND m.role='instructor' AND m.active=1 WHERE r.course_id=? AND a.email=p.email) AS is_coordinator,
      (SELECT a.id FROM auth_accounts a JOIN course_memberships m ON m.user_id=a.id AND m.course_id=? AND m.active=1 WHERE a.email=p.email AND a.active=1 LIMIT 1) AS user_id,
      (SELECT GROUP_CONCAT(role, ',') FROM (SELECT DISTINCT m.role AS role FROM course_memberships m JOIN auth_accounts a ON a.id=m.user_id AND a.active=1 WHERE m.course_id=? AND a.email=p.email AND m.active=1 ORDER BY m.role)) AS active_roles,
      (SELECT GROUP_CONCAT(role, ',') FROM (SELECT DISTINCT i.target_role AS role FROM auth_invites i WHERE i.course_id=? AND i.email=p.email AND i.target_role IS NOT NULL AND i.accepted_at IS NULL AND i.revoked_at IS NULL ORDER BY i.target_role)) AS pending_roles,
      (SELECT i.id FROM auth_invites i WHERE i.course_id=? AND i.email=p.email AND i.target_role IS NOT NULL AND i.accepted_at IS NULL AND i.revoked_at IS NULL ORDER BY CASE i.send_state WHEN 'failed' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END,i.created_at DESC,i.id DESC LIMIT 1) AS invitation_id,
      (SELECT i.send_state FROM auth_invites i WHERE i.course_id=? AND i.email=p.email AND i.target_role IS NOT NULL AND i.accepted_at IS NULL AND i.revoked_at IS NULL ORDER BY CASE i.send_state WHEN 'failed' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END,i.created_at DESC,i.id DESC LIMIT 1) AS send_state
      FROM people p WHERE p.email>? AND EXISTS(SELECT 1 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id AND a.active=1 JOIN course_memberships m ON m.user_id=a.id AND m.course_id=? AND m.role='instructor' AND m.active=1 JOIN courses c ON c.id=m.course_id AND c.active=1 WHERE s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?) ORDER BY p.email LIMIT 51`,
      )
      .bind(
        course,
        course,
        course,
        course,
        course,
        course,
        course,
        course,
        cursor,
        course,
        s.id,
        s.user_id,
        now,
        now - IDLE,
      )
      .all<{
        email: string;
        is_coordinator: number;
        user_id: string | null;
        active_roles: string | null;
        pending_roles: string | null;
        invitation_id: string | null;
        send_state: 'queued' | 'failed' | 'unknown' | null;
      }>();
    const items = rows.results.slice(0, 50).map((row) => ({
      email: row.email,
      isCoordinator: row.is_coordinator === 1,
      userId: row.user_id,
      activeRoles: row.active_roles?.split(',') ?? [],
      pendingRoles: row.pending_roles?.split(',') ?? [],
      invitationId: row.invitation_id,
      sendState: row.send_state,
    }));
    return {
      items,
      nextCursor: rows.results.length > 50 ? rows.results[49].email : null,
    };
  }
  async removePerson(s: Session, course: string, userId: string) {
    const now = this.clock(),
      guard = crypto.randomUUID();
    try {
      await this.db.batch([
        this.actorGuard(s, course, now, guard),
        this.db
          .prepare(
            `INSERT INTO course_write_guards(id,allowed) SELECT ?,CASE WHEN ?=? AND EXISTS(SELECT 1 FROM course_creation_receipts WHERE course_id=? AND user_id=?) THEN 0 ELSE 1 END`,
          )
          .bind(guard + '-coordinator', s.user_id, userId, course, userId),
        this.db
          .prepare(
            'UPDATE auth_invites SET revoked_at=? WHERE course_id=? AND email=(SELECT email FROM auth_accounts WHERE id=?) AND accepted_at IS NULL AND revoked_at IS NULL',
          )
          .bind(now, course, userId),
        this.db
          .prepare(
            'UPDATE course_memberships SET active=0 WHERE course_id=? AND user_id=? AND active=1',
          )
          .bind(course, userId),
        this.db
          .prepare('DELETE FROM course_write_guards WHERE id=?')
          .bind(guard),
        this.db
          .prepare('DELETE FROM course_write_guards WHERE id=?')
          .bind(guard + '-coordinator'),
      ]);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('course_authorization_guard')
      )
        throw new BoundaryError('FORBIDDEN');
      throw error;
    }
  }
  async revoke(i: ManagedInvite, s: Session) {
    const now = this.clock(),
      guard = crypto.randomUUID();
    await this.db.batch([
      this.actorGuard(s, i.course_id, now, guard),
      this.db
        .prepare(
          'UPDATE auth_invites SET revoked_at=? WHERE course_id=? AND email=? AND accepted_at IS NULL AND revoked_at IS NULL',
        )
        .bind(now, i.course_id, i.email),
      this.db.prepare('DELETE FROM course_write_guards WHERE id=?').bind(guard),
    ]);
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
    ticket: string,
    user: { uid: string; email: string },
    inviteId: string | null,
    userId: string | null,
    token?: string,
  ) {
    const now = this.clock();
    await this.db.batch([
      this.db
        .prepare(
          "UPDATE auth_actions SET consumed_at=? WHERE firebase_uid=? AND consumed_at IS NULL AND ((? IS NULL AND purpose='reset') OR invite_id=?)",
        )
        .bind(now, user.uid, inviteId, inviteId),
      this.db
        .prepare(
          'INSERT INTO auth_actions(id,code_hash,email,firebase_uid,invite_id,user_id,purpose,created_at,expires_at,invite_generation) VALUES(?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          // Legacy column name retained; only an app-generated dispatch ticket is stored.
          await hash(ticket),
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
  async proof(ticket: string, purpose: 'setup' | 'reset', token?: string) {
    const row = await this.db
      .prepare(
        'SELECT * FROM auth_actions WHERE code_hash=? AND purpose=? AND consumed_at IS NULL AND expires_at>?',
      )
      .bind(await hash(ticket), purpose, this.clock())
      .first<ActionProof>();
    if (!row) throw new BoundaryError('UNAUTHENTICATED');
    if (purpose === 'setup') {
      const invite = token ? await this.pending(token) : null;
      const candidate =
        invite && invite.firebase_uid !== row.firebase_uid
          ? await this.recoveryCandidate(invite.email)
          : null;
      if (
        !invite ||
        invite.id !== row.invite_id ||
        (invite.firebase_uid !== row.firebase_uid &&
          candidate?.firebase_uid !== row.firebase_uid) ||
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
