import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type {
  AssignmentClient,
  Authoring,
  DraftSummary,
} from '../../../shared/instructor-contracts/authoring';
import { highlightPython } from './python-highlight';
import { InstructionEditor } from './InstructionEditor';
import { Action, StatusMessage, QuestionNavigation } from '../../ui/primitives';
import {
  AssignmentController,
  singaporeInput,
  singaporeUtc,
  reorderQuestions,
  errorMessage,
  type WorkspaceState,
} from './controller';
import { Brand, Icon } from '../../ui/brand';
import { AccountMenu } from '../../ui/account-menu';
import { CourseNavigation } from '../../ui/course-navigation';
import { WorkspaceSwitch } from '../../ui/workspace-switch';
import { authRequest } from '../../auth/client';
import type { AuthView } from '../../../shared/auth';
import './styles.css';
type Question = Authoring['questions'][number];
const key = () => crypto.randomUUID();
const newQuestion = (): Question => ({
  questionId: key(),
  rubricId: key(),
  title: '',
  instructions: '',
  language: 'python',
  starterCode: '',
  privateReference: '',
  criteria: [],
});
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="ia-field">
      <label>
        <span>{label}</span>
        {children}
      </label>
      {hint && <p className="ia-hint">{hint}</p>}
    </div>
  );
}
function Code({ label, source }: { label: string; source: string }) {
  return (
    <div className="ia-code-view">
      <p className="ia-label">{label}</p>
      <pre tabIndex={0} aria-label={label}>
        <code
          dangerouslySetInnerHTML={{
            __html: highlightPython(source || 'No code provided.'),
          }}
        />
      </pre>
    </div>
  );
}
function PythonEditor({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const highlighted = useRef<HTMLPreElement>(null);
  return (
    <div className="ia-code-editor">
      <pre ref={highlighted} aria-hidden="true">
        <code
          dangerouslySetInnerHTML={{ __html: highlightPython(value + '\n') }}
        />
      </pre>
      <textarea
        className="ia-code-input"
        aria-label={label}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        wrap="off"
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => {
          if (highlighted.current) {
            highlighted.current.scrollTop = event.currentTarget.scrollTop;
            highlighted.current.scrollLeft = event.currentTarget.scrollLeft;
          }
        }}
      />
    </div>
  );
}
function statusText(state: WorkspaceState) {
  if (state.error) return state.message;
  const pending: Record<string, string> = {
    Opening: 'Opening assignment…',
    Creating: 'Creating assignment…',
    Saving: 'Saving changes…',
    Publishing: 'Publishing assignment…',
    'Loading version': 'Opening published version…',
    'Refreshing versions': 'Updating version history…',
    'Checking access': 'Checking access…',
  };
  if (state.pending) return pending[state.pending] ?? state.pending;
  if (state.snapshot)
    return (
      'Published version ' + state.snapshot.publicationNumber + ' · Read only'
    );
  if (state.message.startsWith('Published version'))
    return state.message.replace(/ from saved revision \d+\./, '.');
  if (state.dirty)
    return state.message.includes('newer changes')
      ? 'Earlier changes saved. You still have unsaved edits.'
      : 'Unsaved changes';
  if (state.review) return 'Review your saved draft before publishing.';
  if (state.draft) return 'All changes saved';
  return '';
}
const dateText = (utc: string) =>
  new Date(utc).toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    dateStyle: 'medium',
    timeStyle: 'short',
  }) + ' Singapore';
export function AssignmentWorkspace({
  client,
  preview = true,
  initialAssignmentId,
  courseId,
  account,
}: {
  client: AssignmentClient;
  preview?: boolean;
  initialAssignmentId?: string;
  courseId?: string;
  account?: AuthView;
}) {
  const [assignmentId] = useState(
    () =>
      initialAssignmentId ??
      new URLSearchParams(window.location.search).get('assignment'),
  );
  const editorPage = assignmentId !== null;
  const [controller] = useState(() => new AssignmentController(client));
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const [rows, setRows] = useState<DraftSummary[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [listing, setListing] = useState(false),
    [listError, setListError] = useState('');
  const [versionSummary, setVersionSummary] = useState(false);
  const [reorderStatus, setReorderStatus] = useState('');
  const [keyboardGrabbed, setKeyboardGrabbed] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null),
    questionHeading = useRef<HTMLHeadingElement>(null),
    draggingQuestion = useRef<number | null>(null);
  async function list(after = '') {
    setListing(true);
    setListError('');
    try {
      const result = await client.list(after);
      setRows((previous) =>
        after ? [...previous, ...result.items] : result.items,
      );
      setCursor(result.nextCursor);
    } catch (error) {
      setRows([]);
      setCursor(null);
      setListError(errorMessage(error));
    } finally {
      setListing(false);
    }
  }
  useEffect(() => {
    if (assignmentId !== null) void controller.open(assignmentId);
    else void list();
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted && !editorPage) void list();
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);
  useEffect(() => {
    pageHeading.current?.focus();
  }, [state.draft?.assignmentId]);
  useEffect(() => {
    questionHeading.current?.focus();
  }, [
    state.index,
    state.payload?.questions[state.index]?.questionId,
    state.review,
    state.snapshot?.assignmentVersionId,
    versionSummary,
  ]);
  useEffect(() => {
    setVersionSummary(false);
  }, [state.snapshot?.assignmentVersionId]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (state.dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [state.dirty]);
  const editorUrl = (id: string) => {
    const url = new URL(window.location.href);
    if (!preview) {
      url.pathname = '/instructor/assignments';
      if (courseId) url.searchParams.set('courseId', courseId);
    }
    url.searchParams.delete('assignment');
    url.hash = '';
    url.searchParams.set('assignment', id);
    return url.href;
  };
  const payload = state.snapshot
    ? {
        title: state.snapshot.publication.title,
        deadlineAt: state.snapshot.publication.deadlineAt,
        questions: state.snapshot.publication.questions.map((q) => ({
          ...q,
          privateReference:
            state.snapshot!.privateReferences.find(
              (r) => r.questionVersionId === q.questionVersionId,
            )?.source ?? '',
        })),
      }
    : state.payload;
  const readOnly = !!state.snapshot,
    locked =
      readOnly ||
      ['Opening', 'Creating', 'Publishing'].includes(state.pending ?? '');
  const question = payload?.questions[state.index],
    status = statusText(state);
  const edit = (next: Authoring) => controller.edit(next);
  const editQuestion = (value: Partial<Question>) => {
    if (!state.payload) return;
    edit({
      ...state.payload,
      questions: state.payload.questions.map((q, i) =>
        i === state.index ? { ...q, ...value } : q,
      ),
    });
  };
  const addQuestion = () => {
    if (!state.payload || locked) return;
    edit({
      ...state.payload,
      questions: [...state.payload.questions, newQuestion()],
    });
    controller.question(state.payload.questions.length);
  };
  const moveQuestion = (from: number, target: number) => {
    if (!state.payload || locked) return;
    const questions = [...state.payload.questions];
    if (
      from < 0 ||
      target < 0 ||
      from >= questions.length ||
      target >= questions.length ||
      from === target
    )
      return;
    const currentId = questions[state.index]?.questionId;
    const reordered = reorderQuestions(questions, from, target);
    edit({ ...state.payload, questions: reordered });
    controller.question(reordered.findIndex((q) => q.questionId === currentId));
    setReorderStatus(
      `Moved ${questions[from].title || `question ${from + 1}`} to position ${target + 1} of ${questions.length}.`,
    );
  };
  const discard = () => {
    if (
      state.draft &&
      window.confirm(
        'Discard your unsaved changes and reload the last saved draft? Published versions will stay unchanged.',
      )
    )
      void controller.open(state.draft.assignmentId);
  };
  const previewFailure = state.message.includes('History could not refresh');
  return (
    <div className="cw-shell ia-workspace">
      <a className="cw-skip-link" href="#assignment-work">
        Skip to assignment
      </a>
      <header className="cw-header">
        <Brand href={preview ? window.location.pathname : '/workspace'} />
        {preview && (
          <p className="cw-header-context">Instructor · Synthetic preview</p>
        )}
        {!preview && (
          <nav className="cw-app-nav" aria-label="Main navigation">
            <WorkspaceSwitch
              role="instructor"
              courseId={courseId}
              beforeLeave={() => !state.pending}
            />
            <a href="/workspace">Courses</a>
            {account && (
              <AccountMenu
                email={account.email}
                busy={!!state.pending}
                onSignOut={() => {
                  if (
                    state.dirty &&
                    !window.confirm('Sign out and leave unsaved edits?')
                  )
                    return;
                  return authRequest('logout', account.csrfToken, {}).then(() =>
                    window.location.assign('/sign-in'),
                  );
                }}
              />
            )}
          </nav>
        )}
        {preview && (
          <details className="ia-preview-settings">
            <summary>Preview settings</summary>
            <div>
              <p>Synthetic course · Sign-in not connected.</p>
              <Field label="Appearance">
                <select
                  defaultValue="light dark"
                  onChange={(event) => {
                    document.documentElement.style.colorScheme =
                      event.target.value;
                  }}
                >
                  <option value="light dark">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </Field>
            </div>
          </details>
        )}
      </header>
      {!preview && courseId && (
        <CourseNavigation courseId={courseId} active="assignments" />
      )}
      <div className="cw-page-title ia-page-title">
        {editorPage && (
          <Action
            variant="secondary"
            disabled={!!state.pending}
            onClick={() => {
              const url = new URL(window.location.href);
              if (!preview) {
                url.pathname = '/instructor/assignments';
                if (courseId) url.searchParams.set('courseId', courseId);
              }
              url.searchParams.delete('assignment');
              window.location.assign(url.href);
            }}
          >
            <Icon name="arrow-left" /> Assignments
          </Action>
        )}
        <p className="cw-kicker">
          {editorPage
            ? readOnly
              ? 'Published assignment'
              : 'Assignment draft'
            : 'Instructor'}
        </p>
        <h1 ref={pageHeading} tabIndex={-1}>
          {editorPage
            ? state.denied
              ? 'Assignment unavailable'
              : payload?.title || 'New assignment'
            : 'Assignments'}
        </h1>
      </div>
      <main id="assignment-work">
        {!editorPage && (
          <section aria-label="Assignment list" className="ia-list">
            <div className="ia-list-toolbar">
              <Action
                pending={!!state.pending}
                onClick={() =>
                  void controller.create().then((draft) => {
                    if (draft)
                      window.location.assign(editorUrl(draft.assignmentId));
                  })
                }
              >
                {state.pending === 'Creating' ? (
                  'Creating assignment…'
                ) : (
                  <>
                    <Icon name="plus" />
                    New assignment
                  </>
                )}
              </Action>
            </div>
            {state.error && (
              <StatusMessage tone="error">{state.message}</StatusMessage>
            )}
            {state.denied ? null : listError ? (
              <div className="ia-empty">
                <StatusMessage tone="error">{listError}</StatusMessage>
                <Action
                  variant="secondary"
                  pending={listing}
                  onClick={() => void list()}
                >
                  Try again
                </Action>
              </div>
            ) : (
              <>
                {listing && <StatusMessage>Loading assignments…</StatusMessage>}
                {!listing && rows.length === 0 && (
                  <div className="ia-empty">
                    <h2>No assignments yet.</h2>
                  </div>
                )}
                <ul>
                  {rows.map((row) => (
                    <li key={row.assignmentId}>
                      <div>
                        <strong>{row.title || 'Untitled assignment'}</strong>
                        <p>
                          Draft · Updated{' '}
                          {new Date(row.updatedAt).toLocaleDateString('en-SG', {
                            timeZone: 'Asia/Singapore',
                            dateStyle: 'medium',
                          })}
                        </p>
                      </div>
                      <Action
                        variant="secondary"
                        disabled={!!state.pending}
                        onClick={() =>
                          window.location.assign(editorUrl(row.assignmentId))
                        }
                        aria-label={
                          'Edit ' + (row.title || 'untitled assignment')
                        }
                      >
                        <Icon name="edit" /> Edit
                      </Action>
                    </li>
                  ))}
                </ul>
                {cursor && (
                  <Action
                    variant="secondary"
                    pending={listing}
                    onClick={() => void list(cursor)}
                  >
                    Show more
                  </Action>
                )}
              </>
            )}
          </section>
        )}
        {editorPage && (
          <div className="ia-editor-bar">
            <StatusMessage
              tone={
                state.error
                  ? 'error'
                  : !state.dirty && !state.pending && !!state.draft
                    ? 'success'
                    : 'neutral'
              }
            >
              {status || 'Opening assignment…'}
            </StatusMessage>
            {!state.denied && state.draft && !state.review && (
              <div className="ia-actions">
                {readOnly ? (
                  <Action
                    variant="secondary"
                    disabled={!!state.pending}
                    onClick={() => controller.returnToDraft()}
                  >
                    Back to draft
                  </Action>
                ) : (
                  <>
                    <Action
                      variant={state.dirty ? 'primary' : 'secondary'}
                      pending={state.pending === 'Saving'}
                      disabled={!!state.pending || !state.dirty}
                      onClick={() => void controller.save()}
                    >
                      {state.pending === 'Saving' ? (
                        'Saving…'
                      ) : (
                        <>
                          <Icon name="save" />
                          Save draft
                        </>
                      )}
                    </Action>
                    <Action
                      variant={state.dirty ? 'secondary' : 'primary'}
                      disabled={!!state.pending || state.dirty}
                      onClick={() => controller.review()}
                    >
                      <Icon name="publish" /> Review &amp; publish
                    </Action>
                    {state.dirty && (
                      <details className="ia-options">
                        <summary>Draft options</summary>
                        <Action
                          variant="secondary"
                          disabled={!!state.pending}
                          onClick={discard}
                        >
                          Discard unsaved changes
                        </Action>
                      </details>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {editorPage && payload && !state.denied && (
          <>
            {state.review ? (
              <section className="ia-review" aria-labelledby="publish-heading">
                <p className="cw-kicker">Final review</p>
                <h2 ref={questionHeading} tabIndex={-1} id="publish-heading">
                  Ready to publish?
                </h2>
                <p>
                  Students receive this fixed version. Later edits stay in your
                  draft.
                </p>
                <dl className="ia-review-details">
                  <div>
                    <dt>Assignment</dt>
                    <dd>{payload.title}</dd>
                  </div>
                  <div>
                    <dt>Due date</dt>
                    <dd>
                      {payload.deadlineAt && dateText(payload.deadlineAt)}
                    </dd>
                  </div>
                </dl>
                <ol className="ia-review-questions">
                  {payload.questions.map((q) => (
                    <li key={q.questionId}>
                      <strong>{q.title}</strong>
                      <span>
                        {q.criteria.length} rubric{' '}
                        {q.criteria.length === 1 ? 'criterion' : 'criteria'}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="ia-hint">
                  Reference solutions stay private to instructors.
                </p>
                <div className="ia-actions">
                  <Action
                    pending={state.pending === 'Publishing'}
                    disabled={!!state.pending}
                    onClick={() => void controller.publish()}
                  >
                    {state.pending === 'Publishing'
                      ? 'Publishing…'
                      : 'Publish assignment'}
                  </Action>
                  <Action
                    variant="secondary"
                    disabled={!!state.pending}
                    onClick={() => controller.question(state.index)}
                  >
                    Continue editing
                  </Action>
                </div>
              </section>
            ) : state.snapshot && versionSummary ? (
              <section className="ia-review">
                <p className="cw-kicker">
                  Published version {state.snapshot.publicationNumber}
                </p>
                <h2 ref={questionHeading} tabIndex={-1}>
                  Version summary
                </h2>
                <p>
                  {payload.title} · {payload.questions.length}{' '}
                  {payload.questions.length === 1 ? 'question' : 'questions'} ·
                  Read only
                </p>
                <ol className="ia-review-questions">
                  {payload.questions.map((q) => (
                    <li key={q.questionId}>
                      <strong>{q.title}</strong>
                      <span>{q.criteria.length} rubric criteria</span>
                    </li>
                  ))}
                </ol>
                <Action
                  variant="secondary"
                  onClick={() => setVersionSummary(false)}
                >
                  Back to questions
                </Action>
              </section>
            ) : (
              <>
                <section
                  className="ia-metadata"
                  aria-label="Assignment details"
                >
                  <div className="ia-section-title">
                    <h2>Assignment details</h2>
                  </div>
                  {readOnly ? (
                    <dl className="ia-review-details">
                      <div>
                        <dt>Title</dt>
                        <dd>{payload.title}</dd>
                      </div>
                      <div>
                        <dt>Due date</dt>
                        <dd>
                          {payload.deadlineAt && dateText(payload.deadlineAt)}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <div className="ia-details-grid">
                      <Field label="Title">
                        <input
                          maxLength={200}
                          value={payload.title}
                          readOnly={locked}
                          placeholder="e.g. Working with loops"
                          onChange={(event) =>
                            edit({ ...payload, title: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Due date (Singapore time)">
                        <input
                          type="datetime-local"
                          value={singaporeInput(payload.deadlineAt)}
                          readOnly={locked}
                          onChange={(event) =>
                            edit({
                              ...payload,
                              deadlineAt: singaporeUtc(event.target.value),
                            })
                          }
                        />
                      </Field>
                    </div>
                  )}
                </section>
                <section
                  className="ia-questions"
                  aria-label="Assignment questions"
                >
                  <div className="ia-section-title">
                    <h2>Questions</h2>
                  </div>
                  {payload.questions.length > 0 ? (
                    <aside
                      className="ia-question-toolbar"
                      aria-label="Question list"
                    >
                      <p className="ia-hint">
                        {readOnly
                          ? 'Questions'
                          : 'Drag the handle to reorder. Keyboard: Space, arrow keys, Space.'}
                      </p>
                      <ol className="ia-question-list">
                        {payload.questions.map((q, i) => (
                          <li
                            key={q.questionId}
                            className={
                              dropTarget === i ? 'ia-drop-target' : undefined
                            }
                            onDragOver={(event) => {
                              if (
                                !locked &&
                                !readOnly &&
                                draggingQuestion.current !== null
                              ) {
                                event.preventDefault();
                                setDropTarget(i);
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              const from = draggingQuestion.current;
                              draggingQuestion.current = null;
                              setDropTarget(null);
                              if (from !== null) moveQuestion(from, i);
                            }}
                          >
                            {!readOnly && (
                              <button
                                type="button"
                                className="ia-drag-handle"
                                draggable={!locked}
                                disabled={locked}
                                aria-label={`Reorder question ${i + 1}: ${q.title || 'Untitled question'}`}
                                aria-pressed={keyboardGrabbed === q.questionId}
                                onDragStart={(event) => {
                                  draggingQuestion.current = i;
                                  event.dataTransfer.effectAllowed = 'move';
                                  event.dataTransfer.setData(
                                    'text/plain',
                                    q.questionId,
                                  );
                                }}
                                onDragEnd={() => {
                                  draggingQuestion.current = null;
                                  setDropTarget(null);
                                }}
                                onClick={() => {
                                  const active =
                                    keyboardGrabbed !== q.questionId;
                                  setKeyboardGrabbed(
                                    active ? q.questionId : null,
                                  );
                                  setReorderStatus(
                                    active
                                      ? `Question ${i + 1} selected for reordering. Use arrow keys, then Space to drop.`
                                      : `Question dropped at position ${i + 1}.`,
                                  );
                                }}
                                onKeyDown={(event) => {
                                  if (keyboardGrabbed !== q.questionId) return;
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setKeyboardGrabbed(null);
                                    setReorderStatus('Reordering finished.');
                                  } else if (
                                    event.key === 'ArrowUp' ||
                                    event.key === 'ArrowDown'
                                  ) {
                                    event.preventDefault();
                                    const target =
                                      i + (event.key === 'ArrowUp' ? -1 : 1);
                                    if (
                                      target >= 0 &&
                                      target < payload.questions.length
                                    ) {
                                      const handle = event.currentTarget;
                                      moveQuestion(i, target);
                                      requestAnimationFrame(() =>
                                        handle.focus(),
                                      );
                                    }
                                  }
                                }}
                              >
                                <span aria-hidden="true">⠿</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="ia-question-select"
                              aria-current={
                                state.index === i ? 'step' : undefined
                              }
                              onClick={() => controller.question(i)}
                            >
                              {i + 1}. {q.title || 'Untitled question'}
                            </button>
                          </li>
                        ))}
                      </ol>
                      <p className="ia-hint" role="status" aria-live="polite">
                        {reorderStatus}
                      </p>
                      {!readOnly && (
                        <Action
                          variant="secondary"
                          disabled={locked || payload.questions.length >= 20}
                          onClick={addQuestion}
                        >
                          <Icon name="plus" /> Add question
                        </Action>
                      )}
                    </aside>
                  ) : (
                    <div className="ia-empty">
                      <h3>No questions yet.</h3>
                      <Action disabled={locked} onClick={addQuestion}>
                        <Icon name="plus" /> Add question
                      </Action>
                    </div>
                  )}
                  {question && (
                    <>
                      <div className="cw-workbook">
                        <section className="cw-workbook-brief">
                          <details open className="ia-brief">
                            <summary>
                              Question {state.index + 1} · Instructions
                            </summary>
                            <h2 ref={questionHeading} tabIndex={-1}>
                              {question.title || 'Untitled question'}
                            </h2>
                            {readOnly ? (
                              <p className="ia-instructions">
                                {question.instructions}
                              </p>
                            ) : (
                              <>
                                <Field label="Question title">
                                  <input
                                    maxLength={200}
                                    readOnly={locked}
                                    value={question.title}
                                    placeholder="e.g. Count the items"
                                    onChange={(event) =>
                                      editQuestion({
                                        title: event.target.value,
                                      })
                                    }
                                  />
                                </Field>
                                <InstructionEditor
                                  key={question.questionId}
                                  readOnly={locked}
                                  value={question.instructions}
                                  onChange={(instructions) =>
                                    editQuestion({ instructions })
                                  }
                                />
                                <details className="ia-options">
                                  <summary>Question options</summary>
                                  <div className="ia-actions">
                                    <Action
                                      variant="secondary"
                                      disabled={locked}
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            'Remove this question from the draft? Published versions will stay unchanged.',
                                          )
                                        ) {
                                          edit({
                                            ...payload,
                                            questions: payload.questions.filter(
                                              (_, i) => i !== state.index,
                                            ),
                                          });
                                          controller.question(
                                            Math.max(0, state.index - 1),
                                          );
                                        }
                                      }}
                                    >
                                      Remove question
                                    </Action>
                                  </div>
                                </details>
                              </>
                            )}
                          </details>
                        </section>
                        <section
                          className="cw-workbook-work"
                          aria-label="Code and marking rubric"
                        >
                          {readOnly ? (
                            <Code
                              label="Starter code (Python)"
                              source={question.starterCode}
                            />
                          ) : (
                            <Field label="Starter code (Python)">
                              <PythonEditor
                                label="Starter code (Python)"
                                readOnly={locked}
                                value={question.starterCode}
                                onChange={(value) =>
                                  editQuestion({
                                    starterCode: value,
                                  })
                                }
                              />
                            </Field>
                          )}
                          <details
                            className="ia-reference"
                            key={
                              'reference-' +
                              question.questionId +
                              (readOnly ? '-published' : '-draft')
                            }
                          >
                            <summary>
                              <Icon name="lock" /> Reference solution{' '}
                              <span className="ia-hint">Instructor only</span>
                            </summary>
                            {readOnly ? (
                              <Code
                                label="Reference solution (private)"
                                source={question.privateReference}
                              />
                            ) : (
                              <Field label="Reference code">
                                <PythonEditor
                                  label="Reference code"
                                  readOnly={locked}
                                  value={question.privateReference}
                                  onChange={(value) =>
                                    editQuestion({
                                      privateReference: value,
                                    })
                                  }
                                />
                              </Field>
                            )}
                          </details>
                          <div className="ia-rubric-heading">
                            <h3>Marking rubric</h3>
                          </div>
                          {question.criteria.length === 0 && (
                            <p className="ia-hint">
                              Add at least one criterion before publishing.
                            </p>
                          )}
                          {question.criteria.map((criterion, index) => {
                            const change = (value: Partial<typeof criterion>) =>
                              editQuestion({
                                criteria: question.criteria.map((c, i) =>
                                  i === index ? { ...c, ...value } : c,
                                ),
                              });
                            return readOnly ? (
                              <div
                                className="ia-published-criterion"
                                key={criterion.criterionId}
                              >
                                <h4>{criterion.comparisonKey}</h4>
                                <p>{criterion.descriptor}</p>
                                <p className="ia-hint">
                                  {criterion.minimumScore}–
                                  {criterion.maximumScore} points
                                </p>
                              </div>
                            ) : (
                              <fieldset
                                className="ia-criterion"
                                key={criterion.criterionId}
                              >
                                <legend>Criterion {index + 1}</legend>
                                <Field label="Name">
                                  <input
                                    maxLength={128}
                                    readOnly={locked}
                                    value={criterion.comparisonKey}
                                    placeholder="e.g. Correctness"
                                    onChange={(event) =>
                                      change({
                                        comparisonKey: event.target.value,
                                      })
                                    }
                                  />
                                </Field>
                                <Field label="Scoring guidance">
                                  <textarea
                                    rows={3}
                                    maxLength={4000}
                                    readOnly={locked}
                                    value={criterion.descriptor}
                                    placeholder="Describe what earns these points."
                                    onChange={(event) =>
                                      change({ descriptor: event.target.value })
                                    }
                                  />
                                </Field>
                                <div className="ia-score">
                                  {criterion.minimumScore !== null &&
                                    criterion.minimumScore !== 0 && (
                                      <p className="ia-hint">
                                        Existing minimum:{' '}
                                        {criterion.minimumScore} points
                                      </p>
                                    )}
                                  <Field label="Maximum points">
                                    <input
                                      type="number"
                                      min="0"
                                      max="1000"
                                      step="0.01"
                                      readOnly={locked}
                                      value={criterion.maximumScore ?? ''}
                                      placeholder="e.g. 10"
                                      onChange={(event) =>
                                        change({
                                          minimumScore:
                                            criterion.minimumScore ?? 0,
                                          maximumScore:
                                            event.target.value === ''
                                              ? null
                                              : Number(event.target.value),
                                        })
                                      }
                                    />
                                  </Field>
                                </div>
                                <Action
                                  className="ia-remove"
                                  variant="secondary"
                                  disabled={locked}
                                  onClick={() =>
                                    editQuestion({
                                      criteria: question.criteria.filter(
                                        (_, i) => i !== index,
                                      ),
                                    })
                                  }
                                >
                                  Remove criterion {index + 1}
                                </Action>
                              </fieldset>
                            );
                          })}
                          {!readOnly && (
                            <Action
                              variant="secondary"
                              disabled={
                                locked || question.criteria.length >= 50
                              }
                              onClick={() =>
                                editQuestion({
                                  criteria: [
                                    ...question.criteria,
                                    {
                                      criterionId: key(),
                                      comparisonKey: '',
                                      descriptor: '',
                                      minimumScore: 0,
                                      maximumScore: null,
                                    },
                                  ],
                                })
                              }
                            >
                              <Icon name="plus" /> Add criterion
                            </Action>
                          )}
                        </section>
                      </div>
                      {readOnly ? (
                        <nav
                          className="cw-question-navigation"
                          aria-label="Published question navigation"
                        >
                          <Action
                            variant="secondary"
                            disabled={state.index === 0}
                            onClick={() => controller.question(state.index - 1)}
                          >
                            Previous question
                          </Action>
                          <p
                            className="cw-navigation-position"
                            aria-live="polite"
                          >
                            Question {state.index + 1} of{' '}
                            {payload.questions.length}
                          </p>
                          <Action
                            onClick={() => {
                              if (state.index < payload.questions.length - 1)
                                controller.question(state.index + 1);
                              else setVersionSummary(true);
                            }}
                          >
                            {state.index === payload.questions.length - 1
                              ? 'Version summary'
                              : 'Next question'}
                          </Action>
                        </nav>
                      ) : (
                        <QuestionNavigation
                          index={state.index}
                          count={payload.questions.length}
                          pending={state.pending === 'Publishing'}
                          onPrevious={() =>
                            controller.question(state.index - 1)
                          }
                          onNext={() => {
                            if (state.index < payload.questions.length - 1)
                              controller.question(state.index + 1);
                            else controller.review();
                          }}
                        />
                      )}
                    </>
                  )}
                </section>
              </>
            )}
            {!state.review && (
              <details
                className="ia-history"
                open={previewFailure || undefined}
              >
                <summary>
                  Version history{' '}
                  <span>
                    {state.history.length > 0
                      ? state.history.length + ' published'
                      : ''}
                  </span>
                </summary>
                <div>
                  {state.history.length === 0 && (
                    <p className="ia-hint">No published versions loaded.</p>
                  )}
                  <p className="ia-hint">
                    Published versions are read only. Latest 100 shown.
                  </p>
                  <ul>
                    {state.history.map((version) => (
                      <li key={version.assignmentVersionId}>
                        <div>
                          <strong>Version {version.publicationNumber}</strong>
                          <p>Published {dateText(version.publishedAt)}</p>
                        </div>
                        <Action
                          variant="secondary"
                          disabled={!!state.pending}
                          onClick={() =>
                            void controller.historical(
                              version.assignmentVersionId,
                            )
                          }
                        >
                          View version {version.publicationNumber}
                        </Action>
                      </li>
                    ))}
                  </ul>
                  <Action
                    variant="secondary"
                    disabled={!!state.pending}
                    onClick={() => void controller.retryHistory()}
                  >
                    <Icon name="refresh" /> Refresh
                  </Action>
                </div>
              </details>
            )}
          </>
        )}
        {editorPage && state.denied && (
          <section className="ia-empty">
            <h2>Access is required</h2>
            <p>
              {preview
                ? 'Your unsaved changes are retained, but hidden. Open this local preview in another tab to renew its fixture session, then retry here.'
                : 'Your unsaved changes are retained, but hidden. Sign in again in another tab, then retry here.'}
            </p>
            <Action
              pending={!!state.pending}
              onClick={() => void controller.recoverAccess()}
            >
              Retry access
            </Action>
          </section>
        )}
      </main>
    </div>
  );
}
