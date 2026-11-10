import { useEffect, useState } from 'react';
import type { Attempt } from '../../shared/instructor-contracts/submission';
import type { Publication } from '../../shared/instructor-contracts/publication';
import type { AttemptHistory } from '../../shared/student-work';
import { highlightPython } from '../instructor/assignments/python-highlight';
import { Action } from '../ui/primitives';
import { formatDeadline } from './model';
import { ApiError, shortHash, type WorkApi } from './work-model';

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

/** SW-08, UI-04: honest history and a read-only submitted attempt. Never touches the working copy. */
export function AttemptsPanel({
  api,
  versionId,
  publication,
  reloadKey,
  openId,
  onOpen,
}: {
  api: WorkApi;
  versionId: string;
  publication: Publication;
  /** Changes after a successful submit so the list refetches. */
  reloadKey: number;
  openId: string | null;
  onOpen: (attemptId: string | null) => void;
}) {
  const [list, setList] = useState<Load<AttemptHistory>>({ p: 'loading' });
  const [extra, setExtra] = useState<AttemptHistory['items']>([]);
  const [more, setMore] = useState<{
    cursor: string | null;
    pending: boolean;
    error: boolean;
  }>({ cursor: null, pending: false, error: false });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setList({ p: 'loading' });
    setExtra([]);
    api
      .history(versionId, null)
      .then((data) => {
        if (!active) return;
        setList({ p: 'ready', data });
        setMore({ cursor: data.nextCursor, pending: false, error: false });
      })
      .catch(
        (e: unknown) => active && setList({ p: 'failed', kind: kindOf(e) }),
      );
    return () => {
      active = false;
    };
  }, [api, versionId, reloadKey, retry]);

  if (openId)
    return (
      <AttemptView
        api={api}
        attemptId={openId}
        current={publication}
        onBack={() => onOpen(null)}
      />
    );

  if (list.p === 'loading')
    return <p role="status">Loading your submitted attempts…</p>;
  if (list.p === 'failed')
    return (
      <div className="cw-student-notice" role="alert">
        <p>{failureText[list.kind]}</p>
        {list.kind === 'network' && (
          <Action variant="secondary" onClick={() => setRetry((n) => n + 1)}>
            Try again
          </Action>
        )}
        {list.kind === 'session' && <a href="/sign-in">Sign in</a>}
      </div>
    );
  const items = [...list.data.items, ...extra];
  return (
    <div className="cw-wb-attempts">
      <h3>Submitted attempts</h3>
      {items.length === 0 ? (
        <p>You have not submitted this assignment yet.</p>
      ) : (
        <ol className="cw-wb-attempt-list">
          {items.map((item, index) => (
            <li key={item.attemptId}>
              <p>
                <strong>
                  Attempt {items.length - index}
                  {index === 0 ? ' (latest)' : ''}
                </strong>{' '}
                submitted{' '}
                <time dateTime={item.submittedAt}>
                  {formatDeadline(item.submittedAt)}
                </time>
                , {item.answerCount} answer{item.answerCount === 1 ? '' : 's'}.
              </p>
              <Action
                variant="secondary"
                onClick={() => onOpen(item.attemptId)}
                aria-label={`Open attempt submitted ${formatDeadline(item.submittedAt)}`}
              >
                Open attempt
              </Action>
            </li>
          ))}
        </ol>
      )}
      {more.cursor && (
        <Action
          variant="secondary"
          pending={more.pending}
          onClick={() => {
            setMore((m) => ({ ...m, pending: true, error: false }));
            api
              .history(versionId, more.cursor)
              .then((page) => {
                setExtra((e) => [...e, ...page.items]);
                setMore({
                  cursor: page.nextCursor,
                  pending: false,
                  error: false,
                });
              })
              .catch(() =>
                setMore((m) => ({ ...m, pending: false, error: true })),
              );
          }}
        >
          Show older attempts
        </Action>
      )}
      {more.error && (
        <p role="alert">Older attempts could not be loaded. Try again.</p>
      )}
    </div>
  );
}

function AttemptView({
  api,
  attemptId,
  current,
  onBack,
}: {
  api: WorkApi;
  attemptId: string;
  current: Publication;
  onBack: () => void;
}) {
  const [state, setState] = useState<
    Load<{ attempt: Attempt; pub: Publication | null }>
  >({ p: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ p: 'loading' });
    (async () => {
      const attempt = await api.attempt(attemptId);
      // Titles come from the attempt's own pinned version, never the current one.
      let pub: Publication | null =
        attempt.assignmentVersionId === current.assignmentVersionId
          ? current
          : null;
      if (!pub)
        try {
          pub = await api.publication(attempt.assignmentVersionId);
        } catch {
          pub = null;
        }
      if (active) setState({ p: 'ready', data: { attempt, pub } });
    })().catch(
      (e: unknown) => active && setState({ p: 'failed', kind: kindOf(e) }),
    );
    return () => {
      active = false;
    };
  }, [api, attemptId, current, retry]);

  return (
    <article className="cw-wb-attempt" aria-label="Submitted attempt">
      <Action variant="secondary" onClick={onBack}>
        Back to submitted attempts
      </Action>
      {state.p === 'loading' && <p role="status">Loading the attempt…</p>}
      {state.p === 'failed' && (
        <div className="cw-student-notice" role="alert">
          <p>{failureText[state.kind]}</p>
          {state.kind === 'network' && (
            <Action variant="secondary" onClick={() => setRetry((n) => n + 1)}>
              Try again
            </Action>
          )}
        </div>
      )}
      {state.p === 'ready' && (
        <>
          <h3 tabIndex={-1}>Submitted attempt (read only)</h3>
          <dl className="cw-student-meta">
            <div>
              <dt>Submitted (server time)</dt>
              <dd>
                <time dateTime={state.data.attempt.submittedAt}>
                  {formatDeadline(state.data.attempt.submittedAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt>Attempt ID</dt>
              <dd>{state.data.attempt.attemptId}</dd>
            </div>
            <div>
              <dt>Pinned version</dt>
              <dd>{state.data.attempt.assignmentVersionId}</dd>
            </div>
          </dl>
          <p className="cw-student-readonly">
            This snapshot cannot be edited. Your working copy is unchanged.
          </p>
          {state.data.attempt.answers.map((answer, index) => {
            const q = state.data.pub?.questions.find(
              (x) => x.questionVersionId === answer.questionVersionId,
            );
            const n = state.data.pub
              ? state.data.pub.questions.indexOf(q!) + 1
              : index + 1;
            return (
              <section key={answer.submittedAnswerId}>
                <h4>
                  Question {n > 0 ? n : index + 1}
                  {q ? `: ${q.title}` : ''}
                </h4>
                <pre
                  className="cw-student-source cw-wb-attempt-source"
                  tabIndex={0}
                  role="region"
                  aria-label={`Submitted source for question ${n > 0 ? n : index + 1}`}
                >
                  <code
                    dangerouslySetInnerHTML={{
                      __html: highlightPython(answer.source),
                    }}
                  />
                </pre>
                <p className="cw-student-meta">
                  Revision {answer.draftRevision}, hash{' '}
                  {shortHash(answer.sourceHash)}
                </p>
              </section>
            );
          })}
        </>
      )}
    </article>
  );
}
