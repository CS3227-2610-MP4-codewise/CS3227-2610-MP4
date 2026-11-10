import { useEffect, useState } from 'react';
import { workspaceContextsSchema } from '../../shared/courses';
import { InstructorWorkspace } from '../instructor/Workspace';
import { StudentWorkspace } from './StudentWorkspace';
import { chooseWorkspace, parseStudentRoute } from './model';

/**
 * `/workspace` entry: always resolves the requested role against current trusted
 * contexts, so a stale `?role=` link cannot open a workspace the account no longer
 * holds. Delegates to the Student consumer only when contexts permit it; otherwise the
 * existing Instructor-first fallback is preserved. Each workspace still re-checks
 * authority on its own requests.
 */
export function WorkspaceEntry() {
  const [target, setTarget] = useState<'student' | 'instructor' | null>(null);
  useEffect(() => {
    let active = true;
    const requested = new URLSearchParams(window.location.search).get('role');
    const settle = (resolved: 'student' | 'instructor') => {
      if (!active) return;
      // Keep the address truthful so reloads and the Student route parser agree.
      if (requested !== null && requested !== resolved)
        window.history.replaceState(null, '', '/workspace?role=' + resolved);
      setTarget(resolved);
    };
    fetch('/api/courses/contexts', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('contexts');
        const roles = workspaceContextsSchema
          .parse(await response.json())
          .workspaces.map((item) => item.role);
        settle(chooseWorkspace(requested, roles));
      })
      .catch(() => {
        // Each workspace already renders its own sign-in/unavailable recovery.
        if (active)
          setTarget(requested === 'student' ? 'student' : 'instructor');
      });
    return () => {
      active = false;
    };
  }, []);
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
