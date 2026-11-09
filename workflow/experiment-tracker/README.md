# Keith's project experiment tracker

Independent Python 3.10+ tooling on macOS/Linux for Codex and Claude Code sessions (EXP-01–10 and DEV-02/04). No TurnUp integration, model calls, cloud service, application changes or new runtime dependencies. Private state lives in ignored `.experiment-tracker/`; substantial-request summaries stay in `logs/keith/`.

## Recording is off until you explicitly start it

Project directory membership, a substantial request, source attachment and annotations **never** activate recording. The skill must receive your direct start/resume instruction. Unassigned and paused general questions are excluded before hook persistence and during import; there is no semantic classifier guessing whether a question is relevant.

One increment can span multiple bounded runs and sessions, with one member log. Within a session, each source turn can belong to only one recording window/run. You can switch increments after stopping the prior run and beginning a new turn.

## Install once per checkout

```sh
python3 workflow/experiment-tracker/tracker.py doctor
python3 workflow/experiment-tracker/tracker.py install-hooks                  # Codex
python3 workflow/experiment-tracker/tracker.py install-hooks --client claude  # Claude Code
```

Restart the client and review `/hooks` if required. Codex changes only ignored project `.codex/hooks.json`; Claude Code changes only ignored `.claude/settings.local.json`, never the committed `.claude/settings.json` (shared hooks would also run in Darryl's sessions). Global/unrelated handlers and other settings remain. `uninstall-hooks --client claude` removes only the tracker's own handlers. Installed is not observed: `doctor` distinguishes actual callbacks. Hooks return empty JSON and never request continuation or block project work.

For another Git worktree, run `register-worktree /absolute/worktree` against the original tracker, then `install-hooks --worktree /absolute/worktree` to centralize state. All commands accept `--root /original/project` before the command. Worktree registration verifies the common Git directory. Do not combine Darryl's sessions into Keith's local tracker.

## Start a bounded run

In an active project chat, ask:

> Use $project-experiment to start recording increment student-drafts, with the root acting as Coordinator. Include this initiating turn, then record only admitted project turns.

The equivalent commands are:

```sh
python3 workflow/experiment-tracker/tracker.py attach /absolute/current-session.jsonl
python3 workflow/experiment-tracker/tracker.py start student-drafts \
  --title 'Student drafts' --requirements 'SUB-02, UI-04' \
  --hypothesis 'Concise handoffs reduce rediscovery without missed constraints' \
  --group context-comparison --session "$CODEX_THREAD_ID" \
  --role coordinator --label Coordinator
python3 workflow/experiment-tracker/tracker.py status --session "$CODEX_THREAD_ID"
```

In Claude Code, attach by exact session ID instead of a path; only `~/.claude/projects/*/ID.jsonl` (or `$CLAUDE_CONFIG_DIR/projects`) with that file name is opened:

```sh
python3 workflow/experiment-tracker/tracker.py attach --claude-session "$CLAUDE_CODE_SESSION_ID"
python3 workflow/experiment-tracker/tracker.py start student-drafts --title 'Student drafts' \
  --session "$CLAUDE_CODE_SESSION_ID" --role coordinator --label Coordinator
```

Use `$CLAUDE_CODE_SESSION_ID` wherever the Codex examples below use `$CODEX_THREAD_ID`. The skill identifies the real current session/source, never inventing IDs or scanning unrelated conversation contents. `CODEX_THREAD_ID` is normally available in Codex subprocesses; in an ordinary terminal replace it with the actual root session ID shown by doctor/report rather than assuming the variable is set. `attach` validates the exact source's metadata and registers it without importing usage. Start/resume require a source `task_started` with no matching terminal record; no reliable current turn means activation is refused, with instructions to attach the source or invoke from an active agent turn. Start includes that whole initiating turn, including work before the command, but excludes every earlier turn. New recording turns require observed structural admission; unknown IDs remain excluded.

`start` creates/reuses the existing template-based increment log. For an already-recording run, use `status` and continue; do not start again. Stopped runs cannot resume; `start` in a new turn creates a new run for the same increment/log. A paused run uses `resume`.

## Pause, resume and stop

```sh
python3 workflow/experiment-tracker/tracker.py pause --session "$CODEX_THREAD_ID"
python3 workflow/experiment-tracker/tracker.py sync
python3 workflow/experiment-tracker/tracker.py status --session "$CODEX_THREAD_ID"
# Wait until state is paused before sending general questions.
python3 workflow/experiment-tracker/tracker.py resume --session "$CODEX_THREAD_ID"
python3 workflow/experiment-tracker/tracker.py stop --session "$CODEX_THREAD_ID"
```

Pause/stop first reconcile known sources and freeze admissions. Already-admitted active root/child turns drain, while new turns and children are rejected. States are `recording`, `draining-to-pause`, `paused`, `draining-to-stop`, `stopped`; sessions without runs are `off`. Reconcile with `sync`/`status`. If replay removes terminal evidence after settlement, the run returns to the corresponding draining state, with its recording windows still closed. Restored terminal evidence settles it again. Root lifecycle commands govern all members; a child cannot pause the root. Stop closes the run, not the increment or its log.

Only source `task_complete` proves terminal completion; hook `Stop` alone does not prove final counters have flushed. Late measurements for admitted turns remain eligible even after stop. Missing terminal evidence never silently times out. If recovery is impossible, explicitly acknowledge incomplete coverage:

```sh
python3 workflow/experiment-tracker/tracker.py finalize --session "$CODEX_THREAD_ID" --partial
```

For historical recovery alongside a newer run, obtain the run ID from the report and target it explicitly:

```sh
python3 workflow/experiment-tracker/tracker.py status --session ROOT_SESSION_ID --run RUN_ID
python3 workflow/experiment-tracker/tracker.py finalize --session ROOT_SESSION_ID --run RUN_ID --partial
```

This closes only the selected unresolved run as explicitly partial; it does not kill agents or change a newer recording. Explicit partial provenance survives late terminal evidence and replay. Abort-derived partial flags are recomputed from surviving admissions rather than kept forever. Tracking controls do not stop agent execution. Pause/stop from an agent prompt includes that prompt's already-recorded turn. To avoid admitting the general question itself, pause from the terminal **before** sending it, then wait for `paused`. Resuming includes its new initiating turn. Paused conversation may still appear as context in later counted model requests; use separate chats for the cleanest experiments.

## Multi-agent roles and attribution

Children join only through actual parent/turn evidence during recording. Nested children inherit the run, and each child's active turn must be independently identified. No child joins during drain. Unrelated sessions and missing/conflicting parentage never gain authority to record. Attach a proven child's exact source with `attach PATH --parent PARENT_SESSION_ID` if callback source discovery is unavailable; attachment alone does not join a run or admit turns. Verify linkage in status/report; missing sources are coverage gaps.

Keep runtime identity, role and display label separate. Root defaults to actual `/root`, role `coordinator`, label `Coordinator`. Change its responsibility/display without renaming runtime identity:

```sh
python3 workflow/experiment-tracker/tracker.py agent-role \
  --session ROOT_SESSION_ID --agent ROOT_SESSION_ID \
  --role implementer --label Implementer
python3 workflow/experiment-tracker/tracker.py agent-role \
  --session ROOT_SESSION_ID --agent ACTUAL_CHILD_SESSION_ID \
  --runtime-id /root/reviewer --role reviewer --label Reviewer
```

Provide a child's observed runtime identity, not an invented path. Role assignments are annotated metadata, never an authorization grant. Changes append history; an existing identity cannot be changed by a role command. Display labels and real session/runtime IDs remain available together.

## Per-turn agent activity (EXP-11–13)

The report's **Agent activity — per turn** table has one row per admitted turn: agent label/role, session, parent (parent agent, session and spawning turn), start, end, status, model(s), effort(s), output, reasoning output, output including spawned agents, spawned agents and a collapsed list of that turn's responses. These views show **output tokens only**. That is a display choice: every counter is still stored, and the resource summary, usage provenance, totals, exports and checkpoint usage lines are unchanged. Output shows how much an agent produced, not what it cost. For Claude Code, cost is mostly input and cache reads.

- Status: `final` (terminal completion with measured responses), `provisional` (still running), `pending` (still running while its run drains) or `partial` (aborted, explicitly finalized partial, a response without usable usage, an ambiguous fallback boundary, or completed with no usage). Missing values are `unavailable`, never zero. Mixed models or efforts within a turn are all listed.
- Spawned agents: a child is attributed to the turn that spawned it only through structural evidence. The tracker stores the validated parent turn when the child is linked. Children linked before this change, or without that evidence, appear below the table as "spawning turn unavailable" and are never assigned to an inferred turn. An unassigned Claude child is labelled with its observed `SubagentStart` agent type.
- Output incl. spawned: own output plus every turn of each spawned session, recursively, with each turn counted once. A Codex child session can have several turns, and all of them count. The value is marked partial when any descendant is unmeasured or partial.
- Filters: increment/group/run/session filters select rows. The model filter narrows response rows and sums but keeps each turn's real status. A session filter still includes descendants in the rollup.

Each `checkpoint` also appends turn tables to the Keith log: the increment's admitted turns not shown at an earlier checkpoint, plus reconciliation rows for turns an earlier checkpoint showed as provisional, pending or partial whose status has since changed. Earlier rows are never rewritten, so a turn's output is never counted in two new-turn tables. Committed tables contain labels, roles, 8-character session prefixes, timestamps, models, efforts, statuses and output counters only. They never contain source paths, prompts or tool content. New logs use [`keith-prompt-experiment.md`](../templates/keith-prompt-experiment.md). Existing logs keep their historical header and entries, and new entries in them follow the new format.

## Claude Code adapter

Claude Code transcripts have no header record, turn IDs or cumulative counters, so a separate adapter (EXP-10) maps their observed structure. The format is undocumented and was verified against Claude Code 2.1.309–2.1.319; unrecognised structure fails closed as a source warning or an unattachable source, never as invented data.

| Concept | Codex | Claude Code |
|---|---|---|
| Identity | `session_meta` header | Consistent `sessionId`/`cwd` in early records, and file name `<sessionId>.jsonl`; subagents are `agent-<agentId>.jsonl` whose `sessionId` proves the parent |
| Turn start / ID | `task_started.turn_id` | User record with `turnPosition`; a new `turnIndex` starts a turn identified by its `promptId`. Queued prompts in an open turn share it |
| Completion / abort | `task_complete` / `turn_aborted` | `system` `turn_duration` / user record with `interruptedMessageId`. A subagent's single turn completes at its `end_turn` response |
| Usage | `token_usage_record`, cumulative fallback | `message.usage`, deduplicated by message ID (one response spans several records with identical usage). No fallback |
| Hook turn | Payload `turn_id` | Derived from the exact registered transcript outside the write lock; only turns that began inside an open window are admitted |

Counter mapping: input = `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`; cached input subset = cache reads; reasoning output subset = `output_tokens_details.thinking_tokens` (already inside output); total = input + output. Cache writes are reported separately as supplemental `cache_creation_input_tokens` because Codex has no equivalent. Model and effort come from each response record. Client-generated `<synthetic>` notices are not model requests and are skipped. Model and effort belong to their response ID; a response that omits them reports unavailable rather than inheriting the previous response's values. A response whose records never carry usable usage leaves a partial-coverage source warning until a record with the same ID supplies it.

A Claude child spawned (`SubagentStart`) while recording is eligible for its first turn even if pause/stop closes the window before its transcript arrives, so already-running delegated work drains instead of being dropped. Status lists such `pending_children`; the run stays draining and coverage provisional until the child's transcript is imported (a background child's `SubagentStop` after its parent turn still delivers the path) or `finalize --partial` resolves it as partial. No new child is linked while draining. Inline sidechain records in a root transcript are excluded with a partial-coverage warning; attach subagent transcripts instead (`SubagentStop` supplies their path).

Not available for Claude Code: rate-limit and context-window state, a cumulative usage fallback (a missing response record leaves that turn unmeasured and partial), a certain distinction between crash and interruption (an unterminated turn stays pending until explicit partial finalization), and per-request cost (not inferred for any client). Compaction (`compact_boundary`) is recorded, but later turns run on summarised context; treat it as a confounder. Codex and Claude Code counters are not directly comparable: a mixed-client selection shows a coverage caveat, so compare within one client. Subagent `agent_id` linkage and `CLAUDE_CODE_SESSION_ID` were observed locally, but live hook callbacks still need verification in the actual client after installation.

## Annotations and Keith logs

Use redacted summaries only. No raw prompts, tool bodies, learner code, credentials or hidden reasoning. Annotation kinds: `experiment`, `assignment`, `context`, `blocked`, `unblocked`, `idle`, `active`, `handoff`, `review`, `conflict`, `decision`, `retry`, `rework`, `verification`, `acceptance`, `overhead`.

```sh
python3 workflow/experiment-tracker/tracker.py annotate student-drafts experiment \
  --task editor --data '{"summary":"Compare concise and full handoff", "task_type":"implementation", "context_strategy":"targeted retrieval", "instruction_version":"commit-or-skill-hash", "confounders":"Different task size; descriptive only"}'
python3 workflow/experiment-tracker/tracker.py checkpoint student-drafts first-check \
  --request 'Implement the agreed student draft increment' \
  --results 'Optimistic saves implemented; focused conflict checks passed' \
  --evidence '[Verification](../../workflow/evidence/student-drafts/verification.md)' \
  --next-action 'Keith: complete reviewed-producer integration'
```

Annotation JSON accepts bounded text fields: `summary`, `rationale`, `outcome`, `evidence`, `files` (comma-separated), `context_strategy`, `instruction_version`, `task_type`, `window`, `severity`, `confounders`, `next_action`. Use matching agent/task/dependency fields for blocked/unblocked intervals; timestamps require timezones. `--id` supports replay. Concurrent file assignments share a `window`; sequential ownership uses a new window after the earlier one ends. These are evidence checks, not proof of unobserved behavior.

Checkpoint appends one Request/Results entry per substantial request to the same log, idempotently by checkpoint ID. Historical entries are never rewritten. Totals are cumulative bounded-increment snapshots: **do not add checkpoint totals together**. Routine questions need no entry. Checkpoint/annotation do not activate recording. Metrics unavailable must not prevent truthful narrative logging. Darryl's per-prompt format is unchanged.

## Reports, reconciliation and migration

```sh
python3 workflow/experiment-tracker/tracker.py sync
python3 workflow/experiment-tracker/tracker.py report
python3 workflow/experiment-tracker/tracker.py validate
python3 workflow/experiment-tracker/tracker.py export student-drafts \
  --output workflow/evidence/student-drafts/tracker
```

Open ignored `.experiment-tracker/report.html`; it is offline and self-contained. Filter increments/runs/sessions/models/comparison groups; task filtering narrows annotations only, never inventing task-level token allocation. Explicit task IDs link annotations within their increment; untasked experiments match only their own type and never link unrelated untasked context/reviews. Recording windows, pending draining turns, roles, provenance and coverage are shown. Snapshot/export member rows retain linked children even before turn admission, and each selected session has an attached or missing source row. Coverage/status follow increment/group/run/session filters; model filters narrow token totals while coverage retains all models within that selection. Whole-run partial flags remain visible separately from session-specific status. Source warnings remain source-wide. Boundary ambiguity is tracked per turn: exact response usage clears its own boundary warning, while other ambiguous turns and malformed-record warnings remain partial. Old boundary-only checkpoints replay once to recover turn provenance. Structurally malformed records are skipped with a redacted coverage warning while valid later records continue importing. Run-specific coverage omits annotation gaps without run attribution. The decisions/context table restricts annotations to the selected run’s increment and selected session; conflicting filters show none. Coordination checks are also restricted to surviving selected-run increments and clear on conflicting filters. Annotations and checks have no run IDs, so individual-run allocation within an increment remains unavailable. Repeated tool-name candidates/counts follow the selected tool records; a name used once in that selection is omitted even if repeated elsewhere. Legacy exclusion counts and sync overhead describe the workspace. Refresh with sync/report after terminal source records appear, including at the next session after the prior final response.

Schema v2 backs up v1 SQLite locally before transactional migration. The additive replay-recovery upgrade also backs up existing v2 metadata, preserves identifiable explicit-finalization rows in a separate provenance column and repairs derived run aggregates. Previously erased provenance cannot be reconstructed. Old records without run attribution stay **legacy/unbounded**, excluded from bounded totals and marked separately. Existing logs/exports remain historical; append a correction rather than rewriting them. Old queued events without admitted run identity are discarded. There is no automatic retrospective turn assignment. Explicit exports omit local source paths and raw request records; review author-written annotations before publishing. Existing v1 exports must not be mixed into bounded comparison totals.

Response IDs deduplicate usage. Cached input is an input subset; reasoning output is an output subset. Cumulative fallback never charges paused gaps: its first ambiguous boundary sample is excluded and reported partial. Completed admitted turns without usable total-token usage, and missing requested counter fields, mark coverage partial with an explicit gap; known sums cover observed records only. Late usage is reevaluated on sync. Measured zero cumulative deltas are persisted when the fallback baseline is usable, just as exact zero counters remain valid; missing IDs/counters stay unavailable. Uncompressed JSONL only; compressed/unknown formats require separate adapter verification. Every sync validates SHA-256 over the complete consumed prefix using bounded reads; rewrites rebuild scoped records even if the header, size and tail are unchanged. Legacy tail-only checkpoints replay once to establish the stronger digest. Hashing reads the consumed prefix each sync; parsing stays incremental when unchanged. Source adapter revision 2 replays older checkpoints once to recover dropped zero measurements. Source reads, hashing and JSON parsing happen outside the admission write lock. Import writes use bounded batches (64 records or 1 MiB of complete lines, allowing one larger line up to the existing limit), atomically checking the checkpoint and current recording boundary. Conflicting checkpoint changes discard the prepared batch for fresh processing on the next sync; interrupted imports retain their committed progress and expose pending coverage. Incomplete trailing lines are excluded until completed. Failed sources remain visible. No causal savings, monetary cost, inferred idle time or unnecessary-tool classification is generated. Record human annotation effort with an overhead annotation.

`uninstall-hooks` removes owned handlers but is **not** a recording boundary; use stop first. Private data remains until deliberately deleted. No application deployment or global collector is affected.

## Verification

```sh
python3 -m unittest discover -s workflow/experiment-tracker -v
npx vitest run workflow/experiment-tracker/report.test.ts
npm run check
```

Tests use synthetic sources only. Capability references: [Codex hooks](https://learn.chatgpt.com/docs/hooks), [telemetry configuration](https://learn.chatgpt.com/docs/config-file/config-advanced); Claude Code hook settings are reviewed in its `/hooks` view. Installed callbacks must be verified in the actual client; configuration alone is not evidence of collection.
