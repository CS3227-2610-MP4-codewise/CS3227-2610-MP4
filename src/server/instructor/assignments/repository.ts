import type { TrustedPrincipal } from '../ports/contracts';
import {
  draftSchema,
  type AssignmentDraft,
  type Authoring,
  type DraftSummary,
  type PublicationSummary,
  type PrivatePublication,
} from '../../../shared/instructor-contracts/authoring';
import {
  publicationSchema,
  type Publication,
} from '../../../shared/instructor-contracts/publication';
import {
  BoundaryError,
  assert,
} from '../../../shared/instructor-contracts/schema';
export type SnapshotQuestion = Publication['questions'][number] & {
  privateReference: string;
};
export type PublicationWrite = {
  publication: Publication;
  questions: SnapshotQuestion[];
  actorId: string;
  sourceRevision: number;
  key: string;
  fingerprint: string;
  principal?: TrustedPrincipal;
};
type Root = {
  id: string;
  assignment_id: string;
  course_id: string;
  publication_number: number;
  source_revision: number;
  published_at: string;
  fingerprint: string;
  title: string;
  deadline_at: string;
};
export interface AssignmentRepository {
  scope(id: string): Promise<{ courseId: string } | null>;
  create(
    courseId: string,
    actorId: string,
    key: string,
    id: string,
    now: string,
    principal?: TrustedPrincipal,
  ): Promise<AssignmentDraft>;
  list(
    courseId: string,
    cursor: string,
  ): Promise<{ items: DraftSummary[]; nextCursor: string | null }>;
  draft(id: string, courseId: string): Promise<AssignmentDraft>;
  save(
    id: string,
    courseId: string,
    revision: number,
    payload: Authoring,
    now: string,
    principal?: TrustedPrincipal,
  ): Promise<AssignmentDraft>;
  receipt(
    id: string,
    courseId: string,
    actorId: string,
    key: string,
  ): Promise<{ versionId: string; fingerprint: string } | null>;
  publish(value: PublicationWrite): Promise<string>;
  history(id: string, courseId: string): Promise<PublicationSummary[]>;
  publicVersion(id: string, courseId: string): Promise<Publication>;
  privateVersion(id: string, courseId: string): Promise<PrivatePublication>;
  summary(id: string, courseId: string): Promise<PublicationSummary>;
}
export class D1Assignments implements AssignmentRepository {
  constructor(
    readonly db: D1Database,
    readonly options: { enforceAuthority?: boolean } = {},
  ) {}
  private async guarded(
    statements: D1PreparedStatement[],
    principal: TrustedPrincipal | undefined,
    course: string,
  ) {
    if (!this.options.enforceAuthority) return this.db.batch(statements);
    if (!principal) throw new BoundaryError('FORBIDDEN');
    const now = Date.now(),
      key = crypto.randomUUID();
    const guard = this.db
      .prepare(
        `INSERT INTO course_write_guards(id,allowed) SELECT ?,CASE WHEN EXISTS(
      SELECT 1 FROM course_memberships m JOIN courses c ON c.id=m.course_id AND c.active=1
      JOIN auth_accounts a ON a.id=m.user_id AND a.active=1
      JOIN auth_sessions s ON s.user_id=a.id AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.last_seen>?
      WHERE m.course_id=? AND m.user_id=? AND m.role='instructor' AND m.active=1
    ) THEN 1 ELSE 0 END`,
      )
      .bind(
        key,
        principal.sessionHandle,
        now,
        now - 30 * 60_000,
        course,
        principal.userId,
      );
    try {
      const results = await this.db.batch([
        guard,
        ...statements,
        this.db.prepare('DELETE FROM course_write_guards WHERE id=?').bind(key),
      ]);
      return results.slice(1, -1);
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes('course_authorization_guard')
      )
        throw new BoundaryError('FORBIDDEN');
      throw e;
    }
  }
  async scope(value: string) {
    const row = await this.db
      .prepare(
        'SELECT course_id FROM instructor_assignment_drafts WHERE id=? UNION ALL SELECT course_id FROM instructor_assignment_publications WHERE id=? LIMIT 1',
      )
      .bind(value, value)
      .first<{ course_id: string }>();
    return row ? { courseId: row.course_id } : null;
  }
  private decode(
    row: {
      id: string;
      course_id: string;
      revision: number;
      payload: string;
      created_at: string;
      updated_at: string;
    } | null,
  ) {
    if (!row) throw new BoundaryError('NOT_FOUND');
    return draftSchema.parse({
      schemaVersion: 1,
      assignmentId: row.id,
      courseId: row.course_id,
      revision: row.revision,
      payload: JSON.parse(row.payload),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  async create(
    course: string,
    actor: string,
    key: string,
    assignmentId: string,
    now: string,
    principal?: TrustedPrincipal,
  ) {
    const statement = this.db
      .prepare(
        'INSERT INTO instructor_assignment_drafts(id,course_id,revision,payload,created_by,create_key,created_at,updated_at) VALUES(?,?,1,?,?,?,?,?) ON CONFLICT(course_id,created_by,create_key) DO NOTHING',
      )
      .bind(
        assignmentId,
        course,
        JSON.stringify({ title: '', deadlineAt: null, questions: [] }),
        actor,
        key,
        now,
        now,
      );
    await this.guarded([statement], principal, course);
    const row = await this.db
      .prepare(
        'SELECT id,course_id,revision,payload,created_at,updated_at FROM instructor_assignment_drafts WHERE course_id=? AND created_by=? AND create_key=?',
      )
      .bind(course, actor, key)
      .first<{
        id: string;
        course_id: string;
        revision: number;
        payload: string;
        created_at: string;
        updated_at: string;
      }>();
    return this.decode(row);
  }
  async draft(assignmentId: string, course: string) {
    return this.decode(
      await this.db
        .prepare(
          'SELECT id,course_id,revision,payload,created_at,updated_at FROM instructor_assignment_drafts WHERE id=? AND course_id=?',
        )
        .bind(assignmentId, course)
        .first(),
    );
  }
  async list(course: string, cursor: string) {
    const rows = await this.db
      .prepare(
        "SELECT id,course_id,revision,json_extract(payload,'$.title') AS title,updated_at FROM instructor_assignment_drafts WHERE course_id=? AND id>? ORDER BY id LIMIT 51",
      )
      .bind(course, cursor)
      .all<{
        id: string;
        course_id: string;
        revision: number;
        title: string;
        updated_at: string;
      }>();
    const page = rows.results.slice(0, 50);
    return {
      items: page.map((r) => ({
        assignmentId: r.id,
        courseId: r.course_id,
        revision: r.revision,
        title: r.title,
        updatedAt: r.updated_at,
      })),
      nextCursor: rows.results.length > 50 ? page[49].id : null,
    };
  }
  async save(
    assignmentId: string,
    course: string,
    revision: number,
    payload: Authoring,
    now: string,
    principal?: TrustedPrincipal,
  ) {
    const statement = this.db
      .prepare(
        'UPDATE instructor_assignment_drafts SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND course_id=? AND revision=?',
      )
      .bind(JSON.stringify(payload), now, assignmentId, course, revision);
    const [result] = await this.guarded([statement], principal, course);
    if (result.meta.changes !== 1) throw new BoundaryError('REVISION_CONFLICT');
    // Return the acknowledged payload/revision, not a racing later read.
    const row = await this.db
      .prepare(
        'SELECT created_at FROM instructor_assignment_drafts WHERE id=? AND course_id=?',
      )
      .bind(assignmentId, course)
      .first<{ created_at: string }>();
    assert(row, '$', 'missing_receipt');
    return draftSchema.parse({
      schemaVersion: 1,
      assignmentId,
      courseId: course,
      revision: revision + 1,
      createdAt: row.created_at,
      updatedAt: now,
      payload,
    });
  }
  async receipt(
    assignmentId: string,
    course: string,
    actor: string,
    key: string,
  ) {
    const r = await this.db
      .prepare(
        'SELECT id,fingerprint FROM instructor_assignment_publications WHERE assignment_id=? AND course_id=? AND published_by=? AND request_key=?',
      )
      .bind(assignmentId, course, actor, key)
      .first<{ id: string; fingerprint: string }>();
    return r ? { versionId: r.id, fingerprint: r.fingerprint } : null;
  }
  async publish(v: PublicationWrite) {
    const p = v.publication,
      json = JSON.stringify(v.questions);
    const statements = [
      this.db
        .prepare(
          'INSERT INTO instructor_assignment_publications(id,assignment_id,course_id,publication_number,source_revision,published_by,published_at,request_key,fingerprint,title,deadline_at) VALUES(?,?,?,(SELECT COALESCE(MAX(publication_number),0)+1 FROM instructor_assignment_publications WHERE assignment_id=?),?,?,?,?,?,?,?)',
        )
        .bind(
          p.assignmentVersionId,
          p.assignmentId,
          p.courseId,
          p.assignmentId,
          v.sourceRevision,
          v.actorId,
          p.publishedAt,
          v.key,
          v.fingerprint,
          p.title,
          p.deadlineAt,
        ),
      this.db
        .prepare(
          "INSERT INTO instructor_question_versions(id,question_id,publication_id,position,title,instructions,language,starter_code,private_reference) SELECT json_extract(value,'$.questionVersionId'),json_extract(value,'$.questionId'),?,CAST(key AS INTEGER),json_extract(value,'$.title'),json_extract(value,'$.instructions'),json_extract(value,'$.language'),json_extract(value,'$.starterCode'),json_extract(value,'$.privateReference') FROM json_each(?)",
        )
        .bind(p.assignmentVersionId, json),
      this.db
        .prepare(
          "INSERT INTO instructor_rubric_versions(id,rubric_id,question_version_id) SELECT json_extract(value,'$.rubricVersionId'),json_extract(value,'$.rubricId'),json_extract(value,'$.questionVersionId') FROM json_each(?)",
        )
        .bind(json),
      this.db
        .prepare(
          "INSERT INTO instructor_criterion_versions(rubric_version_id,criterion_id,position,comparison_key,descriptor,minimum_units,maximum_units) SELECT json_extract(q.value,'$.rubricVersionId'),json_extract(c.value,'$.criterionId'),CAST(c.key AS INTEGER),json_extract(c.value,'$.comparisonKey'),json_extract(c.value,'$.descriptor'),CAST(ROUND(json_extract(c.value,'$.minimumScore')*100) AS INTEGER),CAST(ROUND(json_extract(c.value,'$.maximumScore')*100) AS INTEGER) FROM json_each(?) q, json_each(q.value,'$.criteria') c",
        )
        .bind(json),
    ];
    try {
      const results = await this.guarded(statements, v.principal, p.courseId);
      assert(results[0].meta.changes === 1, '$', 'missing_receipt');
    } catch (e) {
      // Database guard errors have a fixed local marker, never returned verbatim.
      if (
        e instanceof Error &&
        e.message.includes('publication_revision_conflict')
      )
        throw new BoundaryError('REVISION_CONFLICT');
      throw e;
    }
    return p.assignmentVersionId;
  }
  private async root(version: string, course: string) {
    const r = await this.db
      .prepare(
        'SELECT id,assignment_id,course_id,publication_number,source_revision,published_at,fingerprint,title,deadline_at FROM instructor_assignment_publications WHERE id=? AND course_id=?',
      )
      .bind(version, course)
      .first<Root>();
    if (!r) throw new BoundaryError('NOT_FOUND');
    return r;
  }
  private summaryOf(r: Root): PublicationSummary {
    return {
      assignmentVersionId: r.id,
      publicationNumber: r.publication_number,
      sourceDraftRevision: r.source_revision,
      publishedAt: r.published_at,
    };
  }
  async summary(version: string, course: string) {
    return this.summaryOf(await this.root(version, course));
  }
  async history(assignmentId: string, course: string) {
    const rows = await this.db
      .prepare(
        'SELECT id,assignment_id,course_id,publication_number,source_revision,published_at,fingerprint,title,deadline_at FROM instructor_assignment_publications WHERE assignment_id=? AND course_id=? ORDER BY publication_number DESC LIMIT 100',
      )
      .bind(assignmentId, course)
      .all<Root>();
    return rows.results.map((r) => this.summaryOf(r));
  }
  private async read(version: string, course: string, privateRead: boolean) {
    const r = await this.root(version, course);
    const q = await this.db
      .prepare(
        'SELECT q.id,q.question_id,q.title,q.instructions,q.language,q.starter_code,r.id AS rubric_version_id,r.rubric_id' +
          (privateRead ? ',q.private_reference' : '') +
          ' FROM instructor_question_versions q JOIN instructor_rubric_versions r ON r.question_version_id=q.id WHERE q.publication_id=? ORDER BY q.position',
      )
      .bind(version)
      .all<{
        id: string;
        question_id: string;
        title: string;
        instructions: string;
        language: string;
        starter_code: string;
        rubric_version_id: string;
        rubric_id: string;
        private_reference?: string;
      }>();
    const c = await this.db
      .prepare(
        'SELECT c.rubric_version_id,c.criterion_id,c.comparison_key,c.descriptor,c.minimum_units,c.maximum_units FROM instructor_criterion_versions c JOIN instructor_rubric_versions r ON r.id=c.rubric_version_id JOIN instructor_question_versions q ON q.id=r.question_version_id WHERE q.publication_id=? ORDER BY q.position,c.position',
      )
      .bind(version)
      .all<{
        rubric_version_id: string;
        criterion_id: string;
        comparison_key: string;
        descriptor: string;
        minimum_units: number;
        maximum_units: number;
      }>();
    // Title belongs to the immutable publication, not the mutable draft.
    const header = { title: r.title, deadline_at: r.deadline_at };
    assert(header, '$', 'missing_header');
    const publication = publicationSchema.parse({
      schemaVersion: 1,
      assignmentId: r.assignment_id,
      assignmentVersionId: r.id,
      courseId: r.course_id,
      title: header.title,
      publishedAt: r.published_at,
      deadlineAt: header.deadline_at,
      questions: q.results.map((v) => ({
        questionId: v.question_id,
        questionVersionId: v.id,
        title: v.title,
        instructions: v.instructions,
        language: v.language,
        starterCode: v.starter_code,
        rubricId: v.rubric_id,
        rubricVersionId: v.rubric_version_id,
        criteria: c.results
          .filter((x) => x.rubric_version_id === v.rubric_version_id)
          .map((x) => ({
            criterionId: x.criterion_id,
            comparisonKey: x.comparison_key,
            descriptor: x.descriptor,
            minimumScore: x.minimum_units / 100,
            maximumScore: x.maximum_units / 100,
          })),
      })),
    });
    return {
      publication,
      root: r,
      privateReferences: privateRead
        ? q.results.map((v) => ({
            questionVersionId: v.id,
            source: v.private_reference!,
          }))
        : [],
    };
  }
  async publicVersion(version: string, course: string) {
    return (await this.read(version, course, false)).publication;
  }
  async privateVersion(version: string, course: string) {
    const v = await this.read(version, course, true);
    return {
      ...this.summaryOf(v.root),
      publication: v.publication,
      privateReferences: v.privateReferences,
    };
  }
}
