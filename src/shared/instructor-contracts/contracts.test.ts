import { invalidExamples } from '../../../workflow/fixtures/instructor-contracts/graph';
import { vi } from 'vitest';
import type { GatewayTestPorts } from '../../../src/server/instructor/ports/contracts';
import { driveGateway } from '../../../workflow/fixtures/instructor-contracts/adapters';
import { validateAssessmentDraft, type AssessmentDraft } from './ai';
import { toSafeError } from './schema';
import { syntheticReleaseProtocol } from '../../../workflow/fixtures/instructor-contracts/adapters';
import { releaseProtocolContractSuite } from '../../../workflow/contracts/instructor-contracts';
import { describe, it, expect } from 'vitest';
import { examples } from '../../../workflow/fixtures/instructor-contracts/graph';
import { syntheticIdentity } from '../../../workflow/fixtures/instructor-contracts/adapters';
import {
  identityContractSuite,
  publicationContractSuite,
  submissionContractSuite,
  releaseContractSuite,
  gatewayContractSuite,
} from '../../../workflow/contracts/instructor-contracts';
import {
  schema,
  score,
  hundredths,
  timestamp,
  source,
  canonicalizeSource,
  sourceHash,
  excerpt,
  ContractError,
  BoundaryError,
} from './schema';
import {
  sessionViewSchema,
  courseMembershipSchema,
  safeErrorSchema,
} from './identity';
import {
  publicationSchema,
  projectPublication,
  toLegacyQuestion,
} from './publication';
import { attemptSchema, validateAttempt } from './submission';
import {
  releaseSchema,
  withdrawnSchema,
  currentnessSchema,
  projectRelease,
  validateRelease,
  assertApproval,
  validateFeedbackElements,
} from './release';
import {
  aiRequestSchema,
  gatewayOutcomeSchema,
  assessmentDraftSchema,
  usageSchema,
  publicAIStatusSchema,
  projectAIStatus,
} from './ai';
const graph = () => ({
  publication: publicationSchema.parse(examples[2]),
  attempt: attemptSchema.parse(examples[3]),
  release: releaseSchema.parse(examples[4]),
  current: currentnessSchema.parse(examples[5]),
  withdrawn: withdrawnSchema.parse(examples[6]),
});
identityContractSuite('Synthetic', syntheticIdentity);
publicationContractSuite('Synthetic', () => ({
  expected: publicationSchema.parse(examples[2]),
  privateRecord: () => ({
    ...structuredClone(examples[2]),
    state: 'published',
    auditSecret: 'hidden',
    questions: examples[2].questions.map((q) => ({
      ...q,
      privateReference: 'PRIVATE_SYNTHETIC_SENTINEL',
      criteria: q.criteria.map((c) => ({ ...c, internalNotes: 'hidden' })),
    })),
  }),
  project: projectPublication,
}));
submissionContractSuite('Synthetic', graph);
releaseContractSuite('Synthetic', () => ({
  ...graph(),
  project: projectRelease,
}));
gatewayContractSuite('Synthetic', () => {
  const g = graph();
  return {
    ...g,
    request: examples[7],
    payload: {
      kind: 'assessment-draft',
      codeExecuted: false,
      criteria: g.release.criteria,
      annotations: g.release.annotations,
      reviewFlags: [],
    },
  };
});
describe('CON-02 runtime primitive and schema boundaries', () => {
  for (const value of [
    NaN,
    Infinity,
    -Infinity,
    -0,
    -1,
    1000.01,
    1.001,
    '1',
    null,
  ])
    it('rejects non-point value ' + String(value), () =>
      expect(() => score(value, '$.score')).toThrow(),
    );
  it('keeps numeric point units exact', () => {
    expect(score(0, '$')).toBe(0);
    expect(score(999.99, '$')).toBe(999.99);
    expect(hundredths(0.29) + hundredths(0.01)).toBe(30);
    expect(score(1000, '$')).toBe(1000);
  });
  it('rejects invalid/noncanonical calendar dates', () => {
    for (const v of [
      '2026-02-30T00:00:00.000Z',
      '2026-11-05T00:00:00Z',
      '2026-11-05T00:00:00.000+00:00',
    ])
      expect(() => timestamp(v, '$')).toThrow();
    expect(timestamp('2028-02-29T00:00:00.000Z', '$')).toContain('02-29');
  });
  it('canonicalizes only at ingress and preserves source bytes/final LF', async () => {
    expect(canonicalizeSource('\tprint(1)\r\n\r')).toBe('\tprint(1)\n\n');
    expect(() => source('print(1)\r\n')).toThrow();
    expect(await sourceHash('print(1)\n')).toBe(
      examples[3].answers[0].sourceHash,
    );
    expect(excerpt('', 1, 1)).toBe('');
    expect(excerpt('a\n', 2, 2)).toBe('');
    expect(excerpt('a\nb\n', 1, 2)).toBe('a\nb');
    expect(() => excerpt('a', 1, 2)).toThrow();
    expect(await sourceHash('é\n')).not.toBe(await sourceHash('e\n'));
  });
  it('checks UTF-8 limits, NUL and ill-formed Unicode', () => {
    expect(source('é'.repeat(16384))).toHaveLength(16384);
    for (const v of ['é'.repeat(16385), '\0', '\ud800', '\udc00'])
      expect(() => canonicalizeSource(v)).toThrow();
  });
  it('does not invoke getters/toJSON or accept class/cyclic/oversized input', () => {
    let accessed = false;
    const dangerous = {
      get schemaVersion() {
        accessed = true;
        return 1;
      },
    };
    expect(sessionViewSchema.safeParse(dangerous).success).toBe(false);
    expect(accessed).toBe(false);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(sessionViewSchema.safeParse(cycle).success).toBe(false);
    expect(sessionViewSchema.safeParse(new Date()).success).toBe(false);
    const passthrough = schema((v) => v);
    expect(passthrough.safeParse('x'.repeat(1048577)).success).toBe(false);
    expect(passthrough.safeParse({ toJSON: () => ({}) }).success).toBe(false);
  });
  it('returns detached data and issues without private field names/values', () => {
    const value = {
      ...examples[0],
      ['PRIVATE_PROMPT_SENTINEL']: 'PRIVATE_SOURCE_SENTINEL',
    };
    const result = sessionViewSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain('PRIVATE_');
    const session = sessionViewSchema.parse(examples[0]);
    session.userId = 'changed';
    expect(examples[0].userId).toBe('instructor_demo');
    expect(courseMembershipSchema.parse(examples[1]).role).toBe('instructor');
    expect(
      safeErrorSchema.parse({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied.',
          requestId: 'safe_request',
        },
      }).error.code,
    ).toBe('FORBIDDEN');
  });
  it('rejects unsupported version, empty/long/control IDs and safe issue overflow', () => {
    for (const v of [
      { ...examples[0], schemaVersion: 2 },
      { ...examples[0], userId: '' },
      { ...examples[0], userId: 'x'.repeat(129) },
      { ...examples[0], userId: 'a\nb' },
    ])
      expect(sessionViewSchema.safeParse(v).success).toBe(false);
    expect(
      safeErrorSchema.safeParse({
        error: {
          code: 'FORBIDDEN',
          message: 'Denied',
          requestId: 'r',
          issues: Array.from({ length: 51 }, () => ({
            path: '$',
            code: 'invalid',
          })),
        },
      }).success,
    ).toBe(false);
  });
});
describe('SUB-01 publication and immutable evidence policies', () => {
  it('maps legacy id to the immutable version, not logical question id', () => {
    const p = graph().publication;
    const q = toLegacyQuestion(p.questions[0], p.assignmentVersionId);
    expect(q.id).toBe('question_v1');
    expect(q.id).not.toBe('question_demo');
    expect(Object.keys(q).sort()).toEqual(
      [
        'assignmentVersionId',
        'id',
        'instructions',
        'language',
        'starterCode',
        'title',
      ].sort(),
    );
  });
  for (const issue of [
    'key',
    'bounds',
    'question',
    'date',
    'private',
    'size',
    'unpublished',
  ] as const)
    it('rejects publication ' + issue, () => {
      const p = graph().publication;
      if (issue === 'key')
        p.questions[0].criteria.push({
          ...p.questions[0].criteria[0],
          criterionId: 'other',
        });
      if (issue === 'bounds') p.questions[0].criteria[0].minimumScore = 5;
      if (issue === 'question')
        p.questions.push(structuredClone(p.questions[0]));
      if (issue === 'date') p.deadlineAt = p.publishedAt;
      if (issue === 'private')
        Object.assign(p.questions[0], { privateReference: 'hidden' });
      if (issue === 'size') p.questions[0].instructions = 'x'.repeat(16385);
      if (issue === 'unpublished')
        expect(() => projectPublication({ ...p, state: 'draft' })).toThrow();
      else expect(publicationSchema.safeParse(p).success).toBe(false);
    });
  it('new publication fixtures cannot rewrite old identities, deadlines or pinned attempts', async () => {
    const old = graph(),
      copy = structuredClone(old),
      next = structuredClone(old.publication);
    next.assignmentVersionId = 'assignment_v2';
    next.deadlineAt = '2026-11-11T12:00:00.000Z';
    next.questions[0].questionVersionId = 'question_v2';
    next.questions[0].rubricVersionId = 'rubric_v2';
    publicationSchema.parse(next);
    expect(old).toEqual(copy);
    await validateAttempt(old.attempt, old.publication);
    await expect(validateAttempt(old.attempt, next)).rejects.toThrow();
  });
});
describe('GRADE-04 release joins, approval and history policies', () => {
  it('validates exact immutable answer evidence', async () => {
    const g = graph();
    expect(await validateRelease(g.release, g.publication, g.attempt)).toEqual(
      g.release,
    );
  });
  for (const issue of [
    'missing',
    'duplicate',
    'rubric',
    'comparison',
    'excerpt',
    'answer',
    'attempt',
    'score',
  ] as const)
    it('rejects release ' + issue, async () => {
      const g = graph(),
        r = g.release;
      if (issue === 'missing') r.criteria = [];
      if (issue === 'duplicate') r.criteria.push({ ...r.criteria[0] });
      if (issue === 'rubric') r.criteria[0].rubricVersionId = 'foreign';
      if (issue === 'comparison') r.criteria[0].comparisonKey = 'other';
      if (issue === 'excerpt') r.annotations[0].excerpt = 'print(2)';
      if (issue === 'answer') r.annotations[0].submittedAnswerId = 'foreign';
      if (issue === 'attempt') r.submissionAttemptId = 'foreign';
      if (issue === 'score') r.criteria[0].score = 5.01;
      await expect(
        validateRelease(r, g.publication, g.attempt),
      ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
    });
  it('disambiguates same comparison key on two different questions', async () => {
    const g = graph(),
      q = structuredClone(g.publication.questions[0]);
    q.questionId = 'q2';
    q.questionVersionId = 'qv2';
    q.rubricId = 'r2';
    q.rubricVersionId = 'rv2';
    g.publication.questions.push(q);
    g.attempt.answers.push({
      ...g.attempt.answers[0],
      submittedAnswerId: 'a2',
      questionVersionId: 'qv2',
      rubricVersionId: 'rv2',
    });
    g.release.criteria.push({
      ...g.release.criteria[0],
      questionVersionId: 'qv2',
      rubricVersionId: 'rv2',
    });
    await expect(
      validateRelease(g.release, g.publication, g.attempt),
    ).resolves.toBeDefined();
    g.release.annotations[0].questionVersionId = 'qv2';
    await expect(
      validateRelease(g.release, g.publication, g.attempt),
    ).rejects.toThrow();
  });
  it('binds approval and release command to exact revision/availability', () => {
    const command = {
      expectedAssessmentRevisionId: 'v1',
      approvedRevisionId: 'v1',
      actualAssessmentRevisionId: 'v1',
      expectedAvailabilityRevision: 1,
      actualAvailabilityRevision: 1,
    };
    expect(() => assertApproval(command)).not.toThrow();
    for (const changed of [
      { approvedRevisionId: 'v0' },
      { actualAssessmentRevisionId: 'v2' },
      { actualAvailabilityRevision: 2 },
    ])
      expect(() => assertApproval({ ...command, ...changed })).toThrow(
        BoundaryError,
      );
  });
});
describe('AI-05 request/result/telemetry contracts', () => {
  for (const change of [
    { outputTokenLimit: 0 },
    { outputTokenLimit: 0.5 },
    { evidenceRefs: [] },
    {
      evidenceRefs: [
        { kind: 'submission', attemptId: 'a' },
        { kind: 'submission', attemptId: 'a' },
      ],
    },
    { providerUrl: 'https://untrusted.invalid' },
    {
      evidenceRefs: [{ kind: 'release', assessmentId: 'a', releaseVersion: 1 }],
    },
  ])
    it('rejects malformed assessment request ' + JSON.stringify(change), () =>
      expect(
        aiRequestSchema.safeParse({ ...examples[7], ...change }).success,
      ).toBe(false),
    );
  it('uses exact numeric release versions and rejects duplicate/cross-action refs', () => {
    const request = {
      schemaVersion: 1,
      action: 'progress-explanation',
      courseId: 'course_demo',
      idempotencyKey: 'progress',
      outputTokenLimit: 1,
      evidenceRefs: [
        { kind: 'release', assessmentId: 'assessment_demo', releaseVersion: 1 },
      ],
    };
    expect(aiRequestSchema.parse(request).action).toBe('progress-explanation');
    for (const releaseVersion of [0, 0.5, '1'])
      expect(
        aiRequestSchema.safeParse({
          ...request,
          evidenceRefs: [{ ...request.evidenceRefs[0], releaseVersion }],
        }).success,
      ).toBe(false);
    expect(
      aiRequestSchema.safeParse({
        ...request,
        evidenceRefs: [...request.evidenceRefs, ...request.evidenceRefs],
      }).success,
    ).toBe(false);
  });
  it('requires success validator and closed discriminated outcomes/public statuses', () => {
    const g = graph(),
      payload = {
        kind: 'assessment-draft',
        codeExecuted: false,
        criteria: g.release.criteria,
        annotations: g.release.annotations,
        reviewFlags: [],
      };
    const success = {
      ...examples[8],
      status: 'succeeded',
      promptVersion: 'synthetic_prompt',
      modelVersion: 'synthetic_model',
      latencyMs: 1,
      retries: 0,
      usage: { status: 'unavailable' },
      payload,
    };
    expect(
      gatewayOutcomeSchema('assessment-draft').safeParse(success).success,
    ).toBe(false);
    const validated = gatewayOutcomeSchema(
      'assessment-draft',
      assessmentDraftSchema,
    ).parse(success);
    expect(projectAIStatus(validated)).toEqual({
      schemaVersion: 1,
      requestId: 'ai_request_demo',
      status: 'succeeded',
    });
    expect(
      publicAIStatusSchema.safeParse({
        ...projectAIStatus(validated),
        promptVersion: 'private',
      }).success,
    ).toBe(false);
    expect(
      gatewayOutcomeSchema('assessment-draft', assessmentDraftSchema).safeParse(
        { ...success, status: 'failed', safeCode: 'UPSTREAM_UNAVAILABLE' },
      ).success,
    ).toBe(false);
    expect(
      gatewayOutcomeSchema(
        'progress-explanation',
        assessmentDraftSchema,
      ).safeParse(success).success,
    ).toBe(false);
    expect(
      gatewayOutcomeSchema(
        'progress-explanation',
        assessmentDraftSchema,
      ).safeParse({ ...success, action: 'progress-explanation' }).success,
    ).toBe(false);
    expect(
      usageSchema.safeParse({
        status: 'reported',
        inputTokens: -1,
        outputTokens: 1,
      }).success,
    ).toBe(false);
    expect(usageSchema.parse({ status: 'unavailable' })).toEqual({
      status: 'unavailable',
    });
  });
  it('checks assessment output domain evidence separately from transport shape', async () => {
    const g = graph(),
      d = assessmentDraftSchema.parse({
        kind: 'assessment-draft',
        codeExecuted: false,
        criteria: g.release.criteria,
        annotations: g.release.annotations,
        reviewFlags: [],
      });
    d.annotations[0].excerpt = 'fabricated';
    await expect(
      validateFeedbackElements(
        d.criteria,
        d.annotations,
        g.publication,
        g.attempt,
      ),
    ).rejects.toBeInstanceOf(ContractError);
  });
});

releaseProtocolContractSuite('Synthetic', () => {
  const g = graph();
  return syntheticReleaseProtocol(g.release, g.current);
});
describe('additional unknown-input and safe-error refusal cases', () => {
  it('approval and semantic feedback reject getters, class instances and mutated awards', async () => {
    let called = false;
    expect(() =>
      assertApproval({
        get expectedAssessmentRevisionId() {
          called = true;
          return 'v1';
        },
      }),
    ).toThrow();
    expect(called).toBe(false);
    const g = graph();
    g.release.criteria[0].score = NaN;
    await expect(
      validateFeedbackElements(
        g.release.criteria,
        g.release.annotations,
        g.publication,
        g.attempt,
      ),
    ).rejects.toThrow();
    expect(() => assertApproval(new Date())).toThrow();
  });
  it('safe errors hide raw exceptions and withdrawal reasons', () => {
    const e = toSafeError(new Error('PRIVATE_SOURCE_SENTINEL'), 'request_demo');
    expect(safeErrorSchema.parse(e).error.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(JSON.stringify(e)).not.toContain('PRIVATE_');
  });
});

describe('AI-04 synthetic seam interleavings', () => {
  function setup() {
    const g = graph();
    let now = 0,
      revoked = false,
      evidence = 'before';
    const transport = vi.fn(async () => ({
      kind: 'assessment-draft',
      codeExecuted: false,
      criteria: g.release.criteria,
      annotations: g.release.annotations,
      reviewFlags: [],
    }));
    const ports: GatewayTestPorts<'assessment-draft', AssessmentDraft> = {
      authorize: async () => {
        if (revoked) throw new BoundaryError('NOT_FOUND');
      },
      config: { verified: true, maxOutputTokens: 512 },
      validate: (v) => validateAssessmentDraft(v, g.publication, g.attempt),
      resolveEvidence: async () => evidence,
      admission: async () => {},
      requestRecords: { begin: async () => 'synthetic_request' },
      clock: () => now,
      deadlineMs: 1000,
      transport,
    };
    return {
      ports,
      transport,
      advance: () => {
        now = 1000;
      },
      revoke: () => {
        revoked = true;
      },
      withdraw: () => {
        evidence = 'after';
      },
    };
  }
  it('never invokes transport when request-record delay consumes the deadline', async () => {
    const s = setup();
    s.ports.requestRecords.begin = async () => {
      s.advance();
      return 'synthetic_request';
    };
    await expect(
      driveGateway('assessment-draft', examples[7], s.ports),
    ).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
    expect(s.transport).not.toHaveBeenCalled();
  });
  for (const mutation of ['revoke', 'withdraw', 'advance'] as const)
    it(
      'rejects state change during awaited domain validation: ' + mutation,
      async () => {
        const s = setup(),
          validate = s.ports.validate!;
        s.ports.validate = async (v) => {
          const result = await validate(v);
          s[mutation]();
          return result;
        };
        await expect(
          driveGateway('assessment-draft', examples[7], s.ports),
        ).rejects.toMatchObject({
          code:
            mutation === 'revoke'
              ? 'NOT_FOUND'
              : mutation === 'withdraw'
                ? 'STALE_EVIDENCE'
                : 'UPSTREAM_UNAVAILABLE',
        });
      },
    );
});

describe('CON-07 importable invalid fixture corpus', () => {
  for (const fixture of invalidExamples())
    it('rejects exact ' + fixture.contract + ' invalid payload', () => {
      const parser = {
        'C-ID': sessionViewSchema,
        'C-PUB': publicationSchema,
        'C-SUB': attemptSchema,
        'C-REL': releaseSchema,
        'C-AI': aiRequestSchema,
      }[fixture.contract];
      expect(parser!.safeParse(fixture.payload).success).toBe(false);
      try {
        parser!.parse(fixture.payload);
      } catch (e) {
        expect(e).toMatchObject({ code: fixture.expectedCode });
        return;
      }
      throw new Error('Invalid fixture accepted');
    });
});
