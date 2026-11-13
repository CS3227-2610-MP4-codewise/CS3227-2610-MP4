import { useState } from 'react';
import type { AssessmentDraft } from '../../../shared/instructor-contracts/ai';
import type { Publication } from '../../../shared/instructor-contracts/publication';
import { Icon } from '../../ui/brand';

/** A private review surface. Nothing is applied until the instructor adopts it. */
export function AIDraftPanel({
  publication,
  candidate,
  pending,
  busy,
  blocked,
  synthetic,
  questionIndex,
  onQuestionChange,
  onGenerate,
  onResume,
  onAdopt,
}: {
  publication: Publication;
  candidate?: AssessmentDraft;
  pending: boolean;
  busy: boolean;
  blocked: boolean;
  synthetic: boolean;
  questionIndex: number;
  onQuestionChange: (index: number) => void;
  onGenerate: (references: boolean) => void;
  onResume: () => void;
  onAdopt: () => void;
}) {
  const [references, setReferences] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const q = publication.questions[questionIndex] ?? publication.questions[0];
  const criteria = candidate?.criteria.filter(
    (item) => item.questionVersionId === q.questionVersionId,
  );
  const notes = candidate?.annotations.filter(
    (item) => item.questionVersionId === q.questionVersionId,
  );
  return (
    <section
      className="assessment-ai"
      aria-labelledby="ai-draft-heading"
      aria-busy={busy}
    >
      <div className="assessment-ai-toolbar">
        <div>
          <h2 id="ai-draft-heading">AI-assisted grading</h2>
          <p className="assessment-secondary">
            {candidate
              ? 'Draft ready · Private until you review and release it.'
              : 'Get suggested scores and feedback, then review them yourself.'}
          </p>
        </div>
        <div className="assessment-actions">
          {candidate && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls="ai-draft-review"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide suggestions' : 'Review suggestions'}
            </button>
          )}
          <button
            type="button"
            className={candidate ? undefined : 'cw-action'}
            disabled={busy || (!pending && blocked)}
            onClick={() => (pending ? onResume() : onGenerate(references))}
          >
            <Icon name={pending || candidate ? 'refresh' : 'edit'} />
            {busy
              ? 'Working…'
              : pending
                ? 'Resume or check draft'
                : candidate
                  ? 'Generate again'
                  : 'Generate AI draft'}
          </button>
        </div>
      </div>
      {synthetic && (
        <p className="assessment-secondary">
          Synthetic preview: suggested scores are fixtures; no model is used.
        </p>
      )}
      {pending ? (
        <p className="assessment-secondary">
          Resuming checks the saved request and may send it if it has not
          started. It keeps your original reference selection.
        </p>
      ) : (
        <details className="assessment-ai-options">
          <summary>Generation options</summary>
          <label className="assessment-checkbox">
            <input
              type="checkbox"
              checked={references}
              disabled={busy}
              onChange={(event) => setReferences(event.target.checked)}
            />
            <span>Use instructor reference solutions</span>
          </label>
          <p className="assessment-secondary">
            Includes private reference solutions in the AI request. Check that
            suggested feedback does not reveal them.
          </p>
        </details>
      )}
      {blocked && (
        <p className="assessment-secondary">
          Save your changes and finish any comment before generating or applying
          a draft.
        </p>
      )}
      {candidate && expanded && (
        <div className="assessment-ai-review" id="ai-draft-review">
          <div className="assessment-ai-question-picker">
            <label htmlFor="ai-question">Suggestions for</label>
            <select
              id="ai-question"
              value={questionIndex}
              onChange={(event) => onQuestionChange(Number(event.target.value))}
            >
              {publication.questions.map((item, index) => (
                <option key={item.questionVersionId} value={index}>
                  Question {index + 1}: {item.title}
                </option>
              ))}
            </select>
          </div>
          <div className="assessment-ai-criteria">
            {criteria?.map((item) => (
              <article
                key={item.criterionId}
                className="assessment-ai-criterion"
              >
                <div className="assessment-ai-score">
                  <h3>
                    {q.criteria.find(
                      (criterion) => criterion.criterionId === item.criterionId,
                    )?.descriptor ?? item.criterionId}
                  </h3>
                  <strong>
                    {item.score}
                    <span> / {item.maximumScore}</span>
                  </strong>
                </div>
                <p className="assessment-ai-preview">
                  {item.explanation.length > 180
                    ? item.explanation.slice(0, 180) + '…'
                    : item.explanation}
                </p>
                {item.explanation.length > 180 && (
                  <details>
                    <summary>Full rationale</summary>
                    <p>{item.explanation}</p>
                  </details>
                )}
              </article>
            ))}
          </div>
          {!!notes?.length && (
            <details className="assessment-ai-notes">
              <summary>Source comments ({notes.length})</summary>
              {notes.map((item, index) => (
                <article key={index}>
                  <p className="assessment-secondary">
                    Lines {item.startLine}–{item.endLine}
                  </p>
                  <pre>
                    <code>{item.excerpt}</code>
                  </pre>
                  <p>{item.explanation}</p>
                </article>
              ))}
            </details>
          )}
          {!!candidate.reviewFlags.length && (
            <details className="assessment-ai-notes">
              <summary>Review notes ({candidate.reviewFlags.length})</summary>
              <ul>
                {candidate.reviewFlags.map((flag, index) => (
                  <li key={index}>{flag}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="assessment-ai-footer">
            <p>
              Review every question. Applying fills the feedback for all{' '}
              {publication.questions.length} questions. Code was not executed.
            </p>
            <button
              type="button"
              className="cw-action"
              disabled={busy || blocked}
              onClick={onAdopt}
            >
              <Icon name="check" />
              Apply AI draft to feedback
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
