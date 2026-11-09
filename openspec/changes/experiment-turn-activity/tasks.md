# Tasks

## 1. Turn data model

- [x] 1.1 Add the nullable `members.parent_turn` column and `checkpoint_turns` table in the additive migration, and write `parent_turn` from `link_child` for Codex and Claude children. Verify with `test_tracker.py`/`test_claude_adapter.py` cases: migration on an existing database keeps rows with NULL parent turn, and a newly linked child stores its validated parent turn (EXP-12).
- [x] 1.2 Add `snapshot['turns']` (identity, start/end, status, distinct models/efforts, output, reasoning output, response list, children), built from admitted turns only. Verify with synthetic tests for: multiple responses, mixed model/effort, unavailable vs zero reasoning, provisional/pending/partial/aborted turns, unmeasured responses, and exclusion of legacy unbounded records (EXP-11, EXP-12).
- [x] 1.3 Verify spawn attribution in tests: a child linked inside an admitted parent turn appears in that turn's children, a pre-migration child shows the spawning turn as unavailable, and nested children carry their own parent turn (EXP-12).

## 2. Report activity view

- [x] 2.1 Add the "Agent activity — per turn" table to `report.html`, with collapsed response rows, an including-spawned-sessions rollup (each turn once, partial when a descendant is unmeasured), and the output-is-not-cost note. Verify with `npx vitest run workflow/experiment-tracker/report.test.ts` cases for row and response expansion, rollup with nesting and unmeasured descendants, and unavailable vs zero (EXP-11, EXP-12).
- [x] 2.2 Apply the increment/group/run/session/model filters and reset to the activity table. Verify with vitest: a model filter narrows response rows and sums while keeping status, conflicting filters show no rows, and reset restores all rows (EXP-11).
- [x] 2.3 Document the activity view, display-only counters and spawn attribution limits in `workflow/experiment-tracker/README.md`. Verify the README commands and terms match the CLI and report labels.

## 3. Keith checkpoint tables and template

- [x] 3.1 Create `workflow/templates/keith-prompt-experiment.md` (header plus repeated checkpoint entry with Agents spawned, Turn activity, Reconciliation and Coverage sections), and switch `ensure_log` to it for newly created logs. Verify with a test that a new log uses the template and an existing member-log header is left byte-identical (EXP-13).
- [x] 3.2 Extend `checkpoint()` to append new-turn and reconciliation tables from `snapshot['turns']`, record `checkpoint_turns` inside the log lock, and embed hashed turn keys. Verify with tests for: two checkpoints never repeat a turn, a provisional turn is reconciled at the next checkpoint with the earlier row unchanged, replay is idempotent including after database loss, the no-new-turns and recording-off messages appear, and the log contains no source paths or full session IDs (EXP-13, EXP-06).
- [x] 3.3 Update `.agents/skills/project-experiment/SKILL.md` and `.claude/skills/project-experiment/SKILL.md` checkpoint guidance, keeping them identical. Verify parity with the existing skill-parity test.
- [x] 3.4 Update the Keith policy references in AGENTS.md, logs/README.md and workflow/README.md to the new template, keeping Darryl's policy text unchanged and the substantial-request-only rule for Keith. Verify by diff review, and record the request for Darryl's review in the handoff (EXP-13).

## 4. Integration verification

- [x] 4.1 Run `python3 -m unittest discover -s workflow/experiment-tracker -v`, `npx vitest run workflow/experiment-tracker/report.test.ts`, `npm run check` and `npx openspec validate experiment-turn-activity --strict`. Record exact outcomes in `workflow/evidence/experiment-turn-activity/verification.md`.
- [x] 4.2 Generate a report and a checkpoint from synthetic fixtures only (no real sessions). Confirm the activity table and log table agree turn-for-turn, and save redacted output as evidence. Live opted-in verification is out of scope unless Keith explicitly starts recording.
- [x] 4.3 Write `workflow/handoffs/experiment-turn-activity.md` with requirement IDs, owned files, verification outcomes, the pending Darryl review of shared policy wording, and the next owner.

## Workflow follow-up

- Archive `project-experiment-tracker` before archiving this change, so the ADDED requirements merge into an existing `experiment-tracking` main spec.
- Archive this change after review and merge.
