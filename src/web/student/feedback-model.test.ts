import { describe, expect, it } from 'vitest';
import type { Attempt } from '../../shared/instructor-contracts/submission';
import type { Release } from '../../shared/instructor-contracts/release';
import { feedbackSummarySchema } from '../../shared/student-feedback';
import { publicFeedbackFixtures } from '../../../workflow/assessment-preview/public-fixtures';
import {
  feedbackReducer,
  markerFor,
  matchAnnotations,
  sourceLines,
  type FeedbackPanelState,
} from './feedback-model';
import { ApiError } from './work-model';

/** SF-04, SF-06 (design D4): synthetic attempts only. */
const attempt: Attempt = {
  schemaVersion: 1,
  attemptId: 'attempt_demo',
  assignmentVersionId: 'ver-1',
  courseId: 'course-a',
  submittedByUserId: 's1',
  submittedAt: '2026-11-06T06:00:00.000Z',
  answers: [
    {
      submittedAnswerId: 'answer_demo',
      questionVersionId: 'question_v1',
      rubricVersionId: 'rubric_v1',
      draftRevision: 1,
      source: 'total = 0\nfor x in [1, 2]:\n    total += x\nprint(total)\n',
      sourceHash: 'a'.repeat(64),
    },
    {
      submittedAnswerId: 'answer_two',
      questionVersionId: 'question_v2',
      rubricVersionId: 'rubric_v2',
      draftRevision: 3,
      source: 'print(1)',
      sourceHash: 'b'.repeat(64),
    },
  ],
};
type Annotation = Release['annotations'][number];
const note = (over: Partial<Annotation>): Annotation => ({
  submittedAnswerId: 'answer_demo',
  questionVersionId: 'question_v1',
  rubricVersionId: 'rubric_v1',
  criterionId: 'criterion_demo',
  startLine: 1,
  endLine: 1,
  excerpt: 'total = 0',
  explanation: 'Synthetic observation.',
  ...over,
});
const unavailable = (n: Annotation) =>
  matchAnnotations([n], attempt).unavailable.length === 1;

describe('matchAnnotations (SF-04)', () => {
  it('matches an exact single-line and multi-line range with letter markers', () => {
    const m = matchAnnotations(
      [
        note({}),
        note({
          startLine: 2,
          endLine: 3,
          excerpt: 'for x in [1, 2]:\n    total += x',
        }),
        note({
          submittedAnswerId: 'answer_two',
          questionVersionId: 'question_v2',
          rubricVersionId: 'rubric_v2',
          excerpt: 'print(1)',
        }),
      ],
      attempt,
    );
    expect(m.unavailable).toEqual([]);
    expect(m.matched.map((x) => [x.index, x.marker])).toEqual([
      [0, 'A'],
      [1, 'B'],
      [2, 'C'],
    ]);
  });

  it('attributes every match to its own question so a per-question view can filter without re-matching (SQ-04)', () => {
    const m = matchAnnotations(
      [
        note({}),
        note({
          submittedAnswerId: 'answer_two',
          questionVersionId: 'question_v2',
          rubricVersionId: 'rubric_v2',
          excerpt: 'print(1)',
        }),
        // Names question 2 but quotes question 1's text: unavailable, and only on question 2.
        note({
          submittedAnswerId: 'answer_two',
          questionVersionId: 'question_v2',
          rubricVersionId: 'rubric_v2',
          excerpt: 'total = 0',
        }),
      ],
      attempt,
    );
    const forQuestion = (qv: string) => ({
      matched: m.matched.filter((x) => x.annotation.questionVersionId === qv),
      unavailable: m.unavailable.filter(
        (x) => x.annotation.questionVersionId === qv,
      ),
    });
    expect(forQuestion('question_v1').matched.map((x) => x.index)).toEqual([0]);
    expect(forQuestion('question_v1').unavailable).toEqual([]);
    expect(forQuestion('question_v2').matched.map((x) => x.index)).toEqual([1]);
    expect(forQuestion('question_v2').unavailable.map((x) => x.index)).toEqual([
      2,
    ]);
  });

  it('treats the final LF as the end of the last line, not a new line', () => {
    expect(sourceLines(attempt.answers[0].source)).toHaveLength(4);
    expect(sourceLines('print(1)')).toEqual(['print(1)']);
    expect(
      unavailable(note({ startLine: 4, endLine: 4, excerpt: 'print(total)' })),
    ).toBe(false);
    expect(unavailable(note({ startLine: 5, endLine: 5, excerpt: '' }))).toBe(
      true,
    );
  });

  it('marks no line for an excerpt mismatch, range overflow, line 0, foreign answer or question mismatch', () => {
    for (const bad of [
      note({ excerpt: 'total = 1' }),
      note({ startLine: 3, endLine: 9, excerpt: '    total += x' }),
      note({ startLine: 0, endLine: 1 }),
      note({ submittedAnswerId: 'answer_other_attempt' }),
      note({ questionVersionId: 'question_v2' }),
      note({ rubricVersionId: 'rubric_v2' }),
      note({ startLine: 2, endLine: 1 }),
    ]) {
      const m = matchAnnotations([bad, note({})], attempt);
      expect(m.unavailable.map((u) => u.index)).toEqual([0]);
      expect(m.matched.map((x) => [x.index, x.marker])).toEqual([[1, 'A']]);
    }
  });

  it('continues markers past Z', () => {
    expect([0, 25, 26, 27, 51, 52].map(markerFor)).toEqual([
      'A',
      'Z',
      'AA',
      'AB',
      'AZ',
      'BA',
    ]);
  });
});

describe('feedbackReducer (SF-06)', () => {
  const f = publicFeedbackFixtures();
  const released = feedbackSummarySchema.parse({
    schemaVersion: 1,
    state: 'released',
    currentness: {
      ...f.currentAfterHistoricalWithdrawal,
      currentReleaseVersion: 1,
      withdrawnReleaseVersions: [],
    },
    versions: [{ releaseVersion: 1, state: 'released' }],
    release: f.first,
  });
  const withdrawn = feedbackSummarySchema.parse({
    schemaVersion: 1,
    state: 'withdrawn',
    currentness: f.noCurrent,
    versions: [
      { releaseVersion: 2, state: 'withdrawn' },
      { releaseVersion: 1, state: 'withdrawn' },
    ],
  });
  if (released.state !== 'released') throw new Error('fixture');
  const loaded: FeedbackPanelState = { kind: 'released', summary: released };

  it('moves from loading to none, released or withdrawn', () => {
    const start = feedbackReducer(loaded, { type: 'load' });
    expect(start).toEqual({ kind: 'loading' });
    expect(
      feedbackReducer(start, {
        type: 'loaded',
        summary: { schemaVersion: 1, state: 'none' },
      }),
    ).toEqual({ kind: 'none' });
    expect(
      feedbackReducer(start, { type: 'loaded', summary: released }),
    ).toEqual(loaded);
    expect(
      feedbackReducer(start, { type: 'loaded', summary: withdrawn }),
    ).toEqual({ kind: 'withdrawn', summary: withdrawn });
  });

  it('maps every failure to one content-free state, including 401', () => {
    for (const [error, kind] of [
      [new ApiError('session'), 'expired'],
      [new ApiError('stale'), 'stale'],
      [new ApiError('service'), 'unavailable'],
      [new ApiError('unavailable'), 'unavailable'],
      [new ApiError('invalid'), 'unavailable'],
      [new ApiError('network'), 'network'],
      [new ApiError('rate-limited'), 'network'],
      [new TypeError('boom'), 'network'],
    ] as const) {
      const next = feedbackReducer(loaded, { type: 'failed', error });
      expect(next).toEqual({ kind });
      expect(JSON.stringify(next)).not.toMatch(/criteria|score/);
    }
  });
});
