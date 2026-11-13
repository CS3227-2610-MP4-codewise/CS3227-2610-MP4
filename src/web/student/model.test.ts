import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  RequestGenerations,
  StudentRequestError,
  failureOf,
  formatDeadline,
  formatPoints,
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

  it('parses the closed view/attempt query of the workbook route (SQ-05)', () => {
    const path = '/student/assignments/v1/work/3';
    const base = { kind: 'work', versionId: 'v1', position: 3 };
    expect(parseStudentRoute(path, '')).toEqual(base);
    expect(parseStudentRoute(path, '?view=submitted&attempt=att_9')).toEqual({
      ...base,
      view: 'submitted',
      attempt: 'att_9',
    });
    expect(parseStudentRoute(path, '?attempt=att-9&view=feedback')).toEqual({
      ...base,
      view: 'feedback',
      attempt: 'att-9',
    });
    // A view without an attempt means the latest attempt, resolved later.
    expect(parseStudentRoute(path, '?view=feedback')).toEqual({
      ...base,
      view: 'feedback',
    });
    // Damaged queries still open the work: the Working copy of the same question, values dropped.
    for (const search of [
      '?attempt=att-9',
      '?view=work&attempt=att-9',
      '?view=Submitted',
      '?view=submitted&attempt=a%2Fb',
      '?view=submitted&attempt=' + 'a'.repeat(129),
      '?view=submitted&attempt=',
      '?view=submitted&view=feedback',
      '?view=submitted&attempt=a&attempt=b',
      '?view=submitted&attempt=a&role=instructor',
      '?cursor=x',
    ])
      expect(parseStudentRoute(path, search), search).toEqual(base);
    // Position bounds are unchanged by the query.
    for (const p of ['0', '21', '01', 'x'])
      expect(
        parseStudentRoute(
          `/student/assignments/v1/work/${p}`,
          '?view=feedback',
        ),
        p,
      ).toBeNull();
    expect(
      parseStudentRoute('/student/assignments/v1/work/20', '?view=feedback'),
    ).toEqual({
      kind: 'work',
      versionId: 'v1',
      position: 20,
      view: 'feedback',
    });
    expect(
      parseStudentRoute('/student/assignments/a%2Fb/work/1', '?view=feedback'),
    ).toBeNull();
  });

  it('round-trips workbook paths with and without a view', () => {
    const cases = [
      [
        studentPaths.work('v1', 2),
        { kind: 'work', versionId: 'v1', position: 2 },
      ],
      [
        studentPaths.work('v1', 2, { view: 'submitted' }),
        { kind: 'work', versionId: 'v1', position: 2, view: 'submitted' },
      ],
      [
        studentPaths.work('v1', 4, { view: 'feedback', attempt: 'att-1' }),
        {
          kind: 'work',
          versionId: 'v1',
          position: 4,
          view: 'feedback',
          attempt: 'att-1',
        },
      ],
    ] as const;
    for (const [path, route] of cases) {
      const url = new URL(path, 'http://x');
      expect(parseStudentRoute(url.pathname, url.search), path).toEqual(route);
    }
    expect(
      studentPaths.work('v1', 4, { view: 'feedback', attempt: null }),
    ).toBe('/student/assignments/v1/work/4?view=feedback');
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

  it('shows student times in Singapore time with a fixed layout (DR-01)', () => {
    expect(formatDeadline('2026-11-13T06:05:09Z')).toBe(
      '13/11/2026, 2:05:09 pm',
    );
    expect(formatDeadline('2026-11-20T15:30:00.000Z')).toBe(
      '20/11/2026, 11:30:00 pm',
    );
    expect(formatDeadline('2026-11-12T16:00:00Z')).toBe(
      '13/11/2026, 12:00:00 am',
    );
    expect(formatDeadline('2026-11-13T04:00:00Z')).toBe(
      '13/11/2026, 12:00:00 pm',
    );
    expect(formatDeadline('2026-12-31T16:00:00Z')).toBe(
      '01/01/2027, 12:00:00 am',
    );
  });

  it('does not depend on the viewer time zone (DR-01)', () => {
    const tz = process.env.TZ;
    // Node re-reads TZ when it changes; the formatter pins its own zone and locale.
    process.env.TZ = 'America/New_York';
    try {
      expect(new Date('2026-11-13T06:05:09Z').getHours()).toBe(1);
      expect(formatDeadline('2026-11-13T06:05:09Z')).toBe(
        '13/11/2026, 2:05:09 pm',
      );
    } finally {
      process.env.TZ = tz;
    }
  });

  it('formats rubric points as the bracketed maximum (DR-02)', () => {
    expect(formatPoints(2)).toBe('(2 points)');
    expect(formatPoints(1)).toBe('(1 point)');
    expect(formatPoints(2.5)).toBe('(2.5 points)');
    expect(formatPoints(0.25)).toBe('(0.25 points)');
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
    expect(html).toContain('01/10/2026, 8:00:00 pm');
    expect(html).toContain('href="/student/assignments/alpha-v2"');
    expect(html).toContain('Refresh list');
    for (const absent of ['Not started', 'Submitted', 'Graded', 'Feedback'])
      expect(html).not.toContain(absent);
  });

  it('shows the maximum only, even with a non-zero minimum (DR-02)', () => {
    const shifted = {
      ...publication,
      questions: publication.questions.map((q) => ({
        ...q,
        criteria: q.criteria.map((c) => ({
          ...c,
          minimumScore: 1,
          maximumScore: 3,
        })),
      })),
    };
    const html = renderToStaticMarkup(
      createElement(Overview, { publication: shifted }),
    );
    expect(html).toContain('(3 points)');
    expect(html).not.toContain('1–3');
  });

  it('renders a read-only exact-version overview', () => {
    const html = renderToStaticMarkup(createElement(Overview, { publication }));
    expect(html).toContain('Question 1: Sum a list');
    expect(html).toContain('(alpha-v1)');
    expect(html).toContain('20/11/2026, 11:30:00 pm');
    expect(html).toContain('    result = 0');
    expect(html).toContain('aria-label="Starter code for question 1"');
    expect(html).toContain('(5 points)');
    expect(html).not.toContain('0–5');
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

  it('lets course entries span the row so their action sits at the far right', async () => {
    // The generic `.cw-student a` rule is inline-flex, which shrank the shared course entry to
    // its content and pulled "View assignments" next to the course name.
    const css = await readFile('src/web/student/student.css', 'utf8');
    expect(css).toMatch(
      /\.cw-student a\.cw-course-entry\s*\{\s*display:\s*flex;/,
    );
    expect(css).toMatch(
      /\.cw-student-assignments > li\s*\{[^}]*justify-content:\s*space-between/,
    );
    // A long title in the Open action must wrap, not squeeze the details to one letter per line.
    expect(css).toMatch(
      /\.cw-student-assignments > li > a\.cw-row-action\s*\{[^}]*flex:\s*0 1 auto;[^}]*max-width:\s*16rem/,
    );
    expect(css).toMatch(
      /\.cw-student-assignments > li > div\s*\{[^}]*min-width:\s*min\(16rem, 100%\)/,
    );
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
