-- Instructor-only candidates contain feedback and may include submitted excerpts.
CREATE TABLE instructor_ai_candidates (
 id TEXT PRIMARY KEY,
 assessment_id TEXT NOT NULL REFERENCES instructor_assessments(id),
 actor_id TEXT NOT NULL,
 expected_revision_id TEXT NOT NULL,
 evidence TEXT NOT NULL,
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 prompt_version TEXT NOT NULL,
 model_version TEXT NOT NULL,
 created_at TEXT NOT NULL
);
-- statement
CREATE INDEX instructor_ai_candidates_assessment ON instructor_ai_candidates(assessment_id,actor_id,created_at);
-- statement
CREATE TABLE instructor_ai_adoptions (
 revision_id TEXT PRIMARY KEY REFERENCES instructor_assessment_revisions(id),
 candidate_id TEXT NOT NULL REFERENCES instructor_ai_candidates(id),
 actor_id TEXT NOT NULL,
 created_at TEXT NOT NULL
);
-- statement
CREATE TRIGGER instructor_ai_candidate_no_update BEFORE UPDATE ON instructor_ai_candidates BEGIN SELECT RAISE(ABORT,'immutable candidate'); END;
-- statement
CREATE TRIGGER instructor_ai_candidate_no_delete BEFORE DELETE ON instructor_ai_candidates BEGIN SELECT RAISE(ABORT,'immutable candidate'); END;
-- statement
CREATE TRIGGER instructor_ai_adoption_no_update BEFORE UPDATE ON instructor_ai_adoptions BEGIN SELECT RAISE(ABORT,'immutable adoption'); END;
-- statement
CREATE TRIGGER instructor_ai_adoption_no_delete BEFORE DELETE ON instructor_ai_adoptions BEGIN SELECT RAISE(ABORT,'immutable adoption'); END;
