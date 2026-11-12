-- Durable binding before dispatch; no prompt, source or provider payload.
CREATE TABLE instructor_ai_requests (
 actor_id TEXT NOT NULL,
 course_id TEXT NOT NULL,
 request_key TEXT NOT NULL,
 assessment_id TEXT NOT NULL REFERENCES instructor_assessments(id),
 revision_id TEXT NOT NULL,
 evidence TEXT NOT NULL,
 include_references INTEGER NOT NULL CHECK(include_references IN (0,1)),
 created_at TEXT NOT NULL,
 PRIMARY KEY(actor_id,course_id,request_key)
);
-- statement
CREATE INDEX instructor_ai_requests_recovery ON instructor_ai_requests(assessment_id,actor_id,revision_id,created_at);
-- statement
CREATE TRIGGER instructor_ai_request_no_update BEFORE UPDATE ON instructor_ai_requests BEGIN SELECT RAISE(ABORT,'immutable AI request binding'); END;
-- statement
CREATE TRIGGER instructor_ai_request_no_delete BEFORE DELETE ON instructor_ai_requests BEGIN SELECT RAISE(ABORT,'immutable AI request binding'); END;
