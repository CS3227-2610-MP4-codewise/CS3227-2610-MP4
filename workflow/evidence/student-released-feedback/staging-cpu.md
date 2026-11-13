# Staging CPU time and D1 queries (task 6.3)

Requirement IDs: OPS-01, SF-01, SF-07. Recorded 2026-11-13.

## Release runs ("Deploy staging and production")

| Run           | Revision                       | Staging | Production                                                                                                           |
| ------------- | ------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `43277420019` | `2e5e56f` (PR #32 merge)       | success | failure: the release gate refused because main had moved since staging ("Main has changed since staging"); nothing deployed |
| `43334000493` | `af10461` (includes `2e5e56f`) | success | **success**, 2026-11-13T00:13Z                                                                                       |

So this change reached production through the reviewed workflow (run `43334000493`) **before** this check was recorded. The task's "report before production" ordering was not met. No ad hoc production checks or migrations were run.

## CPU time (Workers dashboard, staging Worker, whole Worker)

Keith read the CPU-time chart for the staging Worker in the Workers dashboard. It aggregates **all routes**, not only feedback routes:

| Percentile | CPU time |
| ---------- | -------: |
| P50        |  5.02 ms |
| P90        | 10.74 ms |
| P99        | 40.68 ms |
| P999       | 49.24 ms |

- Spikes of about 105–110 ms line up with deployment markers. These are probably the first requests after a deploy (start-up), but that is inferred from the timing and was not verified.
- **Limit:** the Workers Free plan allows 10 ms of CPU per HTTP request, with some per-isolate tolerance for occasional overruns. Sustained overruns fail with Error 1102. Time spent waiting on D1 or the network does not count. ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/), checked 2026-11-13.)
- **Outcome:** the median is under the limit. The slowest ~10% of requests are at or above it, and the slowest 1% are 4–5×.

**Not measured:** per-route CPU for the feedback and history routes (`wrangler tail` was not run), and whether any request actually failed with Error 1102 / `exceededCpu`.

## D1 queries per invocation

Not measured on staging. The local measurement with a production estimate ([read-cost.md](read-cost.md)) remains the evidence: a released open is about 22 production D1 queries and a history page about 10, against the Free limit of 50.

## Decision

**Keith, 2026-11-13:** accept occasional CPU overruns. This is a class project with no real users or real deployment load expected. No optimisation and no plan change. Recorded in design.md Risks. Revisit if Error 1102 appears or real usage starts.

Task 6.3 is closed on this aggregate evidence by Keith's decision. Its per-request, per-route measurement was not done.
