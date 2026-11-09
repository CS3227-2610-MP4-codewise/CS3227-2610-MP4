import {
  currentStudentGuard,
  studentGuardBindings,
} from '../courses/authority';
import type { TrustedPrincipal } from '../instructor/ports/contracts';
import {
  publicationSchema,
  type Publication,
} from '../../shared/instructor-contracts/publication';
import {
  BoundaryError,
  ContractError,
} from '../../shared/instructor-contracts/schema';

/** Stored data that fails the public contract fails closed as unavailable, never as a client error. */
function stored<T>(decode: () => T): T {
  try {
    return decode();
  } catch (error) {
    if (error instanceof ContractError)
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    throw error;
  }
}
import {
  STUDENT_ASSIGNMENT_PAGE,
  decodeCursor,
  encodeCursor,
  studentAssignmentPageSchema,
  type StudentAssignmentPage,
} from '../../shared/student-assignments';

/**
 * Student dashboard reads over the existing identity/course/publication tables.
 * No separate storage. Every statement re-checks current Student membership in SQL,
 * so authority is evaluated at the point of disclosure, not only at a route pre-check.
 * Private references, draft JSON, source revisions and fingerprints are never selected.
 */
export class StudentAssignments {
  constructor(
    readonly db: D1Database,
    readonly clock: () => number = Date.now,
  ) {}

  async list(
    principal: TrustedPrincipal,
    courseId: string,
    cursor: string | null,
  ): Promise<StudentAssignmentPage> {
    const after = cursor ? decodeCursor(cursor) : null;
    const rows = await this.db
      .prepare(
        `WITH envelope AS (
      SELECT c.id, c.name FROM courses c WHERE c.id=?5 AND c.active=1 AND ${currentStudentGuard('c.id')}
    ), latest AS (
      SELECT p.id, p.assignment_id, p.title, p.published_at, p.deadline_at
      FROM instructor_assignment_publications p JOIN envelope e ON p.course_id=e.id
      WHERE p.publication_number=(SELECT MAX(q.publication_number) FROM instructor_assignment_publications q
        WHERE q.assignment_id=p.assignment_id AND q.course_id=p.course_id)
    )
    SELECT e.id AS course_id, e.name AS course_name, l.id, l.assignment_id, l.title, l.published_at, l.deadline_at
    FROM envelope e LEFT JOIN latest l ON (?6 IS NULL OR l.deadline_at>?6 OR (l.deadline_at=?6 AND l.assignment_id>?7))
    ORDER BY l.deadline_at, l.assignment_id LIMIT ?8`,
      )
      .bind(
        ...studentGuardBindings(principal, this.clock()),
        courseId,
        after?.deadlineAt ?? null,
        after?.assignmentId ?? null,
        STUDENT_ASSIGNMENT_PAGE + 1,
      )
      .all<{
        course_id: string;
        course_name: string;
        id: string | null;
        assignment_id: string | null;
        title: string | null;
        published_at: string | null;
        deadline_at: string | null;
      }>();
    // Inaccessible and missing courses are indistinguishable to the caller.
    if (!rows.results.length) throw new BoundaryError('NOT_FOUND');
    const present = rows.results.filter((r) => r.id !== null);
    const page = present.slice(0, STUDENT_ASSIGNMENT_PAGE);
    const last = page.at(-1);
    return stored(() =>
      studentAssignmentPageSchema.parse({
        schemaVersion: 1,
        course: {
          id: rows.results[0].course_id,
          name: rows.results[0].course_name,
        },
        items: page.map((r) => ({
          assignmentId: r.assignment_id,
          assignmentVersionId: r.id,
          title: r.title,
          publishedAt: r.published_at,
          deadlineAt: r.deadline_at,
        })),
        nextCursor:
          present.length > STUDENT_ASSIGNMENT_PAGE && last
            ? encodeCursor(last.deadline_at!, last.assignment_id!)
            : null,
      }),
    );
  }

  /** Exact version only: never substitutes the latest publication. */
  async publication(
    principal: TrustedPrincipal,
    versionId: string,
  ): Promise<Publication> {
    const guard = `EXISTS (SELECT 1 FROM instructor_assignment_publications gp
      WHERE gp.id=?5 AND ${currentStudentGuard('gp.course_id')})`;
    const bind = [...studentGuardBindings(principal, this.clock()), versionId];
    // One D1 batch is one transaction: authority and content come from one snapshot.
    const [root, questions, criteria] = await this.db.batch<
      Record<string, unknown>
    >([
      this.db
        .prepare(
          `SELECT id,assignment_id,course_id,published_at,title,deadline_at
        FROM instructor_assignment_publications WHERE id=?5 AND ${guard}`,
        )
        .bind(...bind),
      this.db
        .prepare(
          `SELECT q.id,q.question_id,q.title,q.instructions,q.language,q.starter_code,
          r.id AS rubric_version_id,r.rubric_id
        FROM instructor_question_versions q JOIN instructor_rubric_versions r ON r.question_version_id=q.id
        WHERE q.publication_id=?5 AND ${guard} ORDER BY q.position`,
        )
        .bind(...bind),
      this.db
        .prepare(
          `SELECT c.rubric_version_id,c.criterion_id,c.comparison_key,c.descriptor,c.minimum_units,c.maximum_units
        FROM instructor_criterion_versions c JOIN instructor_rubric_versions r ON r.id=c.rubric_version_id
        JOIN instructor_question_versions q ON q.id=r.question_version_id
        WHERE q.publication_id=?5 AND ${guard} ORDER BY q.position,c.position`,
        )
        .bind(...bind),
    ]);
    const r = root.results[0] as
      | {
          id: string;
          assignment_id: string;
          course_id: string;
          published_at: string;
          title: string;
          deadline_at: string;
        }
      | undefined;
    if (!r) throw new BoundaryError('NOT_FOUND');
    const q = questions.results as {
      id: string;
      question_id: string;
      title: string;
      instructions: string;
      language: string;
      starter_code: string;
      rubric_version_id: string;
      rubric_id: string;
    }[];
    const c = criteria.results as {
      rubric_version_id: string;
      criterion_id: string;
      comparison_key: string;
      descriptor: string;
      minimum_units: number;
      maximum_units: number;
    }[];
    const publication = stored(() =>
      publicationSchema.parse({
        schemaVersion: 1,
        assignmentId: r.assignment_id,
        assignmentVersionId: r.id,
        courseId: r.course_id,
        title: r.title,
        publishedAt: r.published_at,
        deadlineAt: r.deadline_at,
        questions: q.map((v) => ({
          questionId: v.question_id,
          questionVersionId: v.id,
          title: v.title,
          instructions: v.instructions,
          language: v.language,
          starterCode: v.starter_code,
          rubricId: v.rubric_id,
          rubricVersionId: v.rubric_version_id,
          criteria: c
            .filter((x) => x.rubric_version_id === v.rubric_version_id)
            .map((x) => ({
              criterionId: x.criterion_id,
              comparisonKey: x.comparison_key,
              descriptor: x.descriptor,
              minimumScore: x.minimum_units / 100,
              maximumScore: x.maximum_units / 100,
            })),
        })),
      }),
    );
    if (publication.assignmentVersionId !== versionId)
      throw new BoundaryError('NOT_FOUND');
    return publication;
  }
}
