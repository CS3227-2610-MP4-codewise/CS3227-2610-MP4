import {
  authoringSchema,
  type AssignmentClient,
  type AssignmentDraft,
  type Authoring,
  type PrivatePublication,
  type PublicationSummary,
} from '../../../shared/instructor-contracts/authoring';
import { projectPublication } from '../../../shared/instructor-contracts/publication';
import { ContractError } from '../../../shared/instructor-contracts/schema';
import { describeIssue } from './messages';
export type WorkspaceState = {
  draft: AssignmentDraft | null;
  payload: Authoring | null;
  dirty: boolean;
  pending: string | null;
  message: string;
  error: boolean;
  denied: boolean;
  index: number;
  review: boolean;
  history: PublicationSummary[];
  snapshot: PrivatePublication | null;
};
export function reorderQuestions<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length ||
    from === to
  )
    return [...items];
  const result = [...items];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}
export function errorMessage(error: unknown) {
  if (error instanceof ContractError)
    return error.issues.map(describeIssue).join(' ');
  return error instanceof Error
    ? error.message
    : 'The request failed. Your edits are retained; try again.';
}
export class AssignmentController {
  state: WorkspaceState = {
    draft: null,
    payload: null,
    dirty: false,
    pending: null,
    message: 'Open an assignment or create a draft.',
    error: false,
    denied: false,
    index: 0,
    review: false,
    history: [],
    snapshot: null,
  };
  private listeners = new Set<() => void>();
  private generation = 0;
  private sequence = 0;
  private publicationKey: string | null = null;
  private createKey: string | null = null;
  constructor(
    readonly client: AssignmentClient,
    readonly newKey = () => crypto.randomUUID(),
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  private update(value: Partial<WorkspaceState>) {
    this.state = { ...this.state, ...value };
    this.listeners.forEach((f) => f());
  }
  private failure(e: unknown) {
    const message = errorMessage(e);
    this.update({
      message,
      error: true,
      denied:
        this.state.denied ||
        /access|session|permission|unavailable in your course/i.test(message),
    });
  }
  edit(payload: Authoring) {
    if (
      ['Publishing', 'Opening', 'Creating'].includes(this.state.pending ?? '')
    )
      return;
    this.sequence++;
    this.publicationKey = null;
    this.update({
      payload,
      dirty: true,
      review: false,
      snapshot: null,
      message: 'Unsaved changes',
      error: false,
    });
  }
  question(index: number) {
    this.update({ index, review: false });
  }
  async open(id: string) {
    if (this.state.pending) return;
    const generation = ++this.generation;
    this.update({ pending: 'Opening', snapshot: null, review: false });
    try {
      const draft = await this.client.load(id);
      if (generation !== this.generation) return;
      this.sequence++;
      this.publicationKey = null;
      this.update({
        draft,
        payload: draft.payload,
        dirty: false,
        index: 0,
        history: [],
        denied: false,
        message: `Saved revision ${draft.revision}`,
        error: false,
      });
      await this.refreshHistory(generation);
    } catch (e) {
      if (generation === this.generation) this.failure(e);
    } finally {
      if (generation === this.generation) this.update({ pending: null });
    }
  }
  async create() {
    if (this.state.pending) return;
    const generation = ++this.generation;
    this.createKey ??= this.newKey();
    this.update({ pending: 'Creating' });
    try {
      const draft = await this.client.create(this.createKey);
      if (generation !== this.generation) return;
      this.sequence++;
      this.createKey = null;
      this.publicationKey = null;
      this.update({
        draft,
        payload: draft.payload,
        dirty: false,
        index: 0,
        history: [],
        snapshot: null,
        review: false,
        denied: false,
        message: `Draft created · saved revision ${draft.revision}`,
        error: false,
      });
      return draft;
    } catch (e) {
      if (generation === this.generation) this.failure(e);
    } finally {
      if (generation === this.generation) this.update({ pending: null });
    }
  }
  async save() {
    const { draft, payload } = this.state;
    if (!draft || !payload || this.state.pending) return;
    const generation = this.generation,
      sequence = this.sequence;
    this.update({ pending: 'Saving', message: 'Saving…', error: false });
    try {
      const acknowledged = await this.client.save(draft.assignmentId, {
        expectedRevision: draft.revision,
        payload: authoringSchema.parse(payload),
      });
      if (generation !== this.generation) return;
      // Advance the base revision without replacing edits made during the request.
      const unchanged = sequence === this.sequence;
      this.update({
        draft: acknowledged,
        ...(unchanged ? { payload: acknowledged.payload } : {}),
        dirty: !unchanged,
        message: unchanged
          ? `Saved revision ${acknowledged.revision}`
          : `Revision ${acknowledged.revision} saved; newer changes remain unsaved.`,
        error: false,
      });
    } catch (e) {
      if (generation === this.generation) this.failure(e);
    } finally {
      if (generation === this.generation) this.update({ pending: null });
    }
  }
  review() {
    const { draft, payload, dirty, pending } = this.state;
    if (!draft || !payload || pending) return;
    if (dirty) {
      this.update({
        message: 'Save your changes before reviewing publication.',
        error: true,
      });
      return;
    }
    try {
      projectPublication({
        schemaVersion: 1,
        state: 'published',
        assignmentId: draft.assignmentId,
        assignmentVersionId: 'validation',
        courseId: draft.courseId,
        publishedAt: new Date().toISOString(),
        ...payload,
        questions: payload.questions.map((q, i) => ({
          ...q,
          questionVersionId: `validation_q${i}`,
          rubricVersionId: `validation_r${i}`,
        })),
      });
      this.update({
        review: true,
        message: `Review saved revision ${draft.revision}. Confirm publication separately.`,
        error: false,
      });
    } catch (error) {
      this.update({
        review: false,
        message:
          error instanceof ContractError
            ? errorMessage(error)
            : 'Check the assignment details and questions before publishing.',
        error: true,
      });
    }
  }
  async publish() {
    const { draft, dirty, review } = this.state;
    if (!draft || dirty || !review || this.state.pending) return;
    const generation = this.generation;
    this.publicationKey ??= this.newKey();
    this.update({
      pending: 'Publishing',
      message: 'Publishing…',
      error: false,
    });
    try {
      const result = await this.client.publish(draft.assignmentId, {
        expectedRevision: draft.revision,
        idempotencyKey: this.publicationKey,
      });
      if (generation !== this.generation) return;
      this.update({
        review: false,
        message: `Published version ${result.publicationNumber} from saved revision ${result.sourceDraftRevision}.`,
        error: false,
      });
      try {
        await this.refreshHistory(generation);
      } catch {
        if (generation === this.generation)
          this.update({
            message: `Published version ${result.publicationNumber} from saved revision ${result.sourceDraftRevision}. History could not refresh; use Refresh versions to retry.`,
          });
      }
    } catch (e) {
      if (generation === this.generation) this.failure(e);
    } finally {
      if (generation === this.generation) this.update({ pending: null });
    }
  }
  private async refreshHistory(generation: number) {
    const id = this.state.draft?.assignmentId;
    if (!id) return;
    const history = await this.client.history(id);
    if (generation === this.generation) this.update({ history });
  }
  async retryHistory() {
    if (this.state.pending) return;
    this.update({ pending: 'Refreshing versions' });
    try {
      await this.refreshHistory(this.generation);
    } catch (e) {
      this.failure(e);
    } finally {
      this.update({ pending: null });
    }
  }
  async recoverAccess() {
    const { draft } = this.state;
    if (!draft || this.state.pending) return;
    this.update({ pending: 'Checking access' });
    try {
      await this.client.load(draft.assignmentId);
      this.update({
        denied: false,
        error: false,
        message: this.state.dirty
          ? 'Access restored. Unsaved edits are retained; save may still conflict.'
          : `Access restored. Saved base revision ${draft.revision}.`,
      });
    } catch (e) {
      this.failure(e);
    } finally {
      this.update({ pending: null });
    }
  }
  async historical(versionId: string) {
    if (this.state.pending) return;
    const generation = this.generation;
    this.update({ pending: 'Loading version' });
    try {
      const snapshot = await this.client.snapshot(versionId);
      if (generation === this.generation)
        this.update({
          snapshot,
          index: 0,
          review: false,
          message: `Published version ${snapshot.publicationNumber} · read only`,
          error: false,
        });
    } catch (e) {
      this.failure(e);
    } finally {
      this.update({ pending: null });
    }
  }
  returnToDraft() {
    this.update({
      snapshot: null,
      index: 0,
      message: this.state.dirty
        ? 'Unsaved changes'
        : `Saved revision ${this.state.draft?.revision}`,
    });
  }
}
export function singaporeInput(utc: string | null) {
  return utc
    ? new Date(Date.parse(utc) + 8 * 3600000).toISOString().slice(0, 16)
    : '';
}
export function singaporeUtc(local: string) {
  if (!local) return null;
  const date = new Date(local + '+08:00');
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
