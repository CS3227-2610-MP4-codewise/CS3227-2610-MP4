-- Shared course authority. Account administration does not grant membership.
-- statement
CREATE TABLE courses (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);
-- statement
CREATE TABLE course_memberships (
 course_id TEXT NOT NULL REFERENCES courses(id),
 user_id TEXT NOT NULL REFERENCES auth_accounts(id),
 role TEXT NOT NULL CHECK(role IN ('instructor', 'student')),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
 PRIMARY KEY(course_id, user_id, role)
);
-- statement
CREATE INDEX course_memberships_user ON course_memberships(user_id, active, course_id);
-- statement
CREATE TABLE course_write_guards (
 id TEXT PRIMARY KEY,
 allowed INTEGER NOT NULL CONSTRAINT course_authorization_guard CHECK(allowed=1)
);
