import { useEffect, useState, useSyncExternalStore, useRef } from 'react';
import {
  releaseSchema,
  withdrawnSchema,
  currentnessSchema,
  type Release,
  type Withdrawn,
} from '../../../shared/instructor-contracts/release';
import { object, assert } from '../../../shared/instructor-contracts/schema';
import type { DraftFeedback } from '../../../shared/instructor-contracts/assessment';
import {
  excerpt,
  hundredths,
} from '../../../shared/instructor-contracts/schema';
import { Brand, Icon } from '../../ui/brand';
import { AccountMenu } from '../../ui/account-menu';
import { CourseNavigation } from '../../ui/course-navigation';
import { WorkspaceSwitch } from '../../ui/workspace-switch';
import type { AuthView } from '../../../shared/auth';
import {
  feedbackVisibility,
  observationMatches,
  selectedSourceLines,
  draftSourceLines,
} from './presentation';
import { AssessmentController } from './controller';
import './styles.css';
export function AssessmentWorkspace({
  controller,
  id,
  account,
  preview = true,
  apiPrefix = '/__assessment-preview/api',
}: {
  controller: AssessmentController;
  id: string;
  preview?: boolean;
  account?: {
    email: string;
    logout: () => void | Promise<void>;
    identity?: Pick<AuthView, 'session' | 'csrfToken'>;
  };
  apiPrefix?: string;
}) {
  const s = useSyncExternalStore(controller.subscribe, controller.snapshot),
    v = s.view,
    feedback = s.feedback;
  const [question, setQuestion] = useState(0),
    [selected, setSelected] = useState<number | null>(null),
    [start, setStart] = useState('1'),
    [end, setEnd] = useState('1'),
    [criterion, setCriterion] = useState(''),
    [explanation, setExplanation] = useState(''),
    [noteError, setNoteError] = useState(''),
    [noteDirty, setNoteDirty] = useState(false),
    [sourceSelection, setSourceSelection] = useState<{
      start: number;
      end: number;
      answerId: string;
    } | null>(null),
    [includePrivateReferences, setIncludePrivateReferences] = useState(false),
    [withdrawVersion, setWithdrawVersion] = useState<number | null>(null),
    [reason, setReason] = useState(''),
    [audit, setAudit] = useState(''),
    [publicFeedback, setPublicFeedback] = useState<Release | Withdrawn | null>(
      null,
    ),
    [publicStatus, setPublicStatus] = useState('');
  const heading = useRef<HTMLHeadingElement>(null),
    focusQuestion = useRef(false),
    auditEpoch = useRef(0),
    reviewHeading = useRef<HTMLHeadingElement>(null),
    sourceRegion = useRef<HTMLDivElement>(null),
    commentDetails = useRef<HTMLDetailsElement>(null),
    commentInput = useRef<HTMLTextAreaElement>(null),
    publicEpoch = useRef(0);
  useEffect(() => {
    if (focusQuestion.current) {
      focusQuestion.current = false;
      heading.current?.focus();
    }
  }, [question]);
  useEffect(() => {
    publicEpoch.current++;
    setPublicFeedback(null);
    setPublicStatus('');
  }, [id, v?.head.availabilityRevision]);
  useEffect(() => {
    setIncludePrivateReferences(false);
  }, [v?.head.id, v?.head.headRevisionId]);
  useEffect(() => {
    setQuestion(0);
    resetNote();
    setAudit('');
    setWithdrawVersion(null);
    setReason('');
    void controller.open(id);
    return () => {
      auditEpoch.current++;
      publicEpoch.current++;
      controller.dispose();
    };
  }, [controller, id]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (s.dirty || noteDirty || s.busy === 'Saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [s.dirty, s.busy, noteDirty]);
  const q = v?.publication.questions[question],
    answer = v?.attempt.answers.find(
      (a) => a.questionVersionId === q?.questionVersionId,
    ),
    historical = !!s.selectedRevision,
    locked = historical || (!!s.busy && s.busy !== 'Saving');
  const invalidEvidence =
    !!v &&
    !!feedback &&
    feedback.annotations.some((item) => !observationMatches(item, v));
  const notes =
      feedback?.annotations
        .map((n, index) => ({ ...n, index }))
        .filter(
          (n) =>
            !invalidEvidence &&
            n.submittedAnswerId === answer?.submittedAnswerId,
        ) ?? [],
    note =
      selected === null || invalidEvidence
        ? undefined
        : feedback?.annotations[selected];
  async function loadPublic(version: number) {
    const epoch = ++publicEpoch.current;
    setPublicFeedback(null);
    setPublicStatus('Loading released feedback…');
    try {
      const r = await fetch(
        apiPrefix +
          '/assessments/' +
          encodeURIComponent(id) +
          '/feedback/' +
          version,
        { credentials: 'same-origin', cache: 'no-store' },
      );
      if (!r.ok) throw Error();
      const raw = object(await r.json(), ['feedback', 'currentness']),
        current = currentnessSchema.parse(raw.currentness),
        value = raw.feedback as { state?: unknown };
      const feedback =
        value?.state === 'withdrawn'
          ? withdrawnSchema.parse(value)
          : releaseSchema.parse(value);
      assert(
        feedback.id === id &&
          feedback.releaseVersion === version &&
          feedback.submissionAttemptId === v?.attempt.attemptId &&
          current.assessmentId === id,
        '$.feedback',
      );
      if (epoch !== publicEpoch.current) return;
      setPublicFeedback(feedback);
      setPublicStatus('');
    } catch {
      if (epoch === publicEpoch.current)
        setPublicStatus(
          'Released feedback unavailable. Reload to check current access.',
        );
    }
  }
  function resetNote() {
    setNoteDirty(false);
    setSelected(null);
    setExplanation('');
    setStart('1');
    setEnd('1');
    setCriterion('');
    setNoteError('');
    setSourceSelection(null);
  }
  function captureSourceSelection() {
    const selection = window.getSelection(),
      region = sourceRegion.current;
    if (
      !selection ||
      selection.isCollapsed ||
      !region ||
      selection.rangeCount !== 1
    ) {
      setSourceSelection(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const line = (node: Node) => {
      const element =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as Element)
          : node.parentElement;
      const code = element?.closest('code[data-source-line]');
      return code && region.contains(code)
        ? Number(code.getAttribute('data-source-line'))
        : null;
    };
    const first = line(range.startContainer),
      last = line(range.endContainer);
    if (first === null || last === null || !answer) {
      setSourceSelection(null);
      return;
    }
    const lines = selectedSourceLines(first, last, range.endOffset === 0);
    setSourceSelection(
      lines ? { ...lines, answerId: answer.submittedAnswerId } : null,
    );
  }
  function commentOnSelection() {
    if (
      !sourceSelection ||
      sourceSelection.answerId !== answer?.submittedAnswerId ||
      locked
    )
      return;
    if (noteDirty && !window.confirm('Discard this unfinished observation?'))
      return;
    setSelected(null);
    setStart(String(sourceSelection.start));
    setEnd(String(sourceSelection.end));
    setExplanation('');
    setCriterion('');
    setNoteError('');
    setNoteDirty(true);
    if (commentDetails.current) commentDetails.current.open = true;
    window.requestAnimationFrame(() => commentInput.current?.focus());
  }
  function edit(next: DraftFeedback) {
    controller.edit(next);
  }
  function select(index: number) {
    if (noteDirty && !window.confirm('Discard this unfinished observation?'))
      return;
    setNoteDirty(false);
    setSourceSelection(null);
    const n = feedback!.annotations[index];
    setSelected(index);
    setStart(String(n.startLine));
    setEnd(String(n.endLine));
    setCriterion(n.criterionId);
    setExplanation(n.explanation);
    setNoteError('');
    if (commentDetails.current) commentDetails.current.open = true;
  }
  async function open(revision?: string, cursor?: string) {
    if (
      (s.dirty || s.busy || noteDirty) &&
      !window.confirm(
        'Reload this assessment? Unsaved edits will be discarded.',
      )
    )
      return;
    resetNote();
    auditEpoch.current++;
    setAudit('');
    setQuestion(0);
    await controller.open(id, revision, cursor);
  }
  function observation() {
    if (!feedback || !answer || !q) return;
    try {
      const startLine = Number(start),
        endLine = Number(end),
        text = excerpt(answer.source, startLine, endLine),
        criterionId = criterion || q.criteria[0].criterionId;
      const n = {
        submittedAnswerId: answer.submittedAnswerId,
        questionVersionId: q.questionVersionId,
        rubricVersionId: q.rubricVersionId,
        criterionId,
        startLine,
        endLine,
        excerpt: text,
        explanation,
      };
      const annotations = structuredClone(feedback.annotations);
      if (selected !== null) annotations[selected] = n;
      else annotations.push(n);
      edit({ ...feedback, annotations });
      resetNote();
      sourceRegion.current?.focus();
    } catch {
      setNoteError('Choose a valid source line range.');
    }
  }
  const state =
    s.busy ??
    (historical
      ? 'Historical revision'
      : s.dirty || noteDirty
        ? 'Unsaved'
        : v?.head.approvedRevisionId === v?.head.headRevisionId
          ? 'Approved'
          : 'Draft');
  const total = (() => {
    try {
      return (
        feedback?.criteria.reduce(
          (n, c) => n + (c.score === null ? 0 : hundredths(c.score)),
          0,
        ) ?? 0
      );
    } catch {
      return null;
    }
  })();
  const scoreError = (
    value: number | null,
    minimum: number,
    maximum: number,
  ) => {
    if (value === null) return '';
    if (!Number.isFinite(value) || value < minimum || value > maximum)
      return `Enter a score between ${minimum} and ${maximum}.`;
    try {
      hundredths(value);
      return '';
    } catch {
      return 'Enter a score with at most two decimal places.';
    }
  };
  const invalidScores =
    v && feedback
      ? v.publication.questions.flatMap((item) =>
          item.criteria.flatMap((c) => {
            const value =
              feedback.criteria.find(
                (f) =>
                  f.questionVersionId === item.questionVersionId &&
                  f.criterionId === c.criterionId,
              )?.score ?? null;
            return scoreError(value, c.minimumScore, c.maximumScore)
              ? [item.title]
              : [];
          }),
        )
      : [];
  return (
    <div className="assessment-app">
      <header className="assessment-top">
        <Brand href={preview ? '/' : '/workspace'} />
        {preview ? (
          <span>Synthetic instructor preview</span>
        ) : (
          <nav className="cw-app-nav" aria-label="Main navigation">
            <WorkspaceSwitch
              role="instructor"
              account={account?.identity}
              courseId={v?.head.courseId}
              beforeLeave={() => !s.busy}
            />
            <a href="/workspace">Courses</a>
            {account && (
              <AccountMenu
                email={account.email}
                busy={!!s.busy}
                onSignOut={() => {
                  if (
                    (s.dirty || noteDirty) &&
                    !window.confirm('Sign out and leave unsaved edits?')
                  )
                    return;
                  return account.logout();
                }}
              />
            )}
          </nav>
        )}
      </header>
      {!preview && v && (
        <CourseNavigation courseId={v.head.courseId} active="grading" />
      )}
      <main>
        <div className="assessment-title">
          <div>
            <p className="assessment-eyebrow">
              Grading · {state}
              {v?.attempt.attemptId.startsWith('sample_')
                ? ' · Local sample'
                : ''}
            </p>
            <h1>{v?.publication.title ?? 'Review submitted work'}</h1>
          </div>
          <div className="assessment-actions">
            <button
              className="cw-text-action"
              onClick={() => void open()}
              disabled={!!s.busy}
            >
              <Icon name="refresh" />
              Reload
            </button>
          </div>
        </div>
        <p className="assessment-status" role="status" aria-live="polite">
          {s.message ||
            s.busy ||
            (noteDirty ? 'Finish the observation before saving.' : '') ||
            (v
              ? s.dirty
                ? 'Unsaved changes'
                : feedbackVisibility(
                    v.revision.id,
                    v.head.currentReleaseVersion,
                    v.releases,
                    historical,
                  )
              : 'Loading assessment…')}
        </p>
        {v && !historical && (
          <details className="assessment-context assessment-ai">
            <summary>
              AI assessment draft{s.candidate ? ' · Ready to review' : ''}
            </summary>
            {(preview || v.attempt.attemptId.startsWith('sample_')) && (
              <p>
                Sample only: no model is used. Suggested scores start at the
                rubric minimum and are not grades.
              </p>
            )}
            <p>Review suggestions before approval. Code is not executed.</p>
            <label className="assessment-checkbox">
              <input
                type="checkbox"
                checked={includePrivateReferences}
                disabled={!!s.busy}
                onChange={(event) =>
                  setIncludePrivateReferences(event.target.checked)
                }
              />
              <span>Include instructor-only reference solutions</span>
            </label>
            <button
              className="cw-text-action"
              disabled={!!s.busy || s.dirty || noteDirty}
              onClick={() =>
                void controller.generateAI(includePrivateReferences)
              }
            >
              Generate draft
            </button>
            {(s.dirty || noteDirty) && (
              <p>
                Save your draft and finish any observation before generating or
                adopting.
              </p>
            )}
            {s.candidate && (
              <div>
                <h3>Private AI suggestion</h3>
                <p>
                  Check scores and source observations before adopting this
                  draft. Remove private reference content before releasing
                  feedback.
                </p>
                {v.publication.questions.map((question, index) => (
                  <details key={question.questionVersionId}>
                    <summary>
                      Question {index + 1}: {question.title}
                    </summary>
                    <ul>
                      {s
                        .candidate!.payload.criteria.filter(
                          (item) =>
                            item.questionVersionId ===
                            question.questionVersionId,
                        )
                        .map((item) => (
                          <li key={item.criterionId}>
                            {question.criteria.find(
                              (criterion) =>
                                criterion.criterionId === item.criterionId,
                            )?.descriptor ?? item.criterionId}
                            : {item.score} / {item.maximumScore} —{' '}
                            {item.explanation}
                          </li>
                        ))}
                      {s
                        .candidate!.payload.annotations.filter(
                          (item) =>
                            item.questionVersionId ===
                            question.questionVersionId,
                        )
                        .map((item, noteIndex) => (
                          <li key={'note-' + noteIndex}>
                            Lines {item.startLine}–{item.endLine}:{' '}
                            {item.excerpt} — {item.explanation}
                          </li>
                        ))}
                    </ul>
                  </details>
                ))}
                {s.candidate.payload.reviewFlags.map((flag, index) => (
                  <p key={index}>{flag}</p>
                ))}
                <button
                  className="cw-action"
                  disabled={!!s.busy || s.dirty || noteDirty}
                  onClick={() => void controller.adoptAI()}
                >
                  Adopt AI draft
                </button>
              </div>
            )}
          </details>
        )}
        {!v || !feedback || !q || !answer ? (
          <section className="assessment-empty">
            <h2>Assessment unavailable</h2>
            <p>{s.busy ? 'Loading submitted work…' : 'Reload to try again.'}</p>
          </section>
        ) : (
          <>
            <details className="assessment-context">
              <summary>Attempt and version details</summary>
              <dl>
                <dt>Submitted</dt>
                <dd>{new Date(v.attempt.submittedAt).toLocaleString()}</dd>
                <dt>Attempt</dt>
                <dd>{v.attempt.attemptId}</dd>
                <dt>Publication</dt>
                <dd>{v.publication.assignmentVersionId}</dd>
                <dt>Assessment revision</dt>
                <dd>{v.revision.id}</dd>
                <dt>Public feedback</dt>
                <dd>
                  {v.head.currentReleaseVersion === null
                    ? 'No current release'
                    : `Release ${v.head.currentReleaseVersion}`}
                </dd>
              </dl>
            </details>
            <div className="assessment-sheet">
              <section
                className="assessment-question"
                aria-labelledby="assessment-question"
              >
                <p className="assessment-eyebrow">
                  Question {question + 1} of {v.publication.questions.length}
                </p>
                <h2 id="assessment-question" ref={heading} tabIndex={-1}>
                  {q.title}
                </h2>
                <details className="assessment-brief" open>
                  <summary>Question instructions</summary>
                  <p className="assessment-instructions">{q.instructions}</p>
                </details>
                <h3>Rubric</h3>
                {q.criteria.map((c) => {
                  const index = feedback.criteria.findIndex(
                      (f) =>
                        f.questionVersionId === q.questionVersionId &&
                        f.criterionId === c.criterionId,
                    ),
                    score = feedback.criteria[index],
                    error = scoreError(
                      score.score,
                      c.minimumScore,
                      c.maximumScore,
                    ),
                    errorId = `score-error-${question}-${index}`;
                  return (
                    <fieldset key={c.criterionId} disabled={locked}>
                      <legend>{c.descriptor}</legend>
                      <label>
                        Score{' '}
                        <span className="assessment-secondary">
                          / {c.maximumScore}
                        </span>
                        <input
                          type="number"
                          min={c.minimumScore}
                          max={c.maximumScore}
                          step="any"
                          aria-invalid={!!error}
                          aria-describedby={error ? errorId : undefined}
                          value={score.score ?? ''}
                          onChange={(e) => {
                            const criteria = structuredClone(feedback.criteria);
                            criteria[index].score =
                              e.target.value === ''
                                ? null
                                : Number(e.target.value);
                            edit({ ...feedback, criteria });
                          }}
                        />
                        {error && (
                          <span id={errorId} role="alert">
                            {error}
                          </span>
                        )}
                      </label>
                      <label>
                        Explanation
                        <textarea
                          rows={3}
                          value={score.explanation}
                          onChange={(e) => {
                            const criteria = structuredClone(feedback.criteria);
                            criteria[index].explanation = e.target.value;
                            edit({ ...feedback, criteria });
                          }}
                        />
                      </label>
                    </fieldset>
                  );
                })}
              </section>
              <section
                className="assessment-work"
                aria-label="Submitted source and observations"
              >
                <div className="assessment-source-heading">
                  <h2>Submitted source</h2>
                  <span>Read only</span>
                </div>
                {!historical && (
                  <p className="assessment-secondary">
                    Select code to add a comment.
                  </p>
                )}
                <div
                  className="assessment-source"
                  ref={sourceRegion}
                  role="region"
                  aria-label="Immutable submitted Python source"
                  tabIndex={0}
                  onMouseUp={captureSourceSelection}
                  onKeyUp={captureSourceSelection}
                >
                  {answer.source.split('\n').map((line, index) => {
                    const marked = notes.filter(
                        (n) =>
                          index + 1 >= n.startLine && index + 1 <= n.endLine,
                      ),
                      draftRange = noteDirty
                        ? draftSourceLines(
                            start,
                            end,
                            answer.source.split('\n').length,
                          )
                        : null,
                      active = noteDirty
                        ? !!draftRange &&
                          index + 1 >= draftRange.start &&
                          index + 1 <= draftRange.end
                        : note
                          ? note.submittedAnswerId ===
                              answer.submittedAnswerId &&
                            index + 1 >= note.startLine &&
                            index + 1 <= note.endLine
                          : sourceSelection?.answerId ===
                              answer.submittedAnswerId &&
                            index + 1 >= sourceSelection.start &&
                            index + 1 <= sourceSelection.end;
                    return (
                      <div
                        className={
                          'assessment-line' +
                          (marked.length ? ' is-annotated' : '') +
                          (active ? ' is-selected' : '')
                        }
                        key={index}
                      >
                        {marked.length ? (
                          <button
                            aria-label={`Line ${index + 1}, comment ${marked[0].index + 1}`}
                            aria-pressed={selected === marked[0].index}
                            onClick={() => select(marked[0].index)}
                          >
                            {index + 1}
                            <span aria-hidden="true">•</span>
                          </button>
                        ) : (
                          <span
                            className="assessment-number"
                            aria-hidden="true"
                          >
                            {index + 1}
                          </span>
                        )}
                        <code data-source-line={index + 1}>
                          {line || '\u00a0'}
                        </code>
                      </div>
                    );
                  })}
                </div>
                {!historical && (
                  <div className="assessment-actions">
                    <button
                      disabled={
                        !sourceSelection ||
                        sourceSelection.answerId !== answer.submittedAnswerId ||
                        locked
                      }
                      onClick={commentOnSelection}
                    >
                      Comment on selection
                    </button>
                    <span
                      className="assessment-secondary"
                      role="status"
                      aria-live="polite"
                    >
                      {sourceSelection?.answerId === answer.submittedAnswerId
                        ? `Selected lines ${sourceSelection.start}–${sourceSelection.end}`
                        : ''}
                    </span>
                  </div>
                )}
                <section
                  className="assessment-observations"
                  aria-labelledby="observations-heading"
                >
                  <h3 id="observations-heading">
                    Comments{' '}
                    {!invalidEvidence && (
                      <span className="assessment-secondary">
                        {notes.length}
                      </span>
                    )}
                  </h3>
                  {invalidEvidence && (
                    <p role="alert">
                      Observation evidence is unavailable because it does not
                      match the pinned source. Reload or contact support.
                    </p>
                  )}
                  {!invalidEvidence && notes.length === 0 ? (
                    <p className="assessment-secondary">No comments yet.</p>
                  ) : notes.length > 0 ? (
                    <ol>
                      {notes.map((n) => (
                        <li key={n.index}>
                          <button
                            aria-pressed={selected === n.index}
                            onClick={() => select(n.index)}
                          >
                            Comment {n.index + 1} · Lines {n.startLine}–
                            {n.endLine}
                          </button>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  <div role="status" aria-live="polite" aria-atomic="true">
                    {note && (
                      <aside className="assessment-note">
                        <strong>
                          {q.criteria.find(
                            (c) => c.criterionId === note.criterionId,
                          )?.descriptor ?? 'Evidence unavailable'}
                        </strong>
                        <p>
                          Lines {note.startLine}–{note.endLine}
                        </p>
                        <p>{note.explanation || 'Explanation incomplete'}</p>
                      </aside>
                    )}
                  </div>
                  {!historical && (
                    <details
                      ref={commentDetails}
                      hidden={selected === null && !noteDirty}
                    >
                      <summary>
                        {selected === null ? 'Add comment' : 'Edit comment'}
                      </summary>
                      <fieldset disabled={locked}>
                        <p>
                          Lines {start}–{end}
                        </p>
                        <details>
                          <summary>
                            Rubric item:{' '}
                            {
                              q.criteria.find(
                                (c) =>
                                  c.criterionId ===
                                  (criterion || q.criteria[0].criterionId),
                              )?.descriptor
                            }
                          </summary>
                          <label>
                            Link comment to rubric item
                            <select
                              value={criterion || q.criteria[0].criterionId}
                              onChange={(e) => {
                                setCriterion(e.target.value);
                                setNoteDirty(true);
                              }}
                            >
                              {q.criteria.map((c) => (
                                <option
                                  key={c.criterionId}
                                  value={c.criterionId}
                                >
                                  {c.descriptor}
                                </option>
                              ))}
                            </select>
                          </label>
                        </details>
                        <label>
                          Comment
                          <textarea
                            ref={commentInput}
                            value={explanation}
                            rows={3}
                            onChange={(e) => {
                              setExplanation(e.target.value);
                              setNoteDirty(true);
                            }}
                          />
                        </label>
                        {noteError && <p role="alert">{noteError}</p>}
                        <div className="assessment-actions">
                          <button onClick={observation}>
                            {selected === null
                              ? 'Add comment'
                              : 'Update comment'}
                          </button>
                          {selected !== null && (
                            <>
                              <button
                                onClick={() => {
                                  edit({
                                    ...feedback,
                                    annotations: feedback.annotations.filter(
                                      (_, index) => index !== selected,
                                    ),
                                  });
                                  resetNote();
                                  sourceRegion.current?.focus();
                                }}
                              >
                                Remove
                              </button>
                            </>
                          )}
                          {(noteDirty || selected !== null) && (
                            <button
                              onClick={() => {
                                resetNote();
                                if (commentDetails.current)
                                  commentDetails.current.open = false;
                                sourceRegion.current?.focus();
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </fieldset>
                    </details>
                  )}
                </section>
              </section>
            </div>
            <nav
              className="assessment-pagination"
              aria-label="Pinned questions"
            >
              <button
                disabled={question === 0}
                onClick={() => {
                  if (
                    noteDirty &&
                    !window.confirm('Discard this unfinished observation?')
                  )
                    return;
                  focusQuestion.current = true;
                  setQuestion(question - 1);
                  resetNote();
                }}
              >
                <Icon name="arrow-left" />
                Previous
              </button>
              <span>
                {question + 1} / {v.publication.questions.length}
              </span>
              <button
                onClick={() => {
                  if (
                    noteDirty &&
                    !window.confirm('Discard this unfinished observation?')
                  )
                    return;
                  if (question === v.publication.questions.length - 1) {
                    reviewHeading.current?.focus();
                    reviewHeading.current?.scrollIntoView({ block: 'start' });
                    return;
                  }
                  focusQuestion.current = true;
                  setQuestion(question + 1);
                  resetNote();
                }}
              >
                {question === v.publication.questions.length - 1
                  ? 'Review assessment'
                  : 'Next'}
                <Icon name="arrow-right" />
              </button>
            </nav>
            <section
              className="assessment-review"
              aria-labelledby="review-heading"
            >
              <div>
                <h2 id="review-heading" ref={reviewHeading} tabIndex={-1}>
                  Review feedback
                </h2>
                <p>
                  {total === null
                    ? 'Check the entered scores.'
                    : feedback.criteria.every((c) => c.score === null)
                      ? 'No scores yet.'
                      : `Total entered: ${total / 100} points.`}{' '}
                  {invalidScores.length > 0
                    ? `Correct invalid scores in: ${[...new Set(invalidScores)].join(', ')}.`
                    : feedback.criteria.some(
                          (c) => c.score === null || !c.explanation.trim(),
                        )
                      ? 'Add a score and explanation for every rubric item in all questions before approving.'
                      : 'All rubric items have a score and explanation.'}
                </p>
              </div>
              <div className="assessment-actions">
                {historical ? (
                  <>
                    <button onClick={() => void open()}>Return to draft</button>
                    <button
                      disabled={!!s.busy || s.dirty || noteDirty}
                      onClick={() => {
                        resetNote();
                        void controller.action('correct');
                      }}
                    >
                      Create correction
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      disabled={!s.dirty || !!s.busy || noteDirty}
                      onClick={() => void controller.save()}
                    >
                      <Icon name="save" />
                      Save draft
                    </button>
                    <button
                      className={
                        v.head.approvedRevisionId === v.head.headRevisionId
                          ? undefined
                          : 'cw-action'
                      }
                      disabled={
                        !!s.busy ||
                        s.dirty ||
                        noteDirty ||
                        v.head.approvedRevisionId === v.head.headRevisionId
                      }
                      onClick={() => void controller.action('approve')}
                    >
                      <Icon name="check" />
                      Approve feedback
                    </button>
                    <button
                      className={
                        v.head.approvedRevisionId === v.head.headRevisionId
                          ? 'cw-action'
                          : undefined
                      }
                      disabled={
                        !!s.busy ||
                        s.dirty ||
                        noteDirty ||
                        v.head.approvedRevisionId !== v.head.headRevisionId ||
                        v.releases.some(
                          (r) => r.revisionId === v.head.headRevisionId,
                        )
                      }
                      onClick={() => void controller.action('release')}
                    >
                      <Icon name="publish" />
                      Release feedback
                    </button>
                  </>
                )}
              </div>
            </section>
            {!preview && v.head.maximumReleaseVersion > 0 && (
              <section
                className="assessment-review"
                aria-labelledby="public-feedback-heading"
              >
                <div>
                  <h2 id="public-feedback-heading">
                    Released feedback preview
                  </h2>
                  <button
                    disabled={!!s.busy}
                    onClick={() =>
                      void loadPublic(
                        v.head.currentReleaseVersion ??
                          v.head.maximumReleaseVersion,
                      )
                    }
                  >
                    View released feedback
                  </button>
                  {publicStatus && <p role="status">{publicStatus}</p>}
                  {publicFeedback && (
                    <div>
                      <p>
                        Release {publicFeedback.releaseVersion} ·{' '}
                        {publicFeedback.state}
                      </p>
                      {publicFeedback.state === 'withdrawn' ? (
                        <p>This feedback was withdrawn.</p>
                      ) : (
                        <>
                          {publicFeedback.criteria.map((c) => (
                            <article
                              key={c.questionVersionId + '|' + c.criterionId}
                            >
                              <h3>
                                {v.publication.questions
                                  .find(
                                    (q) =>
                                      q.questionVersionId ===
                                      c.questionVersionId,
                                  )
                                  ?.criteria.find(
                                    (r) => r.criterionId === c.criterionId,
                                  )?.descriptor ?? 'Criterion'}
                              </h3>
                              <p>
                                {c.score} / {c.maximumScore}
                              </p>
                              <p>{c.explanation}</p>
                            </article>
                          ))}
                          {publicFeedback.annotations.map((n, index) => (
                            <p key={index}>
                              Lines {n.startLine}–{n.endLine}: {n.explanation}
                            </p>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
            <details className="assessment-history">
              <summary>History & corrections</summary>
              <h3>Releases</h3>
              {v.releases.length === 0 ? (
                <p>No released feedback.</p>
              ) : (
                <ul>
                  {v.releases.map((r) => (
                    <li key={r.version}>
                      <span>
                        Release {r.version} ·{' '}
                        {r.withdrawnAt
                          ? 'Withdrawn'
                          : v.head.currentReleaseVersion === r.version
                            ? 'Current'
                            : 'Superseded'}
                      </span>
                      <button
                        disabled={!!s.busy}
                        onClick={() => void open(r.revisionId)}
                      >
                        View revision
                      </button>
                      {!preview && (
                        <button onClick={() => void loadPublic(r.version)}>
                          Public preview
                        </button>
                      )}
                      {!r.withdrawnAt && (
                        <button
                          disabled={!!s.busy || s.dirty}
                          onClick={() => {
                            setWithdrawVersion(r.version);
                            setReason('');
                          }}
                        >
                          Withdraw release {r.version}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {withdrawVersion !== null && (
                <section
                  className="assessment-withdraw"
                  aria-labelledby="withdraw-heading"
                >
                  <h3 id="withdraw-heading">
                    Withdraw release {withdrawVersion}?
                  </h3>
                  <p>
                    Students will see a withdrawal notice. Older feedback will
                    not become current.
                  </p>
                  <label>
                    Private reason
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={1024}
                    />
                  </label>
                  <div className="assessment-actions">
                    <button
                      disabled={
                        !!s.busy || !reason.trim() || s.dirty || noteDirty
                      }
                      onClick={() => {
                        void controller
                          .action('withdraw', {
                            version: withdrawVersion,
                            reason,
                          })
                          .then((succeeded) => {
                            if (succeeded) setWithdrawVersion(null);
                          });
                      }}
                    >
                      Confirm withdrawal
                    </button>
                    <button
                      disabled={!!s.busy}
                      onClick={() => setWithdrawVersion(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              )}
              <h3>Saved revisions</h3>
              <ul>
                {v.history.map((r) => (
                  <li key={r.id}>
                    <span>
                      {new Date(r.createdAt).toLocaleString()} · {r.provenance}
                    </span>
                    <button onClick={() => void open(r.id)} disabled={!!s.busy}>
                      View revision {r.id.slice(0, 8)}
                    </button>
                  </li>
                ))}
              </ul>
              {v.historyCursor && (
                <button
                  disabled={!!s.busy}
                  onClick={() => void open(undefined, v.historyCursor!)}
                >
                  Older revisions
                </button>
              )}
              <details>
                <summary>Private audit</summary>
                <button
                  onClick={() => {
                    const epoch = ++auditEpoch.current;
                    void fetch(
                      `${apiPrefix}/assessments/${encodeURIComponent(id)}/audit`,
                      { credentials: 'same-origin' },
                    )
                      .then(async (r) => {
                        if (!r.ok) throw Error();
                        const d = (await r.json()) as { events: unknown };
                        if (epoch === auditEpoch.current)
                          setAudit(JSON.stringify(d.events, null, 2));
                      })
                      .catch(() => {
                        if (epoch === auditEpoch.current)
                          setAudit('Audit unavailable.');
                      });
                  }}
                >
                  Load audit
                </button>
                {audit && <pre className="assessment-audit">{audit}</pre>}
              </details>
            </details>
          </>
        )}
      </main>
    </div>
  );
}
