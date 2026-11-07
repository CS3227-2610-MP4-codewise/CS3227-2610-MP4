# Course-role invitations — implementation evidence

Requirements: COU-03–05/07, applicable SHA-01/02/03/05/08–11 and UI-01/02/07/08. Design: warm-workbook-v1. Base: 9e89848 on codex/course-role-invitations. Darryl owns the shared identity/course write window; Keith student consumer and review remain pending.

The role invitation binds recipient, course, creator and role; the role and scope are immutable. Current course instructors can list, send, resend and revoke for their course. Mail queued/failed/unknown is dispatch state, not proof of delivery or acceptance. Admission does not expire; setup proof does. New recipients use mailbox proof and choose a password. Registered recipients use their existing password. A single D1 batch guards current recipient session, active account/course and current inviter membership, then writes exact role membership and accepted receipt; replay can acknowledge only current membership, never restore a revoked membership. Legacy null-role invitations keep admission-only behavior and do not gain a course role.

Concurrent unregistered invitations reserve one provider UID per email. Provider and D1 are separate systems: setup claims fence competing password changes. A claim in preparing phase may be safely replaced after its deadline before the fenced reset begins; a resetting claim cannot be taken over. Definitive rejected proof releases the claim; an unknown provider outcome or process loss during reset leaves a fail-closed resetting claim. There is no automated reconciliation or reviewed recovery procedure yet. Do not manually delete a lock in production or make ad hoc production database changes; operator/provider reconciliation and a reviewed release workflow are required before recovery. This limitation is not a verified complete partial-failure recovery path.

## Interface examples (synthetic)

- `POST /api/auth/invitations` with `{ "courseId": "course-1", "email": "learner@u.nus.edu", "targetRole": "student" }` requires an authenticated current instructor and session CSRF. Response includes role, invitation status and send state; no token is returned in the management DTO.
- `POST /api/auth/invitation/preview` with `{ "invite": "<mail fragment token>" }` uses preauth CSRF; it returns the invited course name, role, registration state and signed-in account match. A legacy pending token returns an admission-only indicator. GET does not consume the invitation.
- `POST /api/auth/invitation/join` with `{ "invite": "<token>", "password": "<existing password>" }` signs in and accepts for registered recipients. New recipients also supply the mailbox-bound `ticket` and provider `code`. No secrets or real addresses are recorded here. Successful acknowledgement means the guarded membership and acceptance committed.
- Renew an expired setup proof using the existing `setup/request`; it does not extend or expire the invitation. Wrong-account sessions must be switched before joining. Accepted receipts cannot restore subsequently revoked membership; a new authorized invitation is required.

## Verification and limitations

Local isolated D1, synthetic provider and mail tests exercise the flow; the final run and exact counts are recorded in the handoff after checks finish. They do not verify live Firebase/Gmail behavior, actual NUS delivery, deployment, Keith's student dashboard or manual acceptance. The student join acknowledgement identifies the course and explains that the student workspace remains unavailable. UI review, keyboard/responsive coverage and human acceptance are tracked separately in ui-review.md.

## Final local checkpoint, 2026-11-07

- `npm run check` passed: OpenSpec 8/8, TypeScript, ESLint, Vitest 28 files/290 tests, four deployment-workflow tests and Vite build. Earlier full runs exposed two D1 restart/concurrency timeouts under parallel load; those tests now have bounded 30-second timeouts and the rerun passed. One lint error in the dispatch cleanup was fixed before the final run.
- `git diff --check` passed with only Git's CRLF normalization warning. CI's gitleaks/Docker scan was not run locally because neither command is available; CI remains necessary.
- Independent `/root/reviewer` returned and re-reviewed the security and delivery-state repairs. Its final focused static review found no new defect in dispatch cleanup; it did not execute final tests. Uncertain provider-reset reconciliation remains unresolved.
- Synthetic browser: opened loopback preview and created one invented Student invitation; the rendered form and accessibility tree showed the Student role, `Awaiting acceptance` and `Email queued`. This was not live delivery. The preview process was stopped. Broader manual acceptance, recipient browser password flow, keyboard/responsive matrix and screenshot evidence remain pending.
- OpenSpec reports 6/17 overall tasks complete. This increment marks 3.1, 3.2 and 3.4 complete; 3.3 remains open for safe operational recovery, and 3.5 remains open for manual UI acceptance and separately authorized controlled NUS delivery.
