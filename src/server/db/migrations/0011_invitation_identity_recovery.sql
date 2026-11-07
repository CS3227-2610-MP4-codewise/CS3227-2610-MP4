-- Candidate identities are not trusted for admission until mailbox proof and
-- explicit credential confirmation have succeeded.
CREATE TABLE auth_invitation_recovery_candidates (
 email TEXT PRIMARY KEY, firebase_uid TEXT NOT NULL, verified_at INTEGER
);
-- statement
ALTER TABLE auth_invites ADD COLUMN acceptance_group TEXT;
-- statement
DROP TRIGGER auth_setup_generation_guard;
-- statement
CREATE TRIGGER auth_setup_generation_guard BEFORE INSERT ON auth_actions
WHEN NEW.purpose='setup' AND NOT EXISTS(
 SELECT 1 FROM auth_invites i WHERE i.id=NEW.invite_id AND i.token_hash=NEW.invite_generation
 AND i.email=NEW.email AND i.revoked_at IS NULL AND i.accepted_at IS NULL
 AND (i.firebase_uid=NEW.firebase_uid OR EXISTS(SELECT 1 FROM auth_invitation_recovery_candidates r WHERE r.email=i.email AND r.firebase_uid=NEW.firebase_uid)))
BEGIN SELECT RAISE(ABORT,'auth_stale_dispatch'); END;
-- statement
DROP TRIGGER auth_course_invite_scope_immutable;
-- statement
CREATE TRIGGER auth_course_invite_scope_immutable
BEFORE UPDATE OF email,course_id,firebase_uid,created_by ON auth_invites
WHEN OLD.target_role IS NOT NULL AND (NEW.email IS NOT OLD.email OR NEW.course_id IS NOT OLD.course_id OR NEW.created_by IS NOT OLD.created_by OR
 (NEW.firebase_uid IS NOT OLD.firebase_uid AND NOT EXISTS(SELECT 1 FROM auth_invitation_recovery_candidates r WHERE r.email=OLD.email AND r.firebase_uid=NEW.firebase_uid AND r.verified_at IS NOT NULL AND OLD.accepted_at IS NULL AND OLD.revoked_at IS NULL)))
BEGIN SELECT RAISE(ABORT,'immutable invitation scope'); END;
