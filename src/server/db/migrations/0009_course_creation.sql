-- Additive COU-01/02: explicit pinned first-owner eligibility and retry receipts.
-- Accounts, bootstrap completion, invitations and memberships are retained unchanged.
CREATE TABLE course_creator_capabilities (
 user_id TEXT PRIMARY KEY REFERENCES auth_accounts(id),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 granted_at INTEGER NOT NULL
);
-- statement
INSERT INTO course_creator_capabilities(user_id,active,granted_at)
 SELECT a.id,1,o.completed_at FROM auth_owner_bootstrap o
 JOIN auth_accounts a ON a.id=o.account_id AND a.issuer=o.issuer
  AND a.subject=o.subject AND a.email=o.email AND a.active=1
 JOIN auth_administrators d ON d.user_id=a.id
 WHERE o.singleton=1 AND o.completed_at IS NOT NULL;
-- statement
CREATE TABLE course_creation_receipts (
 user_id TEXT NOT NULL REFERENCES auth_accounts(id),
 request_key TEXT NOT NULL, name TEXT NOT NULL,
 course_id TEXT NOT NULL UNIQUE REFERENCES courses(id),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,request_key)
);
-- statement
CREATE TABLE course_creation_guards (
 id TEXT PRIMARY KEY,
 compatible INTEGER NOT NULL CONSTRAINT course_creation_compatibility CHECK(compatible=1)
);
