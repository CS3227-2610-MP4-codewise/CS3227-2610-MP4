# Warm workbook implementation tasks

Planning artifacts and repository guidance were delivered first. The user's subsequent continuation request authorized the shared foundation slice on `codex/warm-workbook-foundation`; completed tasks are recorded below with evidence in `workflow/evidence/warm-workbook-ui/foundation/review.md`. Ownership update requested 2026-11-06: Darryl owns SH-AUTH sign-in/account/session work and entry UI; Keith retains SH-ID course/object authorization and student features. Remaining slices need exact shared-file windows and joint C-ID producer handoffs; reassignment does not complete an implementation task.

## 1. Shared design foundations

- [x] 1.1 Agree a named writer and exact shared web files for theme/chrome work, with both consumers recorded; verify the ownership handoff references `warm-workbook-v1` and UI-01/UI-07 before edits.
- [x] 1.2 Implement shared warm light/dark tokens and proportional/serif/monospace typography; verify representative screens against the token table and attach light/dark desktop and narrow screenshots plus measured contrast outcomes (UI-01, UI-07).
- [x] 1.3 Implement shared focus, action, status and navigation primitives; verify keyboard/200% zoom behavior and document usage in the feature handoff with completed applicable UI review rows (UI-01, UI-07, UI-08).

## 2. Sign-in and workspace entry — Darryl; Keith authorization producer/cross-reviewer

- [ ] 2.1 Darryl proposes SH-AUTH provider, registration/provisioning, account/session/logout/CSRF contract; Keith supplies SH-ID course/object authorization and allowed contexts. Obtain both owners' C-ID acceptance and exact producer revisions; verify unauthenticated/denied responses before protected integration (UI-02, UI-03; AUTH-01–AUTH-03).
- [ ] 2.2 Darryl implements the warm sign-in and approved registration/provisioning/provider flow without duplicating identity storage; verify pending/cancel/error/session-expiry/logout, safe return and no-membership states with Keith's authorization producer, and document actual outcomes (UI-02, UI-07, UI-08; AUTH-01, AUTH-03).
- [ ] 2.3 Darryl implements the shared conditional Student/Instructor switch and static single-role label from Keith's trusted contexts in an agreed shared-file window; verify pointer/Space/accessible state, unsaved recovery, denied/forged/revoked roles and no private cached data; obtain Keith's consumer/security review and screenshots (UI-03; AUTH-02, AUTH-03).

## 3. Student workbook and question navigation — Keith

- [ ] 3.1 Consume accepted C-PUB/C-SUB revisions to implement the continuous question/workbook and separate answer views; verify draft/history isolation, pinned versions, read-only attempts and recoverable per-question edits, and record contract revisions (UI-04; SUB-01–SUB-04).
- [ ] 3.2 Implement Previous/Next, position, question picker and final Review assignment; verify first/last/single-question boundaries, published order, focus, same-attempt history and zero submission side effects from navigation (UI-05, UI-07).
- [ ] 3.3 Implement whole-assignment review and approved C-SUB confirmation flow; verify all-question revisions, missing answers, mismatch/retry/duplicate/deadline failure recovery and no false success, with integration evidence and updated user guidance (UI-05, UI-08; SUB-03).
- [ ] 3.4 Implement visible saving/acknowledged/conflict/failed states and response-context guards; verify stale acknowledgements, concurrent edits, failed navigation saves and session recovery preserve source without labelling newer text saved; include the completed state matrix (UI-04, UI-05, UI-08; SUB-02).

## 4. Assessment and source observations — Darryl producer, Keith student consumer

- [ ] 4.1 Implement instructor source/rubric/assessment review using accepted C-SUB/C-REL contracts; verify version identity, manual fallback, stale approval invalidation and separate approval/release, and attach instructor UI evidence (UI-04, UI-08; GRADE-02–GRADE-04).
- [ ] 4.2 Implement shared source-line observations in an agreed write window; verify equivalent line/list controls, logical wrapping, exact pinned line ranges, keyboard focus retention and unavailable-evidence states; document both role consumers (UI-06, UI-07).
- [ ] 4.3 Implement student released-feedback views against the accepted public projection; verify unreleased/private content is absent from responses/DOM/cache, no-release empty states are honest and historical navigation retains the assessment's source (UI-04, UI-06, UI-08; AUTH-02, GRADE-04, SUB-04).

## 5. Cross-slice acceptance

- [ ] 5.1 Run `npm run check` and the implemented slices' integration/security checks; record actual pass/fail results, requirement IDs, exclusions and blockers in a shared handoff (UI-01–UI-08; DEV-01–DEV-04).
- [ ] 5.2 Complete UI review for sign-in and both authorized roles at 320/768/1024/1440px, 200% zoom, light/dark and keyboard/reduced-motion states; record manual acceptance, reviewer findings and repairs before marking the change implemented (UI-01–UI-08).

## Workflow follow-up

- Sync/archive only after all scoped implementation and verification is completed through the installed OpenSpec workflow. Do not archive to make a selected design look implemented.
- Deployment is separate authorized release work through the existing reviewed staging/production workflow.

## 6. Current shared/instructor UI clarity continuation — Darryl

- [x] 6.1 Commit prior auth work first, inspect existing screens and record user-approved compact copy/layout/SVG scope and named writer (UI-01/02/07/08).
- [x] 6.2 Simplify shared home/auth and instructor authoring presentation, retain visible labels/contextual requirements/privacy/version/error states and accessible inline SVG controls; no student/security/domain changes (UI-01/02/07/08).
- [x] 6.3 Review/repair presentation and asynchronous invitation states; run npm run check and observe representative desktop/narrow/keyboard/theme screens, recording actual evidence (UI-01/02/07/08).
- [ ] 6.4 Obtain Darryl manual acceptance of the revised UI; keep unavailable real-provider/course and full cross-role matrix gates open.
