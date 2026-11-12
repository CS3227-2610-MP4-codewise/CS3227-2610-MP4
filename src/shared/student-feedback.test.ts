import { describe, expect, it } from 'vitest';
import {
  feedbackSummarySchema,
  feedbackVersionSchema,
  versionState,
} from './student-feedback';
import { attemptHistorySchema } from './student-work';
import { BoundaryError } from './instructor-contracts/schema';
import { publicFeedbackFixtures } from '../../workflow/assessment-preview/public-fixtures';

/** SF-01, SF-05, SF-07: closed student feedback shapes over the C-REL public fixtures. */
const f = publicFeedbackFixtures();
const firstCurrent = {
  ...f.currentAfterHistoricalWithdrawal,
  availabilityRevision: 1,
  currentReleaseVersion: 1,
  withdrawnReleaseVersions: [],
};
const released = {
  schemaVersion: 1,
  state: 'released',
  currentness: firstCurrent,
  versions: [{ releaseVersion: 1, state: 'released' }],
  release: f.first,
};
const corrected = {
  schemaVersion: 1,
  state: 'released',
  currentness: f.currentAfterHistoricalWithdrawal,
  versions: [
    { releaseVersion: 2, state: 'released' },
    { releaseVersion: 1, state: 'withdrawn' },
  ],
  release: f.correction,
};
const withdrawn = {
  schemaVersion: 1,
  state: 'withdrawn',
  currentness: f.noCurrent,
  versions: [
    { releaseVersion: 2, state: 'withdrawn' },
    { releaseVersion: 1, state: 'withdrawn' },
  ],
};
const contractError = (fn: () => unknown) =>
  expect(fn).toThrow(
    expect.objectContaining({ code: 'INVALID_CONTRACT' }) as Error,
  );

describe('feedbackSummarySchema', () => {
  it('round-trips none, released, corrected and withdrawn summaries', () => {
    for (const value of [
      { schemaVersion: 1, state: 'none' },
      released,
      corrected,
      withdrawn,
    ])
      expect(feedbackSummarySchema.parse(value)).toEqual(value);
  });

  it('rejects unknown fields at every level', () => {
    contractError(() =>
      feedbackSummarySchema.parse({ schemaVersion: 1, state: 'none', x: 1 }),
    );
    contractError(() => feedbackSummarySchema.parse({ ...released, x: 1 }));
    contractError(() =>
      feedbackSummarySchema.parse({
        ...released,
        versions: [{ releaseVersion: 1, state: 'released', releasedAt: 'x' }],
      }),
    );
    contractError(() =>
      feedbackSummarySchema.parse({ schemaVersion: 2, state: 'none' }),
    );
  });

  it('rejects a release with state none or withdrawn, and a released summary without one', () => {
    contractError(() =>
      feedbackSummarySchema.parse({
        schemaVersion: 1,
        state: 'none',
        release: f.first,
      }),
    );
    contractError(() =>
      feedbackSummarySchema.parse({ ...withdrawn, release: f.first }),
    );
    const bare: Record<string, unknown> = { ...released };
    delete bare.release;
    contractError(() => feedbackSummarySchema.parse(bare));
  });

  it('rejects private keys on the summary and inside the release', () => {
    for (const key of [
      'reason',
      'approvedRevisionId',
      'reviewerId',
      'privateReference',
    ]) {
      contractError(() =>
        feedbackSummarySchema.parse({ ...released, [key]: 'x' }),
      );
      contractError(() =>
        feedbackSummarySchema.parse({
          ...released,
          release: { ...f.first, [key]: 'x' },
        }),
      );
      contractError(() =>
        feedbackSummarySchema.parse({
          ...withdrawn,
          currentness: { ...f.noCurrent, [key]: 'x' },
        }),
      );
    }
  });

  it('never shows a non-current or mismatched release as current (SF-02)', () => {
    // A superseded projection, an older version and another assessment's or attempt's release.
    for (const release of [
      f.superseded,
      { ...f.first, id: 'assessment_other' },
      { ...f.first, submissionAttemptId: 'attempt_other' },
    ])
      expect(() =>
        feedbackSummarySchema.parse({ ...released, release }),
      ).toThrow(BoundaryError);
    expect(() =>
      feedbackSummarySchema.parse({ ...corrected, release: f.first }),
    ).toThrow(BoundaryError);
  });

  it('requires version states, order and withdrawals to agree with currentness', () => {
    contractError(() =>
      feedbackSummarySchema.parse({
        ...corrected,
        versions: [...corrected.versions].reverse(),
      }),
    );
    contractError(() =>
      feedbackSummarySchema.parse({
        ...corrected,
        versions: [
          { releaseVersion: 2, state: 'released' },
          { releaseVersion: 1, state: 'superseded' },
        ],
      }),
    );
    contractError(() =>
      feedbackSummarySchema.parse({
        ...corrected,
        versions: [{ releaseVersion: 2, state: 'released' }],
      }),
    );
    contractError(() =>
      feedbackSummarySchema.parse({
        ...withdrawn,
        currentness: f.currentAfterHistoricalWithdrawal,
      }),
    );
  });

  it('derives version states from currentness without reviving a withdrawn version', () => {
    expect(versionState(f.currentAfterHistoricalWithdrawal, 2)).toBe(
      'released',
    );
    expect(versionState(f.currentAfterHistoricalWithdrawal, 1)).toBe(
      'withdrawn',
    );
    expect(versionState(f.noCurrent, 2)).toBe('withdrawn');
    expect(
      versionState({ ...f.noCurrent, withdrawnReleaseVersions: [2] }, 1),
    ).toBe('superseded');
  });
});

describe('feedbackVersionSchema', () => {
  it('round-trips released, superseded and withdrawn projections', () => {
    for (const value of [
      f.first,
      f.correction,
      f.superseded,
      f.historicalWithdrawal,
      f.currentWithdrawal,
    ])
      expect(feedbackVersionSchema.parse(value)).toEqual(value);
  });

  it('rejects a tombstone carrying a reason or scores', () => {
    contractError(() =>
      feedbackVersionSchema.parse({ ...f.historicalWithdrawal, reason: 'x' }),
    );
    contractError(() =>
      feedbackVersionSchema.parse({
        ...f.historicalWithdrawal,
        criteria: f.first.criteria,
      }),
    );
  });
});

describe('history feedbackReleased flag (SF-07)', () => {
  const row = {
    attemptId: 'attempt_demo',
    assignmentVersionId: 'ver-1',
    submittedAt: '2026-11-06T06:00:00.000Z',
    answerCount: 1,
    feedbackReleased: true,
  };
  it('requires a strict boolean', () => {
    const page = { schemaVersion: 1, items: [row], nextCursor: null };
    expect(attemptHistorySchema.parse(page)).toEqual(page);
    const missing: Record<string, unknown> = { ...row };
    delete missing.feedbackReleased;
    for (const item of [
      missing,
      { ...row, feedbackReleased: 'true' },
      { ...row, score: 5 },
    ])
      contractError(() =>
        attemptHistorySchema.parse({ ...page, items: [item] }),
      );
  });
});
