import { BoundaryError } from '../../../shared/instructor-contracts/schema';
import type { DraftFeedback } from '../../../shared/instructor-contracts/assessment';
import type { AssessmentClient, Workspace } from './client';
export type AssessmentState = {
  view: Workspace | null;
  feedback: DraftFeedback | null;
  dirty: boolean;
  busy: string | null;
  message: string;
  selectedRevision: string | null;
};
export class AssessmentController {
  state: AssessmentState = {
    view: null,
    feedback: null,
    dirty: false,
    busy: null,
    message: '',
    selectedRevision: null,
  };
  private keys = new Map<string, string>();
  private epoch = 0;
  private edits = 0;
  private listeners = new Set<() => void>();
  constructor(readonly api: AssessmentClient) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.state;
  private update(p: Partial<AssessmentState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((fn) => fn());
  }
  private error(e: unknown) {
    return e instanceof BoundaryError && e.code === 'REVISION_CONFLICT'
      ? 'This assessment changed. Your edits are still here. Reload to compare.'
      : e instanceof BoundaryError && e.code === 'UNAUTHENTICATED'
        ? 'Session expired. Your unsaved edits are still here.'
        : e instanceof BoundaryError && e.code === 'FORBIDDEN'
          ? 'Access is no longer available.'
          : e instanceof BoundaryError && e.code === 'INVALID_CONTRACT'
            ? 'Check scores, explanations and source observations.'
            : e instanceof BoundaryError && e.code === 'STALE_EVIDENCE'
              ? 'Evidence changed or feedback was withdrawn. Reload before continuing.'
              : 'Could not complete the request. Retry when ready.';
  }
  async open(id: string, revision?: string, cursor?: string) {
    const epoch = ++this.epoch;
    this.update({
      view: null,
      feedback: null,
      dirty: false,
      selectedRevision: revision ?? null,
      busy: 'Loading',
      message: '',
    });
    try {
      const v = await this.api.load(id, revision, cursor);
      if (epoch !== this.epoch) return;
      this.edits = 0;
      this.update({
        view: v,
        feedback: structuredClone(v.revision.feedback),
        dirty: false,
        selectedRevision: revision ?? null,
      });
    } catch (e) {
      if (epoch === this.epoch) this.update({ message: this.error(e) });
    } finally {
      if (epoch === this.epoch) this.update({ busy: null });
    }
  }
  edit(feedback: DraftFeedback) {
    if (this.state.selectedRevision) return;
    this.edits++;
    this.update({ feedback, dirty: true, message: '' });
  }
  async save() {
    const { view, feedback, busy, dirty } = this.state;
    if (!view || !feedback || busy || !dirty || this.state.selectedRevision)
      return;
    const epoch = this.epoch,
      edits = this.edits;
    this.update({ busy: 'Saving', message: '' });
    try {
      const v = await this.api.save(
        view.head.id,
        view.head.headRevisionId,
        structuredClone(feedback),
      );
      if (epoch !== this.epoch) return;
      this.update({
        view: v,
        ...(edits === this.edits
          ? { feedback: structuredClone(v.revision.feedback), dirty: false }
          : {}),
        message:
          edits === this.edits
            ? 'Saved'
            : 'Earlier edits saved. Newer edits are unsaved.',
      });
    } catch (e) {
      if (epoch === this.epoch) this.update({ message: this.error(e) });
    } finally {
      if (epoch === this.epoch) this.update({ busy: null });
    }
  }
  async action(
    action: 'approve' | 'release' | 'withdraw' | 'correct',
    options: { version?: number; reason?: string } = {},
  ) {
    const { view, busy, dirty } = this.state;
    if (
      !view ||
      busy ||
      dirty ||
      (this.state.selectedRevision &&
        action !== 'correct' &&
        action !== 'withdraw')
    )
      return false;
    const epoch = this.epoch,
      edits = this.edits,
      head = view.head;
    this.update({
      busy:
        action === 'approve'
          ? 'Approving'
          : action === 'release'
            ? 'Releasing'
            : action === 'withdraw'
              ? 'Withdrawing'
              : 'Creating correction',
      message: '',
    });
    const fingerprint = JSON.stringify([
      action,
      head.id,
      head.headRevisionId,
      head.availabilityRevision,
      options,
    ]);
    let key = this.keys.get(fingerprint);
    if (!key) {
      key = crypto.randomUUID();
      this.keys.set(fingerprint, key);
    }
    const body =
      action === 'approve'
        ? {
            expectedRevisionId: head.headRevisionId,
            expectedAvailabilityRevision: head.availabilityRevision,
          }
        : action === 'correct'
          ? {
              expectedRevisionId: head.headRevisionId,
              sourceRevisionId: view.revision.id,
            }
          : action === 'release'
            ? {
                schemaVersion: 1,
                assessmentId: head.id,
                assessmentRevisionId: head.headRevisionId,
                expectedAvailabilityRevision: head.availabilityRevision,
                idempotencyKey: key,
              }
            : {
                schemaVersion: 1,
                assessmentId: head.id,
                releaseVersion: options.version,
                expectedAvailabilityRevision: head.availabilityRevision,
                idempotencyKey: key,
                reason: options.reason,
              };
    try {
      await this.api.action(head.id, action, body);
      const v = await this.api.load(head.id);
      if (epoch !== this.epoch) return false;
      this.update({
        view: v,
        selectedRevision: null,
        ...(edits === this.edits
          ? { feedback: structuredClone(v.revision.feedback), dirty: false }
          : {}),
        message:
          action === 'release'
            ? 'Feedback released'
            : action === 'withdraw'
              ? 'Feedback withdrawn'
              : action === 'approve'
                ? 'Revision approved'
                : 'Correction draft created',
      });
      return true;
    } catch (e) {
      if (epoch === this.epoch) this.update({ message: this.error(e) });
      return false;
    } finally {
      if (epoch === this.epoch) this.update({ busy: null });
    }
  }
  dispose() {
    this.epoch++;
    this.listeners.clear();
    this.keys.clear();
  }
}
