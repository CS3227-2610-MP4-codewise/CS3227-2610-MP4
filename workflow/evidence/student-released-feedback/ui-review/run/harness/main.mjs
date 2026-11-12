import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../../../src/web/styles.css';
import '../../../../../../src/web/student/student.css';
import '../../../../../../src/web/student/workbook.css';
import { AttemptsPanel } from '../../../../../../src/web/student/Attempts';
import { workApi } from '../../../../../../src/web/student/work-model';
import {
  feedbackSummarySchema,
  feedbackVersionSchema,
} from '../../../../../../src/shared/student-feedback';
import { attemptHistorySchema } from '../../../../../../src/shared/student-work';
import { publicationSchema } from '../../../../../../src/shared/instructor-contracts/publication';
import { validateAttempt } from '../../../../../../src/shared/instructor-contracts/submission';
const params = new URLSearchParams(location.search);
const state = params.get('state') || 'released';
document.documentElement.style.colorScheme = params.get('theme') || 'light';
// Producer-private synthetic data. Deliberately excluded from all returned API bodies.
const producerInternal = {
  reason: 'PRIVATE-WITHDRAWAL-REASON',
  approvedRevisionId: 'PRIVATE-APPROVAL',
  privateReference: 'PRIVATE_REFERENCE',
  draft: 'PRIVATE-DRAFT-TEXT',
};
void producerInternal;
const sources = [
  'total = 0\nfor value in [1, 2, 3]:\n    total += value\nprint(total)\n',
  'message = "A synthetic long source line deliberately exceeding one hundred and twenty characters so the browser must wrap it while preserving its single logical line number."\nfor letter in message:\n    print(letter)\nprint("done")\n',
];
const pub = publicationSchema.parse({
  schemaVersion: 1,
  assignmentId: 'alpha',
  assignmentVersionId: 'v1',
  courseId: 'course-a',
  title: 'Synthetic feedback assignment',
  publishedAt: '2026-11-01T12:00:00.000Z',
  deadlineAt: '2026-11-20T12:00:00.000Z',
  questions: sources.map((source, i) => ({
    questionId: 'q' + i,
    questionVersionId: 'qv' + i,
    title: ['Sum values', 'Print a message'][i],
    instructions: 'Inspect the submitted Python source.',
    language: 'python',
    starterCode: source,
    rubricId: 'r' + i,
    rubricVersionId: 'rv' + i,
    criteria: [
      {
        criterionId: 'c' + i,
        comparisonKey: 'k' + i,
        descriptor: ['Correct total', 'Clear output'][i],
        minimumScore: 0,
        maximumScore: 5,
      },
    ],
  })),
});
const hash = async (s) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
const attempt = await validateAttempt(
  {
    schemaVersion: 1,
    attemptId: 'att-review',
    assignmentVersionId: 'v1',
    courseId: 'course-a',
    submittedByUserId: 'synthetic-user',
    submittedAt: '2026-11-10T10:00:00.000Z',
    answers: await Promise.all(
      sources.map(async (source, i) => ({
        submittedAnswerId: 'answer' + i,
        questionVersionId: 'qv' + i,
        rubricVersionId: 'rv' + i,
        draftRevision: 1,
        source,
        sourceHash: await hash(source),
      })),
    ),
  },
  pub,
);
const note = (q, startLine, endLine, explanation) => ({
  submittedAnswerId: 'answer' + q,
  questionVersionId: 'qv' + q,
  rubricVersionId: 'rv' + q,
  criterionId: 'c' + q,
  startLine,
  endLine,
  excerpt: sources[q]
    .split('\n')
    .slice(startLine - 1, endLine)
    .join('\n'),
  explanation,
});
const annotations = [
  note(0, 1, 1, 'The accumulator starts at zero.'),
  note(0, 2, 3, 'The loop adds each value.'),
  note(1, 1, 1, 'The long message stays on one logical source line.'),
];
const bad = [
  { ...note(0, 1, 1, 'Wrong excerpt observation.'), excerpt: 'total = 9' },
  { ...note(0, 4, 99, 'Beyond source observation.'), excerpt: 'print(total)' },
  note(1, 1, 1, 'Valid long-line observation.'),
];
const release = (v, s = 'released') => ({
  schemaVersion: 1,
  id: 'assessment-review',
  submissionAttemptId: attempt.attemptId,
  assessmentRevisionId: 'revision' + v,
  releaseVersion: v,
  releasedAt: `2026-11-${10 + v}T09:00:00.000Z`,
  state: s,
  criteria: pub.questions.map((q) => ({
    questionVersionId: q.questionVersionId,
    rubricVersionId: q.rubricVersionId,
    criterionId: q.criteria[0].criterionId,
    comparisonKey: q.criteria[0].comparisonKey,
    minimumScore: 0,
    maximumScore: 5,
    score: 4,
    explanation: 'The submitted approach meets most of this criterion.',
  })),
  annotations:
    state === 'released-noannotations'
      ? []
      : state === 'unmatched'
        ? bad
        : annotations,
});
const tomb = (v) => ({
  schemaVersion: 1,
  id: 'assessment-review',
  submissionAttemptId: attempt.attemptId,
  releaseVersion: v,
  state: 'withdrawn',
  withdrawnAt: '2026-11-15T10:00:00.000Z',
});
const currentness = (v, withdrawn) => ({
  schemaVersion: 1,
  assessmentId: 'assessment-review',
  submissionAttemptId: attempt.attemptId,
  availabilityRevision: 3,
  currentReleaseVersion: v,
  withdrawnReleaseVersions: withdrawn,
  checkedAt: '2026-11-12T00:00:00.000Z',
});
const multi = [
  'replaced',
  'withdrawn-historical',
  'withdrawn-current',
].includes(state);
const withdrawn =
  state === 'withdrawn-current'
    ? [2]
    : state === 'withdrawn-historical'
      ? [1]
      : [];
const versions = multi
  ? [
      {
        releaseVersion: 2,
        state: withdrawn.includes(2) ? 'withdrawn' : 'released',
      },
      {
        releaseVersion: 1,
        state: withdrawn.includes(1) ? 'withdrawn' : 'superseded',
      },
    ]
  : [{ releaseVersion: 1, state: 'released' }];
const summary = feedbackSummarySchema.parse(
  state === 'none'
    ? { schemaVersion: 1, state: 'none' }
    : state === 'withdrawn-current'
      ? {
          schemaVersion: 1,
          state: 'withdrawn',
          currentness: currentness(null, withdrawn),
          versions,
        }
      : {
          schemaVersion: 1,
          state: 'released',
          currentness: currentness(multi ? 2 : 1, withdrawn),
          versions,
          release: release(multi ? 2 : 1),
        },
);
const history = attemptHistorySchema.parse({
  schemaVersion: 1,
  items: [0, 1, 2].map((i) => ({
    attemptId: i === 1 ? attempt.attemptId : 'att-' + i,
    assignmentVersionId: 'v1',
    submittedAt: `2026-11-${String(10 - i).padStart(2, '0')}T10:00:00.000Z`,
    answerCount: 2,
    feedbackReleased: i === 1,
  })),
  nextCursor: null,
});
let feedbackCalls = 0;
const reply = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
const fakeFetch = async (input) => {
  const path = String(input);
  if (path === '/api/student/publications/v1') return reply(200, pub);
  if (path === '/api/student/publications/v1/attempts')
    return reply(200, history);
  if (/^\/api\/student\/attempts\/[^/]+$/.test(path))
    return reply(200, attempt);
  const ver = /\/feedback\/(\d+)$/.exec(path);
  if (ver) {
    const v = Number(ver[1]);
    return reply(
      200,
      feedbackVersionSchema.parse(
        withdrawn.includes(v)
          ? tomb(v)
          : release(v, v === 2 ? 'released' : 'superseded'),
      ),
    );
  }
  if (path.endsWith('/feedback')) {
    feedbackCalls++;
    if (state === 'loading') return new Promise(() => {});
    if (state === 'network') throw new TypeError('Synthetic network loss');
    if (state === 'stale' && feedbackCalls === 1)
      return reply(409, {
        error: { code: 'STALE_FEEDBACK', message: 'x', requestId: 'r' },
      });
    if (state === 'expired') return reply(401, {});
    if (state === 'unavailable') return reply(503, {});
    return reply(200, summary);
  }
  return reply(404, {});
};
const api = workApi(fakeFetch);
const reloadKey = {};
function Review() {
  const [openId, onOpen] = useState(
    state === 'history' ? null : attempt.attemptId,
  );
  return h(
    'main',
    { className: 'cw-student cw-wb' },
    h(AttemptsPanel, {
      api,
      versionId: 'v1',
      publication: pub,
      reloadKey,
      openId,
      onOpen,
    }),
  );
}
createRoot(document.getElementById('root')).render(h(Review));
