import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../ui/brand';
import type { Attempt } from '../../shared/instructor-contracts/submission';
import type { Publication } from '../../shared/instructor-contracts/publication';
import type { AttemptHistory } from '../../shared/student-work';
import { highlightPython } from '../instructor/assignments/python-highlight';
import { Action } from '../ui/primitives';
import { formatDeadline } from './model';
import { ApiError, type WorkApi } from './work-model';
import { AttemptFeedback } from './Feedback';

type Load<T> =
  | { p: 'loading' }
  | { p: 'ready'; data: T }
  | { p: 'failed'; kind: 'session' | 'unavailable' | 'network' };
const kindOf = (e: unknown): 'session' | 'unavailable' | 'network' =>
  e instanceof ApiError && (e.kind === 'session' || e.kind === 'unavailable')
    ? e.kind
    : 'network';
const failureText = {
  session: 'Your session has ended. Sign in again to continue.',
  unavailable: 'This is not available to you.',
  network: 'This could not be loaded. Check your connection and try again.',
};

/*
 * SW-08, SF-07, SQ-02/03/04/06, UI-04/05: the workbook's historical answer views. One attempt
 * context (history, selection, pinned publication, chosen release version) serves the per-question
 * Submitted attempt and Released feedback panels; AttemptView is the read-only all-question
 * Attempt summary at the end of historical navigation. Nothing here touches the working copy.
 */

type PublicationQuestion = Publication['questions'][number];
type HistoryItem = AttemptHistory['items'][number];

/** An attempt together with the publication it is pinned to (never the working copy's or a newer one). */
export type LoadedAttempt = { attempt: Attempt; pub: Publication };

/**
 * Reads one attempt and its own pinned publication. A publication that cannot be read is a
 * failure: titles and question order must never fall back to the current version.
 */
async function loadAttempt(
  api: WorkApi,
  attemptId: string,
  current: Publication,
): Promise<LoadedAttempt> {
  const attempt = await api.attempt(attemptId);
  const pub =
    attempt.assignmentVersionId === current.assignmentVersionId
      ? current
      : await api.publication(attempt.assignmentVersionId);
  if (pub.assignmentVersionId !== attempt.assignmentVersionId)
    throw new ApiError('unavailable');
  return { attempt, pub };
}

export type AttemptContext = {
  list: Load<AttemptHistory>;
  /** Loaded history pages, newest first. */
  items: HistoryItem[];
  more: {
    cursor: string | null;
    pending: boolean;
    error: boolean;
    load: () => void;
  };
  /** The chosen attempt, or by default the latest one; null when there is none (yet). */
  selectedId: string | null;
  select: (attemptId: string | null) => void;
  /** State of the selected attempt; null while there is nothing selected. */
  attempt: Load<LoadedAttempt> | null;
  /** The selected attempt's own pinned publication once it has loaded. */
  pub: Publication | null;
  /** True while the selected attempt (or the history that picks it) is loading. */
  pending: boolean;
  retryList: () => void;
  retryAttempt: () => void;
  /** SF-05 (modified): the release version chosen for the selected attempt, across questions. */
  release: { chosen: number | null; choose: (v: number | null) => void };
};

/**
 * SW-08, SF-07, SQ-02: the attempt selection shared by the Submitted attempt and Released
 * feedback views. History pages load only once the student opens a historical view; each
 * selection loads one attempt and its pinned publication, and an older response is ignored.
 */
export function useAttemptContext({
  api,
  versionId,
  publication,
  reloadKey,
  enabled,
  initial = null,
}: {
  api: WorkApi;
  versionId: string;
  publication: Publication;
  /** Changes after a successful submit so the list refetches. */
  reloadKey: number;
  enabled: boolean;
  /** SQ-05: an attempt ID from the address; only the server decides whether it is readable. */
  initial?: string | null;
}): AttemptContext {
  const [list, setList] = useState<Load<AttemptHistory>>({ p: 'loading' });
  const [extra, setExtra] = useState<HistoryItem[]>([]);
  const [paging, setPaging] = useState<{
    cursor: string | null;
    pending: boolean;
    error: boolean;
  }>({ cursor: null, pending: false, error: false });
  const [listRetry, setListRetry] = useState(0);
  const [chosen, setChosen] = useState<string | null>(initial);
  const [loaded, setLoaded] = useState<{
    id: string;
    load: Load<LoadedAttempt>;
  } | null>(null);
  const [attemptRetry, setAttemptRetry] = useState(0);
  // Keyed by attempt, so selecting another attempt starts from its default version.
  const [release, setRelease] = useState<{
    id: string;
    version: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setList({ p: 'loading' });
    setExtra([]);
    api
      .history(versionId, null)
      .then((data) => {
        if (!active) return;
        setList({ p: 'ready', data });
        setPaging({ cursor: data.nextCursor, pending: false, error: false });
      })
      .catch(
        (e: unknown) => active && setList({ p: 'failed', kind: kindOf(e) }),
      );
    return () => {
      active = false;
    };
  }, [api, versionId, reloadKey, listRetry, enabled]);

  const items = [...(list.p === 'ready' ? list.data.items : []), ...extra];
  const selectedId = chosen ?? items[0]?.attemptId ?? null;

  useEffect(() => {
    if (!enabled || !selectedId) return;
    let active = true;
    loadAttempt(api, selectedId, publication)
      .then(
        (data) =>
          active && setLoaded({ id: selectedId, load: { p: 'ready', data } }),
      )
      .catch(
        (e: unknown) =>
          active &&
          setLoaded({
            id: selectedId,
            load: { p: 'failed', kind: kindOf(e) },
          }),
      );
    return () => {
      active = false;
    };
  }, [api, enabled, selectedId, publication, attemptRetry]);

  // Derived, so a new selection is "loading" in the same render and never shows the old attempt.
  const attempt: Load<LoadedAttempt> | null = selectedId
    ? loaded?.id === selectedId
      ? loaded.load
      : { p: 'loading' }
    : null;

  const loadMore = useCallback(() => {
    if (!paging.cursor) return;
    setPaging((m) => ({ ...m, pending: true, error: false }));
    api
      .history(versionId, paging.cursor)
      .then((page) => {
        setExtra((e) => [...e, ...page.items]);
        setPaging({ cursor: page.nextCursor, pending: false, error: false });
      })
      .catch(() => setPaging((m) => ({ ...m, pending: false, error: true })));
  }, [api, versionId, paging.cursor]);

  const chooseRelease = useCallback(
    (v: number | null) =>
      setRelease(
        v === null || selectedId === null
          ? null
          : { id: selectedId, version: v },
      ),
    [selectedId],
  );

  return {
    list,
    items,
    more: { ...paging, load: loadMore },
    selectedId,
    select: setChosen,
    attempt,
    pub: attempt?.p === 'ready' ? attempt.data.pub : null,
    pending:
      enabled && (attempt ? attempt.p === 'loading' : list.p === 'loading'),
    retryList: () => setListRetry((n) => n + 1),
    retryAttempt: () => {
      setLoaded(null);
      setAttemptRetry((n) => n + 1);
    },
    release: {
      chosen: release && release.id === selectedId ? release.version : null,
      choose: chooseRelease,
    },
  };
}

function Failure({
  kind,
  onRetry,
}: {
  kind: 'session' | 'unavailable' | 'network';
  onRetry: () => void;
}) {
  return (
    <div className="cw-student-notice" role="alert">
      <p>{failureText[kind]}</p>
      {kind === 'network' && (
        <Action variant="secondary" onClick={onRetry}>
          <Icon name="refresh" /> Try again
        </Action>
      )}
      {kind === 'session' && <a href="/sign-in">Sign in</a>}
    </div>
  );
}

/** SQ-02: native attempt selector, newest first, with the text-only release marker. */
export function AttemptPicker({
  ctx,
  onReturn,
}: {
  ctx: AttemptContext;
  onReturn: () => void;
}) {
  const { list, items, more, selectedId } = ctx;
  if (selectedId === null) {
    if (list.p === 'loading')
      return <p role="status">Loading your submitted attempts…</p>;
    if (list.p === 'failed')
      return <Failure kind={list.kind} onRetry={ctx.retryList} />;
    return (
      <div className="cw-wb-attempts">
        <p>You have not submitted this assignment yet.</p>
        <Action variant="secondary" onClick={onReturn}>
          Back to working copy
        </Action>
      </div>
    );
  }
  const listed = items.some((i) => i.attemptId === selectedId);
  const loadedAttempt = ctx.attempt?.p === 'ready' ? ctx.attempt.data : null;
  return (
    <div className="cw-wb-attempts">
      <label className="cw-fb-version">
        <span>Attempt</span>
        <select value={selectedId} onChange={(e) => ctx.select(e.target.value)}>
          {!listed && (
            <option value={selectedId}>
              {loadedAttempt
                ? `Submitted ${formatDeadline(loadedAttempt.attempt.submittedAt)}`
                : 'Selected attempt'}
            </option>
          )}
          {items.map((item) => (
            <option key={item.attemptId} value={item.attemptId}>
              {`Submitted ${formatDeadline(item.submittedAt)}${
                item.feedbackReleased ? ' · Feedback released' : ''
              }`}
            </option>
          ))}
        </select>
      </label>
      {more.cursor && (
        <Action variant="secondary" pending={more.pending} onClick={more.load}>
          <Icon name="history" /> Show older attempts
        </Action>
      )}
      {more.error && (
        <p role="alert">Older attempts could not be loaded. Try again.</p>
      )}
      {list.p === 'failed' && (
        <Failure kind={list.kind} onRetry={ctx.retryList} />
      )}
    </div>
  );
}

function AttemptLoad({
  ctx,
  children,
}: {
  ctx: AttemptContext;
  children: (loaded: LoadedAttempt) => ReactNode;
}) {
  const a = ctx.attempt;
  if (!a) return null;
  if (a.p === 'loading') return <p role="status">Loading the attempt…</p>;
  if (a.p === 'failed')
    return <Failure kind={a.kind} onRetry={ctx.retryAttempt} />;
  return <>{children(a.data)}</>;
}

function AttemptMeta({ attempt }: { attempt: Attempt }) {
  return (
    <dl className="cw-student-meta">
      <div>
        <dt>Submitted (server time)</dt>
        <dd>
          <time dateTime={attempt.submittedAt}>
            {formatDeadline(attempt.submittedAt)}
          </time>
        </dd>
      </div>
      <div>
        <dt>Attempt ID</dt>
        <dd>{attempt.attemptId}</dd>
      </div>
      <div>
        <dt>Pinned version</dt>
        <dd>{attempt.assignmentVersionId}</dd>
      </div>
    </dl>
  );
}

/** SQ-03, SW-08, UI-04: the selected attempt's source for the current question, read only. */
export function SubmittedPanel({
  ctx,
  question,
  position,
  onReturn,
}: {
  ctx: AttemptContext;
  question: PublicationQuestion;
  position: number;
  onReturn: () => void;
}) {
  return (
    <div className="cw-wb-attempt">
      <AttemptPicker ctx={ctx} onReturn={onReturn} />
      <AttemptLoad ctx={ctx}>
        {({ attempt }) => {
          const answer = attempt.answers.find(
            (a) => a.questionVersionId === question.questionVersionId,
          );
          return (
            <>
              <h3 tabIndex={-1}>Submitted attempt (read only)</h3>
              <AttemptMeta attempt={attempt} />
              <p className="cw-student-readonly">
                This snapshot cannot be edited. Your working copy is unchanged.
              </p>
              {answer ? (
                <pre
                  className="cw-student-source cw-wb-attempt-source"
                  tabIndex={0}
                  role="region"
                  aria-label={`Submitted source for question ${position}`}
                >
                  <code
                    dangerouslySetInnerHTML={{
                      __html: highlightPython(answer.source),
                    }}
                  />
                </pre>
              ) : (
                <p>
                  No answer was submitted for this question in this attempt.
                </p>
              )}
            </>
          );
        }}
      </AttemptLoad>
    </div>
  );
}

/** SQ-04, SF-03/04/05/06: released feedback for the selected attempt and the current question. */
export function FeedbackPanel({
  api,
  ctx,
  question,
  onReturn,
}: {
  api: WorkApi;
  ctx: AttemptContext;
  question: PublicationQuestion;
  onReturn: () => void;
}) {
  return (
    <div className="cw-wb-attempt">
      <AttemptPicker ctx={ctx} onReturn={onReturn} />
      <AttemptLoad ctx={ctx}>
        {({ attempt, pub }) => (
          <AttemptFeedback
            api={api}
            attempt={attempt}
            pub={pub}
            questionVersionId={question.questionVersionId}
            version={ctx.release}
          />
        )}
      </AttemptLoad>
    </div>
  );
}

/**
 * SW-08, SQ-06: the read-only all-question summary of one attempt, shown from the last question
 * of a historical view. It never offers submission or Review and never touches the working copy.
 */
export function AttemptView({
  api,
  attemptId,
  current,
  onBack,
  backLabel = 'Back to submitted attempts',
}: {
  api: WorkApi;
  attemptId: string;
  current: Publication;
  onBack: () => void;
  backLabel?: string;
}) {
  const [state, setState] = useState<Load<LoadedAttempt>>({ p: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ p: 'loading' });
    loadAttempt(api, attemptId, current)
      .then((data) => active && setState({ p: 'ready', data }))
      .catch(
        (e: unknown) => active && setState({ p: 'failed', kind: kindOf(e) }),
      );
    return () => {
      active = false;
    };
  }, [api, attemptId, current, retry]);

  return (
    <article className="cw-wb-attempt" aria-label="Submitted attempt">
      <Action variant="secondary" onClick={onBack}>
        {backLabel}
      </Action>
      {state.p === 'loading' && <p role="status">Loading the attempt…</p>}
      {state.p === 'failed' && (
        <Failure kind={state.kind} onRetry={() => setRetry((n) => n + 1)} />
      )}
      {state.p === 'ready' && (
        <>
          <h3 tabIndex={-1}>Submitted attempt (read only)</h3>
          <AttemptMeta attempt={state.data.attempt} />
          <p className="cw-student-readonly">
            This snapshot cannot be edited. Your working copy is unchanged.
          </p>
          <AttemptFeedback
            api={api}
            attempt={state.data.attempt}
            pub={state.data.pub}
          />
        </>
      )}
    </article>
  );
}
