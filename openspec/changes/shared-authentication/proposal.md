# Shared authentication — Firebase passwords and Brevo invitations

## Why

Darryl wants instructors to email invitations, students to create passwords in Codewise, and password recovery without repeated login OTPs or a paid Workers tier. On 2026-11-06 Darryl selected Firebase Authentication and Brevo and authorized implementation before accounts/keys are available. This supersedes the earlier SendGrid/local-password and proposed passwordless/Supabase options in this bounded SH-AUTH change.

## Decision status

Confirmed: Workers Free; Firebase as sole password authority; Brevo invitation delivery; non-expiring, revocable instructor-issued admission; email/password login and emailed recovery links; unchanged stable Codewise IDs, opaque cookie sessions and Keith-owned authorization. User will configure accounts and secrets later. No account creation, spending, deployment or automatic email-based linking of old Google identities is authorized.

Implementation is authorized; actual provider/account/sender configuration, Free-runtime capacity, live NUS delivery, Keith's boundary review/composed authority and manual acceptance remain pending. Google producer 1c1174d/PR8 and its earlier checks are historical. FoC-team-12 User Service d6fdc85 remains a UX reference; its custom OTP/reset protocol, local password storage and exact lockout implementation are superseded by provider-managed proofs/abuse controls, not claimed as exact protocol parity.

## What Changes

- **BREAKING:** replace Google-only sign-in with invited NUS email/password backed by Firebase. Firebase owns passwords and project/UID identity; Codewise keeps only the authoritative app mapping/session/invitation store.
- Keith's injected current instructor/course authorization gates own-invite send/list/resend/revoke. Missing producer means unavailable before recipient records/mail; no fake memberships or automatic enrollment.
- Invitations remain pending until accepted/revoked. Separate verification/recovery proofs expire and are single-use; GET never consumes them. Users choose a password through Codewise, then use ordinary email/password login.
- Brevo sends invitations; Firebase supplies maintained verification/reset proofs. Use the verified API contract in design.md for delivery. Track pending/accepted/revoked separately from queued/failed/unknown; queue acknowledgement is not inbox delivery.
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
