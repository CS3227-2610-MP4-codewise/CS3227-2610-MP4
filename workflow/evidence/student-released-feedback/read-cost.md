# D1 read cost per feedback open and history page (task 3.3)

Requirement IDs: SF-07, OPS-01. Measured on 2026-11-12 on local D1 (Miniflare, Node, this laptop) at revision `1edbb16`, with synthetic data. Local timings are indicative only and are not Cloudflare edge latency.

## Method

- **Script:** a temporary vitest file, kept as [read-cost.measure.ts.txt](read-cost.measure.ts.txt) and not part of the suite. It wraps the D1 binding in a counting Proxy through `composedEnvironment(name, wrap)` in `src/server/student/composed-fixture.ts`.
- **Each request runs 5 times.** The table shows the counts from the last run (they were stable) and the median and maximum wall time.
- **Columns:**
  - "Round trips": D1 calls, where one `batch` counts as one call.
  - "Statements": SQL statements, where a batch counts each statement inside it.
  - "Rows read": the sum of D1 `meta.rows_read`.
- **Setup:** one assignment version with 2 questions; student `s1`. The released attempt has v1 superseded and v2 current. The real producer is `studentReleasePort`; the fake is `FakeReleasePort`, which itself makes no D1 calls.

## Results

| Request                                                     | Producer | Round trips | Statements | Rows read | Median ms | Max ms |
| ----------------------------------------------------------- | -------- | ----------: | ---------: | --------: | --------: | -----: |
| `GET .../feedback`: released (v2 current)                   | real     |          30 |         42 |       166 |     143.6 |  150.5 |
| `GET .../feedback/1`: superseded version                    | real     |          30 |         42 |       166 |     131.4 |  149.0 |
| `GET .../feedback`: assessed, not released                  | real     |           7 |         11 |        46 |      31.5 |   37.2 |
| `GET .../feedback`: no assessment                           | real     |           5 |          9 |        43 |      23.0 |   28.6 |
| History page, 3 attempts (1 released, 1 assessed, 1 none)   | real     |          15 |         21 |       125 |      71.0 |  106.6 |
| History page, 20 attempts (1 released, 1 assessed, 18 none) | real     |          66 |         89 |       703 |     303.5 |  322.5 |
| `GET .../feedback`: released                                | fake     |           1 |          2 |        17 |       6.1 |    7.1 |
| History page, 20 attempts                                   | fake     |           1 |          2 |       109 |       6.0 |    6.6 |

## Reading the numbers

- **Fake versus real.** With the fake producer, the student side costs one round trip, the guarded own-attempt or history read. Everything else is the producer's authorization.
- **A released open costs about 30 round trips on the real producer.** The consumer calls `attemptReleases`, `getAuthorized` and `currentness`. Each runs the producer's `authorize`, `getAuthorized` runs it twice, and each `authorize` does session, object, course and submission reads plus an evidence hash. This is the "bounded per request" cost that design.md's Risks section anticipated.
- **The history marker grows with page size: about 3 round trips per attempt** (15 for 3 attempts, 66 for 20). `attemptReleases` makes one D1 read for the mapping, but it then authorizes every attempt individually. A full page of 50 (`STUDENT_ATTEMPT_PAGE`) would be roughly 150+ round trips.

## Finding (OPS-01, for Keith and Darryl)

Cloudflare limits D1 queries per Worker invocation. As I understand Cloudflare's published limits, this is 50 on the Free plan and 1,000 on Paid. **Verify this against current documentation and the project's actual plan, which is not recorded in this repository.**

- A 20-attempt history page already makes 89 statements.
- On a 50-query limit, history pages above roughly 15 attempts, or a released open combined with other work, could fail.
- Because SF-07 degrades to "no marker" on any producer failure, the history list itself would still load, but markers would silently disappear.

Options, not implemented, needing a decision:

1. Batch authorization in the producer's `attemptReleases`: one SQL ownership and membership check for all IDs instead of a per-attempt `authorize`. This is a producer change and needs Darryl's review.
2. Request markers only for the attempts the page shows above the fold, or cap the batch smaller than 50.
3. Accept the cost on the Paid plan and record the measured margin.

These are local Miniflare counts. Edge latency, cold starts and production data volumes were not measured.
