# Tasks

Planning complete does not mean implementation or producer review is complete. Every task below starts unchecked. Human owner Keith; Darryl remains SH-AUTH/SH-ID/SH-PUB producer owner. Design revision: warm-workbook-v1. Implementation starts only on a later instruction.

## 1. Revision-pinned integration and writer gates

- [x] 1.1 Review selected SH-AUTH/SH-ID/context/switch/publication revisions against the documented dashboard reference `8f93f51c1f6a36dd64908bd550e90b68e9957af1` and inspection baseline `f62b23891434d18414ef8179a326749fc85365bf`; record exact producer revisions, runtime schemas, safe errors, synthetic payloads and Keith's source-review outcome in this change's handoff. Verify the existing context producer with `npx vitest run workflow/course/creation.test.ts`; do not infer consumer acceptance from producer tests. [SD-01/04/05, AUTH-01–03, COU-06/07]
- [x] 1.2 Agree the proposed public listing envelope, cursor/path compatibility and explicit Student-membership/read-at-disclosure boundary with Darryl; record one writer per exact shared file/section (API entry, frontend route composition, summary DTO, publication reads, authority addition, neutral instruction renderer) and synthetic cross-role/revocation examples. Verify the packet preserves one identity/course/publication store and existing instructor-public reads. No dependent shared edits before this gate. [SD-01–04, AUTH-02/03]
- [x] 1.3 Record the later implementation instruction, accepted planning defaults and actual Implementer responsibility; settle the old tracker run before starting a prospectively authorized dashboard recording run in a new active turn. Verify status/role/run attribution and reuse logs/keith/student-assignment-dashboard.md; unavailable telemetry must not block authorized work and historical attribution must remain unchanged. [SD-01–06, DEV-02/04]

Apply status 2026-11-09 ([apply-gates](../../../workflow/evidence/student-assignment-dashboard/apply-gates.md), [implementation](../../../workflow/evidence/student-assignment-dashboard/implementation-verification.md)):
- 1.1: Keith accepted.
- 1.2: Darryl's agreement as reported by Keith; Keith is sole writer, see Ownership.md.
- 1.3, 2.1 and 2.2: done.
- 2.3, 3.x and 4.x: implemented, but checks are incomplete. The open items are listed in the implementation evidence.
- 5.x: needs composed and manual acceptance.

## 2. Public read producers and student server boundary

- [x] 2.1 In Darryl's agreed producer window, add bounded latest-publication listing and the reviewed Student authority seam over existing D1 records; land focused D1 tests for unpublished exclusion, latest publication fields, equal/past deadlines, 50/51 rows, unchanged-data traversal, empty authorized course envelope, malformed cursor and no private-column projection. Document exact query/cursor limits and examples in this change's evidence/handoff. [SD-01/02/04, SUB-01, AUTH-02]
- [x] 2.2 Keith adds student HTTP/client-facing adapters under src/server/student/ with the reviewed closed summary validator and existing C-PUB overview schema, then wires protected routes only in the named API window. Land integration tests for current Student versus instructor-only membership, cross-course/version/cursor forgery, missing/expired session, account/course/membership revocation between precheck and disclosure, no-store/safe errors and mismatched identifiers; document actual producer/consumer revisions. [SD-01–04, AUTH-01–03, COU-07]
- [ ] 2.3 Verify exact-version public reads retain C-PUB field allowlists, pinned question/rubric IDs and bounds; add producer/consumer cases for V1 after V2 publication, missing/malformed versions, private-field rejection and denied version access without latest substitution. Record results plus maximum authorized payload measurements; no source execution, AI or additional storage. [SD-03/04, SUB-01]

## 3. Student courses, shell and assignment list

- [ ] 3.1 Keith implements student course rendering using shared account/brand/switch components and current context pages, with route composition in the named window. Land consumer tests for same/different-course roles, single-role omission, first-admin zero-course Instructor retention, more than 100 Student courses, repeated cursors, selected course beyond page one and forged role preference. Document route/page behaviour and the exact shared-shell integration revision. [SD-01/05/06, COU-06/07, UI-01/02/03/07/08]
- [ ] 3.2 Implement plain assignment rows with title, UTC-labelled deadline, exact-version Open action, past deadlines retained and next/back/refresh page controls. Land consumer cases for empty/50/51 rows, equal-deadline order, fresh publication on refresh, course mismatch and absent learner status; verify no draft/Submitted/Graded/feedback data enters DOM or persistent storage. Update this slice's evidence. [SD-02/04/06, UI-01/07/08]
- [ ] 3.3 Implement destination-scoped requests, cancellation/stale-result guards and clearing/revalidation on role/account/course changes, history restoration and focus return. Land race tests plus loading/empty/network/denied/expired-session retry and expired-session sign-in cases (sign-in lands on `/workspace`; no student deep-link return); verify a cancelled dirty-instructor-work transition preserves content and role. Document state/recovery behaviour. [SD-04/05, AUTH-01/02, COU-07, UI-02/03/08]

## 4. Read-only publication overview

- [ ] 4.1 Implement the exact-version document overview with title, UTC deadline, version context, ordered questions, starter source and public rubric guidance. Land render/navigation tests for V1 surviving reload/republication, direct entry, return to course/list, wrong/missing versions and absence of editor/save/submit/execution/history/feedback controls; document the browsing-to-future-editor boundary. [SD-03/04/06, SUB-01, UI-04/07/08]
- [ ] 4.2 In the agreed shared-renderer window, reuse sanitized instruction presentation with legacy plain-text compatibility, supported formatted content and safe unsupported-format handling. Land malicious markup/URL, plain-text meaning, code indentation and long-content tests against the actual publication contract; record format/renderer revision compatibility and verify no new dependency. [SD-03/04/06, UI-01/04/07]

## 5. Composed verification and handoff

- [ ] 5.1 Execute actual student consumer acceptance against the pinned composed producers: first opposite-role invitation acceptance in both directions, same/different-course dual roles, revoked last role with remaining valid role, reload/session loss, forged selection and more than 100 memberships. Record exact producer/consumer revisions and actual failures/repairs; complete course-onboarding task 4.3 only when its real checks pass, not from mocks. [SD-01/04/05, COU-06/07, AUTH-01–03, UI-03]
- [ ] 5.2 Complete workflow/templates/ui-review.md with real keyboard, pointer/Space, heading focus/announcements, 44px targets, reduced motion, light/dark, contrast, 320/768/1024/1440px and 200% zoom evidence for all three student surfaces. Link desktop/narrow screenshots and actual states; obtain Keith's manual student acceptance and document untested combinations. UI-05/06 workspaces remain out of scope. [SD-05/06, UI-01/02/03/04/07/08, warm-workbook-v1]
- [ ] 5.3 Run strict OpenSpec validation, `npm run check` and the new composed privacy/security checks; review the exact final revisions for authority, private-data projection, version pinning and stale-result leaks. Record actual self/team review and any separately authorized independent review distinctly, repair findings and rerun affected checks. Refresh redacted evidence, increment log and handoff with owned files, outcomes, limitations and next owner. [SD-01–06, AUTH-01–03, DEV-02/04]

## Workflow follow-up

- Planning does not authorize application changes, shared writer windows, migrations, live invitation sends, commits, pushes or deployments. Request the apply workflow in a later turn to start implementation.
- Hosted release/acceptance is separately authorized work through reviewed GitHub Actions after successful staging; no ad hoc production migrations or local fixture data. Keep hosted and live-provider limitations explicit.
- No subagent is required or authorized by this plan. Keep actual Coordinator/Implementer assignments and any later authorized reviewer identities separate from skill names.
- Archive only when implementation and required acceptance are complete; leave unrelated unfinished changes open.
