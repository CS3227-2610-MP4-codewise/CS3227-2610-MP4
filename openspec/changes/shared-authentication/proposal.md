# Shared authentication — Firebase passwords and Gmail delivery

## Current approved outcome — 2026-11-07

Darryl requires non-expiring instructor invitations, in-app password creation/reset/login and free infrastructure. Firebase remains the sole credential authority behind Codewise forms. Gmail replaces Brevo/native Firebase email/SMTP2GO after setup blockers; user requested another free sender and steps after obtaining a Google app password. Do not redirect password entry to Firebase. Darryl confirmed minimum8/maximum64 characters on2026-11-07; Firebase change is user-reported, while current Codewise15-character validation still needs implementation alignment.

## Scope

Server-only Gmail SMTP over fixed implicit TLS465, direct Codewise generated Firebase proof links, existing ticket/invitation/account/session store and authorization checks, exact manual secrets guide and contract/security evidence. No Firebase template customization or new Firebase project required. User configures GMAIL_SENDER_EMAIL/GMAIL_APP_PASSWORD; AUTH_MAIL_ENABLED gates actual mail. Earlier Firebase custom action URL is rejected by real account and no longer on send path. Native email and unverified SMTP2GO are superseded candidates, not production completions.

## Acceptance and dependencies

Preserve AUTH-01–03/SHA-01–11/CON-03/07, UI-01/02/07/08 warm-workbook-v1. Send/list/resend/revoke require real current Keith course authority, missing ports unavailable. Non-expiring admission is distinct from ten-minute one-use proofs. In-app chosen password, safe reset, old password/cookie rejection and fresh login. Synthetic SMTP and D1 checks plus independent review do not prove real delivery/hosted CPU. First instructor, real Gmail/Firebase/NUS inbox and Keith composition/manual acceptance remain pending. No new role/course/student services, paid subscription, automatic email identity merge, commit/push/deploy/archive. Preserve prior UI edits.

## Historical provider decisions


## Why

Darryl wants instructors to email invitations, students to create passwords in Codewise, and password recovery without repeated login OTPs or a paid Workers tier. On 2026-11-06 Darryl selected Firebase Authentication and Brevo and authorized implementation before accounts/keys were available; on 2026-11-07 he approved replacing Brevo with Firebase native email. This supersedes the earlier SendGrid/local-password and proposed passwordless/Supabase options in this bounded SH-AUTH change.

## Decision status

Confirmed: Workers Free; Firebase as sole password authority; Firebase native password-action email delivery; non-expiring, revocable instructor-issued admission; email/password login and emailed recovery links; unchanged stable Codewise IDs, opaque cookie sessions and Keith-owned authorization. User will configure accounts and secrets later. No account creation, spending, deployment or automatic email-based linking of old Google identities is authorized.

Implementation is authorized; actual provider/action-template configuration, Free-runtime capacity, live NUS delivery, Keith's boundary review/composed authority and manual acceptance remain pending. Google producer 1c1174d/PR8 and its earlier checks are historical. FoC-team-12 User Service d6fdc85 remains a UX reference; its custom OTP/reset protocol, local password storage and exact lockout implementation are superseded by provider-managed proofs/abuse controls, not claimed as exact protocol parity.

## What Changes

- **BREAKING:** replace Google-only sign-in with invited NUS email/password backed by Firebase. Firebase owns passwords and project/UID identity; Codewise keeps only the authoritative app mapping/session/invitation store.
- Keith's injected current instructor/course authorization gates own-invite send/list/resend/revoke. Missing producer means unavailable before recipient records/mail; no fake memberships or automatic enrollment.
- Invitations remain pending until accepted/revoked. Separate verification/recovery proofs expire and are single-use; GET never consumes them. Users choose a password through Codewise, then use ordinary email/password login.
- Firebase sends its native password-action template for initial setup and recovery. Use the verified API contract in design.md for delivery. Track pending/accepted/revoked separately from queued/failed/unknown; queue acknowledgement is not inbox delivery.
- Preserve warm-workbook-v1 and UI-01/02/07/08, with an explicit provider-backed password/recovery policy addendum. No public registration, role choice or instructor self-promotion.
- Preserve closed SessionView, stable account IDs, Secure/HttpOnly opaque cookies, 30-minute idle/eight-hour absolute expiry, Origin/CSRF, logout/revocation and authorized local returns. Provider reset/disable/revocation must invalidate D1 sessions too.

## Capabilities

### New Capabilities

- shared-authentication: revise existing in-flight SHA-01–10, AUTH-01–03 and CON-03/07, not a duplicate capability.

### Modified Capabilities

None in canonical specs. Reconcile existing UI policy/C-ID status under Darryl's serialized window.

## Impact

Continue matching codex/shared-authentication from reviewed main 2d8a861; preserve e3a49bf and all existing work. Darryl owns auth/UI/compatible DTOs/additive migration/minimal API and configuration wiring, existing policy/docs/log/evidence/handoff. Keith retains course/membership/object producers and cross-review. No commit/push/deploy inferred.

Dependencies: Firebase Spark project, provider/password/action URL settings and server credential; approved Brevo account/sender/key; actual NUS inbox; first-instructor bootstrap and Keith authority. User confirms neither account exists yet. Synthetic local checks can proceed; real-provider login/mail, composed authority and hosted capacity remain pending. Free quotas are not an unlimited-service guarantee.

## Native email revision — approved 2026-11-07

Darryl requested removal of Brevo and implementation of the free Firebase email alternative. Reuse the existing credential/account/session producer and invitation audit; add a one-use local dispatch ticket because native email does not disclose its OOB code to the server. Parse only a same-origin custom email action handler, retain ten-minute local proof limits and non-expiring admission, and invalidate old generated-code proofs through additive0005. No paid tier, new provider account, live send, deployment or Keith implementation is implied. User reports credentials entered locally/staging/production; values and live operation are unverified.

## One-time operator owner — approved2026-11-07

User requests persistent first owner instead of transferring a synthetic preview account. Later explicitly chooses a non-owned NUS-format login alias and8-character password. Bootstrap uses optional operator-owned server secrets plus normal CSRF/origin/rate-limited sign-in, no defaults/new open route. Singleton D1 completion grants auth administration only, never instructor/course rights. Operator-provisioned Firebase identity remains unverified; exact completed owner UID/pinned credential snapshot is the sole mailbox-verification exception. Credential changes block owner authority even if Firebase emailVerified becomes true; explicit operator recovery is required. No bootstrap password stored in D1/source, automatic re-creation or hidden universal credential. Existing8–64 policy now needs implementation alignment as part of this usable bootstrap. Local real-provider Worker can send real mail; synthetic5176 cannot. Real bootstrap/provisioning/deployment outcomes remain evidence gates.

Current follow-up2026-11-07:8–64 validation is now implemented in app/server as part of one-time owner bootstrap. Prior documentation-only statements about15-character runtime describe the earlier state. Real Firebase policy/provider and production verification remain separate gates. Owner administration grants no course rights.

## Course-onboarding target supersedes admission-only planning — 2026-11-07

This future target is confirmed by Darryl, not implemented: COU-01–07 extends the existing SHA-02/03/08/11/12 flows. First-admin authority includes explicit course-creator eligibility without existing-course access; every current instructor can invite Student or Instructor into their taught course. New recipients choose a password; registered recipients use their existing password and validated acceptance adds the exact course role without registering/resetting again. Prior unaccepted invite is not registration. The previous statements that owner administration has no creator capability and that invitation acceptance creates no membership describe the earlier implementation/target and are superseded for the next implementation plan only. Existing account/provider/session/proof safeguards remain; C-ID/SHA technical extension and Keith consumer agreement are pending. See [proposal](../course-onboarding/proposal.md).

## Approved reset recovery continuation — 2026-11-08

Preserve fail-closed setup after ambiguous Firebase reset. Record a durable operation bound to the exact claim, UID, proof and invitation generation before dispatch; record terminal provider outcome only after all local continuation work has ended. An interrupted unknown operation or legacy resetting lock remains blocked absent reliable settlement evidence. A terminal record may permit a fresh setup claim without replaying a password change; a new current proof and explicit credential choice are required. [AUTH-01–03, SHA-05/08/11]
