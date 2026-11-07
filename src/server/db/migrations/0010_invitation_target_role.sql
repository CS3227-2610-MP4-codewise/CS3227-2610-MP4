-- Additive preparation for course-role invitations. Existing invitations remain
-- unclassified and cannot silently acquire a course role.
ALTER TABLE auth_invites ADD COLUMN target_role TEXT
  CHECK(target_role IS NULL OR target_role IN ('student','instructor'));
-- statement
CREATE TRIGGER auth_invite_target_role_immutable
BEFORE UPDATE OF target_role ON auth_invites
WHEN NEW.target_role IS NOT OLD.target_role
BEGIN SELECT RAISE(ABORT,'immutable invitation role'); END;
-- statement
CREATE TRIGGER auth_course_invite_scope_immutable
BEFORE UPDATE OF email,course_id,firebase_uid,created_by ON auth_invites
WHEN OLD.target_role IS NOT NULL AND (NEW.email IS NOT OLD.email OR NEW.course_id IS NOT OLD.course_id OR NEW.firebase_uid IS NOT OLD.firebase_uid OR NEW.created_by IS NOT OLD.created_by)
BEGIN SELECT RAISE(ABORT,'immutable invitation scope'); END;
-- statement
DROP INDEX auth_invites_firebase_uid;
-- statement
DROP INDEX auth_invites_pending_email;
-- statement
CREATE TABLE auth_invitation_identities (
 email TEXT PRIMARY KEY, firebase_uid TEXT NOT NULL
);
-- statement
CREATE TABLE auth_course_setup_locks (email TEXT PRIMARY KEY, claim_id TEXT NOT NULL, expires_at INTEGER NOT NULL, phase TEXT NOT NULL DEFAULT 'preparing' CHECK(phase IN ('preparing','resetting')));
-- statement
INSERT INTO auth_invitation_identities(email,firebase_uid)
 SELECT i.email,i.firebase_uid FROM auth_invites i
 WHERE i.firebase_uid IS NOT NULL AND i.id=(SELECT j.id FROM auth_invites j
 WHERE j.email=i.email AND j.firebase_uid IS NOT NULL ORDER BY j.created_at DESC,j.id DESC LIMIT 1);
-- statement
CREATE TRIGGER auth_course_invite_writer_guard BEFORE INSERT ON auth_invites
WHEN NEW.target_role IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id AND a.active=1
 JOIN course_memberships m ON m.user_id=a.id AND m.course_id=NEW.course_id AND m.role='instructor' AND m.active=1
 JOIN courses c ON c.id=m.course_id AND c.active=1
 WHERE s.id=NEW.creator_session AND s.user_id=NEW.created_by AND s.revoked_at IS NULL
 AND s.expires_at>NEW.created_at AND s.last_seen>NEW.created_at-1800000
)
BEGIN SELECT RAISE(ABORT,'course invite forbidden'); END;
-- statement
CREATE TRIGGER auth_course_invite_accept_guard BEFORE UPDATE OF accepted_at ON auth_invites
WHEN OLD.target_role IS NOT NULL AND OLD.accepted_at IS NULL AND NEW.accepted_at IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM course_memberships m JOIN courses c ON c.id=m.course_id AND c.active=1
 JOIN course_memberships inviter ON inviter.course_id=c.id AND inviter.user_id=OLD.created_by AND inviter.role='instructor' AND inviter.active=1
 JOIN auth_accounts ia ON ia.id=inviter.user_id AND ia.active=1
 WHERE m.course_id=OLD.course_id AND m.user_id=NEW.accepted_by AND m.role=OLD.target_role AND m.active=1
)
BEGIN SELECT RAISE(ABORT,'course acceptance forbidden'); END;
