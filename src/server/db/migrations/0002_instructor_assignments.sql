-- Instructor-owned authoring/publication only; opaque external actor/course IDs.
-- statement
CREATE TABLE instructor_assignment_drafts (
 id TEXT PRIMARY KEY,
 course_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision >= 1),
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 created_by TEXT NOT NULL,
 create_key TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(id, course_id),
 UNIQUE(course_id, created_by, create_key)
);
-- statement
CREATE TABLE instructor_assignment_publications (
 id TEXT PRIMARY KEY,
 assignment_id TEXT NOT NULL,
 course_id TEXT NOT NULL,
 publication_number INTEGER NOT NULL CHECK(publication_number >= 1),
 source_revision INTEGER NOT NULL CHECK(source_revision >= 1),
 published_by TEXT NOT NULL,
 published_at TEXT NOT NULL,
 request_key TEXT NOT NULL,
 fingerprint TEXT NOT NULL,
 title TEXT NOT NULL,
 deadline_at TEXT NOT NULL,
 FOREIGN KEY(assignment_id, course_id) REFERENCES instructor_assignment_drafts(id, course_id),
 UNIQUE(assignment_id, publication_number),
 UNIQUE(course_id, published_by, assignment_id, request_key)
);
-- statement
CREATE TRIGGER instructor_publication_revision_guard BEFORE INSERT ON instructor_assignment_publications
WHEN NOT EXISTS (SELECT 1 FROM instructor_assignment_drafts WHERE id=NEW.assignment_id AND course_id=NEW.course_id AND revision=NEW.source_revision)
BEGIN SELECT RAISE(ABORT, 'publication_revision_conflict'); END;
-- statement
CREATE TABLE instructor_question_versions (
 id TEXT PRIMARY KEY,
 question_id TEXT NOT NULL,
 publication_id TEXT NOT NULL REFERENCES instructor_assignment_publications(id),
 position INTEGER NOT NULL,
 title TEXT NOT NULL,
 instructions TEXT NOT NULL,
 language TEXT NOT NULL CHECK(language='python'),
 starter_code TEXT NOT NULL,
 private_reference TEXT NOT NULL,
 UNIQUE(publication_id, position),
 UNIQUE(publication_id, question_id)
);
-- statement
CREATE TABLE instructor_rubric_versions (
 id TEXT PRIMARY KEY,
 rubric_id TEXT NOT NULL,
 question_version_id TEXT NOT NULL UNIQUE REFERENCES instructor_question_versions(id)
);
-- statement
CREATE TABLE instructor_criterion_versions (
 rubric_version_id TEXT NOT NULL REFERENCES instructor_rubric_versions(id),
 criterion_id TEXT NOT NULL,
 position INTEGER NOT NULL,
 comparison_key TEXT NOT NULL,
 descriptor TEXT NOT NULL,
 minimum_units INTEGER NOT NULL CHECK(typeof(minimum_units)='integer' AND minimum_units >= 0),
 maximum_units INTEGER NOT NULL CHECK(typeof(maximum_units)='integer' AND maximum_units > minimum_units AND maximum_units <= 100000),
 PRIMARY KEY(rubric_version_id,criterion_id),
 UNIQUE(rubric_version_id,position),
 UNIQUE(rubric_version_id,comparison_key)
);
-- statement
CREATE TRIGGER instructor_publications_no_update BEFORE UPDATE ON instructor_assignment_publications BEGIN SELECT RAISE(ABORT,'immutable_publication'); END;
-- statement
CREATE TRIGGER instructor_publications_no_delete BEFORE DELETE ON instructor_assignment_publications BEGIN SELECT RAISE(ABORT,'immutable_publication'); END;
-- statement
CREATE TRIGGER instructor_questions_no_update BEFORE UPDATE ON instructor_question_versions BEGIN SELECT RAISE(ABORT,'immutable_publication'); END;
-- statement
CREATE TRIGGER instructor_questions_no_delete BEFORE DELETE ON instructor_question_versions BEGIN SELECT RAISE(ABORT,'immutable_publication'); END;
-- statement
CREATE TRIGGER instructor_rubrics_no_update BEFORE UPDATE ON instructor_rubric_versions BEGIN SELECT RAISE(ABORT,'immutable_publication'); END;
-- statement
CREATE TRIGGER instructor_rubrics_no_delete BEFORE DELETE ON instructor_rubric_versions BEGIN SELECT RAISE(ABORT,'immutable_publication'); END;
-- statement
CREATE TRIGGER instructor_criteria_no_update BEFORE UPDATE ON instructor_criterion_versions BEGIN SELECT RAISE(ABORT,'immutable_publication'); END;
-- statement
CREATE TRIGGER instructor_criteria_no_delete BEFORE DELETE ON instructor_criterion_versions BEGIN SELECT RAISE(ABORT,'immutable_publication'); END;
