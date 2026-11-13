import { examples } from '../fixtures/instructor-contracts/graph';

document.querySelector('#preview-theme').addEventListener('change', (event) => {
  document.documentElement.style.colorScheme = event.target.value;
});

// Isolated, in-memory responses. Never forward an API request to a real service.
if (location.hostname !== '127.0.0.1' || location.port !== '5182')
  throw new Error('Synthetic preview is loopback-only.');
const now = '2026-11-13T02:00:00.000Z';
const course = { id: 'course_demo', name: 'CS1010 · Programming methodology' };
const publication = structuredClone(examples[2]);
publication.title = 'Assignment 3 · Loops and accumulators';
publication.deadlineAt = '2026-11-25T15:59:00.000Z';
publication.questions[0].title = 'A running total';
publication.questions[0].instructions =
  'Calculate the total of the values in a list. Explain your approach and preserve the input.';
publication.questions[0].starterCode =
  'def total(values):\n    result = 0\n    for value in values:\n        result += value\n    return result\n';
publication.questions[0].criteria[0].descriptor =
  'Accumulates every input value';
const payload = {
  title: publication.title,
  deadlineAt: publication.deadlineAt,
  questions: publication.questions.map(
    ({ questionVersionId, rubricVersionId, ...q }) => {
      void questionVersionId;
      void rubricVersionId;
      return { ...q, privateReference: '' };
    },
  ),
};
let draft = {
  schemaVersion: 1,
  assignmentId: publication.assignmentId,
  courseId: course.id,
  revision: 2,
  createdAt: now,
  updatedAt: now,
  payload,
};
const view = {
  session: {
    schemaVersion: 1,
    userId: 'synthetic-user',
    expiresAt: '2026-12-01T00:00:00.000Z',
  },
  email: 'instructor@example.edu',
  administrator: true,
  csrfToken: 'synthetic-ui-csrf',
};
const contexts = {
  workspaces: ['instructor', 'student'].map((role) => ({
    role,
    courses: [course],
    nextCursor: null,
  })),
};
const summary = () => ({
  assignmentId: draft.assignmentId,
  courseId: course.id,
  title: draft.payload.title,
  revision: draft.revision,
  updatedAt: now,
});
const history = [
  {
    assignmentVersionId: publication.assignmentVersionId,
    publicationNumber: 1,
    sourceDraftRevision: 1,
    publishedAt: publication.publishedAt,
  },
];
const sha = async (source) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
const sourceHash = await sha(publication.questions[0].starterCode);
const attempt = structuredClone(examples[3]);
attempt.submittedByUserId = view.session.userId;
attempt.answers[0].source = publication.questions[0].starterCode;
attempt.answers[0].sourceHash = sourceHash;
const assessment = {
  head: {
    id: 'assessment_demo',
    courseId: course.id,
    attemptId: attempt.attemptId,
    publicationId: publication.assignmentVersionId,
    evidence: 'a'.repeat(64) + ':' + 'b'.repeat(64),
    headRevisionId: 'revision_demo',
    approvedRevisionId: null,
    availabilityRevision: 1,
    currentReleaseVersion: null,
    maximumReleaseVersion: 0,
  },
  revision: {
    id: 'revision_demo',
    assessmentId: 'assessment_demo',
    parentRevisionId: null,
    actorId: view.session.userId,
    createdAt: now,
    provenance: 'manual',
    feedback: {
      criteria: [
        {
          questionVersionId: 'question_v1',
          rubricVersionId: 'rubric_v1',
          criterionId: 'criterion_demo',
          score: null,
          explanation: '',
        },
      ],
      annotations: [],
    },
  },
  history: [],
  historyCursor: null,
  releases: [],
  publication,
  attempt,
};
const releasedFeedback = structuredClone(examples[4]);
releasedFeedback.criteria[0].explanation =
  'The accumulator adds every value. This feedback is a synthetic UI fixture.';
releasedFeedback.annotations = [];
const feedbackSummary = {
  schemaVersion: 1,
  state: 'released',
  currentness: structuredClone(examples[5]),
  versions: [{ releaseVersion: 1, state: 'released' }],
  release: releasedFeedback,
};
const people = [
  {
    email: 'alex@example.edu',
    userId: 'alex',
    isCoordinator: true,
    activeRoles: ['instructor'],
    pendingRoles: [],
    invitationId: null,
    sendState: null,
  },
  {
    email: 'sam@example.edu',
    userId: 'sam',
    isCoordinator: false,
    activeRoles: ['student'],
    pendingRoles: [],
    invitationId: null,
    sendState: null,
  },
  {
    email: 'avery.very.long.student.name@example.edu',
    userId: null,
    isCoordinator: false,
    activeRoles: [],
    pendingRoles: ['student'],
    invitationId: 'invite_demo',
    sendState: 'failed',
  },
];
window.fetch = async (input, options = {}) => {
  const url = new URL(
    typeof input === 'string' ? input : input.url,
    location.origin,
  );
  const p = url.pathname,
    method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : {};
  const json = (value) => Response.json(value);
  if (p === '/api/auth/bootstrap')
    return json({ configured: true, csrfToken: view.csrfToken });
  if (p === '/api/auth/session')
    return location.pathname === '/sign-in'
      ? Response.json({}, { status: 401 })
      : json(view);
  if (p === '/api/auth/workspace')
    return json({ state: 'authorized', destination: '/workspace' });
  if (p === '/api/auth/people')
    return json({ items: people, nextCursor: null });
  if (p === '/api/courses/contexts') return json(contexts);
  if (p === '/api/courses/creation') return json({ canCreate: true });
  if (p === '/api/courses') return json({ courses: [course] });
  if (p === '/api/courses/contexts/verify') return json({ courses: [course] });
  if (p === '/api/courses/' + course.id) return json({ course });
  if (p === '/api/instructor/assignments' && method === 'GET')
    return json({
      items: [
        summary(),
        {
          ...summary(),
          assignmentId: 'assignment_other',
          title: 'Assignment 4 · Functions and decomposition',
        },
      ],
      nextCursor: null,
    });
  if (p.endsWith('/draft')) {
    if (method === 'PUT')
      draft = { ...draft, revision: draft.revision + 1, payload: body.payload };
    return json(draft);
  }
  if (p.endsWith('/publications')) return json(history);
  if (p.endsWith('/private'))
    return json({ ...history[0], publication, privateReferences: [] });
  if (p === '/api/instructor/review')
    return json({
      items: [summary()],
      nextCursor: null,
      available: true,
      sampleMode: false,
    });
  if (p.includes('/review/assignments/'))
    return json({
      assignmentId: draft.assignmentId,
      title: draft.payload.title,
      courseId: course.id,
      publications: history,
      available: true,
      sampleMode: false,
    });
  if (p.includes('/review/publications/'))
    return json({
      publication,
      available: true,
      sampleMode: false,
      attempts: [
        {
          attemptId: 'attempt_demo',
          submittedAt: now,
          label: 'Sam · Attempt 1',
          sample: false,
        },
      ],
    });
  if (p.endsWith('/ai-candidate'))
    return json({
      status: 'succeeded',
      candidateId: 'candidate_demo',
      promptVersion: 'synthetic-ui',
      modelVersion: 'fixture',
      payload: {
        kind: 'assessment-draft',
        codeExecuted: false,
        criteria: releasedFeedback.criteria,
        annotations: [],
        reviewFlags: ['Synthetic UI fixture only. Review manually.'],
      },
    });
  if (p === '/api/instructor/assessments/assessment_demo' && method === 'GET')
    return json(assessment);
  if (p.includes('/assignment-status'))
    return json({
      schemaVersion: 1,
      items: [
        { assignmentId: publication.assignmentId, status: 'feedback-released' },
      ],
    });
  if (p.includes('/api/student/courses/'))
    return json({
      schemaVersion: 1,
      course,
      items: [
        {
          assignmentId: publication.assignmentId,
          assignmentVersionId: publication.assignmentVersionId,
          title: publication.title,
          publishedAt: publication.publishedAt,
          deadlineAt: publication.deadlineAt,
        },
      ],
      nextCursor: null,
    });
  if (p.startsWith('/api/student/publications/')) {
    if (p.endsWith('/work'))
      return json({
        schemaVersion: 1,
        assignmentId: publication.assignmentId,
        assignmentVersionId: publication.assignmentVersionId,
        latestAssignmentVersionId: publication.assignmentVersionId,
        deadlineAt: publication.deadlineAt,
        attemptCount: 1,
        questions: [
          {
            questionVersionId: publication.questions[0].questionVersionId,
            position: 0,
            revision: 0,
            source: publication.questions[0].starterCode,
            sourceHash,
            updatedAt: null,
          },
        ],
      });
    if (p.endsWith('/attempts'))
      return json({
        schemaVersion: 1,
        items: [
          {
            attemptId: attempt.attemptId,
            assignmentVersionId: publication.assignmentVersionId,
            submittedAt: attempt.submittedAt,
            answerCount: 1,
            feedbackReleased: true,
          },
        ],
        nextCursor: null,
      });
    return json(publication);
  }
  if (p === '/api/student/attempts/' + attempt.attemptId) return json(attempt);
  if (p === '/api/student/attempts/' + attempt.attemptId + '/feedback')
    return json(feedbackSummary);
  if (p === '/api/student/attempts/' + attempt.attemptId + '/feedback/1')
    return json(releasedFeedback);
  // Unimplemented mutations fail visibly instead of pretending to persist or send.
  return Response.json(
    {
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Synthetic preview does not implement this action.',
        requestId: 'ui-preview',
      },
    },
    { status: 503 },
  );
};
if (location.pathname === '/preview/conflict') {
  const [{ createElement }, { createRoot }, { ConflictWindow }] =
    await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('../../src/web/student/ConflictWindow'),
    ]);
  await import('../../src/web/styles.css');
  await import('../../src/web/student/workbook.css');
  createRoot(document.querySelector('#root')).render(
    createElement(
      'main',
      { className: 'cw-shell cw-wb' },
      createElement(ConflictWindow, {
        title: 'Save conflict',
        mine: 'total = 3\n',
        saved: {
          revision: 2,
          source: 'total = 4\n',
          sourceHash: await sha('total = 4\n'),
        },
        recovered: false,
        onKeepMine: () => {},
        onUseSaved: () => {},
      }),
    ),
  );
} else {
  await import('../../src/web/main');
}
