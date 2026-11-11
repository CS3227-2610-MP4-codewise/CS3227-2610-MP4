# Submit batch measurement (task 3.4, SW-05, OPS-01)

Measured 2026-11-10 on LOCAL D1 (Miniflare) with synthetic data by
`npx vitest run workflow/student/student-work-measure.test.ts --reporter=verbose`
(test "measures the submit batch against the Free-plan limits"). Limits are the figures cited in
`save-cadence.md` (Workers Free 10 ms CPU per request; D1 Free 50 queries per invocation, 100 KB
SQL statement, 100 bound parameters, 2 MB row). Local timings are Node/Miniflare wall time, not
Cloudflare production latency, and Worker CPU time cannot be measured locally.

## Workload

20 questions (the attempt maximum), each draft exactly 32,768 bytes of synthetic ASCII text, so
655,360 bytes of source per attempt. Five submits with distinct idempotency keys, one replay.

## Results

| Measure | Result | Limit | Status |
|---------|--------|-------|--------|
| D1 queries per submit invocation (replay lookup + 4-statement batch) | 5 | 50 | within |
| Statements in the one batch | 4 (guard row, attempt insert, answers `INSERT ... SELECT`, guard cleanup) | none stated | |
| Longest SQL statement | 1,343 characters | 100,000 bytes | within |
| Most bound parameters on one statement | 8 | 100 | within |
| Largest row | 32,768 byte source | 2 MB | within |
| Rows written per 20-question submit | 69 | 100,000 per day | about 1,450 such submits per day at the limit, ignoring all other writes |
| Submit wall time, 5 runs | 19.7, 17.0, 14.4, 20.5, 14.5 ms | n/a | local I/O included |
| Replay of a committed attempt | 4.9 ms | n/a | |
| `work` read of 20 x 32 KiB | 23.8 ms wall (one batch, 2 queries) | n/a | |
| Attempt read of 20 x 32 KiB | 15.7 ms wall | n/a | |
| Node CPU for schema parse of a 640 KiB payload | 3.1 ms (work), 2.9 ms (attempt), mean of 20 | 10 ms Worker CPU | see risk |

The answers are copied inside D1 with `INSERT ... SELECT` from `student_drafts`, so the 640 KiB of
source never passes through the Worker, a bound parameter or the SQL text. The request body for a
submit holds only (question, revision, hash) triples, about 5 KB at 20 questions. Per-question
revision and hash guards are one set-based guard (a `json_each` of the confirmed triples joined to
`student_drafts`), not 20 statements, so the batch stays at 4 statements regardless of question count.
No restructuring was needed and none was made. The 3.1 tests still pass.

## Risks and gaps

- **Worker CPU on the large read paths (not measured).** The submit path itself is light in the
  Worker (fingerprint over about 2 KB, a few queries). The 640 KiB read paths, `GET .../work` and
  `GET /api/student/attempts/:id`, validate and serialise every source in the Worker. Their schema
  parse alone took about 3 ms in Node here; adding JSON serialisation, D1 result handling and
  hashing starter sources for unsaved questions could approach the Free plan's 10 ms CPU limit for
  a full 20 x 32 KiB assignment. This was not verifiable locally. It affects only maximum-size
  assignments, not the submit batch. Measure on staging (Workers metrics) before relying on it, and
  treat the Workers Paid plan or a payload cut (for example, source only for the question being
  edited) as the fallback.
- **Rows written** per maximum submit is 69 (20 answer rows with their primary-key and unique-key
  index rows, the attempt row with its indexes, and the guard row). This is the local count.
- The batch is atomic; a failed guard leaves no partial rows (tested in `work.test.ts`).
