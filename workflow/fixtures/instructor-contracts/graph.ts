/** Cross-linked synthetic examples; not real accounts, grades or provider results. */
export const examples = [
  {
    schemaVersion: 1,
    userId: 'instructor_demo',
    expiresAt: '2026-11-10T12:00:00.000Z',
  },
  {
    schemaVersion: 1,
    courseId: 'course_demo',
    title: 'Synthetic course',
    role: 'instructor',
  },
  {
    schemaVersion: 1,
    assignmentId: 'assignment_demo',
    assignmentVersionId: 'assignment_v1',
    courseId: 'course_demo',
    title: 'Print one',
    publishedAt: '2026-11-05T06:00:00.000Z',
    deadlineAt: '2026-11-10T12:00:00.000Z',
    questions: [
      {
        questionId: 'question_demo',
        questionVersionId: 'question_v1',
        title: 'Output',
        instructions: 'Print one.',
        language: 'python',
        starterCode: 'print(1)\n',
        rubricId: 'rubric_demo',
        rubricVersionId: 'rubric_v1',
        criteria: [
          {
            criterionId: 'criterion_demo',
            comparisonKey: 'output.constant-one.v1',
            descriptor: 'Prints one',
            minimumScore: 0,
            maximumScore: 5,
          },
        ],
      },
    ],
  },
  {
    schemaVersion: 1,
    attemptId: 'attempt_demo',
    assignmentVersionId: 'assignment_v1',
    courseId: 'course_demo',
    submittedByUserId: 'student_demo',
    submittedAt: '2026-11-06T06:00:00.000Z',
    answers: [
      {
        submittedAnswerId: 'answer_demo',
        questionVersionId: 'question_v1',
        rubricVersionId: 'rubric_v1',
        draftRevision: 1,
        source: 'print(1)\n',
        sourceHash:
          'cc42155088fca5730758db72b2a5bca33112a941dfaa2d43098ec422ce4ea213',
      },
    ],
  },
  {
    schemaVersion: 1,
    id: 'assessment_demo',
    submissionAttemptId: 'attempt_demo',
    assessmentRevisionId: 'assessment_revision_1',
    releaseVersion: 1,
    releasedAt: '2026-11-06T07:00:00.000Z',
    state: 'released',
    criteria: [
      {
        questionVersionId: 'question_v1',
        rubricVersionId: 'rubric_v1',
        criterionId: 'criterion_demo',
        comparisonKey: 'output.constant-one.v1',
        minimumScore: 0,
        maximumScore: 5,
        score: 5,
        explanation: 'The source prints one; code was not executed.',
      },
    ],
    annotations: [
      {
        submittedAnswerId: 'answer_demo',
        questionVersionId: 'question_v1',
        rubricVersionId: 'rubric_v1',
        criterionId: 'criterion_demo',
        startLine: 1,
        endLine: 1,
        excerpt: 'print(1)',
        explanation: 'Static source evidence.',
      },
    ],
  },
  {
    schemaVersion: 1,
    assessmentId: 'assessment_demo',
    submissionAttemptId: 'attempt_demo',
    availabilityRevision: 1,
    currentReleaseVersion: 1,
    withdrawnReleaseVersions: [],
    checkedAt: '2026-11-06T07:01:00.000Z',
  },
  {
    schemaVersion: 1,
    id: 'assessment_demo',
    submissionAttemptId: 'attempt_demo',
    releaseVersion: 1,
    state: 'withdrawn',
    withdrawnAt: '2026-11-06T08:00:00.000Z',
  },
  {
    schemaVersion: 1,
    action: 'assessment-draft',
    courseId: 'course_demo',
    idempotencyKey: 'synthetic_ai_1',
    evidenceRefs: [
      {
        kind: 'submission',
        attemptId: 'attempt_demo',
      },
    ],
    outputTokenLimit: 256,
  },
  {
    schemaVersion: 1,
    requestId: 'ai_request_demo',
    action: 'assessment-draft',
    evidenceKey: 'synthetic_scope_fingerprint_v1',
    status: 'pending',
  },
] as const;

/** Importable invalid payload corpus, independent of the parsers under test. */
export function invalidExamples(): Array<{
  contract: 'C-ID' | 'C-PUB' | 'C-SUB' | 'C-REL' | 'C-AI';
  payload: unknown;
  expectedCode: 'INVALID_CONTRACT';
}> {
  return [
    {
      contract: 'C-ID',
      payload: { ...examples[0], role: 'instructor' },
      expectedCode: 'INVALID_CONTRACT',
    },
    {
      contract: 'C-PUB',
      payload: {
        ...structuredClone(examples[2]),
        privateReference: 'PRIVATE_SYNTHETIC_SENTINEL',
      },
      expectedCode: 'INVALID_CONTRACT',
    },
    {
      contract: 'C-SUB',
      payload: { ...structuredClone(examples[3]), answers: [] },
      expectedCode: 'INVALID_CONTRACT',
    },
    {
      contract: 'C-REL',
      payload: {
        ...structuredClone(examples[4]),
        criteria: examples[4].criteria.map((c) => ({ ...c, score: 1.001 })),
      },
      expectedCode: 'INVALID_CONTRACT',
    },
    {
      contract: 'C-AI',
      payload: { ...structuredClone(examples[7]), outputTokenLimit: 0 },
      expectedCode: 'INVALID_CONTRACT',
    },
  ];
}
export const fixtureGraph = {
  session: examples[0],
  membership: examples[1],
  publication: examples[2],
  attempt: examples[3],
  release: examples[4],
  currentness: examples[5],
  withdrawn: examples[6],
  aiRequest: examples[7],
  aiPending: examples[8],
} as const;
