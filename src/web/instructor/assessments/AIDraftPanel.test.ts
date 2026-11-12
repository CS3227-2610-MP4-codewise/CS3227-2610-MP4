// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AIDraftPanel } from './AIDraftPanel';
import { publicationSchema } from '../../../shared/instructor-contracts/publication';
import type { AssessmentDraft } from '../../../shared/instructor-contracts/ai';
import { examples } from '../../../../workflow/fixtures/instructor-contracts/graph';

afterEach(cleanup);
const publication = publicationSchema.parse(examples[2]);
const second = {
  ...publication.questions[0],
  questionVersionId: 'second',
  title: 'Second question',
};
const multi = { ...publication, questions: [...publication.questions, second] };
const candidate: AssessmentDraft = {
  kind: 'assessment-draft',
  codeExecuted: false,
  criteria: multi.questions.flatMap((q, index) =>
    q.criteria.map((c) => ({
      ...c,
      questionVersionId: q.questionVersionId,
      rubricVersionId: q.rubricVersionId,
      score: c.minimumScore,
      explanation: index ? 'Second rationale' : 'First rationale',
    })),
  ),
  annotations: [],
  reviewFlags: ['Check rubric interpretation'],
};
const setup = (overrides: Partial<Parameters<typeof AIDraftPanel>[0]> = {}) => {
  const props = {
    publication: multi,
    pending: false,
    busy: false,
    blocked: false,
    synthetic: false,
    questionIndex: 0,
    onQuestionChange: vi.fn(),
    onGenerate: vi.fn(),
    onResume: vi.fn(),
    onAdopt: vi.fn(),
    ...overrides,
  };
  function Harness() {
    const [questionIndex, setQuestionIndex] = useState(props.questionIndex);
    return React.createElement(AIDraftPanel, {
      ...props,
      questionIndex,
      onQuestionChange: (index) => {
        props.onQuestionChange(index);
        setQuestionIndex(index);
      },
    });
  }
  render(React.createElement(Harness));
  return props;
};
it('generates without private references by default and only includes them after selection', () => {
  const props = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Generate AI draft' }));
  expect(props.onGenerate).toHaveBeenLastCalledWith(false);
  fireEvent.click(screen.getByText('Generation options'));
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: 'Use instructor reference solutions',
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Generate AI draft' }));
  expect(props.onGenerate).toHaveBeenLastCalledWith(true);
});
it('reviews one question at a time and applies only through the explicit adoption action', () => {
  const props = setup({ candidate });
  expect(screen.queryByText('Second rationale')).toBeNull();
  expect(screen.getByText('First rationale')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Suggestions for'), {
    target: { value: '1' },
  });
  expect(props.onQuestionChange).toHaveBeenCalledWith(1);
  expect(screen.queryByText('First rationale')).toBeNull();
  expect(screen.getByText('Second rationale')).toBeTruthy();
  expect(props.onAdopt).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Apply AI draft to feedback' }),
  );
  expect(props.onAdopt).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Hide suggestions' }));
  expect(screen.queryByLabelText('Suggestions for')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Review suggestions' }));
  expect(screen.getByLabelText('Suggestions for')).toHaveProperty('value', '1');
});
it('preserves manual edits by blocking generation/adoption and resumes the original request', () => {
  const props = setup({ candidate, pending: true, blocked: true });
  expect(screen.queryByRole('checkbox')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Apply AI draft to feedback' }),
  );
  expect(props.onAdopt).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Resume or check draft' }),
  );
  expect(props.onResume).toHaveBeenCalledOnce();
  expect(props.onGenerate).not.toHaveBeenCalled();
});
