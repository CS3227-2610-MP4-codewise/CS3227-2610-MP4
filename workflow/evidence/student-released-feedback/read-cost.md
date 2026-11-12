# D1 read cost per feedback open and history page (task 3.3)

Requirement IDs: SF-07, OPS-01. Measured on 2026-11-12 on local D1 (Miniflare, Node, this laptop) with synthetic data. Local timings are indicative only and are not Cloudflare edge latency.

## Limit that applies

The project is on the Workers **Free** plan (Keith, 2026-11-12). Per [Cloudflare's D1 limits](https://developers.cloudflare.com/d1/platform/limits/), the Free plan allows **50 D1 queries per Worker invocation**, and one `db.batch()` counts as one query. Workers Free also caps external subrequests at 50 per invocation ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)). The "D1 calls" column below is therefore the figure that counts against the limit.

## Method

- **Script:** a temporary vitest file, kept as [read-cost.measure.ts.txt](read-cost.measure.ts.txt) and not part of the suite. It wraps the D1 binding in a counting Proxy through `composedEnvironment(name, wrap)` in `src/server/student/composed-fixture.ts`, and counts calls to the underlying session port.
- **Each request runs 5 times.** The table shows the counts from the last run (they were stable) and the median and maximum wall time.
- **Columns:**
  - "D1 calls": one `batch` counts as one call.
  - "Statements": SQL statements, where a batch counts each statement inside it.
  - "Rows read": the sum of `meta.rows_read`.
- **Production estimate.** The test session port makes no D1 calls. A production session check (`ManagedAuthRoutes.requireSession`) makes 4 D1 queries (session touch, session read, provider binding, owner status) and 1 external Firebase account lookup. So production D1 ≈ measured D1 calls + 4 × session checks, and external calls ≈ session checks. This is derived from the code, not measured against production.
- **Setup:** one assignment version with 2 questions; student `s1`. The released attempt has v1 superseded and v2 current.

## After the fixes (revision with this file; current)

Two changes:

1. `attemptReleases` authorizes the whole batch with one session check plus one SQL ownership and current-Student check inside its single D1 batch. This was agreed by Darryl and is recorded in the Ownership.md amendment.
2. `studentReleasePort` resolves the session once per request. Revocation is still re-checked at every step by `currentStudentGuard` in SQL; `release-port.test.ts` covers a session revoked partway through a request.

| Request (real producer)                    | D1 calls | Statements | Rows read | Session checks | Production D1 (est.) | External (est.) | Median ms | Max ms |
| ------------------------------------------ | -------: | ---------: | --------: | -------------: | -------------------: | --------------: | --------: | -----: |
| `GET .../feedback`: released (v2 current)  |       25 |         37 |       143 |              2 |               **33** |               2 |     113.6 |  114.5 |
| `GET .../feedback/1`: superseded version   |       25 |         37 |       143 |              2 |               **33** |               2 |     102.2 |  108.2 |
| `GET .../feedback`: assessed, not released |        2 |          6 |        25 |              2 |               **10** |               2 |      11.4 |   12.5 |
| `GET .../feedback`: no assessment          |        2 |          6 |        21 |              2 |               **10** |               2 |      12.8 |   17.2 |
| History page, 3 attempts                   |        2 |          6 |        62 |              2 |               **10** |               2 |      11.4 |   12.8 |
| History page, 20 attempts                  |        2 |          6 |       280 |              2 |               **10** |               2 |      15.2 |   15.4 |
| History page, 50 attempts (full page)      |        2 |          6 |       670 |              2 |               **10** |               2 |      13.6 |   20.6 |

For comparison, the fake producer: released summary 1 D1 call (5 production estimate), and a 20-attempt history page 1 (5).

**History is now constant per page.** A full page of 50 is an estimated 10 production D1 queries.

**A released open is an estimated 33, under 50 with a margin of 17.** Its remaining cost is Darryl's per-attempt `authorize`, which runs 4 times per open (twice in `getAuthorized`, twice in `currentness`). Each run makes about 5 D1 calls: assessment scope, object check (2), course membership, and the guarded attempt read. That is intentional for content reads. If the margin is needed later, the options are to merge the student object check's two queries into one, or to drop the consumer's own `currentness` re-check, since `getAuthorized` already re-checks internally (that would mean revising design D2 step 5).

## Before the fixes (`1edbb16`, superseded)

Local D1 calls as measured, with production session cost derived from the code:

| Request                   | D1 calls (measured) | Session checks (derived) | Production D1 (est.) |
| ------------------------- | ------------------: | -----------------------: | -------------------: |
| Released open             |                  30 |                        6 |     ~54: **over 50** |
| History page, 20 attempts |                  66 |                      ~21 |    ~150: **over 50** |
| History page, 50 attempts | ~156 (extrapolated) |                      ~51 |    ~360: **over 50** |

Before the fixes, `attemptReleases` ran the full `authorize` (with its own session check) once per attempt, and every `authorize` re-resolved the session.

## Limits of this evidence

- These are local Miniflare counts, not edge measurements.
- Production session cost is derived from `ManagedAuthRoutes.requireSession`; Firebase admin-token fetches are not counted.
- Free-plan daily row-read and row-write quotas also apply. A full history page reads about 670 rows locally.
- Cold starts and production data volumes were not measured.
