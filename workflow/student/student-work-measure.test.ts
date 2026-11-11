import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { StudentWork } from '../../src/server/student/work';
import { AuthStore } from '../../src/server/auth/store';
import { d1RateLimiter } from '../../src/server/student/rate-limit';
import {
  NOW,
  createDatabase,
  iso,
  principal,
  publish,
  seedPeople,
} from '../../src/server/student/test-fixture';
import {
  draftSaveRequestSchema,
  submitRequestSchema,
  workResponseSchema,
} from '../../src/shared/student-work';
import { attemptSchema } from '../../src/shared/instructor-contracts/submission';
import { countSaves, syntheticSession } from './save-cadence-sim.mjs';

/**
 * Tasks 1.4 and 3.4 (SW-03/04/05, OPS-01): measurements on LOCAL D1 (Miniflare) with synthetic
 * data. Local timings are not Cloudflare production figures and Worker CPU cannot be measured
 * here. Run with: npx vitest run workflow/student/student-work-measure.test.ts --reporter=verbose
 */
let mf: Miniflare;
let db: D1Database;
const log: unknown[] = [];
const report = (label: string, value: unknown) =>
  console.log('MEASURE ' + label + ' ' + JSON.stringify(value));

type Meta = { rows_read?: number; rows_written?: number; changes?: number };
const metas: Meta[][] = [];
let queries = 0;
let maxSql = 0;
let maxBinds = 0;
let batchSizes: number[] = [];
function instrumented(inner: D1Database): D1Database {
  return {
    prepare(sql: string) {
      queries++;
      maxSql = Math.max(maxSql, sql.length);
      const stmt = inner.prepare(sql);
      const wrap = (s: D1PreparedStatement): D1PreparedStatement =>
        new Proxy(s, {
          get(target, prop) {
            if (prop === 'bind')
              return (...args: unknown[]) => {
                maxBinds = Math.max(maxBinds, args.length);
                return wrap(target.bind(...args));
              };
            if (prop === 'run')
              return async () => {
                const r = await target.run();
                metas.push([r.meta as Meta]);
                return r;
              };
            // first() hides meta; run() returns the same row with it (used by AuthStore.rate).
            if (prop === 'first')
              return async () => {
                const r = await target.run();
                metas.push([r.meta as Meta]);
                return r.results[0] ?? null;
              };
            const v = (target as never)[prop];
            return typeof v === 'function' ? v.bind(target) : v;
          },
        });
      return wrap(stmt);
    },
    async batch(statements: D1PreparedStatement[]) {
      batchSizes.push(statements.length);
      const r = await inner.batch(statements);
      metas.push(r.map((x) => x.meta as Meta));
      return r;
    },
  } as unknown as D1Database;
}
const reset = () => {
  metas.length = 0;
  queries = 0;
  maxSql = 0;
  maxBinds = 0;
  batchSizes = [];
};

beforeAll(async () => {
  ({ mf, db } = await createDatabase('student-measure'));
  await seedPeople(db, ['m1'], [['course-a', 'm1', 'student']]);
}, 60000);
afterAll(async () => {
  await mf.dispose();
});

describe('1.4 synthetic editing session and D1 rows per save', () => {
  it('measures rows written per save, update and unchanged save', async () => {
    await publish(db, {
      course: 'course-a',
      assignment: 'a1',
      version: 'v1',
      number: 1,
      deadline: iso(NOW + 600_000),
      count: 1,
    });
    const work = new StudentWork(instrumented(db), () => NOW);
    const save = (base: number, source: string) =>
      draftSaveRequestSchema.parse({
        schemaVersion: 1,
        baseRevision: base,
        source,
      });
    const q = 'qv-v1-0';
    const rows: Record<string, unknown> = {};
    for (const [label, base, source] of [
      ['first save (insert)', 0, 'a = 1\n'],
      ['update', 1, 'a = 2\n'],
      ['unchanged (no write)', 2, 'a = 2\n'],
    ] as const) {
      reset();
      await work.save(principal('m1'), q, save(base, source));
      rows[label] = {
        queries,
        rows_written: metas.flat().map((m) => m.rows_written),
        changes: metas.flat().map((m) => m.changes),
      };
    }
    reset();
    await work
      .save(principal('m1'), q, save(0, 'stale\n'))
      .catch(() => undefined);
    rows['stale conflict (insert refused + diagnosis read)'] = {
      queries,
      rows_written: metas.flat().map((m) => m.rows_written),
    };
    report('rows-per-save', rows);
    expect((rows['update'] as { rows_written: number[] }).rows_written).toEqual(
      [1],
    );
    expect(
      (rows['first save (insert)'] as { rows_written: number[] }).rows_written,
    ).toEqual([1]);
  });

  it('counts saves for candidate cadences over a 60 minute synthetic session', () => {
    const session = syntheticSession();
    const keys = session.events.filter(
      (e: { type: string }) => e.type === 'key',
    ).length;
    const table = [
      [1.5, 10],
      [1.5, 15],
      [1.5, 30],
      [3, 30],
      [3, 60],
    ].map(([d, m]) => ({
      debounceS: d,
      maxIntervalS: m,
      saves: countSaves(session, d * 1000, m * 1000),
    }));
    report('cadence', {
      minutes: 60,
      keystrokes: keys,
      flushes: session.events.length - keys,
      table,
    });
    // Deterministic: re-running yields the same counts.
    expect(table.map((t) => t.saves)).toEqual(
      [
        [1.5, 10],
        [1.5, 15],
        [1.5, 30],
        [3, 30],
        [3, 60],
      ].map(([d, m]) => countSaves(session, d * 1000, m * 1000)),
    );
    expect(table[0].saves).toBeGreaterThan(table[2].saves);
  });
});

describe('3.4 submit batch: 20 questions x 32 KiB', () => {
  it('measures the submit batch against the Free-plan limits', async () => {
    await publish(db, {
      course: 'course-a',
      assignment: 'big',
      version: 'vbig',
      number: 1,
      deadline: iso(NOW + 600_000),
      count: 20,
    });
    const raw = new StudentWork(db, () => NOW);
    const line = (i: number) =>
      `value_${i} = compute(${i}) + ${'x'.repeat(24)}\n`;
    const body = (i: number) => {
      let s = '';
      for (let n = 0; s.length + line(n).length <= 32768; n++) s += line(n + i);
      return s.padEnd(32768, '#').slice(0, 32767) + '\n';
    };
    for (let i = 0; i < 20; i++)
      await raw.save(
        principal('m1'),
        `qv-vbig-${i}`,
        draftSaveRequestSchema.parse({
          schemaVersion: 1,
          baseRevision: 0,
          source: body(i),
        }),
      );
    expect(new TextEncoder().encode(body(0)).length).toBe(32768);

    let t = performance.now();
    const w = await raw.work(principal('m1'), 'vbig');
    const readMs = performance.now() - t;
    const answers = w.questions.map((q) => ({
      questionVersionId: q.questionVersionId,
      draftRevision: q.revision,
      sourceHash: q.sourceHash,
    }));
    expect(
      w.questions.every(
        (q) => new TextEncoder().encode(q.source).length === 32768,
      ),
    ).toBe(true);

    const timings: number[] = [];
    const written: number[][] = [];
    let attemptId = '';
    const instr = new StudentWork(instrumented(db), () => NOW);
    let limits = {};
    for (let run = 0; run < 5; run++) {
      reset();
      t = performance.now();
      const r = await instr.submit(
        principal('m1'),
        'vbig',
        submitRequestSchema.parse({
          schemaVersion: 1,
          idempotencyKey: 'run-' + run,
          answers,
        }),
      );
      timings.push(performance.now() - t);
      attemptId = r.attemptId;
      written.push(metas.flat().map((m) => m.rows_written ?? 0));
      limits = {
        queriesPerInvocation: queries,
        batchStatements: batchSizes,
        maxSqlLength: maxSql,
        maxBoundParams: maxBinds,
      };
    }
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    // Replay of a committed attempt (cheapest path) and the read paths that move 640 KiB.
    reset();
    t = performance.now();
    await instr.submit(
      principal('m1'),
      'vbig',
      submitRequestSchema.parse({
        schemaVersion: 1,
        idempotencyKey: 'run-0',
        answers,
      }),
    );
    const replayMs = performance.now() - t;
    t = performance.now();
    const attempt = await raw.attempt(principal('m1'), attemptId);
    const attemptReadMs = performance.now() - t;
    t = performance.now();
    for (let i = 0; i < 20; i++) workResponseSchema.parse(w);
    const parseWork = (performance.now() - t) / 20;
    t = performance.now();
    for (let i = 0; i < 20; i++) attemptSchema.parse(attempt);
    const parseAttempt = (performance.now() - t) / 20;
    report('submit-batch', {
      questions: 20,
      bytesPerAnswer: 32768,
      totalSourceBytes: 20 * 32768,
      submitWallMs: timings.map((x) => +x.toFixed(1)),
      rowsWrittenPerSubmit: sum(written[0]),
      ...limits,
      replayWallMs: +replayMs.toFixed(1),
      workReadWallMs: +readMs.toFixed(1),
      attemptReadWallMs: +attemptReadMs.toFixed(1),
      nodeSchemaParseMs: {
        work640KiB: +parseWork.toFixed(2),
        attempt640KiB: +parseAttempt.toFixed(2),
      },
    });
    expect(attempt.answers).toHaveLength(20);
    expect(attempt.answers.every((a) => a.source.length === 32768)).toBe(true);
    // Free-plan structural limits from save-cadence.md: 50 queries, 100 KB SQL, 100 bound params.
    expect(
      (limits as { queriesPerInvocation: number }).queriesPerInvocation,
    ).toBeLessThanOrEqual(50);
    expect((limits as { maxSqlLength: number }).maxSqlLength).toBeLessThan(
      100_000,
    );
    expect(
      (limits as { maxBoundParams: number }).maxBoundParams,
    ).toBeLessThanOrEqual(100);
    void log;
  }, 120000);
});

describe('8.5 rows written by the SW-11 D1 limiter', () => {
  it('measures limiter rows per save across one full window and the next', async () => {
    await publish(db, {
      course: 'course-a',
      assignment: 'a-rl',
      version: 'v-rl',
      number: 1,
      deadline: iso(NOW + 600_000),
      count: 1,
    });
    let t = NOW + 60_000; // a window no earlier measurement used
    const clock = () => t;
    const inner = instrumented(db);
    const work = new StudentWork(
      inner,
      clock,
      d1RateLimiter(new AuthStore(inner, clock)),
    );
    const q = 'qv-v-rl-0';
    const per: number[] = [];
    let refused = -1;
    for (let i = 0; i < 13; i++) {
      reset();
      try {
        await work.save(
          principal('m1'),
          q,
          draftSaveRequestSchema.parse({
            schemaVersion: 1,
            baseRevision: i,
            source: `a = ${i}\n`,
          }),
        );
      } catch {
        refused = i;
      }
      per.push(metas.flat().reduce((n, m) => n + (m.rows_written ?? 0), 0));
    }
    t += 120_000; // next window: the expired bucket is cleaned up
    reset();
    await work.save(
      principal('m1'),
      q,
      draftSaveRequestSchema.parse({
        schemaVersion: 1,
        baseRevision: 12,
        source: 'a = 12\n',
      }),
    );
    const nextWindowFirst = metas
      .flat()
      .reduce((n, m) => n + (m.rows_written ?? 0), 0);
    report('limiter-rows', {
      perSaveInWindow: per,
      refusedAt: refused,
      nextWindowFirst,
    });
    expect(refused).toBe(12);
  });
});
