import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  authViewSchema,
  bootstrapSchema,
  workspaceSchema,
  type AuthView,
} from '../../shared/auth';
import {
  managedCreatedSchema,
  managedInvitationListSchema,
  okSchema,
  type ManagedInvitation,
} from '../../shared/managed-auth';
import { Action, StatusMessage } from '../ui/primitives';
import { Brand, Icon } from '../ui/brand';
import { authMessage, authRequest, takeAuthProof } from './client';
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
    [showPassword, setShowPassword] = useState(false);
  const [course] = useState(
      new URLSearchParams(window.location.search).get('courseId') ?? '',
    ),
    [items, setItems] = useState<ManagedInvitation[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [workspace, setWorkspace] = useState(false);
  const lock = useRef(false);
  const listRequest = useRef(0);
  const path = window.location.pathname,
    invitations = path === '/auth/invitations',
    forgot = path === '/auth/forgot',
    reset = path === '/auth/reset',
    setup = !!invite;
  const newPassword = (reset || setup) && !!proofCode && !done;
  const userId = view?.session.userId;
  useEffect(() => {
    const requestId = ++listRequest.current;
    let live = true;
    setItems([]);
    setListReady(false);
    setListBusy(false);
    if (invitations && course && userId) {
      setListBusy(true);
      void authRequest('invitations?courseId=' + encodeURIComponent(course))
        .then((result) => {
          const list = managedInvitationListSchema.parse(result);
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
                result.destination !== '/workspace'
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
          ? newPassword || setup || reset
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
      const list = managedInvitationListSchema.parse(
        await authRequest(
          'invitations?courseId=' +
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
        okSchema.parse(await authRequest('login', csrf, { email, password }));
        window.location.assign('/workspace');
      }
    });
  }
  const heading = invitations
    ? 'Invite your students'
    : done
      ? 'Password ready'
      : setup
        ? 'Create your password'
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
        <Brand />
        {view && (
          <nav aria-label="Account">
            <span className="auth-account-email">
              {view.administrator ? 'Account admin · ' : ''}
              {view.email}
            </span>
            <a
              href="/workspace"
              aria-current={!invitations ? 'page' : undefined}
            >
              Workspace
            </a>
            <a
              href={
                course
                  ? '/auth/invitations?courseId=' + encodeURIComponent(course)
                  : '/auth/invitations'
              }
              aria-current={invitations ? 'page' : undefined}
            >
              Invitations
            </a>
            <button
              className="cw-icon-button"
              type="button"
              disabled={pending}
              aria-label="Sign out"
              title="Sign out"
              onClick={() =>
                void act(async () => {
                  okSchema.parse(
                    await authRequest('logout', view.csrfToken, {}),
                  );
                  setView(null);
                  setItems([]);
                  window.location.assign('/sign-in');
                })
              }
            >
              <Icon name="logout" />
            </button>
          </nav>
        )}
      </header>
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
              {done ? (
                <a className="cw-action" href="/sign-in">
                  Sign in <Icon name="arrow-right" />
                </a>
              ) : setup && !proofCode ? (
                <>
                  <p>Request a new link to finish setting your password.</p>
                  <Action
                    className="auth-primary"
                    pending={pending}
                    onClick={() =>
                      void act(async () => {
                        okSchema.parse(
                          await authRequest('setup/request', csrf, { invite }),
                        );
                        setMessage('Check your inbox for the setup link.');
                      })
                    }
                  >
                    <Icon name="mail" />
                    Email setup link
                  </Action>
                </>
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
                              }),
                            );
                            setEmail('');
                            await refresh();
                            setMessage(
                              result.invitation.sendState === 'queued'
                                ? 'Invitation queued.'
                                : 'Sending was not confirmed. Check the status below.',
                            );
                          });
                        }}
                      >
                        <div className="auth-field">
                          <label htmlFor="invite-email">
                            Student NUS email
                          </label>
                          <input
                            id="invite-email"
                            type="email"
                            autoComplete="off"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                        <Action type="submit" pending={pending}>
                          <Icon name="plus" />
                          Invite student
                        </Action>
                      </form>
                      <div className="auth-list-heading">
                        <h2>Invited students</h2>
                        <button
                          className="cw-icon-button"
                          type="button"
                          disabled={pending || listBusy}
                          aria-label="Refresh invitations"
                          title="Refresh invitations"
                          onClick={() => void act(() => refresh())}
                        >
                          <Icon name="refresh" />
                        </button>
                      </div>
                      {listBusy ? (
                        <StatusMessage>Loading invitations…</StatusMessage>
                      ) : !listReady ? (
                        <p className="auth-hint">
                          Invitations could not be loaded. Try refreshing.
                        </p>
                      ) : items.length === 0 ? (
                        <p className="auth-empty">No invitations yet.</p>
                      ) : (
                        <ul className="auth-invites">
                          {items.map((i) => (
                            <li key={i.id}>
                              <div>
                                <strong>{i.email}</strong>
                                <p>
                                  <span
                                    className={
                                      'auth-state auth-state--' + i.status
                                    }
                                  >
                                    {i.status === 'pending'
                                      ? 'Awaiting signup'
                                      : i.status === 'accepted'
                                        ? 'Signed up'
                                        : 'Revoked'}
                                  </span>
                                  {i.status === 'pending' && (
                                    <span>
                                      {' '}
                                      ·{' '}
                                      {i.sendState === 'queued'
                                        ? 'Email queued'
                                        : i.sendState === 'failed'
                                          ? 'Email failed'
                                          : 'Send unconfirmed'}
                                    </span>
                                  )}
                                </p>
                              </div>
                              {i.status === 'pending' && (
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
                                            'invitations/' + i.id + '/resend',
                                            view.csrfToken,
                                            { courseId: course },
                                          ),
                                        );
                                        await refresh();
                                        setMessage('Send attempt recorded.');
                                      })
                                    }
                                  >
                                    <Icon name="mail" />
                                    Resend
                                  </Action>
                                  <button
                                    className="cw-icon-button"
                                    type="button"
                                    disabled={pending}
                                    aria-label={
                                      'Revoke invitation for ' + i.email
                                    }
                                    title="Revoke invitation"
                                    onClick={() =>
                                      void act(async () => {
                                        okSchema.parse(
                                          await authRequest(
                                            'invitations/' + i.id + '/revoke',
                                            view.csrfToken,
                                            { courseId: course },
                                          ),
                                        );
                                        await refresh();
                                        setMessage('Invitation revoked.');
                                      })
                                    }
                                  >
                                    <Icon name="trash" />
                                  </button>
                                </div>
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
                          emails are awaiting delivery. Course membership is
                          managed separately.
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
