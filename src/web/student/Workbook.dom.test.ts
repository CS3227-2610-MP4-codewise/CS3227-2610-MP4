// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any -- synthetic JSON request bodies in a test fake */
import { createHash } from 'node:crypto';
import { createElement } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Publication } from '../../shared/instructor-contracts/publication';
import { formatDeadline, parseStudentRoute } from './model';
import { StudentWorkspace } from './StudentWorkspace';
import { Workbook } from './Workbook';

/** SW-01–SW-08, UI-04/05/08: workbook DOM behaviour against a synthetic in-memory API. */
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const STARTER = 'def f():\n    pass\n';
const view = {
  session: {
    schemaVersion: 1,
    userId: 'user-1',
    expiresAt: '2026-12-10T00:00:00.000Z',
  },
  email: 'student@u.nus.edu',
  administrator: false,
  csrfToken: 'a'.repeat(64),
};
const publication = (version: string): Publication => ({
  schemaVersion: 1,
  assignmentId: 'alpha',
  assignmentVersionId: version,
  courseId: 'course-a',
  title: 'Synthetic assignment',
  publishedAt: '2026-11-01T12:00:00.000Z',
  deadlineAt: '2026-11-20T12:00:00.000Z',
  questions: [1, 2].map((n) => ({
    questionId: 'qid' + n,
    questionVersionId: `qv-${version}-${n}`,
    title: 'Question title ' + n,
    instructions: 'Instructions ' + n,
    language: 'python' as const,
    starterCode: STARTER,
    rubricId: 'r' + n,
    rubricVersionId: `rv-${version}-${n}`,
    criteria: [
      {
        criterionId: 'c1',
        comparisonKey: 'k1',
        descriptor: 'Works',
        minimumScore: 0,
        maximumScore: 1,
      },
    ],
  })),
});

type Reply = { status: number; body?: unknown };
type Call = { key: string; body: any; headers: any };
type Draft = { revision: number; source: string };
let drafts: Map<string, Draft>;
let calls: Call[];
let attempts: any[];
let overrides: Record<
  string,
  (body: any) => Reply | Promise<Reply | undefined> | undefined
>;
let latest: string;
let deadlineAt: string;
const json = (r: Reply) =>
  new Response(JSON.stringify(r.body ?? {}), { status: r.status });
const conflictBody = (code: string, current?: object) => ({
  ...(current ? { schemaVersion: 1 } : {}),
  error: { code, message: 'x', requestId: 'req-1' },
  ...(current ? { current } : {}),
});
const draftOf = (qv: string): Draft =>
  drafts.get(qv) ?? { revision: 0, source: STARTER };
const workBody = (version: string) => ({
  schemaVersion: 1,
  assignmentId: 'alpha',
  assignmentVersionId: version,
  latestAssignmentVersionId: latest,
  deadlineAt,
  attemptCount: attempts.length,
  questions: [1, 2].map((n) => {
    const qv = `qv-${version}-${n}`;
    const d = draftOf(qv);
    return {
      questionVersionId: qv,
      position: n - 1,
      revision: d.revision,
      source: d.source,
      sourceHash: sha(d.source),
      updatedAt: d.revision ? '2026-11-10T00:00:00.000Z' : null,
    };
  }),
});
const attemptBody = (a: any) => ({
  schemaVersion: 1,
  attemptId: a.attemptId,
  assignmentVersionId: a.version,
  courseId: 'course-a',
  submittedByUserId: 'user-1',
  submittedAt: a.submittedAt,
  answers: a.answers.map((x: any, i: number) => ({
    submittedAnswerId: `${a.attemptId}-a${i}`,
    questionVersionId: x.questionVersionId,
    rubricVersionId: x.questionVersionId.replace('qv', 'rv'),
    draftRevision: x.draftRevision,
    source: x.source,
    sourceHash: sha(x.source),
  })),
});

function route(method: string, path: string, body: any): Reply {
  if (method === 'GET' && path === '/api/auth/session')
    return { status: 200, body: view };
  const pubs = /^\/api\/student\/publications\/(v\d)(\/work)?$/.exec(path);
  if (method === 'GET' && pubs)
    return {
      status: 200,
      body: pubs[2] ? workBody(pubs[1]) : publication(pubs[1]),
    };
  const put = /^\/api\/student\/drafts\/(.+)$/.exec(path);
  if (method === 'PUT' && put) {
    const qv = decodeURIComponent(put[1]);
    const cur = draftOf(qv);
    if (body.baseRevision !== cur.revision)
      return {
        status: 409,
        body: conflictBody('CONFLICT_REVISION', {
          revision: cur.revision,
          source: cur.source,
          sourceHash: sha(cur.source),
        }),
      };
    drafts.set(qv, { revision: cur.revision + 1, source: body.source });
    return {
      status: 200,
      body: {
        schemaVersion: 1,
        revision: cur.revision + 1,
        sourceHash: sha(body.source),
        savedAt: '2026-11-10T01:00:00.000Z',
      },
    };
  }
  const move = /^\/api\/student\/publications\/(v\d)\/drafts\/move$/.exec(path);
  if (method === 'POST' && move) {
    const from = draftOf(body.questionVersionId);
    const targetNow = draftOf(body.targetQuestionVersionId);
    if (body.targetBaseRevision !== targetNow.revision)
      return {
        status: 409,
        body: conflictBody('CONFLICT_REVISION', {
          revision: targetNow.revision,
          source: targetNow.source,
          sourceHash: sha(targetNow.source),
        }),
      };
    drafts.set(body.targetQuestionVersionId, {
      revision: body.targetBaseRevision + 1,
      source: from.source,
    });
    return {
      status: 200,
      body: {
        schemaVersion: 1,
        revision: body.targetBaseRevision + 1,
        sourceHash: sha(from.source),
        savedAt: '2026-11-10T01:00:00.000Z',
      },
    };
  }
  const atts = /^\/api\/student\/publications\/(v\d)\/attempts$/.exec(path);
  if (method === 'POST' && atts) {
    const a = {
      attemptId: 'attempt-' + (attempts.length + 1),
      version: atts[1],
      submittedAt: '2026-11-10T02:00:00.000Z',
      answers: body.answers.map((x: any) => ({
        ...x,
        source: draftOf(x.questionVersionId).source,
      })),
    };
    attempts.unshift(a);
    return {
      status: 201,
      body: {
        schemaVersion: 1,
        attemptId: a.attemptId,
        assignmentVersionId: a.version,
        submittedAt: a.submittedAt,
        replayed: false,
      },
    };
  }
  if (method === 'GET' && atts)
    return {
      status: 200,
      body: {
        schemaVersion: 1,
        items: attempts.map((a) => ({
          attemptId: a.attemptId,
          assignmentVersionId: a.version,
          submittedAt: a.submittedAt,
          answerCount: a.answers.length,
          feedbackReleased: false,
        })),
        nextCursor: null,
      },
    };
  if (
    method === 'GET' &&
    /^\/api\/student\/attempts\/[^/]+\/feedback$/.test(path)
  )
    return { status: 200, body: { schemaVersion: 1, state: 'none' } };
  const att = /^\/api\/student\/attempts\/(.+)$/.exec(path);
  if (method === 'GET' && att) {
    const a = attempts.find((x) => x.attemptId === att[1]);
    return a ? { status: 200, body: attemptBody(a) } : { status: 404 };
  }
  return { status: 404 };
}

const putCalls = () => calls.filter((c) => c.key.startsWith('PUT '));
const postAttempts = () =>
  calls.filter((c) => /^POST .*\/attempts$/.test(c.key));

beforeEach(() => {
  drafts = new Map();
  calls = [];
  attempts = [];
  overrides = {};
  latest = 'v1';
  deadlineAt = '2099-01-01T00:00:00.000Z';
  window.sessionStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      const key = `${method} ${input}`;
      calls.push({ key, body, headers: init?.headers });
      const hit = overrides[key];
      if (hit) {
        const r = await hit(body);
        if (r) return json(r);
      }
      return json(route(method, input, body));
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const open = async (position = 1, version = 'v1') => {
  render(
    createElement(Workbook, {
      route: { kind: 'work', versionId: version, position },
    }),
  );
  const box = (await screen.findByRole('textbox', {
    name: new RegExp(`Python answer for question ${position}`),
  })) as HTMLTextAreaElement;
  // Let passive effects (the store subscription) run before the test interacts.
  await act(async () => undefined);
  return box;
};
const editor = (n = 1) =>
  screen.getByRole('textbox', {
    name: new RegExp(`Python answer for question ${n}`),
  }) as HTMLTextAreaElement;
const type = (value: string, n = 1) =>
  fireEvent.change(editor(n), { target: { value } });
const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
const click = (name: string | RegExp, role = 'button') =>
  fireEvent.click(screen.getByRole(role, { name }));

describe('route, entry and states (UI-08)', () => {
  it('shows the question, a labelled editor and Python highlight with line numbers', async () => {
    const ta = await open();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Question title 1' }),
    ).toBeTruthy();
    expect(screen.getByText('Instructions 1')).toBeTruthy();
    // DR-02: only the bracketed maximum, never the range.
    expect(screen.getByText('(1 point)')).toBeTruthy();
    expect(document.body.textContent).not.toContain('0–1');
    expect(ta.value).toBe(STARTER);
    expect(
      document.querySelector('.cw-editor-layer .token.keyword')?.textContent,
    ).toBe('def');
    expect(document.querySelector('.cw-editor-gutter')?.textContent).toBe(
      '1\n2\n3',
    );
    expect(screen.getByText(/^Starter code\. Not saved yet\.$/)).toBeTruthy();
    type('a = 1\nb = 2\nc = 3\nd = 4');
    expect(document.querySelector('.cw-editor-gutter')?.textContent).toBe(
      '1\n2\n3\n4',
    );
  });

  it('is reachable from the overview Open action and renders no run or AI controls', async () => {
    const ta = await open();
    expect(ta).toBeTruthy();
    for (const word of [/^run/i, /execute/i, /\bai\b/i, /assistant/i])
      expect(screen.queryByRole('button', { name: word })).toBeNull();
  });

  it('shows loading, then denied, expired and network states', async () => {
    overrides['GET /api/student/publications/v1/work'] = () => ({
      status: 404,
    });
    render(
      createElement(Workbook, {
        route: { kind: 'work', versionId: 'v1', position: 1 },
      }),
    );
    expect(screen.getByText('Loading your work…')).toBeTruthy();
    expect(
      await screen.findByText('This is not available to you.'),
    ).toBeTruthy();
    cleanup();
    overrides['GET /api/student/publications/v1/work'] = () => ({
      status: 401,
    });
    render(
      createElement(Workbook, {
        route: { kind: 'work', versionId: 'v1', position: 1 },
      }),
    );
    expect(await screen.findByText(/session has ended/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
    cleanup();
    overrides['GET /api/student/publications/v1/work'] = () => ({
      status: 503,
    });
    render(
      createElement(Workbook, {
        route: { kind: 'work', versionId: 'v1', position: 1 },
      }),
    );
    expect(await screen.findByText(/could not be loaded/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('is lazy-loaded from StudentWorkspace on the workbook route', async () => {
    render(
      createElement(StudentWorkspace, {
        route: { kind: 'work', versionId: 'v1', position: 2 },
      }),
    );
    expect(
      await screen.findByRole('textbox', {
        name: /Python answer for question 2/,
      }),
    ).toBeTruthy();
  });
});

describe('editor semantics (keyboard, selection, IME, scroll)', () => {
  it('exposes a labelled textbox; the overlay and gutter are hidden from assistive technology', async () => {
    const ta = await open();
    expect(ta.getAttribute('aria-label')).toBe(
      'Python answer for question 1: Question title 1',
    );
    expect(
      document.querySelector('.cw-editor-layer')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(
      document.querySelector('.cw-editor-gutter')?.getAttribute('aria-hidden'),
    ).toBe('true');
    const described = ta.getAttribute('aria-describedby')!.split(' ');
    expect(described.every((id) => document.getElementById(id))).toBe(true);
    expect(document.getElementById(described[0])!.textContent).toMatch(
      /Esc, then Tab/,
    );
    expect(document.getElementById(described[1])!.textContent).toMatch(
      /Starter code/,
    );
  });

  it('Esc leaves the editor to a focus target after it, so Tab is not trapped', async () => {
    const ta = await open();
    ta.focus();
    expect(document.activeElement).toBe(ta);
    fireEvent.keyDown(ta, { key: 'Escape' });
    expect(document.activeElement).not.toBe(ta);
    expect(document.activeElement?.className).toBe('cw-editor-exit');
    expect(document.activeElement?.textContent).toMatch(/Left the code editor/);
    // The exit target sits after the textarea in DOM order, so the next Tab moves forward.
    expect(
      ta.compareDocumentPosition(document.activeElement!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('Tab indents four spaces and is cancelled; Shift+Tab outdents', async () => {
    const ta = await open();
    ta.focus();
    type('x = 1');
    ta.setSelectionRange(0, 0);
    expect(fireEvent.keyDown(ta, { key: 'Tab' })).toBe(false);
    expect(editor().value).toBe('    x = 1');
    editor().setSelectionRange(0, 8);
    fireEvent.keyDown(editor(), { key: 'Tab', shiftKey: true });
    expect(editor().value).toBe('x = 1');
  });

  it('ignores Esc and Tab while an IME composition is open', async () => {
    const ta = await open();
    ta.focus();
    fireEvent.keyDown(ta, { key: 'Escape', isComposing: true });
    fireEvent.keyDown(ta, { key: 'Escape', keyCode: 229 });
    expect(document.activeElement).toBe(ta);
    expect(fireEvent.keyDown(ta, { key: 'Tab', isComposing: true })).toBe(true);
    expect(editor().value).toBe(STARTER);
    // Composition updates arrive as ordinary change events and keep the caret/selection in the textarea.
    fireEvent.compositionStart(ta);
    type('こんにちは');
    fireEvent.compositionEnd(ta);
    expect(editor().value).toBe('こんにちは');
  });

  it('keeps the highlight layer and gutter in step with the textarea scroll', async () => {
    const ta = await open();
    const layer = document.querySelector('.cw-editor-layer') as HTMLElement;
    const gutter = document.querySelector('.cw-editor-gutter') as HTMLElement;
    ta.scrollTop = 48;
    ta.scrollLeft = 12;
    fireEvent.scroll(ta);
    expect(layer.scrollTop).toBe(48);
    expect(layer.scrollLeft).toBe(12);
    expect(gutter.scrollTop).toBe(48);
  });
});

describe('save flow in the workbook (SW-03/04, task 5.1)', () => {
  it('saves 1.5 s after typing stops and shows Saved only after acknowledgement', async () => {
    await open();
    vi.useFakeTimers();
    type('x = 1\n');
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
    await tick(1499);
    expect(putCalls()).toHaveLength(0);
    await tick(1);
    expect(putCalls()).toHaveLength(1);
    expect(putCalls()[0].body).toEqual({
      schemaVersion: 1,
      baseRevision: 0,
      source: 'x = 1\n',
    });
    expect(putCalls()[0].headers['X-CSRF-Token']).toBe(view.csrfToken);
    expect(screen.getByText('Saved. Revision 1.')).toBeTruthy();
    expect(window.sessionStorage.length).toBe(0); // backup cleared by the acknowledgement
  });

  it('shows not saved with a retry on network failure, keeps the text, then recovers', async () => {
    await open();
    vi.useFakeTimers();
    overrides['PUT /api/student/drafts/qv-v1-1'] = () => ({ status: 503 });
    type('keep this\n');
    await tick(1500);
    expect(screen.getByText('Not saved. Connection problem.')).toBeTruthy();
    expect(screen.queryByText(/^Saved\./)).toBeNull();
    expect(editor().value).toBe('keep this\n');
    expect(window.sessionStorage.length).toBe(1);
    delete overrides['PUT /api/student/drafts/qv-v1-1'];
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await tick(0);
    expect(screen.getByText('Saved. Revision 1.')).toBeTruthy();
  });

  it('keeps per-question state across Previous and Next', async () => {
    await open();
    vi.useFakeTimers();
    overrides['PUT /api/student/drafts/qv-v1-1'] = () => ({ status: 503 });
    type('first answer\n');
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    await tick(0);
    // A failed save offers a choice; text is never discarded.
    expect(screen.getByRole('alert').textContent).toMatch(
      /Question 1 is not saved/,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue without saving' }),
    );
    await tick(0);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Question title 2' }),
    ).toBeTruthy();
    expect(document.activeElement?.textContent).toBe('Question title 2');
    expect(window.location.pathname).toBe('/student/assignments/v1/work/2');
    type('second answer\n', 2);
    delete overrides['PUT /api/student/drafts/qv-v1-1'];
    fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
    await tick(0);
    expect(editor(1).value).toBe('first answer\n');
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    await tick(0);
    expect(editor(2).value).toBe('second answer\n');
  });

  it('saves before moving and does not label the other question saved', async () => {
    await open();
    vi.useFakeTimers();
    type('answer one\n');
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    await tick(0);
    expect(putCalls().map((c) => c.key)).toEqual([
      'PUT /api/student/drafts/qv-v1-1',
    ]);
    expect(editor(2).value).toBe(STARTER);
    expect(screen.getByText('Starter code. Not saved yet.')).toBeTruthy();
  });

  it('clears the backup when the session ends (401) and says so', async () => {
    await open();
    vi.useFakeTimers();
    overrides['PUT /api/student/drafts/qv-v1-1'] = () => ({ status: 401 });
    type('draft\n');
    expect(window.sessionStorage.length).toBe(1);
    await tick(1500);
    expect(window.sessionStorage.length).toBe(0);
    expect(screen.getAllByText(/session has ended/i).length).toBeGreaterThan(0);
    expect(editor().value).toBe('draft\n');
  });

  it('clears backups on sign-out', async () => {
    await open();
    type('draft\n');
    expect(window.sessionStorage.length).toBe(1);
    overrides['POST /api/auth/logout'] = () => ({ status: 200 });
    fireEvent.click(await screen.findByText(view.email));
    fireEvent.click(await screen.findByRole('button', { name: /sign out/i }));
    await waitFor(() => expect(window.sessionStorage.length).toBe(0));
  });

  it('clears backups when the account changes', async () => {
    await open();
    type('draft\n');
    expect(window.sessionStorage.length).toBe(1);
    const other = { ...view, session: { ...view.session, userId: 'user-2' } };
    overrides['GET /api/auth/session'] = () => ({ status: 200, body: other });
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(await screen.findByText('Account changed')).toBeTruthy();
    expect(window.sessionStorage.length).toBe(0);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

describe('conflict window and newer version (SW-02/04, task 5.2)', () => {
  const conflict = async () => {
    drafts.set('qv-v1-1', { revision: 3, source: 'base\n' });
    await open();
    vi.useFakeTimers();
    type('mine\nshared\n');
    drafts.set('qv-v1-1', { revision: 4, source: 'other tab\nshared\n' }); // another tab saved
    await tick(1500);
  };

  it('shows both copies read-only side by side with markers that do not depend on colour', async () => {
    await conflict();
    expect(screen.getByRole('heading', { name: 'Save conflict' })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull(); // read-only: no editable control
    const table = screen.getByRole('table');
    expect(
      within(table).getByRole('columnheader', {
        name: 'My version (this tab)',
      }),
    ).toBeTruthy();
    expect(
      within(table).getByRole('columnheader', {
        name: /Saved version \(revision 4\)/,
      }),
    ).toBeTruthy();
    const changed = table.querySelector('tr[data-kind="changed"]')!;
    expect(changed.textContent).toContain('≠');
    expect(changed.textContent).toContain('Changed line');
    expect(changed.textContent).toContain('mine');
    expect(changed.textContent).toContain('other tab');
    expect(
      table.querySelector('tr[data-kind="same"]')!.textContent,
    ).not.toContain('≠');
    expect(screen.getByText('Conflict. Choose a version.')).toBeTruthy();
  });

  it('Keep my version saves on top of the server revision after the copy offer', async () => {
    await conflict();
    click('Keep my version');
    expect(screen.getByText(/Copy the saved version first/)).toBeTruthy();
    expect(putCalls()).toHaveLength(1); // nothing sent before confirming
    click('Keep mine and discard saved');
    await tick(0);
    expect(putCalls()).toHaveLength(2);
    expect(putCalls()[1].body).toEqual({
      schemaVersion: 1,
      baseRevision: 4,
      source: 'mine\nshared\n',
    });
    expect(screen.getByText('Saved. Revision 5.')).toBeTruthy();
    expect(drafts.get('qv-v1-1')!.source).toBe('mine\nshared\n');
    expect(editor().value).toBe('mine\nshared\n');
  });

  it('Use saved version takes the server text and sends nothing', async () => {
    await conflict();
    click('Use saved version');
    expect(screen.getByText(/Copy the my version first/)).toBeTruthy();
    click('Use saved and discard mine');
    await tick(0);
    expect(putCalls()).toHaveLength(1);
    expect(editor().value).toBe('other tab\nshared\n');
    expect(screen.getByText('Saved. Revision 4.')).toBeTruthy();
  });

  it('keeps keyboard focus on a logical control through the conflict choice (UI-07/UI-08)', async () => {
    await conflict();
    click('Keep my version');
    const group = screen.getByRole('group', { name: 'Confirm choice' });
    expect(document.activeElement).toBe(group);
    expect(group.getAttribute('aria-describedby')).toBeTruthy();
    click('Back');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Keep my version' }),
    );
    click('Use saved version');
    click('Back');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Use saved version' }),
    );
    click('Use saved version');
    click('Use saved and discard mine');
    await tick(0);
    expect(document.activeElement).toBe(editor());
  });

  it('moves focus into the editor after keeping my version', async () => {
    await conflict();
    click('Keep my version');
    click('Keep mine and discard saved');
    await tick(0);
    expect(document.activeElement).toBe(editor());
  });

  it('copies the other version, or shows a visible fallback when the clipboard is denied', async () => {
    await conflict();
    click('Keep my version');
    // jsdom has no clipboard: denied.
    click('Copy other version');
    await tick(0);
    const fallback = screen.getByRole('alert');
    expect(fallback.textContent).toMatch(/clipboard is not available/);
    const box = within(fallback).getByRole('textbox', {
      name: /saved version, for manual copying/,
    }) as HTMLTextAreaElement;
    expect(box.value).toBe('other tab\nshared\n');
    expect(box.readOnly).toBe(true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    click('Copy other version');
    await tick(0);
    expect(writeText).toHaveBeenCalledWith('other tab\nshared\n');
    expect(screen.getByText(/Copied the saved version/)).toBeTruthy();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
  });

  it('on reload with an unsaved local copy prompts a choice and applies nothing silently', async () => {
    drafts.set('qv-v1-1', { revision: 2, source: 'server\n' });
    window.sessionStorage.setItem(
      'cw:draft:user-1:v1:qv-v1-1',
      JSON.stringify({ source: 'unsaved local\n', baseRevision: 2 }),
    );
    render(
      createElement(Workbook, {
        route: { kind: 'work', versionId: 'v1', position: 1 },
      }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Unsaved copy from before the reload',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText('Unsaved copy found. Choose a version.'),
    ).toBeTruthy();
    expect(putCalls()).toHaveLength(0);
    expect(screen.queryByRole('textbox')).toBeNull();
    click('Keep my version');
    click('Keep mine and discard saved');
    await waitFor(() => expect(putCalls()).toHaveLength(1));
    expect(putCalls()[0].body.baseRevision).toBe(2);
    expect(putCalls()[0].body.source).toBe('unsaved local\n');
  });

  it('shows the newer-version notice without replacing source, then moves only on explicit action', async () => {
    drafts.set('qv-v1-1', { revision: 2, source: 'my work\n' });
    latest = 'v2';
    const ta = await open();
    expect(ta.value).toBe('my work\n');
    expect(
      screen.getByText(/A newer version of this assignment has been published/),
    ).toBeTruthy();
    expect(
      calls.some((c) => c.key.startsWith('POST') && c.key.includes('/move')),
    ).toBe(false);
    click(/Move my work to the newer version/);
    expect(calls.some((c) => c.key.includes('/move'))).toBe(false); // confirmation first
    click('Move my saved answers');
    await waitFor(() =>
      expect(screen.getByText(/Moved 1 answer/)).toBeTruthy(),
    );
    const move = calls.find(
      (c) => c.key === 'POST /api/student/publications/v2/drafts/move',
    )!;
    expect(move.body).toEqual({
      schemaVersion: 1,
      questionVersionId: 'qv-v1-1',
      targetQuestionVersionId: 'qv-v2-1',
      targetBaseRevision: 0,
    });
    expect(drafts.get('qv-v1-1')).toEqual({ revision: 2, source: 'my work\n' }); // old draft untouched
    expect(
      screen
        .getByRole('link', { name: /Open the newer version/ })
        .getAttribute('href'),
    ).toBe('/student/assignments/v2/work/1');
    expect(editor().value).toBe('my work\n');
  });

  const seedNewer = () => {
    drafts.set('qv-v1-1', { revision: 2, source: 'my work\n' });
    drafts.set('qv-v2-1', { revision: 1, source: 'newer work\n' });
    latest = 'v2';
  };
  const moveCalls = () => calls.filter((c) => c.key.includes('/move'));

  it('asks before replacing work that already exists on the newer version, and replaces nothing unless ticked', async () => {
    seedNewer();
    await open();
    click(/Move my work to the newer version/);
    click('Move my saved answers');
    expect(
      await screen.findByRole('group', { name: 'Choose what to replace' }),
    ).toBeTruthy();
    expect(screen.getByText(/currently revision 1/)).toBeTruthy();
    expect(moveCalls()).toHaveLength(0);
    click('Move without replacing existing work');
    await waitFor(() =>
      expect(screen.getByText(/Moved 0 answers/)).toBeTruthy(),
    );
    expect(moveCalls()).toHaveLength(0);
    expect(drafts.get('qv-v2-1')!.source).toBe('newer work\n');
  });

  it('moves onto existing newer work only after an explicit tick, on top of its current revision', async () => {
    seedNewer();
    await open();
    click(/Move my work to the newer version/);
    click('Move my saved answers');
    fireEvent.click(
      await screen.findByRole('checkbox', { name: /Replace question 1/ }),
    );
    click('Move and replace 1 on the newer version');
    await waitFor(() =>
      expect(screen.getByText(/Moved 1 answer/)).toBeTruthy(),
    );
    expect(moveCalls()[0].body).toEqual({
      schemaVersion: 1,
      questionVersionId: 'qv-v1-1',
      targetQuestionVersionId: 'qv-v2-1',
      targetBaseRevision: 1,
    });
    expect(drafts.get('qv-v2-1')).toEqual({ revision: 2, source: 'my work\n' });
    expect(drafts.get('qv-v1-1')).toEqual({ revision: 2, source: 'my work\n' });
  });

  it('asks again when the newer version changed during the move (409)', async () => {
    seedNewer();
    await open();
    click(/Move my work to the newer version/);
    click('Move my saved answers');
    fireEvent.click(
      await screen.findByRole('checkbox', { name: /Replace question 1/ }),
    );
    drafts.set('qv-v2-1', { revision: 2, source: 'typed meanwhile\n' }); // changes after it was read
    click('Move and replace 1 on the newer version');
    expect(
      await screen.findByText(/newer version changed while moving/),
    ).toBeTruthy();
    expect(screen.getByText(/currently revision 2/)).toBeTruthy();
    expect(drafts.get('qv-v2-1')!.source).toBe('typed meanwhile\n'); // nothing overwritten
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Replace question 1/ }),
    );
    click('Move and replace 1 on the newer version');
    await waitFor(() =>
      expect(screen.getByText(/Moved 1 answer/)).toBeTruthy(),
    );
    expect(moveCalls().map((c) => c.body.targetBaseRevision)).toEqual([1, 2]);
    expect(drafts.get('qv-v2-1')).toEqual({ revision: 3, source: 'my work\n' });
  });

  it('offers to copy the newer text first, with a visible fallback when the clipboard is denied', async () => {
    seedNewer();
    await open();
    click(/Move my work to the newer version/);
    click('Move my saved answers');
    await screen.findByRole('group', { name: 'Choose what to replace' });
    click('Copy newer version of question 1');
    const box = (await screen.findByRole('textbox', {
      name: /Newer version of question 1, for manual copying/,
    })) as HTMLTextAreaElement;
    expect(box.value).toBe('newer work\n');
    expect(box.readOnly).toBe(true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    click('Copy newer version of question 1');
    await waitFor(() =>
      expect(
        screen.getByText(/Copied the newer version of question 1/),
      ).toBeTruthy(),
    );
    expect(writeText).toHaveBeenCalledWith('newer work\n');
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    expect(moveCalls()).toHaveLength(0);
  });
});

describe('review, submit, deadline and history (SW-05–SW-08, task 5.3)', () => {
  const toReview = async () => {
    drafts.set('qv-v1-1', { revision: 2, source: 'answer one\n' });
    await open();
    click('Next question');
    await screen.findByRole('textbox', { name: /question 2/ });
    click('Review assignment');
    return screen.findByRole('heading', { name: 'Review assignment' });
  };

  it('lists revisions, untouched questions and creates no attempt before confirmation', async () => {
    await toReview();
    const items = screen
      .getAllByRole('listitem')
      .filter((li) => li.getAttribute('data-state'));
    expect(items[0].textContent).toContain(
      'Revision 2 acknowledged by the server. Saved',
    );
    expect(items[1].textContent).toContain('Not saved yet (starter code)');
    click('Submit assignment…');
    expect(
      screen.getByRole('heading', { name: 'Confirm submission' }),
    ).toBeTruthy();
    expect(screen.getByText(/Question 1: revision 2 \(hash/)).toBeTruthy();
    expect(
      screen.getByText(/Question 2: saved first, then submitted/),
    ).toBeTruthy();
    expect(postAttempts()).toHaveLength(0);
    expect(attempts).toHaveLength(0);
  });

  it('saves untouched questions first, submits revisions >= 1 and shows success', async () => {
    await toReview();
    click('Submit assignment…');
    click('Confirm and submit');
    expect(
      await screen.findByRole('heading', { name: 'Assignment submitted' }),
    ).toBeTruthy();
    expect(putCalls().map((c) => c.key)).toEqual([
      'PUT /api/student/drafts/qv-v1-2',
    ]);
    const post = postAttempts()[0];
    expect(post.body.answers).toEqual([
      {
        questionVersionId: 'qv-v1-1',
        draftRevision: 2,
        sourceHash: sha('answer one\n'),
      },
      {
        questionVersionId: 'qv-v1-2',
        draftRevision: 1,
        sourceHash: sha(STARTER),
      },
    ]);
    expect(post.body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(post.body.schemaVersion).toBe(1);
  });

  it('a pending submit blocks a duplicate', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    overrides['POST /api/student/publications/v1/attempts'] = async () => {
      await gate;
      return undefined;
    };
    await toReview();
    click('Submit assignment…');
    const confirm = screen.getByRole('button', { name: 'Confirm and submit' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(postAttempts()).toHaveLength(1));
    expect(
      (
        screen.getByRole('button', {
          name: 'Confirm and submit',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Confirm and submit' })
        .getAttribute('aria-busy'),
    ).toBe('true');
    release();
    expect(
      await screen.findByRole('heading', { name: 'Assignment submitted' }),
    ).toBeTruthy();
    expect(postAttempts()).toHaveLength(1);
  });

  it('retries with the same idempotency key after a dropped response', async () => {
    let first = true;
    overrides['POST /api/student/publications/v1/attempts'] = () => {
      if (first) {
        first = false;
        return { status: 503 };
      }
      return undefined;
    };
    await toReview();
    click('Submit assignment…');
    click('Confirm and submit');
    expect(await screen.findByText(/could not be completed/)).toBeTruthy();
    click('Try again');
    expect(
      await screen.findByRole('heading', { name: 'Assignment submitted' }),
    ).toBeTruthy();
    const keys = postAttempts().map((c) => c.body.idempotencyKey);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('explains a submit rate limit (429) and retries with the same idempotency key (SW-11)', async () => {
    let first = true;
    overrides['POST /api/student/publications/v1/attempts'] = () => {
      if (first) {
        first = false;
        return { status: 429, body: conflictBody('RATE_LIMITED') };
      }
      return undefined;
    };
    await toReview();
    click('Submit assignment…');
    click('Confirm and submit');
    expect(
      await screen.findByText(
        /Too many submissions in the last minute\. Nothing new was submitted/,
      ),
    ).toBeTruthy();
    expect(attempts).toHaveLength(0);
    click('Try again');
    expect(
      await screen.findByRole('heading', { name: 'Assignment submitted' }),
    ).toBeTruthy();
    const keys = postAttempts().map((c) => c.body.idempotencyKey);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('prompts to reconcile when a confirmed draft changed (409), and shows the conflict', async () => {
    overrides['POST /api/student/publications/v1/attempts'] = () => ({
      status: 409,
      body: conflictBody('CONFLICT_REVISION'),
    });
    await toReview();
    click('Submit assignment…');
    drafts.set('qv-v1-1', { revision: 3, source: 'changed elsewhere\n' });
    click('Confirm and submit');
    expect(
      await screen.findByText(/A saved answer changed since you confirmed/),
    ).toBeTruthy();
    expect(attempts).toHaveLength(0);
    click('Reload my saved answers');
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('listitem')
          .find((li) => li.getAttribute('data-state') === 'conflict'),
      ).toBeTruthy(),
    );
    expect(
      screen.getAllByText(/Resolve the questions marked/).length,
    ).toBeGreaterThan(0);
    expect(
      (
        screen.getByRole('button', {
          name: 'Submit assignment…',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('prompts to move when the publication is stale at submit', async () => {
    overrides['POST /api/student/publications/v1/attempts'] = () => ({
      status: 409,
      body: conflictBody('STALE_PUBLICATION'),
    });
    await toReview();
    click('Submit assignment…');
    click('Confirm and submit');
    expect(
      await screen.findByText(
        /A newer version of this assignment was published/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Move my work to the newer version' }),
    ).toBeTruthy();
    expect(attempts).toHaveLength(0);
  });

  it('disables submit with an explanation when the version is already stale', async () => {
    latest = 'v2';
    await toReview();
    const submit = screen.getByRole('button', {
      name: 'Submit assignment…',
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(
      screen.getAllByText(/newer version of this assignment has been published/)
        .length,
    ).toBeGreaterThan(0);
  });

  it('after the deadline submit is disabled with an explanation and editing continues', async () => {
    deadlineAt = '2020-01-01T00:00:00.000Z';
    await open();
    expect(screen.getByText(/deadline has passed/)).toBeTruthy();
    vi.useFakeTimers();
    type('still editing\n');
    await tick(1500);
    expect(putCalls()).toHaveLength(1);
    expect(screen.getByText('Saved. Revision 1.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    await tick(0);
    fireEvent.click(screen.getByRole('button', { name: 'Review assignment' }));
    await tick(0);
    const submit = screen.getByRole('button', {
      name: 'Submit assignment…',
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(
      document.getElementById(submit.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toMatch(/deadline has passed/);
    expect(postAttempts()).toHaveLength(0);
  });

  it('shows an honest empty history in both historical views', async () => {
    await open();
    for (const tab of ['Submitted attempt', 'Released feedback']) {
      click(tab, 'tab');
      expect(
        await screen.findByText('You have not submitted this assignment yet.'),
      ).toBeTruthy();
      expect(screen.queryByLabelText('Attempt')).toBeNull();
      expect(screen.queryByText(/Feedback released/)).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Back to working copy' }),
      ).toBeTruthy();
    }
    click('Back to working copy');
    expect(
      screen
        .getByRole('tab', { name: 'Working copy' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(editor().value).toBe(STARTER);
  });
});

/** SQ-01–SQ-04, SQ-06, SW-08, UI-04/05/07: per-question answer views. */
describe('three answer views per question (student-question-views)', () => {
  const seedAttempt = (
    id: string,
    at: string,
    first: string,
    version = 'v1',
    count = 2,
  ) =>
    attempts.push({
      attemptId: id,
      version,
      submittedAt: at,
      answers: [1, 2].slice(0, count).map((n) => ({
        questionVersionId: `qv-${version}-${n}`,
        draftRevision: 1,
        source: n === 1 ? first : `second of ${id}\n`,
      })),
    });
  const tabSelected = (name: string) =>
    screen.getByRole('tab', { name }).getAttribute('aria-selected');
  const sourceOf = (n: number) =>
    screen.getByRole('region', {
      name: `Submitted source for question ${n}`,
    }).textContent;
  const feedbackCalls = () =>
    calls.filter((c) => /\/attempts\/[^/]+\/feedback$/.test(c.key));

  it('opens the latest attempt read-only for the current question and leaves the working copy unchanged', async () => {
    drafts.set('qv-v1-1', { revision: 2, source: 'edited later\n' });
    seedAttempt(
      'attempt-9',
      '2026-11-09T10:00:00.000Z',
      'original submitted\n',
    );
    await open();
    type('edited again\n');
    const puts = putCalls().length;
    click('Submitted attempt', 'tab');
    const panel = screen.getByRole('tabpanel', { name: 'Submitted attempt' });
    await within(panel).findByText(/original submitted/);
    expect(sourceOf(1)).not.toContain('edited');
    expect(within(panel).getByText('attempt-9')).toBeTruthy();
    expect(within(panel).getByText('v1')).toBeTruthy();
    expect(within(panel).queryByRole('textbox')).toBeNull();
    expect(panel.querySelector('textarea, input')).toBeNull();
    expect(
      within(panel).getByText(/This snapshot cannot be edited/),
    ).toBeTruthy();
    // The question pane still shows the same question.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Question title 1' }),
    ).toBeTruthy();
    click('Working copy', 'tab');
    expect(editor().value).toBe('edited again\n');
    expect(putCalls().length).toBe(puts);
    expect(postAttempts()).toHaveLength(0);
    expect(drafts.get('qv-v1-1')!.source).toBe('edited later\n');
  });

  it('operates the three views from the keyboard with synchronized state and panels', async () => {
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'one\n');
    await open();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Working copy',
      'Submitted attempt',
      'Released feedback',
    ]);
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabSelected('Submitted attempt')).toBe('true');
    expect(
      screen.getByRole('tabpanel', { name: 'Submitted attempt' }),
    ).toBeTruthy();
    expect(screen.queryByRole('tabpanel', { name: 'Working copy' })).toBeNull();
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(document.activeElement).toBe(tabs[2]);
    expect(tabSelected('Released feedback')).toBe('true');
    expect(
      screen.getByRole('tabpanel', { name: 'Released feedback' }),
    ).toBeTruthy();
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabSelected('Working copy')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Working copy' })).toBeTruthy();
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabSelected('Released feedback')).toBe('true');
  });

  it('keeps the editor mounted with its text and save state and sends nothing on a view switch', async () => {
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'one\n');
    await open();
    vi.useFakeTimers();
    type('typed\n');
    await tick(1500);
    expect(screen.getByText('Saved. Revision 1.')).toBeTruthy();
    const before = editor();
    const puts = putCalls().length;
    vi.useRealTimers();
    click('Submitted attempt', 'tab');
    await screen.findByText(/Submitted attempt \(read only\)/);
    // Hidden, not unmounted: the very same node keeps its text.
    expect(document.body.contains(before)).toBe(true);
    expect(before.value).toBe('typed\n');
    click('Released feedback', 'tab');
    await screen.findByText(/Feedback has not been released/);
    expect(document.body.contains(before)).toBe(true);
    click('Working copy', 'tab');
    expect(editor()).toBe(before);
    expect(before.value).toBe('typed\n');
    expect(screen.getByText('Saved. Revision 1.')).toBeTruthy();
    expect(putCalls()).toHaveLength(puts);
    expect(postAttempts()).toHaveLength(0);
  });

  it('defaults to the latest attempt, selects an earlier one and pages older attempts without moving the selection', async () => {
    seedAttempt('attempt-3', '2026-11-10T10:00:00.000Z', 'third\n');
    seedAttempt('attempt-2', '2026-11-09T10:00:00.000Z', 'second\n');
    seedAttempt('attempt-1', '2026-11-08T10:00:00.000Z', 'first\n');
    const item = (a: any) => ({
      attemptId: a.attemptId,
      assignmentVersionId: a.version,
      submittedAt: a.submittedAt,
      answerCount: 2,
      feedbackReleased: a.attemptId === 'attempt-2',
    });
    overrides['GET /api/student/publications/v1/attempts'] = () => ({
      status: 200,
      body: {
        schemaVersion: 1,
        items: attempts.slice(0, 2).map(item),
        nextCursor: '2',
      },
    });
    overrides['GET /api/student/publications/v1/attempts?cursor=2'] = () => ({
      status: 200,
      body: {
        schemaVersion: 1,
        items: attempts.slice(2).map(item),
        nextCursor: null,
      },
    });
    await open();
    click('Submitted attempt', 'tab');
    const select = await screen.findByLabelText('Attempt');
    const chosen = () => (select as unknown as { value: string }).value;
    await waitFor(() => expect(sourceOf(1)).toContain('third'));
    expect(chosen()).toBe('attempt-3');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      `Submitted ${formatDeadline('2026-11-10T10:00:00.000Z')}`,
      `Submitted ${formatDeadline('2026-11-09T10:00:00.000Z')} · Feedback released`,
    ]);
    fireEvent.change(select, { target: { value: 'attempt-2' } });
    await waitFor(() => expect(sourceOf(1)).toContain('second'));
    click('Show older attempts');
    await waitFor(() =>
      expect(
        within(select)
          .getAllByRole('option')
          .map((o) => o.getAttribute('value')),
      ).toEqual(['attempt-3', 'attempt-2', 'attempt-1']),
    );
    expect(chosen()).toBe('attempt-2');
    expect(sourceOf(1)).toContain('second');
    expect(
      screen.queryByRole('button', { name: 'Show older attempts' }),
    ).toBeNull();
    // The selection survives a round trip through the other historical view.
    click('Released feedback', 'tab');
    await screen.findByText(/Feedback has not been released/);
    expect(
      (screen.getByLabelText('Attempt') as unknown as { value: string }).value,
    ).toBe('attempt-2');
  });

  it('keeps the view and attempt on Next and ends in an Attempt summary without submit or Review', async () => {
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'one of nine\n');
    await open();
    click('Released feedback', 'tab');
    await screen.findByText(/Feedback has not been released/);
    expect(sourceOf(1)).toContain('one of nine');
    const before = feedbackCalls().length;
    click('Next question');
    await screen.findByRole('heading', { level: 2, name: 'Question title 2' });
    expect(tabSelected('Released feedback')).toBe('true');
    await waitFor(() => expect(sourceOf(2)).toContain('second of attempt-9'));
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 2, name: 'Question title 2' }),
    );
    expect(screen.getByText('Question 2 of 2')).toBeTruthy();
    expect(
      screen.getByText('Question 2 of 2, Released feedback: Question title 2'),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Review assignment' }),
    ).toBeNull();
    // One summary request per question shown (SF-02, SQ-04).
    await waitFor(() => expect(feedbackCalls().length).toBe(before + 1));
    expect(putCalls()).toHaveLength(0);
    click('Attempt summary');
    const summary = await screen.findByRole('article', {
      name: 'Submitted attempt',
    });
    await within(summary).findByText(/one of nine/);
    expect(summary.textContent).toContain('second of attempt-9');
    expect(
      screen.queryByRole('button', { name: /Submit|Review assignment/ }),
    ).toBeNull();
    fireEvent.click(
      within(summary).getByRole('button', { name: 'Back to question 2' }),
    );
    await screen.findByRole('heading', { level: 2, name: 'Question title 2' });
    expect(tabSelected('Released feedback')).toBe('true');
    expect(postAttempts()).toHaveLength(0);
  });

  it('follows an earlier version pinned to fewer questions, never mixing it with the current one', async () => {
    seedAttempt(
      'attempt-5',
      '2026-11-05T10:00:00.000Z',
      'older one\n',
      'v2',
      1,
    );
    overrides['GET /api/student/publications/v2'] = () => {
      const p = publication('v2');
      return {
        status: 200,
        body: {
          ...p,
          questions: [{ ...p.questions[0], title: 'Pinned earlier title' }],
        },
      };
    };
    await open(2);
    click('Submitted attempt', 'tab');
    await screen.findByRole('heading', {
      level: 2,
      name: 'Pinned earlier title',
    });
    expect(screen.queryByText('Question title 2')).toBeNull();
    expect(screen.getByText('Question 1 of 1')).toBeTruthy();
    expect(
      screen.getByText(/different version of this assignment/),
    ).toBeTruthy();
    expect(sourceOf(1)).toContain('older one');
    // The last (only) question of the pinned version offers the summary, not Review.
    expect(
      screen.getByRole('button', { name: 'Attempt summary' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next question' })).toBeNull();
    // Back on the working copy the route's own publication and question return.
    click('Working copy', 'tab');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Question title 2' }),
    ).toBeTruthy();
    expect(screen.getByText('Question 2 of 2')).toBeTruthy();
    expect(editor(2)).toBeTruthy();
  });

  const historyKey = 'GET /api/student/publications/v1/attempts';
  const historyCalls = () => calls.filter((c) => c.key === historyKey);

  it('shows a retryable network failure when the history cannot be read', async () => {
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'one\n');
    overrides[historyKey] = () => ({ status: 503 });
    await open();
    click('Submitted attempt', 'tab');
    expect(
      await screen.findByText(
        'This could not be loaded. Check your connection and try again.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('region', { name: /Submitted source/ }),
    ).toBeNull();
    delete overrides[historyKey];
    click('Try again');
    await waitFor(() => expect(sourceOf(1)).toContain('one'));
  });

  it('asks the student to sign in again when the history read returns 401', async () => {
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'one\n');
    overrides[historyKey] = () => ({ status: 401 });
    await open();
    click('Released feedback', 'tab');
    expect(
      await screen.findByText(
        'Your session has ended. Sign in again to continue.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('region', { name: /Submitted source/ }),
    ).toBeNull();
  });

  it('refetches the history after a submit and selects the new latest attempt', async () => {
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'before submit\n');
    drafts.set('qv-v1-1', { revision: 2, source: 'answer one\n' });
    await open();
    click('Submitted attempt', 'tab');
    await waitFor(() => expect(sourceOf(1)).toContain('before submit'));
    const before = historyCalls().length;
    click('Working copy', 'tab');
    click('Next question');
    await screen.findByRole('textbox', { name: /question 2/ });
    click('Review assignment');
    await screen.findByRole('heading', { name: 'Review assignment' });
    click('Submit assignment…');
    click('Confirm and submit');
    await screen.findByRole('heading', { name: 'Assignment submitted' });
    click('Keep editing');
    await screen.findByRole('heading', { level: 2, name: 'Question title 1' });
    click('Submitted attempt', 'tab');
    await waitFor(() => expect(sourceOf(1)).toContain('answer one'));
    expect(historyCalls().length).toBe(before + 1);
    expect(sourceOf(1)).not.toContain('before submit');
  });

  it('ignores a slow attempt response once another attempt is selected', async () => {
    // History is newest first in seed order.
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'nine\n');
    seedAttempt('attempt-8', '2026-11-08T10:00:00.000Z', 'eight\n');
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    overrides['GET /api/student/attempts/attempt-9'] = async () => {
      await gate;
      return undefined;
    };
    await open();
    click('Submitted attempt', 'tab');
    const select = (await screen.findByLabelText(
      'Attempt',
    )) as unknown as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'attempt-8' } });
    await waitFor(() => expect(sourceOf(1)).toContain('eight'));
    await act(async () => {
      release();
      await gate;
    });
    expect(sourceOf(1)).toContain('eight');
    expect(sourceOf(1)).not.toContain('nine');
  });

  /** Opens the workbook from an address, as a reload or a link does (SQ-05). */
  const openAt = async (address: string) => {
    window.history.replaceState(null, '', address);
    const route = parseStudentRoute(
      window.location.pathname,
      window.location.search,
    );
    if (route?.kind !== 'work') throw new Error('not a work route');
    render(createElement(Workbook, { route }));
    await screen.findByRole('tab', { name: 'Working copy' });
    await act(async () => undefined);
  };
  const address = () => window.location.pathname + window.location.search;
  const base = '/student/assignments/v1/work';
  const attemptReads = () =>
    calls.filter((c) => /^GET \/api\/student\/attempts\/[^/]+$/.test(c.key));

  it('restores the question, view and attempt on reload and fetches the feedback again', async () => {
    // History is newest first in seed order.
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'nine\n');
    seedAttempt('attempt-8', '2026-11-08T10:00:00.000Z', 'eight\n');
    await openAt(`${base}/2?view=feedback&attempt=attempt-8`);
    expect(tabSelected('Released feedback')).toBe('true');
    await waitFor(() => expect(sourceOf(2)).toContain('second of attempt-8'));
    expect(
      screen.getByRole('heading', { level: 2, name: 'Question title 2' }),
    ).toBeTruthy();
    expect(feedbackCalls().some((c) => c.key.includes('attempt-8'))).toBe(true);
    expect(address()).toBe(`${base}/2?view=feedback&attempt=attempt-8`);
  });

  it('resolves a view without an attempt to the latest attempt by replacing the address', async () => {
    // History is newest first in seed order.
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'nine\n');
    seedAttempt('attempt-8', '2026-11-08T10:00:00.000Z', 'eight\n');
    await openAt(`${base}/1?view=submitted`);
    const length = window.history.length;
    await waitFor(() => expect(sourceOf(1)).toContain('nine'));
    await waitFor(() =>
      expect(address()).toBe(`${base}/1?view=submitted&attempt=attempt-9`),
    );
    expect(window.history.length).toBe(length);
  });

  it('pushes view, attempt and question changes and restores them on Back/Forward', async () => {
    // History is newest first in seed order.
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'nine\n');
    seedAttempt('attempt-8', '2026-11-08T10:00:00.000Z', 'eight\n');
    await openAt(`${base}/1`);
    const start = window.history.length;
    click('Submitted attempt', 'tab');
    await waitFor(() =>
      expect(address()).toBe(`${base}/1?view=submitted&attempt=attempt-9`),
    );
    fireEvent.change(screen.getByLabelText('Attempt'), {
      target: { value: 'attempt-8' },
    });
    await waitFor(() =>
      expect(address()).toBe(`${base}/1?view=submitted&attempt=attempt-8`),
    );
    click('Next question');
    await waitFor(() =>
      expect(address()).toBe(`${base}/2?view=submitted&attempt=attempt-8`),
    );
    expect(window.history.length).toBe(start + 3);
    // Back: question 1 of the same view and attempt.
    await act(async () => {
      window.history.back();
      await new Promise((r) =>
        window.addEventListener('popstate', r, { once: true }),
      );
    });
    await screen.findByRole('heading', { level: 2, name: 'Question title 1' });
    expect(tabSelected('Submitted attempt')).toBe('true');
    await waitFor(() => expect(sourceOf(1)).toContain('eight'));
    // Back twice more: the latest attempt, then the Working copy.
    await act(async () => {
      window.history.back();
      await new Promise((r) =>
        window.addEventListener('popstate', r, { once: true }),
      );
    });
    await waitFor(() => expect(sourceOf(1)).toContain('nine'));
    await act(async () => {
      window.history.back();
      await new Promise((r) =>
        window.addEventListener('popstate', r, { once: true }),
      );
    });
    await waitFor(() => expect(tabSelected('Working copy')).toBe('true'));
    expect(address()).toBe(`${base}/1`);
    // Forward returns to the Submitted attempt view.
    await act(async () => {
      window.history.forward();
      await new Promise((r) =>
        window.addEventListener('popstate', r, { once: true }),
      );
    });
    await waitFor(() => expect(tabSelected('Submitted attempt')).toBe('true'));
    expect(putCalls()).toHaveLength(0);
    expect(postAttempts()).toHaveLength(0);
  });

  it('opens the Working copy for a damaged query, sends nothing with it and cleans the address', async () => {
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'nine\n');
    for (const search of [
      '?view=bogus&attempt=attempt-9',
      '?view=submitted&attempt=a%2Fb',
      '?attempt=attempt-9',
    ]) {
      cleanup();
      calls.length = 0;
      await openAt(`${base}/2${search}`);
      expect(tabSelected('Working copy'), search).toBe('true');
      await waitFor(() => expect(address(), search).toBe(`${base}/2`));
      expect(attemptReads(), search).toHaveLength(0);
      expect(calls.some((c) => c.key.includes('a/b'))).toBe(false);
    }
  });

  it('shows only the unavailable state for a forged attempt ID in the address', async () => {
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'nine\n');
    overrides['GET /api/student/attempts/attempt-other'] = () => ({
      status: 404,
    });
    await openAt(`${base}/1?view=feedback&attempt=attempt-other`);
    expect(
      await screen.findByText('This is not available to you.'),
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain('Attempt ID');
    expect(document.body.textContent).not.toContain('Pinned version');
    expect(
      screen.queryByRole('region', { name: /Submitted source/ }),
    ).toBeNull();
    expect(feedbackCalls()).toHaveLength(0);
  });

  it('clamps to the attempt’s own question count with a replace, and restores the route question on Working copy', async () => {
    seedAttempt('attempt-5', '2026-11-05T10:00:00.000Z', 'older\n', 'v2', 1);
    overrides['GET /api/student/publications/v2'] = () => {
      const p = publication('v2');
      return {
        status: 200,
        body: { ...p, questions: [p.questions[0]] },
      };
    };
    await openAt(`${base}/2?view=submitted&attempt=attempt-5`);
    const length = window.history.length;
    await waitFor(() =>
      expect(address()).toBe(`${base}/1?view=submitted&attempt=attempt-5`),
    );
    expect(window.history.length).toBe(length);
    expect(screen.getByText('Question 1 of 1')).toBeTruthy();
    click('Working copy', 'tab');
    await waitFor(() => expect(address()).toBe(`${base}/2`));
    expect(screen.getByText('Question 2 of 2')).toBeTruthy();
  });

  it('shows only the unavailable state for an attempt that cannot be read', async () => {
    seedAttempt('attempt-9', '2026-11-09T10:00:00.000Z', 'one\n');
    overrides['GET /api/student/attempts/attempt-9'] = () => ({ status: 404 });
    await open();
    click('Submitted attempt', 'tab');
    expect(
      await screen.findByText('This is not available to you.'),
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain('Attempt ID');
    expect(
      screen.queryByRole('region', { name: /Submitted source/ }),
    ).toBeNull();
  });
});
