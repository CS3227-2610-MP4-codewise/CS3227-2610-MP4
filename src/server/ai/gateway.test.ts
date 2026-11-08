import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { SecureAIGateway, type GatewayResolver } from './gateway';
import { GatewayStore } from './store';
import { SoclaasTransportError } from './transport';
import type { SoclaasInput } from './transport';
import type { TrustedPrincipal } from '../instructor/ports/contracts';
import type { AIRequestInput } from '../../shared/instructor-contracts/ai';
import { BoundaryError } from '../../shared/instructor-contracts/schema';
import { assessmentResolver } from './assessment';
import { examples } from '../../../workflow/fixtures/instructor-contracts/graph';
import { publicationSchema } from '../../shared/instructor-contracts/publication';
import { attemptSchema } from '../../shared/instructor-contracts/submission';
let mf: Miniflare, db: D1Database, store: GatewayStore;
const actor = {
  userId: 'user_a',
  sessionHandle: 'session_a',
} as TrustedPrincipal;
const input = (
  key: string,
  courseId = 'course_a',
): AIRequestInput<'assessment-draft'> => ({
  schemaVersion: 1,
  action: 'assessment-draft',
  courseId,
  idempotencyKey: key,
  outputTokenLimit: 10,
  evidenceRefs: [{ kind: 'submission', attemptId: 'attempt_a' }],
});
const profile = {
  verified: true as const,
  model: 'sample-model',
  allowedModels: ['sample-model'],
  promptVersion: 'v1',
  outputTokenLimit: 10,
  inputTokenReservation: 30,
  maxInputBytes: 1000,
  deadlineMs: 1000,
  cacheMs: 500,
};
const limits = {
  userRequestLimit: 20,
  providerRequestLimit: 20,
  userTokenLimit: 1000,
  providerTokenLimit: 1000,
  concurrencyLimit: 2,
  windowMs: 10000,
};
let allowed = true,
  now = 1000;
const resolve: GatewayResolver<
  'assessment-draft',
  { kind: 'assessment-draft'; text: string }
> = async () => {
  if (!allowed) throw new BoundaryError('FORBIDDEN');
  return {
    evidenceKey: 'evidence_a',
    system: 'policy',
    user: 'synthetic source',
    validate: async (v) => {
      const p = v as { kind?: unknown; text?: unknown };
      if (p?.kind !== 'assessment-draft' || typeof p.text !== 'string')
        throw new BoundaryError('INVALID_CONTRACT');
      return { kind: 'assessment-draft', text: p.text };
    },
  };
};
const payload = { kind: 'assessment-draft' as const, text: 'synthetic' };
beforeAll(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("ok")}}',
      compatibilityDate: '2026-11-04',
      d1Databases: { DB: 'gateway-composition-test' },
    }),
  );
  db = (await mf.getD1Database('DB')) as unknown as D1Database;
  const sql = await readFile(
    'src/server/db/migrations/0013_ai_gateway.sql',
    'utf8',
  );
  await db.batch(
    sql
      .split(/^-- statement\s*$/m)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => db.prepare(s)),
  );
  store = new GatewayStore(db);
}, 30000);
afterAll(async () => mf.dispose());
beforeEach(async () => {
  await db.batch([
    db.prepare('DELETE FROM ai_gateway_attempts'),
    db.prepare('DELETE FROM ai_gateway_requests'),
    db.prepare('DELETE FROM ai_gateway_quota_policy'),
  ]);
  allowed = true;
  now = 1000;
});
function setup(overrides: Record<string, unknown> = {}) {
  const transport = vi.fn(async (request: SoclaasInput) => {
    void request;
    return { payload, usage: { status: 'unavailable' as const } };
  });
  const gateway = new SecureAIGateway(store, {
    action: 'assessment-draft',
    profile,
    limits,
    secrets: {
      SOCLAAS_INSTRUCTOR_API_KEY: 'instructor-key',
      SOCLAAS_STUDENT_API_KEY: 'student-key',
    },
    resolve,
    clock: () => now,
    transport,
    ...overrides,
  });
  return { gateway, transport };
}
describe('AI gateway composed security boundaries', () => {
  it('uses instructor key, reuses a scoped cache without claiming extra usage, and denies another actor', async () => {
    const { gateway, transport } = setup();
    const a = await gateway.request(actor, input('first'));
    const b = await gateway.request(actor, input('second'));
    expect(a.status).toBe('succeeded');
    expect(b.status).toBe('succeeded');
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0].apiKey).toBe('instructor-key');
    if (b.status === 'succeeded')
      expect(b.usage).toEqual({ status: 'unavailable' });
    await expect(
      gateway.readAuthorized({ ...actor, userId: 'other' }, b.requestId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('does not share cache across courses or accept conflicting idempotency', async () => {
    const { gateway, transport } = setup();
    await gateway.request(actor, input('one'));
    await gateway.request(actor, input('two', 'course_b'));
    expect(transport).toHaveBeenCalledTimes(2);
    await expect(
      gateway.request(actor, { ...input('one'), outputTokenLimit: 9 }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });
  it('denies dispatch if permission changes after admission', async () => {
    let calls = 0;
    const resolver: typeof resolve = async (p, i) => {
      calls++;
      if (calls === 2) allowed = false;
      return resolve(p, i);
    };
    const { gateway, transport } = setup({ resolve: resolver });
    await expect(gateway.request(actor, input('one'))).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(transport).not.toHaveBeenCalled();
  });
  it('fails invalid output and conservatively accounts overage', async () => {
    const { gateway } = setup({
      transport: async () => ({
        payload: { kind: 'wrong' },
        usage: { status: 'reported', inputTokens: 5, outputTokens: 3 },
      }),
    });
    expect((await gateway.request(actor, input('invalid'))).status).toBe(
      'failed',
    );
    const over = setup({
      transport: async () => ({
        payload,
        usage: { status: 'reported', inputTokens: 99, outputTokens: 3 },
      }),
    });
    expect((await over.gateway.request(actor, input('over'))).status).toBe(
      'expired',
    );
    const row = await db
      .prepare(
        'SELECT reserved_tokens,state FROM ai_gateway_attempts WHERE used_tokens=102',
      )
      .first();
    expect(row).toEqual({ reserved_tokens: 102, state: 'uncertain' });
  });
  it('never retries an uncertain call', async () => {
    const timeout = vi.fn(async () => {
      throw new SoclaasTransportError('timeout');
    });
    expect(
      (
        await setup({ transport: timeout }).gateway.request(
          actor,
          input('timeout'),
        )
      ).status,
    ).toBe('expired');
    expect(timeout).toHaveBeenCalledTimes(1);
  });
  it('does not retry a rate limit beyond the deadline', async () => {
    const transport = vi.fn(async () => {
      throw new SoclaasTransportError('rate_limited', 86_400_000);
    });
    expect(
      await setup({ transport }).gateway.request(actor, input('slow')),
    ).toMatchObject({
      status: 'failed',
      safeCode: 'RATE_LIMITED',
      retryAfterSeconds: expect.any(Number),
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('bounds eligible rate-limit retries to three admitted attempts', async () => {
    const transport = vi.fn(async () => {
      throw new SoclaasTransportError('rate_limited', 0);
    });
    const gateway = setup({ transport, sleep: async () => {} }).gateway;
    expect((await gateway.request(actor, input('retry'))).status).toBe(
      'failed',
    );
    expect(transport).toHaveBeenCalledTimes(3);
    expect(
      await db.prepare('SELECT COUNT(*) AS n FROM ai_gateway_attempts').first(),
    ).toEqual({ n: 3 });
  });
  it('does not dispatch after deadline spent resolving evidence', async () => {
    let calls = 0;
    const resolver: typeof resolve = async (p, i) => {
      calls++;
      if (calls === 2) now = 2000;
      return resolve(p, i);
    };
    const { gateway, transport } = setup({ resolve: resolver });
    expect((await gateway.request(actor, input('deadline'))).status).toBe(
      'expired',
    );
    expect(transport).not.toHaveBeenCalled();
  });
  it('does not return a cached result if authorization is lost during validation', async () => {
    const s = setup();
    const result = await s.gateway.request(actor, input('one'));
    expect(result.status).toBe('succeeded');
    const resolver: typeof resolve = async (p, i) => {
      const r = await resolve(p, i);
      return {
        ...r,
        validate: async (v) => {
          const value = await r.validate(v);
          allowed = false;
          return value;
        },
      };
    };
    await expect(
      setup({ resolve: resolver }).gateway.readAuthorized(
        actor,
        result.requestId,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('rejects input outside the configured envelope bound before provider work', async () => {
    const s = setup({ profile: { ...profile, maxInputBytes: 10 } });
    await expect(
      s.gateway.request(actor, input('large')),
    ).rejects.toMatchObject({ code: 'AI_DISABLED' });
    expect(s.transport).not.toHaveBeenCalled();
  });
  it('fails closed before provider when validator, key or verified profile is absent', async () => {
    for (const o of [
      { resolve: undefined },
      { profile: undefined },
      { secrets: { SOCLAAS_STUDENT_API_KEY: 'student' } },
      {
        secrets: {
          SOCLAAS_INSTRUCTOR_API_KEY: 'same',
          SOCLAAS_STUDENT_API_KEY: 'same',
        },
      },
    ]) {
      const s = setup(o);
      await expect(
        s.gateway.request(actor, input('one')),
      ).rejects.toMatchObject({ code: 'AI_DISABLED' });
      expect(s.transport).not.toHaveBeenCalled();
    }
  });
  it('selects only the student credential for progress and requires its validator', async () => {
    const transport = vi.fn(async (request: SoclaasInput) => {
      void request;
      return {
        payload: { kind: 'progress-explanation' },
        usage: { status: 'unavailable' as const },
      };
    });
    const progress = new SecureAIGateway(store, {
      action: 'progress-explanation',
      profile,
      limits,
      secrets: {
        SOCLAAS_INSTRUCTOR_API_KEY: 'instructor-key',
        SOCLAAS_STUDENT_API_KEY: 'student-key',
      },
      clock: () => now,
      transport,
      resolve: async () => ({
        evidenceKey: 'evidence_progress',
        system: 'policy',
        user: 'released evidence',
        validate: async (v: unknown) => v as { kind: 'progress-explanation' },
      }),
    });
    const result = await progress.request(actor, {
      schemaVersion: 1,
      action: 'progress-explanation',
      courseId: 'course_a',
      idempotencyKey: 'p1',
      outputTokenLimit: 10,
      evidenceRefs: [
        { kind: 'release', assessmentId: 'a1', releaseVersion: 1 },
      ],
    });
    expect(result.status).toBe('succeeded');
    expect(transport.mock.calls[0][0].apiKey).toBe('student-key');
  });
  it('assessment resolver omits student identity and rejects invalid rubric evidence', async () => {
    const publication = publicationSchema.parse(examples[2]),
      attempt = attemptSchema.parse(examples[3]);
    const resolved = await assessmentResolver(async () => ({
      publication,
      attempt,
    }))(actor, {
      schemaVersion: 1,
      action: 'assessment-draft',
      courseId: attempt.courseId,
      idempotencyKey: 'safe',
      outputTokenLimit: 10,
      evidenceRefs: [{ kind: 'submission', attemptId: attempt.attemptId }],
    });
    expect(resolved.user).not.toContain(attempt.submittedByUserId);
    expect(resolved.system).toContain('submittedAnswerId');
    await expect(
      resolved.validate({
        kind: 'assessment-draft',
        codeExecuted: false,
        criteria: examples[4].criteria,
        annotations: examples[4].annotations,
        reviewFlags: [],
      }),
    ).resolves.toMatchObject({ kind: 'assessment-draft' });
    await expect(
      resolved.validate({
        kind: 'assessment-draft',
        codeExecuted: false,
        criteria: [],
        annotations: [],
        reviewFlags: [],
      }),
    ).rejects.toThrow();
  });
});
