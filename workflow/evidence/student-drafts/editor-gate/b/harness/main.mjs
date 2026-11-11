import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../../../src/web/styles.css';
import { Workbook } from '../../../../../../src/web/student/Workbook';

// Synthetic data only. `?state=` selects what the screenshot shows.
const params = new URLSearchParams(location.search);
const state = params.get('state') ?? 'editor';
// Forces the dark half of the light-dark() tokens for evidence; the app itself follows the system.
if (params.get('theme') === 'dark')
  document.documentElement.style.colorScheme = 'dark';
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
  ['qv-1', { revision: 3, source: state === 'conflict' ? server : mine }],
]);
const draftOf = (qv) => drafts.get(qv) ?? { revision: 0, source: starter };
const respond = (status, body) =>
  new Response(JSON.stringify(body), { status });
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
