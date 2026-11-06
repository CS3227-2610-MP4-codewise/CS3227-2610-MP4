-- One operator-provisioned authentication owner; no course/membership authority.
CREATE TABLE auth_owner_bootstrap(
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), issuer TEXT NOT NULL,
 subject TEXT NOT NULL, email TEXT NOT NULL, created_at INTEGER NOT NULL,
 account_id TEXT UNIQUE REFERENCES auth_accounts(id), completed_at INTEGER,
 password_at REAL, valid_since INTEGER, claim_id TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 CHECK((completed_at IS NULL)=(account_id IS NULL)),
 CHECK((completed_at IS NULL)=(password_at IS NULL)),
 CHECK((completed_at IS NULL)=(valid_since IS NULL))
);
-- statement
CREATE TRIGGER auth_owner_completion_guard BEFORE UPDATE ON auth_owner_bootstrap
WHEN NEW.completed_at IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM auth_accounts a WHERE a.id=NEW.account_id AND a.issuer=NEW.issuer
 AND a.subject=NEW.subject AND a.email=NEW.email AND a.active=1)
BEGIN SELECT RAISE(ABORT,'auth_owner_identity_required'); END;
-- statement
CREATE TRIGGER auth_owner_immutable BEFORE UPDATE ON auth_owner_bootstrap
WHEN OLD.completed_at IS NOT NULL AND (
 NEW.issuer IS NOT OLD.issuer OR NEW.subject IS NOT OLD.subject OR NEW.email IS NOT OLD.email
 OR NEW.account_id IS NOT OLD.account_id OR NEW.completed_at IS NOT OLD.completed_at
 OR NEW.password_at IS NOT OLD.password_at OR NEW.valid_since IS NOT OLD.valid_since
 OR NEW.created_at IS NOT OLD.created_at)
BEGIN SELECT RAISE(ABORT,'auth_owner_already_completed'); END;
-- statement
CREATE TRIGGER auth_owner_no_reopen BEFORE DELETE ON auth_owner_bootstrap
BEGIN SELECT RAISE(ABORT,'auth_owner_bootstrap_is_permanent'); END;
