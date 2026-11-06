# Shared authentication design — Firebase and Brevo

## Context

Darryl selected Firebase Authentication and Brevo on 2026-11-06 and authorized coding before external setup. Existing Google producer 1c1174d and previous 145+4 checks do not verify this target. Earlier local Argon2id spike exceeded Workers Free's 10ms CPU allowance; preserve workflow/evidence/shared-authentication/hash-spike.md/json as historical measured evidence. Firebase now owns password hashing; full Worker request capacity still requires measurement.

FoC-team-12/user-service at d6fdc85ad982ffd2dbfa65e9928aa449f1b4e5dc was inspected read-only. Preserve its user-facing invited NUS password/login/recovery outcome; do not port Spring BCrypt, role JWTs, custom six-digit codes, exact 3-failure lockout or password-reuse checking as unverified Firebase guarantees. Passwordless P2, Supabase and SendGrid are superseded alternatives, not accepted implementations.

## Goals / Non-Goals

Instructor first invite and own-invite tracking; exact NUS recipient eligibility; student password setup, email/password login and robust recovery; revocable role-free sessions. Keep one authoritative Firebase credential identity and one Codewise mapping/session store, with no replicated passwords or memberships.

No public application signup, instructor self-promotion, automatic email linking of legacy identities, duplicate course/identity services, inbound replies/read analytics, student features or paid plan changes. No new cloud account, credentials, email or deployment is created by local coding.

## Decisions

### Authority and admission

Darryl is sole auth writer. Keith's injected requireCourse(principal,courseId,'instructor-write'/'instructor-read') gates send/list/resend/revoke; scope SQL to trusted inviter and authorized course. Recheck before dispatch. Missing/denied Keith interface makes actions unavailable before records/mail. Auth-administrator flags never confer instructor authority. First instructor needs trusted provisioning plus Keith's assignment, never self-promotion.

Pending invitations are non-expiring, one-use, normalized-email-bound and revocable; accepting proves admission only, not course enrollment. Store courseId as audit/authorization context. Hash high-entropy invitation tokens; resend rotates capability and retains audit ID; accepted/revoked cannot resend. GET and email scanners consume nothing.

Initial domain policy retains previously approved FoC exact domains u.nus.edu, u.duke.nus.edu and u.yale-nus.edu.sg. No suffix matching or assumed NUS sending-domain ownership. Staff bootstrap is trusted operator work, not expansion of public student eligibility.

### Replaceable provider boundary

Server-only credential adapter owns provision/password login/verification/action proof/reset/current identity. Firebase endpoints and project are configured server-side; never trust browser UID/email/verified flags. Firebase project plus UID is immutable identity; email is verified contact data. Never automatically merge old Google accounts by matching email. Inventory actual accounts and provide an explicit trusted UID mapping before cutover; stable Codewise IDs remain.

Use documented Firebase REST/admin endpoints from Workers rather than copying password hashing. Admin OAuth signing and account lookup must use a maintained compatible implementation or reviewed native WebCrypto, with credentials restricted to authentication management. Validate responses, project, identity, expiry, account disabled/verified state and provider failures. Network waiting is separate from Worker CPU. No Firebase tokens/service keys in browser persistence or logs.

Invitation-bound password setup must prevent external/pre-staged Firebase credentials from becoming an admitted Codewise identity. Recipient controls the final password and proves mailbox ownership using a short-lived Firebase action bound to admission. Existing/abandoned credentials require secure recovery/restart, not verification of another person's password. At most one Codewise acceptance/account binding commits, and reset never admits/reactivates an account.

### Proofs and recovery

Use provider-supported email action links instead of custom six-digit verification/reset codes. Native Firebase email or generated action links through Brevo are permitted implementations of the selected providers; exact method/permissions are verified before dependent code. Links return to approved Codewise action URLs; allowlist local return destinations. Remove action/invitation capabilities from history before other requests; no third-party resources/referrers or tracking on proof pages.

Forgot password returns generic eligible-email acknowledgement regardless of existence/disabled state, with consistent admission/cooldown and no raw provider errors. Recovery is for already admitted active accounts. Verify/confirm only supported proof purpose and exact intended email; expiration/replay/mismatch/bypass/racing confirmations fail without fabricated success. Provider confirmation and D1 changes are separate systems: never promise a cross-service atomic transaction. If confirmation succeeds but local completion fails, retry safely and enforce provider credential validity on subsequent session checks.

Retain 15-character minimum where Firebase policy can enforce it; test Unicode and no silent truncation. Provider-owned policy/lockout semantics must be documented rather than asserting old FoC numeric behavior. No new username/profile store is needed for login.

### Sessions and schema continuity

Reuse existing account/session storage and closed SessionView{schemaVersion:1,userId,expiresAt}. Next additive migration after numbering inspection; do not edit published 0003, reset/drop data or create role-specific accounts. Separate pending invitation, send outcome and verified identity binding.

Opaque cookies remain host-only Secure/HttpOnly/SameSite=Lax (explicit loopback development exception), 30-minute idle/eight-hour absolute expiry. Rotation/logout/revocation and conditional touches cannot revive invalid sessions. Record provider credential validity at login and recheck current provider status before every protected request so external reset/disable/revocation invalidates local cookies; fail unavailable on lookup failure. Firebase reset's automatic token revocation alone does not revoke D1 sessions. Local successful reset additionally revokes all account sessions; old password and cookie denial are required checks.

Origin/CSRF guard all cookie/preauth mutations, rate-limit distributed email/IP/user actions, bound request/response size and timeouts. Browser roles and provider account existence grant no course rights. Reauthorize destination through Keith before showing any protected data; absent producer gives unavailable workspace.

### Mail and tracking

Server-only Brevo transport with verified sender/account approval and blank-secret templates. Recipient domains are independent of sender domain. Do not assume right to send from NUS. Configure approved public origin, API key, sender and actual quotas; no successful fake fallback in production.

Record queued/failed/unknown bounded attempts separately from pending/accepted/revoked invitation state. External sending is not atomic with D1; timeout is unknown, not automatic failure or delivery. Stable audit ID, idempotent action and cooldown prevent uncontrolled duplicates; do not promise exactly-once delivery. No raw capabilities in lists/logs/outbox; disable authentication-link tracking. Firebase native mail receipts cannot be claimed as inbox delivery.

### UI and verification

Preserve docs/ui/design.md warm-workbook-v1 tokens/layout and UI-01/02/07/08. Intentional auth-policy addendum permits provider-backed password forms and recovery instead of old Google-only wording. Screens: email/password sign-in; non-expiring invitation/password setup; check email; expired/invalid action; Forgot password; new-password confirmation; instructor send/list/resend/revoke; unavailable workspace. Label pending/cancel/error/cooldown/queued/unknown honestly; no client credential persistence, public Register or role picker.

Automated tests: closed schemas/domain tricks; unauthenticated/forged/other-instructor actions and absent Keith before mail; non-expiring admission, scanner safety, capability rotation, concurrent acceptance; provider response validation, proof purpose/expiry/replay, external-staged-password recovery; generic reset and disabled/uninvited denial; reset/disable/revocation vs session races; unchanged C-ID checks; Brevo failures/timeouts; no fixtures/secrets in deployed composition. Use actual local D1 and synthetic transports, not a second domain store.

One independent read-only reviewer; main repairs and reruns focused checks plus npm run check/Worker bundle/unchanged secret scan. Complete actual UI review at 320/768/1024/1440, light/dark, keyboard/reduced motion/native 200% zoom; missing evidence stays pending.

Real acceptance requires configured Firebase + approved Brevo + consented NUS inbox and real Keith instructor authority: invite → password setup/mail proof → login/logout → reset → old password/cookie denial → new login and authorized destination. Record account quotas, actual inbox and staging evidence separately; no synthetic completion or deployment claim. Give Keith exact producer revision, synthetic payloads and reusable checks; his review remains pending until supplied.

## References

- Firebase REST: https://firebase.google.com/docs/reference/rest/auth
- Firebase email actions: https://firebase.google.com/docs/auth/admin/email-action-links
- Firebase session revocation: https://firebase.google.com/docs/auth/admin/manage-sessions
- Firebase password policy: https://firebase.google.com/docs/auth/web/password-auth
- Firebase Spark: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- Firebase quotas: https://firebase.google.com/docs/auth/limits
- Brevo plans: https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans

These are documentation, not live account/delivery/runtime evidence.

## Implemented adapter protocol (local verification; live configuration pending)

The implementation chooses generated Firebase PASSWORD_RESET links delivered by Brevo for both initial password setup and recovery. An instructor send reserves a UID in the existing invitation record, admin-creates that UID with a discarded random password and unverified email, then generates a provider proof. The email contains the non-expiring admission token and separate ten-minute local proof. GET removes capabilities from history and consumes nothing. Confirmation validates local purpose/email/UID/generation plus Firebase inspect, consumes the local proof, resets to the recipient's chosen password, administratively marks email verified only after successful proof, and uses the existing atomic D1 admission transaction. Setup creates no surviving login cookie; the recipient signs in explicitly. Repeated confirmation cannot replay. Partial outcomes require a fresh proof; no cross-service atomicity is claimed.

Reinvitation reuses only a prior trusted invitation UID reservation. An arbitrary pre-existing Firebase email/UID collision is blocked without overwrite or automatic linking and requires trusted operator resolution. Explicit local bootstrap and verified legacy-subject-to-UID mapping preserve stable Codewise IDs; no real account cutover has occurred.

Password login captures current provider credential/revocation state before authentication, requires the authenticated/current UID and snapshot to match, then rechecks after issuing an unexposed local session. Protected use rechecks current provider state; provider unavailable fails closed. Recovery revokes local sessions before external mutation. Local 90-second cooldowns and email/IP admission coexist with Firebase's own controls; no FoC numeric lockout parity is claimed.

Instructor dispatch takes a 120-second per-invitation lease before external generation. Resend cannot rotate during an active lease. A D1 trigger atomically fences action creation by invitation token generation/UID/email/pending state; stale action insertion rolls back prior invalidation. Current session/course authority and current pending token are checked after provider awaits, immediately before sending. Receipt writes also require the current token generation. A send already handed to Brevo cannot be recalled; generation fencing makes its stale result harmless.

Recovery request does identical public admission/cooldown/database work for known/unknown addresses, then schedules a bounded ephemeral closure through Worker context.waitUntil; the public response does not await provider/mail latency. No raw-proof durable outbox is introduced. Background lifetime/delivery must be tested on the real hosted Free environment; acknowledgement means requested, not delivered.

Invitation UI consumes courseId only as navigation context from Keith's future course workspace, never as authority. There is no raw course-ID input or invented course picker; missing context/producer is unavailable. Approved synthetic preview separately injects one invented instructor/course and captures mail locally.
