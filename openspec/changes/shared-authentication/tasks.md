# Shared authentication — Firebase/Brevo tasks

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

## 3. Instructor invitations and Brevo

- [x] 3.1 Implement injected server-only Brevo transport and bounded queued/failed/unknown receipts, secrets/configuration templates and honest missing-config behavior (SHA-05/10).
- [x] 3.2 Implement instructor send/list/resend/revoke scoped by trusted inviter/course with Keith gate before records/mail; test missing/revoked/forged/other-instructor denial, exact NUS policy, rotation, cooldown and no implicit enrollment (SHA-02/03/10).
- [x] 3.3 Implement warm-workbook instructor tracking and invitation/password setup screens; no copy-only/manual-delivery claim, no expired-invitation label (SHA-02/03/07/08/10, UI-01/02/07/08).

## 4. Recovery and sign-in UI

- [x] 4.1 Implement generic reset request, provider action validation/confirmation, current active/admitted identity and session invalidation; test expiry/replay/mismatch/concurrent or skipped browser steps and partial provider/local failures (SHA-04/05/09).
- [x] 4.2 Implement email/password, check-email, forgot/replacement password, cancel/invalid/expired/network/pending/unavailable/success UI, accessible controls and no persistent browser credentials (SHA-01/07/08/09, UI-01/02/07/08).

## 5. Review and acceptance

- [x] 5.1 Independent read-only security/contract/UI review and focused repairs/re-review; record actual findings, not old Google clearance (SHA-01–10).
- [x] 5.2 Run npm run check, affected real-D1/provider/contract/security suites, Worker package and unchanged secret scan. Record exact verification/evidence and external parent/child usage checkpoint (CON-07).
- [ ] 5.3 Configure actual Firebase Spark/Brevo approval/sender/quota/URLs; verify consented NUS invite → setup/proof → login/logout → reset → old password/cookie denial → new login, Free capacity and real Keith authorization. User setup pending; no fixtures count (AUTH-01–03).
- [ ] 5.4 Complete actual UI-review evidence across required widths/themes/keyboard/reduced motion/native 200% zoom and obtain Darryl manual acceptance (UI-01/02/07/08).
- [ ] 5.5 Update exact-revision Keith handoff, synthetic examples/reusable checks, accepted versus pending boundaries and existing log/evidence; Keith review stays pending unless supplied (CON-03/07).

## History and limits

Earlier Google producer 1c1174d/PR8, 24-hour manual invites and 145+4 results do not complete this target. Local Argon2id candidate exceeded Free CPU budget; password work is delegated to selected Firebase, not weakened. Neither provider account is configured yet. No automatic account merging, public registration, course/student implementation, purchase, commit/push, deployment or archive. Keep one active migration writer and preserve unrelated work.

Local implementation/checkpoint: provider contracts, isolated runtime adapters, additive schema/operator mapping, authoring-independent authentication/mail/UI code, focused independent review/repairs and local checks are complete. This does NOT accept Keith boundary, configure external accounts, prove NUS delivery, verify hosted Free CPU/lifetime or complete the UI/manual matrix. Tasks5.3–5.5 remain open; exact candidate is a working-tree hash manifest pending any separately authorized commit. Unexpected external provider-email collisions fail safely for trusted operator recovery.
