import { describe, it, expect } from 'vitest';
import {
  feedbackVisibility,
  observationMatches,
  selectedSourceLines,
  draftSourceLines,
} from './presentation';
import type { Workspace } from './client';

describe('source selection line boundaries', () => {
  it('uses whole inclusive lines and excludes an untouched line at the end', () => {
    expect(selectedSourceLines(1, 3, false)).toEqual({ start: 1, end: 3 });
    expect(selectedSourceLines(1, 3, true)).toEqual({ start: 1, end: 2 });
    expect(selectedSourceLines(2, 2, true)).toEqual({ start: 2, end: 2 });
    expect(selectedSourceLines(0, 2, false)).toBeNull();
    expect(selectedSourceLines(3, 2, false)).toBeNull();
  });
  it('highlights only a valid editable line range', () => {
    expect(draftSourceLines('2', '3', 4)).toEqual({ start: 2, end: 3 });
    expect(draftSourceLines('', '3', 4)).toBeNull();
    expect(draftSourceLines('2', '5', 4)).toBeNull();
    expect(draftSourceLines('3', '2', 4)).toBeNull();
  });
});
describe('IAL-11/UI-04/UI-08 displayed feedback visibility', () => {
  const releases = [
    { revisionId: 'original', version: 1, withdrawnAt: null },
    { revisionId: 'correction', version: 2, withdrawnAt: null },
    {
      revisionId: 'withdrawn',
      version: 3,
      withdrawnAt: '2026-11-07T00:00:00Z',
    },
  ];
  it('labels the current released revision publicly even in the draft editor', () => {
    expect(feedbackVisibility('correction', 2, releases)).toBe(
      'Released · Feedback version 2',
    );
  });
  it('keeps a superseded historical release distinct from private drafts', () => {
    expect(feedbackVisibility('original', 2, releases, true)).toBe(
      'Superseded · Feedback version 1',
    );
  });
  it('never implies withdrawn feedback is current or private', () => {
    expect(feedbackVisibility('withdrawn', null, releases)).toBe(
      'Withdrawn · Feedback version 3',
    );
  });
  it('keeps an unreleased correction private despite an older public release', () => {
    expect(feedbackVisibility('new-draft', 2, releases)).toBe(
      'Saved · Private until released',
    );
    expect(feedbackVisibility('old-draft', 2, releases, true)).toBe(
      'Historical draft · Private',
    );
  });
});

describe('IAL-03 pinned observation evidence', () => {
  const workspace = {
    attempt: {
      answers: [
        {
          submittedAnswerId: 'a',
          questionVersionId: 'q',
          rubricVersionId: 'r',
          source: 'λ\nlast\n',
        },
      ],
    },
    publication: {
      questions: [
        {
          questionVersionId: 'q',
          rubricVersionId: 'r',
          criteria: [{ criterionId: 'c' }],
        },
      ],
    },
  } as unknown as Workspace;
  const note = {
    submittedAnswerId: 'a',
    questionVersionId: 'q',
    rubricVersionId: 'r',
    criterionId: 'c',
    startLine: 1,
    endLine: 2,
    excerpt: 'λ\nlast',
    explanation: 'note',
  };
  it('matches exact Unicode and trailing empty logical lines', () => {
    expect(observationMatches(note, workspace)).toBe(true);
    expect(
      observationMatches(
        { ...note, startLine: 3, endLine: 3, excerpt: '' },
        workspace,
      ),
    ).toBe(true);
  });
  it('rejects mismatched, out-of-range and foreign evidence', () => {
    for (const changed of [
      { excerpt: 'wrong' },
      { endLine: 4 },
      { submittedAnswerId: 'other' },
      { questionVersionId: 'other' },
      { rubricVersionId: 'other' },
      { criterionId: 'other' },
    ])
      expect(observationMatches({ ...note, ...changed }, workspace)).toBe(
        false,
      );
  });
});
