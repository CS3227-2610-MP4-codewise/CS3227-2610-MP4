import type { IdentityCoursePort, TrustedPrincipal } from '../ports/contracts';
import {
  BoundaryError,
  id,
  schema,
  object,
  sourceHash,
  timestamp,
} from '../../../shared/instructor-contracts/schema';
import {
  createDraftSchema,
  saveDraftSchema,
  publishDraftSchema,
  type PublicationResult,
} from '../../../shared/instructor-contracts/authoring';
import {
  publicationSchema,
  projectPublication,
} from '../../../shared/instructor-contracts/publication';
import type { AssignmentRepository, SnapshotQuestion } from './repository';
export class AssignmentService {
  constructor(
    readonly repository: AssignmentRepository,
    readonly identity: IdentityCoursePort | undefined,
    readonly clock: () => Date = () => new Date(),
    readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}
  async session(request: Request): Promise<TrustedPrincipal> {
    if (!this.identity) throw new BoundaryError('UNAUTHENTICATED');
    return this.identity.requireSession(request);
  }
  private async course(request: Request, course: string, write: boolean) {
    const p = await this.session(request);
    await this.identity!.requireCourse(
      p,
      course,
      write ? 'instructor-write' : 'instructor-read',
    );
    if (write) await this.identity!.requireMutationOrigin(request);
    return p;
  }
  private async authorized(
    request: Request,
    target: string,
    write = false,
    publicRead = false,
  ) {
    const principal = await this.session(request);
    const scope = await this.identity!.requireObject(
      principal,
      { kind: 'assignment', id: target },
      write ? 'write' : 'read',
    );
    await this.identity!.requireCourse(
      principal,
      scope.courseId,
      publicRead
        ? 'student-read'
        : write
          ? 'instructor-write'
          : 'instructor-read',
    );
    if (write) await this.identity!.requireMutationOrigin(request);
    return { principal, courseId: scope.courseId };
  }
  async create(request: Request, raw: unknown) {
    await this.session(request);
    // Extract only public course control data before permission; draft validation follows.
    const target = schema((v) => {
      const o = object(v, ['courseId', 'requestKey']);
      return id(o.courseId, '$.courseId');
    }).parse(raw);
    const principal = await this.course(request, target, true),
      cmd = createDraftSchema.parse(raw);
    return this.repository.create(
      cmd.courseId,
      principal.userId,
      cmd.requestKey,
      this.nextId(),
      this.clock().toISOString(),
    );
  }
  async list(request: Request, course: string, cursor = '') {
    await this.course(request, id(course, '$.courseId'), false);
    if (cursor) id(cursor, '$.cursor');
    return this.repository.list(course, cursor);
  }
  async load(request: Request, assignmentId: string) {
    const scope = await this.authorized(
      request,
      id(assignmentId, '$.assignmentId'),
    );
    return this.repository.draft(assignmentId, scope.courseId);
  }
  async save(request: Request, assignmentId: string, raw: unknown) {
    const scope = await this.authorized(
        request,
        id(assignmentId, '$.assignmentId'),
        true,
      ),
      cmd = saveDraftSchema.parse(raw);
    return this.repository.save(
      assignmentId,
      scope.courseId,
      cmd.expectedRevision,
      cmd.payload,
      this.clock().toISOString(),
    );
  }
  private async result(
    versionId: string,
    course: string,
  ): Promise<PublicationResult> {
    return {
      ...(await this.repository.summary(versionId, course)),
      publication: await this.repository.publicVersion(versionId, course),
    };
  }
  async publish(
    request: Request,
    assignmentId: string,
    raw: unknown,
  ): Promise<PublicationResult> {
    const scope = await this.authorized(
        request,
        id(assignmentId, '$.assignmentId'),
        true,
      ),
      cmd = publishDraftSchema.parse(raw);
    const fingerprint = await sourceHash(
      JSON.stringify([
        scope.principal.userId,
        scope.courseId,
        assignmentId,
        cmd.expectedRevision,
      ]),
    );
    const replay = async () => {
      const found = await this.repository.receipt(
        assignmentId,
        scope.courseId,
        scope.principal.userId,
        cmd.idempotencyKey,
      );
      if (!found) return null;
      if (found.fingerprint !== fingerprint)
        throw new BoundaryError('IDEMPOTENCY_CONFLICT');
      return this.result(found.versionId, scope.courseId);
    };
    const previous = await replay();
    if (previous) return previous;
    const draft = await this.repository.draft(assignmentId, scope.courseId);
    if (draft.revision !== cmd.expectedRevision)
      throw new BoundaryError('REVISION_CONFLICT');
    const now = timestamp(this.clock().toISOString(), '$.publishedAt');
    const questions = draft.payload.questions.map((q) => ({
      ...q,
      questionVersionId: this.nextId(),
      rubricVersionId: this.nextId(),
    }));
    const publication = projectPublication({
      schemaVersion: 1,
      state: 'published',
      assignmentId,
      assignmentVersionId: this.nextId(),
      courseId: scope.courseId,
      title: draft.payload.title,
      publishedAt: now,
      deadlineAt: draft.payload.deadlineAt,
      questions,
    });
    publicationSchema.parse(publication);
    const snapshots: SnapshotQuestion[] = publication.questions.map((q, i) => ({
      ...q,
      privateReference: draft.payload.questions[i].privateReference,
    }));
    // Recheck current session/scope immediately before committing the snapshot.
    await this.authorized(request, assignmentId, true);
    try {
      await this.repository.publish({
        publication,
        questions: snapshots,
        actorId: scope.principal.userId,
        sourceRevision: cmd.expectedRevision,
        key: cmd.idempotencyKey,
        fingerprint,
      });
    } catch (e) {
      // A concurrent matching-key winner is reusable only after fresh authorization.
      await this.authorized(request, assignmentId, true);
      const winner = await replay();
      if (winner) return winner;
      throw e;
    }
    return this.result(publication.assignmentVersionId, scope.courseId);
  }
  async history(request: Request, assignmentId: string) {
    const scope = await this.authorized(
      request,
      id(assignmentId, '$.assignmentId'),
    );
    return this.repository.history(assignmentId, scope.courseId);
  }
  async privateVersion(request: Request, versionId: string) {
    const scope = await this.authorized(
      request,
      id(versionId, '$.assignmentVersionId'),
    );
    return this.repository.privateVersion(versionId, scope.courseId);
  }
  async publicVersion(request: Request, versionId: string) {
    const scope = await this.authorized(
      request,
      id(versionId, '$.assignmentVersionId'),
      false,
      true,
    );
    return this.repository.publicVersion(versionId, scope.courseId);
  }
}
