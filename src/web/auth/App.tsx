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
import { authMessage, authRequest, takeAuthProof } from './client';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import './styles.css';

// Strip capabilities immediately, before rendering or requesting any resources.
const { invite, code: proofCode } = takeAuthProof(window.location, (url) =>
  window.history.replaceState(null, '', url),
);

export function AuthApp() {
  const [configured, setConfigured] = useState<boolean | null>(null),
    [csrf, setCsrf] = useState(''),
    [view, setView] = useState<AuthView | null>(null);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [done, setDone] = useState(false);
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
  const path = window.location.pathname,
    invitations = path === '/auth/invitations',
    forgot = path === '/auth/forgot',
    reset = path === '/auth/reset',
    setup = !!invite;
  const newPassword = (reset || setup) && !!proofCode && !done;
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
          setView(null);
          setItems([]);
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
      setMessage(
        e instanceof BoundaryError && e.code === 'UNAUTHENTICATED'
          ? 'That sign-in or email link could not be verified. Check your details, or request a fresh email.'
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
    const list = managedInvitationListSchema.parse(
      await authRequest(
        'invitations?courseId=' +
          encodeURIComponent(course) +
          (after ? '&after=' + encodeURIComponent(after) : ''),
      ),
    );
    setItems((previous) => (after ? [...previous, ...list.items] : list.items));
    setCursor(list.nextCursor);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void act(async () => {
      if (!forgot && ([...password].length < 15 || [...password].length > 64)) {
        setMessage('Use a password containing 15–64 characters.');
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
            password,
          }),
        );
        setDone(true);
        setMessage(
          'Your password is ready. Sign in with your NUS email and new password.',
        );
      } else if (forgot) {
        okSchema.parse(await authRequest('reset/request', csrf, { email }));
        setMessage(
          'If this email has an active Codewise account, recovery instructions have been requested. Check your inbox and spam folder. Wait 90 seconds before requesting another email.',
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
        ? 'Create your Codewise password'
        : reset
          ? 'Choose a new password'
          : forgot
            ? 'Recover your account'
            : view
              ? 'Your workbook'
              : 'Welcome back';
  return (
    <div className="cw-shell auth-shell">
      <a className="cw-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="cw-header">
        <a className="cw-wordmark" href="/">
          codewise<span>.</span>
        </a>
        <p className="cw-header-context">
          Programming learning
          <br />
          and assessment
        </p>
        {view && (
          <nav aria-label="Account">
            <a href="/workspace">Workspace</a>
            <a
              href={
                course
                  ? '/auth/invitations?courseId=' + encodeURIComponent(course)
                  : '/auth/invitations'
              }
            >
              Invitations
            </a>
          </nav>
        )}
      </header>
      <main id="main-content">
        <div className="cw-page-title">
          <p className="cw-kicker">Your learning workbook</p>
          <h1>{heading}</h1>
        </div>
        <div className="cw-workbook">
          <section className="cw-workbook-brief">
            <p className="cw-kicker">Access by invitation</p>
            <h2>A place for your work.</h2>
            <p>
              Your instructor invites you using your NUS email. Choose a
              Codewise password, then use it whenever you sign in.
            </p>
            <p className="cw-secondary">
              Use a password unique to Codewise. Your NUS account password is
              never required.
            </p>
          </section>
          <section
            className="cw-workbook-work auth-work"
            aria-label="Account access"
          >
            {message && <StatusMessage>{message}</StatusMessage>}
            {configured === null ? (
              <StatusMessage>Loading account access…</StatusMessage>
            ) : !configured ? (
              <StatusMessage>
                Sign-in is not available yet. The account service needs to be
                configured. Please check back later.
              </StatusMessage>
            ) : (
              <>
                {done ? (
                  <p>
                    <a href="/sign-in">Continue to sign in</a>
                  </p>
                ) : setup && !proofCode ? (
                  <>
                    <h2>Request a fresh setup email</h2>
                    <p>
                      Your invitation remains valid until accepted or revoked.
                      Request a new password setup link if the previous one
                      expired.
                    </p>
                    <Action
                      pending={pending}
                      onClick={() =>
                        void act(async () => {
                          okSchema.parse(
                            await authRequest('setup/request', csrf, {
                              invite,
                            }),
                          );
                          setMessage(
                            'A fresh setup email has been requested. Check your inbox and spam folder.',
                          );
                        })
                      }
                    >
                      Send setup email
                    </Action>
                  </>
                ) : reset && !proofCode ? (
                  <>
                    <StatusMessage>
                      This recovery link is missing or invalid.
                    </StatusMessage>
                    <a href="/auth/forgot">Request another recovery email</a>
                  </>
                ) : !view || newPassword || forgot ? (
                  <form onSubmit={submit}>
                    {!newPassword && (
                      <>
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
                      </>
                    )}
                    {!forgot && (
                      <>
                        <label htmlFor="password">
                          {newPassword
                            ? 'New Codewise password'
                            : 'Codewise password'}
                        </label>
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={
                            newPassword ? 'new-password' : 'current-password'
                          }
                          required
                          minLength={15}
                          maxLength={128}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          aria-describedby="password-help"
                        />
                        <p id="password-help" className="cw-secondary">
                          Use 15–64 characters. Spaces and pasted passwords are
                          welcome.
                        </p>
                        <Action
                          variant="secondary"
                          aria-pressed={showPassword}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? 'Hide password' : 'Show password'}
                        </Action>
                        {newPassword && (
                          <>
                            <label htmlFor="confirmation">
                              Confirm new password
                            </label>
                            <input
                              id="confirmation"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              required
                              value={confirmation}
                              onChange={(e) => setConfirmation(e.target.value)}
                            />
                          </>
                        )}
                      </>
                    )}
                    <div className="auth-actions">
                      <Action type="submit" pending={pending}>
                        {newPassword
                          ? 'Save password'
                          : forgot
                            ? 'Send recovery email'
                            : 'Sign in'}
                      </Action>
                      {!forgot && !newPassword && (
                        <a href="/auth/forgot">Forgot password?</a>
                      )}
                      <a href="/sign-in">Cancel</a>
                    </div>
                    {newPassword && (
                      <p className="cw-secondary">
                        Setup and recovery links expire after 10 minutes. If
                        yours has expired,{' '}
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
                                  'A fresh setup email has been requested. Check your inbox.',
                                );
                              })
                            }
                          >
                            Request a fresh setup email
                          </Action>
                        ) : (
                          <a href="/auth/forgot">
                            request another recovery email
                          </a>
                        )}
                        .
                      </p>
                    )}
                  </form>
                ) : invitations ? (
                  <>
                    <p>
                      Invite students to create their Codewise accounts. Course
                      membership is managed separately.
                    </p>
                    {!course && (
                      <StatusMessage>
                        Open invitations from your course workspace to select
                        the class. Course access is not connected here yet.
                      </StatusMessage>
                    )}
                    <Action
                      variant="secondary"
                      disabled={!course}
                      pending={pending}
                      onClick={() => void act(() => refresh())}
                    >
                      Load invited people
                    </Action>
                    <form
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
                              ? 'Invitation queued. Acceptance will appear here when the student finishes setup.'
                              : 'The invitation was recorded, but sending was not confirmed. Check its status before retrying.',
                          );
                        });
                      }}
                    >
                      <label htmlFor="invite-email">Student NUS email</label>
                      <input
                        id="invite-email"
                        type="email"
                        autoComplete="off"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Action
                        type="submit"
                        pending={pending}
                        disabled={!course}
                      >
                        Send invitation
                      </Action>
                    </form>
                    <h2>Invited people</h2>
                    <p className="cw-secondary">
                      Queued means accepted by the email service, not confirmed
                      delivery. Pending invitations do not expire.
                    </p>
                    {items.length === 0 ? (
                      <p>No invitations loaded for this course.</p>
                    ) : (
                      <ul className="auth-invites">
                        {items.map((i) => (
                          <li key={i.id}>
                            <div>
                              <strong>{i.email}</strong>
                              <p>
                                {i.status} · email {i.sendState}
                              </p>
                            </div>
                            {i.status === 'pending' && (
                              <div className="auth-actions">
                                {(['resend', 'revoke'] as const).map(
                                  (action) => (
                                    <Action
                                      key={action}
                                      variant="secondary"
                                      pending={pending}
                                      aria-label={
                                        action + ' invitation for ' + i.email
                                      }
                                      onClick={() =>
                                        void act(async () => {
                                          okSchema.parse(
                                            await authRequest(
                                              'invitations/' +
                                                i.id +
                                                '/' +
                                                action,
                                              view.csrfToken,
                                              { courseId: course },
                                            ),
                                          );
                                          await refresh();
                                          setMessage(
                                            action === 'revoke'
                                              ? 'Invitation revoked.'
                                              : 'Send attempt recorded. Check the updated email status.',
                                          );
                                        })
                                      }
                                    >
                                      {action === 'resend'
                                        ? 'Resend'
                                        : 'Revoke'}
                                    </Action>
                                  ),
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {cursor && (
                      <Action
                        pending={pending}
                        variant="secondary"
                        onClick={() => void act(() => refresh(cursor))}
                      >
                        Show more
                      </Action>
                    )}
                  </>
                ) : (
                  <>
                    <h2>
                      {workspace
                        ? 'Workspace access confirmed.'
                        : 'Your workspace is not available yet.'}
                    </h2>
                    <p>
                      {workspace
                        ? 'Your course service has confirmed access.'
                        : 'You are signed in, but course access is not connected or available yet. Please check back later.'}
                    </p>
                  </>
                )}
                {view && (
                  <div className="auth-signout">
                    <Action
                      variant="secondary"
                      pending={pending}
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
                      Sign out of Codewise
                    </Action>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
      <footer className="cw-footer">
        <p>Questions, code and reviewed feedback.</p>
        <p>Access by invitation</p>
      </footer>
    </div>
  );
}
