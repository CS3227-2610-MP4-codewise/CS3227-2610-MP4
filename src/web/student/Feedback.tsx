import { useEffect, useReducer, useState } from 'react';
import type { Attempt } from '../../shared/instructor-contracts/submission';
import type { Publication } from '../../shared/instructor-contracts/publication';
import type {
  Release,
  Withdrawn,
} from '../../shared/instructor-contracts/release';
import { highlightPython } from '../instructor/assignments/python-highlight';
import { Action } from '../ui/primitives';
import { formatDeadline } from './model';
import {
  feedbackReducer,
  matchAnnotations,
  sourceLines,
  type AnnotationMatch,
  type FeedbackPanelState,
  type MatchedAnnotation,
} from './feedback-model';
import { shortHash, type WorkApi } from './work-model';

type VersionView =
  | { p: 'idle' }
  | { p: 'loading' }
  | { p: 'ready'; value: Release | Withdrawn }
  | { p: 'failed'; state: FeedbackPanelState };

const versionLabel = {
  released: 'current',
  superseded: 'replaced',
  withdrawn: 'withdrawn',
} as const;

/**
 * SF-02–SF-06, SUB-04, UI-04/06/07/08 (design D5, D6): released feedback on the exact submitted
 * attempt. Fetched on every mount with no cache; the submitted source stays visible in every
 * state; annotations attach only to lines they match exactly in this attempt.
 */
export function AttemptFeedback({
  api,
  attempt,
  pub,
}: {
  api: WorkApi;
  attempt: Attempt;
  pub: Publication | null;
}) {
  const [state, dispatch] = useReducer(feedbackReducer, { kind: 'loading' });
  const [retry, setRetry] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [view, setView] = useState<VersionView>({ p: 'idle' });
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    dispatch({ type: 'load' });
    setChosen(null);
    setView({ p: 'idle' });
    setSelected(null);
    api
      .feedback(attempt.attemptId)
      .then((summary) => active && dispatch({ type: 'loaded', summary }))
      .catch((error: unknown) => active && dispatch({ type: 'failed', error }));
    return () => {
      active = false;
    };
  }, [api, attempt.attemptId, retry]);

  // The version to show: the chosen one, or by default the current release, or for a
  // withdrawn current the newest version's tombstone (SF-05).
  const summary =
    state.kind === 'released' || state.kind === 'withdrawn'
      ? state.summary
      : null;
  const shown =
    chosen ??
    (summary
      ? summary.state === 'released'
        ? summary.release.releaseVersion
        : summary.versions[0].releaseVersion
      : null);
  const inline =
    summary?.state === 'released' && shown === summary.release.releaseVersion
      ? summary.release
      : null;

  useEffect(() => {
    if (shown === null || inline) {
      setView({ p: 'idle' });
      return;
    }
    let active = true;
    setView({ p: 'loading' });
    api
      .feedbackVersion(attempt.attemptId, shown)
      .then((value) => active && setView({ p: 'ready', value }))
      .catch(
        (error: unknown) =>
          active &&
          setView({
            p: 'failed',
            state: feedbackReducer(
              { kind: 'loading' },
              { type: 'failed', error },
            ),
          }),
      );
    return () => {
      active = false;
    };
  }, [api, attempt.attemptId, shown, inline]);

  const displayed: Release | Withdrawn | null =
    inline ?? (view.p === 'ready' ? view.value : null);
  const release =
    displayed && displayed.state !== 'withdrawn' ? displayed : null;
  const match: AnnotationMatch | null = release
    ? matchAnnotations(release.annotations, attempt)
    : null;
  const selectedNote = match?.matched.find((m) => m.index === selected) ?? null;
  const failure =
    failureOf(state) ?? (view.p === 'failed' ? failureOf(view.state) : null);

  const criterionName = (questionVersionId: string, criterionId: string) =>
    pub?.questions
      .find((q) => q.questionVersionId === questionVersionId)
      ?.criteria.find((c) => c.criterionId === criterionId)?.descriptor ??
    criterionId;
  const describe = (m: MatchedAnnotation) =>
    `Observation ${m.marker}, ${lineRange(m.annotation)}, ${criterionName(m.annotation.questionVersionId, m.annotation.criterionId)}`;

  return (
    <>
      <section className="cw-fb" aria-labelledby="cw-fb-heading">
        <h4 id="cw-fb-heading">Released feedback</h4>
        {state.kind === 'loading' && (
          <p role="status">Loading released feedback…</p>
        )}
        {state.kind === 'none' && (
          <p>
            Feedback has not been released for this attempt yet. Your instructor
            releases feedback when it is ready.
          </p>
        )}
        {failure && (
          <FeedbackFailure
            kind={failure}
            onRetry={() => setRetry((n) => n + 1)}
          />
        )}
        {summary && !failure && (
          <>
            <label className="cw-fb-version">
              <span>Feedback version</span>
              <select
                value={String(shown)}
                onChange={(e) => {
                  setSelected(null);
                  setChosen(Number(e.target.value));
                }}
              >
                {summary.versions.map((v) => (
                  <option key={v.releaseVersion} value={v.releaseVersion}>
                    Version {v.releaseVersion} ({versionLabel[v.state]})
                  </option>
                ))}
              </select>
            </label>
            {view.p === 'loading' && (
              <p role="status">Loading feedback version {shown}…</p>
            )}
            {displayed && <VersionHeading value={displayed} />}
          </>
        )}
      </section>
      <p className="cw-sr-only" role="status" aria-live="polite">
        {selectedNote
          ? `${describe(selectedNote)} selected. ${selectedNote.annotation.explanation}`
          : ''}
      </p>
      {attempt.answers.map((answer, index) => {
        const q = pub?.questions.find(
          (x) => x.questionVersionId === answer.questionVersionId,
        );
        const n = pub && q ? pub.questions.indexOf(q) + 1 : index + 1;
        const notes =
          match?.matched.filter(
            (m) => m.annotation.submittedAnswerId === answer.submittedAnswerId,
          ) ?? [];
        const criteria =
          release?.criteria.filter(
            (c) => c.questionVersionId === answer.questionVersionId,
          ) ?? [];
        const here = selectedNote && notes.includes(selectedNote);
        return (
          <section key={answer.submittedAnswerId} className="cw-fb-question">
            <h4>
              Question {n}
              {q ? `: ${q.title}` : ''}
            </h4>
            {release && criteria.length > 0 && (
              <table className="cw-fb-criteria">
                <caption>Scores for question {n}</caption>
                <thead>
                  <tr>
                    <th scope="col">Criterion</th>
                    <th scope="col">Score</th>
                    <th scope="col">Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c) => (
                    <tr key={c.criterionId}>
                      <th scope="row">
                        {criterionName(c.questionVersionId, c.criterionId)}
                      </th>
                      <td>
                        Score: {c.score} / {c.maximumScore}
                      </td>
                      <td>{c.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {release ? (
              <AnnotatedSource
                n={n}
                source={answer.source}
                notes={notes}
                selected={selected}
                onSelect={setSelected}
                describe={describe}
              />
            ) : (
              <pre
                className="cw-student-source cw-wb-attempt-source"
                tabIndex={0}
                role="region"
                aria-label={`Submitted source for question ${n}`}
              >
                <code
                  dangerouslySetInnerHTML={{
                    __html: highlightPython(answer.source),
                  }}
                />
              </pre>
            )}
            <p className="cw-student-meta">
              Revision {answer.draftRevision}, hash{' '}
              {shortHash(answer.sourceHash)}
            </p>
            {notes.length > 0 && (
              <div className="cw-fb-observations">
                <h5>Observations for question {n}</h5>
                <ol>
                  {notes.map((m) => (
                    <li key={m.index}>
                      <button
                        type="button"
                        className="cw-fb-observation"
                        aria-pressed={selected === m.index}
                        onClick={() => setSelected(m.index)}
                      >
                        <span className="cw-sr-only">Observation </span>
                        <span className="cw-fb-letter">{m.marker}</span>,{' '}
                        {lineRange(m.annotation)}:{' '}
                        {criterionName(
                          m.annotation.questionVersionId,
                          m.annotation.criterionId,
                        )}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {here && selectedNote && (
              <div
                className="cw-fb-note"
                role="region"
                aria-label={`Observation ${selectedNote.marker}`}
              >
                <h5>
                  Observation {selectedNote.marker}:{' '}
                  {criterionName(
                    selectedNote.annotation.questionVersionId,
                    selectedNote.annotation.criterionId,
                  )}
                </h5>
                <p className="cw-fb-note-range">
                  {lineRange(selectedNote.annotation)}
                </p>
                <p>{selectedNote.annotation.explanation}</p>
              </div>
            )}
          </section>
        );
      })}
      {match && match.unavailable.length > 0 && (
        <section className="cw-fb-unavailable" aria-labelledby="cw-fb-unav">
          <h4 id="cw-fb-unav">
            Observations that could not be shown on source
          </h4>
          <p>
            These observations do not match the source of this attempt, so they
            are not attached to any line.
          </p>
          <ul>
            {match.unavailable.map(({ index, annotation }) => (
              <li key={index}>
                <strong>
                  {criterionName(
                    annotation.questionVersionId,
                    annotation.criterionId,
                  )}
                  :
                </strong>{' '}
                {annotation.explanation}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

type Failure = 'stale' | 'expired' | 'network' | 'unavailable';
function failureOf(s: FeedbackPanelState): Failure | null {
  return s.kind === 'stale' ||
    s.kind === 'expired' ||
    s.kind === 'network' ||
    s.kind === 'unavailable'
    ? s.kind
    : null;
}

function lineRange(a: { startLine: number; endLine: number }) {
  return a.startLine === a.endLine
    ? `line ${a.startLine}`
    : `lines ${a.startLine}–${a.endLine}`;
}

function VersionHeading({ value }: { value: Release | Withdrawn }) {
  if (value.state === 'withdrawn')
    return (
      <p className="cw-fb-tombstone">
        Feedback version {value.releaseVersion} was withdrawn on{' '}
        <time dateTime={value.withdrawnAt}>
          {formatDeadline(value.withdrawnAt)}
        </time>
        . Its scores and observations are no longer shown.
      </p>
    );
  return (
    <p className="cw-fb-status" data-state={value.state}>
      {value.state === 'released'
        ? 'Current feedback'
        : 'Replaced feedback (not current)'}
      , version {value.releaseVersion}, released{' '}
      <time dateTime={value.releasedAt}>
        {formatDeadline(value.releasedAt)}
      </time>
      .
    </p>
  );
}

function FeedbackFailure({
  kind,
  onRetry,
}: {
  kind: Failure;
  onRetry: () => void;
}) {
  return (
    <div className="cw-student-notice" role="alert">
      {kind === 'stale' && (
        <p>
          This feedback changed while it was loading. Load it again to see the
          current version.
        </p>
      )}
      {kind === 'expired' && (
        <p>Your session has ended. Sign in again to see feedback.</p>
      )}
      {kind === 'network' && (
        <p>
          Feedback could not be loaded. Check your connection and try again.
        </p>
      )}
      {kind === 'unavailable' && (
        <p>Feedback is not available right now. Try again later.</p>
      )}
      {(kind === 'stale' || kind === 'network') && (
        <Action variant="secondary" onClick={onRetry}>
          {kind === 'stale' ? 'Load feedback again' : 'Try again'}
        </Action>
      )}
      {kind === 'expired' && <a href="/sign-in">Sign in</a>}
    </div>
  );
}

function AnnotatedSource({
  n,
  source,
  notes,
  selected,
  onSelect,
  describe,
}: {
  n: number;
  source: string;
  notes: MatchedAnnotation[];
  selected: number | null;
  onSelect: (index: number) => void;
  describe: (m: MatchedAnnotation) => string;
}) {
  const active = notes.find((m) => m.index === selected);
  return (
    <div
      className="cw-fb-source"
      tabIndex={0}
      role="region"
      aria-label={`Submitted source for question ${n}`}
    >
      {sourceLines(source).map((line, i) => {
        const no = i + 1;
        const starts = notes.filter((m) => m.annotation.startLine === no);
        const annotated = notes.some(
          (m) => m.annotation.startLine <= no && no <= m.annotation.endLine,
        );
        const isSelected =
          !!active &&
          active.annotation.startLine <= no &&
          no <= active.annotation.endLine;
        return (
          <div
            key={no}
            className="cw-fb-line"
            data-annotated={annotated || undefined}
            data-selected={isSelected || undefined}
          >
            <span className="cw-fb-no">{no}</span>
            <span className="cw-fb-marks">
              {starts.map((m) => (
                <button
                  key={m.index}
                  type="button"
                  className="cw-fb-marker"
                  aria-pressed={selected === m.index}
                  aria-label={describe(m)}
                  onClick={() => onSelect(m.index)}
                >
                  {m.marker}
                </button>
              ))}
            </span>
            <code
              className="cw-fb-code"
              dangerouslySetInnerHTML={{
                __html: highlightPython(line) || ' ',
              }}
            />
            {isSelected && <span className="cw-sr-only"> (selected)</span>}
          </div>
        );
      })}
    </div>
  );
}
