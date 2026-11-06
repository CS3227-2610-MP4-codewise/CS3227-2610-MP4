-- One SH-AUTH store. No course, membership or instructor-role storage.
-- statement
CREATE TABLE auth_transactions (
 id TEXT PRIMARY KEY, state_hash TEXT NOT NULL UNIQUE, browser_hash TEXT NOT NULL,
 nonce TEXT NOT NULL, verifier TEXT NOT NULL, invite_hash TEXT, return_path TEXT NOT NULL, old_session_hash TEXT,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, claim_id TEXT, completed_at INTEGER
);
-- statement
CREATE INDEX auth_transactions_expiry ON auth_transactions(expires_at);
-- statement
CREATE TABLE auth_accounts (
 id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL, email TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at INTEGER NOT NULL,
 signup_tx TEXT REFERENCES auth_transactions(id) ON DELETE SET NULL,
 UNIQUE(issuer,subject)
);
-- statement
CREATE TABLE auth_sessions (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL REFERENCES auth_accounts(id),
 login_tx TEXT UNIQUE REFERENCES auth_transactions(id) ON DELETE SET NULL, callback_claim TEXT NOT NULL,
 created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 revoked_at INTEGER, return_path TEXT NOT NULL, CHECK(expires_at>created_at)
);
-- statement
CREATE INDEX auth_sessions_expiry ON auth_sessions(expires_at);
-- statement
CREATE TABLE auth_administrators (user_id TEXT PRIMARY KEY REFERENCES auth_accounts(id));
-- statement
CREATE TABLE auth_invites (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, email TEXT NOT NULL,
 created_by TEXT REFERENCES auth_accounts(id), creator_session TEXT,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER,
 accepted_by TEXT REFERENCES auth_accounts(id), accepted_at INTEGER,
 CHECK(expires_at>created_at), CHECK((accepted_by IS NULL)=(accepted_at IS NULL))
);
-- statement
CREATE TABLE auth_rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
-- statement
CREATE INDEX auth_rate_expiry ON auth_rate_limits(expires_at);
-- statement
CREATE TRIGGER auth_invite_admin_guard BEFORE INSERT ON auth_invites
WHEN NEW.creator_session IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id JOIN auth_administrators d ON d.user_id=a.id
 WHERE s.id=NEW.creator_session AND a.id=NEW.created_by AND a.active=1 AND s.revoked_at IS NULL
 AND s.expires_at>NEW.created_at AND s.last_seen>NEW.created_at-1800000)
BEGIN SELECT RAISE(ABORT,'auth_forbidden'); END;
-- statement
CREATE TRIGGER auth_account_invitation_guard BEFORE INSERT ON auth_accounts
WHEN NOT EXISTS(
 SELECT 1 FROM auth_transactions t JOIN auth_invites i ON i.token_hash=t.invite_hash
 WHERE t.id=NEW.signup_tx AND t.used_at IS NOT NULL AND t.completed_at IS NULL AND t.expires_at>NEW.created_at
 AND i.email=NEW.email AND i.accepted_by IS NULL AND i.revoked_at IS NULL AND i.expires_at>NEW.created_at)
BEGIN SELECT RAISE(ABORT,'auth_invitation_required'); END;
-- statement
CREATE TRIGGER auth_session_callback_guard BEFORE INSERT ON auth_sessions
WHEN NOT EXISTS(
 SELECT 1 FROM auth_transactions t JOIN auth_accounts a ON a.id=NEW.user_id
 WHERE t.id=NEW.login_tx AND t.claim_id=NEW.callback_claim AND t.used_at IS NOT NULL AND t.completed_at IS NULL
 AND t.expires_at>NEW.created_at AND a.active=1 AND
 (t.invite_hash IS NULL OR EXISTS(SELECT 1 FROM auth_invites i WHERE i.token_hash=t.invite_hash
 AND i.email=a.email AND i.accepted_by IS NULL AND i.revoked_at IS NULL AND i.expires_at>NEW.created_at)))
BEGIN SELECT RAISE(ABORT,'auth_callback_rejected'); END;
