import { BoundaryError } from '../../../shared/instructor-contracts/schema';
import {
  draftFeedbackSchema,
  type AssessmentHead,
  type AssessmentRevision,
  type AssessmentView,
} from '../../../shared/instructor-contracts/assessment';
import {
  releaseSchema,
  withdrawnSchema,
  currentnessSchema,
  type Release,
  type Withdrawn,
} from '../../../shared/instructor-contracts/release';
type HeadRow = {
  id: string;
  course_id: string;
  attempt_id: string;
  publication_id: string;
  evidence: string;
  head_revision_id: string;
  approved_revision_id: string | null;
  availability_revision: number;
  current_release_version: number | null;
  maximum_release_version: number;
};
type RevisionRow = {
  id: string;
  assessment_id: string;
  parent_revision_id: string | null;
  actor_id: string;
  created_at: string;
  feedback: string;
  provenance: 'manual';
  sequence: number;
};
export type Receipt = {
  scope: string;
  fingerprint: string;
  assessment_id: string;
  operation: string;
  version: number | null;
  revision_id: string | null;
};
const head = (r: HeadRow): AssessmentHead => ({
  id: r.id,
  courseId: r.course_id,
  attemptId: r.attempt_id,
  publicationId: r.publication_id,
  evidence: r.evidence,
  headRevisionId: r.head_revision_id,
  approvedRevisionId: r.approved_revision_id,
  availabilityRevision: r.availability_revision,
  currentReleaseVersion: r.current_release_version,
  maximumReleaseVersion: r.maximum_release_version,
});
const revision = (r: RevisionRow): AssessmentRevision => ({
  id: r.id,
  assessmentId: r.assessment_id,
  parentRevisionId: r.parent_revision_id,
  actorId: r.actor_id,
  createdAt: r.created_at,
  provenance: r.provenance,
  feedback: draftFeedbackSchema.parse(JSON.parse(r.feedback)),
});
export class AssessmentRepository {
  constructor(readonly db: D1Database) {}
  async scope(id: string) {
    const r = await this.db
      .prepare(
        'SELECT id,course_id,attempt_id,evidence FROM instructor_assessments WHERE id=?',
      )
      .bind(id)
      .first<{
        id: string;
        course_id: string;
        attempt_id: string;
        evidence: string;
      }>();
    return r
      ? { courseId: r.course_id, attemptId: r.attempt_id, evidence: r.evidence }
      : null;
  }
  async receipt(scope: string) {
    return this.db
      .prepare('SELECT * FROM instructor_assessment_receipts WHERE scope=?')
      .bind(scope)
      .first<Receipt>();
  }
  private receiptStatement(r: Receipt) {
    return this.db
      .prepare('INSERT INTO instructor_assessment_receipts VALUES(?,?,?,?,?,?)')
      .bind(
        r.scope,
        r.fingerprint,
        r.assessment_id,
        r.operation,
        r.version,
        r.revision_id,
      );
  }
  private revisionStatement(r: AssessmentRevision) {
    return this.db
      .prepare(
        'INSERT INTO instructor_assessment_revisions VALUES(?,?,?,?,?,?,?)',
      )
      .bind(
        r.id,
        r.assessmentId,
        r.parentRevisionId,
        r.actorId,
        r.createdAt,
        JSON.stringify(r.feedback),
        r.provenance,
      );
  }
  async create(h: AssessmentHead, r: AssessmentRevision, receipt: Receipt) {
    const nonce = crypto.randomUUID();
    await this.db.batch([
      this.db
        .prepare(
          'INSERT OR IGNORE INTO instructor_assessments VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          h.id,
          h.courseId,
          h.attemptId,
          h.publicationId,
          h.evidence,
          h.headRevisionId,
          null,
          1,
          null,
          0,
          nonce,
        ),
      this.db
        .prepare(
          'INSERT INTO instructor_assessment_revisions SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM instructor_assessments WHERE id=? AND transition_id=?)',
        )
        .bind(
          r.id,
          r.assessmentId,
          null,
          r.actorId,
          r.createdAt,
          JSON.stringify(r.feedback),
          'manual',
          h.id,
          nonce,
        ),
      this.db
        .prepare(
          'INSERT INTO instructor_assessment_audit SELECT ?,?,?,?,?,?,NULL WHERE EXISTS(SELECT 1 FROM instructor_assessments WHERE id=? AND transition_id=?)',
        )
        .bind(nonce, h.id, r.actorId, 'create', r.createdAt, r.id, h.id, nonce),
      this.receiptStatement(receipt),
    ]);
  }
  async read(
    id: string,
    cursor = Number.MAX_SAFE_INTEGER,
    selected?: string,
  ): Promise<AssessmentView> {
    const results = await this.db.batch([
      this.db
        .prepare('SELECT * FROM instructor_assessments WHERE id=?')
        .bind(id),
      this.db
        .prepare(
          'SELECT r.*,r.rowid AS sequence FROM instructor_assessment_revisions r JOIN instructor_assessments a ON a.id=r.assessment_id WHERE a.id=? AND r.id=COALESCE(?,a.head_revision_id)',
        )
        .bind(id, selected ?? null),
      this.db
        .prepare(
          'SELECT id,assessment_id,parent_revision_id,actor_id,created_at,provenance,rowid AS sequence FROM instructor_assessment_revisions WHERE assessment_id=? AND rowid<? ORDER BY rowid DESC LIMIT 51',
        )
        .bind(id, cursor),
      this.db
        .prepare(
          'SELECT r.version,r.revision_id,r.released_at,w.withdrawn_at FROM instructor_assessment_releases r LEFT JOIN instructor_assessment_withdrawals w ON r.assessment_id=w.assessment_id AND r.version=w.version WHERE r.assessment_id=? ORDER BY r.version DESC LIMIT 100',
        )
        .bind(id),
    ]);
    const a = results[0].results[0] as HeadRow | undefined,
      b = results[1].results[0] as RevisionRow | undefined;
    if (!a || !b) throw new BoundaryError('NOT_FOUND');
    const rows = results[2].results as RevisionRow[];
    return {
      head: head(a),
      revision: revision(b),
      history: rows.slice(0, 50).map((r) => ({
        id: r.id,
        assessmentId: r.assessment_id,
        parentRevisionId: r.parent_revision_id,
        actorId: r.actor_id,
        createdAt: r.created_at,
        provenance: r.provenance,
      })),
      historyCursor: rows.length > 50 ? String(rows[49].sequence) : null,
      releases: (
        results[3].results as {
          version: number;
          revision_id: string;
          released_at: string;
          withdrawn_at: string | null;
        }[]
      ).map((r) => ({
        version: r.version,
        revisionId: r.revision_id,
        releasedAt: r.released_at,
        withdrawnAt: r.withdrawn_at,
      })),
    };
  }
  async commit(
    before: AssessmentHead,
    after: AssessmentHead,
    actor: string,
    action: string,
    at: string,
    options: {
      revision?: AssessmentRevision;
      release?: Release;
      withdraw?: { version: number; reason: string };
      receipt?: Receipt;
    } = {},
  ) {
    const nonce = crypto.randomUUID();
    const statements = [
      this.db
        .prepare(
          'UPDATE instructor_assessments SET head_revision_id=?,approved_revision_id=?,availability_revision=?,current_release_version=?,maximum_release_version=?,transition_id=? WHERE id=? AND head_revision_id=? AND availability_revision=? AND approved_revision_id IS ? AND maximum_release_version=? AND current_release_version IS ?',
        )
        .bind(
          after.headRevisionId,
          after.approvedRevisionId,
          after.availabilityRevision,
          after.currentReleaseVersion,
          after.maximumReleaseVersion,
          nonce,
          before.id,
          before.headRevisionId,
          before.availabilityRevision,
          before.approvedRevisionId,
          before.maximumReleaseVersion,
          before.currentReleaseVersion,
        ),
      // NOT NULL foreign key guard: a losing CAS aborts the entire D1 batch, including its children.
      this.db
        .prepare(
          'INSERT INTO instructor_assessment_audit VALUES(?,(SELECT id FROM instructor_assessments WHERE id=? AND transition_id=?),?,?,?,?,?)',
        )
        .bind(
          nonce,
          before.id,
          nonce,
          actor,
          action,
          at,
          after.headRevisionId,
          options.release?.releaseVersion ?? options.withdraw?.version ?? null,
        ),
    ];
    if (options.revision)
      statements.push(this.revisionStatement(options.revision));
    if (options.release) {
      const r = options.release;
      statements.push(
        this.db
          .prepare(
            'INSERT INTO instructor_assessment_releases VALUES(?,?,?,?,?)',
          )
          .bind(
            before.id,
            r.releaseVersion,
            r.assessmentRevisionId,
            r.releasedAt,
            JSON.stringify(r),
          ),
      );
    }
    if (options.withdraw)
      statements.push(
        this.db
          .prepare(
            'INSERT INTO instructor_assessment_withdrawals VALUES(?,?,?,?,?)',
          )
          .bind(
            before.id,
            options.withdraw.version,
            at,
            actor,
            options.withdraw.reason,
          ),
      );
    if (options.receipt)
      statements.push(this.receiptStatement(options.receipt));
    try {
      await this.db.batch(statements);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes(
          'NOT NULL constraint failed: instructor_assessment_audit.assessment_id',
        ) ||
        message.includes(
          'UNIQUE constraint failed: instructor_assessment_releases.revision_id',
        )
      )
        throw new BoundaryError('REVISION_CONFLICT');
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    }
  }
  async publicState(
    id: string,
    version: number,
    at: string,
  ): Promise<{
    feedback: Release | Withdrawn;
    currentness: ReturnType<typeof currentnessSchema.parse>;
  }> {
    // One batch is a single consistent D1 snapshot of release content and visibility metadata.
    const result = await this.db.batch([
      this.db
        .prepare('SELECT * FROM instructor_assessments WHERE id=?')
        .bind(id),
      this.db
        .prepare(
          'SELECT * FROM instructor_assessment_releases WHERE assessment_id=? AND version=?',
        )
        .bind(id, version),
      this.db
        .prepare(
          'SELECT version,withdrawn_at FROM instructor_assessment_withdrawals WHERE assessment_id=? ORDER BY version',
        )
        .bind(id),
    ]);
    const a = result[0].results[0] as HeadRow | undefined,
      r = result[1].results[0] as { content: string } | undefined;
    if (!a || !r) throw new BoundaryError('NOT_FOUND');
    const withdrawals = result[2].results as {
        version: number;
        withdrawn_at: string;
      }[],
      w = withdrawals.find((w) => w.version === version);
    const feedback = w
      ? withdrawnSchema.parse({
          schemaVersion: 1,
          id,
          submissionAttemptId: a.attempt_id,
          releaseVersion: version,
          state: 'withdrawn',
          withdrawnAt: w.withdrawn_at,
        })
      : releaseSchema.parse({
          ...JSON.parse(r.content),
          state:
            a.current_release_version === version ? 'released' : 'superseded',
        });
    return {
      feedback,
      currentness: currentnessSchema.parse({
        schemaVersion: 1,
        assessmentId: id,
        submissionAttemptId: a.attempt_id,
        availabilityRevision: a.availability_revision,
        currentReleaseVersion: a.current_release_version,
        withdrawnReleaseVersions: withdrawals.map((w) => w.version),
        checkedAt: at,
      }),
    };
  }
  async currentness(id: string, at: string) {
    const rows = await this.db.batch([
      this.db
        .prepare('SELECT * FROM instructor_assessments WHERE id=?')
        .bind(id),
      this.db
        .prepare(
          'SELECT version FROM instructor_assessment_withdrawals WHERE assessment_id=? ORDER BY version',
        )
        .bind(id),
    ]);
    const a = rows[0].results[0] as HeadRow | undefined;
    if (!a) throw new BoundaryError('NOT_FOUND');
    return currentnessSchema.parse({
      schemaVersion: 1,
      assessmentId: id,
      submissionAttemptId: a.attempt_id,
      availabilityRevision: a.availability_revision,
      currentReleaseVersion: a.current_release_version,
      withdrawnReleaseVersions: (rows[1].results as { version: number }[]).map(
        (w) => w.version,
      ),
      checkedAt: at,
    });
  }
  async audit(id: string, cursor = Number.MAX_SAFE_INTEGER) {
    const r = await this.db
      .prepare(
        "SELECT a.rowid AS sequence,a.id,a.actor_id,a.action,a.created_at,a.revision_id,a.release_version,w.reason AS private_reason FROM instructor_assessment_audit a LEFT JOIN instructor_assessment_withdrawals w ON a.assessment_id=w.assessment_id AND a.release_version=w.version AND a.action='withdraw' WHERE a.assessment_id=? AND a.rowid<? ORDER BY a.rowid DESC LIMIT 51",
      )
      .bind(id, cursor)
      .all();
    return {
      events: r.results.slice(0, 50),
      cursor: r.results.length > 50 ? String(r.results[49].sequence) : null,
    };
  }
}
