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
import type { CreationState } from './courses/controller';
import { workspaceContextsSchema } from '../../shared/courses';
import { courseRequest } from './courses/client';
import { WorkspaceSwitch } from '../ui/workspace-switch';

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
  const [creationPhase, setCreationPhase] =
    useState<CreationState['phase']>('editing');
  const [role, setRole] = useState<'student' | 'instructor' | null>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (role && new URLSearchParams(window.location.search).has('role'))
      heading.current?.focus();
  }, [role]);
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
        const contexts = workspaceContextsSchema.parse(
          await courseRequest('/contexts'),
        );
        const requestedRole = new URLSearchParams(window.location.search).get(
          'role',
        );
        const roles = contexts.workspaces.map((item) => item.role);
        const fallbackRole = roles.includes('instructor')
          ? 'instructor'
          : roles.includes('student')
            ? 'student'
            : null;
        const selectedRole =
          (requestedRole === 'student' || requestedRole === 'instructor') &&
          roles.includes(requestedRole)
            ? requestedRole
            : fallbackRole;
        if (selectedRole !== 'instructor') {
          if (active) {
            setView(user);
            setRole(selectedRole);
            setStatus(
              requestedRole && requestedRole !== selectedRole
                ? 'The requested workspace is unavailable.'
                : selectedRole
                  ? ''
                  : 'This workspace is unavailable to you.',
            );
          }
          return;
        }
        if (!roles.includes('instructor'))
          throw new Error('Workspace unavailable.');
        if (active) setRole('instructor');
        let instructorContext = contexts.workspaces.find(
          (item) => item.role === 'instructor',
        )!;
        const items: Course[] = [...instructorContext.courses];
        while (instructorContext.nextCursor) {
          const cursor = instructorContext.nextCursor;
          const page = workspaceContextsSchema.parse(
            await courseRequest(
              '/contexts?instructorAfter=' + encodeURIComponent(cursor),
            ),
          );
          const next = page.workspaces.find(
            (item) => item.role === 'instructor',
          );
          if (!next || next.nextCursor === cursor)
            throw new Error('Workspace unavailable.');
          items.push(...next.courses);
          instructorContext = next;
        }
        // Pagination spans requests; reauthorize every accumulated course before display.
        if (items.length > 100) {
          const verified = await courseClient.verify(
            items.map((item) => item.id),
            user.csrfToken,
          );
          if (verified.some((item, index) => item.id !== items[index].id))
            throw new Error('Workspace unavailable.');
          items.splice(0, items.length, ...verified);
        }
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
          {role && (
            <WorkspaceSwitch
              role={role}
              account={view ?? undefined}
              courses={role === 'instructor' ? courses : undefined}
              csrf={view?.csrfToken}
              beforeLeave={() =>
                !creating ||
                (creationPhase === 'editing' &&
                  window.confirm('Leave this form? Your changes will be lost.'))
              }
            />
          )}
          <a href="/workspace" aria-current="page">
            <Icon name="folder" /> Courses
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
      <main id="main-content" className="cw-home cw-course-home">
        <div className="cw-course-heading">
          <div>
            <p className="cw-kicker">
              {role === 'student' ? 'Student' : 'Instructor'} workspace
            </p>
            <h1 tabIndex={-1} ref={heading}>
              {role === 'student' ? 'Student workspace' : 'Your courses'}
            </h1>
          </div>
          {ready && view && canCreate && !assignment && !creating && (
            <button
              ref={createButton}
              className="cw-action cw-action--primary"
              onClick={() => setCreating(true)}
            >
              <Icon name="plus" /> Create course
            </button>
          )}
        </div>
        {status && <p role="status">{status}</p>}
        {role === 'student' && (
          <a className="cw-action" href="/workspace?role=student">
            Open Student workspace <Icon name="arrow-right" />
          </a>
        )}
        {creationStatus && <p role="status">{creationStatus}</p>}
        {ready && view && canCreate && !assignment && creating && (
          <CreateCourseForm
            csrf={view.csrfToken}
            onPhaseChange={setCreationPhase}
            onCreated={openCreated}
            onCancel={() => {
              setCreating(false);
              requestAnimationFrame(() => createButton.current?.focus());
            }}
          />
        )}
        {ready && view && role === 'instructor' && !courses.length && (
          <div className="cw-empty-state">
            <Icon name="folder" />
            <h2>No courses yet</h2>
            <p>You do not have a course workspace yet.</p>
            {canCreate && (
              <p>
                Create a course to organize assignments and invite your class.
              </p>
            )}
          </div>
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
