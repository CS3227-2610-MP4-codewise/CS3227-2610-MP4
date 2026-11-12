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
