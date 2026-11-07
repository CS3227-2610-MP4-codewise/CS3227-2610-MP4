# Tasks

Planning only: Darryl confirmed the product target on2026-11-07. All implementation, live delivery, joint review and acceptance tasks remain pending. Detailed work here is authoritative for COU-01–07; MVP roadmap links these increments. Preserve warm-workbook-v1 and existing AUTH/SHA/C-ID contracts. Do not implement Keith's student features.

## 1. Shared boundary and rollout preparation

- [x] 1.1 Darryl prepares one C-ID/SHA packet with exact creator eligibility, invitation target-role, registration-vs-prior-invite states, atomic/idempotent acceptance, revoked receipts and dual-role contexts; obtain Keith's actual producer/consumer agreement before dependent edits and record confirmed versus proposed DTOs/revisions. Verify the packet references existing contracts rather than duplicates. [COU-01–07, DEV-01/02] — Packet references existing C-ID/SHA contracts; Darryl reports Keith approved it in the implementation prompt. Direct Keith review artifact and consumer revision are unavailable.
- [ ] 1.2 Recheck current main, exclusive Darryl schema/API write window, next migration number and hosted first-admin pins; document legacy invite compatibility and additive creator-capability reconciliation, verifying existing identities/memberships/bootstrap completion are preserved and no local fixtures become deployment data. [COU-01/03/05, AUTH-03, OPS-01/02]

## 2. First admin and instructor course creation — first implementation increment

- [x] 2.1 Implement trusted first-admin/current-instructor creator eligibility using existing identity and course authority; test empty-owner access, student-only denial, forged alias/admin flag, revocation and restart, and document that existing course access is not implied. [COU-01/02, AUTH-01–03] — Local D1 tests cover empty owner, current instructor, student/alias/generic-admin denial, capability/admin/session/account/membership/course revocation and persistence restart. No unrelated-course access is granted.
- [x] 2.2 Implement guarded atomic course+creator-membership+idempotency receipt creation with bounded name; real-D1 tests cover success, replay/concurrency, partial failure, CSRF and authority loss immediately before commit; document exact command/response and recovery. [COU-02] — Local D1 tests cover concurrent same-key requests, conflict, distinct-account key scope, membership/receipt SQL rollback, CSRF/origin and six deterministic pre-batch revocation cases. Command and retry semantics are in the packet.
- [ ] 2.3 Add concise Create course entry/form in the instructor empty/list dashboard; test pending/duplicate/cancel/error/retry/acknowledged redirect and preserve warm-workbook-v1/header/course tabs. Record actual keyboard/narrow/zoom/UI acceptance, not screenshots alone. [COU-01/02, UI-01/04/07/08]
- [ ] 2.4 Verify existing hosted first admin can create/open a course after the reviewed staging migration/release path; retain redacted exact revision/database/environment evidence and separately approved production verification, with no ad hoc SQL or copied local data. [COU-01/02, OPS-01/02]

## 3. Role-targeted invitations and course acceptance — second implementation increment

- [x] 3.1 Extend existing invitation persistence/DTOs with server-bound course/recipient/Student-or-Instructor role and preserve old audit/admission records; verify additive migration/restart and safe legacy pending-invite handling without silent privilege expansion. Update existing C-ID/SHA examples and handoff. [COU-03/05]
- [x] 3.2 Implement instructor send/list/resend/revoke for both roles within currently taught courses; test ordinary instructor (not admin) permission, foreign/revoked/student denial, immutable target-role, non-expiring admission, proof renewal and queued/failed/unknown mail tracking. Document mail/acceptance distinctions. [COU-03/07, SHA-02/03/10/11]
- [ ] 3.3 Implement invitation-aware new-account setup and registered-account existing-password path with explicit combined join action; test student/instructor recipients, previously invited but unregistered, concurrent invitations for one account, wrong signed-in account, expired proof, collision/provider interruption and unchanged existing password. Deliver synthetic request/response and recovery examples. [COU-04/05, SHA-01/05/08/09/11]
- [x] 3.4 Implement same-D1 atomic accepted-state+exact-course-role membership and current inviter/recipient/session/origin guard; test GET/scanner no-op, duplicate/racing retries, accepted receipt after membership revocation, revoked inviter/role/invite, existing opposite role and rollback. Verify one stable account and no duplicate membership/store. Document currentness and retry semantics. [COU-05/07]
- [ ] 3.5 Add role-labelled instructor tracking and concise invitation/recipient forms and states; verify Create password and join course, Sign in and join course and existing-password confirmation for an already signed-in recipient, without redundant signup or a second confirmation after the combined submit. Run mail adapter tests, actual controlled NUS delivery when authorized, accessibility/state checks and manual acceptance; never label queued as delivered. [COU-03–05, UI-01/02/07/08]

## 4. Shared dashboard contexts and role switch — third implementation increment

- [ ] 4.1 Darryl implements trusted allowed-workspace/role-filtered course projection over existing memberships and first-admin eligibility, preserving the closed session contract; test same/different-course dual roles, first-admin zero-course, role revocation, forged selection and no cross-role/private payloads. Publish exact schema/examples/reusable consumer tests in the existing C-ID packet. [COU-06/07, AUTH-02]
- [ ] 4.2 Darryl implements shared top Student/Instructor switch plus instructor consumer; verify pointer/Space/state/announcement/focus, single-role omission, dirty-work cancellation, pending/race/error/revocation recovery and existing course tabs/version boundaries. Missing Keith consumer remains visibly unavailable; no replacement student dashboard is built. Document exact integration revision. [COU-06/07, UI-01/03/04/07/08]
- [ ] 4.3 Keith integrates his student dashboard/navigation/course-list consumer against the reviewed shared producer; execute reusable consumer checks and actual first opposite-role invitation acceptance in both directions, including roles in different courses. Record his exact revision and agreement; synthetic consumer checks do not complete this task. [COU-06/07, UI-03]

## 5. Composed verification and acceptance

- [ ] 5.1 Independent review of exact final producer/consumer revisions, migration/authority/privacy/UI races; repair confirmed defects and record actual reviewer inspection versus executed checks. Run required npm run check and focused D1/security/mail/contract tests, source secret checks and retain redacted evidence. [COU-01–07, AUTH-01–03, DEV-02]
- [ ] 5.2 Verify real hosted first-admin→create-course→invite-new-student/new-instructor→choose-password→joined-dashboard and registered-recipient→existing-password→additional-course, then both opposite-role switch paths and revocation across restart. Record external unavailable gates honestly and obtain Darryl manual acceptance; retain Keith student integration pending until actually run. [COU-01–07, UI-01–04/07/08]
- [ ] 5.3 Complete UI review/evidence, operator/user guides, exact revision handoffs, member log and private usage checkpoint for each implementation PR; verify isolated staging/production configuration and approved release/rollback procedure without marking configuration or fixtures as a live deployment. [COU-01–07, OPS-01–04, DEV-01–04]

## Workflow follow-up

- This planning request does not authorize application implementation, migration execution, live invitations, account/role changes, commit, push, merge or deployment.
- Begin implementation only on a later explicit request. Keep the three increments coherent; coordinate Keith's consumer boundary before dependent shared DTO/schema edits.
- Archive only after implementation, actual manual acceptance, joint integration and required verified release gates are complete.
