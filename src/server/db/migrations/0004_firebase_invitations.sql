-- Additive SH-AUTH change. Firebase owns credentials; no password or membership tables.
-- statement
ALTER TABLE auth_invites ADD COLUMN course_id TEXT;
-- statement
ALTER TABLE auth_invites ADD COLUMN firebase_uid TEXT;
-- statement
ALTER TABLE auth_invites ADD COLUMN send_state TEXT NOT NULL DEFAULT 'unknown' CHECK(send_state IN ('queued','failed','unknown'));
-- statement
ALTER TABLE auth_invites ADD COLUMN sent_at INTEGER;
-- statement
ALTER TABLE auth_invites ADD COLUMN message_id TEXT;
-- statement
CREATE UNIQUE INDEX auth_invites_firebase_uid ON auth_invites(firebase_uid) WHERE firebase_uid IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL;
-- statement
ALTER TABLE auth_sessions ADD COLUMN provider_password_at REAL;
-- statement
ALTER TABLE auth_sessions ADD COLUMN provider_valid_since INTEGER;
-- statement
CREATE TABLE auth_actions(
 id TEXT PRIMARY KEY, code_hash TEXT NOT NULL UNIQUE, email TEXT NOT NULL, firebase_uid TEXT NOT NULL,
 invite_id TEXT REFERENCES auth_invites(id), user_id TEXT REFERENCES auth_accounts(id),
 purpose TEXT NOT NULL CHECK(purpose IN ('setup','reset')), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, consumed_at INTEGER,
 CHECK((purpose='setup' AND invite_id IS NOT NULL AND user_id IS NULL) OR (purpose='reset' AND user_id IS NOT NULL AND invite_id IS NULL))
);
-- statement
CREATE INDEX auth_actions_expiry ON auth_actions(expires_at);
-- statement
CREATE INDEX auth_invites_owner_course ON auth_invites(created_by,course_id,id);
-- statement
DROP TRIGGER auth_invite_admin_guard;
-- statement
CREATE TRIGGER auth_invite_writer_guard BEFORE INSERT ON auth_invites
WHEN NEW.creator_session IS NOT NULL AND (
 NOT EXISTS(SELECT 1 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id
 WHERE s.id=NEW.creator_session AND a.id=NEW.created_by AND a.active=1 AND s.revoked_at IS NULL
 AND s.expires_at>NEW.created_at AND s.last_seen>NEW.created_at-1800000)
 OR (NEW.course_id IS NULL AND NOT EXISTS(SELECT 1 FROM auth_administrators d WHERE d.user_id=NEW.created_by)))
BEGIN SELECT RAISE(ABORT,'auth_forbidden'); END;
-- statement
CREATE TABLE auth_cooldowns(key TEXT PRIMARY KEY, until_at INTEGER NOT NULL);
-- statement
CREATE UNIQUE INDEX auth_invites_pending_email ON auth_invites(email) WHERE course_id IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL;
-- statement
ALTER TABLE auth_actions ADD COLUMN invite_generation TEXT;
-- statement
CREATE TRIGGER auth_setup_generation_guard BEFORE INSERT ON auth_actions
WHEN NEW.purpose='setup' AND NOT EXISTS(SELECT 1 FROM auth_invites i WHERE i.id=NEW.invite_id AND i.token_hash=NEW.invite_generation AND i.firebase_uid=NEW.firebase_uid AND i.email=NEW.email AND i.revoked_at IS NULL AND i.accepted_at IS NULL)
BEGIN SELECT RAISE(ABORT,'auth_stale_dispatch'); END;
-- statement
CREATE TABLE auth_mail_locks(invite_id TEXT PRIMARY KEY REFERENCES auth_invites(id),claim_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
