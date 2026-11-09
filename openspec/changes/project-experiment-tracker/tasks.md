# Tasks

## 1. Collector and attribution

- [x] 1.1 Implement scoped hooks, source registry, SQLite storage and incremental deduplicated usage import; test privacy, concurrency, malformed/truncated inputs, child links and repeated sync (EXP-01/02/06).

## 2. Experiments and visibility

- [x] 2.1 Implement experiment annotations, honest coordination checks, offline filtered report and exports; test subset arithmetic, escaping, unknown coverage and comparison grouping; document commands (EXP-03/04/06).

## 3. Keith workflow

- [x] 3.1 Add the project skill and template-based idempotent Keith log checkpoints; test multi-session append and history preservation; document installation and recovery (EXP-05).

## 4. Integration and handoff

- [x] 4.1 Run tracker tests, skill validation and npm run check; record actual evidence, local pilot/source reconciliation, limitations and Keith handoff (EXP-01–06, DEV-02/04).

## Workflow follow-up

- Multi-agent benefit comparison requires a later comparable experiment; no agents are spawned for instrumentation.
- Live client hook observation needs a subsequent session after hook installation. No deployment/archive is part of this increment.

## 5. Explicit recording revision — approved 2026-11-08

- [x] 5.1 Add backed-up v2 migration, explicit run/window/turn admission and start/pause/resume/stop/status/partial-finalize; verify inactive exclusion, current-turn inclusion, draining, late usage and fallback boundaries (EXP-07/08).
- [x] 5.2 Gate hooks before persistence and import independently, inherit actual nested children, preserve runtime IDs with role history; verify unrelated events, conflicting identities and concurrent controls (EXP-07/09).
- [x] 5.3 Update dashboard, skill, logs and exports for bounded runs and excluded legacy data; verify filters, totals, role labels and preserved history (EXP-08/09).
- [ ] 5.4 Run tracker/skill/project checks and bounded pilot reconciliation, recording actual callback coverage and limitations in the existing evidence/handoff (EXP-07–09, DEV-02/04). Tracker/skill/browser/full project checks and current-turn reconciliation passed; real loaded-client pause/general/resume lifecycle remains pending after restart.


## 6. PR review repairs — 2026-11-09

- [x] 6.1 Reset source-derived admission terminal state during transcript replay and rebuild it from current evidence; preserve explicit partial finalization and unrelated sessions, and verify pause/stop draining after truncation or rewrite (EXP-02/08).
- [x] 6.2 Scope blocked/unblocked pairing to the increment as well as session/agent/task/dependency; verify all-increment and filtered reports cannot fabricate cross-increment waits (EXP-03/04/09).

- [x] 6.3 Detect rewrites anywhere in the complete consumed prefix with a bounded-memory checkpoint hash; verify unchanged header/size/tail terminal and usage rewrites, append-only and partial-line behaviour, and legacy checkpoint upgrade (EXP-02/08).

- [x] 6.4 Mark completed admitted turns without usable usage and missing counters as incomplete coverage; verify late usage recovery, zero counters, filtered snapshots and exports (EXP-02/04/09).
- [x] 6.5 Validate transcript header/payload structure consistently before dereferencing it; verify malformed linked-child hook callbacks return empty success without admitting/persisting invalid sources, and attach/import/current-turn paths fail safely (EXP-01/06/07).

- [x] 6.6 Export actual run membership and include linked sessions without admitted turns in report counts and source rows; verify paused-before-admission children and filtered memberships (EXP-01/04/09).
- [x] 6.7 Recompute report coverage/status for selected increments, groups, runs and sessions instead of reusing global gaps; verify isolation, empty selections, missing usage/source and reset through actual dashboard controls (EXP-02/04/09).
