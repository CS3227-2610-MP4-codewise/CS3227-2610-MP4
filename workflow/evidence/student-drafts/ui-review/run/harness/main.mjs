import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../../../src/web/styles.css';
import { Workbook } from '../../../../../../src/web/student/Workbook';

// Synthetic data only. `?state=` selects what the screenshot shows.
const params = new URLSearchParams(location.search);
const scenario = params.get('state') || 'editor';
const state = scenario === 'conflict-fallback' ? 'conflict' : scenario;
if (scenario === 'conflict-fallback')
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: async () => {
        throw new Error('synthetic clipboard denial');
      },
    },
    configurable: true,
  });
sessionStorage.removeItem('cw:draft:user-1:v1:qv-1');
// Forces the dark half of the light-dark() tokens for evidence; the app itself follows the system.
document.documentElement.style.colorScheme = params.get('theme') || 'light';
const hash = '0'.repeat(63) + '1';
const starter = 'def total(values):\n    pass\n';
const mine = `def total(values):
    """Return the sum of values."""
    result = 0
    for value in values:  # a very long trailing comment that forces horizontal scrolling in the editor
        result += value
    return result

print(total([1, 2, 3]))
`;
const server = `def total(values):
    return sum(values)
`;
const question = (n) => ({
  questionId: 'qid' + n,
  questionVersionId: 'qv-' + n,
  title: 'Sum a list ' + n,
  instructions:
    'Write a function **total** that returns the sum of a list of numbers.\n\n```python\ntotal([1, 2, 3])  # 6\n```',
  language: 'python',
  starterCode: starter,
  rubricId: 'r' + n,
  rubricVersionId: 'rv-' + n,
  criteria: [
    {
      criterionId: 'c1',
      comparisonKey: 'k1',
      descriptor: 'Correct result',
      minimumScore: 0,
      maximumScore: 5,
    },
  ],
});
const publication = {
  schemaVersion: 1,
  assignmentId: 'alpha',
  assignmentVersionId: 'v1',
  courseId: 'course-a',
  title: 'Synthetic workbook assignment',
  publishedAt: '2026-11-01T12:00:00.000Z',
  deadlineAt: '2099-01-01T00:00:00.000Z',
  questions: [question(1), question(2)],
};
const drafts = new Map([
  [
    'qv-1',
    {
      revision: state === 'starter' ? 0 : 3,
      source:
        state === 'conflict' ? server : state === 'starter' ? starter : mine,
    },
  ],
]);
const draftOf = (qv) => drafts.get(qv) ?? { revision: 0, source: starter };
const respond = (status, body) =>
  new Response(JSON.stringify(body), { status });
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const method = init.method ?? 'GET';
  const body = init.body ? JSON.parse(init.body) : undefined;
  if (input === '/api/auth/session')
    return respond(200, {
      session: {
        schemaVersion: 1,
        userId: 'user-1',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
      email: 'student@u.nus.edu',
      administrator: false,
      csrfToken: 'a'.repeat(64),
    });
  if (input === '/api/courses/contexts')
    return respond(200, {
      workspaces: [{ role: 'student', courses: [], nextCursor: null }],
    });
  if (input === '/api/student/publications/v1')
    return respond(200, publication);
  if (input === '/api/student/publications/v1/work')
    return respond(200, {
      schemaVersion: 1,
      assignmentId: 'alpha',
      assignmentVersionId: 'v1',
      latestAssignmentVersionId: state === 'newer' ? 'v2' : 'v1',
      deadlineAt: '2099-01-01T00:00:00.000Z',
      attemptCount: 0,
      questions: [1, 2].map((n) => ({
        questionVersionId: 'qv-' + n,
        position: n - 1,
        revision: draftOf('qv-' + n).revision,
        source: draftOf('qv-' + n).source,
        sourceHash: hash,
        updatedAt: null,
      })),
    });
  if (method === 'PUT') {
    if (state === 'saving')
      await new Promise((r) =>
        window.addEventListener('review-release', r, { once: true }),
      );
    if (
      ['failed', 'session', 'denied', 'invalid', 'too-large'].includes(state)
    ) {
      const code = {
        failed: 'UPSTREAM_UNAVAILABLE',
        session: 'UNAUTHENTICATED',
        denied: 'NOT_FOUND',
        invalid: 'INVALID_CONTRACT',
        'too-large': 'SOURCE_TOO_LARGE',
      }[state];
      return respond(
        state === 'session'
          ? 401
          : state === 'denied'
            ? 404
            : state === 'failed'
              ? 503
              : 400,
        {
          schemaVersion: 1,
          error: {
            code,
            message: 'Synthetic review failure',
            requestId: 'review',
          },
        },
      );
    }
    if (state === 'conflict-save')
      return respond(409, {
        schemaVersion: 1,
        error: {
          code: 'CONFLICT_REVISION',
          message: 'Synthetic conflict',
          requestId: 'review',
        },
        current: { revision: 4, source: server, sourceHash: hash },
      });

    const qv = decodeURIComponent(input.split('/').pop());
    const cur = draftOf(qv);
    drafts.set(qv, { revision: cur.revision + 1, source: body.source });
    return respond(200, {
      schemaVersion: 1,
      revision: cur.revision + 1,
      sourceHash: hash,
      savedAt: '2026-11-10T00:00:00.000Z',
    });
  }
  return respond(404, {});
};
if (state === 'conflict')
  sessionStorage.setItem(
    'cw:draft:user-1:v1:qv-1',
    JSON.stringify({ source: mine, baseRevision: 3 }),
  );

createRoot(document.getElementById('root')).render(
  createElement(Workbook, {
    route: { kind: 'work', versionId: 'v1', position: 1 },
  }),
);

if (state === 'review')
  setTimeout(() => {
    const click = (name) =>
      [...document.querySelectorAll('button')]
        .find((b) => b.textContent === name)
        ?.click();
    click('Next question');
    setTimeout(() => click('Review assignment'), 600);
  }, 800);
if (state === 'unsaved')
  setTimeout(() => {
    const box = document.querySelector('textarea');
    const set = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    ).set;
    set.call(box, mine + '# edited\n');
    box.dispatchEvent(new Event('input', { bubbles: true }));
  }, 800);

// Read-only instrumentation for the manual review; product code is unchanged.
const report = () => {
  const visible = (e) =>
    e.checkVisibility() &&
    e.getBoundingClientRect().width > 0 &&
    e.getBoundingClientRect().height > 0;
  const controls = [...document.querySelectorAll('button,a,summary,input')]
    .filter(visible)
    .map((e) => ({
      name: e.textContent.trim() || e.getAttribute('aria-label'),
      w: +e.getBoundingClientRect().width.toFixed(1),
      h: +e.getBoundingClientRect().height.toFixed(1),
    }));
  const rgba = (value) => {
    const c = document.createElement('canvas').getContext('2d');
    c.fillStyle = value;
    c.fillRect(0, 0, 1, 1);
    return [...c.getImageData(0, 0, 1, 1).data];
  };
  const lum = (rgb) =>
    rgb
      .slice(0, 3)
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => {
    const x = lum(a),
      y = lum(b);
    return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
  };
  const bg = (e) => {
    for (let n = e; n; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c[3] === 255) return c;
    }
    return [255, 255, 255, 255];
  };
  const contrast = [
    ...document.querySelectorAll(
      '.cw-wb h1,.cw-wb h2,.cw-student-meta-line,.cw-wb-hint,.cw-wb-save,.cw-wb-tabs button,.cw-editor-layer code,.cw-editor-layer .token,.cw-wb-conflict p,.cw-wb-diff td,.cw-action,.cw-wb-ln,.cw-wb-mark',
    ),
  ]
    .filter(visible)
    .map((e) => ({
      name: e.className || e.tagName,
      text: e.textContent.trim().slice(0, 32),
      fg: rgba(getComputedStyle(e).color),
      bg: bg(e),
      ratio: ratio(rgba(getComputedStyle(e).color), bg(e)),
    }));
  const status =
    document.querySelector('.cw-wb-save')?.textContent.trim() || '';
  const overflow = [...document.querySelectorAll('#root *')]
    .filter(visible)
    .filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5)
    .map((e) => ({
      tag: e.tagName,
      cls: e.className,
      right: +e.getBoundingClientRect().right.toFixed(1),
    }))
    .slice(0, 20);
  const motionStyles = [...document.querySelectorAll('.cw-wb *')]
    .filter(visible)
    .map((e) => getComputedStyle(e))
    .filter(
      (s) => s.animationDuration !== '0s' || s.transitionDuration !== '0s',
    )
    .map((s) => ({
      animation: s.animationDuration,
      transition: s.transitionDuration,
    }));
  const data = {
    review: true,
    status,
    contrast,
    overflow,
    motionStyles,
    scenario,
    state,
    theme: params.get('theme') || 'light',
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    motion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    focus:
      document.activeElement?.getAttribute('aria-label') ||
      document.activeElement?.textContent?.trim().slice(0, 100),
    controls,
  };
  parent.postMessage(data, location.origin);
  if (parent === window)
    nativeFetch('/review-report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
};
setInterval(report, 700);
