# Keith's project experiment tracker

Independent Python 3.10+ tooling on macOS/Linux for EXP-01–09 and DEV-02/04. No TurnUp integration, model calls, cloud service, application changes or new runtime dependencies. Private state lives in ignored `.experiment-tracker/`; substantial-request summaries stay in `logs/keith/`.

## Recording is off until you explicitly start it

Project directory membership, a substantial request, source attachment and annotations **never** activate recording. The skill must receive your direct start/resume instruction. Unassigned and paused general questions are excluded before hook persistence and during import; there is no semantic classifier guessing whether a question is relevant.

One increment can span multiple bounded runs and sessions, with one member log. Within a session, each source turn can belong to only one recording window/run. You can switch increments after stopping the prior run and beginning a new turn.

## Install once per checkout

```sh
python3 workflow/experiment-tracker/tracker.py doctor
python3 workflow/experiment-tracker/tracker.py install-hooks
```

Restart Codex and review `/hooks` if required. Only ignored project `.codex/hooks.json` is changed; global/unrelated handlers remain. Installed is not observed: `doctor` distinguishes actual callbacks. Hooks return empty JSON and never request continuation or block project work.

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

The skill identifies the real current session/source, never inventing IDs or scanning unrelated conversation contents. `CODEX_THREAD_ID` is normally available in Codex subprocesses; in an ordinary terminal replace it with the actual root session ID shown by doctor/report rather than assuming the variable is set. `attach` validates the exact source's metadata and registers it without importing usage. Start/resume require a source `task_started` with no matching terminal record; no reliable current turn means activation is refused, with instructions to attach the source or invoke from an active agent turn. Start includes that whole initiating turn, including work before the command, but excludes every earlier turn. New recording turns require observed structural admission; unknown IDs remain excluded.

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

Pause/stop first reconcile known sources and freeze admissions. Already-admitted active root/child turns drain, while new turns and children are rejected. States are `recording`, `draining-to-pause`, `paused`, `draining-to-stop`, `stopped`; sessions without runs are `off`. Reconcile with `sync`/`status`. Root lifecycle commands govern all members; a child cannot pause the root. Stop closes the run, not the increment or its log.

Only source `task_complete` proves terminal completion; hook `Stop` alone does not prove final counters have flushed. Late measurements for admitted turns remain eligible even after stop. Missing terminal evidence never silently times out. If recovery is impossible, explicitly acknowledge incomplete coverage:

```sh
python3 workflow/experiment-tracker/tracker.py finalize --session "$CODEX_THREAD_ID" --partial
```

This closes the unresolved run as partial; it does not kill agents. Tracking controls do not stop agent execution. Pause/stop from an agent prompt includes that prompt's already-recorded turn. To avoid admitting the general question itself, pause from the terminal **before** sending it, then wait for `paused`. Resuming includes its new initiating turn. Paused conversation may still appear as context in later counted model requests; use separate chats for the cleanest experiments.

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

Open ignored `.experiment-tracker/report.html`; it is offline and self-contained. Filter increments/runs/sessions/models/comparison groups; task filtering narrows annotations only, never inventing task-level token allocation. Recording windows, pending draining turns, roles, provenance and coverage are shown. Refresh with sync/report after terminal source records appear, including at the next session after the prior final response.

Schema v2 backs up v1 SQLite locally before transactional migration. Old records without run attribution stay **legacy/unbounded**, excluded from bounded totals and marked separately. Existing logs/exports remain historical; append a correction rather than rewriting them. Old queued events without admitted run identity are discarded. There is no automatic retrospective turn assignment. Explicit exports omit local source paths and raw request records; review author-written annotations before publishing. Existing v1 exports must not be mixed into bounded comparison totals.

Response IDs deduplicate usage. Cached input is an input subset; reasoning output is an output subset. Cumulative fallback never charges paused gaps: its first ambiguous boundary sample is excluded and reported partial. Missing IDs/counters stay unavailable. Uncompressed JSONL only; compressed/unknown formats require separate adapter verification. Every sync validates SHA-256 over the complete consumed prefix using bounded reads; rewrites rebuild scoped records even if the header, size and tail are unchanged. Legacy tail-only checkpoints replay once to establish the stronger digest. Hashing reads the consumed prefix each sync; parsing stays incremental when unchanged. Incomplete trailing lines are excluded until completed. Failed sources remain visible. No causal savings, monetary cost, inferred idle time or unnecessary-tool classification is generated. Record human annotation effort with an overhead annotation.

`uninstall-hooks` removes owned handlers but is **not** a recording boundary; use stop first. Private data remains until deliberately deleted. No application deployment or global collector is affected.

## Verification

```sh
python3 -m unittest discover -s workflow/experiment-tracker -v
npm run check
```

Tests use synthetic sources only. Capability references: [Codex hooks](https://learn.chatgpt.com/docs/hooks), [telemetry configuration](https://learn.chatgpt.com/docs/config-file/config-advanced). Installed callbacks must be verified in the actual client; configuration alone is not evidence of collection.
