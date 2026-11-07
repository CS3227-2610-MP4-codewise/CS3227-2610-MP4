import { useCallback, useEffect, useRef, useState } from 'react';
import { authViewSchema, type AuthView } from '../../shared/auth';
import { draftSchema } from '../../shared/instructor-contracts/authoring';
import { authRequest } from '../auth/client';
import { Brand, Icon } from '../ui/brand';
import { AccountMenu } from '../ui/account-menu';
import { AssignmentWorkspace } from './assignments/AssignmentWorkspace';
import { instructorClient } from './assignments/client';
import { courseClient } from './courses/client';
import { CreateCourseForm } from './courses/CreateCourseForm';

type Course = { id: string; name: string };

export function InstructorWorkspace() {
  const [view, setView] = useState<AuthView | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [status, setStatus] = useState('Loading your courses…');
  const [ready, setReady] = useState(false);
  const [deepCourse, setDeepCourse] = useState('');
  const [canCreate, setCanCreate] = useState(false);
  const [creationStatus, setCreationStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const openCreated = useCallback((item: Course) => {
    window.location.assign(
      '/instructor/assignments?courseId=' + encodeURIComponent(item.id),
    );
  }, []);
  const deepId = window.location.pathname.match(
    /^\/instructor\/assignments\/([A-Za-z0-9_-]{1,128})$/,
  )?.[1];
  const requestedCourse =
    new URLSearchParams(window.location.search).get('courseId') ?? '';
  const course = deepId ? deepCourse : requestedCourse;
  const assignment =
    window.location.pathname === '/instructor/assignments' || !!deepId;
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const user = authViewSchema.parse(await authRequest('session'));
        const items: Course[] = await courseClient.list();
        let assignedCourse = '';
        if (deepId) {
          const draftResponse = await fetch(
            '/api/instructor/assignments/' +
              encodeURIComponent(deepId) +
              '/draft',
            { credentials: 'same-origin', cache: 'no-store' },
          );
          if (!draftResponse.ok) throw new Error('Assignment unavailable.');
          const draft = draftSchema.parse(await draftResponse.json());
          if (draft.assignmentId !== deepId)
            throw new Error('Assignment unavailable.');
          assignedCourse = draft.courseId;
        }
        const selected = assignedCourse || requestedCourse;
        if (
          assignment &&
          selected &&
          !items.some((item) => item.id === selected)
        ) {
          const item = await courseClient.selected(selected);
          if (item.id !== selected) throw new Error('Course unavailable.');
          items.push(item);
        }
        if (active) {
          setDeepCourse(assignedCourse);
          setView(user);
          setCourses(items);
          setStatus('');
        }
        try {
          const eligible = await courseClient.eligibility();
          if (active) {
            setCanCreate(eligible);
            setCreationStatus('');
          }
        } catch {
          if (active)
            setCreationStatus(
              'Course creation availability could not be checked. Reload to try again.',
            );
        }
      } catch {
        if (active)
          setStatus(
            'Your session or courses are unavailable. Sign in again or try later.',
          );
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  if (
    ready &&
    view &&
    assignment &&
    courses.some((item) => item.id === course)
  ) {
    return (
      <AssignmentWorkspace
        client={instructorClient(course)}
        preview={false}
        initialAssignmentId={deepId}
        courseId={course}
        account={view}
      />
    );
  }
  return (
    <div className="cw-shell">
      <a className="cw-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="cw-header">
        <Brand />
        <nav className="cw-app-nav" aria-label="Main navigation">
          <a href="/workspace" aria-current="page">
            Courses
          </a>
          {view && (
            <AccountMenu
              email={view.email}
              onSignOut={() =>
                authRequest('logout', view.csrfToken, {})
                  .then(() => window.location.assign('/sign-in'))
                  .catch(() => setStatus('Could not sign out. Try again.'))
              }
            />
          )}
        </nav>
      </header>
      <main id="main-content" className="cw-home">
        <h1>Your courses</h1>
        {status && <p role="status">{status}</p>}
        {creationStatus && <p role="status">{creationStatus}</p>}
        {ready &&
          view &&
          canCreate &&
          !assignment &&
          (creating ? (
            <CreateCourseForm
              csrf={view.csrfToken}
              onCreated={openCreated}
              onCancel={() => {
                setCreating(false);
                requestAnimationFrame(() => createButton.current?.focus());
              }}
            />
          ) : (
            <button
              ref={createButton}
              className="cw-action cw-action--primary"
              onClick={() => setCreating(true)}
            >
              Create course
            </button>
          ))}
        {ready && view && !courses.length && (
          <p>You do not have a course workspace yet.</p>
        )}
        {ready &&
          view &&
          assignment &&
          !courses.some((item) => item.id === course) && (
            <p>This course is unavailable to you.</p>
          )}
        <ul className="cw-course-list">
          {courses.map((item) => (
            <li key={item.id}>
              <a
                className="cw-course-entry"
                href={
                  '/instructor/assignments?courseId=' +
                  encodeURIComponent(item.id)
                }
              >
                <h2>{item.name}</h2>
                <span>
                  Open course <Icon name="arrow-right" />
                </span>
              </a>
            </li>
          ))}
        </ul>
        {!view && ready && (
          <a
            href={
              deepId
                ? '/sign-in?returnTo=' +
                  encodeURIComponent(window.location.pathname)
                : '/sign-in'
            }
          >
            Sign in
          </a>
        )}
      </main>
    </div>
  );
}
