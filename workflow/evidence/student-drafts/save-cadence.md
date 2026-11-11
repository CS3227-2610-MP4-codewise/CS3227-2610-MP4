# Save cadence vs. Free-plan allowances (task 1.4, SW-03/04, OPS-01)

## Published allowances (Coordinator, retrieved 2026-11-10)

| Limit | Value (verbatim) | Source |
|-------|------------------|--------|
| Workers Free daily requests | "100,000 requests, resetting at midnight UTC" | https://developers.cloudflare.com/workers/platform/limits/ (retrieved 2026-11-10) |
| Workers Free CPU time per HTTP request | "10 ms" | same |
| Workers Free subrequests | "50/request" | same |
| D1 Free rows read | "5 million / day" | https://developers.cloudflare.com/d1/platform/pricing/ (retrieved 2026-11-10) |
| D1 Free rows written | "100,000 / day"; an indexed column adds one written row per index | same |
| D1 Free queries per Worker invocation | "50 (Free)" | https://developers.cloudflare.com/d1/platform/limits/ (retrieved 2026-11-10) |
| D1 SQL statement length | "100,000 bytes (100 KB)" | same |
| D1 bound parameters per query | "100" | same |
| D1 max row/string size | "2,000,000 bytes (2 MB)" | same |

These are the account-wide figures as published on the retrieval date. They are not measurements of this application.

## Synthetic session measurement

Measured on 2026-11-10 by `npx vitest run workflow/student/student-work-measure.test.ts --reporter=verbose` (synthetic session in `workflow/student/save-cadence-sim.mjs`; local Miniflare D1). Local D1 `meta.rows_written` is a local measurement, not a Cloudflare billing record. Only the published figures above are used; no other allowance is assumed.

**Rows and queries per save** (`StudentWork.save`, `student_drafts` is `WITHOUT ROWID`, so the primary key is the table and adds no index row):

| Save kind | D1 queries | Rows written |
|-----------|-----------:|-------------:|
| First save (insert, base revision 0) | 1 | 1 |
| Later save (compare-and-swap update) | 1 | 1 |
| Unchanged hash at the stored revision | 2 (update matches nothing, then a read) | 0 |
| Stale revision (409 with current row) | 2 | 0 |

A save is one guarded statement (membership is in its own WHERE clause), so no `course_write_guards` row is written. The cost of an alternative guard-row batch design was not recorded; no figure is claimed for it.

**Synthetic session.** 60 minutes, deterministic: 45 s typing bursts (one keystroke every 400 ms), 30 s pauses, repeated; a flush (Previous/Next/Review) every 5 minutes, two blur flushes, and one flush before submit. That is 5,424 keystrokes and 14 flushes. Saves are due 1.5 s after the last edit or `max interval` after the first unsaved edit, whichever comes first. This is a heavy-typing profile (60% of the time typing), not a measured student.

| Debounce | Max interval | Saves per student-hour | Rows written per student-hour | Student-hours/day before 100,000 requests or 100,000 rows written (saves alone) |
|---------:|-------------:|-----------------------:|------------------------------:|------------------------------------------------------------------:|
| 1.5 s | 10 s | 251 | 251 | about 398 |
| 1.5 s | 15 s | 155 | 155 | about 645 |
| 1.5 s | 30 s | 107 | 107 | about 934 |
| 3 s | 30 s | 107 | 107 | about 934 |
| 3 s | 60 s | 59 | 59 | about 1,694 |

The last column divides the published 100,000 per-day requests (Workers Free) and 100,000 rows written per day (D1 Free) by saves per hour. Both give the same number because a save is one request and one row. It ignores every other request (page loads, dashboard, work reads, auth), which share the same daily request allowance, so real headroom is lower. The 5 million rows read per day is not a constraint at this volume and was not measured.

**Chosen timing values.** Debounce 1.5 s and maximum interval 10 s are kept, plus the unconditional flush on blur, Previous/Next, Review and submit. The design lengthens the maximum interval only if needed, and this measurement shows 10 s fits: 30 students for 2 hours is about 15,000 saves, about 15% of the daily request allowance for one class. **Documented fallback:** if staging shows quota pressure (for example several classes in one day), lengthen the maximum interval to 15 s (about 38% fewer saves, 155 per student-hour in the table), never weakening the flush saves. Limits of this measurement: synthetic typing profile, local D1 rows, no Worker CPU or latency figures.

## SW-11 rate limit: worst-case figures (task 8.5, 2026-11-12)

Measured on local D1 by `npx vitest run workflow/student/student-work-measure.test.ts -t "8.5" --reporter=verbose` (one student, one question, `StudentWork` with the D1 limiter `AuthStore.rate`). Rows written per request, including the limiter's own statements:

| Request | Rows written |
|---|---:|
| First save in a 60 s window | 4 |
| Each further allowed save in that window | 2 |
| Refused save (13th in the window, 429) | 1 |
| First save in a later window (includes cleanup of the expired bucket) | 5 |

So each save now costs about 2 rows instead of 1, plus about 2–3 rows for each minute in which the student saves at all. The split between the limiter's table, primary-key and expiry-index rows was not separated; only the totals above are measured.

| Case | Calculation | Rows written per day | Share of D1 Free 100,000/day |
|---|---|---:|---:|
| Heavy-typing student-hour (251 saves, table above), upper bound | 251 × 2 + 60 active minutes × 3 | about 680 per student-hour | about 147 student-hours/day (was about 398) |
| One class: 30 students × 2 h, heavy profile | 60 student-hours × 680 | about 41,000 | about 41% (was about 15%) |
| One well-behaved client at the save limit all day (the workbook pauses after a 429) | 1,440 min × (4 + 11 × 2 + ~1) | about 39,000 | about 39% |
| Submits at the limit, 20-question assignment | 3 × 69 + limiter rows, per minute | about 210 per minute | — |
| A hostile client ignoring 429 | 1 row per refused request, unbounded | unbounded | not protected |

Conclusions, not assumptions:

- The limiter stops the workbook (and any client honouring `Retry-After`) from overusing writes, but it **does not protect against a client that ignores 429**: every refused request still writes a counter row, and Worker requests are not protected at all. That would need Cloudflare-side protection (WAF or the binding on a plan where it enforces), outside this change.
- The limiter itself makes heavy editing more expensive: the documented cadence fallback (maximum interval 15 s, about 155 saves per student-hour) becomes more relevant. It is not applied here; staging Workers/D1 metrics should decide it (task 7.1/7.2).
