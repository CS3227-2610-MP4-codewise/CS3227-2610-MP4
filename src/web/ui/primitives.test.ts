import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Action, QuestionNavigation } from './primitives';

describe('UI-05/UI-08 shared action boundaries', () => {
  it('defaults to a non-submitting button and disables a pending action', () => {
    const markup = renderToStaticMarkup(
      createElement(Action, { pending: true }, 'Waiting'),
    );
    expect(markup).toContain('type="button"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-busy="true"');
  });
  it('offers review rather than Next on a single-question assignment', () => {
    const markup = renderToStaticMarkup(
      createElement(QuestionNavigation, {
        index: 0,
        count: 1,
        onPrevious: () => {},
        onNext: () => {},
      }),
    );
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Review assignment');
    expect(markup).not.toContain('Next question');
    expect(markup).not.toContain('type="submit"');
  });
  it('preserves the historical summary action at the final question', () => {
    const markup = renderToStaticMarkup(
      createElement(QuestionNavigation, {
        index: 2,
        count: 3,
        finalLabel: 'Attempt summary',
        onPrevious: () => {},
        onNext: () => {},
      }),
    );
    expect(markup).toContain('Attempt summary');
    expect(markup).not.toContain('Review assignment');
  });
  it.each([
    { index: -1, count: 3 },
    { index: 3, count: 3 },
    { index: 0, count: 0 },
    { index: 0.5, count: 3 },
  ])('rejects an invalid published position: %j', (position) => {
    expect(() =>
      renderToStaticMarkup(
        createElement(QuestionNavigation, {
          ...position,
          onPrevious: () => {},
          onNext: () => {},
        }),
      ),
    ).toThrow(RangeError);
  });
});
