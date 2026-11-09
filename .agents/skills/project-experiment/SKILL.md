---
name: project-experiment
description: Manage Keith's explicitly opted-in Codewise experiment recording and per-increment member logs. Use for requested start/pause/resume/stop, experiment evidence and substantial log checkpoints. Never activate from an ordinary task or routine question. Does not spawn agents or change Darryl's logging policy.
---

Use `python3 workflow/experiment-tracker/tracker.py` from the project root. Read `workflow/experiment-tracker/README.md` for command syntax, recording states and recovery.

Recording is **off by default**. A substantial project task, directory context, annotation, source attachment or log checkpoint is not consent to record. Only an explicit user start/resume instruction activates collection. Do not silently activate for implementation requests. Narrative logging under Keith's existing substantial-request policy can continue with unavailable metrics while recording is off.

When explicitly asked to start:

- Reuse the agreed increment ID/log across sessions. Run `doctor` and `status --session ACTUAL_ID`. Use the real session ID and exact current transcript; do not invent IDs or scan unrelated session contents. Attach that scoped source if needed:
  - Codex: `$CODEX_THREAD_ID`; attach the exact session JSONL path.
  - Claude Code: `$CLAUDE_CODE_SESSION_ID`; run `attach --claude-session "$CLAUDE_CODE_SESSION_ID"`, which opens only the transcript with that exact file name. Claude hooks come from `install-hooks --client claude` (ignored `.claude/settings.local.json`).
- Compare usage within one client. Claude Code input totals include cache reads and writes; cache writes are supplemental; Codex-only rate-limit context and cumulative fallback do not exist for Claude Code.
- Run `start INCREMENT --title ... --requirements ... --session ID --role coordinator --label Coordinator`. It must identify the active initiating turn. That whole turn is included, earlier turns excluded. If identity is unavailable, report activation refused and continue authorized work without telemetry.
- An already-recording run needs no restart. A paused run uses explicit `resume`; a stopped run needs `start` in a new turn. State `draining-*` must settle before resume. Never infer opt-in from an old log or prior stopped run.
- Record redacted experiment hypothesis, comparison group, task type, context strategy, instruction revision and confounders. No agents are spawned by this skill; delegation still requires its actual authorization.

When asked to pause/stop, run that lifecycle command for the root session. It freezes admissions across root and linked children, drains already-admitted turns, and rejects new turns/children. It does not terminate agents. Sync/status after terminal source records appear. Never claim paused/stopped while state remains draining. Replay can return a settled pause/stop to draining when terminal evidence disappears; it never resumes recording. Missing terminal evidence stays pending; use `finalize --partial` only when the user explicitly accepts incomplete finalization. For historical recovery alongside a newer run, inspect `status --session ROOT --run ID` and target only that run with `finalize --session ROOT --run ID --partial`. Stop hooks alone do not prove counters have flushed. Explain that an in-chat pause instruction's own turn is counted; use a terminal pause before sending general questions for a cleaner boundary.

Assign responsibility separately from identity: `agent-role --session ROOT_SESSION --agent ACTUAL_SESSION --role ROLE --label LABEL`. Root runtime `/root` remains unchanged. For a child's first role assignment supply its actual observed `--runtime-id`, not an invented path. Actual nested parentage is required; no child joins during drain. Missing linkage/source records are coverage gaps.

During opted-in work, annotate meaningful assignments/file windows, blockers/unblockers, context supplied/retrieved, producer/consumer revisions, reviews/severity/repairs, disagreements/resolutions, retries/rework, verification/acceptance and human annotation overhead. Persist concise redacted rationale, never conversation/tool bodies or hidden reasoning. Measured facts and annotations remain distinct.

At substantial-request checkpoints:

1. Run `sync`, `report` and inspect coverage/state. Attachment alone never opts in. Current-turn totals stay provisional; later sync can reconcile admitted late usage after stop.
2. Append `checkpoint INCREMENT UNIQUE-ID --request SUMMARY --results ACTUAL-OUTCOMES --evidence LINKS --next-action ...`. Reuse the log, not the checkpoint ID; replay is idempotent. Include actual checks, responsibilities (or no children), blockers and next owner. Routine questions need no entry. Do not add cumulative checkpoint totals together.
3. Keep v1 pilot logs/exports as legacy/unbounded and excluded from bounded comparisons. Append corrections instead of rewriting history. Report unavailable counters and ambiguous cumulative boundary samples honestly.
4. Export author-redacted evidence only within the user's authorized evidence scope. Never export raw sessions. A current-turn snapshot excludes the later final response until the next reconciliation.

Unavailable telemetry must not block authorized project work. Do not classify question intent, infer idle/waste or claim savings without supporting measurements and comparable outcomes. Paused questions may remain input context for later recorded turns; separate chats give cleaner experiments.
