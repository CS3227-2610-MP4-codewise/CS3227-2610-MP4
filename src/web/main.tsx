import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main>
      <p className="eyebrow">CODEWISE</p>
      <h1>A shared foundation for learning to code.</h1>
      <p className="intro">
        The platform is being built. Student and instructor features will be
        available in a later release.
      </p>
      <div className="workspaces">
        <section aria-labelledby="student-title">
          <span className="label">Student workspace</span>
          <h2 id="student-title">Write. Submit. Improve.</h2>
          <p>
            Assignments, code drafts, released feedback, and progress
            explanations.
          </p>
          <p className="status">Coming soon</p>
        </section>
        <section aria-labelledby="instructor-title">
          <span className="label">Instructor workspace</span>
          <h2 id="instructor-title">Guide the next step.</h2>
          <p>
            Rubrics, assessment suggestions, code annotations, and reviewed
            feedback.
          </p>
          <p className="status">Coming soon</p>
        </section>
      </div>
      <footer>Codewise · Programming learning and assessment</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
