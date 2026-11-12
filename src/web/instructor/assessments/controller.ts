import { BoundaryError } from '../../../shared/instructor-contracts/schema';
import type { DraftFeedback } from '../../../shared/instructor-contracts/assessment';
import type { AssessmentClient, Workspace } from './client';
import type { AssessmentDraft } from '../../../shared/instructor-contracts/ai';
export type AssessmentState = {
  view: Workspace | null;
  feedback: DraftFeedback | null;
  dirty: boolean;
  busy: string | null;
  message: string;
  selectedRevision: string | null;
  aiPending: boolean;
  candidate: {
    candidateId: string;
    payload: AssessmentDraft;
    revisionId: string;
  } | null;
};
export class AssessmentController {
  state: AssessmentState = {
    view: null,
    feedback: null,
    dirty: false,
    busy: null,
    message: '',
    selectedRevision: null,
    aiPending: false,
    candidate: null,
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
    return e instanceof Error && e.message === 'AI_PENDING'
      ? 'The AI request is still processing. Resume or check it, or continue manually.'
      : e instanceof Error && e.message === 'AI_FAILED'
        ? 'AI drafting failed or expired. You can retry or continue manually.'
        : e instanceof BoundaryError && e.code === 'RATE_LIMITED'
          ? 'Another AI draft may still be processing. Resume or check its status.'
          : e instanceof BoundaryError && e.code === 'REVISION_CONFLICT'
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
  private forgetAIKeys(view: Workspace) {
    for (const include of [false, true]) {
      const fingerprint = JSON.stringify([
        'ai',
        view.head.id,
        view.head.headRevisionId,
        include,
      ]);
      this.keys.delete(fingerprint);
      try {
        globalThis.sessionStorage?.removeItem('cw-ai-request:' + fingerprint);
      } catch {
        /* storage may be unavailable */
      }
    }
  }
  async open(id: string, revision?: string, cursor?: string) {
    const epoch = ++this.epoch;
    this.update({
      view: null,
      feedback: null,
      dirty: false,
      selectedRevision: revision ?? null,
      aiPending: false,
      candidate: null,
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
      if (!revision && this.api.recoverAI) {
        try {
          const candidate = await this.api.recoverAI(id);
          if (epoch === this.epoch) this.forgetAIKeys(v);
          if (
            epoch === this.epoch &&
            candidate &&
            this.state.view?.head.headRevisionId === v.head.headRevisionId
          )
            this.update({
              candidate: { ...candidate, revisionId: v.head.headRevisionId },
            });
        } catch (error) {
          const terminal =
            error instanceof Error && error.message === 'AI_FAILED';
          const disabled =
            error instanceof BoundaryError && error.code === 'AI_DISABLED';
          if (epoch === this.epoch) {
            if (terminal) this.forgetAIKeys(v);
            this.update({
              aiPending: !terminal && !disabled,
              message: disabled
                ? 'AI drafting is unavailable. You can continue manually.'
                : terminal ||
                    (error instanceof Error && error.message === 'AI_PENDING')
                  ? this.error(error)
                  : 'Could not check the AI request. Check its status or continue manually.',
            });
          }
        }
      }
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
  async generateAI(includePrivateReferences: boolean) {
    const { view, busy, dirty, selectedRevision } = this.state;
    if (
      !view ||
      busy ||
      dirty ||
      selectedRevision ||
      this.state.aiPending ||
      !this.api.generateAI
    )
      return;
    const epoch = this.epoch,
      revisionId = view.head.headRevisionId;
    const fingerprint = JSON.stringify([
      'ai',
      view.head.id,
      revisionId,
      includePrivateReferences,
    ]);
    const storageKey = 'cw-ai-request:' + fingerprint;
    let persisted: string | null = null;
    try {
      persisted = globalThis.sessionStorage?.getItem(storageKey) ?? null;
    } catch {
      /* storage may be unavailable */
    }
    const key = this.keys.get(fingerprint) ?? persisted ?? crypto.randomUUID();
    this.keys.set(fingerprint, key);
    try {
      globalThis.sessionStorage?.setItem(storageKey, key);
    } catch {
      /* retry remains available in this page */
    }
    this.update({ busy: 'Generating AI draft', message: '', candidate: null });
    try {
      const result = await this.api.generateAI(
        view.head.id,
        revisionId,
        key,
        includePrivateReferences,
      );
      if (epoch !== this.epoch) return;
      this.keys.delete(fingerprint);
      try {
        globalThis.sessionStorage?.removeItem(storageKey);
      } catch {
        /* no persistent key */
      }
      this.update({
        candidate: { ...result, revisionId },
        message:
          'AI draft ready for review. Nothing has been approved or released.',
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'AI_FAILED') {
        this.keys.delete(fingerprint);
        try {
          globalThis.sessionStorage?.removeItem(storageKey);
        } catch {
          /* no persistent key */
        }
      }
      if (epoch === this.epoch)
        this.update({
          aiPending:
            !(e instanceof Error && e.message === 'AI_FAILED') &&
            !(e instanceof BoundaryError && e.code === 'AI_DISABLED'),
          message:
            e instanceof BoundaryError && e.code === 'AI_DISABLED'
              ? 'AI drafting is unavailable. You can continue manually.'
              : this.error(e),
        });
    } finally {
      if (epoch === this.epoch) this.update({ busy: null });
    }
  }
  async checkAI() {
    const { view, busy, selectedRevision } = this.state;
    if (!view || busy || selectedRevision || !this.api.recoverAI) return;
    const epoch = this.epoch;
    this.update({ busy: 'Checking AI draft', message: '' });
    try {
      const candidate = await (this.api.resumeAI ?? this.api.recoverAI)(
        view.head.id,
      );
      if (epoch !== this.epoch) return;
      this.forgetAIKeys(view);
      this.update({
        aiPending: false,
        candidate: candidate
          ? { ...candidate, revisionId: view.head.headRevisionId }
          : null,
        message: candidate
          ? 'AI draft ready for review. Nothing has been approved or released.'
          : 'No AI draft is available. You can continue manually.',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_FAILED')
        this.forgetAIKeys(view);
      if (epoch === this.epoch)
        this.update({
          aiPending:
            !(error instanceof Error && error.message === 'AI_FAILED') &&
            !(error instanceof BoundaryError && error.code === 'AI_DISABLED'),
          message:
            error instanceof Error &&
            ['AI_PENDING', 'AI_FAILED'].includes(error.message)
              ? this.error(error)
              : 'Could not check the AI request. Check its status or continue manually.',
        });
    } finally {
      if (epoch === this.epoch) this.update({ busy: null });
    }
  }
  async adoptAI() {
    const { view, busy, dirty, candidate, selectedRevision } = this.state;
    if (
      !view ||
      busy ||
      dirty ||
      selectedRevision ||
      !candidate ||
      !this.api.adoptAI ||
      candidate.revisionId !== view.head.headRevisionId
    )
      return;
    const epoch = this.epoch,
      edits = this.edits;
    this.update({ busy: 'Adopting AI draft', message: '' });
    try {
      const v = await this.api.adoptAI(
        view.head.id,
        candidate.revisionId,
        candidate.candidateId,
      );
      if (epoch !== this.epoch) return;
      this.update({
        view: v,
        candidate: null,
        ...(edits === this.edits
          ? { feedback: structuredClone(v.revision.feedback), dirty: false }
          : {}),
        message:
          edits === this.edits
            ? 'AI draft adopted. Review before approval.'
            : 'AI draft adopted. Your newer edits remain unsaved.',
      });
    } catch (e) {
      if (epoch === this.epoch) this.update({ message: this.error(e) });
    } finally {
      if (epoch === this.epoch) this.update({ busy: null });
    }
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
        ...(this.state.candidate &&
        this.state.candidate.revisionId !== v.head.headRevisionId
          ? { candidate: null }
          : {}),
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
