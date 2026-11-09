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

- [x] 6.8 Recompute settled lifecycle state after replay removes terminal evidence, retaining stop/pause intent without reactivating recording; verify restored evidence, explicit recovery and later-run isolation (EXP-07/08/09).
- [x] 6.9 Recompute run partial flags from rebuilt admissions, preserving explicit partial-finalization provenance across replay and late completion; verify snapshots, exports and existing metadata upgrade (EXP-02/08/09).

- [x] 6.10 Recompute repeated tool-name candidates and counts from selected report tool records; verify increment/group/run/session filtering, locally single-use names, empty selections and reset (EXP-04/09).

- [x] 6.11 Track ambiguous cumulative boundary coverage per turn and clear only superseded warnings on exact usage; verify incremental/same-sync recovery, multiple turns, persistent malformed warnings and legacy checkpoints (EXP-02/04/08).
- [x] 6.12 Skip structurally malformed admitted records safely and preserve redacted partial coverage; verify numeric timestamps, non-object token metadata and CLI sync without traceback (EXP-02/06).

- [x] 6.13 Scope annotations to the selected run’s increment and return none for conflicting run/increment/group/session filters; verify run-only selection, session overlap and reset without inventing run attribution (EXP-03/04/09).

- [x] 6.14 Preserve measured zero cumulative deltas for fallback-ready admitted turns; verify completed-turn coverage, exact precedence and ambiguous-boundary exclusion (EXP-02/08).
- [x] 6.15 Scope coordination checks to surviving selected-run increments and clear conflicting selections; verify reset and document increment-level attribution (EXP-03/04/09).
- [x] 6.16 Associate task types by increment and non-null task identity; retain only matching experiment annotations when task is absent and verify reused/null task filtering (EXP-03/04/09).
- [x] 6.17 Move transcript reads/hashing/parsing outside the admission write lock, apply bounded batches with atomic checkpoint/lifecycle revalidation, and verify concurrent hooks/child linkage, pause isolation and competing imports (EXP-01/02/07/08/09).

## 7. Claude Code client support — 2026-11-09

- [x] 7.1 Add the shared source-identity parser and Claude Code adapter for root/subagent identity, turn lifecycle, deduplicated usage mapping, tool names and compaction; verify identity refusals, excluded earlier turns, queued prompts, interrupts, draining, sidechain/synthetic exclusion and unavailable counters (EXP-01/02/06/07/08/10).
- [x] 7.2 Add Claude hook gating, local `.claude/settings.local.json` installation and exact-ID attach; verify derived turns, window admission, privacy, unrecorded sessions, subagent linkage, silent nonblocking CLI and preserved settings (EXP-01/06/07/09/10).
- [x] 7.3 Show supplemental cache writes and mixed-client caveats in snapshots/dashboard, copy the client-neutral skill for Claude Code and document mapping and unavailable metrics; verify DOM filtering and skill parity (EXP-04/05/10).
- [ ] 7.4 Install Claude hooks, restart Claude Code and verify observed callbacks plus a real opted-in start/pause/resume/stop sequence (EXP-07–10, DEV-02/04). Pending: requires explicit opt-in and a client restart.
- [x] 7.5 Admit in-window Claude children after pause/stop from spawn evidence, keep runs draining and coverage provisional until they are imported or explicitly finalized; flag Claude responses without usable usage per response ID; keep model/effort per response; verify the reported sequences, background child stop, partial finalization and dashboard status (EXP-02/04/07/08/10).
