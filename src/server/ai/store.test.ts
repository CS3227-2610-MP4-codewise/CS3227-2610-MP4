import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { GatewayStore } from './store';
let mf: Miniflare;
let db: D1Database;
let store: GatewayStore;
const base = (requestId: string, actorId = 'user_a') => ({
  requestId,
  actorId,
  courseId: 'course_a',
  action: 'assessment-draft' as const,
  idempotencyKey: requestId,
  fingerprint: 'fingerprint_a',
  evidenceKey: 'evidence_a',
  inputJson: '{"synthetic":true}',
  deadlineAt: 2000,
  now: 1000,
});
const limit = (requestId: string, leaseId: string) => ({
  requestId,
  leaseId,
  providerScope: 'soclaas-shared',
  tokenReservation: 100,
  windowStart: 0,
  windowEnd: 10000,
  userRequestLimit: 30,
  providerRequestLimit: 30,
  userTokenLimit: 3000,
  providerTokenLimit: 3000,
  concurrencyLimit: 2,
  leaseUntil: 1500,
  now: 1000,
});
beforeAll(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("ok")}}',
      compatibilityDate: '2026-11-04',
      d1Databases: { DB: 'gateway-test' },
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
});
describe('AI-03/04 persisted quota and claim safety', () => {
  it('reuses a scoped identical request and rejects a changed fingerprint', async () => {
    expect((await store.begin(base('same'))).kind).toBe('created');
    expect(
      (await store.begin({ ...base('same'), requestId: 'another' })).kind,
    ).toBe('existing');
    await expect(
      store.begin({
        ...base('same'),
        requestId: 'other',
        fingerprint: 'changed',
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(
      (
        await store.begin({
          ...base('same', 'user_b'),
          requestId: 'other_user',
        })
      ).kind,
    ).toBe('created');
  });
  it('serializes competition across independent store instances', async () => {
    await store.begin(base('race_a', 'race_user_a'));
    await store.begin(base('race_b', 'race_user_b'));
    const a = new GatewayStore(db),
      b = new GatewayStore(db);
    const results = await Promise.allSettled([
      a.admitAttempt({
        ...limit('race_a', 'race_lease_a'),
        providerScope: 'soclaas-shared',
        concurrencyLimit: 1,
      }),
      b.admitAttempt({
        ...limit('race_b', 'race_lease_b'),
        providerScope: 'soclaas-shared',
        concurrencyLimit: 1,
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('rejects leases crossing a quota window and blocks prior-window uncertainty', async () => {
    await store.begin({ ...base('edge'), deadlineAt: 20000 });
    await expect(
      store.admitAttempt({
        ...limit('edge', 'bad_edge'),
        now: 9990,
        leaseUntil: 10001,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
    await store.admitAttempt({
      ...limit('edge', 'edge_lease'),
      now: 9990,
      leaseUntil: 10000,
    });
    await store.begin({ ...base('next'), now: 10000, deadlineAt: 20000 });
    await expect(
      store.admitAttempt({
        ...limit('next', 'next_lease'),
        now: 10000,
        windowStart: 10000,
        windowEnd: 20000,
        leaseUntil: 11000,
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });
  it('counts retries against quota and caps attempts at three', async () => {
    await store.begin(base('retries', 'retry_user'));
    for (let n = 0; n < 3; n++) {
      await store.admitAttempt({
        ...limit('retries', 'retry_' + n),
        providerScope: 'soclaas-shared',
      });
      await store.settle({
        requestId: 'retries',
        leaseId: 'retry_' + n,
        now: 1100,
        outcome: 'retry',
      });
    }
    await expect(
      store.admitAttempt({
        ...limit('retries', 'retry_3'),
        providerScope: 'soclaas-shared',
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });
  it('never frees a timed out call or allows a late result to succeed', async () => {
    await store.begin(base('expired', 'expiry_user'));
    await store.begin(base('waiting', 'expiry_user_b'));
    await store.admitAttempt({
      ...limit('expired', 'expired_lease'),
      providerScope: 'soclaas-shared',
      concurrencyLimit: 1,
    });
    expect(await store.expire('expired', 1500)).toBe(true);
    expect((await store.read('expired'))?.status).toBe('expired');
    await expect(
      store.settle({
        requestId: 'expired',
        leaseId: 'expired_lease',
        now: 1501,
        outcome: 'succeeded',
        resultJson: '{}',
      }),
    ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
    await expect(
      store.admitAttempt({
        ...limit('waiting', 'waiting_lease'),
        providerScope: 'soclaas-shared',
        concurrencyLimit: 1,
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });
  it('prevents stale retry acknowledgement from settling a later attempt', async () => {
    await store.begin(base('stale', 'stale_user'));
    await store.admitAttempt({
      ...limit('stale', 'stale_1'),
      providerScope: 'soclaas-shared',
    });
    await store.settle({
      requestId: 'stale',
      leaseId: 'stale_1',
      now: 1100,
      outcome: 'retry',
    });
    await store.admitAttempt({
      ...limit('stale', 'stale_2'),
      providerScope: 'soclaas-shared',
    });
    await expect(
      store.settle({
        requestId: 'stale',
        leaseId: 'stale_1',
        now: 1100,
        outcome: 'succeeded',
        resultJson: '{}',
      }),
    ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
    expect((await store.read('stale'))?.status).toBe('running');
  });
  it('retains the full reservation when usage is missing', async () => {
    await store.begin(base('usage_a', 'usage_user'));
    await store.begin(base('usage_b', 'usage_user'));
    await store.admitAttempt({
      ...limit('usage_a', 'usage_1'),
      providerScope: 'soclaas-shared',
      userTokenLimit: 100,
    });
    await store.settle({
      requestId: 'usage_a',
      leaseId: 'usage_1',
      now: 1100,
      outcome: 'failed',
    });
    await expect(
      store.admitAttempt({
        ...limit('usage_b', 'usage_2'),
        providerScope: 'soclaas-shared',
        userTokenLimit: 100,
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });
  it('rejects inconsistent replica policies for the shared provider pool', async () => {
    await store.begin(base('policy_a', 'policy_user_a'));
    await store.begin(base('policy_b', 'policy_user_b'));
    await store.admitAttempt(limit('policy_a', 'policy_1'));
    await expect(
      store.admitAttempt({
        ...limit('policy_b', 'policy_2'),
        providerRequestLimit: 31,
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await expect(
      store.admitAttempt({
        ...limit('policy_b', 'policy_3'),
        providerScope: 'other-pool',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
  });
  it('never frees capacity when reported usage exceeds the reservation', async () => {
    await store.begin(base('overflow', 'overflow_user'));
    await store.begin(base('overflow_other', 'other_user'));
    await store.admitAttempt(limit('overflow', 'overflow_lease'));
    await expect(
      store.settle({
        requestId: 'overflow',
        leaseId: 'overflow_lease',
        now: 1100,
        outcome: 'succeeded',
        resultJson: '{}',
        usedTokens: 101,
      }),
    ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
    expect((await store.read('overflow'))?.status).toBe('running');
    await store.markOverage('overflow', 'overflow_lease', 1100, 3001);
    const attempt = await db
      .prepare(
        'SELECT state,reserved_tokens FROM ai_gateway_attempts WHERE lease_id=?',
      )
      .bind('overflow_lease')
      .first();
    expect(attempt).toEqual({ state: 'uncertain', reserved_tokens: 3001 });
    await expect(
      store.admitAttempt(limit('overflow_other', 'overflow_lease_other')),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });
  it('records rejected admission without claiming successful or pending work', async () => {
    await store.begin(base('denied', 'denied_user'));
    await store.failPending('denied', 1100, 'RATE_LIMITED');
    expect(await store.read('denied')).toMatchObject({
      status: 'failed',
      error_code: 'RATE_LIMITED',
    });
    await expect(
      store.failPending('denied', 1100, 'RATE_LIMITED'),
    ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
  });
  it('copies a live cache result only within the exact actor, course, action and evidence scope', async () => {
    await store.begin(base('source', 'cache_user'));
    await store.admitAttempt(limit('source', 'cache_lease'));
    await store.settle({
      requestId: 'source',
      leaseId: 'cache_lease',
      now: 1100,
      outcome: 'succeeded',
      resultJson: '{"safe":true}',
      cacheUntil: 1200,
    });
    await store.begin(base('target', 'cache_user'));
    await store.begin({
      ...base('foreign', 'another_user'),
      courseId: 'course_other',
    });
    await expect(
      store.copyCached('foreign', 'source', 1101),
    ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
    await store.copyCached('target', 'source', 1101);
    expect(JSON.parse((await store.read('target'))!.result_json!)).toEqual({
      safe: true,
      requestId: 'target',
      usage: { status: 'unavailable' },
    });
    expect(
      await store.findSuccess(
        'another_user',
        'course_a',
        'assessment-draft',
        'fingerprint_a',
        1101,
      ),
    ).toBeNull();
    expect(
      await store.findSuccess(
        'cache_user',
        'course_a',
        'assessment-draft',
        'fingerprint_a',
        1200,
      ),
    ).toBeNull();
  });
});
