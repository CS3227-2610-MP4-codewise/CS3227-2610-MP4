// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { createElement, useState } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Publication } from '../../shared/instructor-contracts/publication';
import type {
  Release,
  Withdrawn,
} from '../../shared/instructor-contracts/release';
import type { Attempt } from '../../shared/instructor-contracts/submission';
import { AttemptPicker, AttemptView, useAttemptContext } from './Attempts';
import { AttemptFeedback } from './Feedback';
import { workApi } from './work-model';

/** SF-02–SF-07, SUB-04, UI-04/06/08: feedback panel DOM behaviour against a synthetic API. */
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const pub: Publication = {
  schemaVersion: 1,
  assignmentId: 'alpha',
  assignmentVersionId: 'v1',
  courseId: 'course-a',
  title: 'Synthetic assignment',
  publishedAt: '2026-11-01T12:00:00.000Z',
  deadlineAt: '2026-11-20T12:00:00.000Z',
  questions: [
    {
      questionId: 'q1',
      questionVersionId: 'qv1',
      title: 'Sum values',
      instructions: 'Add them.',
      language: 'python',
      starterCode: 'total = 0\n',
      rubricId: 'r1',
      rubricVersionId: 'rv1',
      criteria: [
        {
          criterionId: 'c1',
          comparisonKey: 'k1',
          descriptor: 'Correct total',
          minimumScore: 0,
          maximumScore: 5,
        },
      ],
    },
  ],
};
type Att = { id: string; at: string; source: string };
let attempts: Att[];
let feedback: Map<string, { status: number; body: unknown }>;
let versions: Map<string, { status: number; body: unknown }>;
let requests: string[];

const attemptBody = (a: Att) => ({
  schemaVersion: 1,
  attemptId: a.id,
  assignmentVersionId: 'v1',
  courseId: 'course-a',
  submittedByUserId: 'user-1',
  submittedAt: a.at,
  answers: [
    {
      submittedAnswerId: a.id + '-a0',
      questionVersionId: 'qv1',
      rubricVersionId: 'rv1',
      draftRevision: 1,
      source: a.source,
      sourceHash: sha(a.source),
    },
  ],
});
const release = (
  a: Att,
  version: number,
  state: 'released' | 'superseded',
  annotations: Release['annotations'],
  score = 4,
): Release => ({
  schemaVersion: 1,
  id: 'assessment-' + a.id,
  submissionAttemptId: a.id,
  assessmentRevisionId: `rev-${a.id}-${version}`,
  releaseVersion: version,
  releasedAt: `2026-11-1${version}T09:00:00.000Z`,
  state,
  criteria: [
    {
      questionVersionId: 'qv1',
      rubricVersionId: 'rv1',
      criterionId: 'c1',
      comparisonKey: 'k1',
      minimumScore: 0,
      maximumScore: 5,
      score,
      explanation: `Version ${version} explanation.`,
    },
  ],
  annotations,
});
const note = (
  a: Att,
  startLine: number,
  endLine: number,
  excerpt: string,
  explanation: string,
) => ({
  submittedAnswerId: a.id + '-a0',
  questionVersionId: 'qv1',
  rubricVersionId: 'rv1',
  criterionId: 'c1',
  startLine,
  endLine,
  excerpt,
  explanation,
});
const currentness = (
  a: Att,
  current: number | null,
  withdrawn: number[],
  revision: number,
) => ({
  schemaVersion: 1,
  assessmentId: 'assessment-' + a.id,
  submissionAttemptId: a.id,
  availabilityRevision: revision,
  currentReleaseVersion: current,
  withdrawnReleaseVersions: withdrawn,
  checkedAt: '2026-11-12T00:00:00.000Z',
});
const tomb = (a: Att, version: number): Withdrawn => ({
  schemaVersion: 1,
  id: 'assessment-' + a.id,
  submissionAttemptId: a.id,
  releaseVersion: version,
  state: 'withdrawn',
  withdrawnAt: '2026-11-15T10:00:00.000Z',
});

const fetcher = async (input: RequestInfo | URL) => {
  const path = String(input);
  requests.push(path);
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status });
  if (path === '/api/student/publications/v1/attempts')
    return reply(200, {
      schemaVersion: 1,
      items: attempts.map((a, i) => ({
        attemptId: a.id,
        assignmentVersionId: 'v1',
        submittedAt: a.at,
        answerCount: 1,
        feedbackReleased: i === 1,
      })),
      nextCursor: null,
    });
  const v = /^\/api\/student\/attempts\/([^/]+)\/feedback\/(\d+)$/.exec(path);
  if (v) {
    const r = versions.get(v[1] + ':' + v[2]);
    return r ? reply(r.status, r.body) : reply(404, {});
  }
  const f = /^\/api\/student\/attempts\/([^/]+)\/feedback$/.exec(path);
  if (f) {
    const r = feedback.get(f[1]) ?? {
      status: 200,
      body: { schemaVersion: 1, state: 'none' },
    };
    return reply(r.status, r.body);
  }
  const at = /^\/api\/student\/attempts\/([^/]+)$/.exec(path);
  const a = at && attempts.find((x) => x.id === at[1]);
  return a ? reply(200, attemptBody(a)) : reply(404, {});
};

function show(openId: string) {
  return render(
    createElement(AttemptView, {
      api: workApi(fetcher as typeof fetch),
      attemptId: openId,
      current: pub,
      onBack: () => {},
    }),
  );
}
/** The attempt selector over the shared attempt context (SQ-02, SF-07). */
function Picker() {
  const [api] = useState(() => workApi(fetcher as typeof fetch));
  const ctx = useAttemptContext({
    api,
    versionId: 'v1',
    publication: pub,
    reloadKey: 0,
    enabled: true,
  });
  return createElement(AttemptPicker, { ctx, onReturn: () => {} });
}
const article = () =>
  screen.findByRole('article', { name: 'Submitted attempt' });

const later: Att = {
  id: 'att-later',
  at: '2026-11-10T10:00:00.000Z',
  source: 'total = 99\nprint(total)\n',
};
const earlier: Att = {
  id: 'att-early',
  at: '2026-11-09T10:00:00.000Z',
  source: 'total = 0\nfor x in [1, 2]:\n    total += x\nprint(total)\n',
};

beforeEach(() => {
  attempts = [later, earlier];
  feedback = new Map();
  versions = new Map();
  requests = [];
});
afterEach(() => cleanup());

describe('released feedback on the attempt view', () => {
  it('annotates the earlier attempt’s own source, not a later attempt', async () => {
    feedback.set(earlier.id, {
      status: 200,
      body: {
        schemaVersion: 1,
        state: 'released',
        currentness: currentness(earlier, 1, [], 1),
        versions: [{ releaseVersion: 1, state: 'released' }],
        release: release(earlier, 1, 'released', [
          note(earlier, 2, 3, 'for x in [1, 2]:\n    total += x', 'Loop adds.'),
        ]),
      },
    });
    show(earlier.id);
    const view = await article();
    await within(view).findByText(/Current feedback, version 1/);
    const source = within(view).getByRole('region', {
      name: 'Submitted source for question 1',
    });
    expect(source.textContent).toContain('total = 0');
    expect(source.textContent).not.toContain('total = 99');
    const marker = await within(source).findByRole('button', {
      name: /Observation A, lines 2–3, Correct total/,
    });
    expect(marker.closest('.cw-fb-line')!.textContent).toContain(
      'for x in [1, 2]:',
    );
    const table = within(view).getByRole('table', {
      name: 'Scores for question 1',
    });
    // DR-03: `Score: X / N`, with no minimum or range text.
    expect(table.textContent).toMatch(/Correct total.*Score: 4 \/ 5/);
    expect(table.textContent).not.toMatch(/range|0–5/);
    expect(within(view).getByText(/Current feedback, version 1/)).toBeTruthy();
  });

  it('selects an observation from the list, keeps focus, highlights the range and announces it', async () => {
    feedback.set(earlier.id, {
      status: 200,
      body: {
        schemaVersion: 1,
        state: 'released',
        currentness: currentness(earlier, 1, [], 1),
        versions: [{ releaseVersion: 1, state: 'released' }],
        release: release(earlier, 1, 'released', [
          note(earlier, 1, 1, 'total = 0', 'Starts at zero.'),
          note(earlier, 2, 3, 'for x in [1, 2]:\n    total += x', 'Loop adds.'),
        ]),
      },
    });
    show(earlier.id);
    const view = await article();
    const entry = await within(view).findByRole('button', {
      name: /^Observation\s*B\s*,\s*lines 2–3: Correct total$/,
    });
    entry.focus();
    fireEvent.click(entry);
    expect(document.activeElement).toBe(entry);
    expect(entry.getAttribute('aria-pressed')).toBe('true');
    const selected = view.querySelectorAll('.cw-fb-line[data-selected]');
    expect(
      [...selected].map((l) => l.querySelector('.cw-fb-no')!.textContent),
    ).toEqual(['2', '3']);
    expect(selected[0].textContent).toContain('(selected)');
    expect(
      within(view)
        .getByRole('button', { name: /Observation B, lines 2–3/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    const noteRegion = within(view).getByRole('region', {
      name: 'Observation B',
    });
    expect(noteRegion.textContent).toMatch(
      /Correct total.*lines 2–3.*Loop adds/,
    );
    const live = view.querySelector('[aria-live="polite"]')!;
    expect(live.textContent).toMatch(
      /Observation B, lines 2–3.*selected\. Loop adds\./,
    );
  });

  it('lists an unmatched annotation as unavailable and marks no line for it', async () => {
    feedback.set(earlier.id, {
      status: 200,
      body: {
        schemaVersion: 1,
        state: 'released',
        currentness: currentness(earlier, 1, [], 1),
        versions: [{ releaseVersion: 1, state: 'released' }],
        release: release(earlier, 1, 'released', [
          note(earlier, 1, 1, 'total = 5', 'Mismatched excerpt.'),
          note(earlier, 4, 9, 'print(total)', 'Past the end.'),
        ]),
      },
    });
    show(earlier.id);
    const view = await article();
    const list = await within(view).findByRole('region', {
      name: 'Observations that could not be shown on source',
    });
    expect(list.textContent).toContain('Mismatched excerpt.');
    expect(list.textContent).toContain('Past the end.');
    expect(view.querySelectorAll('.cw-fb-line[data-annotated]')).toHaveLength(
      0,
    );
    expect(
      within(view).queryByRole('button', { name: /Observation/ }),
    ).toBeNull();
    expect(within(view).getByRole('table')).toBeTruthy();
  });

  it('shows a withdrawn current as a tombstone and never an older release as current', async () => {
    feedback.set(earlier.id, {
      status: 200,
      body: {
        schemaVersion: 1,
        state: 'withdrawn',
        currentness: currentness(earlier, null, [2], 3),
        versions: [
          { releaseVersion: 2, state: 'withdrawn' },
          { releaseVersion: 1, state: 'superseded' },
        ],
      },
    });
    versions.set(`${earlier.id}:2`, { status: 200, body: tomb(earlier, 2) });
    versions.set(`${earlier.id}:1`, {
      status: 200,
      body: release(earlier, 1, 'superseded', [], 3),
    });
    show(earlier.id);
    const view = await article();
    await within(view).findByText(/Feedback version 2 was withdrawn on/);
    expect(within(view).queryByRole('table')).toBeNull();
    expect(within(view).queryByText(/Current feedback/)).toBeNull();
    expect(view.textContent).not.toMatch(/explanation|Score:/);
    // The source stays visible in the withdrawn state.
    expect(
      within(view).getByRole('region', {
        name: 'Submitted source for question 1',
      }).textContent,
    ).toContain('total = 0');
    fireEvent.change(within(view).getByLabelText('Feedback version'), {
      target: { value: '1' },
    });
    await within(view).findByText(
      /Replaced feedback \(not current\), version 1/,
    );
    expect(within(view).getByRole('table').textContent).toContain(
      'Score: 3 / 5',
    );
    expect(within(view).queryByText(/Current feedback/)).toBeNull();
  });

  it('refetches on every remount and leaves the working copy untouched', async () => {
    show(earlier.id);
    const view = await article();
    await within(view).findByText(/Feedback has not been released/);
    expect(view.textContent).not.toMatch(/of 5|Score/);
    cleanup();
    show(earlier.id);
    await within(await article()).findByText(/Feedback has not been released/);
    const feedbackCalls = requests.filter((r) => r.endsWith('/feedback'));
    expect(feedbackCalls).toEqual([
      `/api/student/attempts/${earlier.id}/feedback`,
      `/api/student/attempts/${earlier.id}/feedback`,
    ]);
    expect(requests.some((r) => /drafts|\/work$/.test(r))).toBe(false);
  });

  it('shows distinct stale, expired, network and unavailable states with the source visible', async () => {
    for (const [status, body, text, action] of [
      [
        409,
        { error: { code: 'STALE_FEEDBACK' } },
        /changed while it was loading/,
        'Load feedback again',
      ],
      [401, {}, /session has ended/, null],
      [500, {}, /could not be loaded/, 'Try again'],
      [503, {}, /not available right now/, null],
    ] as const) {
      feedback.set(earlier.id, { status, body });
      show(earlier.id);
      const view = await article();
      const alert = await within(view).findByText(text);
      expect(
        within(view).getByRole('region', {
          name: 'Submitted source for question 1',
        }),
      ).toBeTruthy();
      expect(view.textContent).not.toMatch(/of 5/);
      if (action)
        expect(within(view).getByRole('button', { name: action })).toBeTruthy();
      if (status === 401)
        expect(
          within(view).getByRole('link', { name: 'Sign in' }),
        ).toBeTruthy();
      expect(alert).toBeTruthy();
      cleanup();
    }
  });

  it('retries a stale result and shows the new current release', async () => {
    feedback.set(earlier.id, {
      status: 409,
      body: { error: { code: 'STALE_FEEDBACK' } },
    });
    show(earlier.id);
    const view = await article();
    const retry = await within(view).findByRole('button', {
      name: 'Load feedback again',
    });
    feedback.set(earlier.id, {
      status: 200,
      body: {
        schemaVersion: 1,
        state: 'released',
        currentness: currentness(earlier, 2, [], 2),
        versions: [
          { releaseVersion: 2, state: 'released' },
          { releaseVersion: 1, state: 'superseded' },
        ],
        release: release(earlier, 2, 'released', []),
      },
    });
    fireEvent.click(retry);
    await within(view).findByText(/Current feedback, version 2/);
  });
});

describe('history marker (SF-07)', () => {
  it('shows the text marker only on flagged rows and no scores', async () => {
    attempts = [
      later,
      earlier,
      { ...earlier, id: 'att-third', at: '2026-11-08T10:00:00.000Z' },
    ];
    render(createElement(Picker));
    const select = await screen.findByLabelText('Attempt');
    const options = within(select).getAllByRole('option');
    expect(
      options.map((o) => /Feedback released/.test(o.textContent!)),
    ).toEqual([false, true, false]);
    await waitFor(() =>
      expect(document.body.textContent).not.toMatch(/of 5|score/i),
    );
  });
});

/** SQ-04, SF-03/04/05, UI-06: the same release shown one question at a time. */
describe('per-question released feedback (SQ-04)', () => {
  const two: Publication = {
    ...pub,
    questions: [
      pub.questions[0],
      {
        ...pub.questions[0],
        questionId: 'q2',
        questionVersionId: 'qv2',
        title: 'Product',
        rubricId: 'r2',
        rubricVersionId: 'rv2',
        criteria: [
          {
            criterionId: 'c2',
            comparisonKey: 'k2',
            descriptor: 'Correct product',
            minimumScore: 0,
            maximumScore: 3,
          },
        ],
      },
    ],
  };
  const att: Att = {
    id: 'att-two',
    at: '2026-11-10T10:00:00.000Z',
    source: '',
  };
  const attempt: Attempt = {
    schemaVersion: 1,
    attemptId: att.id,
    assignmentVersionId: 'v1',
    courseId: 'course-a',
    submittedByUserId: 'user-1',
    submittedAt: att.at,
    answers: [
      ['qv1', 'rv1', 'total = 0\nprint(total)\n'],
      ['qv2', 'rv2', 'prod = 1\nprint(prod)\n'],
    ].map(([qv, rv, source], i) => ({
      submittedAnswerId: `${att.id}-a${i}`,
      questionVersionId: qv,
      rubricVersionId: rv,
      draftRevision: 1,
      source,
      sourceHash: sha(source),
    })),
  };
  const criterion = (qv: string, rv: string, c: string, max: number) => ({
    questionVersionId: qv,
    rubricVersionId: rv,
    criterionId: c,
    comparisonKey: 'k' + c.slice(1),
    minimumScore: 0,
    maximumScore: max,
    score: 2,
    explanation: `Explains ${c}.`,
  });
  const annotation = (
    index: number,
    qv: string,
    rv: string,
    c: string,
    excerpt: string,
    explanation: string,
  ) => ({
    submittedAnswerId: `${att.id}-a${index}`,
    questionVersionId: qv,
    rubricVersionId: rv,
    criterionId: c,
    startLine: 1,
    endLine: 1,
    excerpt,
    explanation,
  });
  const full = (
    version: number,
    state: 'released' | 'superseded',
    over: Partial<Release> = {},
  ): Release => ({
    ...release(att, version, state, [
      annotation(0, 'qv1', 'rv1', 'c1', 'total = 0', 'Note for one.'),
      annotation(1, 'qv2', 'rv2', 'c2', 'prod = 1', 'Note for two.'),
      annotation(1, 'qv2', 'rv2', 'c2', 'prod = 9', 'Stale for two.'),
    ]),
    criteria: [
      criterion('qv1', 'rv1', 'c1', 5),
      criterion('qv2', 'rv2', 'c2', 3),
    ],
    ...over,
  });
  const summaryOf = (r: Release, listed: number[] = [r.releaseVersion]) => ({
    status: 200,
    body: {
      schemaVersion: 1,
      state: 'released',
      currentness: currentness(att, r.releaseVersion, [], 1),
      versions: listed.map((n, i) => ({
        releaseVersion: n,
        state: i === 0 ? 'released' : 'superseded',
      })),
      release: r,
    },
  });
  const api = workApi(fetcher as typeof fetch);
  const props = (questionVersionId: string) => ({
    api,
    attempt,
    pub: two,
    questionVersionId,
  });
  const summaryCalls = () => requests.filter((r) => r.endsWith('/feedback'));

  it('shows only the current question’s criteria, markers and unavailable evidence', async () => {
    feedback.set(att.id, summaryOf(full(1, 'released')));
    const { rerender } = render(createElement(AttemptFeedback, props('qv2')));
    await screen.findByText(/Current feedback, version 1/);
    const table = screen.getByRole('table', { name: 'Scores for question 2' });
    expect(table.textContent).toContain('Correct product');
    expect(table.textContent).not.toContain('Correct total');
    expect(screen.queryByRole('table', { name: /question 1/ })).toBeNull();
    const source = screen.getByRole('region', {
      name: 'Submitted source for question 2',
    });
    expect(source.textContent).toContain('prod = 1');
    expect(source.textContent).not.toContain('total = 0');
    // Markers restart at A for the question shown, even though question 1 has a note too.
    expect(
      within(source).getByRole('button', { name: /Observation A, line 1/ }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Observation B/ })).toBeNull();
    expect(screen.queryByText('Note for one.')).toBeNull();
    // SF-04: the mismatched note is listed, but only on its own question.
    const unavailable = screen.getByRole('region', {
      name: 'Observations that could not be shown on source',
    });
    expect(unavailable.textContent).toContain('Stale for two.');
    rerender(createElement(AttemptFeedback, props('qv1')));
    await screen.findByRole('table', { name: 'Scores for question 1' });
    expect(screen.queryByText(/Stale for two/)).toBeNull();
    expect(
      screen.queryByRole('region', {
        name: 'Observations that could not be shown on source',
      }),
    ).toBeNull();
    expect(
      screen.getByRole('region', { name: 'Submitted source for question 1' })
        .textContent,
    ).not.toContain('prod');
    expect(
      screen.getByRole('button', { name: /Observation A, line 1/ }),
    ).toBeTruthy();
  });

  it('fetches the summary again for every question shown', async () => {
    feedback.set(att.id, summaryOf(full(1, 'released')));
    const { rerender } = render(createElement(AttemptFeedback, props('qv1')));
    await screen.findByRole('table', { name: 'Scores for question 1' });
    expect(summaryCalls()).toHaveLength(1);
    rerender(createElement(AttemptFeedback, props('qv2')));
    await screen.findByRole('table', { name: 'Scores for question 2' });
    expect(summaryCalls()).toHaveLength(2);
  });

  it('says a question has no released feedback in this version and still shows its source', async () => {
    const r = full(1, 'released');
    feedback.set(
      att.id,
      summaryOf({
        ...r,
        criteria: r.criteria.slice(0, 1),
        annotations: r.annotations.slice(0, 1),
      }),
    );
    render(createElement(AttemptFeedback, props('qv2')));
    await screen.findByText(/Current feedback, version 1/);
    expect(
      screen.getByText(
        'This question has no released feedback in this version.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(
      screen.getByRole('region', { name: 'Submitted source for question 2' })
        .textContent,
    ).toContain('prod = 1');
    expect(
      document.querySelectorAll('.cw-fb-line[data-annotated]'),
    ).toHaveLength(0);
  });

  it('keeps a chosen replaced version across questions and refetches it', async () => {
    feedback.set(att.id, summaryOf(full(2, 'released'), [2, 1]));
    versions.set(`${att.id}:1`, {
      status: 200,
      body: full(1, 'superseded'),
    });
    const { rerender } = render(createElement(AttemptFeedback, props('qv1')));
    await screen.findByText(/Current feedback, version 2/);
    fireEvent.change(screen.getByLabelText('Feedback version'), {
      target: { value: '1' },
    });
    await screen.findByText(/Replaced feedback \(not current\), version 1/);
    const before = requests.filter((r) => r.endsWith('/feedback/1')).length;
    rerender(createElement(AttemptFeedback, props('qv2')));
    await screen.findByRole('table', { name: 'Scores for question 2' });
    expect(
      screen.getByText(/Replaced feedback \(not current\), version 1/),
    ).toBeTruthy();
    expect(screen.queryByText(/Current feedback/)).toBeNull();
    expect(requests.filter((r) => r.endsWith('/feedback/1')).length).toBe(
      before + 1,
    );
  });

  /** A stand-in for the attempt context, which outlives the feedback view. */
  const holder = () => {
    const h = {
      chosen: null as number | null,
      choose: (v: number | null) => {
        h.chosen = v;
      },
    };
    return h;
  };

  it('keeps a chosen version held by the attempt context after the view is left and reopened', async () => {
    feedback.set(att.id, summaryOf(full(2, 'released'), [2, 1]));
    versions.set(`${att.id}:1`, {
      status: 200,
      body: full(1, 'superseded'),
    });
    const version = holder();
    const first = render(
      createElement(AttemptFeedback, { ...props('qv1'), version }),
    );
    await screen.findByText(/Current feedback, version 2/);
    fireEvent.change(screen.getByLabelText('Feedback version'), {
      target: { value: '1' },
    });
    expect(version.chosen).toBe(1);
    first.unmount();
    render(createElement(AttemptFeedback, { ...props('qv2'), version }));
    await screen.findByText(/Replaced feedback \(not current\), version 1/);
    expect(screen.queryByText(/Current feedback/)).toBeNull();
  });

  it('resets a chosen version that is no longer listed, with an announcement', async () => {
    feedback.set(att.id, summaryOf(full(2, 'released'), [2]));
    const version = holder();
    version.chosen = 1;
    render(createElement(AttemptFeedback, { ...props('qv1'), version }));
    await screen.findByText(/Current feedback, version 2/);
    // The reset and its announcement follow the refreshed summary in an effect.
    await screen.findByText(
      'Feedback version 1 is no longer available. Showing the default version.',
    );
    expect(version.chosen).toBeNull();
    expect(screen.queryByText(/Replaced feedback/)).toBeNull();
  });

  it('shows the tombstone, not an earlier release, when the current release is withdrawn between questions', async () => {
    feedback.set(att.id, summaryOf(full(2, 'released'), [2, 1]));
    const { rerender } = render(createElement(AttemptFeedback, props('qv1')));
    await screen.findByText(/Current feedback, version 2/);
    feedback.set(att.id, {
      status: 200,
      body: {
        schemaVersion: 1,
        state: 'withdrawn',
        currentness: currentness(att, null, [2], 2),
        versions: [
          { releaseVersion: 2, state: 'withdrawn' },
          { releaseVersion: 1, state: 'superseded' },
        ],
      },
    });
    versions.set(`${att.id}:2`, { status: 200, body: tomb(att, 2) });
    rerender(createElement(AttemptFeedback, props('qv2')));
    await screen.findByText(/Feedback version 2 was withdrawn on/);
    expect(screen.queryByText(/Current feedback/)).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(
      screen.getByRole('region', { name: 'Submitted source for question 2' })
        .textContent,
    ).toContain('prod = 1');
  });
});
