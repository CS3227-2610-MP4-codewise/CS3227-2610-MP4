// LOCAL EVIDENCE HELPER for editor-gate variant B (synthetic data only, loopback only).
//
// Real sign-in needs a real Firebase user (the Worker re-checks the provider on every request), which
// this evidence run does not have. This proxy therefore forwards everything EXCEPT the session and
// student API to the real local Worker (so the real built assets and the real Content-Security-Policy
// headers reach the browser) and answers those API routes from a small in-memory stub that mirrors
// src/server/student/README.md. It proves browser behaviour of the UI and editor, NOT the real API,
// authentication or D1 durability.
//
// Usage: node stub-proxy.mjs <worker-base> <port>
import { createServer } from 'node:http';

const [workerBase = 'http://127.0.0.1:8787', port = '8802'] =
  process.argv.slice(2);
const hash = (n) => n.toString(16).padStart(64, '0');
const PUB = 'synthetic-work-publication';
const STARTER = 'def answer():\n    pass\n';
const state = { drafts: {}, attempts: [] };
const question = (i) => ({
  questionId: 'sq' + i,
  questionVersionId: `synthetic-work-qv-${i}`,
  title: 'Synthetic question ' + (i + 1),
  instructions: 'Write a function that returns ' + (i + 1) + '.',
  language: 'python',
  starterCode: STARTER,
  rubricId: 'sr' + i,
  rubricVersionId: `synthetic-work-rv-${i}`,
  criteria: [
    {
      criterionId: 'c1',
      comparisonKey: 'k1',
      descriptor: 'Correct output',
      minimumScore: 0,
      maximumScore: 5,
    },
  ],
});
const json = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
};
const error = (res, status, code, extra = {}) =>
  json(res, status, {
    schemaVersion: 1,
    error: {
      code,
      message: 'Operation could not be completed.',
      requestId: 'stub',
    },
    ...extra,
  });
const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data ? JSON.parse(data) : null));
  });

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  let m;
  if (p === '/api/auth/session')
    return json(res, 200, {
      session: {
        schemaVersion: 1,
        userId: 'synthetic-acct-a',
        expiresAt: new Date(Date.now() + 1800e3).toISOString(),
      },
      email: 'synthetic.a@u.nus.edu',
      administrator: false,
      csrfToken: 'stub-csrf',
    });
  if (p === '/api/courses/contexts')
    return json(res, 200, {
      workspaces: [
        {
          role: 'student',
          courses: [
            { id: 'synthetic-student-001', name: 'Synthetic course 001' },
          ],
          nextCursor: null,
        },
      ],
    });
  if (p === '/__stub/other-tab-save' && req.method === 'POST') {
    const b = await readBody(req);
    const cur = state.drafts[b.id] ?? { revision: 0 };
    state.drafts[b.id] = { revision: cur.revision + 1, source: b.source };
    return json(res, 200, state.drafts[b.id]);
  }
  if (p.startsWith('/api/student/')) {
    if ((m = /^\/api\/student\/publications\/([^/]+)$/.exec(p)))
      return m[1] === PUB
        ? json(res, 200, {
            schemaVersion: 1,
            assignmentId: 'synthetic-work-assignment',
            assignmentVersionId: PUB,
            courseId: 'synthetic-student-001',
            title: 'Synthetic workbook assignment',
            publishedAt: new Date(Date.now() - 864e5).toISOString(),
            deadlineAt: new Date(Date.now() + 30 * 864e5).toISOString(),
            questions: [question(0), question(1)],
          })
        : error(res, 404, 'NOT_FOUND');
    if ((m = /^\/api\/student\/publications\/([^/]+)\/work$/.exec(p)))
      return json(res, 200, {
        schemaVersion: 1,
        assignmentId: 'synthetic-work-assignment',
        assignmentVersionId: PUB,
        latestAssignmentVersionId: PUB,
        deadlineAt: new Date(Date.now() + 30 * 864e5).toISOString(),
        attemptCount: state.attempts.length,
        questions: [0, 1].map((i) => {
          const d = state.drafts[`synthetic-work-qv-${i}`];
          return {
            questionVersionId: `synthetic-work-qv-${i}`,
            position: i,
            revision: d?.revision ?? 0,
            source: d?.source ?? STARTER,
            sourceHash: hash(d?.revision ?? 0),
            updatedAt: d ? new Date().toISOString() : null,
          };
        }),
      });
    if (
      (m = /^\/api\/student\/drafts\/([^/]+)$/.exec(p)) &&
      req.method === 'PUT'
    ) {
      const b = await readBody(req);
      const cur = state.drafts[m[1]] ?? { revision: 0, source: STARTER };
      if (b.baseRevision !== cur.revision)
        return error(res, 409, 'CONFLICT_REVISION', {
          current: {
            revision: cur.revision,
            source: cur.source,
            sourceHash: hash(cur.revision),
          },
        });
      state.drafts[m[1]] = { revision: cur.revision + 1, source: b.source };
      return json(res, 200, {
        schemaVersion: 1,
        revision: cur.revision + 1,
        sourceHash: hash(cur.revision + 1),
        savedAt: new Date().toISOString(),
      });
    }
    if ((m = /^\/api\/student\/publications\/([^/]+)\/attempts$/.exec(p))) {
      if (req.method === 'POST') {
        const b = await readBody(req);
        const attemptId = 'stub-attempt-' + (state.attempts.length + 1);
        state.attempts.unshift({
          attemptId,
          submittedAt: new Date().toISOString(),
          answers: b.answers.map((a) => ({
            ...a,
            source: state.drafts[a.questionVersionId].source,
          })),
        });
        return json(res, 201, {
          schemaVersion: 1,
          attemptId,
          assignmentVersionId: PUB,
          submittedAt: state.attempts[0].submittedAt,
          replayed: false,
        });
      }
      return json(res, 200, {
        schemaVersion: 1,
        items: state.attempts.map((a) => ({
          attemptId: a.attemptId,
          assignmentVersionId: PUB,
          submittedAt: a.submittedAt,
          answerCount: a.answers.length,
        })),
        nextCursor: null,
      });
    }
    if ((m = /^\/api\/student\/attempts\/([^/]+)$/.exec(p))) {
      const a = state.attempts.find((x) => x.attemptId === m[1]);
      return a
        ? json(res, 200, {
            schemaVersion: 1,
            attemptId: a.attemptId,
            assignmentVersionId: PUB,
            courseId: 'synthetic-student-001',
            submittedByUserId: 'synthetic-acct-a',
            submittedAt: a.submittedAt,
            answers: a.answers.map((x, i) => ({
              submittedAnswerId: a.attemptId + '-' + i,
              questionVersionId: x.questionVersionId,
              rubricVersionId: x.questionVersionId.replace('qv', 'rv'),
              draftRevision: x.draftRevision,
              source: x.source,
              sourceHash: x.sourceHash,
            })),
          })
        : error(res, 404, 'NOT_FOUND');
    }
    return error(res, 404, 'NOT_FOUND');
  }
  // Everything else (HTML, JS, CSS and their CSP headers) comes from the real local Worker.
  const upstream = await fetch(workerBase + req.url, {
    headers: { accept: req.headers.accept ?? '*/*' },
  });
  const headers = Object.fromEntries(upstream.headers.entries());
  delete headers['content-encoding'];
  delete headers['content-length'];
  delete headers['transfer-encoding'];
  res.writeHead(upstream.status, headers);
  res.end(Buffer.from(await upstream.arrayBuffer()));
}).listen(Number(port), '127.0.0.1', () =>
  console.log(`stub proxy on http://127.0.0.1:${port} -> ${workerBase}`),
);
