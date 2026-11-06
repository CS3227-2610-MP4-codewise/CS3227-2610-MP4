import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  authViewSchema,
  bootstrapSchema,
  createdInvitationSchema,
  invitationListSchema,
  workspaceSchema,
  type AuthView,
  type Invitation,
} from '../../shared/auth';
import { Action, StatusMessage } from '../ui/primitives';
import { authMessage, authRequest, takeInvitation } from './client';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import './styles.css';

const invite = takeInvitation(window.location, (url) =>
  window.history.replaceState(null, '', url),
);
const notice = new URLSearchParams(window.location.search).get('notice');
if (notice && window.location.pathname === '/sign-in')
  window.history.replaceState(null, '', window.location.pathname);
export function AuthApp() {
  const [view, setView] = useState<AuthView | null>(null),
    [configured, setConfigured] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(
      notice === 'cancelled'
        ? 'Sign-in was cancelled. If you are joining for the first time, reopen your original invitation link to try again.'
        : notice === 'failed'
          ? 'Sign-in could not be completed. If you are joining for the first time, reopen your original invitation link and choose the matching Google account, or request a new invitation.'
          : '',
    );
  const [loaded, setLoaded] = useState(false),
    [workspace, setWorkspace] = useState(false),
    [email, setEmail] = useState(''),
    [items, setItems] = useState<Invitation[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [link, setLink] = useState('');
  const lock = useRef(false);
  const admin = window.location.pathname === '/auth/invitations';
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const b = bootstrapSchema.parse(await authRequest('bootstrap'));
        if (!live) return;
        setConfigured(b.configured);
        if (b.configured) {
          try {
            const s = authViewSchema.parse(await authRequest('session'));
            if (!live) return;
            setView(s);
            if (admin && s.administrator) {
              const list = invitationListSchema.parse(
                await authRequest('invitations'),
              );
              if (live) {
                setItems(list.items);
                setCursor(list.nextCursor);
              }
            } else if (!admin) {
              const result = workspaceSchema.parse(
                await authRequest('workspace'),
              );
              if (live) {
                if (
                  result.state === 'authorized' &&
                  result.destination !== '/workspace'
                )
                  window.location.assign(result.destination);
                else setWorkspace(result.state === 'authorized');
              }
            }
          } catch (e) {
            if (live && window.location.pathname !== '/sign-in')
              setMessage(authMessage(e));
          }
        }
      } catch (e) {
        if (live) setMessage(authMessage(e));
      } finally {
        if (live) setLoaded(true);
      }
    }
    void load();
    return () => {
      live = false;
    };
  }, [admin]);
  async function act(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      if (e instanceof BoundaryError && e.code === 'UNAUTHENTICATED') {
        setView(null);
        setItems([]);
        setLink('');
      }
      setMessage(authMessage(e));
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
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
          setLink('');
          setMessage(
            'Your session is no longer available. Sign in again to continue.',
          );
        }
      }
    };
    // Recheck restored tabs and revoke displayed admin data after server expiry.
    const timer = window.setTimeout(
      () => {
        void check();
      },
      Math.max(0, Date.parse(view.session.expiresAt) - Date.now()),
    );
    window.addEventListener('pageshow', check);
    return () => {
      live = false;
      window.clearTimeout(timer);
      window.removeEventListener('pageshow', check);
    };
  }, [view]);
  async function refresh() {
    const list = invitationListSchema.parse(await authRequest('invitations'));
    setItems(list.items);
    setCursor(list.nextCursor);
  }
  function create(e: FormEvent) {
    e.preventDefault();
    void act(async () => {
      setLink('');
      const r = createdInvitationSchema.parse(
        await authRequest('invitations', view!.csrfToken, { email }),
      );
      setLink(r.url);
      setEmail('');
      await refresh();
      setMessage(
        'Invitation created. Copy the link now; it is shown only once.',
      );
    });
  }
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
            {view.administrator && <a href="/auth/invitations">Invitations</a>}
          </nav>
        )}
      </header>
      <main id="main-content">
        <div className="cw-page-title">
          <p className="cw-kicker">Your workbook</p>
          <h1>
            {admin
              ? 'Invite people to Codewise'
              : view
                ? 'Welcome back.'
                : 'A place to begin.'}
          </h1>
        </div>
        <div className="cw-workbook">
          <section className="cw-workbook-brief">
            <p className="cw-kicker">{admin ? 'Account access' : 'Sign in'}</p>
            <h2>
              {admin
                ? 'An invitation opens the door.'
                : 'Your work starts here.'}
            </h2>
            <p>
              {admin
                ? 'Invite a person using the email address they use with Google. Invitations expire after 24 hours and can be used once.'
                : 'Use your invited Google account to join Codewise. Existing members can sign in without an invitation.'}
            </p>
            <p className="cw-secondary">
              {admin
                ? 'Course access is managed separately. An invitation does not make someone an instructor.'
                : 'Signing in confirms who you are. Your course access is checked separately.'}
            </p>
          </section>
          <section
            className="cw-workbook-work auth-work"
            aria-label={admin ? 'Manage invitations' : 'Account'}
            aria-busy={pending || !loaded}
          >
            {!loaded && <StatusMessage>Checking your session…</StatusMessage>}
            {message && <StatusMessage>{message}</StatusMessage>}
            {loaded && !view && (
              <>
                {configured === false ? (
                  <>
                    <h2>Sign-in is not available yet.</h2>
                    <p>
                      The administrator needs to finish connecting Google.
                      Please check back later.
                    </p>
                  </>
                ) : (
                  <>
                    <h2>Continue with Google</h2>
                    {invite && (
                      <StatusMessage>
                        Your invitation is ready. Choose the matching Google
                        account.
                      </StatusMessage>
                    )}
                    <Action
                      pending={pending}
                      disabled={!configured}
                      onClick={() =>
                        void act(async () => {
                          const fresh = bootstrapSchema.parse(
                            await authRequest('bootstrap'),
                          );
                          const response = (await authRequest(
                            'login',
                            fresh.csrfToken,
                            {
                              ...(invite ? { invite } : {}),
                              returnTo: '/workspace',
                            },
                          )) as { url: string };
                          const destination = new URL(response.url);
                          if (
                            destination.origin !== 'https://accounts.google.com'
                          )
                            throw new Error('Invalid provider');
                          window.location.assign(destination.href);
                        })
                      }
                    >
                      {pending ? 'Opening Google…' : 'Sign in with Google'}
                    </Action>
                    <p className="cw-secondary">
                      New here? Ask your administrator for an invitation.
                    </p>
                  </>
                )}
                <p>
                  <a href="/">Back to Codewise</a>
                </p>
                {configured === null && (
                  <Action
                    variant="secondary"
                    onClick={() => window.location.reload()}
                  >
                    Try again
                  </Action>
                )}
              </>
            )}
            {loaded && view && (
              <>
                <p className="cw-kicker">Signed in as</p>
                <p>{view.email}</p>
                {admin ? (
                  view.administrator ? (
                    <>
                      <form onSubmit={create}>
                        <label htmlFor="invite-email">
                          Google account email
                        </label>
                        <input
                          id="invite-email"
                          type="email"
                          required
                          maxLength={254}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={pending}
                        />
                        <Action type="submit" pending={pending}>
                          Create invitation
                        </Action>
                      </form>
                      {link && (
                        <section
                          className="auth-copy"
                          aria-label="New invitation"
                        >
                          <label htmlFor="invitation-link">
                            Copy and send this link privately
                          </label>
                          <input
                            id="invitation-link"
                            readOnly
                            value={link}
                            onFocus={(e) => e.currentTarget.select()}
                          />
                          <div className="auth-actions">
                            <Action
                              variant="secondary"
                              onClick={() =>
                                void act(async () => {
                                  await navigator.clipboard.writeText(link);
                                  setMessage(
                                    'Invitation link copied. Send it privately to the invited person.',
                                  );
                                })
                              }
                            >
                              Copy link
                            </Action>
                            <Action
                              variant="secondary"
                              onClick={() => setLink('')}
                            >
                              Hide link
                            </Action>
                          </div>
                        </section>
                      )}
                      <h2>Invitations</h2>
                      <p className="cw-secondary">
                        Accepted invitations cannot be revoked. Revoking a
                        pending invitation does not sign out an existing
                        account.
                      </p>
                      {items.length === 0 ? (
                        <p>No invitations yet.</p>
                      ) : (
                        <ul className="auth-invites">
                          {items.map((i) => (
                            <li key={i.id}>
                              <div>
                                <strong>{i.email}</strong>
                                <p>
                                  {i.status[0].toUpperCase() +
                                    i.status.slice(1)}{' '}
                                  · expires{' '}
                                  {new Date(i.expiresAt).toLocaleString(
                                    undefined,
                                    { timeZoneName: 'short' },
                                  )}
                                </p>
                              </div>
                              {i.status === 'pending' && (
                                <Action
                                  variant="secondary"
                                  disabled={pending}
                                  onClick={() =>
                                    void act(async () => {
                                      await authRequest(
                                        'invitations/' + i.id + '/revoke',
                                        view.csrfToken,
                                        {},
                                      );
                                      await refresh();
                                      setMessage('Invitation revoked.');
                                    })
                                  }
                                >
                                  Revoke
                                  <span className="cw-sr-only">
                                    {' '}
                                    invitation for {i.email}
                                  </span>
                                </Action>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {cursor && (
                        <Action
                          variant="secondary"
                          disabled={pending}
                          onClick={() =>
                            void act(async () => {
                              const list = invitationListSchema.parse(
                                await authRequest(
                                  'invitations?after=' +
                                    encodeURIComponent(cursor),
                                ),
                              );
                              setItems([...items, ...list.items]);
                              setCursor(list.nextCursor);
                            })
                          }
                        >
                          Show more invitations
                        </Action>
                      )}
                    </>
                  ) : (
                    <StatusMessage>
                      You do not have permission to manage invitations.
                    </StatusMessage>
                  )
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
                        : 'You are signed in, but course access is not connected yet. Please check back later.'}
                    </p>
                    {view.administrator && (
                      <a href="/auth/invitations">Manage invitations</a>
                    )}
                  </>
                )}
                <div className="auth-signout">
                  <Action
                    variant="secondary"
                    pending={pending}
                    onClick={() =>
                      void act(async () => {
                        await authRequest('logout', view.csrfToken, {});
                        setView(null);
                        setLink('');
                        setItems([]);
                        window.location.assign('/sign-in');
                      })
                    }
                  >
                    Sign out of Codewise
                  </Action>
                  <p className="cw-secondary">
                    This signs you out of Codewise on this browser. Your Google
                    account stays signed in.
                  </p>
                </div>
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
