import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Action, StatusMessage } from './ui/primitives';
import './styles.css';
import { AuthApp } from './auth/App';

function App() {
  const [showNotes, setShowNotes] = useState(false);
  return (
    <div className="cw-shell">
      <a className="cw-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="cw-header">
        <p className="cw-wordmark">
          codewise<span>.</span>
        </p>
        <p className="cw-header-context">
          Programming learning
          <br />
          and assessment
        </p>
        <nav aria-label="On this page">
          <a href="#workspaces">The workspaces</a>
          <a href="#foundation-status">Build status</a>
        </nav>
      </header>
      <main id="main-content">
        <div className="cw-page-title">
          <p className="cw-kicker">A shared foundation</p>
          <h1>A place for the work. Space to understand it.</h1>
          <p>
            Codewise is being built around the question, the source and the next
            useful observation.
          </p>
        </div>
        <div className="cw-workbook">
          <section
            className="cw-workbook-brief"
            id="foundation-status"
            aria-labelledby="foundation-heading"
          >
            <p className="cw-kicker">Where we are</p>
            <h2 id="foundation-heading">The workbook is taking shape.</h2>
            <p>
              Sign in with your invited Google account. Course workspaces become
              available after course access is connected.
            </p>
            <div className="cw-foundation-notes">
              <p>
                <a href="/sign-in">Sign in to Codewise</a>
              </p>
              <Action
                variant="secondary"
                aria-expanded={showNotes}
                aria-controls="foundation-notes"
                onClick={() => setShowNotes(!showNotes)}
              >
                {showNotes ? 'Hide foundation notes' : 'Read foundation notes'}
              </Action>
              <div id="foundation-notes" hidden={!showNotes}>
                <StatusMessage>
                  Authentication and course permissions come before access to
                  learner work.
                </StatusMessage>
                <p className="cw-secondary">
                  No learner source is executed. AI integration remains disabled
                  while provider access and quotas are verified.
                </p>
              </div>
            </div>
          </section>
          <section
            className="cw-workbook-work"
            id="workspaces"
            aria-labelledby="workspaces-heading"
          >
            <p className="cw-kicker">Two perspectives, one workbook</p>
            <h2 id="workspaces-heading">Built around the work.</h2>
            <div className="cw-workspace-summary">
              <span className="cw-ordinal" aria-hidden="true">
                01
              </span>
              <div>
                <h3>For students</h3>
                <p className="cw-secondary">
                  Write a draft, submit an exact version and return to released
                  feedback beside your source.
                </p>
                <p className="cw-kicker">Planned workspace</p>
              </div>
            </div>
            <div className="cw-workspace-summary">
              <span className="cw-ordinal" aria-hidden="true">
                02
              </span>
              <div>
                <h3>For instructors</h3>
                <p className="cw-secondary">
                  Publish questions and rubrics, review submitted evidence and
                  decide which feedback to release.
                </p>
                <p className="cw-kicker">Planned workspace</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <footer className="cw-footer">
        <p>Questions, code and reviewed feedback.</p>
        <p>Foundation release · role features in development</p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {['/sign-in', '/auth/finish', '/workspace', '/auth/invitations'].includes(
      window.location.pathname,
    ) ? (
      <AuthApp />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
