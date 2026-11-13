import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { authViewSchema, type AuthView } from '../../shared/auth';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import type { Publication } from '../../shared/instructor-contracts/publication';
import type { StudentAssignmentPage } from '../../shared/student-assignments';
import type { AssignmentStatus } from '../../shared/student-work';
import { authRequest } from '../auth/client';
import { AccountMenu } from '../ui/account-menu';
import { Brand, Icon } from '../ui/brand';
import { InstructionText } from '../ui/instruction-text';
import { WorkspaceSwitch } from '../ui/workspace-switch';
import {
  RequestGenerations,
  StudentRequestError,
  failureMessage,
  formatDeadline,
  formatPoints,
  studentApi,
  studentPaths,
  type Failure,
  type StudentRoute,
} from './model';
import './student.css';

type Courses = {
  courses: { id: string; name: string }[];
  nextCursor: string | null;
};
type Loaded =
  | { kind: 'courses'; data: Courses }
  | { kind: 'assignments'; data: StudentAssignmentPage }
  | { kind: 'overview'; data: Publication };
type State =
  | { phase: 'loading' }
  | { phase: 'ready'; loaded: Loaded }
  | { phase: 'failed'; failure: Failure };

// SW-04: the workbook (and its editor) is a separate chunk that loads only on its route.
const Workbook = lazy(() =>
  import('./Workbook').then((m) => ({ default: m.Workbook })),
);

const api = studentApi();
const failureTexts = new Set(Object.values(failureMessage));

/** SD-01–06 browsing plus the SW workbook route (`/student/assignments/:pub/work/:position`). */
export function StudentWorkspace({ route }: { route: StudentRoute | null }) {
  if (route?.kind === 'work')
    return (
      <Suspense fallback={<p role="status">Loading your work…</p>}>
        <Workbook route={route} />
      </Suspense>
    );
  return <StudentBrowse route={route} />;
}

/** SD-01–06: read-only course → assignment → exact-version browsing for current Students. */
function StudentBrowse({ route }: { route: StudentRoute | null }) {
  const [view, setView] = useState<AuthView | null>(null);
  const [state, setState] = useState<State>({ phase: 'loading' });
  const [announcement, setAnnouncement] = useState('');
  // AS-03: tags belong to one list page (course + cursor) and never block or replace the list.
  const [tags, setTags] = useState<{
    page: string;
    status: ReadonlyMap<string, AssignmentStatus>;
  } | null>(null);
  const generations = useRef(new RequestGenerations());
  const heading = useRef<HTMLHeadingElement>(null);
  const focused = useRef(false);

  const load = useCallback(
    (reason: 'initial' | 'retry' | 'revalidate') => {
      if (!route) {
        setState({ phase: 'failed', failure: 'unavailable' });
        return;
      }
      const request = generations.current.start();
      if (reason !== 'revalidate') setState({ phase: 'loading' });
      const run = async (): Promise<Loaded> => {
        if (route.kind === 'courses')
          return {
            kind: 'courses',
            data: await api.courses(route.after, request.signal),
          };
        if (route.kind === 'assignments')
          return {
            kind: 'assignments',
            data: await api.assignments(
              route.courseId,
              route.cursor,
              request.signal,
            ),
          };
        return {
          kind: 'overview',
          data: await api.overview(route.versionId, request.signal),
        };
      };
      run()
        .then((loaded) => {
          if (!request.current()) return;
          setState({ phase: 'ready', loaded });
          if (loaded.kind === 'assignments' && route.kind === 'assignments') {
            const page = pageKey(route.courseId, route.cursor);
            api
              .status(
                route.courseId,
                loaded.data.items.map((item) => item.assignmentId),
                request.signal,
              )
              .then((status) => {
                if (request.current()) setTags({ page, status });
              })
              // A failed status read only means no tags (AS-03); the list stays as it is.
              .catch(() => {
                if (request.current()) setTags(null);
              });
          }
          // A successful read, including focus revalidation, ends any earlier failure.
          setAnnouncement((current) =>
            failureTexts.has(current) ? '' : current,
          );
        })
        .catch((error: unknown) => {
          if (!request.current()) return;
          const failure =
            error instanceof StudentRequestError ? error.failure : 'network';
          // Clear protected content rather than presenting stale data as current.
          setState({ phase: 'failed', failure });
          setTags(null);
          setAnnouncement(failureMessage[failure]);
        });
    },
    [route],
  );

  useEffect(() => {
    let active = true;
    let viewRequest = 0;
    // The account shown and the CSRF token used for sign-out must follow the current
    // cookie, which another tab may have replaced with a different account.
    const refreshView = () => {
      const request = ++viewRequest;
      authRequest('session')
        .then((body) => {
          if (active && request === viewRequest)
            setView(authViewSchema.parse(body));
        })
        .catch((error: unknown) => {
          if (!active || request !== viewRequest) return;
          // A signed-out session clears the account; a brief network error keeps the
          // last confirmed view so sign-out stays reachable (content is checked separately).
          if (
            error instanceof BoundaryError &&
            (error.code === 'UNAUTHENTICATED' || error.code === 'FORBIDDEN')
          )
            setView(null);
        });
    };
    refreshView();
    load('initial');
    const revalidate = () => {
      refreshView();
      load('revalidate');
    };
    // bfcache restoration and returning focus both re-authorize the destination.
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        refreshView();
        load('initial');
      }
    };
    window.addEventListener('focus', revalidate);
    window.addEventListener('pageshow', restore);
    const pending = generations.current;
    return () => {
      active = false;
      pending.cancel();
      window.removeEventListener('focus', revalidate);
      window.removeEventListener('pageshow', restore);
    };
  }, [load]);

  useEffect(() => {
    if (state.phase !== 'loading' && !focused.current) {
      focused.current = true;
      heading.current?.focus();
    }
  }, [state.phase]);

  const title =
    state.phase === 'ready'
      ? state.loaded.kind === 'courses'
        ? 'Your courses'
        : state.loaded.kind === 'assignments'
          ? state.loaded.data.course.name
          : state.loaded.data.title
      : route?.kind === 'overview'
        ? 'Assignment'
        : route?.kind === 'assignments'
          ? 'Assignments'
          : 'Your courses';

  return (
    <div className="cw-shell">
      <a className="cw-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="cw-header">
        <Brand />
        <nav className="cw-app-nav" aria-label="Main navigation">
          {view && <WorkspaceSwitch role="student" />}
          <a
            href={studentPaths.courses()}
            aria-current={route?.kind === 'courses' ? 'page' : undefined}
          >
            <Icon name="folder" /> Courses
          </a>
          {view && (
            <AccountMenu
              email={view.email}
              onSignOut={() =>
                authRequest('logout', view.csrfToken, {})
                  .then(() => window.location.assign('/sign-in'))
                  .catch(() =>
                    setAnnouncement('Could not sign out. Try again.'),
                  )
              }
            />
          )}
        </nav>
      </header>
      <main id="main-content" className="cw-home cw-student">
        {route?.kind === 'overview' &&
          state.phase === 'ready' &&
          state.loaded.kind === 'overview' && (
            <a
              className="cw-student-back"
              href={studentPaths.assignments(
                state.loaded.data.courseId,
                route.from,
              )}
            >
              <Icon name="arrow-left" /> Back to assignments
            </a>
          )}
        {route?.kind === 'assignments' && (
          <a className="cw-student-back" href={studentPaths.courses()}>
            <Icon name="arrow-left" /> All courses
          </a>
        )}
        <h1 tabIndex={-1} ref={heading}>
          {title}
        </h1>
        {/* Failures are announced here and shown once, visibly, in the notice below. */}
        <p
          role="status"
          className={
            state.phase === 'failed' ? 'cw-sr-only' : 'cw-student-status'
          }
        >
          {state.phase === 'loading' ? 'Loading…' : announcement}
        </p>
        {state.phase === 'failed' && (
          <FailureNotice
            failure={state.failure}
            route={route}
            onRetry={() => {
              // Retry unmounts the focused button; keep keyboard focus on the page heading (UI-07).
              heading.current?.focus();
              load('retry');
            }}
          />
        )}
        {state.phase === 'ready' && state.loaded.kind === 'courses' && (
          <CourseList
            data={state.loaded.data}
            after={route?.kind === 'courses' ? route.after : ''}
          />
        )}
        {state.phase === 'ready' && state.loaded.kind === 'assignments' && (
          <AssignmentList
            data={state.loaded.data}
            cursor={route?.kind === 'assignments' ? route.cursor : null}
            status={
              route?.kind === 'assignments' &&
              tags?.page === pageKey(route.courseId, route.cursor)
                ? tags.status
                : undefined
            }
          />
        )}
        {state.phase === 'ready' && state.loaded.kind === 'overview' && (
          <Overview publication={state.loaded.data} />
        )}
      </main>
    </div>
  );
}

function FailureNotice({
  failure,
  route,
  onRetry,
}: {
  failure: Failure;
  route: StudentRoute | null;
  onRetry: () => void;
}) {
  return (
    <div className="cw-student-notice">
      <p>{failureMessage[failure]}</p>
      <div className="cw-course-actions">
        {failure === 'session' && (
          <a className="cw-action cw-action--primary" href="/sign-in">
            Sign in
          </a>
        )}
        {failure === 'network' && (
          <button type="button" className="cw-action" onClick={onRetry}>
            Try again
          </button>
        )}
        {failure === 'invalid' && route?.kind === 'assignments' && (
          <a href={studentPaths.assignments(route.courseId)}>
            First page of assignments
          </a>
        )}
        {failure === 'invalid' && route?.kind === 'courses' && (
          <a href={studentPaths.courses()}>First page of courses</a>
        )}
        {failure === 'unavailable' && (
          <a href="/workspace">Go to an available workspace</a>
        )}
      </div>
    </div>
  );
}

function CourseList({ data, after }: { data: Courses; after: string }) {
  if (!data.courses.length)
    return <p>You are not a Student in any course on this page.</p>;
  return (
    <>
      <ul className="cw-course-list">
        {data.courses.map((course) => (
          <li key={course.id}>
            <a
              className="cw-course-entry"
              href={studentPaths.assignments(course.id)}
            >
              <h2>{course.name}</h2>
              <span>
                View assignments <Icon name="arrow-right" />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <Pager
        label="Course pages"
        first={after ? studentPaths.courses() : null}
        next={data.nextCursor ? studentPaths.courses(data.nextCursor) : null}
        nextLabel="Next courses"
      />
    </>
  );
}

const pageKey = (courseId: string, cursor: string | null) =>
  JSON.stringify([courseId, cursor]);
const tagText: Record<AssignmentStatus, string | null> = {
  'feedback-released': 'Feedback released',
  submitted: 'Submitted',
  'due-soon': 'Due soon',
  none: null,
};

export function AssignmentList({
  data,
  cursor,
  status,
}: {
  data: StudentAssignmentPage;
  /** The cursor of the page being shown; null on the first page. */
  cursor: string | null;
  /** AS-01: server-derived status for this page; absent means no tags. */
  status?: ReadonlyMap<string, AssignmentStatus>;
}) {
  return (
    <>
      {data.items.length ? (
        <ul className="cw-course-list cw-student-assignments">
          {data.items.map((item) => {
            const tag = tagText[status?.get(item.assignmentId) ?? 'none'];
            const tagId = 'cw-tag-' + item.assignmentVersionId;
            return (
              <li key={item.assignmentVersionId}>
                {/* Instructor row pattern: details on the left, the row action at the far right. */}
                <div>
                  <h2>{item.title}</h2>
                  <p className="cw-student-deadline">
                    Deadline{' '}
                    <time dateTime={item.deadlineAt}>
                      {formatDeadline(item.deadlineAt)}
                    </time>
                  </p>
                  {tag && (
                    <span id={tagId} className="cw-student-tag">
                      {tag}
                    </span>
                  )}
                </div>
                <a
                  className="cw-row-action"
                  href={studentPaths.overview(item.assignmentVersionId, cursor)}
                  aria-describedby={tag ? tagId : undefined}
                >
                  Open {item.title} <Icon name="arrow-right" />
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No assignments have been published in this course yet.</p>
      )}
      <Pager
        label="Assignment pages"
        first={cursor ? studentPaths.assignments(data.course.id) : null}
        next={
          data.nextCursor
            ? studentPaths.assignments(data.course.id, data.nextCursor)
            : null
        }
        nextLabel="Next assignments"
        refresh={studentPaths.assignments(data.course.id)}
      />
    </>
  );
}

function Pager({
  label,
  first,
  next,
  nextLabel,
  refresh,
}: {
  label: string;
  first: string | null;
  next: string | null;
  nextLabel: string;
  refresh?: string;
}) {
  if (!first && !next && !refresh) return null;
  return (
    <nav className="cw-course-actions cw-student-pager" aria-label={label}>
      {first && <a href={first}>First page</a>}
      {refresh && !first && (
        <a href={refresh}>
          <Icon name="refresh" /> Refresh list
        </a>
      )}
      {next && (
        <a className="cw-action" href={next}>
          {nextLabel} <Icon name="arrow-right" />
        </a>
      )}
    </nav>
  );
}

export function Overview({ publication }: { publication: Publication }) {
  return (
    <article className="cw-student-overview">
      <dl className="cw-student-meta">
        <div>
          <dt>Deadline</dt>
          <dd>
            <time dateTime={publication.deadlineAt}>
              {formatDeadline(publication.deadlineAt)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Published version</dt>
          <dd>
            <time dateTime={publication.publishedAt}>
              {formatDeadline(publication.publishedAt)}
            </time>{' '}
            <span className="cw-student-version">
              ({publication.assignmentVersionId})
            </span>
          </dd>
        </div>
      </dl>
      <p className="cw-student-readonly">
        This is a read-only view of this published version.
      </p>
      <p>
        <a
          className="cw-action cw-action--primary"
          href={studentPaths.work(publication.assignmentVersionId, 1)}
        >
          Open my work <Icon name="arrow-right" />
        </a>
      </p>
      <ol className="cw-student-questions">
        {publication.questions.map((question, index) => (
          <li key={question.questionVersionId}>
            <section aria-labelledby={'q-' + index}>
              <h2 id={'q-' + index}>
                Question {index + 1}: {question.title}
              </h2>
              <div className="cw-student-instructions">
                <InstructionText
                  value={question.instructions}
                  codeLabel={'Code example in question ' + (index + 1)}
                />
              </div>
              <h3>
                <Icon name="code" /> Starter code (Python)
              </h3>
              <pre
                className="cw-student-source"
                tabIndex={0}
                aria-label={'Starter code for question ' + (index + 1)}
              >
                <code>{question.starterCode}</code>
              </pre>
              <h3>
                <Icon name="list" /> Rubric guidance
              </h3>
              <ul className="cw-student-rubric">
                {question.criteria.map((criterion) => (
                  <li key={criterion.criterionId}>
                    <span>{criterion.descriptor}</span>{' '}
                    <span className="cw-student-points">
                      {formatPoints(criterion.maximumScore)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </li>
        ))}
      </ol>
    </article>
  );
}
