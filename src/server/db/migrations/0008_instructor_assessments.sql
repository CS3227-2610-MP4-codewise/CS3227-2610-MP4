-- Instructor-owned assessment state only. Evidence is referenced, never copied.
CREATE TABLE instructor_assessments (
 id TEXT PRIMARY KEY, course_id TEXT NOT NULL, attempt_id TEXT NOT NULL UNIQUE,
 publication_id TEXT NOT NULL, evidence TEXT NOT NULL,
 head_revision_id TEXT NOT NULL, approved_revision_id TEXT,
 availability_revision INTEGER NOT NULL DEFAULT 1 CHECK(availability_revision>0),
 current_release_version INTEGER, maximum_release_version INTEGER NOT NULL DEFAULT 0,
 transition_id TEXT NOT NULL,
 CHECK(current_release_version IS NULL OR (current_release_version>0 AND current_release_version<=maximum_release_version))
);
-- statement
CREATE TABLE instructor_assessment_revisions (
 id TEXT PRIMARY KEY, assessment_id TEXT NOT NULL REFERENCES instructor_assessments(id),
 parent_revision_id TEXT, actor_id TEXT NOT NULL, created_at TEXT NOT NULL,
 feedback TEXT NOT NULL CHECK(json_valid(feedback)), provenance TEXT NOT NULL CHECK(provenance='manual')
);
-- statement
CREATE INDEX assessment_revisions_page ON instructor_assessment_revisions(assessment_id,id);
-- statement
CREATE TABLE instructor_assessment_releases (
 assessment_id TEXT NOT NULL REFERENCES instructor_assessments(id), version INTEGER NOT NULL CHECK(version>0),
 revision_id TEXT NOT NULL UNIQUE REFERENCES instructor_assessment_revisions(id), released_at TEXT NOT NULL,
 content TEXT NOT NULL CHECK(json_valid(content)), PRIMARY KEY(assessment_id,version)
);
-- statement
CREATE TABLE instructor_assessment_withdrawals (
 assessment_id TEXT NOT NULL, version INTEGER NOT NULL, withdrawn_at TEXT NOT NULL,
 actor_id TEXT NOT NULL, reason TEXT NOT NULL,
 PRIMARY KEY(assessment_id,version), FOREIGN KEY(assessment_id,version) REFERENCES instructor_assessment_releases(assessment_id,version)
);
-- statement
CREATE TABLE instructor_assessment_audit (
 id TEXT PRIMARY KEY, assessment_id TEXT NOT NULL REFERENCES instructor_assessments(id),
 actor_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL, revision_id TEXT NOT NULL, release_version INTEGER
);
-- statement
CREATE TABLE instructor_assessment_receipts (
 scope TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, assessment_id TEXT NOT NULL REFERENCES instructor_assessments(id),
 operation TEXT NOT NULL, version INTEGER, revision_id TEXT
);
-- statement
CREATE TRIGGER assessment_identity_immutable BEFORE UPDATE OF id,course_id,attempt_id,publication_id,evidence ON instructor_assessments BEGIN SELECT RAISE(ABORT,'immutable evidence'); END;
-- statement
CREATE TRIGGER assessment_no_delete BEFORE DELETE ON instructor_assessments BEGIN SELECT RAISE(ABORT,'immutable assessment'); END;
-- statement
CREATE TRIGGER assessment_revision_no_update BEFORE UPDATE ON instructor_assessment_revisions BEGIN SELECT RAISE(ABORT,'immutable revision'); END;
-- statement
CREATE TRIGGER assessment_revision_no_delete BEFORE DELETE ON instructor_assessment_revisions BEGIN SELECT RAISE(ABORT,'immutable revision'); END;
-- statement
CREATE TRIGGER assessment_release_no_update BEFORE UPDATE ON instructor_assessment_releases BEGIN SELECT RAISE(ABORT,'immutable release'); END;
-- statement
CREATE TRIGGER assessment_release_no_delete BEFORE DELETE ON instructor_assessment_releases BEGIN SELECT RAISE(ABORT,'immutable release'); END;
-- statement
CREATE TRIGGER assessment_withdrawal_no_update BEFORE UPDATE ON instructor_assessment_withdrawals BEGIN SELECT RAISE(ABORT,'immutable withdrawal'); END;
-- statement
CREATE TRIGGER assessment_withdrawal_no_delete BEFORE DELETE ON instructor_assessment_withdrawals BEGIN SELECT RAISE(ABORT,'immutable withdrawal'); END;
-- statement
CREATE TRIGGER assessment_audit_no_update BEFORE UPDATE ON instructor_assessment_audit BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
-- statement
CREATE TRIGGER assessment_audit_no_delete BEFORE DELETE ON instructor_assessment_audit BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
-- statement
CREATE TRIGGER assessment_receipt_no_update BEFORE UPDATE ON instructor_assessment_receipts BEGIN SELECT RAISE(ABORT,'immutable receipt'); END;
-- statement
CREATE TRIGGER assessment_receipt_no_delete BEFORE DELETE ON instructor_assessment_receipts BEGIN SELECT RAISE(ABORT,'immutable receipt'); END;
-- statement
