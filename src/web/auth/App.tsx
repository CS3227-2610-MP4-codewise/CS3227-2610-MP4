import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  authViewSchema,
  bootstrapSchema,
  workspaceSchema,
  type AuthView,
} from '../../shared/auth';
import {
  managedCreatedSchema,
  coursePeopleSchema,
  okSchema,
  type CoursePerson,
} from '../../shared/managed-auth';
import { Action, StatusMessage } from '../ui/primitives';
import { Brand, Icon } from '../ui/brand';
import { AccountMenu } from '../ui/account-menu';
import { CourseNavigation } from '../ui/course-navigation';
import { WorkspaceSwitch } from '../ui/workspace-switch';
import {
  authMessage,
  authRequest,
  joinedWorkspaceMessage,
  parseInvitationPreview,
  takeAuthProof,
  type InvitationPreview,
} from './client';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import './styles.css';

// Strip capabilities immediately, before rendering or requesting any resources.
const {
  invite,
  code: proofCode,
  ticket,
} = takeAuthProof(window.location, (url) =>
  window.history.replaceState(null, '', url),
);

export function AuthApp() {
  const [configured, setConfigured] = useState<boolean | null>(null),
    [csrf, setCsrf] = useState(''),
    [view, setView] = useState<AuthView | null>(null);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [done, setDone] = useState(false),
    [ready, setReady] = useState(false),
    [listBusy, setListBusy] = useState(false),
    [listReady, setListReady] = useState(false);
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [showPassword, setShowPassword] = useState(false),
    [targetRole, setTargetRole] = useState<'student' | 'instructor'>('student'),
    [recoveryMode, setRecoveryMode] = useState<'existing' | 'reset'>(
      'existing',
    ),
    [preview, setPreview] = useState<InvitationPreview | null>(null),
    [joined, setJoined] = useState<{
      courseName: string;
      roles: ('student' | 'instructor')[];
    } | null>(null);
  const [course] = useState(
      new URLSearchParams(window.location.search).get('courseId') ?? '',
    ),
    [items, setItems] = useState<CoursePerson[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [workspace, setWorkspace] = useState(false);
  const lock = useRef(false);
  const listRequest = useRef(0);
  const path = window.location.pathname,
    invitations = path === '/auth/invitations',
    forgot = path === '/auth/forgot',
    reset = path === '/auth/reset',
    setup = !!invite;
  const newPassword = reset && !!proofCode && !done;
  const userId = view?.session.userId;
  useEffect(() => {
    const requestId = ++listRequest.current;
    let live = true;
    setItems([]);
    setListReady(false);
    setListBusy(false);
    if (invitations && course && userId) {
      setListBusy(true);
      void authRequest('people?courseId=' + encodeURIComponent(course))
        .then((result) => {
          const list = coursePeopleSchema.parse(result);
          if (live && requestId === listRequest.current) {
            setItems(list.items);
            setCursor(list.nextCursor);
            setListReady(true);
          }
        })
        .catch((error) => {
          if (live && requestId === listRequest.current) {
            setMessage(authMessage(error));
            if (
              error instanceof BoundaryError &&
              error.code === 'UNAUTHENTICATED'
            )
              setView(null);
          }
        })
        .finally(() => {
          if (live && requestId === listRequest.current) setListBusy(false);
        });
    }
    return () => {
      live = false;
      if (requestId === listRequest.current) listRequest.current++;
    };
  }, [invitations, course, userId]);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const boot = bootstrapSchema.parse(await authRequest('bootstrap'));
        if (!live) return;
        setConfigured(boot.configured);
        setCsrf(boot.csrfToken);
        if (boot.configured && setup) {
          const info = parseInvitationPreview(
            await authRequest('invitation/preview', boot.csrfToken, { invite }),
          );
          if (!live) return;
          setPreview(info);
          if (info.session !== 'none') {
            const user = authViewSchema.parse(await authRequest('session'));
            if (!live) return;
            setView(user);
          }
        }
        if (boot.configured && !forgot && !reset && !setup) {
          try {
            const user = authViewSchema.parse(await authRequest('session'));
            if (!live) return;
            setView(user);
            if (!invitations) {
              const result = workspaceSchema.parse(
                await authRequest('workspace'),
              );
              if (!live) return;
              if (
                result.state === 'authorized' &&
                (result.destination !== '/workspace' || path === '/sign-in')
              )
                window.location.assign(result.destination);
              setWorkspace(result.state === 'authorized');
            }
          } catch (e) {
            if (live && path !== '/sign-in') setMessage(authMessage(e));
          }
        }
      } catch (e) {
        if (live) setMessage(authMessage(e));
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [forgot, reset, setup, invitations, path]);
  useEffect(() => {
    if (!view) return;
    let live = true;
    const check = async () => {
      try {
        const next = authViewSchema.parse(await authRequest('session'));
        if (live) setView(next);
      } catch {
        if (live) {
          listRequest.current++;
          setView(null);
          setItems([]);
          setCursor(null);
          setMessage('Your session is no longer available. Sign in again.');
        }
      }
    };
    const timer = window.setTimeout(
      () => void check(),
      Math.max(0, Date.parse(view.session.expiresAt) - Date.now()),
    );
    window.addEventListener('pageshow', check);
    return () => {
      live = false;
      window.clearTimeout(timer);
      window.removeEventListener('pageshow', check);
    };
  }, [view]);
  async function act(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      if (
        view &&
        e instanceof BoundaryError &&
        ['UNAUTHENTICATED', 'FORBIDDEN'].includes(e.code)
      ) {
        listRequest.current++;
        if (e.code === 'UNAUTHENTICATED') setView(null);
        setItems([]);
        setCursor(null);
        setListReady(false);
      }
      setMessage(
        e instanceof BoundaryError && e.code === 'UNAUTHENTICATED'
          ? setup && preview && !('legacy' in preview) && preview.registered
            ? 'Could not join. Check your password and invitation, then try again.'
            : newPassword || setup || reset
              ? 'This link is invalid or expired. Request a new one.'
              : view
                ? 'Session expired. Sign in again.'
                : 'Sign-in failed. Check your email and password.'
          : authMessage(e),
      );
    } finally {
      lock.current = false;
      setPending(false);
      setPassword('');
      setConfirmation('');
    }
  }
  async function refresh(after = '') {
    const requestId = ++listRequest.current;
    setListBusy(true);
    try {
      const list = coursePeopleSchema.parse(
        await authRequest(
          'people?courseId=' +
            encodeURIComponent(course) +
            (after ? '&after=' + encodeURIComponent(after) : ''),
        ),
      );
      if (requestId === listRequest.current) {
        setItems((previous) =>
          after ? [...previous, ...list.items] : list.items,
        );
        setCursor(list.nextCursor);
        setListReady(true);
      }
    } finally {
      if (requestId === listRequest.current) setListBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void act(async () => {
      if (!forgot && ([...password].length < 8 || [...password].length > 64)) {
        setMessage('Use a password containing 8–64 characters.');
        return;
      }
      if (newPassword) {
        if (password !== confirmation) {
          setMessage('The passwords do not match.');
          return;
        }
        okSchema.parse(
          await authRequest(setup ? 'setup/confirm' : 'reset/confirm', csrf, {
            ...(setup ? { invite } : {}),
            code: proofCode,
            ticket,
            password,
          }),
        );
        setDone(true);
        setMessage('Sign in with your new password.');
      } else if (forgot) {
        okSchema.parse(await authRequest('reset/request', csrf, { email }));
        setMessage(
          'If your account is eligible, check your inbox for a reset link.',
        );
      } else {
        const requested = new URLSearchParams(window.location.search).get(
          'returnTo',
        );
        const returnTo =
          requested &&
          /^\/instructor\/assignments\/[A-Za-z0-9_-]{1,128}$/.test(requested)
            ? requested
            : '/workspace';
        okSchema.parse(
          await authRequest('login', csrf, { email, password, returnTo }),
        );
        let destination = '/workspace';
        try {
          const result = workspaceSchema.parse(await authRequest('workspace'));
          if (result.state === 'authorized' && result.destination)
            destination = result.destination;
        } catch {
          // Revoked or unavailable saved destinations fall back to the course list.
        }
        window.location.assign(destination);
      }
    });
  }
  const heading = invitations
    ? 'People'
    : joined
      ? 'Course joined'
      : done
        ? 'Password ready'
        : setup
          ? 'Join course'
          : reset
            ? 'Choose a new password'
            : forgot
              ? 'Reset your password'
              : view
                ? 'Your workbook'
                : 'Sign in';
  return (
    <div className="cw-shell auth-shell">
      <a className="cw-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="cw-header">
        <Brand href={view ? '/workspace' : '/'} />
        {view && (
          <nav className="cw-app-nav" aria-label="Main navigation">
            {invitations && (
              <WorkspaceSwitch
                role="instructor"
                courseId={course || undefined}
                beforeLeave={() => !pending}
              />
            )}
            <a href="/workspace">Courses</a>
            <AccountMenu
              email={view.email}
              busy={pending}
              onSignOut={() =>
                act(async () => {
                  okSchema.parse(
                    await authRequest('logout', view.csrfToken, {}),
                  );
                  setView(null);
                  setItems([]);
                  window.location.assign('/sign-in');
                })
              }
            />
          </nav>
        )}
      </header>
      {view && invitations && course && (
        <CourseNavigation courseId={course} active="students" />
      )}
      <main
        id="main-content"
        className={
          'auth-main' + (invitations && view ? ' auth-main--wide' : '')
        }
      >
        <section className="auth-panel" aria-labelledby="auth-heading">
          <div className="auth-heading">
            <Icon
              name={
                invitations
                  ? 'mail'
                  : view
                    ? 'book'
                    : done
                      ? 'check'
                      : forgot
                        ? 'mail'
                        : newPassword
                          ? 'lock'
                          : 'book'
              }
            />
            <h1 id="auth-heading">{heading}</h1>
            {forgot && <p>Enter your NUS email to request a reset link.</p>}
          </div>
          {message && <StatusMessage>{message}</StatusMessage>}
          {!ready ? (
            <StatusMessage>Loading…</StatusMessage>
          ) : !configured ? (
            <StatusMessage>
              Sign-in is unavailable. Please check back later.
            </StatusMessage>
          ) : (
            <>
              {joined ? (
                <>
                  <p>
                    Joined <strong>{joined.courseName}</strong> as{' '}
                    {joined.roles
                      .map((role) =>
                        role === 'student' ? 'Student' : 'Instructor',
                      )
                      .join(' and ')}
                    .
                  </p>
                  {joined.roles.map((role) => (
                    <p key={role}>{joinedWorkspaceMessage(role)}</p>
                  ))}
                  {joined.roles.includes('instructor') && (
                    <a className="cw-action" href="/workspace">
                      Open Instructor workspace <Icon name="arrow-right" />
                    </a>
                  )}
                </>
              ) : done ? (
                <a className="cw-action" href="/sign-in">
                  Sign in <Icon name="arrow-right" />
                </a>
              ) : setup ? (
                !preview ? (
                  <StatusMessage>
                    This invitation is unavailable. Ask your instructor for
                    help.
                  </StatusMessage>
                ) : (
                  <>
                    {'legacy' in preview ? (
                      <p>
                        This older invitation sets up your account only. It does
                        not grant course access.
                      </p>
                    ) : (
                      <p>
                        You are invited to join{' '}
                        <strong>{preview.courseName}</strong> as{' '}
                        {preview.roles
                          .map((role) =>
                            role === 'student' ? 'Student' : 'Instructor',
                          )
                          .join(' and ')}
                        .
                      </p>
                    )}
                    {preview.session === 'other' ? (
                      <>
                        <StatusMessage>
                          {'legacy' in preview
                            ? 'Sign out of your current account before setting up this invitation.'
                            : 'You are signed in to a different account. Use the invited account to join.'}
                        </StatusMessage>
                        <Action
                          pending={pending}
                          onClick={() =>
                            void act(async () => {
                              if (!view)
                                throw new BoundaryError('UNAUTHENTICATED');
                              okSchema.parse(
                                await authRequest('logout', view.csrfToken, {}),
                              );
                              setView(null);
                              const boot = bootstrapSchema.parse(
                                await authRequest('bootstrap'),
                              );
                              setCsrf(boot.csrfToken);
                              setPreview(
                                parseInvitationPreview(
                                  await authRequest(
                                    'invitation/preview',
                                    boot.csrfToken,
                                    { invite },
                                  ),
                                ),
                              );
                            })
                          }
                        >
                          Use another account
                        </Action>
                      </>
                    ) : 'legacy' in preview ? (
                      !proofCode || !ticket ? (
                        <>
                          <p>Request a new link to set up your account.</p>
                          <Action
                            className="auth-primary"
                            pending={pending}
                            onClick={() =>
                              void act(async () => {
                                okSchema.parse(
                                  await authRequest('setup/request', csrf, {
                                    invite,
                                  }),
                                );
                                setMessage(
                                  'Check your inbox for the setup link.',
                                );
                              })
                            }
                          >
                            Email setup link
                          </Action>
                        </>
                      ) : (
                        <>
                          <form
                            className="auth-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void act(async () => {
                                if (
                                  [...password].length < 8 ||
                                  [...password].length > 64
                                ) {
                                  setMessage(
                                    'Use a password containing 8–64 characters.',
                                  );
                                  return;
                                }
                                if (password !== confirmation) {
                                  setMessage('The passwords do not match.');
                                  return;
                                }
                                okSchema.parse(
                                  await authRequest('setup/confirm', csrf, {
                                    invite,
                                    ticket,
                                    code: proofCode,
                                    password,
                                  }),
                                );
                                setDone(true);
                                setMessage(
                                  'Account setup complete. Sign in with your new password. Course access is not included in this invitation.',
                                );
                              });
                            }}
                          >
                            <div className="auth-field">
                              <label htmlFor="legacy-password">
                                New Codewise password
                              </label>
                              <input
                                id="legacy-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                minLength={8}
                                maxLength={128}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                              />
                            </div>
                            <div className="auth-field">
                              <label htmlFor="legacy-confirmation">
                                Confirm password
                              </label>
                              <input
                                id="legacy-confirmation"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                value={confirmation}
                                onChange={(e) =>
                                  setConfirmation(e.target.value)
                                }
                              />
                              <p className="auth-hint">8–64 characters.</p>
                            </div>
                            <button
                              type="button"
                              className="cw-text-action"
                              aria-pressed={showPassword}
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword
                                ? 'Hide passwords'
                                : 'Show passwords'}
                            </button>
                            <Action
                              className="auth-primary"
                              type="submit"
                              pending={pending}
                            >
                              Create password <Icon name="arrow-right" />
                            </Action>
                          </form>
                          <details className="auth-help">
                            <summary>Setup link expired?</summary>
                            <Action
                              variant="secondary"
                              pending={pending}
                              onClick={() =>
                                void act(async () => {
                                  okSchema.parse(
                                    await authRequest('setup/request', csrf, {
                                      invite,
                                    }),
                                  );
                                  setMessage(
                                    'Check your inbox for a new setup link.',
                                  );
                                })
                              }
                            >
                              Email a new setup link
                            </Action>
                          </details>
                        </>
                      )
                    ) : !preview.registered && (!proofCode || !ticket) ? (
                      <>
                        <p>
                          Request a new link to create your password and join.
                        </p>
                        <Action
                          className="auth-primary"
                          pending={pending}
                          onClick={() =>
                            void act(async () => {
                              okSchema.parse(
                                await authRequest('setup/request', csrf, {
                                  invite,
                                }),
                              );
                              setMessage(
                                'Check your inbox for the setup link.',
                              );
                            })
                          }
                        >
                          <Icon name="mail" /> Email setup link
                        </Action>
                      </>
                    ) : (
                      <>
                        <form
                          className="auth-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void act(async () => {
                              if (
                                [...password].length < 8 ||
                                [...password].length > 64
                              ) {
                                setMessage(
                                  'Use a password containing 8–64 characters.',
                                );
                                return;
                              }
                              if (
                                !preview.registered &&
                                (!preview.recovery ||
                                  recoveryMode === 'reset') &&
                                password !== confirmation
                              ) {
                                setMessage('The passwords do not match.');
                                return;
                              }
                              try {
                                okSchema.parse(
                                  await authRequest('invitation/join', csrf, {
                                    invite,
                                    password,
                                    roles: preview.roles,
                                    ...(preview.recovery
                                      ? { mode: recoveryMode }
                                      : {}),
                                    ...(!preview.registered
                                      ? { ticket, code: proofCode }
                                      : {}),
                                  }),
                                );
                              } catch (error) {
                                if (
                                  error instanceof BoundaryError &&
                                  error.code === 'INVALID_CONTRACT'
                                ) {
                                  const updated = parseInvitationPreview(
                                    await authRequest(
                                      'invitation/preview',
                                      csrf,
                                      { invite },
                                    ),
                                  );
                                  setPreview(updated);
                                  setMessage(
                                    'The invitation may have changed. Review the current roles and details before trying again.',
                                  );
                                  return;
                                }
                                throw error;
                              }
                              setJoined({
                                courseName: preview.courseName,
                                roles: preview.roles,
                              });
                              try {
                                setView(
                                  authViewSchema.parse(
                                    await authRequest('session'),
                                  ),
                                );
                              } catch {
                                // The completed join remains acknowledged even if session refresh fails.
                              }
                            });
                          }}
                        >
                          {preview.recovery && (
                            <div className="auth-field">
                              <label htmlFor="recovery-mode">
                                Choose how to sign in
                              </label>
                              <select
                                id="recovery-mode"
                                value={recoveryMode}
                                onChange={(e) =>
                                  setRecoveryMode(
                                    e.target.value as 'existing' | 'reset',
                                  )
                                }
                              >
                                <option value="existing">
                                  Use my existing password
                                </option>
                                <option value="reset">
                                  Create or reset my password
                                </option>
                              </select>
                              <p className="auth-hint">
                                Resetting changes this account's password
                                everywhere it is used.
                              </p>
                            </div>
                          )}
                          <div className="auth-field">
                            <label htmlFor="join-password">
                              {preview.registered ||
                              (preview.recovery && recoveryMode === 'existing')
                                ? 'Existing Codewise password'
                                : 'New Codewise password'}
                            </label>
                            <input
                              id="join-password"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete={
                                preview.registered ||
                                (preview.recovery &&
                                  recoveryMode === 'existing')
                                  ? 'current-password'
                                  : 'new-password'
                              }
                              required
                              minLength={8}
                              maxLength={128}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                            />
                          </div>
                          {!preview.registered &&
                            (!preview.recovery || recoveryMode === 'reset') && (
                              <div className="auth-field">
                                <label htmlFor="join-confirmation">
                                  Confirm password
                                </label>
                                <input
                                  id="join-confirmation"
                                  type={showPassword ? 'text' : 'password'}
                                  autoComplete="new-password"
                                  required
                                  value={confirmation}
                                  onChange={(e) =>
                                    setConfirmation(e.target.value)
                                  }
                                />
                                <p className="auth-hint">8–64 characters.</p>
                              </div>
                            )}
                          <button
                            type="button"
                            className="cw-text-action"
                            aria-pressed={showPassword}
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? 'Hide passwords' : 'Show passwords'}
                          </button>
                          <Action
                            className="auth-primary"
                            type="submit"
                            pending={pending}
                          >
                            {preview.registered ||
                            (preview.recovery && recoveryMode === 'existing')
                              ? 'Sign in and join course'
                              : 'Create password and join course'}{' '}
                            <Icon name="arrow-right" />
                          </Action>
                        </form>
                        {!preview.registered && (
                          <details className="auth-help">
                            <summary>Setup link expired?</summary>
                            <Action
                              variant="secondary"
                              pending={pending}
                              onClick={() =>
                                void act(async () => {
                                  okSchema.parse(
                                    await authRequest('setup/request', csrf, {
                                      invite,
                                    }),
                                  );
                                  setMessage(
                                    'Check your inbox for a new setup link.',
                                  );
                                })
                              }
                            >
                              Email a new setup link
                            </Action>
                          </details>
                        )}
                      </>
                    )}
                  </>
                )
              ) : reset && !proofCode ? (
                <>
                  <StatusMessage>This reset link is invalid.</StatusMessage>
                  <a href="/auth/forgot">Request a new link</a>
                </>
              ) : !view || newPassword || forgot ? (
                <>
                  <form onSubmit={submit} className="auth-form">
                    {!newPassword && (
                      <div className="auth-field">
                        <label htmlFor="email">NUS email</label>
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          required
                          maxLength={254}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    )}
                    {!forgot && (
                      <>
                        <div className="auth-field">
                          <div className="auth-label-row">
                            <label htmlFor="password">
                              {newPassword
                                ? 'New Codewise password'
                                : 'Codewise password'}
                            </label>
                            {!newPassword && (
                              <a href="/auth/forgot">Forgot password?</a>
                            )}
                          </div>
                          <div className="auth-password">
                            <input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete={
                                newPassword
                                  ? 'new-password'
                                  : 'current-password'
                              }
                              required
                              minLength={8}
                              maxLength={128}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              aria-describedby={
                                newPassword ? 'password-help' : undefined
                              }
                            />
                            <button
                              type="button"
                              className="cw-icon-button"
                              aria-label={
                                showPassword ? 'Hide password' : 'Show password'
                              }
                              title={
                                showPassword ? 'Hide password' : 'Show password'
                              }
                              aria-pressed={showPassword}
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              <Icon name={showPassword ? 'eye-off' : 'eye'} />
                            </button>
                          </div>
                          {newPassword && (
                            <p id="password-help" className="auth-hint">
                              8–64 characters.
                            </p>
                          )}
                        </div>
                        {newPassword && (
                          <div className="auth-field">
                            <label htmlFor="confirmation">
                              Confirm password
                            </label>
                            <input
                              id="confirmation"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              required
                              value={confirmation}
                              onChange={(e) => setConfirmation(e.target.value)}
                            />
                          </div>
                        )}
                      </>
                    )}
                    <Action
                      className="auth-primary"
                      type="submit"
                      pending={pending}
                    >
                      {newPassword
                        ? 'Save password'
                        : forgot
                          ? 'Email reset link'
                          : 'Sign in'}
                      <Icon name="arrow-right" />
                    </Action>
                  </form>
                  {newPassword && (
                    <details className="auth-help">
                      <summary>Link expired?</summary>
                      {setup ? (
                        <Action
                          variant="secondary"
                          pending={pending}
                          onClick={() =>
                            void act(async () => {
                              okSchema.parse(
                                await authRequest('setup/request', csrf, {
                                  invite,
                                }),
                              );
                              setMessage(
                                'Check your inbox for the setup link.',
                              );
                            })
                          }
                        >
                          Email a new setup link
                        </Action>
                      ) : (
                        <a href="/auth/forgot">Request a new reset link</a>
                      )}
                    </details>
                  )}
                  {(forgot || reset || setup) && (
                    <a className="auth-back" href="/sign-in">
                      <Icon name="arrow-left" />
                      Back to sign in
                    </a>
                  )}
                </>
              ) : invitations ? (
                <>
                  {!course ? (
                    <StatusMessage>
                      Open invitations from your course workspace to select a
                      class.
                    </StatusMessage>
                  ) : (
                    <>
                      <form
                        className="auth-invite-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void act(async () => {
                            const result = managedCreatedSchema.parse(
                              await authRequest('invitations', view.csrfToken, {
                                courseId: course,
                                email,
                                targetRole,
                              }),
                            );
                            setEmail('');
                            await refresh();
                            setMessage(
                              result.reused
                                ? 'This invitation already exists. No new email was sent.'
                                : result.invitation.sendState === 'queued'
                                  ? 'Invitation email queued.'
                                  : 'Sending was not confirmed. Check the status below.',
                            );
                          });
                        }}
                      >
                        <div className="auth-field">
                          <label htmlFor="invite-email">NUS email</label>
                          <input
                            id="invite-email"
                            type="email"
                            autoComplete="off"
                            required
                            disabled={pending}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                        <div className="auth-field">
                          <label htmlFor="invite-role">Role</label>
                          <select
                            id="invite-role"
                            disabled={pending}
                            value={targetRole}
                            onChange={(e) =>
                              setTargetRole(
                                e.target.value as 'student' | 'instructor',
                              )
                            }
                          >
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                          </select>
                        </div>
                        <Action type="submit" pending={pending}>
                          <Icon name="plus" />
                          Send invitation
                        </Action>
                      </form>
                      <div className="auth-list-heading">
                        <h2>People in this course</h2>
                        <button
                          className="cw-icon-button"
                          type="button"
                          disabled={pending || listBusy}
                          aria-label="Refresh people"
                          title="Refresh people"
                          onClick={() => void act(() => refresh())}
                        >
                          <Icon name="refresh" />
                        </button>
                      </div>
                      {listBusy ? (
                        <StatusMessage>Loading people…</StatusMessage>
                      ) : !listReady ? (
                        <p className="auth-hint">
                          People could not be loaded. Try refreshing.
                        </p>
                      ) : items.length === 0 ? (
                        <p className="auth-empty">No people yet.</p>
                      ) : (
                        <ul className="auth-invites">
                          {items.map((i) => (
                            <li key={i.email}>
                              <div>
                                <strong>{i.email}</strong>
                                <div className="auth-person-status">
                                  {i.activeRoles.length > 0 && (
                                    <p>
                                      {i.isCoordinator && (
                                        <span>Course coordinator · </span>
                                      )}
                                      {i.activeRoles
                                        .map((role) =>
                                          role === 'student'
                                            ? 'Student'
                                            : 'Instructor',
                                        )
                                        .join(' and ')}{' '}
                                      <span className="auth-person-active">
                                        · Active
                                      </span>
                                    </p>
                                  )}
                                  {i.pendingRoles.length > 0 && (
                                    <p>
                                      {i.pendingRoles
                                        .map((role) =>
                                          role === 'student'
                                            ? 'Student'
                                            : 'Instructor',
                                        )
                                        .join(' and ')}{' '}
                                      · Awaiting acceptance
                                    </p>
                                  )}
                                  {i.pendingRoles.length > 0 && (
                                    <p>
                                      {i.sendState === 'queued'
                                        ? 'Email queued'
                                        : i.sendState === 'failed'
                                          ? 'Email failed'
                                          : 'Send unconfirmed'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {i.invitationId && (
                                <div className="auth-actions">
                                  <Action
                                    variant="secondary"
                                    pending={pending}
                                    aria-label={
                                      'Resend invitation to ' + i.email
                                    }
                                    onClick={() =>
                                      void act(async () => {
                                        okSchema.parse(
                                          await authRequest(
                                            'invitations/' +
                                              i.invitationId +
                                              '/resend',
                                            view.csrfToken,
                                            { courseId: course },
                                          ),
                                        );
                                        await refresh();
                                        setMessage(
                                          'Invitation status updated.',
                                        );
                                      })
                                    }
                                  >
                                    <Icon name="mail" />
                                    Resend
                                  </Action>
                                  <button
                                    className="cw-text-action cw-danger-action"
                                    type="button"
                                    disabled={pending}
                                    aria-label={
                                      'Revoke invitation for ' + i.email
                                    }
                                    title="Revoke invitation"
                                    onClick={() => {
                                      if (
                                        !window.confirm(
                                          'Revoke the invitation for ' +
                                            i.email +
                                            '? They will no longer be able to use it.',
                                        )
                                      )
                                        return;
                                      void act(async () => {
                                        okSchema.parse(
                                          await authRequest(
                                            'invitations/' +
                                              i.invitationId +
                                              '/revoke',
                                            view.csrfToken,
                                            { courseId: course },
                                          ),
                                        );
                                        await refresh();
                                        setMessage('Invitation revoked.');
                                      });
                                    }}
                                  >
                                    <Icon name="trash" />
                                    Revoke
                                  </button>
                                </div>
                              )}
                              {i.userId &&
                                !(i.isCoordinator && i.userId === userId) && (
                                  <button
                                    className="cw-text-action cw-danger-action"
                                    type="button"
                                    disabled={pending}
                                    onClick={() => {
                                      if (
                                        !window.confirm(
                                          'Remove ' +
                                            i.email +
                                            ' from this course? Their active roles and pending invitations for this course will be removed.',
                                        )
                                      )
                                        return;
                                      void act(async () => {
                                        okSchema.parse(
                                          await authRequest(
                                            'people/remove',
                                            view.csrfToken,
                                            {
                                              courseId: course,
                                              userId: i.userId,
                                            },
                                          ),
                                        );
                                        if (i.userId === userId) {
                                          window.location.assign('/workspace');
                                          return;
                                        }
                                        await refresh();
                                        setMessage(
                                          'Person removed from this course.',
                                        );
                                      });
                                    }}
                                  >
                                    Remove from course
                                  </button>
                                )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {cursor && (
                        <Action
                          variant="secondary"
                          pending={pending}
                          onClick={() => void act(() => refresh(cursor))}
                        >
                          Show more
                        </Action>
                      )}
                      <details className="auth-help">
                        <summary>About invitation status</summary>
                        <p>
                          Invitations stay open until used or revoked. Queued
                          means accepted by the mail server, not delivered.
                          Acceptance adds the invited course role.
                        </p>
                      </details>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p>
                    {workspace
                      ? 'Your course access is confirmed.'
                      : 'Your course workspace is not available yet.'}
                  </p>
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
