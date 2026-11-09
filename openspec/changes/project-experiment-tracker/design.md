# Design

## Context

See proposal.md. Keith's log policy uses one member summary per increment. Python 3 is available; no runtime dependencies are needed. Codex documents project hooks but transcript JSONL is an unstable interface. Observed local records expose response-level token_usage_record entries as well as cumulative token_count events; counting both would duplicate usage.

## Goals / Non-Goals

Collect attributable metadata and annotation evidence with low overhead. Preserve one log across sessions and expose gaps. Exclude raw conversation persistence, production services, global configuration changes, TurnUp access and automatic agent spawning.

## Decisions

- Use Python standard library, private SQLite with transactional writes, per-event queue files and a static HTML report. This avoids an always-running server and new application dependencies.
- Hook handlers only enqueue allowlisted fields. Stop hooks return an empty JSON object and never request continuation. A background sync is not assumed: the skill runs sync/report at checkpoints and later sessions reconcile prior turns.
- Use explicit increment/session associations, a session-source registry and registered worktree roots. Import only hook-registered or explicitly attached transcripts after validating session metadata cwd. No broad content scan or identity guessing. Child links must be explicit.
- Incremental importer checkpoints complete newline-delimited records; truncation/rotation rebuilds that source's records. Prefer response IDs for usage; fall back to cumulative deltas only when response records are absent. Never sum both. Store provenance and partial coverage.
- Coordination annotations carry task/agent/dependency, rationale, ownership and review outcomes. Timing requires explicit blocked/unblocked pairs. Facts, annotations, derived values and unavailable data have distinct report labels. Repeated tools are candidates, never automatic waste findings.
- Generate logs from the existing Keith template, then append uniquely identified checkpoints with human/agent-written Request/Results and deterministic metric summaries. Routine questions do not create entries. Explicit export writes sanitized summaries, not raw session data.
- Local install/uninstall merges exact owned handlers, never global hooks. Hook observation is tested separately from client capability; doctor cannot assert callbacks fired until evidence exists.

## Risks / Trade-offs

- Unstable source format → versioned parser, synthetic fixtures, source errors and no invented counters.
- Hook gaps or ongoing turns → coverage warnings and provisional totals; manual attach/sync fallback.
- Sensitive annotations → users/skill supply redacted summaries; reports are private until explicit export.
- Non-comparable tasks → named comparison groups and confounders; no causal savings claim by default.

## Migration Plan

Run doctor, install project-only hooks, restart/review hooks in Codex, start an increment and attach its session. Uninstall removes owned handlers only; private data remains available for deliberate deletion. No application migration or deployment.

## Approved recording revision

User chose explicit opt-in only, include the initiating turn, graceful draining of already-running turns, and preserved/excluded legacy data. Schema v2 introduces runs, windows, members, admitted turns and role history. Existing records without a run remain legacy/unbounded and are excluded by default. Back up v1 SQLite before transactional migration; retain old logs/exports and append corrections.

Admission requires a proven session/turn identity. Start/resume inspect the registered source's latest active task_started/current turn and open a window for it; earlier turns never enter. Future turns can enter only while recording. Pause/stop first reconcile known sources, then freeze admissions; admitted active turns drain through source task_complete. Stop callbacks alone do not prove final counters have been flushed. Missing terminal records remain draining until explicit partial finalization. No semantic project-question classifier or automatic activation.

Hooks gate before queue writes, under the same database transaction used by lifecycle controls; importers independently validate run/window/turn membership. Hook attachment never activates. Child membership requires actual parent evidence within an admitted parent turn and an open recording window; no descendants join during drain. Cumulative fallback must observe baselines across excluded intervals without persisting excluded usage; ambiguous deltas are unavailable. Records retain run/window provenance and real session/turn IDs, with role labels separately historized.


## Replay and interval isolation repairs — 2026-11-09

Transcript replay deletes only bounded records and resets the affected session's source-derived admission terminal/abort flags in the same import transaction. Re-imported lifecycle records reconstruct terminal evidence. Explicit partial finalization of a turn without terminal evidence is retained, and other sessions are untouched. Run-level partial warnings remain conservative; replay does not activate recording or reopen closed runs. Missing evidence remains visible through pending turns and provisional coverage.

Blocked interval pairing uses `(increment_id, session_id, agent, task, dependency)`. Unmatched annotations never cross experiment boundaries, including the all-increment report; valid same-increment intervals retain their existing durations and attribution.


## Complete consumed-prefix verification — 2026-11-09

Validate SHA-256 over every byte before the saved offset in 1 MiB reads before trusting an incremental checkpoint. A changed or shortened prefix triggers the existing scoped replay and admission-terminal reset, even when the header, file size and final 256 bytes are unchanged. Hash new complete lines as they are imported; incomplete trailing lines are excluded from both offset and digest until completed. A prior checkpoint without `consumed_sha256` replays once to establish a trusted digest; no schema migration is required.

This adds O(consumed bytes) read/hash work on each sync under the existing import transaction, with bounded hashing memory. Parsing and metadata persistence remain incremental for unchanged prefixes. Persist only the digest, never source contents. The prefix check detects persistent rewrites; it is not an atomic filesystem snapshot against a concurrent writer rewriting already-validated bytes during the same sync. A later sync revalidates those bytes.


## Missing measurements and structural validation — 2026-11-09

Evaluate usage coverage against every completed admitted turn within the selected runs. A turn without a non-null total-token measurement makes the snapshot partial and adds an explicit coverage gap; absent counter fields also make coverage partial. Observed sums remain available with their incomplete label, missing values remain null, and real zero measurements remain valid. Compute coverage afresh so late usage repairs completeness without a sticky loss flag. This detects whole missing-turn measurements, not unobservable missing responses within a partially measured turn.

Use one shared session-header parser for attach, import, current-turn lookup and source-bearing hook admission. Require a `session_meta` object with an object payload before field access. Structural failures become safe ValueErrors handled by the existing nonblocking hook path; no blanket suppression of programming errors is added. Invalid headers cannot register sources or admit child turns.
