import {
  releaseCommandSchema,
  withdrawalCommandSchema,
  withdrawnSchema,
} from '../../../src/shared/instructor-contracts/release';
/** Synthetic factories only. Not imported by production routing. No domain storage. */
import type {
  IdentityCoursePort,
  TrustedPrincipal,
  GatewayTestPorts,
} from '../../../src/server/instructor/ports/contracts';
import {
  BoundaryError,
  integer,
} from '../../../src/shared/instructor-contracts/schema';
import {
  aiRequestSchema,
  gatewayOutcomeSchema,
  type AIAction,
  type AIRequestInput,
} from '../../../src/shared/instructor-contracts/ai';
export type IdentityScenario =
  'authorized' | 'missing' | 'foreign-course' | 'revoked' | 'bad-origin';
export function syntheticIdentity(scenario: IdentityScenario = 'authorized') {
  let revoked = scenario === 'revoked';
  // Capability constructed inside the injected test adapter, never from client JSON.
  const principal = {
    userId: 'instructor_demo',
    sessionHandle: 'synthetic-session',
  } as TrustedPrincipal;
  const live = (p: TrustedPrincipal) => {
    if (p !== principal) throw new BoundaryError('UNAUTHENTICATED');
    if (revoked) throw new BoundaryError('NOT_FOUND');
  };
  const identity: IdentityCoursePort = {
    async requireSession() {
      if (scenario === 'missing') throw new BoundaryError('UNAUTHENTICATED');
      live(principal);
      return principal;
    },
    async requireCourse(p, course) {
      live(p);
      if (course !== 'course_demo' || scenario === 'foreign-course')
        throw new BoundaryError('NOT_FOUND');
    },
    async requireObject(p, target) {
      live(p);
      if (target.id.startsWith('foreign') || scenario === 'foreign-course')
        throw new BoundaryError('NOT_FOUND');
      return { courseId: 'course_demo' };
    },
    async requireMutationOrigin(request) {
      if (
        scenario === 'bad-origin' ||
        request.headers.get('origin') !== 'https://fixture.invalid'
      )
        throw new BoundaryError('FORBIDDEN');
    },
  };
  return {
    identity,
    revoke: () => {
      revoked = true;
    },
  };
}
/** Test driver to exercise injected seam order, not a provider, quota service or gateway. */
export async function driveGateway<A extends AIAction, T>(
  action: A,
  raw: unknown,
  ports: GatewayTestPorts<A, T>,
) {
  await ports.authorize();
  const parsed = aiRequestSchema.parse(raw);
  if (parsed.action !== action) throw new BoundaryError('INVALID_CONTRACT');
  // Discriminant checked above; generic correlation alone grants no runtime trust.
  const input = parsed as AIRequestInput<A>;
  if (!ports.config?.verified || !ports.validate)
    throw new BoundaryError('AI_DISABLED');
  integer(ports.config.maxOutputTokens, '$.config.maxOutputTokens');
  if (input.outputTokenLimit > ports.config.maxOutputTokens)
    throw new BoundaryError('RATE_LIMITED');
  const started = ports.clock();
  const beforeDeadline = () => {
    if (
      !Number.isFinite(ports.deadlineMs) ||
      ports.deadlineMs <= 0 ||
      ports.clock() - started >= ports.deadlineMs
    )
      throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  };
  beforeDeadline();
  const evidenceKey = await ports.resolveEvidence(input);
  await ports.admission(input);
  beforeDeadline();
  const requestId = await ports.requestRecords.begin(
    input.idempotencyKey,
    evidenceKey,
  );
  beforeDeadline();
  const result = await ports.transport(input);
  beforeDeadline();
  const payload = await ports.validate(result);
  await ports.authorize();
  const again = await ports.resolveEvidence(input);
  beforeDeadline();
  if (again !== evidenceKey) throw new BoundaryError('STALE_EVIDENCE');
  return gatewayOutcomeSchema(action, {
    parse: () => payload,
    safeParse: () => ({ success: true as const, data: payload }),
  }).parse({
    schemaVersion: 1,
    requestId,
    action,
    evidenceKey,
    status: 'succeeded',
    promptVersion: 'synthetic-policy-v1',
    modelVersion: 'synthetic-model-v1',
    latencyMs: ports.clock() - started,
    retries: 0,
    usage: { status: 'unavailable' },
    payload,
  });
}

/** Small protocol model for conformance tests only. Not application domain storage. */
export function syntheticReleaseProtocol(
  base: import('../../../src/shared/instructor-contracts/release').Release,
  current: import('../../../src/shared/instructor-contracts/release').Currentness,
) {
  let state = structuredClone(current);
  const records = new Map<string, { fingerprint: string; result: unknown }>();
  let maximumRelease = base.releaseVersion;
  const replay = (key: string, fingerprint: string) => {
    const stored = records.get(key);
    if (stored && stored.fingerprint !== fingerprint)
      throw new BoundaryError('IDEMPOTENCY_CONFLICT');
    return stored;
  };
  const guard = (assessmentId: string, expected: number) => {
    if (assessmentId !== state.assessmentId)
      throw new BoundaryError('NOT_FOUND');
    if (expected !== state.availabilityRevision)
      throw new BoundaryError('REVISION_CONFLICT');
  };
  return {
    async release(raw: unknown) {
      const c = releaseCommandSchema.parse(raw),
        key = 'synthetic-instructor/course/release/' + c.idempotencyKey,
        fingerprint = JSON.stringify(c);
      const old = replay(key, fingerprint);
      if (old) return structuredClone(old.result) as typeof base;
      guard(c.assessmentId, c.expectedAvailabilityRevision);
      if (c.assessmentRevisionId !== 'reviewed_revision_2')
        throw new BoundaryError('REVISION_CONFLICT');
      const result = {
        ...structuredClone(base),
        assessmentRevisionId: c.assessmentRevisionId,
        releaseVersion: ++maximumRelease,
      };
      state = {
        ...state,
        currentReleaseVersion: result.releaseVersion,
        availabilityRevision: state.availabilityRevision + 1,
      };
      records.set(key, { fingerprint, result });
      return structuredClone(result);
    },
    async withdraw(raw: unknown) {
      const c = withdrawalCommandSchema.parse(raw),
        key = 'synthetic-instructor/course/withdraw/' + c.idempotencyKey,
        fingerprint = JSON.stringify(c);
      const old = replay(key, fingerprint);
      if (old)
        return structuredClone(
          old.result,
        ) as import('../../../src/shared/instructor-contracts/release').Withdrawn;
      guard(c.assessmentId, c.expectedAvailabilityRevision);
      if (
        c.releaseVersion > maximumRelease ||
        state.withdrawnReleaseVersions.includes(c.releaseVersion)
      )
        throw new BoundaryError('REVISION_CONFLICT');
      const result = withdrawnSchema.parse({
        schemaVersion: 1,
        id: c.assessmentId,
        submissionAttemptId: base.submissionAttemptId,
        releaseVersion: c.releaseVersion,
        state: 'withdrawn',
        withdrawnAt: '2026-11-06T08:00:00.000Z',
      });
      state = {
        ...state,
        availabilityRevision: state.availabilityRevision + 1,
        currentReleaseVersion:
          state.currentReleaseVersion === c.releaseVersion
            ? null
            : state.currentReleaseVersion,
        withdrawnReleaseVersions: [
          ...state.withdrawnReleaseVersions,
          c.releaseVersion,
        ],
      };
      records.set(key, { fingerprint, result });
      return structuredClone(result);
    },
    async currentness() {
      return structuredClone(state);
    },
  };
}
