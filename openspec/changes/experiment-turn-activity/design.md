# Design

## Context

See proposal.md for the motivation. Current state:

- `usage` records are stored one per deduplicated response (`tracker.py` Claude adapter and Codex import). Each holds counters, `model` and `effort`, keyed by `session_id` and `turn_id`, with `run_id`.
- `admitted(session_id, turn_id, run_id, window_id, admitted_at, terminal, partial, finalized_partial)` defines which turns count.
- `members(run_id, session_id, parent)` links children to parent sessions. `link_child` receives `parent_turn`, but persists it only in `spawned`, and only for Claude children that were not yet admitted. So turn-level spawn evidence is currently incomplete.
- `checkpoint()` appends a Request/Results entry containing cumulative increment totals, idempotently by an HTML-comment marker. The log file marker, not the database, is authoritative after a crash.
- `report.html` renders the snapshot JSON client-side with filters. Its agent timeline is event-based.

Constraints: EXP-06 (allowlisted metadata only), EXP-07/08 (only admitted turns count; legacy unbounded data excluded), and append-only logs (EXP-05).

## Goals / Non-Goals

**Goals:**
- A single per-turn derivation shared by the report and checkpoint tables, so they cannot disagree.
- Structural, not inferred, spawn attribution.
- Additive local schema change only.

**Non-Goals:**
- Changing collection, hooks, allowlists, existing totals or export formats.
- Retroactively assigning parent turns to children linked before this change.
- Per-prompt entries for routine or unrecorded turns.

## Decisions

### D1. Derive turns in the snapshot, not in the browser
Add `snapshot['turns']`, one object per admitted turn:
- identity: `session_id`, `turn_id`, `run_id`, `increment_id`, `parent_session`, `parent_turn`
- times: `start` (`admitted_at` or `task_started` ts), `end` (terminal record ts)
- `status`: `final`, `provisional`, `pending` or `partial`
- `models[]`, `efforts[]` (distinct values, `unavailable` kept as a value)
- `output` and `reasoning_output` (null when unmeasured)
- `responses[]`: `ts`, `model`, `effort`, `output`, `reasoning_output`, `response_id` hash
- `children[]`

The report computes the including-descendants rollup and applies filters. The checkpoint uses the same `turns` list.

*Alternative:* derive everything in `report.html` from `records`. Rejected, because the checkpoint writer (Python) would need a second implementation.

### D2. Persist the spawning turn on membership
Add a nullable `parent_turn` column to `members`. `link_child` writes it for every client, using the parent turn it already validated. Existing rows stay NULL, which shows as "unavailable" (EXP-12, parent turn unavailable). `spawned` is unchanged; it keeps its admission role.

*Alternative:* infer the parent turn from timestamps. Rejected as inference.

### D3. Including-descendants rollup over the membership tree
Children of a turn are members whose `(parent, parent_turn)` match it. The rollup for a turn = own output + the full output of every turn of each child session, recursively. Each turn is visited once, with a visited set to guard against cycles. A descendant with null output marks the rollup partial. A Claude child is one turn. A Codex child session may have several turns, and all count toward the spawning turn's rollup because that turn spawned the session. The UI labels this "including spawned sessions".

### D4. Display-only output counters
The new views read only `output_tokens` and `reasoning_output_tokens`. A note links to the existing usage table for input, cached input and cache writes. No stored field is dropped.

### D5. Checkpoint turn reporting state
Add a `checkpoint_turns(increment_id, checkpoint_id, session_id, turn_id, status, PRIMARY KEY(increment_id, session_id, turn_id, checkpoint_id))` table. At checkpoint:
1. Select the increment's admitted turns with no `checkpoint_turns` row: these are new rows.
2. Select turns whose latest reported status was not `final` and whose current status differs: these become reconciliation rows.
3. Render both tables from `snapshot['turns']`.
4. Write the log and insert the rows inside the existing log lock.

Crash safety: the log marker stays authoritative. On replay where the marker exists but the rows are missing (database loss), the tracker reads the entry's embedded comment `<!-- experiment-turns: h1,h2,... -->`, where each value is a short SHA-256 of `session_id:turn_id:status`. It matches those hashes against admitted turns to restore the rows without rewriting the log. Hashes that match no admitted turn are ignored.

*Alternative:* recompute "since previous checkpoint" by timestamp. Rejected, because late-arriving usage and draining turns would be dropped or double-counted.

### D6. Template and log format
`workflow/templates/keith-prompt-experiment.md` defines:
- a header (owner, increment, change/requirements, branch/PR)
- a repeated checkpoint entry: Request, Results, `### Agents spawned` (children per turn, or None), `### Turn activity` (table: Agent/role, Session (8-char prefix), Parent, Turn start, End, Status, Model, Effort, Output, Reasoning output, Output incl. spawned), Reconciliation, Coverage note (output ≠ cost; cumulative usage line retained as before)

`ensure_log` uses the new template for new logs. `checkpoint()` emits the new entry format for all logs. Old headers that say "Keith retains this existing summary format" stay as history.

### D7. Privacy and authorization
- Only identifiers, labels, timestamps, models, efforts, statuses and counters are written. Session IDs are shortened in committed logs. Source paths never appear.
- Role labels are display metadata, never authorization (EXP-09).
- No network calls or deployment surface. All of this is local tooling under `workflow/`.
- Resource limits: tables are bounded by the admitted turns of one increment. The report collapses response rows by default.

## Risks / Trade-offs

- [Children linked before this change have no `parent_turn`] → They show as "spawning turn unavailable"; this is documented. No retroactive inference.
- [Codex child sessions span several turns, so a rollup can include later work the child did] → Labelled "including spawned sessions"; each turn is still counted once.
- [Large increments make long log tables] → Only new and reconciled turns are written per checkpoint. Response detail stays in the HTML report and never goes in the log.
- [Output-only view understates cost] → An explicit note, with the existing usage table retained.
- [AGENTS.md wording change is shared] → It needs Darryl's review before merge; Darryl's own policy text is unchanged.
- [`project-experiment-tracker` remains unarchived] → Archive it before this change so the ADDED delta has a main spec to merge into.

## Migration Plan

- Additive `ALTER TABLE members ADD COLUMN parent_turn TEXT` and `CREATE TABLE IF NOT EXISTS checkpoint_turns`, run in the existing `migrate_recording`. No backup is needed for additive columns, but the existing backup path is unaffected.
- Rollback: older tracker code ignores the extra column and table. Logs remain valid Markdown.
