# Shared authentication — Firebase passwords/Gmail tasks

AUTH-01–03, SHA-01–10, CON-03/07; warm-workbook-v1 UI-01/02/07/08. Earlier Google and hash-spike evidence is historical; no live provider completion.

## 0. Approved analysis

- [x] 0.1 Inspect ownership, C-ID, UI, existing implementation and FoC reference; retain reviewed branch and prior work.
- [x] 0.2 Record Darryl selection of Firebase Authentication/Brevo and authorization to code before account setup on 2026-11-06. Passwordless, Supabase, SendGrid and local KDF targets superseded.

## 1. Boundaries and provider prerequisite

- [x] 1.1 Verify Firebase Spark REST/admin/password/action/revocation contract and Workers compatibility; document exact adapter, proof/abuse policy and account migration. Preserve secure policy and measure complete runtime later (SHA-01/04/05/08/09).
- [x] 1.2 Record Darryl serialized write window, reconcile C-ID/status/UI policy and source requirements. Keith review/first-instructor/course producer still pending; independent checks use injected adapters only (AUTH-02/03, CON-03/07).

## 2. Identity, credentials and sessions

- [x] 2.1 Implement server-only Firebase adapter with strict bounded responses/timeouts and configured project credentials, no local password store. Verify provider faults, mismatched UID/project/email and secret exclusion (SHA-01/05).
- [x] 2.2 Add compatible additive schema/invitation admission and stable Firebase UID mapping preserving existing account IDs/data/0003. Verify real-D1 migration, concurrent one-use acceptance, no email auto-link and no membership storage (SHA-01/02/08).
- [x] 2.3 Implement invitation-bound password setup and email proof, restart/recovery against pre-staged credentials, safe GET and non-expiring/revoked admission (SHA-02/05/08).
- [x] 2.4 Implement ordinary email/password login plus current-provider checks, opaque sessions, external/local reset/disable/revocation, logout/expiry, CSRF and safe authorized returns; run reusable C-ID checks (SHA-01/04/05/06).

## 3. Instructor invitations (historical Brevo implementation)

- [x] 3.1 Implement injected server-only Brevo transport and bounded queued/failed/unknown receipts, secrets/configuration templates and honest missing-config behavior (SHA-05/10).
- [x] 3.2 Implement instructor send/list/resend/revoke scoped by trusted inviter/course with Keith gate before records/mail; test missing/revoked/forged/other-instructor denial, exact NUS policy, rotation, cooldown and no implicit enrollment (SHA-02/03/10).
- [x] 3.3 Implement warm-workbook instructor tracking and invitation/password setup screens; no copy-only/manual-delivery claim, no expired-invitation label (SHA-02/03/07/08/10, UI-01/02/07/08).

## 4. Recovery and sign-in UI

- [x] 4.1 Implement generic reset request, provider action validation/confirmation, current active/admitted identity and session invalidation; test expiry/replay/mismatch/concurrent or skipped browser steps and partial provider/local failures (SHA-04/05/09).
- [x] 4.2 Implement email/password, check-email, forgot/replacement password, cancel/invalid/expired/network/pending/unavailable/success UI, accessible controls and no persistent browser credentials (SHA-01/07/08/09, UI-01/02/07/08).

## 5. Review and acceptance

- [x] 5.1 Independent read-only security/contract/UI review and focused repairs/re-review; record actual findings, not old Google clearance (SHA-01–10).
- [x] 5.2 Run npm run check, affected real-D1/provider/contract/security suites, Worker package and unchanged secret scan. Record exact verification/evidence and external parent/child usage checkpoint (CON-07).
- [ ] 5.3 Configure actual Firebase Spark/Gmail app password/quota/origins; verify consented NUS invite → setup/proof → login/logout → reset → old password/cookie denial → new login, Free capacity and real Keith authorization. User setup pending; no fixtures count (AUTH-01–03).
- [ ] 5.4 Complete actual UI-review evidence across required widths/themes/keyboard/reduced motion/native 200% zoom and obtain Darryl manual acceptance (UI-01/02/07/08).
- [ ] 5.5 Update exact-revision Keith handoff, synthetic examples/reusable checks, accepted versus pending boundaries and existing log/evidence; Keith review stays pending unless supplied (CON-03/07).

## History and limits

Earlier Google producer 1c1174d/PR8, 24-hour manual invites and 145+4 results do not complete this target. Local Argon2id candidate exceeded Free CPU budget; password work is delegated to selected Firebase, not weakened. User reports Firebase credentials entered in each environment on2026-11-07; configuration and live operation are unverified. No automatic account merging, public registration, course/student implementation, purchase, commit/push, deployment or archive. Keep one active migration writer and preserve unrelated work.

Local implementation/checkpoint: provider contracts, isolated runtime adapters, additive schema/operator mapping, authoring-independent authentication/mail/UI code, focused independent review/repairs and local checks are complete. This does NOT accept Keith boundary, configure external accounts, prove NUS delivery, verify hosted Free CPU/lifetime or complete the UI/manual matrix. Tasks5.3–5.5 remain open; exact candidate is a working-tree hash manifest pending any separately authorized commit. Unexpected external provider-email collisions fail safely for trusted operator recovery.

## 6. Approved native email replacement — 2026-11-07

- [x] 6.1 Reuse matching auth branch, preserve existing UI work, confirm Darryl write ownership and update existing artifacts for approved Firebase native mail.
- [x] 6.2 Replace Brevo transport/configuration, bind native delivery to one-use local tickets, add custom safe handler and additive proof cutover migration without duplicate identity/course storage (SHA-05/08/09/10/11).
- [x] 6.3 Verify actual-D1/synthetic-provider successful and denial/replay/expiry/mismatched mailbox/ticket/continuation behavior, native request/receipt contract, UI handler and independent review; run project checks/package/secret scan.
- [x] 6.4 Update producer handoff, examples, manual setup/secrets guide, log and local usage checkpoint. Keep actual Firebase delivery, Keith integration, hosted capacity and manual acceptance pending.

## 7. Direct Gmail delivery — current target,2026-11-07

- [x] 7.1 Record failed native Firebase template configuration, rejected hosted-password UX and unavailable SMTP2GO signup; preserve in-app password entry and existing credentials/branch/UI.
- [x] 7.2 Restore generated provider proofs before authority recheck and implement replaceable Gmail TLS SMTP transport, direct validated app links and blank runtime secret templates without extra provider signup/template edits/storage.
- [x] 7.3 Verify SMTP contract/timeout/encoding/rejection, actual isolated D1/auth/security suite and required project/package/secret checks; independent review/repairs and redacted evidence.
- [x] 7.4 Reconcile setup/handoff/source/log/usage and present exact manual steps. Real app-password auth, NUS inbox, hosted capacity/background lifetime, first instructor/Keith integration and manual acceptance remain pending.

Section6 native custom-handler candidate is superseded by7; earlier source verification does not prove the Gmail producer. SMTP2GO candidate was withdrawn before release when user could not sign in; no live sender verified.

## 8. Password minimum revision — confirmed2026-11-07

- [x] 8.1 Record Darryl's eight-character minimum and user-reported Firebase configuration in current docs/spec/UI policy/setup/handoff, preserving historical checks and maximum64. No application code changes in this request.
- [x] 8.2 Align server validation, sign-in/setup/reset forms/messages and meaningful7/8/64/65 Unicode boundary tests to the revised8–64 policy; run affected/project checks and verify an actual eight-character local owner login. Other Firebase policy settings remain user-reported; do not claim that length alone proves compliance.

## 9. Persistent operator owner — approved2026-11-07

- [x] 9.1 Confirm first-owner/fake-alias policy and exact Darryl shared writer/migration window; distinguish owner administration from Keith course authority and synthetic versus real local mail.
- [x] 9.2 Implement optional secret-backed bootstrap through guarded login, singleton completion/lease/immutable pins, stable provider UID and existing account admission; retain unverified alias and deny external-reset takeover/rebootstrap.
- [x] 9.3 Verify concurrency/retry/collision/unverified/disabled/revoked/external-reset guards,8–64 boundaries, restart persistence and current C-ID; independent review, project/package/secret checks.
- [x] 9.4 Prepare redacted setup/handoff/manual checklist/log/usage and perform only authorized local provisioning if actual Firebase configuration permits; production deployment/creation and Keith integration remain pending.

- [ ] 9.5 Obtain Darryl manual acceptance and separatelyreviewedremote bootstrap/release plusKeith courseauthority; no localtest/screenshot countsasproductioncompletion.

## 10. Planned course-aware invitations — COU target

Detailed implementation/verification tasks live in [course-onboarding](../course-onboarding/tasks.md). All remain pending; completed historical SHA tasks do not prove the new target.

- [ ] 10.1 Extend first-admin creator eligibility and invitation Student/Instructor target/authority while preserving exact account/session/provider identity and mail audit; verify COU-01/03/07 with shared C-ID review.
- [ ] 10.2 Implement new-versus-registered recipient password branch and atomic authenticated course-role acceptance with replay/revocation/partial-failure recovery; verify COU-04/05, existing password preservation and one stable account.
- [ ] 10.3 Verify composed allowed-context role discovery and both opposite-role dashboard journeys with the actual Keith consumer, plus authorized controlled mail/hosted evidence and manual acceptance. Keep unexecuted integration pending.

## 11. Setup-reset reconciliation — approved 2026-11-08

- [x] 11.1 Record Darryl's exclusive auth migration/write window; preserve legacy locks and existing account and proof boundaries. [AUTH-01–03, SHA-05/08/11/13]
- [x] 11.2 Journal claim-bound reset dispatch and terminal completion; permit safe exact-claim recovery without provider replay, fresh proof required; leave unknown outcomes locked. [SHA-05/08/11/13]
- [x] 11.3 Test interrupted/crashed, terminal retry, wrong account, stale proof, revoked invitation, concurrency and legacy lock paths with synthetic provider and local D1; independent security review and focused re-review. [AUTH-01–03, SHA-05/08/11/13] — Focused cases pass; live provider settlement remains unverified.
- [ ] 11.4 Run required checks and provide redacted operator escalation and user acceptance checklist; live provider/hosted and Keith integration remain pending. [SHA-13]
