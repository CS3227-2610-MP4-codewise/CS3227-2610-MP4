# Instructor UX refresh — Darryl prompt experiment

Owner: Darryl. Branch: codex/instructor-ux-refresh. Base 19311ae7a9f7f6fbae57f0f9ca588556ce8494b7. Requirements: AI-02/05, GRADE-01/02, AUTH-01/02, UI-01/03/04/05/06/07/08.

## Prompt INSTRUCTOR-UX-01 — 2026-11-13 Asia/Singapore

**Prompt (redacted):** Requested readable AI suggestions, a simpler generation/reference flow, repair of repeated page flicker, and an instructor UI/UX pass consistent with the student workbook.

### Agents spawned

- New agents: None; delegation was not requested and the developer forbids unsolicited subagents. One writer kept shared foreground authorization changes serialized.
- Reused agents: None.
- Main agent: /root, gpt-6.1-sol.
- Unknown historical activity/rationale: unavailable; earlier merged work is not attributed as current agent activity.

### Token count

| Agent | Input | Cached input (subset) | Output | Total | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed current-turn activity | none spawned or reused |

- Total unavailable. Private recorder scope/refresh not established; prior prompt reconciliation remains unavailable. No usage totals or source IDs invented. Subsequent calls and final response excluded. Reconcile completed records at the next available checkpoint; cached/reasoning figures would be subsets, not additions.
- Shared-turn group/per-prompt allocation: unavailable.

### Experiment outcome

- Expected benefit: preserve merged work through an isolated checkout, fix the concrete generation-control and foreground-focus defects, and verify the new workflow with tests and a synthetic browser before reporting it complete.
- Implemented in a clean worktree from origin/main, preserving the original dirty checkout. Git worktree creation required sandbox permission because Git metadata is read-only; allowed. No automatic approval rejection occurred. Synthetic preview required permitted local loopback access.
- Findings: checkbox markup omitted its existing class; AI candidate used dense all-question lists; repeated/internal focus could trigger page masking; duplicate focus checks were unbounded. New UI uses a primary action and optional reference settings, structured per-question review with full rationale, source-first grading and clearer authoring. Visual review caught an independent AI/workbook question picker mismatch and it was repaired with a shared index and another regression run.
- Repairs during verification: Windows temporary-cache EPERM resolved by a workspace TEMP/TMP directory; a test's browser/Worker DOM type conflict repaired; initial focus event identity comparison repaired using event.currentTarget; test expectations updated for coalesced outstanding authorization checks. Native click initially had no effect, so browser semantic locators were used and visible outcomes checked. Some screenshot captures cropped/scaled the view; failed captures removed and limitations recorded. No live provider calls or prompt changes.
- Checks: npm run check passed specs/typecheck/lint, then 744 tests passed, two Worker tests timed out, two skipped. Failed-file serial rerun: 3/3 passed. Deployment checks: 4/4 passed. Later UI/authorization/student/authoring focused run: 85/85. Final question-sync focused run: 15/15. Build passed with chunk-size warning. Final source verification recorded in evidence.
- Browser: synthetic generation/adoption, separate release, synchronized question selection, 18x18 checkbox, Enter disclosure, light/dark and representative 320/768/1024/1440 widths. No production or live-model acceptance claimed.
- Evidence: workflow/evidence/instructor-ux-refresh/verification.md and ui-review.md; workflow/handoffs/instructor-ux-refresh.md.
- No controlled comparison; token-efficiency inference unavailable. Reflection: live browser inspection caught a context mismatch missed by isolated panel tests, supporting combined UI/state verification without proving broader superiority.
- Next owner: Darryl for independent/human/staging review. No merge or deployment. PR details and final check checkpoint appended below.

### Review checkpoint — 2026-11-13

Committed implementation as b64ce3d and pushed codex/instructor-ux-refresh. Opened draft PR #37: https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/37. GitHub confirms base 19311ae and head b64ce3d. Original main checkout and its dirty files preserved; no merge/deployment. Final typecheck/lint/build passed; OpenSpec change validates and git diff check passed with line-ending warnings. Current prompt usage remains unavailable/provisional, with later calls and final response outside coverage. Reconcile at next checkpoint.

## Prompt INSTRUCTOR-UX-02 — 2026-11-13 Asia/Singapore

**Prompt (redacted):** Asked whether the authoring warning about student-side formatted rendering is stale or requires implementation.

### Agents spawned

- New agents: None; already inspected both student consumers and the shared renderer during this increment.
- Reused agents: None.
- Main agent: /root, gpt-6.1-sol.

### Token count

| Agent | Input | Cached input (subset) | Output | Total | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; shared active turn |
| Children | 0 | 0 | 0 | 0 | observed activity | no children |

Total/source group unavailable. This steering prompt shares the active turn with INSTRUCTOR-UX-01; per-prompt allocation unavailable, count any later reconciled shared-turn measurement once. Recorder scope/refresh not established; current and preceding usage reconciliation unavailable. Final response/later calls excluded.

### Experiment outcome

- The warning is stale: StudentWorkspace.tsx and Workbook.tsx both render question instructions using shared ui/instruction-text.tsx, which sanitizes formatted content. PR37 already replaces the warning with guidance to use Preview before publishing. No extra student feature or student source edits are needed for this correction.
- Verification: source inspection; full earlier suite included instruction renderer coverage, subsequent InstructionEditor and student DOM regressions passed in the 85-test focused run. No new test run needed for this explanatory steering prompt; no live deployment claimed.
- No controlled comparison; next owner Darryl for PR/staging acceptance.

## Prompt INSTRUCTOR-UX-03 — 2026-11-13 Asia/Singapore

**Prompt (redacted):** Requested commit, push and creation of a PR if the branch was not already linked to one.

### Agents spawned

- New agents: None; repository/PR verification and log checkpoint need no delegation.
- Reused agents: None.
- Main agent: /root, gpt-6.1-sol.

### Token count

| Agent | Input | Cached input (subset) | Output | Total | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed current activity | none |

Total/source group unavailable; recorder scope/refresh not established, earlier prompt reconciliation unavailable. Later calls/final response excluded. Reconcile next checkpoint; no invented usage.

### Experiment outcome

- Verified clean implementation worktree, local HEAD and upstream both cb16201. Live GitHub metadata confirms draft PR37 is open, unmerged, mergeable and points to the same branch/head. No duplicate PR needed. This prompt-log checkpoint is the only new change and is committed/pushed to that existing PR.
- Verification: git status/log/ref checks and GitHub PR metadata. Product tests not repeated for a log-only checkpoint; earlier outcomes remain in evidence. No merge or deployment. No controlled comparison; next owner Darryl for review.
