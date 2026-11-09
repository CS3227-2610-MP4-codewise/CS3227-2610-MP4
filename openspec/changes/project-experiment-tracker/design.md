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

Transcript replay deletes only bounded records and resets the affected session's source-derived admission terminal/abort flags in the first bounded replay batch transaction. Re-imported lifecycle records reconstruct terminal evidence. Explicit partial finalization of a turn without terminal evidence is retained, and other sessions are untouched. Run-level partial flags and paused/stopped recovery states are recomputed from rebuilt admissions; replay never activates recording. See settled-run reconciliation below for explicit-finalization provenance. Missing evidence remains visible through pending turns and coverage.

Blocked interval pairing uses `(increment_id, session_id, agent, task, dependency)`. Unmatched annotations never cross experiment boundaries, including the all-increment report; valid same-increment intervals retain their existing durations and attribution.


## Complete consumed-prefix verification — 2026-11-09

Validate SHA-256 over every byte before the saved offset in 1 MiB reads before trusting an incremental checkpoint. A changed or shortened prefix triggers the existing scoped replay and admission-terminal reset, even when the header, file size and final 256 bytes are unchanged. Hash new complete lines as they are imported; incomplete trailing lines are excluded from both offset and digest until completed. A prior checkpoint without `consumed_sha256` replays once to establish a trusted digest; no schema migration is required.

This adds O(consumed bytes) read/hash work on each sync outside the admission write transaction, with bounded hashing memory. Parsing and metadata persistence remain incremental for unchanged prefixes. Persist only the digest, never source contents. The prefix check detects persistent rewrites; it is not an atomic filesystem snapshot against a concurrent writer rewriting already-validated bytes during the same sync. A later sync revalidates those bytes.


## Missing measurements and structural validation — 2026-11-09

Evaluate usage coverage against every completed admitted turn within the selected runs. A turn without a non-null total-token measurement makes the snapshot partial and adds an explicit coverage gap; absent counter fields also make coverage partial. Observed sums remain available with their incomplete label, missing values remain null, and real zero measurements remain valid. Compute coverage afresh so late usage repairs completeness without a sticky loss flag. This detects whole missing-turn measurements, not unobservable missing responses within a partially measured turn.

Use one shared session-header parser for attach, import, current-turn lookup and source-bearing hook admission. Require a `session_meta` object with an object payload before field access. Structural failures become safe ValueErrors handled by the existing nonblocking hook path; no blanket suppression of programming errors is added. Invalid headers cannot register sources or admit child turns.


## Dashboard membership and filtered coverage — 2026-11-09

Export actual `(run_id, session_id, parent)` member rows with each snapshot and redacted summary. Membership is independent of turn admission: a linked child paused before its first callback remains counted and gets a source row, including an explicit missing-transcript state. Select runs/sessions using these relationships rather than admission presence or a session's last increment.

Recompute dashboard status and dynamic coverage from selected runs, members, admissions, records and sources for increment/group/run/session filters. Scope missing source, parser warning, missing completed-turn usage, missing counters, fallback and pending/draining evidence to that selection; reset restores the whole report. Whole-run partial flags stay in the run table, while session-specific status uses selected admission flags. Source warnings remain source-wide for selected sessions; they cannot prove which individual turn is affected. Model filtering changes displayed token totals only; coverage still considers every model in the selected runs/sessions. Task filtering changes annotations only. Run-specific coverage omits annotation gaps because those annotations lack run attribution; never invent it. Legacy exclusions and last-sync overhead remain explicitly workspace-wide information.

Add DOM interaction regressions against the actual embedded report script and controls, using the existing jsdom/Vitest dependencies. Python remains standard-library only; application UI and runtime are unchanged.


## Settled-run reconciliation and explicit partial provenance — 2026-11-09

Treat run lifecycle/partial flags as derived aggregates. Reconcile affected runs after source replay and each terminal transition: stopped runs with unresolved non-finalized admissions become draining-to-stop, and paused runs become draining-to-pause. Restored terminal evidence settles them again. Recording remains recording only under its existing explicit window; reconciliation never opens windows or admits new work. Startup also repairs pre-existing inconsistent aggregates.

Store durable `admitted.finalized_partial` separately from source-derived abort state. `admitted.partial` is true for either explicit finalization or surviving abort evidence; `runs.partial` is the OR across its rebuilt admissions. Normal completion after a removed abort clears derived partial flags, while explicit finalization survives late completion and later source replay. Back up existing v1/v2 SQLite before the additive column upgrade; backfill identifiable old partial rows with no terminal evidence. Previously erased provenance cannot be reconstructed. Private backup/schema changes do not affect application D1 or historical shared exports.

A historical stop recovery can coexist with a newer live run. Retain uniqueness for recording/paused/draining-to-pause ownership while allowing historical draining-to-stop rows. The transactional start guard still refuses a new run while any unresolved run exists. Default status selects an open run before the last settled run; explicit status/finalize `--run ID` addresses historical recovery without changing a newer run. Finalization remains root-owned, draining-only and explicitly partial. Old paused/stopped windows remain closed.


## Filtered repeated-tool counts — 2026-11-09

Build repeated tool-name candidates from the selected `kind=tool` records on every dashboard render. Count names using a Map and retain only counts above one. The observed-call header and candidates share the same record set; do not render the snapshot's whole-workspace aggregate in a filtered view. These remain descriptive name repetitions, not inferred waste or repeated analysis.


## Boundary-warning recovery and structural records — 2026-11-09

Store unresolved cumulative boundary turn IDs separately from generic parser warnings. Derive the source-wide boundary message from that set after each import; response usage removes only its own turn alongside fallback records. Existing checkpoints containing the old message without turn provenance replay once to reconstruct it, including when exact usage was consumed earlier. Generic malformed-record warnings remain partial until source replay resolves them.

Reject non-string timestamps before updating turn state. Handle AttributeError alongside the existing malformed-record exceptions only at the per-record import boundary, allowing malformed nested metadata to be skipped while subsequent valid records import. Store only the fixed redacted coverage warning; no source payload or exception text is persisted. This does not widen the CLI's outer exception suppression.


## Run-filtered annotations — 2026-11-09

Annotations carry increment/session identity but no run ID. When a run filter is active, intersect annotation increments with the increments of the runs surviving all increment/group/run/session filters. Conflicting filters leave that set empty and therefore show no annotations. Preserve the existing session/task filters and workspace view on reset. State the increment-level attribution limit beside the decisions/context table; do not claim precise allocation between runs sharing an increment.


## Zero deltas, experiment scope and import locking — 2026-11-09

Persist every usable fallback delta, including measured zeros; keep unknown counters null and ambiguous boundary samples excluded. Source adapter revision 2 replays older checkpoints once so previously dropped zero measurements can be recovered from admitted records. Preserve legacy rows, admission identities and explicit finalization through the existing replay rules.

Apply surviving selected-run increment scope to coordination checks as well as decisions/context. Checks lack run IDs; disclose their increment-level attribution. Match task types through `(increment_id, task)` for explicit task IDs. Untasked experiment annotations match their own type directly; an absent task never links context/reviews or other experiment annotations.

Read the header, hash the consumed prefix and parse JSON outside the SQLite admission lock. Apply batches of at most 64 records, stopping after at least 1 MiB of complete source lines (one record may exceed that threshold within the existing 16 MiB line limit). Before each batch write, acquire the lock and compare registered source identity, offset, prefix, serialized parser state and registered roots against the preparation snapshot. If another sync/start/resume changes the checkpoint, discard the prepared batch and leave fresh processing for the next sync. Admissions and child membership are consulted from current SQLite state, never copied from the preparation snapshot, so pause/stop freezes new admissions during I/O or between batches. Hash/offset/warnings and derived lifecycle changes commit with each batch. Interrupted replay exposes honest pending/missing coverage and resumes from its last committed checkpoint; the whole source is no longer one write transaction.

Bounded writes remove transcript I/O and parsing from the competing lock; SQLite/database contention can still fail independently. Full-prefix hashing remains O(consumed bytes), and filesystem rewrites during a read are detected on a later sync rather than through an atomic filesystem snapshot. Transient batches are memory-only; only allowlisted metadata enters SQLite. Concurrent hooks/child linkage, pause boundaries, parsing and competing sync checkpoints use synthetic regression tests, not live-client callback claims.
