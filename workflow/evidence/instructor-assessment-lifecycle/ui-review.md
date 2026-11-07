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
