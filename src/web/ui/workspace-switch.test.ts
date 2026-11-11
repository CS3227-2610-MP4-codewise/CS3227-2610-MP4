// @vitest-environment jsdom
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorkspaceSwitch, workspaceNavigation } from './workspace-switch';

// AUTH-01–03, COU-06/07, UI-02/03/07/08: synthetic transport, actual shared CSS.
const contexts = (roles = ['student', 'instructor']) => ({
  workspaces: roles.map((role) => ({ role, courses: [], nextCursor: null })),
});
const account = {
  session: {
    schemaVersion: 1 as const,
    userId: 'user-a',
    expiresAt: '2099-01-01T00:00:00.000Z',
  },
  email: 'synthetic@u.nus.edu',
  administrator: false,
  csrfToken: 'csrf',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
let respond: (path: string) => Promise<Response>;
let sessionResponse: () => Promise<Response>;
let calls: string[];
let style: HTMLStyleElement;
beforeEach(() => {
  calls = [];
  sessionResponse = async () => json(account);
  respond = async (path) =>
    json(
      path.endsWith('/session')
        ? account
        : path.endsWith('/contexts')
          ? contexts()
          : path.endsWith('/verify')
            ? { courses: [{ id: 'course-a', name: 'A' }] }
            : { course: { id: 'course-a', name: 'A' } },
    );
  vi.stubGlobal(
    'fetch',
    vi.fn((path: string) => {
      calls.push(path);
      return path === '/api/auth/session' ? sessionResponse() : respond(path);
    }),
  );
  vi.spyOn(workspaceNavigation, 'open').mockImplementation(() => {});
  style = document.createElement('style');
  style.textContent = readFileSync('src/web/styles.css', 'utf8');
  document.head.appendChild(style);
});
afterEach(() => {
  cleanup();
  style.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function show(
  props: Parameters<typeof WorkspaceSwitch>[0] = { role: 'instructor' },
  assessment = false,
) {
  return render(
    createElement(
      'div',
      { className: assessment ? 'assessment-app' : 'cw-shell' },
      createElement(
        'header',
        { className: assessment ? 'assessment-top' : 'cw-header' },
        createElement(WorkspaceSwitch, props),
      ),
      createElement(
        'main',
        { 'data-testid': 'protected' },
        createElement('h1', null, 'Private title'),
        'Private source',
      ),
    ),
  );
}
const control = async () => {
  const input = (await screen.findByRole('switch', {
    name: 'Instructor workspace',
  })) as HTMLInputElement;
  await waitFor(() => expect(input.disabled).toBe(false));
  return input;
};
const focus = () =>
  act(() => {
    window.dispatchEvent(new Event('focus'));
  });
const hidden = () =>
  expect(getComputedStyle(screen.getByTestId('protected')).display).toBe(
    'none',
  );
const visible = () =>
  expect(getComputedStyle(screen.getByTestId('protected')).display).not.toBe(
    'none',
  );
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

it.each(['student', 'instructor'] as const)(
  'uses one native switch with checked state bound to %s, not optimistic navigation',
  async (role) => {
    show({ role });
    const input = await control();
    expect(input.type).toBe('checkbox');
    expect(input.checked).toBe(role === 'instructor');
    expect(screen.queryByRole('radio')).toBeNull();
    fireEvent.click(input);
    fireEvent.click(input);
    await waitFor(() =>
      expect(workspaceNavigation.open).toHaveBeenCalledWith(
        role === 'student' ? 'instructor' : 'student',
      ),
    );
    expect(input.checked).toBe(role === 'instructor');
    expect(input.disabled).toBe(false);
    expect(workspaceNavigation.open).toHaveBeenCalledTimes(1);
  },
);

it('retains the native Space contract and cancels a dirty departure before requests', async () => {
  const beforeLeave = vi.fn(() => false);
  show({ role: 'instructor', beforeLeave });
  const input = await control(),
    count = calls.length;
  input.focus();
  expect(document.activeElement).toBe(input);
  // jsdom does not synthesize a checkbox's native Space activation. Click exercises
  // the same native change event; real key activation remains a browser/manual check.
  fireEvent.click(input);
  expect(beforeLeave).toHaveBeenCalledOnce();
  expect(input.checked).toBe(true);
  expect(calls).toHaveLength(count);
  expect(workspaceNavigation.open).not.toHaveBeenCalled();
  visible();
});

it('omits the switch when only the current role is authorized', async () => {
  respond = async () => json(contexts(['student']));
  show({ role: 'student' });
  await screen.findByText('Student');
  expect(screen.queryByRole('switch')).toBeNull();
  visible();
});

it.each([
  '/api/courses/contexts',
  '/api/courses/course-a',
  '/api/courses/contexts/verify',
])('provides visible session recovery for 401 from %s', async (path) => {
  show({
    role: 'instructor',
    courseId: 'course-a',
    courses: [{ id: 'course-a' }],
    csrf: 'csrf',
  });
  await control();
  const original = respond;
  respond = async (request) =>
    request === path ? json({}, 401) : original(request);
  focus();
  const heading = await screen.findByRole('heading', {
    name: 'Sign in to continue',
  });
  expect(getComputedStyle(heading).display).not.toBe('none');
  expect(document.activeElement).toBe(heading);
  expect(
    screen.getByRole('link', { name: 'Sign in' }).getAttribute('href'),
  ).toBe('/sign-in');
  expect(screen.queryByText(/no longer available/)).toBeNull();
  hidden();
});

it('keeps Sign in recovery on later network failures and never unmasks stale content after a successful focus refresh', async () => {
  show();
  await control();
  respond = async () => json({}, 401);
  focus();
  await screen.findByRole('link', { name: 'Sign in' });
  respond = async () => {
    throw new TypeError('offline');
  };
  focus();
  await waitFor(() =>
    expect(document.querySelector('main[aria-busy="false"]')).toBeTruthy(),
  );
  expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
  respond = async () => json(contexts());
  focus();
  await waitFor(() =>
    expect(document.querySelector('main[aria-busy="false"]')).toBeTruthy(),
  );
  hidden();
  expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
});

it.each(['network', 'malformed', 'provider'] as const)(
  'withholds content on %s failure without claiming role revocation',
  async (kind) => {
    show();
    await control();
    respond = async () => {
      if (kind === 'network') throw new TypeError('offline');
      return json(
        kind === 'malformed' ? { workspaces: 'wrong' } : {},
        kind === 'provider' ? 503 : 200,
      );
    };
    focus();
    await screen.findByRole('link', { name: 'Reload workspace' });
    expect(screen.queryByText(/no longer available/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
    hidden();
    respond = async () => json(contexts());
    focus();
    await waitFor(() =>
      expect(document.querySelector('main[aria-busy="false"]')).toBeTruthy(),
    );
    hidden(); // Reload must fetch the account and private data, not just contexts.
  },
);

it('distinguishes genuine role removal from selected-course denial', async () => {
  show();
  await control();
  respond = async () => json(contexts(['student']));
  focus();
  await screen.findByText(/This workspace is no longer available/);
  expect(
    screen.getByRole('button', { name: 'Open Student workspace' }),
  ).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  hidden();
});

it.each([403, 404])(
  'keeps recovery outside assessment content on a %s course denial',
  async (status) => {
    show({ role: 'instructor', courseId: 'course-a' }, true);
    await control();
    respond = async (path) =>
      path.endsWith('/contexts') ? json(contexts()) : json({}, status);
    focus();
    await screen.findByRole('heading', { name: 'Course unavailable' });
    expect(
      screen.queryByText(/This workspace is no longer available/),
    ).toBeNull();
    hidden();
  },
);

it('rejects a removed target without navigation, while the current authorized page remains usable', async () => {
  show();
  const input = await control();
  respond = async () => json(contexts(['instructor']));
  fireEvent.click(input);
  await screen.findByText('That workspace is no longer available.');
  expect(workspaceNavigation.open).not.toHaveBeenCalled();
  visible();
});

it('ignores an older refresh failure after a newer successful refresh', async () => {
  show();
  await control();
  const old = deferred();
  respond = () => old.promise;
  focus();
  respond = async () => json(contexts());
  focus();
  await control();
  await act(async () => {
    old.resolve(json({}, 401));
  });
  expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  visible();
});

it('ignores selection responses after unmount and removes its shell guard', async () => {
  const view = show();
  const input = await control(),
    result = deferred();
  respond = () => result.promise;
  fireEvent.click(input);
  const shell = document.querySelector('.cw-shell') as HTMLElement;
  view.unmount();
  await act(async () => {
    result.resolve(json(contexts()));
  });
  expect(workspaceNavigation.open).not.toHaveBeenCalled();
  expect(shell.dataset.workspaceAccess).toBeUndefined();
});

it('revalidates a restored bfcache page', async () => {
  show();
  await control();
  respond = async () => json({}, 401);
  const event = new Event('pageshow');
  Object.defineProperty(event, 'persisted', { value: true });
  act(() => {
    window.dispatchEvent(event);
  });
  await screen.findByRole('link', { name: 'Sign in' });
  hidden();
});

it('does not restart validation when a parent supplies an equivalent course array', async () => {
  const props = {
    role: 'instructor' as const,
    courses: [{ id: 'course-a' }],
    csrf: 'csrf',
  };
  const view = render(createElement(WorkspaceSwitch, props));
  await control();
  const count = calls.length;
  view.rerender(
    createElement(WorkspaceSwitch, { ...props, courses: [{ id: 'course-a' }] }),
  );
  await act(async () => {});
  expect(calls).toHaveLength(count);
});

it.each(['refresh', 'selection'])(
  'withholds an old account page when the cookie changes during %s',
  async (operation) => {
    show({ role: 'instructor', account });
    const input = await control();
    sessionResponse = async () =>
      json({
        ...account,
        session: { ...account.session, userId: 'user-b' },
        csrfToken: 'other-session',
      });
    if (operation === 'refresh') focus();
    else fireEvent.click(input);
    await screen.findByRole('heading', { name: 'Sign in to continue' });
    expect(workspaceNavigation.open).not.toHaveBeenCalled();
    hidden();
  },
);

it('rejects a first shell session that differs from the account which loaded the instructor page', async () => {
  sessionResponse = async () =>
    json({ ...account, session: { ...account.session, userId: 'user-b' } });
  show({ role: 'instructor', account });
  await screen.findByRole('heading', { name: 'Sign in to continue' });
  expect(screen.queryByRole('switch')).toBeNull();
  hidden();
});

it('detects a replacement session for the same user', async () => {
  show({ role: 'instructor', account });
  await control();
  sessionResponse = async () => json({ ...account, csrfToken: 'new-session' });
  focus();
  await screen.findByRole('link', { name: 'Sign in' });
  hidden();
});

it.each([403, 503])(
  'prioritizes a delayed 401 over an earlier %s course failure',
  async (status) => {
    show({ role: 'instructor', courseId: 'course-a' });
    await control();
    const later = deferred();
    respond = async (path) =>
      path.endsWith('/contexts') ? later.promise : json({}, status);
    focus();
    await act(async () => {
      later.resolve(json({}, 401));
    });
    await screen.findByRole('link', { name: 'Sign in' });
    hidden();
  },
);

it('provides session recovery when only the session read returns 401', async () => {
  show();
  await control();
  sessionResponse = async () => json({}, 401);
  focus();
  await screen.findByRole('link', { name: 'Sign in' });
  hidden();
});

it('restores a validated page and focus refresh after navigation does not leave the page', async () => {
  show();
  const input = await control();
  fireEvent.click(input);
  await waitFor(() => expect(workspaceNavigation.open).toHaveBeenCalledOnce());
  visible();
  expect(input.disabled).toBe(false);
  const count = calls.length;
  focus();
  await control();
  expect(calls.length).toBeGreaterThan(count);
  visible();
});
