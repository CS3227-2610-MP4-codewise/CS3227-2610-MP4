import {
  currentStudentGuard,
  currentStudentWriteGuard,
  studentGuardBindings,
} from '../courses/authority';
import type { TrustedPrincipal } from '../instructor/ports/contracts';
import {
  BoundaryError,
  ContractError,
  sourceHash,
} from '../../shared/instructor-contracts/schema';
import type { Attempt } from '../../shared/instructor-contracts/submission';
import {
  DUE_SOON_MS,
  STUDENT_ATTEMPT_PAGE,
  answersFingerprint,
  assignmentStatusPageSchema,
  attemptHistorySchema,
  type AssignmentStatus,
  type AssignmentStatusPage,
  draftSaveResponseSchema,
  workResponseSchema,
  type AttemptHistory,
  type DraftSaveRequest,
  type DraftSaveResponse,
  type MoveRequest,
  type SubmitRequest,
  type SubmitResponse,
  type WorkResponse,
} from '../../shared/student-work';
import { readAttempt } from './attempts';
import { unlimited, type RateLimiter } from './rate-limit';
import { stored } from './repository';

export type WorkErrorCode =
  | 'CONFLICT_REVISION'
  | 'STALE_PUBLICATION'
  | 'DEADLINE_PASSED'
  | 'IDEMPOTENCY_MISMATCH'
  /** SF-02: release currentness changed between the read and the re-check. */
  | 'STALE_FEEDBACK';
export interface CurrentDraft {
  revision: number;
  source: string;
  sourceHash: string;
}
/** Safe, student-facing write failures. `current` is the caller's own row, never another user's. */
export class StudentWorkError extends Error {
  constructor(
    readonly code: WorkErrorCode,
    readonly current?: CurrentDraft,
  ) {
    super('Operation could not be completed.');
  }
}

/** Name of the CHECK in course_write_guards (migration 0007). */
const GUARD_CHECK = 'course_authorization_guard';
const PUBLICATIONS = 'instructor_assignment_publications';
const QUESTIONS = 'instructor_question_versions';
const isoOf = (ms: number) => new Date(ms).toISOString();
/** True when `p` is the highest publication number of its assignment (SQL fragment). */
const LATEST = (p: string) =>
  `${p}.publication_number=(SELECT MAX(l.publication_number) FROM ${PUBLICATIONS} l
     WHERE l.assignment_id=${p}.assignment_id AND l.course_id=${p}.course_id)`;

/**
 * SW-01–SW-08: working copies and attempts over the shared identity, course and publication
 * tables. Authority is evaluated in SQL where data is disclosed and inside the write batch
 * (the course_write_guards abort pattern), never only in a route pre-check. Time comes from the
 * injected clock, read once per request; client time is never used.
 */
export class StudentWork {
  constructor(
    readonly db: D1Database,
    readonly clock: () => number = Date.now,
    /** SW-11: production composes the D1 limiter; the default is for tests and loopback only. */
    readonly limiter: RateLimiter = unlimited,
  ) {}

  /** SW-01: the caller's working copy of one question (revision 0 = published starter, virtual). */
  private async current(
    principal: TrustedPrincipal,
    questionVersionId: string,
    now: number,
  ): Promise<(CurrentDraft & { updatedAt: string | null }) | null> {
    const row = await this.db
      .prepare(
        `SELECT q.starter_code,d.revision,d.source,d.source_hash,d.updated_at
         FROM ${QUESTIONS} q JOIN ${PUBLICATIONS} p ON p.id=q.publication_id
         LEFT JOIN student_drafts d ON d.user_id=?4 AND d.question_version_id=q.id
         WHERE q.id=?5 AND ${currentStudentGuard('p.course_id')}`,
      )
      .bind(...studentGuardBindings(principal, now), questionVersionId)
      .first<{
        starter_code: string;
        revision: number | null;
        source: string | null;
        source_hash: string | null;
        updated_at: string | null;
      }>();
    if (!row) return null;
    if (row.revision === null)
      return {
        revision: 0,
        source: row.starter_code,
        sourceHash: await sourceHash(row.starter_code),
        updatedAt: null,
      };
    return {
      revision: row.revision,
      source: row.source!,
      sourceHash: row.source_hash!,
      updatedAt: row.updated_at,
    };
  }

  /** SW-01/02: every question of one exact publication with the caller's draft or starter@0. */
  async work(
    principal: TrustedPrincipal,
    publicationId: string,
  ): Promise<WorkResponse> {
    const bind = [
      ...studentGuardBindings(principal, this.clock()),
      publicationId,
    ];
    const [head, questions] = await this.db.batch<Record<string, unknown>>([
      this.db
        .prepare(
          `SELECT p.assignment_id,p.deadline_at,
             (SELECT l.id FROM ${PUBLICATIONS} l WHERE l.assignment_id=p.assignment_id
               AND l.course_id=p.course_id ORDER BY l.publication_number DESC LIMIT 1) AS latest_id,
             (SELECT COUNT(*) FROM student_attempts a WHERE a.user_id=?4
               AND a.assignment_id=p.assignment_id) AS attempts
           FROM ${PUBLICATIONS} p WHERE p.id=?5 AND ${currentStudentGuard('p.course_id')}`,
        )
        .bind(...bind),
      this.db
        .prepare(
          `SELECT q.id,q.position,q.starter_code,d.revision,d.source,d.source_hash,d.updated_at
           FROM ${QUESTIONS} q JOIN ${PUBLICATIONS} p ON p.id=q.publication_id
           LEFT JOIN student_drafts d ON d.user_id=?4 AND d.question_version_id=q.id
           WHERE q.publication_id=?5 AND ${currentStudentGuard('p.course_id')}
           ORDER BY q.position`,
        )
        .bind(...bind),
    ]);
    const h = head.results[0] as
      | {
          assignment_id: string;
          deadline_at: string;
          latest_id: string;
          attempts: number;
        }
      | undefined;
    if (!h) throw new BoundaryError('NOT_FOUND');
    const rows = questions.results as {
      id: string;
      position: number;
      starter_code: string;
      revision: number | null;
      source: string | null;
      source_hash: string | null;
      updated_at: string | null;
    }[];
    const mapped = await Promise.all(
      rows.map(async (r) => ({
        questionVersionId: r.id,
        position: r.position,
        revision: r.revision ?? 0,
        source: r.revision === null ? r.starter_code : r.source!,
        sourceHash:
          r.revision === null
            ? await sourceHash(r.starter_code)
            : r.source_hash!,
        updatedAt: r.revision === null ? null : r.updated_at,
      })),
    );
    return stored(() =>
      workResponseSchema.parse({
        schemaVersion: 1,
        assignmentId: h.assignment_id,
        assignmentVersionId: publicationId,
        latestAssignmentVersionId: h.latest_id,
        deadlineAt: h.deadline_at,
        attemptCount: h.attempts,
        questions: mapped,
      }),
    );
  }

  /**
   * SW-03: compare-and-swap save as ONE guarded statement: current Student membership is part of
   * the write's own WHERE clause, so a membership revoked after the request began changes no row.
   * No guard row is needed (a one-statement write is atomic), which keeps a save to one D1 row
   * written (student_drafts is WITHOUT ROWID) and one query.
   */
  async save(
    principal: TrustedPrincipal,
    questionVersionId: string,
    request: DraftSaveRequest,
  ): Promise<DraftSaveResponse> {
    await this.limiter.limit('save', principal.userId); // SW-11: before any draft write
    const now = this.clock(),
      at = isoOf(now),
      hash = await sourceHash(request.source),
      base = request.baseRevision,
      g = studentGuardBindings(principal, now);
    const statement =
      base === 0
        ? this.db
            .prepare(
              `INSERT INTO student_drafts(user_id,question_version_id,publication_id,course_id,revision,source,source_hash,updated_at)
               SELECT ?4,q.id,q.publication_id,p.course_id,1,?6,?7,?8
               FROM ${QUESTIONS} q JOIN ${PUBLICATIONS} p ON p.id=q.publication_id
               WHERE q.id=?5 AND ${currentStudentGuard('p.course_id')}
               ON CONFLICT(user_id,question_version_id) DO NOTHING`,
            )
            .bind(...g, questionVersionId, request.source, hash, at)
        : this.db
            .prepare(
              `UPDATE student_drafts SET revision=revision+1,source=?6,source_hash=?7,updated_at=?8
               WHERE user_id=?4 AND question_version_id=?5 AND revision=?9 AND source_hash<>?7
                 AND ${currentStudentGuard('student_drafts.course_id')}`,
            )
            .bind(...g, questionVersionId, request.source, hash, at, base);
    let changes: number;
    try {
      changes = (await statement.run()).meta.changes ?? 0;
    } catch {
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    }
    if (changes === 1)
      return draftSaveResponseSchema.parse({
        schemaVersion: 1,
        revision: base + 1,
        sourceHash: hash,
        savedAt: at,
      });
    const row = await this.current(principal, questionVersionId, now);
    if (!row) throw new BoundaryError('NOT_FOUND');
    if (base > 0 && row.revision === base && row.sourceHash === hash)
      // Unchanged source at the stored revision: nothing was written (SW-03).
      return draftSaveResponseSchema.parse({
        schemaVersion: 1,
        revision: row.revision,
        sourceHash: row.sourceHash,
        savedAt: row.updatedAt ?? at,
      });
    throw new StudentWorkError('CONFLICT_REVISION', {
      revision: row.revision,
      source: row.source,
      sourceHash: row.sourceHash,
    });
  }

  /**
   * SW-02: explicit move. Copies the caller's draft of an earlier publication's question onto the
   * same question in the target (newer) publication as a new revision; the old draft is untouched.
   */
  async move(
    principal: TrustedPrincipal,
    targetPublicationId: string,
    request: MoveRequest,
  ): Promise<DraftSaveResponse> {
    const now = this.clock(),
      at = isoOf(now),
      guardId = crypto.randomUUID(),
      base = request.targetBaseRevision,
      target = request.targetQuestionVersionId;
    const statements = [
      this.db
        .prepare(
          currentStudentWriteGuard('?5', {
            from: `${QUESTIONS} tq JOIN ${PUBLICATIONS} tp ON tp.id=tq.publication_id
              JOIN ${QUESTIONS} oq ON oq.question_id=tq.question_id
              JOIN ${PUBLICATIONS} op ON op.id=oq.publication_id`,
            courseColumn: 'tp.course_id',
            where: `tq.id=?6 AND tp.id=?7 AND oq.id=?8 AND op.assignment_id=tp.assignment_id
              AND op.course_id=tp.course_id AND op.publication_number<tp.publication_number
              AND EXISTS (SELECT 1 FROM student_drafts od WHERE od.user_id=?4 AND od.question_version_id=oq.id)`,
          }),
        )
        .bind(
          ...studentGuardBindings(principal, now),
          guardId,
          target,
          targetPublicationId,
          request.questionVersionId,
        ),
      base === 0
        ? this.db
            .prepare(
              `INSERT INTO student_drafts(user_id,question_version_id,publication_id,course_id,revision,source,source_hash,updated_at)
               SELECT ?,tq.id,tq.publication_id,tp.course_id,1,od.source,od.source_hash,?
               FROM student_drafts od JOIN ${QUESTIONS} tq ON tq.id=? JOIN ${PUBLICATIONS} tp ON tp.id=tq.publication_id
               WHERE od.user_id=? AND od.question_version_id=?
               ON CONFLICT(user_id,question_version_id) DO NOTHING`,
            )
            .bind(
              principal.userId,
              at,
              target,
              principal.userId,
              request.questionVersionId,
            )
        : this.db
            .prepare(
              `UPDATE student_drafts SET revision=revision+1,updated_at=?,
                 source=(SELECT od.source FROM student_drafts od WHERE od.user_id=? AND od.question_version_id=?),
                 source_hash=(SELECT od.source_hash FROM student_drafts od WHERE od.user_id=? AND od.question_version_id=?)
               WHERE user_id=? AND question_version_id=? AND revision=?`,
            )
            .bind(
              at,
              principal.userId,
              request.questionVersionId,
              principal.userId,
              request.questionVersionId,
              principal.userId,
              target,
              base,
            ),
      // Read inside the same batch (one snapshot), so a concurrent save cannot change the answer.
      this.db
        .prepare(
          `SELECT q.starter_code,d.revision,d.source,d.source_hash,d.updated_at
           FROM ${QUESTIONS} q LEFT JOIN student_drafts d ON d.user_id=? AND d.question_version_id=q.id
           WHERE q.id=?`,
        )
        .bind(principal.userId, target),
      this.db
        .prepare('DELETE FROM course_write_guards WHERE id=?')
        .bind(guardId),
    ];
    let results: D1Result<Record<string, unknown>>[];
    try {
      results = await this.db.batch<Record<string, unknown>>(statements);
    } catch (error) {
      // Only the authorization guard (foreign, cross-course, not-newer, revoked) looks missing.
      if (String((error as Error)?.message ?? error).includes(GUARD_CHECK))
        throw new BoundaryError('NOT_FOUND');
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    }
    const row = results[2].results[0] as
      | {
          starter_code: string;
          revision: number | null;
          source: string | null;
          source_hash: string | null;
          updated_at: string | null;
        }
      | undefined;
    // The guard passed, so the target exists; no draft row means the virtual revision 0.
    if (!row) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    if (row.revision === null) {
      throw new StudentWorkError('CONFLICT_REVISION', {
        revision: 0,
        source: row.starter_code,
        sourceHash: await sourceHash(row.starter_code),
      });
    }
    if (results[1].meta.changes !== 1)
      throw new StudentWorkError('CONFLICT_REVISION', {
        revision: row.revision,
        source: row.source!,
        sourceHash: row.source_hash!,
      });
    return draftSaveResponseSchema.parse({
      schemaVersion: 1,
      revision: row.revision,
      sourceHash: row.source_hash!,
      savedAt: row.updated_at!,
    });
  }

  /** Membership-guarded replay lookup: a former member gets nothing. */
  private async replayOf(
    principal: TrustedPrincipal,
    publicationId: string,
    key: string,
    now: number,
  ) {
    return this.db
      .prepare(
        `SELECT a.id,a.fingerprint,a.submitted_at,a.publication_id
         FROM ${PUBLICATIONS} p JOIN student_attempts a ON a.user_id=?4
           AND a.assignment_id=p.assignment_id AND a.idempotency_key=?6
         WHERE p.id=?5 AND ${currentStudentGuard('p.course_id')}`,
      )
      .bind(...studentGuardBindings(principal, now), publicationId, key)
      .first<{
        id: string;
        fingerprint: string;
        submitted_at: string;
        publication_id: string;
      }>();
  }

  private replayResult(
    row: {
      id: string;
      fingerprint: string;
      submitted_at: string;
      publication_id: string;
    },
    fingerprint: string,
  ): SubmitResponse {
    if (row.fingerprint !== fingerprint)
      throw new StudentWorkError('IDEMPOTENCY_MISMATCH');
    return {
      schemaVersion: 1,
      attemptId: row.id,
      assignmentVersionId: row.publication_id,
      submittedAt: row.submitted_at,
      replayed: true,
    };
  }

  /**
   * SW-05/06/07: one guarded batch creates the attempt and copies answers from stored drafts.
   * The request body's source is never used; only (question, revision, hash) confirmations.
   */
  async submit(
    principal: TrustedPrincipal,
    publicationId: string,
    request: SubmitRequest,
  ): Promise<SubmitResponse> {
    const now = this.clock(), // read once: the server receipt time
      received = isoOf(now),
      fingerprint = await answersFingerprint(publicationId, request.answers),
      key = request.idempotencyKey;
    const replay = await this.replayOf(principal, publicationId, key, now);
    if (replay) return this.replayResult(replay, fingerprint);
    // SW-11: counted only after the replay lookup, so a same-key retry is never limited.
    await this.limiter.limit('submit', principal.userId);
    const attemptId = crypto.randomUUID(),
      guardId = crypto.randomUUID(),
      pairs = JSON.stringify(
        request.answers.map((a) => [
          a.questionVersionId,
          a.draftRevision,
          a.sourceHash,
        ]),
      );
    const statements = [
      this.db
        .prepare(
          currentStudentWriteGuard('?5', {
            from: `${PUBLICATIONS} p`,
            courseColumn: 'p.course_id',
            where: `p.id=?6 AND p.deadline_at>?7 AND ${LATEST('p')}
              AND (SELECT COUNT(*) FROM ${QUESTIONS} q WHERE q.publication_id=p.id)=json_array_length(?8)
              AND (SELECT COUNT(*) FROM ${QUESTIONS} q JOIN instructor_rubric_versions rv ON rv.question_version_id=q.id
                WHERE q.publication_id=p.id)=json_array_length(?8)
              AND (SELECT COUNT(*) FROM json_each(?8) j
                JOIN student_drafts d ON d.user_id=?4
                  AND d.question_version_id=json_extract(j.value,'$[0]') AND d.publication_id=p.id
                  AND d.revision=json_extract(j.value,'$[1]') AND d.source_hash=json_extract(j.value,'$[2]')
                JOIN ${QUESTIONS} dq ON dq.id=d.question_version_id AND dq.publication_id=p.id)
                =json_array_length(?8)`,
          }),
        )
        .bind(
          ...studentGuardBindings(principal, now),
          guardId,
          publicationId,
          received,
          pairs,
        ),
      this.db
        .prepare(
          `INSERT INTO student_attempts(id,user_id,course_id,assignment_id,publication_id,submitted_at,idempotency_key,fingerprint)
           SELECT ?,?,p.course_id,p.assignment_id,p.id,?,?,? FROM ${PUBLICATIONS} p WHERE p.id=?`,
        )
        .bind(
          attemptId,
          principal.userId,
          received,
          key,
          fingerprint,
          publicationId,
        ),
      this.db
        .prepare(
          `INSERT INTO student_attempt_answers(id,attempt_id,question_version_id,rubric_version_id,draft_revision,source,source_hash)
           SELECT ?||'-'||q.position,?,d.question_version_id,r.id,d.revision,d.source,d.source_hash
           FROM student_drafts d JOIN ${QUESTIONS} q ON q.id=d.question_version_id
           JOIN instructor_rubric_versions r ON r.question_version_id=q.id
           WHERE d.user_id=? AND d.publication_id=?`,
        )
        .bind(attemptId, attemptId, principal.userId, publicationId),
      this.db
        .prepare('DELETE FROM course_write_guards WHERE id=?')
        .bind(guardId),
    ];
    try {
      await this.db.batch(statements);
      return {
        schemaVersion: 1,
        attemptId,
        assignmentVersionId: publicationId,
        submittedAt: received,
        replayed: false,
      };
    } catch {
      // The batch rolled back as a whole. Decide why, without disclosing anything beyond the caller's own data.
    }
    const raced = await this.replayOf(principal, publicationId, key, now);
    if (raced) return this.replayResult(raced, fingerprint);
    const rows = await this.db
      .prepare(
        `SELECT q.id,d.revision,d.source_hash,p.deadline_at,(${LATEST('p')}) AS latest
         FROM ${PUBLICATIONS} p JOIN ${QUESTIONS} q ON q.publication_id=p.id
         LEFT JOIN student_drafts d ON d.user_id=?4 AND d.question_version_id=q.id
         WHERE p.id=?5 AND ${currentStudentGuard('p.course_id')}`,
      )
      .bind(...studentGuardBindings(principal, now), publicationId)
      .all<{
        id: string;
        revision: number | null;
        source_hash: string | null;
        deadline_at: string;
        latest: number;
      }>();
    if (!rows.results.length) throw new BoundaryError('NOT_FOUND');
    const byQuestion = new Map(rows.results.map((r) => [r.id, r]));
    if (
      byQuestion.size !== request.answers.length ||
      !request.answers.every((a) => byQuestion.has(a.questionVersionId))
    )
      throw new ContractError('$.answers', 'coverage');
    const first = rows.results[0];
    if (!first.latest) throw new StudentWorkError('STALE_PUBLICATION');
    if (received >= first.deadline_at)
      throw new StudentWorkError('DEADLINE_PASSED');
    if (
      request.answers.some((a) => {
        const r = byQuestion.get(a.questionVersionId)!;
        return r.revision !== a.draftRevision || r.source_hash !== a.sourceHash;
      })
    )
      throw new StudentWorkError('CONFLICT_REVISION');
    throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  }

  /** SW-08: own attempts for the assignment of one publication, newest first. */
  async history(
    principal: TrustedPrincipal,
    publicationId: string,
    cursor: string | null,
    /** SF-07: the page's attempt IDs with a current release; absent means no markers. */
    released?: (attemptIds: string[]) => Promise<ReadonlySet<string>>,
  ): Promise<AttemptHistory> {
    const bind = [
      ...studentGuardBindings(principal, this.clock()),
      publicationId,
    ];
    const [exists, list] = await this.db.batch<Record<string, unknown>>([
      this.db
        .prepare(
          `SELECT p.id FROM ${PUBLICATIONS} p WHERE p.id=?5 AND ${currentStudentGuard('p.course_id')}`,
        )
        .bind(...bind),
      this.db
        .prepare(
          `SELECT a.seq,a.id,a.publication_id,a.submitted_at,
             (SELECT COUNT(*) FROM student_attempt_answers x WHERE x.attempt_id=a.id) AS answers
           FROM ${PUBLICATIONS} p JOIN student_attempts a ON a.user_id=?4 AND a.assignment_id=p.assignment_id
           WHERE p.id=?5 AND ${currentStudentGuard('p.course_id')} AND (?6 IS NULL OR EXISTS (SELECT 1 FROM student_attempts c WHERE c.seq=?6 AND c.user_id=?4
             AND (a.submitted_at<c.submitted_at OR (a.submitted_at=c.submitted_at AND a.seq<c.seq))))
           ORDER BY a.submitted_at DESC, a.seq DESC LIMIT ?7`,
        )
        .bind(
          ...bind,
          cursor === null ? null : Number(cursor),
          STUDENT_ATTEMPT_PAGE + 1,
        ),
    ]);
    if (!exists.results.length) throw new BoundaryError('NOT_FOUND');
    const rows = list.results as {
      seq: number;
      id: string;
      publication_id: string;
      submitted_at: string;
      answers: number;
    }[];
    const page = rows.slice(0, STUDENT_ATTEMPT_PAGE);
    const flagged = released
      ? await released(page.map((r) => r.id))
      : new Set<string>();
    return stored(() =>
      attemptHistorySchema.parse({
        schemaVersion: 1,
        items: page.map((r) => ({
          attemptId: r.id,
          assignmentVersionId: r.publication_id,
          submittedAt: r.submitted_at,
          answerCount: r.answers,
          feedbackReleased: flagged.has(r.id),
        })),
        nextCursor:
          rows.length > STUDENT_ATTEMPT_PAGE ? String(page.at(-1)!.seq) : null,
      }),
    );
  }

  /**
   * AS-01/02: one status per requested assignment of a course where the caller is a current
   * Student. Only the caller's own attempts are read; IDs outside the course get no entry, so
   * nothing is enumerable. Release currentness comes from the injected batch (SF-07's hint, where a
   * failing producer yields no Feedback released), and Due soon uses the server clock.
   */
  async assignmentStatus(
    principal: TrustedPrincipal,
    courseId: string,
    assignmentIds: readonly string[],
    released: (attemptIds: string[]) => Promise<ReadonlySet<string>>,
  ): Promise<AssignmentStatusPage> {
    const now = this.clock();
    const bind = [
      ...studentGuardBindings(principal, now),
      courseId,
      JSON.stringify(assignmentIds),
    ];
    const [course, list] = await this.db.batch<Record<string, unknown>>([
      this.db
        .prepare(
          `SELECT c.id FROM courses c WHERE c.id=?5 AND c.active=1 AND ${currentStudentGuard('c.id')}`,
        )
        .bind(...bind.slice(0, 5)),
      this.db
        .prepare(
          `SELECT r.key AS position, r.value AS assignment_id,
             (SELECT p.deadline_at FROM ${PUBLICATIONS} p WHERE p.assignment_id=r.value AND p.course_id=?5
               ORDER BY p.publication_number DESC LIMIT 1) AS deadline_at,
             (SELECT a.id FROM student_attempts a WHERE a.user_id=?4 AND a.assignment_id=r.value AND a.course_id=?5
               ORDER BY a.submitted_at DESC, a.seq DESC LIMIT 1) AS attempt_id
           FROM json_each(?6) r
           WHERE ${currentStudentGuard('?5')}
             AND EXISTS (SELECT 1 FROM ${PUBLICATIONS} q WHERE q.assignment_id=r.value AND q.course_id=?5)
           ORDER BY r.key`,
        )
        .bind(...bind),
    ]);
    if (!course.results.length) throw new BoundaryError('NOT_FOUND');
    const rows = list.results as {
      assignment_id: string;
      deadline_at: string;
      attempt_id: string | null;
    }[];
    const attempts = rows.flatMap((r) => (r.attempt_id ? [r.attempt_id] : []));
    const current = attempts.length
      ? await released(attempts)
      : new Set<string>();
    const statusOf = (r: (typeof rows)[number]): AssignmentStatus => {
      if (r.attempt_id && current.has(r.attempt_id)) return 'feedback-released';
      if (r.attempt_id) return 'submitted';
      const deadline = Date.parse(r.deadline_at);
      return deadline > now && deadline <= now + DUE_SOON_MS
        ? 'due-soon'
        : 'none';
    };
    return stored(() =>
      assignmentStatusPageSchema.parse({
        schemaVersion: 1,
        items: rows.map((r) => ({
          assignmentId: r.assignment_id,
          status: statusOf(r),
        })),
      }),
    );
  }

  /** SW-08: one own attempt, read-only, in the closed attempt shape. */
  attempt(principal: TrustedPrincipal, attemptId: string): Promise<Attempt> {
    return readAttempt(
      this.db,
      attemptId,
      `a.user_id=?4 AND ${currentStudentGuard('a.course_id')}`,
      studentGuardBindings(principal, this.clock()),
    );
  }
}
