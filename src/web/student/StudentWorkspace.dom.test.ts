// @vitest-environment jsdom
import { createElement } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentWorkspace } from './StudentWorkspace';
import { WorkspaceSwitch } from '../ui/workspace-switch';
import { chooseWorkspace, parseStudentRoute, type StudentRoute } from './model';
import type { Publication } from '../../shared/instructor-contracts/publication';

/** SD-01–06, UI-02/03/07/08: DOM behaviour with synthetic API responses only. */
type Reply = { status: number; body?: unknown };
let routes: Record<string, (Reply | (() => Promise<Reply>))[]>;
let calls: string[];
const view = {
  session: {
    schemaVersion: 1,
    userId: 'user-1',
    expiresAt: '2026-11-10T00:00:00.000Z',
  },
  email: 'student@u.nus.edu',
  administrator: false,
  csrfToken: 'csrf',
};
const contexts = (roles: ('student' | 'instructor')[], next = null) => ({
  workspaces: roles.map((role) => ({
    role,
    courses:
      role === 'student'
        ? [
            { id: 'course-a', name: 'Synthetic course A' },
            { id: 'course-b', name: 'Synthetic course B' },
          ]
        : [],
    nextCursor: role === 'student' ? next : null,
  })),
});
const page = (items: number, nextCursor: string | null = null) => ({
  schemaVersion: 1,
  course: { id: 'course-a', name: 'Synthetic course A' },
  items: Array.from({ length: items }, (_, i) => ({
    assignmentId: 'a' + i,
    assignmentVersionId: 'v' + i,
    title: 'Assignment ' + i,
    publishedAt: '2026-11-01T12:00:00.000Z',
    deadlineAt: '2026-11-0' + (i + 2) + 'T12:00:00.000Z',
  })),
  nextCursor,
});
const publication = (version: string, title: string): Publication => ({
  schemaVersion: 1,
  assignmentId: 'alpha',
  assignmentVersionId: version,
  courseId: 'course-a',
  title,
  publishedAt: '2026-11-01T12:00:00.000Z',
  deadlineAt: '2026-11-20T12:00:00.000Z',
  questions: [
    {
      questionId: 'q1',
      questionVersionId: 'qv-' + version,
      title: 'Sum',
      instructions: 'Plain instructions',
      language: 'python',
      starterCode: 'def f():\n    pass\n',
      rubricId: 'r1',
      rubricVersionId: 'rv-' + version,
      criteria: [
        {
          criterionId: 'c1',
          comparisonKey: 'k1',
          descriptor: 'Works',
          minimumScore: 0,
          maximumScore: 1,
        },
      ],
    },
  ],
});

beforeEach(() => {
  calls = [];
  routes = {
    '/api/auth/session': [{ status: 200, body: view }],
    '/api/courses/contexts': [
      { status: 200, body: contexts(['student', 'instructor']) },
    ],
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      calls.push(input);
      const queue = routes[input];
      if (!queue?.length) return new Response('{}', { status: 404 });
      const next = queue.length > 1 ? queue.shift()! : queue[0];
      const reply = typeof next === 'function' ? await next() : next;
      if (init?.signal?.aborted)
        throw new DOMException('Aborted', 'AbortError');
      return new Response(JSON.stringify(reply.body ?? {}), {
        status: reply.status,
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const show = (route: StudentRoute | null) =>
  render(createElement(StudentWorkspace, { route }));

describe('student courses', () => {
  it('lists Student courses, focuses the heading and offers the shared switch to dual-role accounts', async () => {
    show({ kind: 'courses', after: '' });
    expect(await screen.findByText('Synthetic course A')).toBeTruthy();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Your courses');
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(
      screen
        .getByRole('link', { name: /Synthetic course B/ })
        .getAttribute('href'),
    ).toBe('/student/courses/course-b/assignments');
    expect(
      await screen.findByRole('group', { name: 'Workspace' }),
    ).toBeTruthy();
    expect(
      (screen.getByRole('radio', { name: 'Student' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it('omits the switch for a single-role account', async () => {
    routes['/api/courses/contexts'] = [
      { status: 200, body: contexts(['student']) },
    ];
    show({ kind: 'courses', after: '' });
    expect(await screen.findByText('Synthetic course A')).toBeTruthy();
    await waitFor(() =>
      expect(calls.filter((c) => c === '/api/courses/contexts').length).toBe(2),
    );
    expect(screen.queryByRole('group', { name: 'Workspace' })).toBeNull();
  });

  it('offers next-page navigation without accumulating pages', async () => {
    routes['/api/courses/contexts?studentAfter=c100'] = [
      { status: 200, body: contexts(['student'], null) },
    ];
    routes['/api/courses/contexts'] = [
      {
        status: 200,
        body: {
          workspaces: [
            {
              role: 'student',
              courses: Array.from({ length: 100 }, (_, i) => ({
                id: 'c' + String(i + 1).padStart(3, '0'),
                name: 'Course ' + (i + 1),
              })),
              nextCursor: 'c100',
            },
          ],
        },
      },
    ];
    show({ kind: 'courses', after: '' });
    const next = await screen.findByRole('link', { name: /Next courses/ });
    expect(next.getAttribute('href')).toBe('/student?after=c100');
    expect(screen.getAllByRole('listitem')).toHaveLength(100);
    cleanup();
    show({ kind: 'courses', after: 'c100' });
    expect(await screen.findByText('Synthetic course A')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'First page' })).toBeTruthy();
  });

  it('shows an honest no-access state without a Student context', async () => {
    routes['/api/courses/contexts'] = [
      { status: 200, body: contexts(['instructor']) },
    ];
    show({ kind: 'courses', after: '' });
    expect(
      await screen.findByText('This is not available to you.', {
        selector: 'p:not([role])',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Go to an available workspace' }),
    ).toBeTruthy();
  });
});

describe('student assignment list', () => {
  const route = {
    kind: 'assignments',
    courseId: 'course-a',
    cursor: null,
  } as const;
  const path = '/api/student/courses/course-a/assignments';

  it('renders rows, then clears them when access is revoked on focus revalidation', async () => {
    routes[path] = [
      { status: 200, body: page(2) },
      { status: 404, body: { error: {} } },
    ];
    show(route);
    expect(await screen.findByText('Assignment 1')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Synthetic course A',
    );
    expect(screen.getByText('Mon 2 Nov 2026, 12:00 UTC')).toBeTruthy();
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(screen.queryByText('Assignment 1')).toBeNull());
    expect(
      screen
        .getAllByRole('status')
        .some((node) => node.textContent === 'This is not available to you.'),
    ).toBe(true);
    // Announced to assistive technology, shown visibly only once.
    expect(
      screen.getAllByText('This is not available to you.', {
        selector: 'p:not(.cw-sr-only)',
      }),
    ).toHaveLength(1);
  });

  it('distinguishes empty, expired-session and network states, with retry', async () => {
    routes[path] = [{ status: 200, body: page(0) }];
    show(route);
    expect(
      await screen.findByText(
        'No assignments have been published in this course yet.',
      ),
    ).toBeTruthy();
    cleanup();
    routes[path] = [{ status: 401, body: { error: {} } }];
    show(route);
    expect(
      (await screen.findByRole('link', { name: 'Sign in' })).getAttribute(
        'href',
      ),
    ).toBe('/sign-in');
    cleanup();
    routes[path] = [
      { status: 503, body: { error: {} } },
      { status: 200, body: page(1) },
    ];
    show(route);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Assignment 0')).toBeTruthy();
  });

  it('keeps keyboard focus on the heading when Try again fails or succeeds', async () => {
    routes[path] = [
      { status: 503, body: { error: {} } },
      { status: 503, body: { error: {} } },
      { status: 200, body: page(1) },
    ];
    show(route);
    const heading = await screen.findByRole('heading', { level: 1 });
    for (const outcome of ['failed', 'succeeded']) {
      const retry = await screen.findByRole('button', { name: 'Try again' });
      retry.focus();
      fireEvent.click(retry);
      expect(document.activeElement, outcome).toBe(heading);
      if (outcome === 'succeeded')
        expect(await screen.findByText('Assignment 0')).toBeTruthy();
      else await screen.findByRole('button', { name: 'Try again' });
      expect(document.activeElement, outcome).toBe(heading);
      expect(document.activeElement).not.toBe(document.body);
    }
  });

  it('reflects a new publication when the list is refreshed', async () => {
    routes[path] = [{ status: 200, body: page(1) }];
    show(route);
    expect(await screen.findByText('Assignment 0')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Refresh list' }).getAttribute('href'),
    ).toBe('/student/courses/course-a/assignments');
    cleanup();
    routes[path] = [{ status: 200, body: page(2) }];
    show(route);
    expect(await screen.findByText('Assignment 1')).toBeTruthy();
  });

  it('ignores a slower superseded response', async () => {
    let releaseFirst!: (reply: Reply) => void;
    routes[path] = [
      () => new Promise<Reply>((resolve) => (releaseFirst = resolve)),
      { status: 200, body: page(1) },
    ];
    show(route);
    await waitFor(() => expect(releaseFirst).toBeTypeOf('function'));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(await screen.findByText('Assignment 0')).toBeTruthy();
    await act(async () => {
      releaseFirst({ status: 200, body: page(3) });
      await Promise.resolve();
    });
    expect(screen.queryByText('Assignment 2')).toBeNull();
  });

  it('rejects a response for a different course', async () => {
    routes[path] = [
      {
        status: 200,
        body: { ...page(1), course: { id: 'course-b', name: 'Other' } },
      },
    ];
    show(route);
    expect(
      await screen.findByText('This is not available to you.', {
        selector: 'p:not([role])',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('Assignment 0')).toBeNull();
  });
});

describe('student overview', () => {
  const path = '/api/student/publications/alpha-v1';

  it('keeps the exact version on reload and links back to its course', async () => {
    routes[path] = [
      { status: 200, body: publication('alpha-v1', 'Alpha one') },
    ];
    for (let load = 0; load < 2; load++) {
      show({ kind: 'overview', versionId: 'alpha-v1' });
      expect(
        (await screen.findByRole('heading', { level: 1 })).textContent,
      ).toBe('Alpha one');
      expect(screen.getByText('(alpha-v1)')).toBeTruthy();
      expect(
        screen
          .getByRole('link', { name: /Back to assignments/ })
          .getAttribute('href'),
      ).toBe('/student/courses/course-a/assignments');
      expect(document.querySelector('textarea, input[type=text]')).toBeNull();
      expect(
        screen.queryByRole('button', { name: /submit|run|save/i }),
      ).toBeNull();
      cleanup();
    }
    expect(calls.filter((c) => c === path)).toHaveLength(2);
  });

  it('never substitutes another version', async () => {
    routes[path] = [
      { status: 200, body: publication('alpha-v2', 'Alpha two') },
    ];
    show({ kind: 'overview', versionId: 'alpha-v1' });
    expect(
      await screen.findByText('This is not available to you.', {
        selector: 'p:not([role])',
      }),
    ).toBeTruthy();
    expect(screen.queryByText('Alpha two')).toBeNull();
  });

  it('shows unavailable for malformed direct links without requesting data', async () => {
    show(parseStudentRoute('/student/assignments/bad%2Fid', ''));
    expect(
      await screen.findByText('This is not available to you.', {
        selector: 'p:not([role])',
      }),
    ).toBeTruthy();
    expect(calls.some((c) => c.startsWith('/api/student/'))).toBe(false);
  });

  it('re-authorizes when restored from the back/forward cache', async () => {
    routes[path] = [
      { status: 200, body: publication('alpha-v1', 'Alpha one') },
      { status: 404, body: { error: {} } },
    ];
    show({ kind: 'overview', versionId: 'alpha-v1' });
    expect(await screen.findByText('Alpha one')).toBeTruthy();
    act(() => {
      const event = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(event, 'persisted', { value: true });
      window.dispatchEvent(event);
    });
    await waitFor(() => expect(screen.queryByText('Alpha one')).toBeNull());
  });

  it('writes nothing to browser storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    routes[path] = [
      { status: 200, body: publication('alpha-v1', 'Alpha one') },
    ];
    show({ kind: 'overview', versionId: 'alpha-v1' });
    expect(await screen.findByText('Alpha one')).toBeTruthy();
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('/workspace entry choice', () => {
  it('keeps Instructor-first fallback and honours only valid preferences', () => {
    expect(chooseWorkspace(null, ['student'])).toBe('student');
    expect(chooseWorkspace(null, ['student', 'instructor'])).toBe('instructor');
    // First-admin Instructor eligible to create courses but with zero courses.
    expect(chooseWorkspace(null, ['instructor'])).toBe('instructor');
    expect(chooseWorkspace(null, [])).toBe('instructor');
    expect(chooseWorkspace('student', [])).toBe('student');
    expect(chooseWorkspace('admin', ['student'])).toBe('instructor');
  });
});

describe('leaving unsaved instructor work', () => {
  it('keeps the Instructor role and makes no Student request when the prompt is cancelled', async () => {
    const beforeLeave = vi.fn(() => false);
    render(createElement(WorkspaceSwitch, { role: 'instructor', beforeLeave }));
    const student = await screen.findByRole('radio', { name: 'Student' });
    const before = calls.length;
    fireEvent.click(student);
    expect(beforeLeave).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole('radio', { name: 'Instructor' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(calls.length).toBe(before);
    expect(calls.some((c) => c.startsWith('/api/student/'))).toBe(false);
  });
});
