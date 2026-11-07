import { describe, it, expect } from 'vitest';
import { feedbackVisibility } from './presentation';
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
