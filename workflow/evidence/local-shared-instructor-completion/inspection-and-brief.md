# Local completion inspection and first approval brief

Date: 2026-11-11, Asia/Singapore. Darryl-owned. Source snapshot: local main `af1bc90fa47ed0b8726a46084ce642992c807e15`. No fetch or remote freshness claim. Requirements AUTH-01–03, COU-01–07, SUB-01, IAS-01–07, SHA-01–13, UI-01–08; design `warm-workbook-v1`.

## Inspection before product changes

Read ownership, integration decisions, OpenSpec config, existing course/auth/authoring/publication/formatting proposals, designs, tasks and relevant capability requirements. The installed OpenSpec CLI confirms the repo-local root and complete planning artifacts for shared-authentication and course-onboarding. Planning completion is not implementation completion. The installed update-change workflow is used for reconciliation: artifact revisions below are proposals awaiting approval, not silently applied normative changes.

Existing dirty work preserved: `logs/darryl/08-workflow-setup-and-planning.md`, `.worktrees/`, `logs/darryl/18-module-wrapup-presentation.md`, `logs/darryl/19-development-completion-plan.md`, `workflow/evidence/module-wrapup-closeout-demo/`, `workflow/evidence/module-wrapup-parallel-simulation/`. No student source, persistent development account/database, migration or provider changed.

Keith's 2026-11-09 C-ID/onboarding/K1–K6 policy acceptance remains accepted. It is not exact-revision source approval. Student dashboard is merged at the inspected main snapshot; task 4.3 and its reported opposite-role local acceptance must not be reset to pending merely because older handoff paragraphs say no student consumer exists.

| Outcome                  | Actual source/evidence                                                                                                                        | Remaining work                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student join/navigation  | `src/web/auth/client.ts`, auth `App.tsx` and instructor `Workspace.tsx` retain obsolete unavailable copy; join success links only Instructor  | Behavioral repair in first iteration                                                                                                                |
| Session versus role loss | Shared `workspace-switch.tsx` sets revoked for every refresh failure; global CSS hides main; `courseClient.verify` maps even 401 to FORBIDDEN | Behavioral repair with authentication/authorization/network states and safe recovery                                                                |
| Role switch              | Two native radios; design UI-03 requires a two-position switch, Student off/Instructor on                                                     | Implement documented behavior; no design-policy change needed                                                                                       |
| Creator and People       | `ManagedStore.people/removePerson`, guarded D1 coordinator self-removal and People UI already exist                                           | Execute existing security tests and remaining browser/manual acceptance; do not reimplement from unchecked 3.0c/d                                   |
| Invitations and identity | Grouped roles, currentness guards, opposite-role retention, proof-bound explicit credential choices and terminal reset journal already exist  | Verify existing paths, partial failures, truthful delivery and recipient UI; only demonstrated defects justify another bounded implementation brief |
| Authoring                | Keyboard reorder, stable IDs/current selection, zero new minimum preserving nonzero bounds and Prism escaped Python output already exist      | Existing tests plus rendered keyboard/focus/save/reopen/appearance verification; controller checks alone do not accept DOM interactions             |
| Publication              | Immutable snapshots/receipts, public allowlists and local-D1 race/rollback tests already exist                                                | Execute current checks; retain human acceptance and real submission composition as separate gates                                                   |
| Formatted instructions   | Shared `ui/instruction-text.tsx` used by `InstructionPreview` and Student overview; instructor published view uses literal `<p>`              | Resolve documented compatibility with Keith; no new rich tree/schema/DTO/migration                                                                  |

## First bounded iteration — awaiting brief approval

Approval update: Darryl explicitly approved this brief on 2026-11-11 in prompt LOCAL-02. It is implemented locally; the original brief/checkpoint below is preserved as history. See [shell verification](shell-verification.md) for actual review/repairs/checks and the pending manual gate.

Explicit invocation: **$codewise-iterate-feature local-shell-recovery-01: Repair Student entry and shared session recovery; implement the documented UI-03 workspace switch.**

Main applies $feature-analysis. Product code/tests/configuration remain unchanged until the brief is approved.

Observable outcome:

1. Acknowledged Student and dual-role joins offer the actual authorized Student destination. Instructor fallback no longer claims the merged dashboard is absent. Preserve current safe `/workspace` sign-in return policy; do not reopen deferred Student deep-link returns.
2. A 401 from any shell context/course verification is session loss, with heading and Sign in recovery visible and inaccessible protected content withheld. A successful current context excluding the role is actual role loss; available role recovery remains possible. Network/provider/malformed failures are availability failures, not proof of role revocation. Do not resurrect stale data or infer a role from cached/client state.
3. A native focusable switch with stable accessible name “Instructor workspace” exposes Student off/Instructor on and both visible labels. Space and pointer toggle only after current server authorization. Single-role accounts show text. Preserve dirty-work cancellation, pending duplicate suppression and stale-request rejection; announce arrival and focus the existing destination heading. No student component rewrite.

Exclusive proposed Darryl writer scope for this iteration: `src/web/ui/workspace-switch.tsx` and focused new tests, its role/recovery selectors in `src/web/styles.css`, `src/web/auth/client.ts`/`client.test.ts`/`App.tsx`, `src/web/instructor/Workspace.tsx`, `src/web/instructor/courses/client.ts` and focused tests. Instructor parent recovery consumers may need targeted changes in instructor assignments/review components only if inspection proves the shared boundary cannot safely withhold content itself. Any expansion is returned with an exact file list before edits. No shared DTO/API/schema/migration/student source edits are needed by the proposed design.

Acceptance checks to implement/run after approval:

- Student-only/Instructor-only/dual-role join success links and current routing; no protected content from a forged role.
- `/contexts`, selected course and `/contexts/verify` 401; cross-tab logout; genuine role removal; network failure; malformed response; stale focus refresh and racing toggle. Heading and recovery stay keyboard reachable; no stale private view appears.
- Pointer and Space in each direction, checked state synchronized with displayed role, one focusable switch, single-role omission, cancelled dirty leave, pending duplicate prevention and destination heading/status.
- Existing student/dashboard tests as regression consumers, unchanged; applicable local-D1 authorization/session/CSRF tests; required project check.
- One read-only independent reviewer after implementation, using the exact base/diff and requirements; repair and focused re-review. No independent source review claimed yet.
- Manual gate: cross-tab sign-out/relogin and membership loss, dirty-work cancellation, two-direction keyboard/pointer switch, focus/announcement, 320/768/1024/1440px, 200% zoom, light/dark and reduced motion. Present results and stop for explicit acceptance before the next substantive feature iteration.

## Sequential continuation after the first acceptance gate

Use ordinary verification for already implemented onboarding and authoring behavior. Proposed future invocations only if a reproducible gap requires behavior changes: `$codewise-iterate-feature local-onboarding-recovery-02: <one reproduced onboarding defect and expected outcome>`; `$codewise-iterate-feature local-authoring-acceptance-03: <one reproduced authoring defect and expected outcome>`. These placeholders are not active giant iterations or approved implementation briefs.

Proposed OpenSpec reconciliation after approval: add first-iteration shell acceptance scenarios/tasks to existing course-onboarding/shared-authentication artifacts; update course-onboarding 3.0c/d, 3.3, 3.5, 4.1/4.2 notes to distinguish source from outstanding acceptance. Retain mixed live/manual tasks unchecked. Update instructor-authoring-ux and formatted-assignment-instructions stale plaintext-only/no-student-renderer claims with the source facts above, while marking the new compatibility policy unresolved. Do not change normative rendering meaning or assert a new agreed format. Student dashboard tasks remain intact.

## Verification checkpoint

- `npm run check`: exit 1, strict OpenSpec 16/16 and TypeScript pass; ESLint fails at pre-existing untracked `workflow/evidence/module-wrapup-parallel-simulation/run.mjs:15` (`tasks` unused). Tests/build not reached by the chain. Unrelated source left untouched.
- First `npm run test`: exit 1, all 40 suites fail before collecting tests because Vite cannot rename transformed files under the sandbox-injected temporary directory. This is a harness/environment failure, not 40 failing product assertions; Node deployment tests not reached.
- Retry with process-local `TEMP` and `TMP` set to `C:\Users\darry\AppData\Local\Temp`: 3 focused suites, 14 tests pass (auth client, assignment controller and Python highlighting). No permanent environment/configuration change.
- Full retry (`TEMP`/`TMP` above, `npx vitest run --maxWorkers 2`): exit 1; 20 files pass/20 fail, 275 tests pass/34 fail/155 skip (464 collected). D1/Worker suites fail on `connect EACCES 127.0.0.1`, with secondary EBUSY cleanup errors. These prevent fresh concurrency/rollback/idempotency/restart/revocation claims. One separate instruction-editor DOM assertion times out waiting for lazy Preview content; isolated rerun recorded below. No application/test source changed, so these are baseline results, not introduced defects.
- `npm run build`: exit 0, 372 modules; existing >500 kB chunk warning (main chunk 744.60 kB). `node --test workflow/scripts/deployment.test.mjs`: exit 0, 4/4. These do not prove hosted deployment or real provider behavior.
- `git diff --check`: exit 0 for tracked changes; new files separately formatted/checked. No fresh runtime UI screenshots, screen-reader listening, provider/mail, hosted or manual acceptance claimed. [UI review](ui-review.md) records outstanding acceptance.

The configured recorder project matches this repository, but report refresh fails EPERM writing its private records temporary file outside the writable roots. Current and prior FIN prompt usage reconciliation remains unavailable; no totals invented.

Isolated DOM follow-up: with writable TEMP/TMP and one worker, `InstructionEditor.interaction.test.ts` still exits 1 (11 pass/1 fail). The first bold-preview assertion times out with “Loading preview…” still displayed. This is reproducible at the unchanged baseline; cause remains unresolved, so do not dismiss it as suite load or claim the formatting UI accepted. A future bounded authoring iteration can investigate it after the sequential shell gate. No test timeout was weakened to obtain a pass.
