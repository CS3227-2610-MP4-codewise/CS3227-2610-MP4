import React from 'react';
import { createRoot } from 'react-dom/client';
import { Brand, Icon } from './ui/brand';
import './styles.css';
import { AuthApp } from './auth/App';
import { ReviewWorkspace } from './instructor/assessments/ReviewWorkspace';
import { InstructorWorkspace } from './instructor/Workspace';

function App() {
  return (
    <div className="cw-shell">
      <a className="cw-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="cw-header">
        <Brand />
      </header>
      <main id="main-content" className="cw-home">
        <h1>Your programming workbook.</h1>
        <p>Assignments, code and feedback in one place.</p>
        <a className="cw-action" href="/sign-in">
          Sign in <Icon name="arrow-right" />
        </a>
        <details>
          <summary>About Codewise</summary>
          <p>
            Access is by instructor invitation. Course workspaces are still
            being connected.
          </p>
        </details>
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/^\/instructor\/(?:review|assessments)(?:\/[A-Za-z0-9_-]{1,128})?$/.test(
      window.location.pathname,
    ) ? (
      <ReviewWorkspace />
    ) : ['/workspace', '/instructor/assignments'].includes(
        window.location.pathname,
      ) ||
      /^\/instructor\/assignments\/[A-Za-z0-9_-]{1,128}$/.test(
        window.location.pathname,
      ) ? (
      <InstructorWorkspace />
    ) : [
        '/sign-in',
        '/auth/finish',
        '/auth/invitations',
        '/auth/reset',
        '/auth/action',
        '/auth/forgot',
      ].includes(window.location.pathname) ? (
      <AuthApp />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
