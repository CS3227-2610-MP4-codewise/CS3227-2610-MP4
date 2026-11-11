# Design

## Local shell recovery - approved brief, 2026-11-11

Continuation 2026-11-12: after the initial scoped snapshot was committed/published in draft PR27, the user's repeated bounded repair request exposed an arrival timing gap. Shared ready-state layout work now focuses the existing destination heading only after its authorization mask clears, announces the role once per entry and restores pre-check focus on a successful revalidation only if the user did not choose another target. Cancelled native departure clears stale checking text and restores switch focus. This completes the already approved UI-03 outcome; source/synthetic review does not prove native Space, screen-reader listening or manual acceptance. No student or SessionView change.

`local-shell-recovery-01` repairs the shared findings from the merged student dashboard handoff. Acknowledged joins offer existing Student/Instructor entries; keep the safe `/workspace` sign-in return policy. UI-03 uses one native checkbox with switch semantics, Student off/Instructor on, visible labels, a stable accessible name and current server reauthorization. Preserve pending suppression, dirty-work cancellation and destination focus.

Check the current auth session alongside contexts/course verification. Compare user ID and session-bound CSRF with the previously confirmed session and the existing instructor parent AuthView; mismatch is session replacement and withholds the stale page. Parent wiring passes existing identity data only, not a broadened session schema. Collect check outcomes with 401 priority. A 401 exposes heading/Sign in; successful contexts omitting the current role is role loss; selected-course 403/404 is denied access; network/provider/malformed failures are availability failures. Scope the hiding selector to the nearest shell and render recovery outside that protected region. Keep identity/navigation from the old session hidden. After a failure, reload account/private data before exposing the page, even if a later context refresh succeeds. Navigation may be cancelled by existing beforeunload guards, so release pending locks if the page stays. [AUTH-01–03, COU-06/07, UI-02/03/07/08, warm-workbook-v1]

Keith's broad decisions and merged student consumer remain accepted. His tests asserting old radios need source-specific follow-up; neither that nor this local repair invents Keith review, human acceptance, provider/mail results or release evidence.

## Course People follow-up — 2026-11-08

The instructor course People page projects active memberships and pending invitations from the same D1 store, grouped by course/email. Show active and awaiting-acceptance roles separately; show email dispatch state only for a pending invite. Revoked invitations and inactive memberships remain in audit storage but leave the current roster. An instructor may revoke a pending invitation or explicitly remove a person, which atomically deactivates that person's memberships and revokes pending invitations for that course. Reads and removal require current same-course instructor authority, with a same-D1 guard against mid-request revocation. No student workspace or cross-course access is added. Follow warm-workbook-v1 and UI-01/07/08. [COU-03/07]

The user designates the course creator as Course coordinator. Derive the label and self-removal restriction from the exact course_creation_receipts creator user ID, never from email or browser input. Block the creator's own removal inside the guarded D1 transaction before revoking any pending invitations. This decision does not specify coordinator transfer or restrict removal by another current instructor. Existing courses without a creation receipt remain unlabelled rather than inventing a creator. [COU-02/07, UI-01/07/08]

## 2026-11-07 recipient grouping and identity recovery adjustment

Darryl requested one displayed entry per course/email; a pending Student and Instructor invitation to that recipient are shown together and either valid link may explicitly accept both current, authorized roles. Existing links and audit rows remain. The acceptance preview must show the full role set and the final D1 guard must reject changed role sets, revoked invitations or lost inviter authority rather than silently granting undisclosed roles. A later invitation after an earlier acceptance needs fresh consent; accepted receipts do not reactivate revoked membership. [COU-03/05/07, UI-01/02/07/08, warm-workbook-v1]

If a provider account already exists without an admitted local account, do not bind by email alone. Issue a mailbox-bound proof and explicitly offer existing-password authentication or create/reset password; the latter is a deliberate choice. Because a freshly provisioned identity and one registered elsewhere cannot be distinguished reliably across environments, all recipients without a local account make this choice, including genuinely new recipients. Bind the verified provider UID to the existing invitation/account boundary only after proof and credential validation, with same-D1 guards and no effect on unrelated roles or accounts. Wrong account, expired proof, provider interruption and partial failures fail closed. This supersedes the prior assumption that a previously invited provider identity can always be rediscovered from local invitation rows. [COU-04/05, SHA-05/08/11]

## Context

Baseline: merged main a05d5ba95034dcb87c967690dc9a185cf05ba526 (PR11). Existing Firebase credential authority and D1 account/session/owner mapping are authoritative. `course_memberships` in migration0007 already keys `(course_id,user_id,role)` and can hold both roles; do not rebuild it or create per-dashboard membership storage. Current course listing is instructor-only, invitation records/acceptance target account admission, course setup is a local operator helper and no real role switch/student dashboard is implemented. This plan does not change those runtime facts.

The product decisions in proposal.md were explicitly requested by Darryl. C-ID/SHA/UI drafts remain the source for identity/security; this change adds course-onboarding requirements and updates stale future-target statements. Shared/instructor implementation belongs to Darryl; Keith owns the student dashboard, submission services and consumer integration. Joint agreement is not inferred from this plan.

## Goals / Non-Goals

**Goals:** a usable first-admin-to-first-course path on hosted environments; course-scoped Student/Instructor invitations; password setup only for new accounts; verified existing-account sign-in and course addition; multiple retained roles and authorized dashboard discovery. Keep one identity/password/session/course store and testable producer/consumer seams.

**Non-goals:** public registration, student self-promotion, invitations granting account administration, unscoped global instructor promotion, automatic access to unrelated courses, automatic execution/grading, new mail provider, duplicate student/submission storage or implementation in this planning task. Do not copy local fixture courses/accounts to production or mark synthetic integration as complete.

## Decisions

### Confirmed product policy

- The exact operator-pinned starting account whose configured alias is `instructor@u.nus.edu` is the first admin. This is not a hard-coded email/password backdoor. First-admin authority includes explicit instructor-workspace/course-creation eligibility; existing credential pinning, one-time setup and alias-not-verified rules remain. It does not grant membership in every existing course.
- Any current instructor can create their own course and invite Student or Instructor recipients to a course they currently teach. Creating a course makes its creator an instructor atomically. Student-only accounts cannot create courses; instructor invitations never create admins. First admin can start with zero memberships, create the first course, then invite instructors/students.
- Invitations retain the existing NUS-email policy, non-expiring admission, revocation and send-state audit. They are course/recipient/target-role specific. A prior invitation without completed registration is still a new-account path; invited Instructor accounts can subsequently invite instructors within taught courses.
- One account can hold both roles in the same or different courses. Accepting the opposite role preserves previous access and unlocks the top Student/Instructor dashboard switch when the current trusted context permits both. First-admin creator eligibility also permits the Instructor dashboard before the first course. Each dashboard filters courses by its actual role; switching never transforms the role of a course membership.

### Proposed technical boundaries for implementation review

Reuse SH-AUTH identity/session/proof generation and the existing mail adapter; SH-ID owns authorization and final membership. Preserve the closed C-ID SessionView. Extend the existing invitation boundary with a validated `targetRole: student|instructor` and course-scoped acceptance, and extend the existing allowed-workspace/context boundary rather than putting permissions into browser preferences. Exact DTOs, compatibility default for old student-only payloads and endpoint signatures must be reviewed in the existing C-ID/SHA contract packet before dependent writes. No parallel contract or store.

Proposed commands: guarded create-course `{name,requestKey}` using current first-admin/current-instructor creator authority; scoped invite send/resend/revoke/list including target role; invitation-aware setup/sign-in and authenticated acceptance; server-derived available workspace contexts and role-filtered course lists. API paths are implementation details to settle against existing routes. Mutation origin/CSRF, current session/provider status, validated bounded bodies, rate limits, safe errors and no-store responses apply. Every authorization-sensitive D1 write must recheck authority in the same transaction/guard window, not only before an async provider call.

### Recipient journey

| Recipient state | UI / submit action | Authoritative outcome |
| --- | --- | --- |
| New/unregistered, even with older invitations | Course name and invited role; choose/confirm password; **Create password and join course** | Confirm mailbox/provider proof for intended UID; admit one account; accept exact current course-role invitation |
| Registered recipient following a new link | Course name/role; existing password; **Sign in and join course** | Validate existing credentials, then accept invitation into the same account without password replacement or a redundant signup |
| Already signed in as intended registered recipient | Course/role preview and existing-password confirmation in the same join form | Confirm the existing account password before accepting the new course role; session presence or GET/scanners do not auto-join |
| Signed in as another account | Concise mismatch and **Use another account** | No consumption/membership change; safe return to the invitation after correct sign-in |
| Accepted/retried link | Show acknowledged membership or current revoked/unavailable state | No duplicate membership and no reactivation by replaying an old accepted receipt |

The invitation-aware password submit is the explicit acceptance action; do not add a mandatory extra confirmation step after successful Sign in and join course. Ordinary sign-in without a valid invitation never grants a course. Remove proof fragments from history before network bootstrap; keep continuation destinations local/validated. UI reveals no unrelated account-existence information; setup/login branch is scoped to validated invitation/mailbox evidence and generic recovery rules.

### Consistency and persistence

Create course plus creator membership and scoped idempotency receipt atomically. Final invitation acceptance verifies intended account, pending generation, target role/course, active course and current inviter instructor authority, then atomically persists accepted receipt plus exact role membership. Repeated submits acknowledge the same valid outcome; duplicate role rows cannot arise. Accepted invitation receipts cannot restore a subsequently revoked membership; a deliberate fresh authorized invitation is required for a new grant.

Firebase operations cannot join the D1 transaction. Reuse the existing guarded reservation/proof approach: do not mark invitation accepted or grant membership before provider/admission confirmation; recheck current authorization after external work and guard the final D1 write. Provider success with uncertain local completion must safely retry/recover against one UID/account; do not reset a registered user's password to repair membership. Existing account linking remains project+UID based, never browser/email-string merging. Account administration and course-role grants remain separate audited facts.

### Dashboard and warm-workbook-v1

Preserve the existing workbook palette/type/brand and fixed Courses/Account global header with Assignments/Grading/Students course navigation. Add concise Create course empty/list state and form, target-role control at invitation send, role-labelled invitation tracking, recipient course/role preview and meaningful pending/cancel/revoked/expired-proof/already-accepted errors.

UI-03 switch is top-level account workspace selection, with visible Student/Instructor labels, Space operation, synchronized accessible state, focus/announcement on destination and unsaved-work protection. Single-role accounts show their role without an enabling switch. Darryl supplies shared switch/allowed-context producer and instructor consumer; Keith supplies student dashboard navigation/rendering and role-filtered student consumer checks. An absent student producer must show an honest unavailable state, not instructor data, a fabricated student dashboard or student implementation by Darryl. Full dual-role acceptance remains pending until Keith's consumer is integrated. Preserve exact publication/submission/assessment version boundaries on navigation.

## Risks / Trade-offs

- **Instructor-invitation chains widen trusted provisioning:** restrict inviter to current instructor of that exact course; never grant admin; audit target-role, actor, recipient and currentness; serialize schema/DTO changes.
- **Existing provider account or interrupted setup:** branch on actual admitted registration/proof state, reuse one stable UID and idempotent reservations; distinguish registered recipients from merely invited recipients.
- **Revocation during mail/provider/acceptance work:** recheck before disclosure/dispatch/final commit; accepted receipts do not reactivate revoked access.
- **Dual-role private-data leakage:** role-filtered lists plus per-object authorization before every read/write/cache use; clear inaccessible view state after switch/revocation. Browser toggle is presentation only.
- **Hosted first admin already exists:** preserve its pinned account/provider ID and completion state. Reconcile the newly planned creator capability through a reviewed additive/versioned process; do not rerun bootstrap, reset credentials or identify it by email alone.
- **Free-host/provider uncertainty:** keep configured limits/rate controls, measure actual hosted flow and NUS delivery separately. No quota, delivery or deployment success inferred from planning or local fixtures.

## Migration Plan

1. Reconfirm Darryl shared write window and exact Keith C-ID/student consumer review before implementation. Recheck main/migration numbering and reuse existing role-capable membership schema.
2. Implement shared first-admin/creator projection and atomic course creation first, with instructor UI/security checks. Plan a coherent first implementation PR for this independently usable outcome.
3. Extend existing invitation record/DTO/acceptance for course-role enrollment and new/existing-account journeys in a second coherent PR; preserve old invitation audit/admission and define safe treatment of pending legacy invitations (no silent role elevation).
4. Add allowed-context/shared switch and instructor dashboard selection; Keith integrates his student dashboard in the agreed consumer increment. Do not mark complete from synthetic student adapters.
5. Apply only reviewed additive migrations through isolated staging/release workflows. Verify existing hosted owner continuity, first course creation, new student/new instructor invite setup, registered-recipient acceptance, dual roles and revocation across restart/deploy. Production requires its normal approval gate, never ad hoc SQL.
6. Roll back application/capability activation through the reviewed release workflow while retaining identities, accepted memberships and audit. Do not delete roles/accounts or replay owner bootstrap. Cross-version readers must remain least-privilege; quarantine ambiguous legacy invite records for deliberate recovery instead of guessing a grant.

## Dependencies and pending agreement packet

Darryl's product policy is confirmed; Keith acceptance is pending. One packet in workflow/IntegrationContracts.md must cover: target-role/inviter authority and legacy invite handling; authenticated acceptance idempotency/currentness; account-vs-membership distinction; multiple roles and filtered course projection; available-workspace switch/error/unsaved-state contract; exact shared producer and Keith consumer revisions. Technical DTO/migration/retry details are proposed above and must be finalized/reviewed before implementation. No unresolved product decision is presented as approved, and no implemented/live state is inferred.
