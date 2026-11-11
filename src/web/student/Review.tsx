import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Publication } from '../../shared/instructor-contracts/publication';
import type { SubmitResponse } from '../../shared/student-work';
import { Action } from '../ui/primitives';
import { formatDeadline } from './model';
import {
  ApiError,
  newIdempotencyKey,
  shortHash,
  type DraftController,
  type SubmitAnswer,
  type WorkApi,
} from './work-model';

export type RowState =
  | 'ready' // acknowledged and displayed
  | 'starter' // untouched starter at revision 0: saved first on submit
  | 'unsaved'
  | 'saving'
  | 'failed'
  | 'conflict';
export type ReviewRow = {
  position: number;
  questionVersionId: string;
  title: string;
  state: RowState;
  revision: number;
  hash: string;
  blank: boolean;
};

/** One row per question in published order. Only acknowledged revisions are ever submitted. */
export function reviewRows(
  pub: Publication,
  ctl: DraftController,
): ReviewRow[] {
  return pub.questions.map((q, index) => {
    const it = ctl.get(q.questionVersionId);
    const state: RowState = !it
      ? 'failed'
      : it.status === 'conflict'
        ? 'conflict'
        : it.status === 'failed'
          ? 'failed'
          : it.status === 'saving'
            ? 'saving'
            : it.source !== it.ackSource
              ? 'unsaved'
              : it.baseRevision === 0
                ? 'starter'
                : 'ready';
    return {
      position: index + 1,
      questionVersionId: q.questionVersionId,
      title: q.title,
      state,
      revision: it?.baseRevision ?? 0,
      hash: it?.ackHash ?? '',
      blank: !!it && it.source.trim() === '',
    };
  });
}

const STATE_TEXT: Record<RowState, string> = {
  ready: 'Saved',
  starter: 'Not saved yet (starter code). It will be saved when you submit.',
  unsaved: 'Unsaved changes. They will be saved before you submit.',
  saving: 'Saving…',
  failed: 'Not saved. Retry or fix this before submitting.',
  conflict: 'Conflict. Choose a version on this question before submitting.',
};

type Submit =
  | { phase: 'idle' }
  | { phase: 'confirm' }
  | { phase: 'pending' }
  | { phase: 'success'; response: SubmitResponse }
  | {
      phase:
        | 'error'
        | 'reconcile'
        | 'stale'
        | 'deadline'
        | 'blocked'
        | 'session'
        | 'denied';
      message: string;
    };

/**
 * SW-05–SW-07, UI-05/08. Review lists exact acknowledged revisions; the confirmation is a
 * separate step; nothing is submitted by navigation. One submit at a time. The idempotency key
 * is created at confirmation and reused for a retry of the same answers.
 */
export function Review({
  api,
  pub,
  ctl,
  deadlinePassed,
  stale,
  onGoto,
  onSubmitted,
  onMove,
  onRefresh,
  onSession,
  onViewAttempt,
}: {
  api: WorkApi;
  pub: Publication;
  ctl: DraftController;
  deadlinePassed: boolean;
  stale: boolean;
  onGoto: (position: number) => void;
  onSubmitted: (response: SubmitResponse) => void;
  onMove: () => void;
  /** Refetches the caller's drafts and reconciles them into the controller. */
  onRefresh: () => Promise<void>;
  onSession: () => void;
  onViewAttempt: (attemptId: string) => void;
}) {
  useSyncExternalStore(ctl.subscribe, ctl.getVersion);
  const [submit, setSubmit] = useState<Submit>({ phase: 'idle' });
  const busy = useRef(false);
  const key = useRef<{ fingerprint: string; value: string } | null>(null);
  const shown = useRef<ReviewRow[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const done = submit.phase === 'success';
  useEffect(() => {
    heading.current?.focus();
  }, [done]);
  const rows = reviewRows(pub, ctl);
  const blockers = rows.filter(
    (r) => r.state === 'failed' || r.state === 'conflict',
  );
  const disabledReason = deadlinePassed
    ? 'The deadline has passed, so this assignment can no longer be submitted. You can keep editing your working copy.'
    : stale
      ? 'A newer version of this assignment has been published. Move your work to the newer version to submit.'
      : blockers.length
        ? 'Resolve the questions marked Not saved or Conflict first.'
        : '';

  const open = () => {
    shown.current = reviewRows(pub, ctl);
    setSubmit({ phase: 'confirm' });
  };

  const confirm = async () => {
    if (busy.current) return; // a pending action prevents a duplicate submit
    busy.current = true;
    setSubmit({ phase: 'pending' });
    try {
      // Untouched questions are still at revision 0 and the attempt needs revision >= 1.
      await ctl.flushAll(true);
      const now = reviewRows(pub, ctl);
      if (now.some((r) => r.state !== 'ready')) {
        setSubmit({
          phase: 'blocked',
          message:
            'Some answers could not be saved, so nothing was submitted. Fix them and try again.',
        });
        return;
      }
      const changed = shown.current.filter(
        (before) =>
          before.state === 'ready' &&
          now.find((r) => r.questionVersionId === before.questionVersionId)!
            .revision !== before.revision,
      );
      if (changed.length) {
        shown.current = now;
        setSubmit({
          phase: 'reconcile',
          message:
            'A saved revision changed while you were confirming. Nothing was submitted. Review the updated list.',
        });
        return;
      }
      const answers: SubmitAnswer[] = now.map((r) => ({
        questionVersionId: r.questionVersionId,
        draftRevision: r.revision,
        sourceHash: r.hash,
      }));
      const fingerprint = JSON.stringify(answers);
      // Same answers: the same key, so a lost response is answered by the original attempt.
      if (!key.current || key.current.fingerprint !== fingerprint)
        key.current = { fingerprint, value: newIdempotencyKey() };
      const response = await api.submit(
        pub.assignmentVersionId,
        key.current.value,
        answers,
      );
      key.current = null;
      setSubmit({ phase: 'success', response });
      onSubmitted(response);
    } catch (error) {
      const kind = error instanceof ApiError ? error.kind : 'network';
      if (kind === 'session') {
        onSession();
        setSubmit({
          phase: 'session',
          message: 'Your session has ended. Nothing was submitted.',
        });
      } else if (kind === 'unavailable')
        setSubmit({
          phase: 'denied',
          message:
            'This assignment is not available to you. Nothing was submitted.',
        });
      else if (kind === 'deadline')
        setSubmit({
          phase: 'deadline',
          message:
            'The deadline has passed. Nothing new was submitted. You can keep editing your working copy.',
        });
      else if (kind === 'stale')
        setSubmit({
          phase: 'stale',
          message:
            'A newer version of this assignment was published. Nothing was submitted. Move your work to the newer version.',
        });
      else if (kind === 'conflict' || kind === 'mismatch') {
        if (kind === 'mismatch') key.current = null;
        setSubmit({
          phase: 'reconcile',
          message:
            'A saved answer changed since you confirmed. Nothing was submitted. Reload your saved answers, check any conflicts, then submit again.',
        });
      } else if (kind === 'rate-limited')
        setSubmit({
          phase: 'error',
          message:
            'Too many submissions in the last minute. Nothing new was submitted. Wait a minute, then try again. Retrying sends the same submission, so it cannot create a second attempt by accident.',
        });
      else
        setSubmit({
          phase: 'error',
          message:
            'The submission could not be completed. Check your connection and try again. Retrying sends the same submission, so it cannot create a second attempt by accident.',
        });
    } finally {
      busy.current = false;
    }
  };

  if (submit.phase === 'success')
    return (
      <section aria-labelledby="cw-review-done" className="cw-wb-review">
        <h2 id="cw-review-done" tabIndex={-1} ref={heading}>
          Assignment submitted
        </h2>
        <p role="status">
          {submit.response.replayed
            ? 'This submission was already recorded; no new attempt was created.'
            : 'Your attempt was recorded.'}{' '}
          Server time{' '}
          <time dateTime={submit.response.submittedAt}>
            {formatDeadline(submit.response.submittedAt)}
          </time>
          . Attempt ID {submit.response.attemptId}.
        </p>
        <p>
          You can submit again before the deadline; earlier attempts are kept.
        </p>
        <div className="cw-wb-actions">
          <Action onClick={() => onViewAttempt(submit.response.attemptId)}>
            View submitted attempt
          </Action>
          <Action variant="secondary" onClick={() => onGoto(1)}>
            Keep editing
          </Action>
        </div>
      </section>
    );

  const problem =
    submit.phase === 'error' ||
    submit.phase === 'reconcile' ||
    submit.phase === 'stale' ||
    submit.phase === 'deadline' ||
    submit.phase === 'blocked' ||
    submit.phase === 'session' ||
    submit.phase === 'denied'
      ? submit
      : null;
  const confirming = submit.phase === 'confirm' || submit.phase === 'pending';
  const list = confirming ? shown.current : rows;

  return (
    <section aria-labelledby="cw-review-h" className="cw-wb-review">
      <h2 id="cw-review-h" tabIndex={-1} ref={heading}>
        Review assignment
      </h2>
      <p>Nothing is submitted until you confirm on the next step.</p>
      {disabledReason && (
        <p className="cw-student-notice" role="note">
          {disabledReason}
        </p>
      )}
      <ol className="cw-wb-review-list">
        {list.map((row) => (
          <li key={row.questionVersionId} data-state={row.state}>
            <h3>
              Question {row.position}: {row.title}
            </h3>
            <p>
              {row.state === 'ready' || row.state === 'unsaved'
                ? `Revision ${row.revision} acknowledged by the server. `
                : ''}
              {STATE_TEXT[row.state]}
              {row.blank && ' This answer is blank (missing).'}
            </p>
            <Action variant="secondary" onClick={() => onGoto(row.position)}>
              {row.state === 'conflict' || row.state === 'failed'
                ? `Fix question ${row.position}`
                : `Edit question ${row.position}`}
            </Action>
          </li>
        ))}
      </ol>

      {problem && (
        <div className="cw-student-notice" role="alert">
          <p>{problem.message}</p>
          <div className="cw-wb-actions">
            {problem.phase === 'error' && (
              <Action onClick={confirm}>Try again</Action>
            )}
            {problem.phase === 'reconcile' && (
              <Action
                onClick={async () => {
                  await onRefresh();
                  setSubmit({ phase: 'idle' });
                }}
              >
                Reload my saved answers
              </Action>
            )}
            {problem.phase === 'stale' && (
              <Action onClick={onMove}>
                Move my work to the newer version
              </Action>
            )}
            {problem.phase === 'session' && <a href="/sign-in">Sign in</a>}
          </div>
        </div>
      )}

      {confirming ? (
        <div
          className="cw-wb-confirm"
          role="group"
          aria-labelledby="cw-confirm-h"
        >
          <h3 id="cw-confirm-h">Confirm submission</h3>
          <p>This will snapshot these revisions as one new attempt:</p>
          <ul>
            {shown.current.map((row) => (
              <li key={row.questionVersionId}>
                Question {row.position}:{' '}
                {row.state === 'ready'
                  ? `revision ${row.revision} (hash ${shortHash(row.hash)})`
                  : row.state === 'starter' || row.state === 'unsaved'
                    ? 'saved first, then submitted as its next revision'
                    : 'cannot be submitted yet'}
                {row.blank && ', blank'}
              </li>
            ))}
          </ul>
          <div className="cw-wb-actions">
            <Action
              pending={submit.phase === 'pending'}
              disabled={!!disabledReason}
              onClick={confirm}
            >
              Confirm and submit
            </Action>
            <Action
              variant="secondary"
              disabled={submit.phase === 'pending'}
              onClick={() => setSubmit({ phase: 'idle' })}
            >
              Cancel
            </Action>
          </div>
          {submit.phase === 'pending' && (
            <p role="status">Submitting. Please wait…</p>
          )}
        </div>
      ) : (
        <div className="cw-wb-actions">
          <Action
            disabled={!!disabledReason}
            aria-describedby={disabledReason ? 'cw-submit-why' : undefined}
            onClick={open}
          >
            Submit assignment…
          </Action>
          <Action
            variant="secondary"
            onClick={() => onGoto(pub.questions.length)}
          >
            Back to questions
          </Action>
          {disabledReason && (
            <span id="cw-submit-why" className="cw-sr-only">
              {disabledReason}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
