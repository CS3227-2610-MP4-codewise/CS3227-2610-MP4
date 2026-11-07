# UI review: instructor-assessment-lifecycle

- Human owner/role: Darryl, instructor assessment only.
- Source: committed producerb7df0b9047d3ad57a4dda95e09bfa1d7258731a3, codex/instructor-assessment-lifecycle rebased on main969a062f5bdc8171c5a36a0ba06baedde8d2cb6d; source manifest in this evidence directory.
- Design: docs/ui/design.md, warm-workbook-v1, concise-copy refinement; GRADE-02–04, CON-05; UI-01/04/05/06/07/08.
- Shared writer: Darryl exclusively owns assessment-only0007 schema/migration and new assessment files; Keith ports, auth storage and production wiring unchanged.
- Review: main automated checks and source review; independent /root/assessment_review source/type review and focused re-review. No independent browser inspection.

| Review area | Outcome and evidence |
| --- | --- |
| Design identity UI-01 | Unverified visually. Source reuses warm tokens/Brand/type hierarchy; preview build passes. No screenshot proves appearance. |
| Sign-in UI-02 | Not applicable to this synthetic preview. Real auth is separately implemented; no synthetic identity in production. |
| Role switch UI-03 | Not applicable. Fixed server-owned synthetic instructor label, no role-grant control. |
| Versioned workspace UI-04 | Backend pinning/history/approval/release checks pass. Actual workbook interaction/visual confirmation unverified. |
| Next/Previous UI-05 | Source preserves question/attempt and feedback, guards unfinished observations, final action focuses review. Actual pointer/keyboard navigation unverified. |
| Evidence links UI-06 | Backend exact LF/range/excerpt tests pass. Marked-line/equivalent-list/focus/aria-live controls implemented and source-reviewed; actual focus/announcements unverified. |
| Responsive/keyboard UI-07 | Unverified:320/768/1024/1440px, native200% zoom, full keyboard/focus/touch-target matrix. Source stacks at760px, uses44px controls and no animations. |
| Contrast/appearance UI-01/07 | Unverified: no actual light/dark screenshot or rendered contrast measurement. Existing approved tokens reused. |
| Honest state UI-08 | Controller race/conflict/denial/history/retry tests pass. Observation unsaved/load/private-audit context repairs independently reviewed. Browser matrix still unverified. |
| Privacy AUTH-02/GRADE-04 | Service/consumer tests pass: fresh authorization, immutable evidence, no private/public field leakage, tombstones. Real Keith integration and DOM/cache inspection unverified. |
| Verification | Full local project check passed with VITEST_MAX_WORKERS=2; see verification.md. Source inspection/builds/tests are not live integration. |

## Evidence and decisions

The first browser visit displayed the preview's unavailable state. Direct local API plus the actual browser decoder passed; inspection found the synthetic cookie guard wrongly required the whole Cookie header to contain only its fixture cookie. Repaired to accept unrelated localhost cookies and reject duplicate fixture-cookie names; focused transport test covers both.

Subsequent browser navigation failed with ERR_NETWORK_IO_SUSPENDED, and Browser Use URL policy blocked the browser-generated data-URL error page. No bypass, fabricated screenshot or replacement-browser automation was used. The workbook's actual appearance,320px/native200% zoom, keyboard focus and announcements were not verified. A text question asks Darryl whether the normal browser can display the preview; answer/acceptance is still pending.

Independent review identified retained private context, missing consumer evidence checks, silently discarded unfinished observations and generic database failures mislabelled conflicts. Repairs and two remaining observation/context guards were source-reviewed as resolved. No intentional design departure is proposed.

Outcome: pending visual/accessibility verification and Darryl manual acceptance. Do not mark UI matrix tasks complete.

## Connected continuation UI-01/02/04/05/06/07/08

Real sign-in/course/assignment/assessment routes are connected in warm-workbook-v1, with real account/sign-out chrome and explicit sample markers. The public feedback preview has strict schema/identity checks and clears stale content on availability changes. Sign-in recovery preserves assessment destinations, with server-side destination authorization. API workflow verification passed; browser navigation to 127.0.0.1:8787/sign-in timed out and reset the browser connection. No screenshots, native zoom, keyboard, announcements or manual acceptance are claimed. Use the connected README manual checklist; previous synthetic-preview-only sign-in applicability statements are historical.

## IAL-11 interaction refinement review

Approved presentation scope preserves warm-workbook-v1. Read-only FoC User Service reference d6fdc85 influenced native account disclosure, clear action hierarchy, concise states and version dropdown; no FoC style, provider/role/password policy copied. Existing primary/secondary tokens and icons retained. Shared sign-out now owns pending protection and visible error recovery. Dirty confirmations remain. Invitation revoke is explicitly labelled and confirms the exact recipient before request. Assessment feedback labels derive from the displayed release, including current/superseded/withdrawn/private drafts; separate approval/release and public preview remain.

Actual native browser evidence (main, not reviewer): sign-in succeeded; course screen, account dropdown and invitation screen visually inspected in existing dark appearance. Escape closed disclosure and focus returned to its trigger.320px invitation form and popup were visually inspected without horizontal clipping. Browser later timed out during desktop navigation and reset attempt. No light-mode/desktop/200%-zoom/full-keyboard/announcements/complete assignment-assessment interaction claims; these remain manual checks. Screens contained actual user-entered email, so screenshots are not committed. Independent review was source inspection only; findings and repairs recorded in the log. No accepted visual result is inferred.

Manual checklist: verify account dropdown via keyboard and outside activation; sign-out error/retry; invite/revoke confirmation/cancel; course links; draft save then review/publish; choose an exact published version; grade/save/approve/release and historical/withdrawn labels. Confirm normal/narrow layout in light/dark, zoom and focus. Stop if version context or unsaved work becomes unclear. Darryl acceptance remains pending.

## IAL-11 rejected first pass: structural navigation repair

Darryl's screenshots rejected the first pass; this is not manual acceptance. Repaired course entry to one Open course row, central course tabs to Assignments/Grading/Students in the same position/order on every authoring/review/grading/invitation screen, stable Courses/Account global navigation and ruled grading rows with title/update date/View submissions. Main independently walked through actual browser courses → assignment list → Grading → exact published version → sample assessment → Students. Same course name/context and active tabs were visible throughout. Workbook remains warm-workbook-v1. Desktop1280 and narrow320 views were inspected; course tabs fit320. Browser viewport override was successfully reset. No invitation was sent/revoked by agent; sample assessment opened existing local synthetic evidence. Real student source integration remains pending.

Browser walkthrough found a stale Loading version message after successful selection; cleared it on acknowledged matching load and removed redundant published-version heading. Final type/lint checks passed after this focused repair. Reviewer inspected shared navigation and all5 callers and found no concrete source blocker; no reviewer tests/browser execution claimed. Main verified the actual UI. Real-email screenshots were not committed.

Manual review still required: confirm the revised course entry, same three tabs and labelled grading row feel coherent; test keyboard navigation/zoom/light appearance/unsaved-work prompts. Earlier manual rejection and remaining matrix gaps remain historical and open. No visual acceptance inferred from automated success.

## Darryl's closure decision — 2026-11-08

Darryl explicitly directed that tasks 4.2, 4.3, 4.5 and 5.4 be considered done and confirmed recording that decision with the limitations. This accepts closure on the available evidence; it does not report an additional manual walkthrough, screenshots, or passing results for the checks missing above. The earlier rejection and subsequent repair remain historical facts; no new visual inspection is implied. IAL-11's remaining acceptance follow-up is closed by this decision, not by newly executed checks.

Independent source review in this continuation identified malformed observation evidence potentially highlighted without verifying its excerpt against pinned source, and question navigation focus/announcements remain unverified in a browser. The reviewer also identified failed withdrawal closing its retry form and an incorrect pressed state for overlapping observations; focused source re-review found the local repairs addressed these two findings. The focused controller suite passed 8/8. No full browser or accessibility matrix was completed. Typechecking was blocked by concurrent shared checkout changes, including a deleted workspace-switch module still imported by consumers; those changes were not resolved here. Keith's real submission producer, consumer execution and agreement remain pending. Requirements and version/security boundaries are unchanged.
