import {
  attemptSchema,
  type Attempt,
} from '../../shared/instructor-contracts/submission';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import { stored } from './repository';

/**
 * Reads one attempt in the closed C-SUB shape. `visible` is trusted SQL over alias `a`
 * (student_attempts), numbered parameters ?1–?4 for the caller's guard bindings and ?5 for the
 * attempt id. Authority is evaluated in the same batch (one snapshot) as the content.
 * Missing and not-visible are indistinguishable. Private references are never selected.
 */
export async function readAttempt(
  db: D1Database,
  attemptId: string,
  visible: string,
  bind4: readonly unknown[],
): Promise<Attempt> {
  const bind = [...bind4, attemptId];
  const [head, answers] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `SELECT a.id,a.course_id,a.publication_id,a.user_id,a.submitted_at
         FROM student_attempts a WHERE a.id=?5 AND ${visible}`,
      )
      .bind(...bind),
    db
      .prepare(
        `SELECT x.id,x.question_version_id,x.rubric_version_id,x.draft_revision,x.source,x.source_hash
         FROM student_attempt_answers x
         JOIN student_attempts a ON a.id=x.attempt_id
         JOIN instructor_question_versions q ON q.id=x.question_version_id
         WHERE a.id=?5 AND ${visible} ORDER BY q.position`,
      )
      .bind(...bind),
  ]);
  const h = head.results[0] as
    | {
        id: string;
        course_id: string;
        publication_id: string;
        user_id: string;
        submitted_at: string;
      }
    | undefined;
  if (!h) throw new BoundaryError('NOT_FOUND');
  const rows = answers.results as {
    id: string;
    question_version_id: string;
    rubric_version_id: string;
    draft_revision: number;
    source: string;
    source_hash: string;
  }[];
  return stored(() =>
    attemptSchema.parse({
      schemaVersion: 1,
      attemptId: h.id,
      assignmentVersionId: h.publication_id,
      courseId: h.course_id,
      submittedByUserId: h.user_id,
      submittedAt: h.submitted_at,
      answers: rows.map((x) => ({
        submittedAnswerId: x.id,
        questionVersionId: x.question_version_id,
        rubricVersionId: x.rubric_version_id,
        draftRevision: x.draft_revision,
        source: x.source,
        sourceHash: x.source_hash,
      })),
    }),
  );
}
