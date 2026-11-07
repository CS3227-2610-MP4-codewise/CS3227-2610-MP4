import { useEffect, useRef, useState } from 'react';
import { workspaceContextsSchema } from '../../shared/courses';
import { courseClient, courseRequest } from '../instructor/courses/client';

type Role = 'student' | 'instructor';
export function WorkspaceSwitch({
  role,
  beforeLeave,
  courseId,
  courses,
  csrf,
}: {
  role: Role;
  beforeLeave?: () => boolean;
  courseId?: string;
  courses?: { id: string }[];
  csrf?: string;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [revoked, setRevoked] = useState(false);
  const epoch = useRef(0);
  const busyRef = useRef(false);
  useEffect(() => {
    if (revoked) document.body.dataset.workspaceRevoked = 'true';
    else delete document.body.dataset.workspaceRevoked;
    return () => {
      delete document.body.dataset.workspaceRevoked;
    };
  }, [revoked]);
  useEffect(() => {
    let current = true;
    const refresh = () => {
      const request = ++epoch.current;
      busyRef.current = true;
      setPending(true);
      void Promise.all([
        courseRequest('/contexts'),
        courseId
          ? courseRequest('/' + encodeURIComponent(courseId))
          : Promise.resolve(null),
        courses?.length && csrf
          ? courseClient.verify(
              courses.map((item) => item.id),
              csrf,
            )
          : Promise.resolve(null),
      ])
        .then(([body]) => {
          if (current && request === epoch.current) {
            const available = workspaceContextsSchema
              .parse(body)
              .workspaces.map((item) => item.role);
            setRoles(available);
            setRevoked(!available.includes(role));
            setMessage(
              available.includes(role)
                ? ''
                : 'This workspace is no longer available. Choose an available workspace.',
            );
          }
        })
        .catch(() => {
          if (current && request === epoch.current) {
            setRevoked(true);
            setMessage('Workspace availability could not be checked.');
          }
        })
        .finally(() => {
          if (current && request === epoch.current) {
            busyRef.current = false;
            setPending(false);
          }
        });
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      current = false;
      window.removeEventListener('focus', refresh);
    };
  }, [role, courseId, courses, csrf]);
  async function select(next: Role) {
    if (busyRef.current || next === role || (beforeLeave && !beforeLeave()))
      return;
    if (busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    const request = ++epoch.current;
    setMessage('Checking workspace availability…');
    try {
      const contexts = workspaceContextsSchema.parse(
        await courseRequest('/contexts'),
      );
      if (request !== epoch.current) return;
      setRoles(contexts.workspaces.map((item) => item.role));
      if (!contexts.workspaces.some((item) => item.role === role))
        setRevoked(true);
      if (!contexts.workspaces.some((item) => item.role === next)) {
        setMessage('That workspace is no longer available.');
        return;
      }
      window.location.assign('/workspace?role=' + next);
      setMessage('');
    } catch {
      if (request === epoch.current)
        setMessage('Workspace availability could not be checked. Try again.');
    } finally {
      if (request === epoch.current) {
        busyRef.current = false;
        setPending(false);
      }
    }
  }
  return (
    <div className="cw-role-context">
      {roles.length === 2 ? (
        <fieldset disabled={pending} className="cw-role-switch">
          <legend>Workspace</legend>
          {(['student', 'instructor'] as const).map((item) => (
            <label key={item}>
              <input
                type="radio"
                name="workspace-role"
                checked={role === item}
                onChange={() => void select(item)}
              />
              {item === 'student' ? 'Student' : 'Instructor'}
            </label>
          ))}
        </fieldset>
      ) : roles.includes(role) ? (
        <span>{role === 'student' ? 'Student' : 'Instructor'}</span>
      ) : roles.length ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void select(roles[0])}
        >
          Open {roles[0] === 'student' ? 'Student' : 'Instructor'} workspace
        </button>
      ) : null}
      <span role="status">{message}</span>
      {revoked && <a href="/workspace">Return to available courses</a>}
    </div>
  );
}
