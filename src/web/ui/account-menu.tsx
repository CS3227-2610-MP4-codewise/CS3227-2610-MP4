import { useEffect, useRef, useState } from 'react';
import { Icon } from './brand';

/** Native disclosure: links/buttons keep their normal keyboard semantics. */
export function AccountMenu({
  email,
  busy = false,
  onSignOut,
}: {
  email: string;
  busy?: boolean;
  onSignOut: () => void | Promise<void>;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const disclosure = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !disclosure.current?.contains(event.target)
      )
        disclosure.current?.removeAttribute('open');
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && disclosure.current?.open) {
        disclosure.current.open = false;
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  return (
    <details className="cw-account-menu" ref={disclosure}>
      <summary ref={trigger} aria-label={`Account: ${email}`}>
        <span className="cw-account-initial" aria-hidden="true">
          {email.charAt(0).toUpperCase()}
        </span>
        <span>Account</span>
        <span className="cw-account-chevron" aria-hidden="true" />
      </summary>
      <div className="cw-account-panel">
        <p>{email}</p>
        <button
          type="button"
          disabled={busy || signingOut}
          aria-busy={signingOut}
          onClick={() => {
            if (busy || pending.current) return;
            pending.current = true;
            setSigningOut(true);
            setError('');
            void Promise.resolve()
              .then(onSignOut)
              .catch(() => setError('Could not sign out. Try again.'))
              .finally(() => {
                pending.current = false;
                setSigningOut(false);
              });
          }}
        >
          <Icon name="logout" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
