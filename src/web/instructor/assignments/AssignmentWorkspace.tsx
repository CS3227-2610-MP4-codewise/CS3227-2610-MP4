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
import { Action, StatusMessage, QuestionNavigation } from '../../ui/primitives';
import {
  AssignmentController,
  singaporeInput,
  singaporeUtc,
  errorMessage,
} from './controller';
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
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ia-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function AssignmentWorkspace({ client }: { client: AssignmentClient }) {
  const [assignmentId] = useState(() =>
    new URLSearchParams(window.location.search).get('assignment'),
  );
  const editorPage = assignmentId !== null;
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const [controller] = useState(() => new AssignmentController(client));
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const [rows, setRows] = useState<DraftSummary[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [listing, setListing] = useState(false),
    [listMessage, setListMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const [versionSummary, setVersionSummary] = useState(false);
  async function list(after = '') {
    setListing(true);
    try {
      const result = await client.list(after);
      setRows((previous) =>
        after ? [...previous, ...result.items] : result.items,
      );
      setCursor(result.nextCursor);
      setListMessage(
        result.items.length
          ? ''
          : 'No assignments yet. Create your first draft.',
      );
    } catch (e) {
      setListMessage(errorMessage(e));
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
    heading.current?.focus();
  }, [
    state.index,
    state.review,
    state.snapshot?.assignmentVersionId,
    versionSummary,
  ]);
  useEffect(() => {
    setVersionSummary(false);
  }, [state.snapshot?.assignmentVersionId]);
  useEffect(() => {
    const protect = (e: BeforeUnloadEvent) => {
      if (state.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [state.dirty]);
  const allowLeave = () =>
    !state.dirty ||
    window.confirm(
      'Unsaved edits will be discarded from this view. Cancel to save or copy your work first. Continue?',
    );
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
  const question = payload?.questions[state.index];
  const readOnly = !!state.snapshot,
    locked =
      readOnly ||
      ['Publishing', 'Opening', 'Creating'].includes(state.pending ?? '');
  const edit = (next: Authoring) => controller.edit(next);
  const editorUrl = (id: string) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('assignment', id);
    return url.href;
  };
  const editQuestion = (value: Partial<Question>) => {
    if (!state.payload) return;
    edit({
      ...state.payload,
      questions: state.payload.questions.map((q, i) =>
        i === state.index ? { ...q, ...value } : q,
      ),
    });
  };
  const move = (delta: number) => {
    if (!state.payload) return;
    const questions = [...state.payload.questions],
      target = state.index + delta;
    [questions[state.index], questions[target]] = [
      questions[target],
      questions[state.index],
    ];
    edit({ ...state.payload, questions });
    controller.question(target);
  };
  return (
    <div className="cw-shell ia-workspace">
      <a className="cw-skip-link" href="#assignment-work">
        Skip to assignment
      </a>
      <header className="cw-header">
        <div className="cw-wordmark">
          code<span>wise</span>
        </div>
        <p className="cw-header-context">
          Synthetic course · Instructor fixture
          <br />
          Local development only · real sign-in integration pending
        </p>
        <Field label="Preview appearance">
          <select
            defaultValue="light dark"
            onChange={(e) => {
              document.documentElement.style.colorScheme = e.target.value;
            }}
          >
            <option value="light dark">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
      </header>
      <div className="cw-page-title">
        <p className="cw-kicker">Instructor workbook</p>
        {editorPage && (
          <div className="ia-actions">
            <Action
              variant="secondary"
              disabled={!!state.pending}
              onClick={() => window.location.assign(window.location.pathname)}
            >
              Back to assignments
            </Action>
          </div>
        )}
        <h1 ref={pageHeading} tabIndex={-1}>
          {editorPage
            ? state.denied
              ? 'Assignment unavailable'
              : payload?.title || 'New assignment'
            : 'Assignments'}
        </h1>
        <p>
          Build questions and rubrics in a draft. Publish a fixed version when
          it is ready.
        </p>
      </div>
      <main id="assignment-work">
        {!editorPage && (
          <section aria-label="Assignment list" className="ia-list">
            <div className="ia-actions">
              <Action
                pending={!!state.pending}
                onClick={() => {
                  void controller.create().then((draft) => {
                    if (draft)
                      window.location.assign(editorUrl(draft.assignmentId));
                  });
                }}
              >
                New assignment
              </Action>
              <Action
                variant="secondary"
                pending={listing}
                onClick={() => void list()}
              >
                Refresh assignments
              </Action>
            </div>
            {listMessage && <StatusMessage>{listMessage}</StatusMessage>}
            <ul>
              {rows.map((row) => (
                <li key={row.assignmentId}>
                  <div>
                    <strong>{row.title || 'Untitled assignment'}</strong>
                    <p>Draft · revision {row.revision}</p>
                  </div>
                  <Action
                    variant="secondary"
                    disabled={!!state.pending}
                    onClick={() => {
                      window.location.assign(editorUrl(row.assignmentId));
                    }}
                    aria-label={`Open ${row.title || 'untitled assignment'}`}
                  >
                    Open draft
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
                More assignments
              </Action>
            )}
          </section>
        )}
        <div className="ia-status">
          <StatusMessage
            tone={
              state.error
                ? 'error'
                : state.message.startsWith('Saved') ||
                    state.message.startsWith('Published')
                  ? 'success'
                  : 'neutral'
            }
          >
            {state.pending === 'Creating'
              ? 'Creating assignment…'
              : state.message}
          </StatusMessage>
        </div>
        {editorPage && payload && !state.denied && (
          <>
            <section className="ia-metadata" aria-label="Assignment details">
              <h2>
                {readOnly
                  ? `Published version ${state.snapshot!.publicationNumber}`
                  : 'Assignment draft'}
              </h2>
              <p className="ia-context">
                {readOnly
                  ? `Immutable · source draft revision ${state.snapshot!.sourceDraftRevision}`
                  : `Saved base revision ${state.draft!.revision}${state.dirty ? ' · local edits unsaved' : ''}`}{' '}
                · Python · one source file per question
              </p>
              <Field label="Assignment title">
                <input
                  maxLength={200}
                  value={payload.title}
                  readOnly={locked}
                  onChange={(e) => edit({ ...payload, title: e.target.value })}
                />
              </Field>
              <Field label="Deadline · Singapore (UTC+08:00)">
                <input
                  type="datetime-local"
                  value={singaporeInput(payload.deadlineAt)}
                  readOnly={locked}
                  onChange={(e) =>
                    edit({
                      ...payload,
                      deadlineAt: singaporeUtc(e.target.value),
                    })
                  }
                />
              </Field>
              <div className="ia-actions">
                {readOnly ? (
                  <Action
                    variant="secondary"
                    onClick={() => controller.returnToDraft()}
                  >
                    Return to draft
                  </Action>
                ) : (
                  <>
                    <Action
                      pending={state.pending === 'Saving'}
                      disabled={!!state.pending || !state.dirty}
                      onClick={() => void controller.save().then(() => list())}
                    >
                      Save draft
                    </Action>
                    <Action
                      variant="secondary"
                      disabled={!!state.pending}
                      onClick={() => controller.review()}
                    >
                      Review publication
                    </Action>
                    <Action
                      variant="secondary"
                      disabled={!!state.pending}
                      onClick={() => {
                        if (allowLeave())
                          void controller.open(state.draft!.assignmentId);
                      }}
                    >
                      Reopen saved draft
                    </Action>
                  </>
                )}
              </div>
            </section>
            {state.snapshot && versionSummary ? (
              <section className="ia-review">
                <h2 ref={heading} tabIndex={-1}>
                  Published version summary
                </h2>
                <p>
                  Version {state.snapshot.publicationNumber} · saved draft
                  revision {state.snapshot.sourceDraftRevision}. This immutable
                  version contains {payload.questions.length} questions.
                </p>
                <ol>
                  {payload.questions.map((q) => (
                    <li key={q.questionId}>
                      {q.title} · {q.criteria.length} criteria
                    </li>
                  ))}
                </ol>
                <Action
                  variant="secondary"
                  onClick={() => setVersionSummary(false)}
                >
                  Return to published questions
                </Action>
              </section>
            ) : state.review ? (
              <section className="ia-review" aria-labelledby="review-heading">
                <h2 ref={heading} tabIndex={-1} id="review-heading">
                  Review publication
                </h2>
                <p>
                  Publish saved revision {state.draft!.revision} of “
                  {payload.title}”. This creates an immutable version.
                  Subsequent edits stay in the draft.
                </p>
                <ol>
                  {payload.questions.map((q) => (
                    <li key={q.questionId}>
                      {q.title} · {q.criteria.length} criteria · private
                      reference kept instructor-only
                    </li>
                  ))}
                </ol>
                <div className="ia-actions">
                  <Action
                    pending={state.pending === 'Publishing'}
                    disabled={!!state.pending}
                    onClick={() => void controller.publish()}
                  >
                    Confirm publication
                  </Action>
                  <Action
                    variant="secondary"
                    disabled={!!state.pending}
                    onClick={() => controller.question(state.index)}
                  >
                    Back to editing
                  </Action>
                </div>
              </section>
            ) : (
              <>
                <div className="ia-actions">
                  <Field label="Question">
                    <select
                      value={state.index}
                      onChange={(e) =>
                        controller.question(Number(e.target.value))
                      }
                      disabled={
                        !payload.questions.length ||
                        state.pending === 'Publishing'
                      }
                    >
                      {payload.questions.map((q, i) => (
                        <option key={q.questionId} value={i}>
                          {i + 1}. {q.title || 'Untitled question'}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {!readOnly && (
                    <Action
                      variant="secondary"
                      disabled={locked || payload.questions.length >= 20}
                      onClick={() => {
                        edit({
                          ...payload,
                          questions: [...payload.questions, newQuestion()],
                        });
                        controller.question(payload.questions.length);
                      }}
                    >
                      Add question
                    </Action>
                  )}
                </div>
                {question ? (
                  <>
                    <div className="cw-workbook">
                      <section className="cw-workbook-brief">
                        <details open className="ia-brief">
                          <summary>Question {state.index + 1} brief</summary>
                          <h2 ref={heading} tabIndex={-1}>
                            Question {state.index + 1}:{' '}
                            {question.title || 'Untitled'}
                          </h2>
                          <Field label="Question title">
                            <input
                              maxLength={200}
                              readOnly={locked}
                              value={question.title}
                              onChange={(e) =>
                                editQuestion({ title: e.target.value })
                              }
                            />
                          </Field>
                          <Field label="Instructions">
                            <textarea
                              rows={6}
                              maxLength={16384}
                              readOnly={locked}
                              value={question.instructions}
                              onChange={(e) =>
                                editQuestion({ instructions: e.target.value })
                              }
                            />
                          </Field>
                          {!readOnly && (
                            <div className="ia-actions">
                              <Action
                                variant="secondary"
                                disabled={locked || state.index === 0}
                                onClick={() => move(-1)}
                              >
                                Move earlier
                              </Action>
                              <Action
                                variant="secondary"
                                disabled={
                                  locked ||
                                  state.index === payload.questions.length - 1
                                }
                                onClick={() => move(1)}
                              >
                                Move later
                              </Action>
                              <Action
                                variant="secondary"
                                disabled={locked}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      'Remove this question from the draft? Published versions stay unchanged.',
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
                          )}
                        </details>
                      </section>
                      <section
                        className="cw-workbook-work"
                        aria-label="Question source and rubric"
                      >
                        <h3>Source</h3>
                        <Field label="Starter source · Python">
                          <textarea
                            className="ia-source"
                            rows={8}
                            spellCheck={false}
                            readOnly={locked}
                            value={question.starterCode}
                            onChange={(e) =>
                              editQuestion({ starterCode: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Private reference · instructor only">
                          <textarea
                            className="ia-source"
                            rows={8}
                            spellCheck={false}
                            readOnly={locked}
                            value={question.privateReference}
                            onChange={(e) =>
                              editQuestion({ privateReference: e.target.value })
                            }
                          />
                        </Field>
                        <p className="ia-context">
                          Source is stored with LF line endings. Each source
                          field is limited to 32 KiB. Code is never executed.
                        </p>
                        <h3>Criterion rubric</h3>
                        {question.criteria.length === 0 && (
                          <p>
                            No criteria yet. Add at least one before publishing.
                          </p>
                        )}
                        {question.criteria.map((c, i) => {
                          const change = (value: Partial<typeof c>) =>
                            editQuestion({
                              criteria: question.criteria.map((v, j) =>
                                j === i ? { ...v, ...value } : v,
                              ),
                            });
                          return (
                            <fieldset
                              className="ia-criterion"
                              key={c.criterionId}
                            >
                              <legend>Criterion {i + 1}</legend>
                              <Field
                                label={`Criterion ${i + 1} comparison key`}
                              >
                                <input
                                  maxLength={128}
                                  readOnly={locked}
                                  value={c.comparisonKey}
                                  onChange={(e) =>
                                    change({ comparisonKey: e.target.value })
                                  }
                                />
                              </Field>
                              <Field label={`Criterion ${i + 1} descriptor`}>
                                <textarea
                                  rows={3}
                                  maxLength={4000}
                                  readOnly={locked}
                                  value={c.descriptor}
                                  onChange={(e) =>
                                    change({ descriptor: e.target.value })
                                  }
                                />
                              </Field>
                              <div className="ia-score">
                                <Field
                                  label={`Criterion ${i + 1} minimum score`}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    max="1000"
                                    step="0.01"
                                    readOnly={locked}
                                    value={c.minimumScore ?? ''}
                                    onChange={(e) =>
                                      change({
                                        minimumScore:
                                          e.target.value === ''
                                            ? null
                                            : Number(e.target.value),
                                      })
                                    }
                                  />
                                </Field>
                                <Field
                                  label={`Criterion ${i + 1} maximum score`}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    max="1000"
                                    step="0.01"
                                    readOnly={locked}
                                    value={c.maximumScore ?? ''}
                                    onChange={(e) =>
                                      change({
                                        maximumScore:
                                          e.target.value === ''
                                            ? null
                                            : Number(e.target.value),
                                      })
                                    }
                                  />
                                </Field>
                              </div>
                              {!readOnly && (
                                <Action
                                  variant="secondary"
                                  disabled={locked}
                                  onClick={() =>
                                    editQuestion({
                                      criteria: question.criteria.filter(
                                        (_, j) => j !== i,
                                      ),
                                    })
                                  }
                                >
                                  Remove criterion {i + 1}
                                </Action>
                              )}
                            </fieldset>
                          );
                        })}
                        {!readOnly && (
                          <Action
                            variant="secondary"
                            disabled={locked || question.criteria.length >= 50}
                            onClick={() =>
                              editQuestion({
                                criteria: [
                                  ...question.criteria,
                                  {
                                    criterionId: key(),
                                    comparisonKey: '',
                                    descriptor: '',
                                    minimumScore: null,
                                    maximumScore: null,
                                  },
                                ],
                              })
                            }
                          >
                            Add criterion
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
                        onPrevious={() => controller.question(state.index - 1)}
                        onNext={() => {
                          if (state.index < payload.questions.length - 1)
                            controller.question(state.index + 1);
                          else if (readOnly) heading.current?.focus();
                          else controller.review();
                        }}
                        finalLabel="Review assignment"
                      />
                    )}
                  </>
                ) : (
                  <StatusMessage>
                    No questions yet. Add a question to start authoring.
                  </StatusMessage>
                )}
              </>
            )}
            <section className="ia-history" aria-label="Publication history">
              <h2>Published versions</h2>
              <Action
                variant="secondary"
                disabled={!!state.pending}
                onClick={() => void controller.retryHistory()}
              >
                Refresh versions
              </Action>
              {state.history.length === 0 ? (
                <p>No published versions.</p>
              ) : (
                <ul>
                  {state.history.map((v) => (
                    <li key={v.assignmentVersionId}>
                      <div>
                        <strong>Version {v.publicationNumber}</strong>
                        <p>
                          Draft revision {v.sourceDraftRevision} ·{' '}
                          {new Date(v.publishedAt).toLocaleString('en-SG', {
                            timeZone: 'Asia/Singapore',
                          })}{' '}
                          Singapore
                        </p>
                      </div>
                      <Action
                        variant="secondary"
                        disabled={!!state.pending}
                        onClick={() =>
                          void controller.historical(v.assignmentVersionId)
                        }
                      >
                        View version {v.publicationNumber}
                      </Action>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        {state.denied && (
          <div>
            <p>
              Protected content is hidden. Open this local preview in another
              tab to renew the fixture session, then retry access here. Your
              unsaved edits stay in memory.
            </p>
            <Action
              pending={!!state.pending}
              onClick={() => void controller.recoverAccess()}
            >
              Retry access
            </Action>
          </div>
        )}
      </main>
      <footer className="cw-footer">
        <p>Instructor authoring · warm-workbook-v1</p>
        <p>Synthetic identity/course adapter · no live integration</p>
      </footer>
    </div>
  );
}
