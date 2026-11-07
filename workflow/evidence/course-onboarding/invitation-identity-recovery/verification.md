# Invitation identity recovery and recipient grouping

Change: course-onboarding. Requirements COU-03–05/07, SHA-01/02/03/05/08/11, UI-01/02/07/08. Design: warm-workbook-v1. Input base: merged main 408edc1. Darryl owns shared auth/course producer; Keith student consumer and joint review remain separate.

## Behavior and boundaries

Staging diagnosis (read-only, previous prompt) found a provider identity whose UID differed from the local pending-invitation reservation; the local store had no admitted account or setup proof. The exact cause of that earlier state is unknown. No staging values, addresses, UIDs or credentials are retained here.

For role-targeted invitations, a trusted provider-email lookup may propose an existing Firebase UID when provisioning the reserved UID fails. The candidate is not an account binding or admission. The recipient must receive the invitation proof and explicitly choose existing-password sign-in or create/reset password. Because a freshly provisioned identity cannot reliably be distinguished from an account registered in another environment across provider races, this choice applies to all recipients without a local account. Reset choice warns that it changes the shared account password elsewhere. Only after mailbox proof and selected credential validation does an atomic D1 guard bind the UID for pending role invitations; it checks current inviter/course and rejects an already-admitted conflicting account. Proof consumption, provider calls and D1 are separate; an uncertain provider reset remains fail-closed behind the existing setup lock, without an operational automatic recovery path.

The invitation list groups rows by course/email, including preexisting duplicates, and displays distinct invited roles. Re-entering the same pending role returns the existing invitation without sending again. Distinct role invitations retain their separate links and audit rows. The join preview supplies the current role set; the client submits that set, and the guarded D1 transaction requires the same roles, intended identity, current session and active instructor authority for each pending invite before atomically granting memberships and accepting receipts. A changed role set is rejected and the UI refreshes its preview. Revocation operates on pending grouped records; a completed receipt cannot restore a revoked membership. Grouped delivery reports failed/unknown conservatively and targets the failed or uncertain link for resend; queued never asserts delivery.

Migration 0011 adds candidate and receipt grouping data and adjusts guards without deleting old invitations. Previously accepted receipts without a grouping marker retain their original single-role meaning; legacy admission-only invitations do not silently acquire roles. No ad hoc remote migration, live email, deployment or private account mutation was performed in this implementation.

## Verification and remaining work

Independent reviewer `/root/reviewer` inspected the changes read-only and returned findings on legacy grouping, role-set retries, delivery state, stale preview, duplicate authorization and provider provenance. Main agent repaired those findings. Reviewer re-review found no further concrete defects in the inspected paths; reviewer did not execute the final test suite. Exact local test results are recorded below after the run.

Manual UI acceptance, keyboard/responsive checks and controlled NUS delivery remain pending; a local test and deployment are not equivalent. A post-merge reviewed staging migration and explicit live-delivery authorization are separate. After an approved release, an authorized instructor may resend the grouped invitation; do not manually change Firebase UID, password, or production database to repair the prior data. Existing mail links containing expired proof must be renewed. Keith student workspace/role-switch integration and reviewer agreement are not claimed.

Reserved bootstrap owner subjects are excluded from mailbox recovery even if their Firebase email has changed or the current environment lacks a local owner row. This preserves the existing owner-pinning exception; it does not grant authority to any identity.

## Local verification checkpoint, 2026-11-08

- `npm run check` passed after repairs: 8 OpenSpec changes, typecheck, lint, 28 Vitest files / 305 tests, 4 deployment-workflow tests and build. The first full run exposed missing 0011 migration in an older isolated auth test harness and a stale expected collision outcome; the harness and expectation were updated, then the full run passed.
- Focused tests cover duplicate same-role insertion, both link orders, stale preview, concurrent/revoked inviter, mixed legacy grouping/revoke, conservative mail state, atomic role receipt currentness, existing-password and explicit reset, invalid choice, and recovery after binding followed by local admission failure. Owner-protection checks include a reserved owner UID with a changed provider email and old legacy proof.
- The reviewer found the grouped legacy action scope, mail status, receipt revalidation, stale preview, duplicate authorization and provider-provenance/owner-UID issues; fixes and re-review followed. Reviewer confirmed no further concrete defect in inspected final paths but did not independently execute tests.
- Local staging/provider/mail were not mutated. Browser/manual UI acceptance, real NUS delivery and remote migration remain unverified. Previous uncertain-provider-reset lock/reconciliation limitation remains. CI secret scanning has not been executed locally.
