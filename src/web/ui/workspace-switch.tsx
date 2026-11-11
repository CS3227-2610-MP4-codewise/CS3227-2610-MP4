import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { authViewSchema, type AuthView } from '../../shared/auth';
import { authRequest } from '../auth/client';
import { workspaceContextsSchema } from '../../shared/courses';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import { courseClient, courseRequest } from '../instructor/courses/client';

type Role = 'student' | 'instructor';
type Failure = 'session' | 'revoked' | 'denied' | 'unavailable';
type AccountSession = Pick<AuthView, 'session' | 'csrfToken'>;
const identityKey = (account: AccountSession) =>
  JSON.stringify([account.session.userId, account.csrfToken]);
function throwCheckFailure(results: PromiseSettledResult<unknown>[]) {
  const failures = results.filter((result) => result.status === 'rejected');
  const sessionLoss = failures.find(
    (result) =>
      result.reason instanceof BoundaryError &&
      result.reason.code === 'UNAUTHENTICATED',
  );
  if (sessionLoss) throw sessionLoss.reason;
  if (failures.length) throw failures[0].reason;
}
// DOM checks can verify destinations without navigating the test browser.
export const workspaceNavigation = {
  open(role: Role) {
    window.location.assign('/workspace?role=' + role);
  },
};
const recovery = {
  session: [
    'Sign in to continue',
    'Your session has changed or ended. Sign in again to continue.',
  ],
  revoked: [
    'Workspace unavailable',
    'This workspace is no longer available. Choose an available workspace.',
  ],
  denied: [
    'Course unavailable',
    'This course is no longer available to your account.',
  ],
  unavailable: [
    'Workspace unavailable',
    'Workspace availability could not be checked. Reload to try again.',
  ],
} as const;

export function WorkspaceSwitch({
  role,
  beforeLeave,
  courseId,
  courses,
  csrf,
  account,
}: {
  role: Role;
  beforeLeave?: () => boolean;
  courseId?: string;
  courses?: { id: string }[];
  csrf?: string;
  account?: AccountSession;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [pending, setPending] = useState(true);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [shell, setShell] = useState<HTMLElement | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const epoch = useRef(0);
  const busyRef = useRef(false);
  const failed = useRef(false);
  const mounted = useRef(false);
  const arrivedRole = useRef<Role | null>(null);
  const focusBeforeCheck = useRef<HTMLElement | null>(null);
  const sessionIdentity = useRef<string | null>(null);
  const expectedIdentity = account ? identityKey(account) : null;
  const courseIds = courses?.map((item) => item.id).join(',') ?? '';

  useLayoutEffect(() => {
    setShell(
      anchor.current?.closest<HTMLElement>('.cw-shell, .assessment-app') ??
        null,
    );
  }, []);
  useLayoutEffect(() => {
    if (!shell) return;
    // Recovery is outside the protected page hidden by the scoped stylesheet.
    if (failure || pending)
      shell.dataset.workspaceAccess = failure ?? 'checking';
    else delete shell.dataset.workspaceAccess;
    return () => {
      delete shell.dataset.workspaceAccess;
    };
  }, [shell, failure, pending]);
  useLayoutEffect(() => {
    if (failure) heading.current?.focus();
  }, [failure, shell]);
  useLayoutEffect(() => {
    if (
      expectedIdentity &&
      sessionIdentity.current &&
      expectedIdentity !== sessionIdentity.current
    )
      block('session');
  }, [expectedIdentity]);
  useLayoutEffect(() => {
    if (!shell || pending || failure || failed.current || !roles.includes(role))
      return;
    // Parent headings may try to focus while the protected page is still hidden.
    // Finish the transition only after the shared authorization mask is removed.
    if (arrivedRole.current !== role) {
      arrivedRole.current = role;
      setMessage(
        `${role === 'instructor' ? 'Instructor' : 'Student'} workspace opened.`,
      );
      if (new URLSearchParams(window.location.search).get('role') === role) {
        const destination = shell.querySelector<HTMLElement>(
          'main:not(.cw-workspace-recovery) h1',
        );
        if (destination) {
          destination.tabIndex = -1;
          destination.focus();
        }
      }
    } else {
      const previous = focusBeforeCheck.current;
      if (
        previous?.isConnected &&
        (document.activeElement === document.body ||
          document.activeElement === previous)
      )
        previous.focus();
    }
    focusBeforeCheck.current = null;
  }, [shell, pending, failure, roles, role]);

  function rememberFocus() {
    const active = document.activeElement;
    const scope = anchor.current?.closest('.cw-shell, .assessment-app');
    focusBeforeCheck.current =
      active instanceof HTMLElement &&
      scope?.contains(active) &&
      !active.closest('.cw-workspace-recovery')
        ? active
        : null;
  }

  function block(reason: Failure) {
    failed.current = true;
    setFailure((previous) => (previous === 'session' ? previous : reason));
    if (reason === 'session') setRoles([]);
    setMessage('');
  }
  function reject(error: unknown) {
    block(
      error instanceof BoundaryError && error.code === 'UNAUTHENTICATED'
        ? 'session'
        : error instanceof BoundaryError &&
            ['FORBIDDEN', 'NOT_FOUND'].includes(error.code)
          ? 'denied'
          : 'unavailable',
    );
  }

  function acceptSession(view: AuthView) {
    const identity = identityKey(view);
    if (
      (sessionIdentity.current && sessionIdentity.current !== identity) ||
      (expectedIdentity && expectedIdentity !== identity) ||
      (csrf && csrf !== view.csrfToken)
    ) {
      block('session');
      return false;
    }
    sessionIdentity.current = identity;
    return true;
  }
  async function checks(includeCourse: boolean) {
    const results = await Promise.allSettled([
      authRequest('session').then((body) => authViewSchema.parse(body)),
      courseRequest('/contexts').then((body) =>
        workspaceContextsSchema.parse(body),
      ),
      includeCourse && courseId
        ? courseRequest('/' + encodeURIComponent(courseId))
        : Promise.resolve(null),
      includeCourse && courseIds && csrf
        ? courseClient.verify(courseIds.split(','), csrf)
        : Promise.resolve(null),
    ]);
    throwCheckFailure(results);
    const [session, contexts] = results;
    if (session.status !== 'fulfilled' || contexts.status !== 'fulfilled')
      throw new Error('Unavailable checks');
    return { session: session.value, contexts: contexts.value };
  }
  useEffect(() => {
    mounted.current = true;
    let current = true;
    const refresh = () => {
      const request = ++epoch.current;
      if (!busyRef.current) rememberFocus();
      busyRef.current = true;
      setPending(true);
      void checks(true)
        .then(({ session, contexts }) => {
          if (!current || request !== epoch.current) return;
          if (!acceptSession(session)) return;
          const available = contexts.workspaces.map((item) => item.role);
          // Reload private data and account after a failure. A later focus response
          // must never unmask an earlier account's stale page.
          if (!failed.current) setRoles(available);
          if (!available.includes(role)) block('revoked');
        })
        .catch((error: unknown) => {
          if (current && request === epoch.current) reject(error);
        })
        .finally(() => {
          if (current && request === epoch.current) {
            busyRef.current = false;
            setPending(false);
          }
        });
    };
    refresh();
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', restore);
    return () => {
      current = false;
      mounted.current = false;
      ++epoch.current;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', restore);
    };
  }, [role, courseId, courseIds, csrf, expectedIdentity]);

  async function select(next: Role) {
    if (busyRef.current || next === role || (beforeLeave && !beforeLeave()))
      return;
    if (busyRef.current) return;
    rememberFocus();
    busyRef.current = true;
    setPending(true);
    const request = ++epoch.current;
    setMessage('Checking workspace availability.');
    try {
      const { session, contexts } = await checks(false);
      if (!mounted.current || request !== epoch.current) return;
      if (!acceptSession(session)) return;
      const available = contexts.workspaces.map((item) => item.role);
      if (!failed.current) setRoles(available);
      if (!available.includes(role)) block('revoked');
      if (!available.includes(next)) {
        setMessage('That workspace is no longer available.');
        return;
      }
      workspaceNavigation.open(next);
      setMessage('');
      // Native beforeunload may cancel. Restore the validated page if we stay.
    } catch (error: unknown) {
      if (mounted.current && request === epoch.current) reject(error);
    } finally {
      if (mounted.current && request === epoch.current) {
        busyRef.current = false;
        setPending(false);
      }
    }
  }
  return (
    <div className="cw-role-context" ref={anchor}>
      {roles.length === 2 ? (
        <div className="cw-role-switch" role="group" aria-label="Workspace">
          <label>
            <span>Student</span>
            <input
              type="checkbox"
              role="switch"
              aria-label="Instructor workspace"
              checked={role === 'instructor'}
              disabled={pending}
              onChange={() =>
                void select(role === 'student' ? 'instructor' : 'student')
              }
            />
            <span className="cw-role-track" aria-hidden="true" />
            <span>Instructor</span>
          </label>
        </div>
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
      {!failure && <span role="status">{message}</span>}
      {shell &&
        (failure || pending) &&
        createPortal(
          <main
            className="cw-workspace-recovery cw-home"
            id="workspace-recovery"
            aria-busy={pending}
          >
            {failure ? (
              <>
                <h1 ref={heading} tabIndex={-1}>
                  {recovery[failure][0]}
                </h1>
                <p role="status">{recovery[failure][1]}</p>
                {failure === 'session' ? (
                  <a className="cw-action" href="/sign-in">
                    Sign in
                  </a>
                ) : (
                  <>
                    <a
                      className="cw-action"
                      href={window.location.pathname + window.location.search}
                    >
                      Reload workspace
                    </a>
                    <a className="cw-action" href="/workspace">
                      Return to available courses
                    </a>
                  </>
                )}
              </>
            ) : (
              <p role="status">Checking workspace availability.</p>
            )}
          </main>,
          shell,
        )}
    </div>
  );
}
