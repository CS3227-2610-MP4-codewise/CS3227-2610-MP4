-- Durable metadata only: no action codes, credentials or password material.
CREATE TABLE auth_setup_reset_journal (
 claim_id TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 firebase_uid TEXT NOT NULL,
 proof_id TEXT NOT NULL,
 invite_id TEXT NOT NULL,
 invite_generation TEXT NOT NULL,
 started_at INTEGER NOT NULL,
 terminal_at INTEGER,
 outcome TEXT CHECK(outcome IN ('succeeded','rejected')),
 CHECK((terminal_at IS NULL AND outcome IS NULL) OR (terminal_at IS NOT NULL AND outcome IS NOT NULL))
);
-- statement
CREATE TABLE auth_setup_reset_reconciliations (
 old_claim_id TEXT PRIMARY KEY REFERENCES auth_setup_reset_journal(claim_id),
 new_claim_id TEXT NOT NULL,
 reconciled_at INTEGER NOT NULL
);
-- statement
CREATE TRIGGER auth_setup_reset_reconciliation_audit
AFTER UPDATE OF claim_id ON auth_course_setup_locks
WHEN OLD.phase='resetting' AND NEW.claim_id<>OLD.claim_id
BEGIN
 INSERT INTO auth_setup_reset_reconciliations(old_claim_id,new_claim_id,reconciled_at)
 SELECT OLD.claim_id,NEW.claim_id,unixepoch()*1000
 WHERE EXISTS (SELECT 1 FROM auth_setup_reset_journal j WHERE j.claim_id=OLD.claim_id AND j.email=OLD.email AND j.terminal_at IS NOT NULL);
END;
