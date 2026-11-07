import { useEffect, useState } from 'react';
import { authViewSchema, type AuthView } from '../../shared/auth';
import { draftSchema } from '../../shared/instructor-contracts/authoring';
import { authRequest } from '../auth/client';
import { Brand, Icon } from '../ui/brand';
import { AccountMenu } from '../ui/account-menu';
import { AssignmentWorkspace } from './assignments/AssignmentWorkspace';
import { instructorClient } from './assignments/client';

type Course = { id: string; name: string };

export function InstructorWorkspace() {
  const [view, setView] = useState<AuthView | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [status, setStatus] = useState('Loading your courses…');
  const [ready, setReady] = useState(false);
  const [deepCourse, setDeepCourse] = useState('');
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
        const response = await fetch('/api/courses', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Could not load your courses.');
        const body: unknown = await response.json();
        if (
          !body ||
          typeof body !== 'object' ||
          !('courses' in body) ||
          !Array.isArray(body.courses)
        )
          throw new Error('Could not load your courses.');
        const items: Course[] = body.courses.map((item: unknown) => {
          if (
            !item ||
            typeof item !== 'object' ||
            !('id' in item) ||
            !('name' in item) ||
            typeof item.id !== 'string' ||
            typeof item.name !== 'string'
          )
            throw new Error('Could not load your courses.');
          return { id: item.id, name: item.name };
        });
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
          if (
            draft.assignmentId !== deepId ||
            !items.some((item) => item.id === draft.courseId)
          )
            throw new Error('Assignment unavailable.');
          assignedCourse = draft.courseId;
        }
        if (active) {
          setDeepCourse(assignedCourse);
          setView(user);
          setCourses(items);
          setStatus('');
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
