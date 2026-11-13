import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authViewSchema, type AuthView } from '../../shared/auth';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import type {
  ProgressEvidence,
  ProgressView,
} from '../../shared/student-progress';
import { authRequest } from '../auth/client';
import { AccountMenu } from '../ui/account-menu';
import { Brand, Icon } from '../ui/brand';
import { WorkspaceSwitch } from '../ui/workspace-switch';
import { formatDeadline, studentPaths } from './model';
import {
  ProgressError,
  progressApi,
  progressFailureText,
  type ProgressErrorKind,
} from './progress-model';
import { newIdempotencyKey } from './work-model';
import './student.css';

type Phase =
  | { kind: 'loading' }
  | { kind: 'failed'; error: ProgressErrorKind }
  | { kind: 'ready'; view: ProgressView };

type Citation = { assessmentId: string; releaseVersion: number };

/**
 * student-progress SP-09 (warm-workbook-v1, UI-01/07/08): one course's progress page. It shows the
 * server-selected evidence and exactly one state; explanation text appears only when the server
 * returns `explained`, and is rendered as plain text.
 */
export function ProgressPage({ courseId }: { courseId: string }) {
  const [account, setAccount] = useState<AuthView | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ProgressError | null>(null);
  const [waitUntil, setWaitUntil] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const csrf = useRef('');
  const heading = useRef<HTMLHeadingElement>(null);
  const api = useMemo(() => progressApi(undefined, () => csrf.current), []);

  const load = useCallback(
    (signal: AbortSignal) => {
      setPhase({ kind: 'loading' });
      api
        .view(courseId, signal)
        .then((view) => {
          if (!signal.aborted) setPhase({ kind: 'ready', view });
        })
        .catch((error: unknown) => {
          if (signal.aborted) return;
          const kind = error instanceof ProgressError ? error.kind : 'network';
          setPhase({ kind: 'failed', error: kind });
          setAnnouncement(progressFailureText[kind]);
        });
    },
    [api, courseId],
  );

  useEffect(() => {
    const controller = new AbortController();
    authRequest('session')
      .then((body) => {
        const view = authViewSchema.parse(body);
        csrf.current = view.csrfToken;
        if (!controller.signal.aborted) setAccount(view);
      })
      .catch((error: unknown) => {
        if (
          error instanceof BoundaryError &&
          (error.code === 'UNAUTHENTICATED' || error.code === 'FORBIDDEN')
        )
          setAccount(null);
      });
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (phase.kind !== 'loading') heading.current?.focus();
    // Focus once per settled load (UI-07); later state changes are announced instead.
  }, [phase.kind]);

  useEffect(() => {
    if (!waitUntil) return;
    const timer = setTimeout(
      () => setWaitUntil(0),
      Math.max(0, waitUntil - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [waitUntil]);

  const generate = () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    setAnnouncement('Preparing your progress explanation…');
    api
      .generate(courseId, newIdempotencyKey())
      .then((view) => {
        setPhase({ kind: 'ready', view });
        setAnnouncement(
          view.state === 'explained'
            ? 'Your progress explanation is ready.'
            : 'Progress could not be explained from the current evidence.',
        );
      })
      .catch((error: unknown) => {
        const e =
          error instanceof ProgressError ? error : new ProgressError('network');
        setProblem(e);
        if (e.kind === 'rate-limited')
          setWaitUntil(Date.now() + e.retryAfterSeconds * 1000);
        setAnnouncement(progressFailureText[e.kind]);
      })
      .finally(() => setBusy(false));
  };

  const ready = phase.kind === 'ready' ? phase.view : null;

  return (
    <div className="cw-shell">
      <a className="cw-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="cw-header">
        <Brand />
        <nav className="cw-app-nav" aria-label="Main navigation">
          {account && <WorkspaceSwitch role="student" />}
          <a href={studentPaths.courses()}>
            <Icon name="folder" /> Courses
          </a>
          {account && (
            <AccountMenu
              email={account.email}
              onSignOut={() =>
                authRequest('logout', account.csrfToken, {})
                  .then(() => window.location.assign('/sign-in'))
                  .catch(() =>
                    setAnnouncement('Could not sign out. Try again.'),
                  )
              }
            />
          )}
        </nav>
      </header>
      <main id="main-content" className="cw-home cw-student cw-progress">
        <a
          className="cw-student-back"
          href={studentPaths.assignments(courseId)}
        >
          <Icon name="arrow-left" /> Back to assignments
        </a>
        <h1 tabIndex={-1} ref={heading}>
          Your progress
        </h1>
        <p className="cw-progress-lede">
          A summary of your released feedback in this course, and how it is
          changing over time.
        </p>
        <p role="status" aria-live="polite" className="cw-student-status">
          {phase.kind === 'loading' ? 'Loading…' : announcement}
        </p>
        {phase.kind === 'failed' && (
          <div className="cw-student-notice">
            <p>{progressFailureText[phase.error]}</p>
            <div className="cw-course-actions">
              {phase.error === 'session' ? (
                <a className="cw-action cw-action--primary" href="/sign-in">
                  Sign in
                </a>
              ) : phase.error === 'unavailable' ? (
                <a href="/workspace">Go to an available workspace</a>
              ) : (
                <button
                  type="button"
                  className="cw-action"
                  onClick={() => load(new AbortController().signal)}
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
        {ready && (
          <>
            <Evidence evidence={ready.evidence} />
            <StateBlock
              view={ready}
              busy={busy}
              waiting={waitUntil > 0}
              problem={problem}
              onGenerate={generate}
            />
          </>
        )}
      </main>
    </div>
  );
}

function feedbackLink(e: ProgressEvidence) {
  return studentPaths.work(e.publicationId, 1, {
    view: 'feedback',
    attempt: e.attemptId,
  });
}

function Evidence({ evidence }: { evidence: ProgressEvidence[] }) {
  return (
    <section aria-labelledby="cw-progress-evidence">
      <h2 id="cw-progress-evidence">Released feedback used</h2>
      {evidence.length ? (
        <ul className="cw-course-list cw-progress-evidence">
          {evidence.map((e) => (
            <li key={e.assessmentId + ':' + e.releaseVersion}>
              <div>
                <h3>{e.title}</h3>
                <p className="cw-student-deadline">
                  Release {e.releaseVersion}, released{' '}
                  <time dateTime={e.releasedAt}>
                    {formatDeadline(e.releasedAt)}
                  </time>
                </p>
              </div>
              <a className="cw-row-action" href={feedbackLink(e)}>
                Open released feedback for {e.title} <Icon name="arrow-right" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No released feedback in this course yet.</p>
      )}
    </section>
  );
}

function StateBlock({
  view,
  busy,
  waiting,
  problem,
  onGenerate,
}: {
  view: ProgressView;
  busy: boolean;
  waiting: boolean;
  problem: ProgressError | null;
  onGenerate: () => void;
}) {
  if (view.state === 'no-feedback')
    return (
      <div className="cw-student-notice">
        <p>
          No feedback has been released in this course yet. Your summary will
          appear here once an assignment's feedback is released.
        </p>
      </div>
    );
  const action = (label: string) =>
    view.aiAvailable ? (
      <button
        type="button"
        className="cw-action cw-action--primary"
        onClick={onGenerate}
        disabled={busy || waiting}
        aria-busy={busy}
      >
        {busy ? 'Preparing explanation…' : label}
      </button>
    ) : (
      <p>{progressFailureText['ai-disabled']}</p>
    );
  const failure = problem && (
    <p className="cw-progress-problem">{progressFailureText[problem.kind]}</p>
  );
  if (view.state === 'stale')
    return (
      <div className="cw-student-notice">
        <p>
          Your released feedback has changed since the explanation from{' '}
          <time dateTime={view.generatedAt}>
            {formatDeadline(view.generatedAt)}
          </time>
          , so it is no longer shown.
        </p>
        {failure}
        {action('Generate a new explanation')}
      </div>
    );
  if (view.state === 'ready')
    return (
      <div className="cw-progress-ready">
        {failure}
        {action('Explain my progress')}
      </div>
    );
  return <Explanation view={view} />;
}

function Explanation({
  view,
}: {
  view: Extract<ProgressView, { state: 'explained' }>;
}) {
  const byRef = new Map(
    view.evidence.map((e) => [e.assessmentId + ':' + e.releaseVersion, e]),
  );
  const cites = (list: Citation[]) => (
    <p className="cw-progress-cites">
      Based on:{' '}
      {list.map((c, i) => {
        const e = byRef.get(c.assessmentId + ':' + c.releaseVersion);
        return (
          <span key={c.assessmentId + ':' + c.releaseVersion}>
            {i > 0 && ', '}
            {e ? <a href={feedbackLink(e)}>{e.title}</a> : 'Released feedback'}
          </span>
        );
      })}
    </p>
  );
  const x = view.explanation;
  // Newest first, in the same order as the evidence list.
  const position = (c: Citation) =>
    view.evidence.findIndex(
      (e) =>
        e.assessmentId === c.assessmentId &&
        e.releaseVersion === c.releaseVersion,
    );
  const recent = [...x.recentAssignments].sort(
    (a, b) => position(a) - position(b),
  );
  const points = (
    title: string,
    items: { comparisonKey: string; text: string }[],
  ) =>
    items.length > 0 && (
      <>
        <h4>{title}</h4>
        <ul className="cw-progress-items">
          {items.map((p) => (
            <li key={p.comparisonKey + p.text}>
              <p>{p.text}</p>
              <p className="cw-progress-key">Criterion: {p.comparisonKey}</p>
            </li>
          ))}
        </ul>
      </>
    );
  const observations = (title: string, items: typeof x.recurringIssues) =>
    items.length > 0 && (
      <section>
        <h3>{title}</h3>
        <ul className="cw-progress-items">
          {items.map((o) => (
            <li key={o.comparisonKey}>
              <p>{o.summary}</p>
              <p className="cw-progress-key">Criterion: {o.comparisonKey}</p>
              {cites(o.evidence)}
            </li>
          ))}
        </ul>
      </section>
    );
  return (
    <section
      aria-labelledby="cw-progress-explanation"
      className="cw-progress-explanation"
    >
      <h2 id="cw-progress-explanation">Explanation</h2>
      <p className="cw-progress-note">
        AI-generated from your released feedback on{' '}
        <time dateTime={x.generatedAt}>{formatDeadline(x.generatedAt)}</time>.
        It does not change any grade.
      </p>
      {/* SP-06: decided from released scores by the server, never by the model. */}
      {x.allFullMarks && (
        <p className="cw-progress-praise">Good job! Keep up the good work.</p>
      )}
      {!x.comparable && (
        <p className="cw-progress-note">
          These assignments do not share rubric criteria, so this is a summary
          of your recent feedback rather than a comparison over time.
        </p>
      )}
      <section>
        <h3>Recent assignments</h3>
        {recent.map((r) => {
          const e = byRef.get(r.assessmentId + ':' + r.releaseVersion);
          return (
            <article
              key={r.assessmentId + ':' + r.releaseVersion}
              className="cw-progress-recent"
            >
              <p className="cw-progress-recent-title">
                {e ? (
                  <a href={feedbackLink(e)}>{e.title}</a>
                ) : (
                  'Released feedback'
                )}
              </p>
              {points('What went well', r.strengths)}
              {points('To work on', r.focus)}
            </article>
          );
        })}
      </section>
      {observations('Recurring issues', x.recurringIssues)}
      {observations('Supported improvements', x.improvements)}
      {x.suggestions.length > 0 && (
        <section>
          <h3>Practice suggestions</h3>
          <ul className="cw-progress-items">
            {x.suggestions.map((s, i) => (
              <li key={i}>
                <p>{s.text}</p>
                {cites(s.evidence)}
              </li>
            ))}
          </ul>
        </section>
      )}
      {x.limitations.length > 0 && (
        <section>
          <h3>Limitations</h3>
          <ul className="cw-progress-items">
            {x.limitations.map((l, i) => (
              <li key={i}>
                <p>{l}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
