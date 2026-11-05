import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Action,
  QuestionNavigation,
  StatusMessage,
} from '../src/web/ui/primitives';
import '../src/web/styles.css';

const examples = ['Accumulator', 'Loop boundary', 'Return placement'];

function Preview() {
  const [index, setIndex] = useState(0);
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  function navigate(next: number) {
    setIndex(next);
    setReview(false);
    heading.current?.focus();
  }
  return (
    <main className="cw-shell">
      <p className="cw-development-only">
        Development preview · synthetic controls only. No authentication, source
        saving, submissions or assessments are connected.
      </p>
      <header className="cw-header">
        <p className="cw-wordmark">
          codewise<span>.</span>
        </p>
        <p className="cw-header-context">
          Shared visual foundations
          <br />
          warm-workbook-v1
        </p>
      </header>
      <div className="cw-preview-settings">
        <label>
          Appearance
          <select
            defaultValue="light dark"
            onChange={(event) => {
              document.documentElement.style.colorScheme = event.target.value;
            }}
          >
            <option value="light dark">Follow system</option>
            <option value="light">Warm light</option>
            <option value="dark">Warm dark</option>
          </select>
        </label>
        <label>
          Text scale
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                document.documentElement.style.fontSize = event.target.value;
              } else {
                document.documentElement.style.removeProperty('font-size');
              }
            }}
          >
            <option value="">Browser default</option>
            <option value="200%">200% of browser default</option>
          </select>
        </label>
      </div>
      <div className="cw-workbook">
        <section className="cw-workbook-brief">
          <p className="cw-kicker">Synthetic question</p>
          <h1 ref={heading} tabIndex={-1} className="cw-preview-heading">
            {review ? 'Assignment review preview' : examples[index]}
          </h1>
          <p>
            Question text uses proportional type. Source uses monospace, while
            headings establish the workbook hierarchy.
          </p>
          <pre className="cw-preview-code">
            <code>{'def sum_to(n):\n    total = 0\n    return total'}</code>
          </pre>
          <p className="cw-secondary">
            A specimen, not a real assignment or result.
          </p>
        </section>
        <section className="cw-workbook-work">
          <p className="cw-kicker">Shared control states</p>
          <h2>Clear about what happened.</h2>
          <div className="cw-preview-statuses">
            <StatusMessage>
              Local specimen · changes are not saved.
            </StatusMessage>
            <StatusMessage tone="success">
              Success appearance specimen only · no save took place.
            </StatusMessage>
            <StatusMessage tone="error">
              Failure specimen · preserve the text and offer recovery.
            </StatusMessage>
          </div>
          <div className="cw-preview-actions">
            <Action onClick={() => setPending(!pending)}>
              {pending ? 'Stop pending specimen' : 'Show pending specimen'}
            </Action>
            <Action pending={pending} variant="secondary">
              {pending ? 'Waiting · specimen' : 'Secondary action specimen'}
            </Action>
          </div>
          <p className="cw-secondary">
            Pending actions and navigation are disabled together here. The
            consumer owns actual acknowledgements and recovery.
          </p>
        </section>
      </div>
      <div style={{ marginTop: 24 }}>
        <QuestionNavigation
          index={index}
          count={examples.length}
          pending={pending}
          onPrevious={() => navigate(index - 1)}
          onNext={() => {
            if (index === examples.length - 1) {
              setReview(true);
              heading.current?.focus();
            } else navigate(index + 1);
          }}
        />
      </div>
      <p className="cw-footer">
        {review
          ? 'Review specimen only. No attempt was created.'
          : 'Previous and Next only update local specimen state.'}
      </p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
