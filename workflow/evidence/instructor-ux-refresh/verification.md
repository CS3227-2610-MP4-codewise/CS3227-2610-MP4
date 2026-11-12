# Instructor UX refresh — verification

Owner: Darryl. Branch: codex/instructor-ux-refresh. Base: 19311ae7a9f7f6fbae57f0f9ca588556ce8494b7.
Requirements: AI-02/05, GRADE-01/02, AUTH-01/02, UI-01/03/04/05/06/07/08. Design: warm-workbook-v1 with the user-approved instructor layout refinement in docs/ui/design.md.

## Changes

- A real primary generation button; optional private reference selection remains off by default and uses a correctly sized native checkbox in a 44px label.
- One-question AI review with suggested scores, verbatim rationale previews, full rationale disclosure, source comments and review notes. AI selection and workbook navigation share the same question index. Applying remains an explicit action for all questions.
- Submitted code before rubric/feedback in DOM and desktop layout. Narrow layouts stack in the same order. Compact code spacing, clearer fields, incomplete/invalid grading disables approval; save, approval and release remain distinct.
- Authoring guidance, optional reorder help, tablet question navigation, clearer empty states; removed obsolete implementation-status prose because both student consumers now use InstructionText.
- Shared WorkspaceSwitch accepts genuine window blur/focus and hidden/visible transitions, ignores internal and repeated focus-only events, coalesces overlapping checks and retains initial/foreground authorization masking and permanent fail-closed recovery after failure. This addresses a demonstrated focus-triggered recheck mechanism; live staging flicker is not claimed reproduced or resolved until deployment acceptance.

## Automated checks

- Required npm run check: strict OpenSpec 18/18, typecheck and lint passed; Vitest 744 passed, 2 failed (both 5000ms Worker timeouts), 2 skipped. Exact command is not a pass. No product assertion failure was reported.
- Serial rerun of the two failed files with --maxWorkers=1 --testTimeout=30000 --hookTimeout=60000: 2 files / 3 tests passed. Counts overlap with the full run; do not add them as unique tests.
- Deployment script tests: 4/4 passed. Build passed with existing >500kB chunk warning.
- Subsequent focused UI/authorization/student-consumer/authoring regression: 5 files / 85 tests passed.
- After final question synchronization repair: AI panel and controller suites, 2 files / 15 tests passed.
- Final typecheck/lint/build and diff check: results to be recorded at completion below.
- First sandbox run executed no tests due to Windows temporary-cache rename EPERM. Workspace-local TEMP/TMP resolved that; synthetic preview additionally needed permitted loopback execution. One initial test cast conflicted with Worker DOM declarations; assertion was corrected. Initial focus fix failed due to window proxy identity in the test environment; currentTarget comparison repaired it. An overlapping-refresh test now verifies that coalescing cannot supersede an outstanding authorization check with a later event.

## Browser evidence (synthetic data only)

Real AssessmentWorkspace/controller and server-backed synthetic preview, using no live model: generation, candidate review, all-question adoption, question navigation, and approval remaining separate from release observed. AI picker changed the workbook question and Previous changed the AI picker back. Reference checkbox measured 18x18px. Native options disclosure operated by Enter.

Grading inspected at 320, 768 and 1440px; authoring at 320 and 1024px. DOM widths: 305/320, 753/768, 1425/1440, authoring 305/320 and 1009/1024; no page-wide horizontal overflow in these fixtures. Light and dark grading inspected. Screenshots are browser captures and may be low resolution; do not infer contrast ratios from them. Incomplete/cropped experimental captures were removed.

- ai-review-light-desktop.jpg: structured suggestion review in light appearance.
- grading-light-desktop.jpg: collapsed suggestion panel and code/feedback layout.
- grading-light-320.jpg: narrow light review layout.
- grading-dark-desktop.jpg: dark generation-pending state.
- authoring-dark-1024.png: tablet authoring empty state.

The post-synchronization screenshot is not retained because the browser capture dimensions cropped the view; synchronization is supported by observed DOM and the focused tests instead. Temporary browser appearance/viewport overrides were reset. Dev hot reload reset an unsaved synthetic authoring question during source edits; this is not evidence of production navigation data loss.

## Limits and next owner

Self-review only; no agent, Keith or human instructor acceptance fabricated. 200% browser zoom, comprehensive keyboard/contrast matrix, assistive technology, signed-in staging authoring/People/course-list interactions and live grading accuracy remain unverified. Existing course/People/list presentation was inspected by source and retained; this is not a claim every instructor screen was redesigned or manually accepted. No provider calls, prompt changes, backend/DTO/schema/migration changes, remote settings, merge or deployment. User-facing prompt content and learner code are absent from this evidence. Next owner: Darryl for review and staging acceptance.

### Final source checkpoint — 2026-11-13

After the synchronized-question repair, typecheck and lint passed; build passed with the existing chunk-size warning. Focused AI panel/controller tests passed 15/15. Required full-command timeout outcome above remains unchanged; these are separate checks, not a claim that the exact command passed. git diff --check passed with line-ending warnings. Current prompt telemetry remains unavailable/provisional.
