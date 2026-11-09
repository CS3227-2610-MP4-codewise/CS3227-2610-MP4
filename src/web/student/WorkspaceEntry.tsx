import { useEffect, useState } from 'react';
import { workspaceContextsSchema } from '../../shared/courses';
import { InstructorWorkspace } from '../instructor/Workspace';
import { StudentWorkspace } from './StudentWorkspace';
import { parseStudentRoute } from './model';

/**
 * `/workspace` entry: delegates to the Student consumer only when trusted contexts
 * permit it. An explicit role preference is honoured by each workspace's own checks;
 * otherwise the existing Instructor-first fallback is preserved.
 */
export function WorkspaceEntry() {
  const role = new URLSearchParams(window.location.search).get('role');
  const [target, setTarget] = useState<'student' | 'instructor' | null>(
    role === 'student' ? 'student' : role ? 'instructor' : null,
  );
  useEffect(() => {
    if (target) return;
    let active = true;
    fetch('/api/courses/contexts', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('contexts');
        const roles = workspaceContextsSchema
          .parse(await response.json())
          .workspaces.map((item) => item.role);
        if (active)
          setTarget(
            !roles.includes('instructor') && roles.includes('student')
              ? 'student'
              : 'instructor',
          );
      })
      .catch(() => {
        // The existing workspace already renders sign-in/unavailable recovery.
        if (active) setTarget('instructor');
      });
    return () => {
      active = false;
    };
  }, [target]);
  if (target === 'student')
    return (
      <StudentWorkspace
        route={parseStudentRoute(
          window.location.pathname,
          window.location.search,
        )}
      />
    );
  if (target === 'instructor') return <InstructorWorkspace />;
  return (
    <p role="status" className="cw-home">
      Loading your workspace…
    </p>
  );
}
