import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react';
import { authViewSchema, type AuthView } from '../../shared/auth';
import type { Publication } from '../../shared/instructor-contracts/publication';
import type { WorkResponse } from '../../shared/student-work';
import { authRequest } from '../auth/client';
import { AccountMenu } from '../ui/account-menu';
import { Brand, Icon } from '../ui/brand';
import { InstructionText } from '../ui/instruction-text';
import { Action, QuestionNavigation } from '../ui/primitives';
import { WorkspaceSwitch } from '../ui/workspace-switch';
import {
  AttemptView,
  FeedbackPanel,
  SubmittedPanel,
  useAttemptContext,
} from './Attempts';
import { CodeEditor, type CodeEditorHandle } from './CodeEditor';
import { ConflictWindow } from './ConflictWindow';
import { Review } from './Review';
import {
  formatDeadline,
  formatPoints,
  parseStudentRoute,
  studentPaths,
  type StudentRoute,
} from './model';
import {
  ApiError,
  BackupStore,
  DraftController,
  clearAllBackups,
  workApi,
  type DraftItem,
} from './work-model';
// Workbook is also rendered on its own (lazy chunk, review harness); its link targets rely on
// the student stylesheet, so import it explicitly rather than through StudentWorkspace.
import './student.css';
import './workbook.css';

type WorkRoute = Extract<StudentRoute, { kind: 'work' }>;
type LoadFailure = 'session' | 'unavailable' | 'network';
type State =
  | { phase: 'loading' }
  | { phase: 'failed'; failure: LoadFailure }
  | {
      phase: 'ready';
      work: WorkResponse;
      pub: Publication;
      userId: string;
    };

const loadText: Record<LoadFailure, string> = {
  session: 'Your session has ended. Sign in again to continue.',
  unavailable: 'This is not available to you.',
  network: 'This could not be loaded. Check your connection and try again.',
};

/** Presentation text for the save state; "Saved" is claimed only for an acknowledged displayed revision. */
export function saveLabel(item: DraftItem): string {
  switch (item.status) {
    case 'conflict':
      return item.recovered
        ? 'Unsaved copy found. Choose a version.'
        : 'Conflict. Choose a version.';
    case 'failed':
      return item.failure === 'session'
        ? 'Not saved. Your session has ended.'
        : item.failure === 'unavailable'
          ? 'Not saved. This work is no longer available.'
          : item.failure === 'too-large'
            ? 'Not saved. The text is over 32 KiB.'
            : item.failure === 'invalid'
              ? 'Not saved. The server rejected this text.'
              : item.failure === 'rate-limited'
                ? 'Saving paused for a moment. Your text is kept and will be saved automatically.'
                : 'Not saved. Connection problem.';
    case 'saving':
      return 'Saving…';
    case 'unsaved':
      return 'Unsaved changes';
    default:
      return item.baseRevision === 0
        ? 'Starter code. Not saved yet.'
        : `Saved. Revision ${item.baseRevision}.`;
  }
}
const SYMBOL: Record<DraftItem['status'], string> = {
  saved: '✓',
  saving: '…',
  unsaved: '●',
  conflict: '≠',
  failed: '✕',
};

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** SW-01–SW-08, UI-04/05/07/08: the student workbook for one pinned publication. */
export function Workbook({ route }: { route: WorkRoute }) {
  const [view, setView] = useState<AuthView | null>(null);
  const [state, setState] = useState<State>({ phase: 'loading' });
  const [announcement, setAnnouncement] = useState('');
  const [sessionEnded, setSessionEnded] = useState(false);
  const [accountChanged, setAccountChanged] = useState(false);
  const csrf = useRef('');
  const api = useMemo(() => workApi(undefined, () => csrf.current), []);
  const ctl = useRef<DraftController | null>(null);
  const loadedUser = useRef('');
  const [reloadKey, setReloadKey] = useState(0);
  const failedHeading = useRef<HTMLHeadingElement>(null);
  const failedPhase = state.phase === 'failed';
  useEffect(() => {
    if (failedPhase) failedHeading.current?.focus();
  }, [failedPhase]);

  const sessionLost = useCallback(() => {
    ctl.current?.sessionLost();
    setSessionEnded(true);
  }, []);

  // ---- load: session, then work and publication together
  useEffect(() => {
    let active = true;
    setState({ phase: 'loading' });
    (async () => {
      let session: AuthView;
      try {
        session = authViewSchema.parse(await authRequest('session'));
      } catch {
        throw new ApiError('session');
      }
      csrf.current = session.csrfToken;
      loadedUser.current = session.session.userId;
      if (active) setView(session);
      const [work, pub] = await Promise.all([
        api.work(route.versionId),
        api.publication(route.versionId),
      ]);
      if (pub.assignmentVersionId !== route.versionId)
        throw new ApiError('unavailable');
      const controller = new DraftController({
        save: (qv, base, src) => api.save(qv, base, src),
        backup: new BackupStore(session.session.userId, route.versionId),
        onSession: () => setSessionEnded(true),
        announce: setAnnouncement,
      });
      controller.load(work.questions);
      if (!active) {
        controller.dispose(false);
        return;
      }
      ctl.current?.dispose(false);
      ctl.current = controller;
      setSessionEnded(false);
      setState({ phase: 'ready', work, pub, userId: session.session.userId });
    })().catch((error: unknown) => {
      if (!active) return;
      const kind = error instanceof ApiError ? error.kind : 'network';
      if (kind === 'session') clearAllBackups();
      setState({
        phase: 'failed',
        failure:
          kind === 'session' || kind === 'unavailable' ? kind : 'network',
      });
    });
    return () => {
      active = false;
      // Unmounting stops timers but keeps the per-tab backup for a reload.
      ctl.current?.dispose(false);
    };
  }, [api, route.versionId, reloadKey]);

  // ---- revalidate on focus: a different account clears everything; 401 ends the session
  useEffect(() => {
    const revalidate = () => {
      authRequest('session')
        .then((body) => {
          const next = authViewSchema.parse(body);
          csrf.current = next.csrfToken;
          if (
            loadedUser.current &&
            next.session.userId !== loadedUser.current
          ) {
            ctl.current?.dispose(true);
            setAccountChanged(true);
            setState({ phase: 'failed', failure: 'unavailable' });
          } else setView(next);
        })
        .catch((error: unknown) => {
          if (
            error instanceof Error &&
            'code' in error &&
            (error as { code: string }).code === 'UNAUTHENTICATED'
          )
            sessionLost();
        });
    };
    window.addEventListener('focus', revalidate);
    return () => window.removeEventListener('focus', revalidate);
  }, [sessionLost]);

  // ---- leaving the page: flush what we can; warn if text is unsaved
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === 'hidden') void ctl.current?.flushAll();
    };
    const warn = (event: BeforeUnloadEvent) => {
      if (ctl.current?.all().some((i) => i.source !== i.ackSource))
        event.preventDefault();
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('beforeunload', warn);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('beforeunload', warn);
    };
  }, []);

  const signOut = () => {
    ctl.current?.dispose(true);
    clearAllBackups();
    return authRequest('logout', view?.csrfToken, {})
      .then(() => window.location.assign('/sign-in'))
      .catch(() => setAnnouncement('Could not sign out. Try again.'));
  };

  return (
    <div className="cw-shell">
      <a className="cw-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="cw-header">
        <Brand />
        <nav className="cw-app-nav" aria-label="Main navigation">
          {view && <WorkspaceSwitch role="student" />}
          <a href={studentPaths.courses()}>
            <Icon name="folder" /> Courses
          </a>
          {view && <AccountMenu email={view.email} onSignOut={signOut} />}
        </nav>
      </header>
      <main id="main-content" className="cw-home cw-student cw-wb">
        <p role="status" className="cw-sr-only">
          {announcement}
        </p>
        {state.phase === 'loading' && <p role="status">Loading your work…</p>}
        {state.phase === 'failed' && (
          <div className="cw-student-notice" role="alert">
            <h1 tabIndex={-1} ref={failedHeading}>
              {accountChanged ? 'Account changed' : 'Workbook unavailable'}
            </h1>
            <p>
              {accountChanged
                ? 'This browser is now signed in as a different account. Local drafts for the previous account were removed from this tab.'
                : loadText[state.failure]}
            </p>
            <div className="cw-course-actions">
              {state.failure === 'session' && (
                <a className="cw-action cw-action--primary" href="/sign-in">
                  Sign in
                </a>
              )}
              {state.failure === 'network' && (
                <Action onClick={() => setReloadKey((n) => n + 1)}>
                  Try again
                </Action>
              )}
              {(state.failure === 'unavailable' || accountChanged) && (
                <a href="/workspace">Go to an available workspace</a>
              )}
            </div>
          </div>
        )}
        {state.phase === 'ready' && ctl.current && (
          <Ready
            route={route}
            state={state}
            ctl={ctl.current}
            api={api}
            sessionEnded={sessionEnded}
            onSession={sessionLost}
            onRefresh={async () => {
              const fresh = await api.work(route.versionId);
              ctl.current?.reconcile(fresh.questions);
              setState({ ...state, work: fresh });
            }}
            setWork={(work) => setState({ ...state, work })}
          />
        )}
      </main>
    </div>
  );
}

type MovePlanItem = {
  id: string;
  position: number;
  title: string;
  fromQuestionVersionId: string;
  targetQuestionVersionId: string;
  /** Revision currently stored on the newer version; sent as targetBaseRevision. */
  targetRevision: number;
  targetSource: string;
};
type MoveState =
  | { phase: 'idle' }
  | { phase: 'confirm' }
  | { phase: 'pending' }
  | {
      phase: 'choose';
      plan: MovePlanItem[];
      unmatched: number;
      note: string;
    }
  | { phase: 'done'; moved: number; kept: number }
  | { phase: 'error'; message: string };

function Ready({
  route,
  state,
  ctl,
  api,
  sessionEnded,
  onSession,
  onRefresh,
  setWork,
}: {
  route: WorkRoute;
  state: Extract<State, { phase: 'ready' }>;
  ctl: DraftController;
  api: ReturnType<typeof workApi>;
  sessionEnded: boolean;
  onSession: () => void;
  onRefresh: () => Promise<void>;
  setWork: (work: WorkResponse) => void;
}) {
  const { work, pub } = state;
  useSyncExternalStore(ctl.subscribe, ctl.getVersion);
  const count = pub.questions.length;
  const clamp = (n: number) => Math.min(Math.max(n, 1), count);
  // Unclamped (1–20, from the address): a historical view clamps it to the attempt's own pinned
  // publication, the working copy to the route's (SQ-06).
  const [position, setPosition] = useState(route.position);
  const [mode, setMode] = useState<'question' | 'review' | 'summary'>(
    'question',
  );
  // SQ-05: the view and attempt start from the address and are re-authorized by every read.
  const [answerView, setAnswerView] = useState<AnswerView>(
    route.view ?? 'work',
  );
  const [historyOpened, setHistoryOpened] = useState(false);
  // SQ-05/UI-05: the next address write is a new history entry (a student action) rather than a
  // replacement (latest-attempt resolution, clamping, dropping a damaged query).
  const pushNext = useRef(false);
  const [attemptsKey, setAttemptsKey] = useState(0);
  const [block, setBlock] = useState<null | {
    target: number | 'review' | 'summary';
  }>(null);
  const [move, setMove] = useState<MoveState>({ phase: 'idle' });
  const [navPending, setNavPending] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  // UI-07/UI-08: after a conflict choice the window unmounts; move focus into the editor that
  // replaces it instead of dropping it on the document.
  const focusEditorNext = useRef(false);
  const editorMounted = useCallback((h: CodeEditorHandle | null) => {
    if (h && focusEditorNext.current) {
      focusEditorNext.current = false;
      h.focus();
    }
  }, []);
  const now = useNow();

  // SQ-01/06: the attempt selection lives above the views so it survives view switches. History
  // is read only once a historical view has been opened.
  const attemptCtx = useAttemptContext({
    api,
    versionId: route.versionId,
    publication: pub,
    reloadKey: attemptsKey,
    enabled: historyOpened || answerView !== 'work',
    initial: route.attempt ?? null,
  });
  const showView = (next: AnswerView) => {
    pushNext.current = true;
    setAnswerView(next);
    if (next !== 'work') setHistoryOpened(true);
  };
  // The panels' selector is a student action, so it pushes; programmatic selection does not.
  const panelCtx = {
    ...attemptCtx,
    select: (id: string | null) => {
      pushNext.current = true;
      attemptCtx.select(id);
    },
  };
  const historical = answerView !== 'work';
  // In a historical view the question pane, position and Previous/Next follow the selected
  // attempt's own pinned publication; the working copy always follows the route's.
  const viewPub = historical && attemptCtx.pub ? attemptCtx.pub : pub;
  const viewCount = viewPub.questions.length;
  const workPos = clamp(position);
  const shownPos = historical
    ? Math.min(Math.max(position, 1), viewCount)
    : workPos;
  const question = viewPub.questions[shownPos - 1];
  const workQuestion = pub.questions[workPos - 1];
  const histPending = historical && attemptCtx.pending;
  const otherVersion =
    historical &&
    attemptCtx.pub &&
    attemptCtx.pub.assignmentVersionId !== pub.assignmentVersionId
      ? attemptCtx.pub
      : null;
  const item = ctl.get(workQuestion.questionVersionId);
  const deadlinePassed = now >= Date.parse(work.deadlineAt);
  const stale = work.latestAssignmentVersionId !== work.assignmentVersionId;

  useEffect(() => {
    if (focusHeading.current) {
      focusHeading.current = false;
      heading.current?.focus();
    }
  });

  // SQ-05, UI-05: Back/Forward restore the question, view and attempt from the address.
  useEffect(() => {
    const pop = () => {
      const r = parseStudentRoute(
        window.location.pathname,
        window.location.search,
      );
      if (r?.kind !== 'work' || r.versionId !== route.versionId) return;
      pushNext.current = false;
      setPosition(r.position);
      setAnswerView(r.view ?? 'work');
      if (r.view) setHistoryOpened(true);
      attemptCtx.select(r.attempt ?? null);
      focusHeading.current = true;
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  });

  // SQ-05: the address always names what is shown. Student actions push; resolving the latest
  // attempt, clamping to the attempt's question count and dropping damaged values replace. Nothing
  // is written while the attempt's pinned publication (and so its question count) is loading.
  useEffect(() => {
    if (mode !== 'question' || histPending) return;
    const path = historical
      ? studentPaths.work(route.versionId, shownPos, {
          view: answerView,
          attempt: attemptCtx.selectedId,
        })
      : studentPaths.work(route.versionId, workPos);
    const push = pushNext.current;
    pushNext.current = false;
    if (window.location.pathname + window.location.search === path) return;
    if (push) window.history.pushState(null, '', path);
    else window.history.replaceState(null, '', path);
  });

  const commit = (target: number | 'review' | 'summary') => {
    setBlock(null);
    focusHeading.current = true;
    if (target === 'review' || target === 'summary') {
      setMode(target);
      return;
    }
    setMode('question');
    setPosition(target);
    // The address effect writes the new question (with the view and attempt) as a new entry.
    pushNext.current = true;
    announceQuestion(target);
  };
  const [live, setLive] = useState('');
  const announceQuestion = (target: number) => {
    const q = viewPub.questions[target - 1];
    // UI-05: in a historical view the announcement also names the view being kept.
    const view =
      answerView === 'submitted'
        ? ', Submitted attempt'
        : answerView === 'feedback'
          ? ', Released feedback'
          : '';
    setLive(`Question ${target} of ${viewCount}${view}: ${q.title}`);
  };

  /** Previous/Next/Review: save first; a failed or conflicting save offers a choice, never silent loss. */
  const go = async (target: number | 'review' | 'summary') => {
    if (navPending) return;
    setNavPending(true);
    try {
      // Historical views never save or block: they leave the working copy alone (SQ-01, SQ-06).
      if (mode === 'question' && answerView === 'work') {
        await ctl.flush(workQuestion.questionVersionId);
        const it = ctl.get(workQuestion.questionVersionId);
        if (it && (it.status === 'failed' || it.status === 'conflict')) {
          setBlock({ target });
          return;
        }
      }
      commit(target);
    } finally {
      setNavPending(false);
    }
  };

  /** Reads the newer version and decides what can move. Targets with work need an explicit choice. */
  const moveWork = async (note = '') => {
    setMove({ phase: 'pending' });
    try {
      await ctl.flushAll();
      if (
        ctl
          .all()
          .some(
            (i) =>
              i.status === 'failed' ||
              i.status === 'conflict' ||
              i.source !== i.ackSource,
          )
      ) {
        setMove({
          phase: 'error',
          message:
            'Some answers are not saved yet, so nothing was moved. Fix them and try again.',
        });
        return;
      }
      const latestId = work.latestAssignmentVersionId;
      const [latestPub, latestWork] = await Promise.all([
        api.publication(latestId),
        api.work(latestId),
      ]);
      const plan: MovePlanItem[] = [];
      let unmatched = 0;
      pub.questions.forEach((q, index) => {
        const from = ctl.get(q.questionVersionId);
        if (!from || from.baseRevision < 1) return;
        const target = latestPub.questions.find(
          (x) => x.questionId === q.questionId,
        );
        const targetWork = latestWork.questions.find(
          (x) => x.questionVersionId === target?.questionVersionId,
        );
        if (!target || !targetWork) {
          unmatched++;
          return;
        }
        plan.push({
          id: q.questionVersionId,
          position: index + 1,
          title: q.title,
          fromQuestionVersionId: q.questionVersionId,
          targetQuestionVersionId: target.questionVersionId,
          targetRevision: targetWork.revision,
          targetSource: targetWork.source,
        });
      });
      if (plan.some((i) => i.targetRevision > 0)) {
        setMove({ phase: 'choose', plan, unmatched, note });
        return;
      }
      await runMove(plan, new Set(), unmatched);
    } catch (error) {
      failMove(error);
    }
  };
  const failMove = (error: unknown) => {
    if (error instanceof ApiError && error.kind === 'session') onSession();
    setMove({
      phase: 'error',
      message:
        error instanceof ApiError && error.kind === 'session'
          ? 'Your session has ended. Nothing was moved.'
          : 'The move could not be completed. Your work on this version is unchanged. Try again.',
    });
  };
  /** Moves untouched targets and the explicitly chosen replacements, each on the revision just read. */
  const runMove = async (
    plan: MovePlanItem[],
    replace: Set<string>,
    unmatched: number,
  ) => {
    setMove({ phase: 'pending' });
    try {
      let moved = 0;
      let kept = unmatched;
      let again = false;
      for (const item of plan) {
        if (item.targetRevision > 0 && !replace.has(item.id)) {
          kept++;
          continue;
        }
        try {
          await api.move(work.latestAssignmentVersionId, {
            questionVersionId: item.fromQuestionVersionId,
            targetQuestionVersionId: item.targetQuestionVersionId,
            targetBaseRevision: item.targetRevision,
          });
          moved++;
        } catch (error) {
          if (error instanceof ApiError && error.kind === 'conflict')
            again = true;
          else throw error;
        }
      }
      if (again) {
        // The newer version changed since it was read: ask again with what is there now.
        await moveWork(
          'The newer version changed while moving. Check the current text and confirm again.',
        );
        return;
      }
      setMove({ phase: 'done', moved, kept });
    } catch (error) {
      failMove(error);
    }
  };

  const hintId = 'cw-editor-hint-' + workPos;
  const statusId = 'cw-save-status-' + workPos;
  const label = `Python answer for question ${workPos}: ${workQuestion.title}`;

  const newer = stale && (
    <section className="cw-wb-newer" aria-label="Newer version">
      <p>
        <strong>A newer version of this assignment has been published.</strong>{' '}
        This version stays as you left it and keeps saving, but it can no longer
        be submitted.
      </p>
      {move.phase === 'idle' && (
        <Action
          variant="secondary"
          onClick={() => setMove({ phase: 'confirm' })}
        >
          Move my work to the newer version…
        </Action>
      )}
      {move.phase === 'confirm' && (
        <div role="group" aria-label="Confirm move" className="cw-wb-confirm">
          <p>
            This copies your saved answers onto the newer version as new
            revisions. Answers you already saved there are kept as they are, and
            nothing on this version changes.
          </p>
          <div className="cw-wb-actions">
            <Action onClick={() => void moveWork()}>
              Move my saved answers
            </Action>
            <Action
              variant="secondary"
              onClick={() => setMove({ phase: 'idle' })}
            >
              Cancel
            </Action>
          </div>
        </div>
      )}
      {move.phase === 'pending' && <p role="status">Moving your work…</p>}
      {move.phase === 'choose' && (
        <MoveChoices
          plan={move.plan}
          note={move.note}
          onRun={(replace) => void runMove(move.plan, replace, move.unmatched)}
          onCancel={() => setMove({ phase: 'idle' })}
        />
      )}
      {move.phase === 'error' && (
        <div role="alert">
          <p>{move.message}</p>
          <Action variant="secondary" onClick={() => void moveWork()}>
            Try again
          </Action>
        </div>
      )}
      {move.phase === 'done' && (
        <div role="status">
          <p>
            Moved {move.moved} answer{move.moved === 1 ? '' : 's'}
            {move.kept
              ? `; ${move.kept} already had work or no match on the newer version and ${move.kept === 1 ? 'was' : 'were'} left alone`
              : ''}
            .
          </p>
          <a
            className="cw-action cw-action--primary"
            href={studentPaths.work(work.latestAssignmentVersionId, 1)}
          >
            Open the newer version <Icon name="arrow-right" />
          </a>
        </div>
      )}
    </section>
  );

  return (
    <>
      <p role="status" className="cw-sr-only">
        {live}
      </p>
      <a
        className="cw-student-back"
        href={studentPaths.overview(route.versionId)}
      >
        <Icon name="arrow-left" /> Back to the assignment
      </a>
      <header className="cw-wb-head">
        <h1>{pub.title}</h1>
        <p className="cw-student-meta-line">
          Deadline{' '}
          <time dateTime={work.deadlineAt}>
            {formatDeadline(work.deadlineAt)}
          </time>
          . Version published{' '}
          <time dateTime={pub.publishedAt}>
            {formatDeadline(pub.publishedAt)}
          </time>
          .
        </p>
      </header>
      {sessionEnded && (
        <div className="cw-student-notice" role="alert">
          <p>
            Your session has ended. Text that is not saved stays on this page
            only. Copy anything important before you sign in again.
          </p>
          <div className="cw-course-actions">
            <a className="cw-action cw-action--primary" href="/sign-in">
              Sign in
            </a>
          </div>
        </div>
      )}
      {newer}
      {deadlinePassed && (
        <p className="cw-student-notice" role="note">
          The deadline has passed, so this assignment can no longer be
          submitted. You can keep editing your working copy.
        </p>
      )}

      {mode === 'review' ? (
        <Review
          api={api}
          pub={pub}
          ctl={ctl}
          deadlinePassed={deadlinePassed}
          stale={stale}
          onGoto={(n) => {
            setMode('question');
            void go(n);
          }}
          onSubmitted={() => {
            setAttemptsKey((k) => k + 1);
            attemptCtx.select(null);
          }}
          onMove={() => {
            setMode('question');
            setMove({ phase: 'confirm' });
          }}
          onRefresh={async () => {
            await onRefresh();
          }}
          onSession={onSession}
          onViewAttempt={(id) => {
            setMode('question');
            setHistoryOpened(true);
            attemptCtx.select(id);
            pushNext.current = true;
            setAnswerView('submitted');
          }}
        />
      ) : mode === 'summary' ? (
        attemptCtx.selectedId ? (
          <AttemptView
            api={api}
            attemptId={attemptCtx.selectedId}
            current={pub}
            backLabel={`Back to question ${shownPos}`}
            onBack={() => {
              focusHeading.current = true;
              setMode('question');
            }}
          />
        ) : (
          <Action
            variant="secondary"
            onClick={() => {
              focusHeading.current = true;
              setMode('question');
            }}
          >
            {`Back to question ${shownPos}`}
          </Action>
        )
      ) : (
        <div className="cw-wb-panes">
          <section
            className="cw-wb-question"
            aria-labelledby={histPending ? undefined : 'cw-q-h'}
            aria-label={histPending ? 'Question' : undefined}
          >
            {histPending ? (
              // Never show the route's question beside a historical attempt that is still loading.
              <p role="status">Loading the selected attempt…</p>
            ) : (
              <>
                <p className="cw-ordinal">Question {shownPos}</p>
                <h2 id="cw-q-h" tabIndex={-1} ref={heading}>
                  {question.title}
                </h2>
                {otherVersion && (
                  <p className="cw-student-meta-line" role="note">
                    This attempt was submitted on a different version of this
                    assignment, published{' '}
                    <time dateTime={otherVersion.publishedAt}>
                      {formatDeadline(otherVersion.publishedAt)}
                    </time>
                    . The question and its order follow that version.
                  </p>
                )}
                <details className="cw-wb-brief" open>
                  <summary>Question text</summary>
                  <InstructionText
                    value={question.instructions}
                    codeLabel={'Code example in question ' + shownPos}
                  />
                </details>
                <details className="cw-wb-rubric">
                  <summary>Rubric guidance</summary>
                  <ul className="cw-student-rubric">
                    {question.criteria.map((c) => (
                      <li key={c.criterionId}>
                        {c.descriptor}{' '}
                        <span className="cw-student-points">
                          {formatPoints(c.maximumScore)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </section>

          <section className="cw-wb-work" aria-label="Answer">
            <Tabs tab={answerView} onChange={showView} />
            {/* The editor stays mounted while a historical view is shown, so its text and save
                state are untouched by view switches. */}
            <div
              role="tabpanel"
              id="cw-panel-work"
              aria-labelledby="cw-tab-work"
              hidden={answerView !== 'work'}
              tabIndex={-1}
            >
              {item && (
                <>
                  <div className="cw-wb-savebar">
                    <p
                      id={statusId}
                      className="cw-wb-save"
                      data-status={item.status}
                    >
                      <span aria-hidden="true">{SYMBOL[item.status]}</span>{' '}
                      {saveLabel(item)}
                    </p>
                    {item.status === 'failed' &&
                      item.failure !== 'session' &&
                      item.failure !== 'unavailable' &&
                      item.failure !== 'rate-limited' && (
                        <Action
                          variant="secondary"
                          onClick={() => void ctl.retry(item.questionVersionId)}
                        >
                          Retry save
                        </Action>
                      )}
                  </div>
                  {item.status === 'conflict' && item.conflict ? (
                    <ConflictWindow
                      title={
                        item.recovered
                          ? 'Unsaved copy from before the reload'
                          : 'Save conflict'
                      }
                      mine={item.source}
                      saved={item.conflict}
                      recovered={item.recovered}
                      onKeepMine={() => {
                        focusEditorNext.current = true;
                        void ctl.keepMine(item.questionVersionId);
                      }}
                      onUseSaved={() => {
                        focusEditorNext.current = true;
                        ctl.useSaved(item.questionVersionId);
                      }}
                    />
                  ) : (
                    <>
                      <CodeEditor
                        id={'cw-editor-' + workPos}
                        handle={editorMounted}
                        label={label}
                        value={item.source}
                        describedBy={`${hintId} ${statusId}`}
                        onChange={(next) =>
                          ctl.edit(item.questionVersionId, next)
                        }
                        onBlur={() => void ctl.flush(item.questionVersionId)}
                      />
                      <p id={hintId} className="cw-wb-hint">
                        Tab indents by four spaces. Press Esc, then Tab, to
                        leave the editor. Your work is saved automatically.
                      </p>
                    </>
                  )}
                  {block && (
                    <div className="cw-student-notice" role="alert">
                      <p>
                        Question {workPos} is not saved ({saveLabel(item)}).
                        Your text stays on this page and in this tab&apos;s
                        backup.
                      </p>
                      <div className="cw-wb-actions">
                        <Action
                          variant="secondary"
                          onClick={async () => {
                            await ctl.retry(item.questionVersionId);
                            if (
                              ctl.get(item.questionVersionId)?.status ===
                              'saved'
                            )
                              commit(block.target);
                          }}
                        >
                          Retry save
                        </Action>
                        <Action
                          variant="secondary"
                          onClick={() => setBlock(null)}
                        >
                          Keep editing
                        </Action>
                        <Action onClick={() => commit(block.target)}>
                          Continue without saving
                        </Action>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div
              role="tabpanel"
              id="cw-panel-submitted"
              aria-labelledby="cw-tab-submitted"
              hidden={answerView !== 'submitted'}
              tabIndex={-1}
            >
              {answerView === 'submitted' && (
                <SubmittedPanel
                  ctx={panelCtx}
                  question={question}
                  position={shownPos}
                  onReturn={() => showView('work')}
                />
              )}
            </div>
            <div
              role="tabpanel"
              id="cw-panel-feedback"
              aria-labelledby="cw-tab-feedback"
              hidden={answerView !== 'feedback'}
              tabIndex={-1}
            >
              {answerView === 'feedback' && (
                <FeedbackPanel
                  api={api}
                  ctx={panelCtx}
                  question={question}
                  onReturn={() => showView('work')}
                />
              )}
            </div>
          </section>
        </div>
      )}

      {mode === 'question' && (
        <QuestionNavigation
          index={shownPos - 1}
          count={viewCount}
          pending={navPending || histPending}
          finalLabel={historical ? 'Attempt summary' : 'Review assignment'}
          onPrevious={() => void go(shownPos - 1)}
          onNext={() =>
            void (shownPos === viewCount
              ? go(historical ? 'summary' : 'review')
              : go(shownPos + 1))
          }
        />
      )}
      <WorkRefresh
        work={work}
        setWork={setWork}
        api={api}
        versionId={route.versionId}
      />
    </>
  );
}

/** Re-reads the latest-publication pointer on focus so a republish shows the notice without replacing source. */
function WorkRefresh({
  work,
  setWork,
  api,
  versionId,
}: {
  work: WorkResponse;
  setWork: (w: WorkResponse) => void;
  api: ReturnType<typeof workApi>;
  versionId: string;
}) {
  const latest = useRef(work);
  latest.current = work;
  useEffect(() => {
    const check = () => {
      api
        .work(versionId)
        .then((fresh) => {
          if (
            fresh.latestAssignmentVersionId !==
              latest.current.latestAssignmentVersionId ||
            fresh.attemptCount !== latest.current.attemptCount
          )
            // Only the pointer and count change here; drafts are never replaced by a refresh.
            setWork({
              ...latest.current,
              latestAssignmentVersionId: fresh.latestAssignmentVersionId,
              attemptCount: fresh.attemptCount,
            });
        })
        .catch(() => undefined);
    };
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [api, versionId, setWork]);
  return null;
}

type AnswerView = 'work' | 'submitted' | 'feedback';
const TABS = [
  { id: 'work', label: 'Working copy' },
  { id: 'submitted', label: 'Submitted attempt' },
  { id: 'feedback', label: 'Released feedback' },
] as const;

/** Accessible tab pattern: roving tabindex, arrow keys, Home and End. */
function Tabs({
  tab,
  onChange,
}: {
  tab: AnswerView;
  onChange: (tab: AnswerView) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex((t) => t.id === tab);
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : event.key === 'ArrowLeft'
          ? (index + TABS.length - 1) % TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? TABS.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(TABS[next].id);
    refs.current[TABS[next].id]?.focus();
  };
  return (
    <div role="tablist" aria-label="Answer views" className="cw-wb-tabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          type="button"
          role="tab"
          id={'cw-tab-' + t.id}
          aria-selected={tab === t.id}
          aria-controls={'cw-panel-' + t.id}
          tabIndex={tab === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={onKey}
        >
          <Icon
            name={
              t.id === 'work'
                ? 'code'
                : t.id === 'submitted'
                  ? 'history'
                  : 'message'
            }
          />{' '}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Newer-version questions that already have work are never replaced silently: each needs an
 * explicit tick, and the newer text can be copied first (with a visible fallback if the
 * clipboard is denied). Questions the newer version has not touched move without a choice.
 */
function MoveChoices({
  plan,
  note,
  onRun,
  onCancel,
}: {
  plan: MovePlanItem[];
  note: string;
  onRun: (replace: Set<string>) => void;
  onCancel: () => void;
}) {
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [copy, setCopy] = useState<{ id: string; denied: boolean } | null>(
    null,
  );
  const existing = plan.filter((i) => i.targetRevision > 0);
  const fresh = plan.length - existing.length;
  const copyText = async (item: MovePlanItem) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('unavailable');
      await navigator.clipboard.writeText(item.targetSource);
      setCopy({ id: item.id, denied: false });
    } catch {
      setCopy({ id: item.id, denied: true });
    }
  };
  return (
    <div
      role="group"
      aria-label="Choose what to replace"
      className="cw-wb-confirm"
    >
      {note && <p role="alert">{note}</p>}
      <p>
        {existing.length === 1
          ? 'One question already has work on the newer version.'
          : `${existing.length} questions already have work on the newer version.`}{' '}
        Moving replaces that text with your earlier answer as a new revision.
        Nothing is replaced unless you tick it.
        {fresh > 0 &&
          ` ${fresh} other answer${fresh === 1 ? '' : 's'} will move because the newer version has no work there.`}
      </p>
      <ul className="cw-wb-move-list">
        {existing.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={chosen.has(item.id)}
                onChange={(event) => {
                  const next = new Set(chosen);
                  if (event.target.checked) next.add(item.id);
                  else next.delete(item.id);
                  setChosen(next);
                }}
              />{' '}
              Replace question {item.position} ({item.title}) on the newer
              version, currently revision {item.targetRevision}
            </label>
            <Action variant="secondary" onClick={() => void copyText(item)}>
              <Icon name="copy" /> Copy newer version of question{' '}
              {item.position}
            </Action>
            {copy?.id === item.id && !copy.denied && (
              <p role="status">
                Copied the newer version of question {item.position}.
              </p>
            )}
            {copy?.id === item.id && copy.denied && (
              <div role="alert">
                <p>
                  The clipboard is not available. The newer text is selected
                  below; copy it manually before you replace it.
                </p>
                <textarea
                  readOnly
                  rows={6}
                  aria-label={`Newer version of question ${item.position}, for manual copying`}
                  value={item.targetSource}
                  ref={(el) => el?.select()}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="cw-wb-actions">
        <Action onClick={() => onRun(chosen)}>
          {chosen.size
            ? `Move and replace ${chosen.size} on the newer version`
            : 'Move without replacing existing work'}
        </Action>
        <Action variant="secondary" onClick={onCancel}>
          Cancel
        </Action>
      </div>
    </div>
  );
}
