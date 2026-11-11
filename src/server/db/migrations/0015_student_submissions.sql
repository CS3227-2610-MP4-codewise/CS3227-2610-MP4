-- Student working copies and immutable attempts (SW-01/03/05/07). Additive only.
-- References existing identity, course and publication rows; copies none of them.
-- statement
CREATE TABLE student_drafts (
 user_id TEXT NOT NULL REFERENCES auth_accounts(id),
 question_version_id TEXT NOT NULL REFERENCES instructor_question_versions(id),
 publication_id TEXT NOT NULL REFERENCES instructor_assignment_publications(id),
 course_id TEXT NOT NULL REFERENCES courses(id),
 revision INTEGER NOT NULL CHECK(revision >= 0),
 source TEXT NOT NULL CHECK(length(CAST(source AS BLOB)) <= 32768),
 source_hash TEXT NOT NULL CHECK(length(source_hash) = 64),
 updated_at TEXT NOT NULL,
 PRIMARY KEY(user_id, question_version_id)
) WITHOUT ROWID;
-- statement
CREATE TABLE student_attempts (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 user_id TEXT NOT NULL REFERENCES auth_accounts(id),
 course_id TEXT NOT NULL REFERENCES courses(id),
 assignment_id TEXT NOT NULL,
 publication_id TEXT NOT NULL REFERENCES instructor_assignment_publications(id),
 submitted_at TEXT NOT NULL,
 idempotency_key TEXT NOT NULL CHECK(length(idempotency_key) BETWEEN 1 AND 128),
 fingerprint TEXT NOT NULL CHECK(length(fingerprint) = 64),
 UNIQUE(user_id, assignment_id, idempotency_key)
);
-- statement
CREATE INDEX student_attempts_history ON student_attempts(user_id, assignment_id, seq);
-- statement
CREATE INDEX student_attempts_publication ON student_attempts(publication_id, user_id, seq);
-- statement
CREATE TABLE student_attempt_answers (
 id TEXT PRIMARY KEY,
 attempt_id TEXT NOT NULL REFERENCES student_attempts(id),
 question_version_id TEXT NOT NULL REFERENCES instructor_question_versions(id),
 rubric_version_id TEXT NOT NULL REFERENCES instructor_rubric_versions(id),
 draft_revision INTEGER NOT NULL CHECK(draft_revision >= 1),
 source TEXT NOT NULL CHECK(length(CAST(source AS BLOB)) <= 32768),
 source_hash TEXT NOT NULL CHECK(length(source_hash) = 64),
 UNIQUE(attempt_id, question_version_id)
);
-- statement
CREATE TRIGGER student_attempts_immutable BEFORE UPDATE ON student_attempts
BEGIN SELECT RAISE(ABORT, 'attempt_immutable'); END;
-- statement
CREATE TRIGGER student_attempt_answers_immutable BEFORE UPDATE ON student_attempt_answers
BEGIN SELECT RAISE(ABORT, 'attempt_immutable'); END;
