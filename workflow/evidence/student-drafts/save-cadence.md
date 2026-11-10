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
