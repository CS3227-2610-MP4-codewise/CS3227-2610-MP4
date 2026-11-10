import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  RequestGenerations,
  StudentRequestError,
  failureOf,
  formatDeadline,
  parseStudentRoute,
  studentApi,
  studentPaths,
} from './model';
import { AssignmentList, Overview } from './StudentWorkspace';
import { InstructionText } from '../ui/instruction-text';
import { encodeCursor } from '../../shared/student-assignments';
import type { Publication } from '../../shared/instructor-contracts/publication';

/** SD-02–06, UI-04/07/08: synthetic browser-consumer checks (no DOM runtime or real accounts). */
const publication: Publication = {
  schemaVersion: 1,
  assignmentId: 'alpha',
  assignmentVersionId: 'alpha-v1',
  courseId: 'course-a',
  title: 'Synthetic loops',
  publishedAt: '2026-11-01T12:00:00.000Z',
  deadlineAt: '2026-11-20T15:30:00.000Z',
  questions: [
    {
      questionId: 'q1',
      questionVersionId: 'qv1',
      title: 'Sum a list',
      instructions: 'Use a **loop**.',
      language: 'python',
      starterCode: 'def total(xs):\n    result = 0\n    return result\n',
      rubricId: 'r1',
      rubricVersionId: 'rv1',
      criteria: [
        {
          criterionId: 'c1',
          comparisonKey: 'k1',
          descriptor: 'Returns the correct sum',
          minimumScore: 0,
          maximumScore: 5,
        },
      ],
    },
  ],
};
const page = (courseId = 'course-a', nextCursor: string | null = null) => ({
  schemaVersion: 1,
  course: { id: courseId, name: 'Synthetic course' },
  items: [
    {
      assignmentId: 'alpha',
      assignmentVersionId: 'alpha-v2',
      title: 'Synthetic loops',
      publishedAt: '2026-11-02T12:00:00.000Z',
      deadlineAt: '2026-10-01T12:00:00.000Z',
    },
  ],
  nextCursor,
});
const respond =
  (status: number, body: unknown = {}) =>
  async () =>
    new Response(JSON.stringify(body), { status });
const signal = () => new AbortController().signal;
async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error instanceof StudentRequestError ? error.failure : 'other';
  }
  return 'resolved';
}

describe('student routes', () => {
  it('parses valid destinations and rejects forged or malformed ones', () => {
    expect(parseStudentRoute('/student', '')).toEqual({
      kind: 'courses',
      after: '',
    });
    expect(parseStudentRoute('/workspace', '?role=student')).toEqual({
      kind: 'courses',
      after: '',
    });
    const cursor = encodeCursor('2026-11-01T12:00:00.000Z', 'alpha');
    expect(
      parseStudentRoute(
        '/student/courses/c-1/assignments',
        '?cursor=' + cursor,
      ),
    ).toEqual({ kind: 'assignments', courseId: 'c-1', cursor });
    expect(parseStudentRoute('/student/assignments/v_1', '')).toEqual({
      kind: 'overview',
      versionId: 'v_1',
      from: null,
    });
    expect(
      parseStudentRoute('/student/assignments/v_1', '?from=' + cursor),
    ).toEqual({ kind: 'overview', versionId: 'v_1', from: cursor });
    for (const [path, search] of [
      ['/workspace', '?role=admin'],
      ['/student', '?after=../x'],
      ['/student', '?after=a&after=b'],
      ['/student/courses/a%2Fb/assignments', ''],
      ['/student/courses/c/assignments', '?cursor=***'],
      ['/student/courses/c/assignments', '?role=instructor'],
      ['/student/assignments/v1', '?version=latest'],
      ['/student/assignments/v1', '?from=***'],
      ['/student/assignments/v1', '?from=' + cursor + '&from=' + cursor],
      ['/student/assignments/v1', '?from=' + cursor + '&cursor=' + cursor],
      ['/student/assignments/', ''],
      ['/student/elsewhere', ''],
    ])
      expect(parseStudentRoute(path, search), path + search).toBeNull();
  });

  it('builds encoded local paths', () => {
    expect(studentPaths.assignments('c1', 'abc')).toBe(
      '/student/courses/c1/assignments?cursor=abc',
    );
    expect(studentPaths.overview('v1')).toBe('/student/assignments/v1');
    expect(studentPaths.overview('v1', 'abc')).toBe(
      '/student/assignments/v1?from=abc',
    );
    expect(studentPaths.overview('v1', null)).toBe('/student/assignments/v1');
    expect(studentPaths.courses('n1')).toBe('/student?after=n1');
  });

  it('labels deadlines in UTC', () => {
    expect(formatDeadline('2026-11-20T15:30:00.000Z')).toBe(
      'Fri 20 Nov 2026, 15:30 UTC',
    );
  });
});

describe('student client boundary', () => {
  it('maps HTTP outcomes to distinct recovery states', () => {
    expect(failureOf(401)).toBe('session');
    expect(failureOf(403)).toBe('unavailable');
    expect(failureOf(404)).toBe('unavailable');
    expect(failureOf(400)).toBe('invalid');
    expect(failureOf(503)).toBe('network');
  });

  it('binds responses to the requested destination', async () => {
    const ok = studentApi(respond(200, page()));
    expect(
      (await ok.assignments('course-a', null, signal())).items,
    ).toHaveLength(1);
    expect(
      await failure(
        studentApi(respond(200, page('course-b'))).assignments(
          'course-a',
          null,
          signal(),
        ),
      ),
    ).toBe('unavailable');
    const cursor = encodeCursor('2026-11-01T12:00:00.000Z', 'alpha');
    expect(
      await failure(
        studentApi(respond(200, page('course-a', cursor))).assignments(
          'course-a',
          cursor,
          signal(),
        ),
      ),
    ).toBe('invalid');
    expect(
      await failure(
        studentApi(respond(200, publication)).overview('alpha-v2', signal()),
      ),
    ).toBe('unavailable');
    expect(
      (
        await studentApi(respond(200, publication)).overview(
          'alpha-v1',
          signal(),
        )
      ).title,
    ).toBe('Synthetic loops');
  });

  it('rejects payloads with extra or private fields instead of rendering them', async () => {
    const leaky = {
      ...page(),
      items: [{ ...page().items[0], privateReference: 'secret' }],
    };
    expect(
      await failure(
        studentApi(respond(200, leaky)).assignments('course-a', null, signal()),
      ),
    ).toBe('unavailable');
    const status = {
      ...page(),
      items: [{ ...page().items[0], status: 'Graded' }],
    };
    expect(
      await failure(
        studentApi(respond(200, status)).assignments(
          'course-a',
          null,
          signal(),
        ),
      ),
    ).toBe('unavailable');
  });

  it('requires a Student context and a progressing course cursor', async () => {
    const contexts = (workspaces: unknown[]) =>
      studentApi(respond(200, { workspaces }));
    expect(
      await failure(
        contexts([
          { role: 'instructor', courses: [], nextCursor: null },
        ]).courses('', signal()),
      ),
    ).toBe('unavailable');
    expect(
      await failure(
        contexts([{ role: 'student', courses: [], nextCursor: 'c1' }]).courses(
          'c1',
          signal(),
        ),
      ),
    ).toBe('invalid');
    const many = Array.from({ length: 100 }, (_, i) => ({
      id: 'c' + String(i).padStart(3, '0'),
      name: 'Course ' + i,
    }));
    const result = await contexts([
      { role: 'student', courses: many, nextCursor: 'c099' },
      { role: 'instructor', courses: [], nextCursor: null },
    ]).courses('', signal());
    expect(result.courses).toHaveLength(100);
    expect(result.nextCursor).toBe('c099');
    expect(result.roles).toEqual(['student', 'instructor']);
    for (const status of [401, 404, 503])
      expect(
        await failure(studentApi(respond(status)).courses('', signal())),
      ).toBe(failureOf(status));
    const offline = studentApi(async () => {
      throw new TypeError('offline');
    });
    expect(await failure(offline.courses('', signal()))).toBe('network');
  });

  it('ignores superseded and cancelled request generations', () => {
    const generations = new RequestGenerations();
    const first = generations.start();
    const second = generations.start();
    expect(first.signal.aborted).toBe(true);
    expect(first.current()).toBe(false);
    expect(second.current()).toBe(true);
    generations.cancel();
    expect(second.current()).toBe(false);
    expect(second.signal.aborted).toBe(true);
  });
});

describe('student rendering', () => {
  it('renders assignment rows without learner status and keeps past deadlines', () => {
    const html = renderToStaticMarkup(
      createElement(AssignmentList, {
        data: { ...page(), schemaVersion: 1 as const },
        cursor: null,
      }),
    );
    expect(html).toContain('Synthetic loops');
    expect(html).toContain('Thu 1 Oct 2026, 12:00 UTC');
    expect(html).toContain('href="/student/assignments/alpha-v2"');
    expect(html).toContain('Refresh list');
    for (const absent of ['Not started', 'Submitted', 'Graded', 'Feedback'])
      expect(html).not.toContain(absent);
  });

  it('renders a read-only exact-version overview', () => {
    const html = renderToStaticMarkup(createElement(Overview, { publication }));
    expect(html).toContain('Question 1: Sum a list');
    expect(html).toContain('(alpha-v1)');
    expect(html).toContain('Fri 20 Nov 2026, 15:30 UTC');
    expect(html).toContain('    result = 0');
    expect(html).toContain('aria-label="Starter code for question 1"');
    expect(html).toContain('0–5 points');
    expect(html).toContain('<strong>loop</strong>');
    for (const absent of [
      '<textarea',
      '<input',
      '<button',
      'Submit',
      'Working copy',
      'Run',
      'Feedback',
      'History',
    ])
      expect(html).not.toContain(absent);
  });

  it('sanitizes unsafe instruction markup and preserves plain text and code', () => {
    const html = renderToStaticMarkup(
      createElement(InstructionText, {
        value: [
          'Plain sentence with 2 < 3 & symbols.',
          '',
          '<script>alert(1)</script><img src="x" onerror="alert(2)">',
          '',
          '[click](javascript:alert(3)) <a href="javascript:alert(4)">x</a>',
          '',
          '```python',
          'def f():',
          '    return 1',
          '```',
        ].join('\n'),
      }),
    );
    expect(html).toContain('Plain sentence with 2 &lt; 3 &amp; symbols.');
    expect(html).not.toMatch(/<script|onerror|javascript:/i);
    expect(html).toContain('    return 1');
  });

  it('keeps plain-text meaning and renders long content without truncation', () => {
    const long = Array.from({ length: 400 }, (_, i) => 'Step ' + i + '.').join(
      ' ',
    );
    const html = renderToStaticMarkup(
      createElement(InstructionText, {
        value: 'Return x * 2 when x > 0.\n\n' + long,
      }),
    );
    expect(html).toContain('Return x * 2 when x &gt; 0.');
    expect(html).toContain('Step 0.');
    expect(html).toContain('Step 399.');
  });

  it('keeps filled action links readable by not overriding their text colour', async () => {
    // Regression: `.cw-student a { color: ink }` out-ranked `.cw-action`, so Next and
    // Sign in rendered ink text on an ink fill (blank button) in both themes.
    const css = await readFile('src/web/student/student.css', 'utf8');
    for (const rule of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (!/(^|[\s;])color\s*:/.test(rule[2])) continue;
      for (const selector of rule[1].split(','))
        if (/(^|\s)a(\s*$|[:.[]?)/.test(selector.trim().split(/\s+/).at(-1)!))
          expect(selector, 'link colour rule').toContain(':not(.cw-action)');
    }
  });

  it('never persists protected student data in durable browser storage', async () => {
    // SW-04: the only storage allowed is the per-tab sessionStorage draft backup, and only
    // in work-model.ts (cleared on acknowledged save, sign-out, 401 and account change).
    const files = (await readdir('src/web/student')).filter(
      (name) => /\.tsx?$/.test(name) && !name.endsWith('.test.ts'),
    );
    for (const name of files) {
      const source = await readFile('src/web/student/' + name, 'utf8');
      expect(source, name).not.toMatch(
        /localStorage|indexedDB|caches\.|serviceWorker/,
      );
      if (name !== 'work-model.ts')
        expect(source, name).not.toMatch(/sessionStorage/);
    }
  });
});
