-- student-progress SP-08 (Keith): the latest successful progress explanation per student and
-- course. The text stays in ai_gateway_requests and is re-read through the gateway, which
-- re-authorizes and re-validates on every read; this row only points at it and records the exact
-- evidence (assessment IDs and release versions) it was generated from.
CREATE TABLE student_progress_results (
 user_id TEXT NOT NULL REFERENCES auth_accounts(id),
 course_id TEXT NOT NULL REFERENCES courses(id),
 gateway_request_id TEXT NOT NULL REFERENCES ai_gateway_requests(id),
 evidence_json TEXT NOT NULL CHECK(length(evidence_json) BETWEEN 2 AND 4096),
 created_at TEXT NOT NULL,
 PRIMARY KEY (user_id, course_id)
);
