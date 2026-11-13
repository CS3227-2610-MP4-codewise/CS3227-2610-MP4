// @vitest-environment jsdom
import { createElement } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentWorkspace } from './StudentWorkspace';
import { parseStudentRoute, studentPaths } from './model';

/** student-progress SP-09, UI-07/08: progress page DOM behaviour with synthetic responses only. */
type Reply = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
};
let routes: Record<string, (Reply | (() => Promise<Reply>))[]>;
let calls: { key: string; init?: RequestInit }[];
const PATH = '/api/student/courses/course-a/progress';

const session = {
  session: {
    schemaVersion: 1,
    userId: 'user-1',
    expiresAt: '2026-11-10T00:00:00.000Z',
  },
  email: 'student@u.nus.edu',
  administrator: false,
  csrfToken: 'csrf-progress',
};
const evidence = [
  {
    assessmentId: 'as-2',
    releaseVersion: 1,
    releasedAt: '2026-11-08T04:00:00.000Z',
    attemptId: 'at-2',
    publicationId: 'pub-2',
    title: 'Loops practice',
  },
  {
    assessmentId: 'as-1',
    releaseVersion: 2,
    releasedAt: '2026-11-05T04:00:00.000Z',
    attemptId: 'at-1',
    publicationId: 'pub-1',
    title: 'Warm-up',
  },
];
const base = {
  schemaVersion: 1,
  courseId: 'course-a',
  aiAvailable: true,
  evidence,
};
const explained = {
  ...base,
  state: 'explained',
  explanation: {
    generatedAt: '2026-11-09T04:00:00.000Z',
    comparable: true,
    allFullMarks: false,
    recentAssignments: [
      {
        assessmentId: 'as-1',
        releaseVersion: 2,
        strengths: [
          { comparisonKey: 'naming', text: 'Your names were clear.' },
        ],
        focus: [
          { comparisonKey: 'loops', text: 'Check where the loop stops.' },
        ],
      },
      {
        assessmentId: 'as-2',
        releaseVersion: 1,
        strengths: [],
        focus: [
          { comparisonKey: 'loops', text: 'The last item is still skipped.' },
        ],
      },
    ],
    recurringIssues: [
      {
        comparisonKey: 'loops',
        summary: 'Loop boundaries were flagged in both assignments.',
        evidence: [
          { assessmentId: 'as-1', releaseVersion: 2 },
          { assessmentId: 'as-2', releaseVersion: 1 },
        ],
      },
    ],
    improvements: [],
    suggestions: [
      {
        text: 'Trace the first and last iteration by hand.',
        evidence: [{ assessmentId: 'as-2', releaseVersion: 1 }],
      },
    ],
    limitations: ['Only two released assignments were available.'],
  },
};

beforeEach(() => {
  calls = [];
  routes = {
    'GET /api/auth/session': [{ status: 200, body: session }],
    ['GET ' + PATH]: [{ status: 200, body: { ...base, state: 'ready' } }],
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const key = (init?.method ?? 'GET') + ' ' + input;
      calls.push({ key, init });
      const queue = routes[key];
      if (!queue?.length) return new Response('{}', { status: 404 });
      const next = queue.length > 1 ? queue.shift()! : queue[0];
      const reply = typeof next === 'function' ? await next() : next;
      return new Response(JSON.stringify(reply.body ?? {}), {
        status: reply.status,
        headers: reply.headers,
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const show = () =>
  render(
    createElement(StudentWorkspace, {
      route: { kind: 'progress', courseId: 'course-a' },
    }),
  );
const main = () => document.getElementById('main-content')!;

describe('progress route', () => {
  it('parses only the exact progress path without a query', () => {
    expect(parseStudentRoute('/student/courses/course-a/progress', '')).toEqual(
      { kind: 'progress', courseId: 'course-a' },
    );
    expect(
      parseStudentRoute('/student/courses/course-a/progress', '?x=1'),
    ).toBeNull();
    expect(parseStudentRoute('/student/courses/a b/progress', '')).toBeNull();
    expect(studentPaths.progress('course-a')).toBe(
      '/student/courses/course-a/progress',
    );
  });
});

describe('progress page (SP-09)', () => {
  it('lists evidence with Released feedback links and focuses the heading', async () => {
    show();
    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Your progress',
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    const link = await screen.findByRole('link', {
      name: /Open released feedback for Loops practice/,
    });
    expect(link.getAttribute('href')).toBe(
      '/student/assignments/pub-2/work/1?view=feedback&attempt=at-2',
    );
    expect(main().textContent).toContain('Release 2, released');
    expect(
      screen
        .getByRole('link', { name: /Back to assignments/ })
        .getAttribute('href'),
    ).toBe('/student/courses/course-a/assignments');
  });

  it('disables the action while generating, announces it, then shows the labelled explanation', async () => {
    let finish: (r: Reply) => void = () => {};
    routes['POST ' + PATH] = [
      () => new Promise<Reply>((resolve) => (finish = resolve)),
    ];
    show();
    const button = await screen.findByRole('button', {
      name: 'Explain my progress',
    });
    fireEvent.click(button);
    await waitFor(() =>
      expect(
        (
          screen.getByRole('button', {
            name: 'Preparing explanation…',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true),
    );
    expect(within(main()).getByRole('status').textContent).toBe(
      'Preparing your progress explanation…',
    );
    const post = calls.find((c) => c.key === 'POST ' + PATH)!;
    expect(new Headers(post.init?.headers).get('X-CSRF-Token')).toBe(
      'csrf-progress',
    );
    expect(Object.keys(JSON.parse(String(post.init?.body)))).toEqual([
      'idempotencyKey',
    ]);
    finish({ status: 200, body: explained });
    expect(
      await screen.findByRole('heading', { name: 'Recurring issues' }),
    ).toBeTruthy();
    expect(within(main()).getByRole('status').textContent).toBe(
      'Your progress explanation is ready.',
    );
    expect(main().textContent).toContain(
      'AI-generated from your released feedback',
    );
    expect(main().textContent).toContain('It does not change any grade.');
    expect(
      screen.getByRole('heading', { name: 'Practice suggestions' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Limitations' })).toBeTruthy();
    // Empty sections are omitted.
    expect(
      screen.queryByRole('heading', { name: 'Supported improvements' }),
    ).toBeNull();
    const cited = screen.getAllByRole('link', { name: 'Warm-up' });
    expect(cited[0].getAttribute('href')).toBe(
      '/student/assignments/pub-1/work/1?view=feedback&attempt=at-1',
    );
    // No invented scores, totals or percentages anywhere on the page.
    const prose = main().cloneNode(true) as HTMLElement;
    prose.querySelectorAll('time').forEach((t) => t.remove()); // dates are not scores
    expect(prose.textContent).not.toMatch(/\d+\s*\/\s*\d|%|score|total/i);
  });

  it('withholds stale explanation text and offers a new one', async () => {
    routes['GET ' + PATH] = [
      {
        status: 200,
        body: {
          ...base,
          state: 'stale',
          generatedAt: '2026-11-07T04:00:00.000Z',
        },
      },
    ];
    show();
    expect(
      await screen.findByRole('button', { name: 'Generate a new explanation' }),
    ).toBeTruthy();
    expect(main().textContent).toContain('is no longer shown');
    expect(screen.queryByRole('heading', { name: 'Explanation' })).toBeNull();
  });

  it('explains that nothing is released yet, with no action', async () => {
    routes['GET ' + PATH] = [
      { status: 200, body: { ...base, evidence: [], state: 'no-feedback' } },
    ];
    show();
    expect(
      await screen.findByText(/No feedback has been released/),
    ).toBeTruthy();
    expect(within(main()).queryByRole('button')).toBeNull();
  });

  it('shows recent assignments newest first with what went well and what to work on', async () => {
    routes['GET ' + PATH] = [{ status: 200, body: explained }];
    show();
    const recent = await screen.findByRole('heading', {
      name: 'Recent assignments',
    });
    const section = recent.closest('section')!;
    const titles = within(section)
      .getAllByRole('link')
      .map((a) => a.textContent);
    expect(titles).toEqual(['Loops practice', 'Warm-up']);
    expect(
      within(section).getAllByRole('heading', { name: 'To work on' }),
    ).toHaveLength(2);
    // Loops practice has no strengths, so only Warm-up shows "What went well".
    expect(
      within(section).getAllByRole('heading', { name: 'What went well' }),
    ).toHaveLength(1);
    expect(main().textContent).not.toContain('Good job');
    expect(main().textContent).not.toContain('do not share rubric criteria');
  });

  it('shows Good job for full marks and the summary note when nothing is comparable', async () => {
    routes['GET ' + PATH] = [
      {
        status: 200,
        body: {
          ...explained,
          explanation: {
            ...explained.explanation,
            comparable: false,
            allFullMarks: true,
            recentAssignments: [
              {
                assessmentId: 'as-2',
                releaseVersion: 1,
                strengths: [
                  { comparisonKey: 'loops', text: 'Every item was handled.' },
                ],
                focus: [],
              },
            ],
            recurringIssues: [],
            improvements: [],
          },
        },
      },
    ];
    show();
    expect(
      await screen.findByText('Good job! Keep up the good work.'),
    ).toBeTruthy();
    expect(main().textContent).toContain('do not share rubric criteria');
    expect(screen.queryByRole('heading', { name: 'To work on' })).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Recurring issues' }),
    ).toBeNull();
  });

  it('says explanations are unavailable when AI is not configured', async () => {
    routes['GET ' + PATH] = [
      { status: 200, body: { ...base, aiAvailable: false, state: 'ready' } },
    ];
    show();
    expect(
      await screen.findByText(
        'Progress explanations are not available right now.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Explain/ })).toBeNull();
  });

  it('reports a rejected output and a rate limit without showing any text', async () => {
    routes['POST ' + PATH] = [
      { status: 503, body: { error: { code: 'INVALID_CONTRACT' } } },
      {
        status: 429,
        body: { error: { code: 'RATE_LIMITED' } },
        headers: { 'Retry-After': '30' },
      },
    ];
    show();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Explain my progress' }),
    );
    expect(
      await screen.findByText(/did not pass our checks/, {
        selector: 'p.cw-progress-problem',
      }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Explain my progress' }),
    );
    expect(
      await screen.findByText(/Too many requests/, {
        selector: 'p.cw-progress-problem',
      }),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Explain my progress',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('shows a session failure with a sign-in action', async () => {
    routes['GET ' + PATH] = [{ status: 401 }];
    show();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'Released feedback used' }),
    ).toBeNull();
  });
});

describe('course page link (SP-09)', () => {
  it('offers View my progress on the assignment list', async () => {
    routes['GET /api/student/courses/course-a/assignments'] = [
      {
        status: 200,
        body: {
          schemaVersion: 1,
          course: { id: 'course-a', name: 'Synthetic course A' },
          items: [],
          nextCursor: null,
        },
      },
    ];
    render(
      createElement(StudentWorkspace, {
        route: { kind: 'assignments', courseId: 'course-a', cursor: null },
      }),
    );
    const link = await screen.findByRole('link', { name: /View my progress/ });
    expect(link.getAttribute('href')).toBe(
      '/student/courses/course-a/progress',
    );
  });
});
