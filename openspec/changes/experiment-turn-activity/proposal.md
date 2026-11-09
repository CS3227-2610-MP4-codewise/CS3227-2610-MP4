# Proposal

## Why

Keith's tracker records per-response usage, roles and child linkage, but the report's agent timeline shows only session, timestamp and event, and checkpoint log entries show only cumulative increment totals. It is hard to see, per session, which agents each turn spawned, in which roles, and how much output each produced. Keith requested per-turn visibility in both the private HTML report and his committed logs.

## What Changes

- Add a per-agent-turn activity table to the offline report. Each row is one admitted turn and shows the agent label/role, parent, start/end, final/provisional/partial status, model(s), effort(s), output tokens, reasoning output tokens (when available), children spawned and output including descendants. Expanding a row shows its individual model responses.
- Show only output and reasoning output in the new views. All counters remain stored, and existing totals, coverage, exports and checkpoint usage lines are unchanged.
- Each checkpoint appends an auto-generated table of the turns admitted since the previous checkpoint for that increment. At the next checkpoint, an appended reconciliation note covers turns that were provisional. Earlier entries are never rewritten.
- Add `workflow/templates/keith-prompt-experiment.md` as the template for Keith's newly created increment logs and checkpoint entries. Existing logs keep their historical content, and new checkpoints appended to them use the new entry format.
- Update the Keith logging policy references (AGENTS.md, logs/README.md, workflow/README.md) so they point to the new template. Keith keeps the substantial-request checkpoint policy: routine questions and periods with recording off still need no entry.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `experiment-tracking`: adds requirements EXP-11 (per-turn activity view), EXP-12 (turn spawn attribution and output rollup) and EXP-13 (Keith checkpoint turn tables and template). Existing requirements EXP-01–EXP-10 are unchanged. The capability is currently defined by the unarchived `project-experiment-tracker` change, which must be archived before this change.

## Assumptions, exclusions and unresolved decisions

- **Excluded:** request/result summaries, LLM-generated text, monetary cost, and any new prompt/response/tool-argument persistence. This preserves EXP-06.
- **Display only:** "only record output tokens" means the new views display output only. Collection is unchanged (confirmed as the recommended option, which Keith accepted).
- **Granularity:** rows are turns, not lifecycle events. A Claude subagent is a single turn.
- **Spawn linkage:** a child is attributed to a parent turn only when structural evidence exists (the Claude `SubagentStart` spawn record with its parent turn). Otherwise the child is shown under its parent session with the turn marked "unavailable".
- **Output alone is not cost:** output tokens show how much an agent produced, not what it cost. The views say so.
- **Pending review:** AGENTS.md is a shared file. Darryl must review the wording change that replaces "Keith retains member-log.md". Darryl's own logging policy is unchanged.
- No application UI is affected, so warm-workbook UI-01–UI-08 do not apply. The private tracker report is developer tooling.

## Impact

- `workflow/experiment-tracker/tracker.py`: snapshot per-turn aggregation, checkpoint table generation, and tracking of turns already reported at a checkpoint.
- `workflow/experiment-tracker/report.html`: the new activity table with expandable rows, honouring the existing filters.
- Tests: `test_tracker.py`, `test_claude_adapter.py` and `report.test.ts`.
- Docs and templates: `workflow/experiment-tracker/README.md`, `.agents/skills/project-experiment/SKILL.md` (and its Claude copy), the new `workflow/templates/keith-prompt-experiment.md`, AGENTS.md, logs/README.md and workflow/README.md.
- Local SQLite state: one additive table for checkpoint turn reporting. The migration is additive with no backup-requiring rewrite.
- No application code, deployment, hooks or allowlist changes.
