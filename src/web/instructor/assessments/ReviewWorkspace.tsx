import { useEffect, useMemo, useRef, useState } from 'react';
import { authViewSchema, type AuthView } from '../../../shared/auth';
import {
  draftListSchema,
  historySchema,
  type DraftSummary,
  type PublicationSummary,
} from '../../../shared/instructor-contracts/authoring';
import {
  publicationSchema,
  type Publication,
} from '../../../shared/instructor-contracts/publication';
import {
  BoundaryError,
  object,
  array,
  id,
  text,
  timestamp,
  assert,
} from '../../../shared/instructor-contracts/schema';
import { authRequest } from '../../auth/client';
import { Brand, Icon } from '../../ui/brand';
import { AccountMenu } from '../../ui/account-menu';
import { CourseNavigation } from '../../ui/course-navigation';
import { WorkspaceSwitch } from '../../ui/workspace-switch';
import { AssessmentWorkspace } from './AssessmentWorkspace';
import { AssessmentController } from './controller';
import { assessmentClient, workspace } from './client';
const prefix = '/api/instructor';
async function read(path: string, csrf?: string, body?: unknown) {
  const r = await fetch(prefix + path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!r.ok)
    throw new BoundaryError(
      r.status === 401
        ? 'UNAUTHENTICATED'
        : r.status === 403
          ? 'FORBIDDEN'
          : 'UPSTREAM_UNAVAILABLE',
    );
  return r.json();
}
type AttemptSummary = {
  attemptId: string;
  submittedAt: string;
  label: string;
  sample: boolean;
};
export function ReviewWorkspace() {
  const path = window.location.pathname,
    assessmentId = /^\/instructor\/assessments\/([A-Za-z0-9_-]{1,128})$/.exec(
      path,
    )?.[1],
    assignmentId = /^\/instructor\/review\/([A-Za-z0-9_-]{1,128})$/.exec(
      path,
    )?.[1],
    requestedCourse =
      new URLSearchParams(window.location.search).get('courseId') ?? '';
  const [view, setView] = useState<AuthView | null>(null),
    [course, setCourse] = useState(requestedCourse),
    [title, setTitle] = useState('Grading'),
    [items, setItems] = useState<DraftSummary[]>([]),
    [versions, setVersions] = useState<PublicationSummary[]>([]),
    [publication, setPublication] = useState<Publication | null>(null),
    [attempts, setAttempts] = useState<AttemptSummary[]>([]),
    [sample, setSample] = useState(false),
    [available, setAvailable] = useState(false),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState('Loading…'),
    [nextCursor, setNextCursor] = useState<string | null>(null);
  const epoch = useRef(0);
  const controller = useMemo(
    () =>
      view
        ? new AssessmentController(assessmentClient(view.csrfToken, prefix))
        : null,
    [view],
  );
  function failure(e: unknown) {
    if (
      e instanceof BoundaryError &&
      ['UNAUTHENTICATED', 'FORBIDDEN'].includes(e.code)
    ) {
      setView(null);
      setItems([]);
      setVersions([]);
      setPublication(null);
      setAttempts([]);
      setMessage(
        e.code === 'UNAUTHENTICATED'
          ? 'Sign in to continue.'
          : 'This work is not available to your account.',
      );
    } else setMessage('Could not load submitted work. Try again.');
  }
  useEffect(() => {
    const current = ++epoch.current;
    void (async () => {
      try {
        const user = authViewSchema.parse(await authRequest('session'));
        if (current !== epoch.current) return;
        setView(user);
        if (assessmentId) {
          setMessage('');
          return;
        }
        if (assignmentId) {
          const raw = object(
            await read(
              '/review/assignments/' + encodeURIComponent(assignmentId),
            ),
            [
              'assignmentId',
              'title',
              'courseId',
              'publications',
              'available',
              'sampleMode',
            ],
          );
          const checked = historySchema.parse(raw.publications);
          if (current !== epoch.current) return;
          setVersions(checked);
          setTitle(text(raw.title, '$.title', 512));
          setCourse(id(raw.courseId, '$.courseId'));
          setAvailable(raw.available === true);
          setSample(raw.sampleMode === true);
        } else if (requestedCourse) {
          const raw = object(
            await read(
              '/review?' + new URLSearchParams({ courseId: requestedCourse }),
            ),
            ['items', 'nextCursor', 'available', 'sampleMode'],
          );
          const checked = draftListSchema.parse({
            items: raw.items,
            nextCursor: raw.nextCursor,
          });
          if (current !== epoch.current) return;
          setItems(checked.items);
          setNextCursor(checked.nextCursor);
          setAvailable(raw.available === true);
          setSample(raw.sampleMode === true);
        }
        setMessage('');
      } catch (e) {
        if (current === epoch.current) failure(e);
      } finally {
        if (current === epoch.current) setBusy(false);
      }
    })();
    return () => {
      epoch.current++;
    };
  }, [path, assessmentId, assignmentId, requestedCourse]);
  async function select(versionId: string) {
    const current = ++epoch.current;
    setBusy(true);
    setMessage('Loading version…');
    setPublication(null);
    setAttempts([]);
    try {
      const raw = object(
          await read('/review/publications/' + encodeURIComponent(versionId)),
          ['publication', 'available', 'sampleMode', 'attempts'],
        ),
        pub = publicationSchema.parse(raw.publication),
        attempts = array(
          raw.attempts,
          (v, p) => {
            const a = object(
              v,
              ['attemptId', 'submittedAt', 'label', 'sample'],
              p,
            );
            assert(typeof a.sample === 'boolean', p + '.sample');
            return {
              attemptId: id(a.attemptId, p + '.attemptId'),
              submittedAt: timestamp(a.submittedAt, p + '.submittedAt'),
              label: text(a.label, p + '.label', 512),
              sample: a.sample,
            };
          },
          '$.attempts',
          0,
          100,
        );
      if (current !== epoch.current) return;
      setPublication(pub);
      setAttempts(attempts);
      setMessage('');
      setAvailable(raw.available === true);
      setSample(raw.sampleMode === true);
    } catch (e) {
      if (current === epoch.current) failure(e);
    } finally {
      if (current === epoch.current) setBusy(false);
    }
  }
  async function open(attempt: AttemptSummary) {
    if (!view || !publication || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = workspace(
        await read(
          attempt.sample
            ? '/review/publications/' +
                encodeURIComponent(publication.assignmentVersionId) +
                '/sample-assessment'
            : '/assessments',
          view.csrfToken,
          attempt.sample
            ? {
                requestKey:
                  'sample_assessment_' + publication.assignmentVersionId,
              }
            : { attemptId: attempt.attemptId, requestKey: crypto.randomUUID() },
        ),
      );
      window.location.assign(
        '/instructor/assessments/' + encodeURIComponent(result.head.id),
      );
    } catch (e) {
      failure(e);
      setBusy(false);
    }
  }
  const logout = () => {
    if (!view) return;
    return authRequest('logout', view.csrfToken, {}).then(() =>
      window.location.assign('/sign-in'),
    );
  };
  if (view && assessmentId && controller)
    return (
      <AssessmentWorkspace
        controller={controller}
        id={assessmentId}
        preview={false}
        apiPrefix={prefix}
        account={{ email: view.email, logout, identity: view }}
      />
    );
  return (
    <div className="assessment-app">
      <header className="assessment-top">
        <Brand href="/workspace" />
        <nav className="cw-app-nav" aria-label="Main navigation">
          {view && (
            <WorkspaceSwitch
              role="instructor"
              account={view}
              courseId={course || undefined}
              beforeLeave={() => !busy}
            />
          )}
          <a href="/workspace">Courses</a>
          {view && (
            <AccountMenu email={view.email} busy={busy} onSignOut={logout} />
          )}
        </nav>
      </header>
      {view && course && (
        <CourseNavigation courseId={course} active="grading" />
      )}
      <main className="cw-grading-page">
        <div className="assessment-title">
          <div>
            <p className="assessment-eyebrow">Instructor</p>
            <h1>{assignmentId ? title : 'Grading'}</h1>
          </div>
        </div>
        {sample && (
          <p className="assessment-secondary">Local sample submissions</p>
        )}
        {message && <p role="status">{message}</p>}
        {!busy && !view && (
          <a
            className="cw-action"
            href={
              '/sign-in' +
              (assignmentId || assessmentId
                ? '?returnTo=' + encodeURIComponent(path)
                : '')
            }
          >
            Sign in
          </a>
        )}
        {view && (!busy || versions.length > 0 || items.length > 0) && (
          <>
            {!available && (
              <p role="status">Submission integration is not available yet.</p>
            )}
            {!assignmentId ? (
              <section>
                <p className="assessment-secondary">
                  Choose an assignment to review submitted work.
                </p>
                {items.length === 0 ? (
                  <p>
                    No assignments yet.{' '}
                    <a
                      href={
                        '/instructor/assignments?courseId=' +
                        encodeURIComponent(course)
                      }
                    >
                      Create an assignment
                    </a>
                  </p>
                ) : (
                  <ul className="cw-work-list">
                    {items.map((item) => (
                      <li key={item.assignmentId}>
                        <div>
                          <h2>{item.title || 'Untitled assignment'}</h2>
                          <p>
                            Updated{' '}
                            {new Date(item.updatedAt).toLocaleDateString(
                              'en-SG',
                            )}
                          </p>
                        </div>
                        <a
                          className="cw-row-action"
                          aria-label={
                            'View submissions for ' +
                            (item.title || 'untitled assignment')
                          }
                          href={
                            '/instructor/review/' +
                            encodeURIComponent(item.assignmentId)
                          }
                        >
                          View submissions <Icon name="arrow-right" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {nextCursor && (
                  <button
                    onClick={() => {
                      setBusy(true);
                      void read(
                        '/review?' +
                          new URLSearchParams({
                            courseId: course,
                            cursor: nextCursor,
                          }),
                      )
                        .then((raw) => {
                          const o = object(raw, [
                              'items',
                              'nextCursor',
                              'available',
                              'sampleMode',
                            ]),
                            page = draftListSchema.parse({
                              items: o.items,
                              nextCursor: o.nextCursor,
                            });
                          setItems((old) => [...old, ...page.items]);
                          setNextCursor(page.nextCursor);
                        })
                        .catch(failure)
                        .finally(() => setBusy(false));
                    }}
                  >
                    Show more
                  </button>
                )}
              </section>
            ) : (
              <section>
                <a
                  href={
                    '/instructor/assignments/' +
                    encodeURIComponent(assignmentId)
                  }
                >
                  Edit assignment
                </a>
                {versions.length === 0 ? (
                  <p>Publish the assignment before reviewing submitted work.</p>
                ) : (
                  <label className="cw-version-picker">
                    Published version
                    <select
                      value={publication?.assignmentVersionId ?? ''}
                      disabled={busy}
                      onChange={(event) => {
                        if (event.target.value) void select(event.target.value);
                      }}
                    >
                      <option value="" disabled>
                        Choose a version
                      </option>
                      {versions.map((version) => (
                        <option
                          key={version.assignmentVersionId}
                          value={version.assignmentVersionId}
                        >
                          Version {version.publicationNumber} ·{' '}
                          {new Date(version.publishedAt).toLocaleDateString(
                            'en-SG',
                            { dateStyle: 'medium' },
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </section>
            )}
            {publication && (
              <section className="assessment-review">
                <div>
                  <h2>Submissions</h2>
                  <p>{publication.title}</p>
                  {sample && (
                    <p className="assessment-secondary">
                      Sample source from this published version. No real student
                      submission.
                    </p>
                  )}
                  {attempts.length === 0 && (
                    <p>
                      {available
                        ? 'No submitted attempts.'
                        : 'Submission integration is not available yet.'}
                    </p>
                  )}
                  {attempts.map((attempt) => (
                    <div key={attempt.attemptId}>
                      <p>{attempt.label}</p>
                      <button
                        className="cw-action"
                        disabled={busy}
                        onClick={() => void open(attempt)}
                      >
                        <Icon name="arrow-right" />
                        {attempt.sample ? 'Assess sample' : 'Assess submission'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
