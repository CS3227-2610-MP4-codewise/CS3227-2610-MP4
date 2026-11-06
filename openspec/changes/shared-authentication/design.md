# Current mail design — Gmail,2026-11-07

FirebaseCredentials.action uses the existing privileged generated PASSWORD_RESET link API (returnOobLink:true). It extracts the code, never follows the returned URL. ManagedRoutes stores its existing ten-minute one-use local ticket and builds a direct same-origin /sign-in#invite=...&ticket=...&code=... or /auth/reset#ticket=...&code=... link. Generation precedes the final instructor/pending recheck before mail. AuthEmail validates that link and renders plain text; GmailTransport connects only smtp.gmail.com465 implicitTLS with ordinary certificate validation. No Firebase email template edit, native-mail send, external password form, SMTP2GO API or new database.

GmailTransport is injectable behind AuthMailer. Exactly one sender/recipient/message per connection, strict ASCII envelope/subject validation, UTF8/base64 MIME76cols, bounded16KiB body and64KiB replies/32multilines/1024charlines,15s entire SMTP deadline. Authentication follows opened/TLS+220/EHLO; expired work cannot emit later commands. Explicit SMTP rejection is failed; network/malformed/timeout/ambiguous DATA acknowledgement unknown; only final DATA250 queued. No auto retry, raw transcript/log or inbox claim. AUTH_MAIL_ENABLED is configured operator intent; real inbox/credential verification remains a separate gate.

Existing UID/email/password proof confirmation, one-use ticket/generation, stable account IDs, CSRF, current provider/session checks and Keith ports are unchanged. Existing0005 consumes legacy proofs only and preserves account/session/invitation data. No0006 hosted-action migration remains. Shared Firebase project is permitted for origins; cross-environment UID mappings still require explicit verified provisioning, never email auto-linking.

Manual settings/setup in workflow/auth/SETUP.md. Google app-password account may have account restrictions/limits and Google password changes revoke the app password. Local TLS greeting is connectivity only; actual auth/NUS delivery/Firebase generated-link permissions/full recovery background30s lifetime and hosted Workers10msCPU remain unverified. No paid plan or production claim.

## Current password length policy — confirmed2026-11-07

Darryl confirmed an 8-character minimum on2026-11-07 and reports changing Firebase accordingly. The intended policy is8–64 Unicode characters; maximum64 and no truncation remain. This is a documentation update: src/server/auth/firebase.ts and src/web/auth/App.tsx still enforce15, and runtime/test alignment is pending. Firebase console configuration was not independently verified in this request. Existing15-character evidence below remains historical, not verification of the revised minimum.

## Historical designs — superseded where they conflict with current design


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

Historical policy:15-character minimum, superseded by Darryl's8-character decision above; test Unicode and no silent truncation when aligning runtime. Provider-owned policy/lockout semantics must be documented rather than asserting old FoC numeric behavior. No new username/profile store is needed for login.

### Sessions and schema continuity

Reuse existing account/session storage and closed SessionView{schemaVersion:1,userId,expiresAt}. Next additive migration after numbering inspection; do not edit published 0003, reset/drop data or create role-specific accounts. Separate pending invitation, send outcome and verified identity binding.

Opaque cookies remain host-only Secure/HttpOnly/SameSite=Lax (explicit loopback development exception), 30-minute idle/eight-hour absolute expiry. Rotation/logout/revocation and conditional touches cannot revive invalid sessions. Record provider credential validity at login and recheck current provider status before every protected request so external reset/disable/revocation invalidates local cookies; fail unavailable on lookup failure. Firebase reset's automatic token revocation alone does not revoke D1 sessions. Local successful reset additionally revokes all account sessions; old password and cookie denial are required checks.

Origin/CSRF guard all cookie/preauth mutations, rate-limit distributed email/IP/user actions, bound request/response size and timeouts. Browser roles and provider account existence grant no course rights. Reauthorize destination through Keith before showing any protected data; absent producer gives unavailable workspace.

### Mail and tracking

Server-only FirebaseMailer sends PASSWORD_RESET through accounts:sendOobCode using the configured Firebase API key and a strictly same-origin continueUrl. Firebase sends its managed authentication template; no SMTP account, custom From address or Brevo secret. FIREBASE_EMAIL_ACTIONS_READY gates sending until custom action URL/domains are configured. Spark currently allows150 password-reset emails/day shared by setup and recovery; verify actual project quotas. No successful fake fallback in production.

Record queued/failed/unknown bounded attempts separately from pending/accepted/revoked invitation state. External sending is not atomic with D1; timeout is unknown, not automatic failure or delivery. Stable audit ID, idempotent action and cooldown prevent uncontrolled duplicates; do not promise exactly-once delivery. No raw capabilities in lists/logs/outbox; disable authentication-link tracking. Firebase native mail receipts cannot be claimed as inbox delivery.

### UI and verification

Preserve docs/ui/design.md warm-workbook-v1 tokens/layout and UI-01/02/07/08. Intentional auth-policy addendum permits provider-backed password forms and recovery instead of old Google-only wording. Screens: email/password sign-in; non-expiring invitation/password setup; check email; expired/invalid action; Forgot password; new-password confirmation; instructor send/list/resend/revoke; unavailable workspace. Label pending/cancel/error/cooldown/queued/unknown honestly; no client credential persistence, public Register or role picker.

Automated tests: closed schemas/domain tricks; unauthenticated/forged/other-instructor actions and absent Keith before mail; non-expiring admission, scanner safety, capability rotation, concurrent acceptance; provider response validation, proof purpose/expiry/replay, external-staged-password recovery; generic reset and disabled/uninvited denial; reset/disable/revocation vs session races; unchanged C-ID checks; native-email failures/timeouts; no fixtures/secrets in deployed composition. Use actual local D1 and synthetic transports, not a second domain store.

One independent read-only reviewer; main repairs and reruns focused checks plus npm run check/Worker bundle/unchanged secret scan. Complete actual UI review at 320/768/1024/1440, light/dark, keyboard/reduced motion/native 200% zoom; missing evidence stays pending.

Real acceptance requires configured Firebase native action templates + consented NUS inbox and real Keith instructor authority: invite → password setup/mail proof → login/logout → reset → old password/cookie denial → new login and authorized destination. Record account quotas, actual inbox and staging evidence separately; no synthetic completion or deployment claim. Give Keith exact producer revision, synthetic payloads and reusable checks; his review remains pending until supplied.

## References

- Firebase REST: https://firebase.google.com/docs/reference/rest/auth
- Firebase email actions: https://firebase.google.com/docs/auth/admin/email-action-links
- Firebase session revocation: https://firebase.google.com/docs/auth/admin/manage-sessions
- Firebase password policy: https://firebase.google.com/docs/auth/web/password-auth
- Firebase Spark: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- Firebase quotas: https://firebase.google.com/docs/auth/limits
- Native delivery API: https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/sendOobCode
- Custom action handler: https://firebase.google.com/docs/auth/custom-email-handler

These are documentation, not live account/delivery/runtime evidence.

## Implemented adapter protocol (local verification; live configuration pending)

The current implementation uses Firebase native PASSWORD_RESET delivery for both initial password setup and recovery, replacing generated links/Brevo on2026-11-07. An instructor send reserves a UID in the existing invitation record, admin-creates that UID with a discarded random password and unverified email, then stores a random one-use local dispatch ticket (hashed in the legacy code_hash column) bound to intended UID/email/purpose/invitation generation with a ten-minute TTL. Firebase receives a same-origin continueUrl with the ticket and non-expiring admission token in its fragment and sends its own code. The OOB code is not returned by the send API. GET removes capabilities from history and consumes nothing. The custom /auth/action handler strips all incoming query/fragment secrets before bootstrap and accepts only resetPassword with one code and one exact-origin continueUrl pointing to /sign-in or /auth/reset; it never follows arbitrary destinations. Confirmation supplies code plus ticket and validates local purpose/email/UID/generation plus Firebase inspect, consumes the local ticket, resets to the recipient's chosen password, administratively marks email verified only after successful proof, and uses the existing atomic D1 admission transaction. Setup creates no surviving login cookie; the recipient signs in explicitly. Repeated confirmation cannot replay. Partial outcomes require a fresh proof; no cross-service atomicity is claimed.

Reinvitation reuses only a prior trusted invitation UID reservation. An arbitrary pre-existing Firebase email/UID collision is blocked without overwrite or automatic linking and requires trusted operator resolution. Explicit local bootstrap and verified legacy-subject-to-UID mapping preserve stable Codewise IDs; no real account cutover has occurred.

Password login captures current provider credential/revocation state before authentication, requires the authenticated/current UID and snapshot to match, then rechecks after issuing an unexposed local session. Protected use rechecks current provider state; provider unavailable fails closed. Recovery revokes local sessions before external mutation. Local 90-second cooldowns and email/IP admission coexist with Firebase's own controls; no FoC numeric lockout parity is claimed.

Instructor dispatch takes a 120-second per-invitation lease before external generation. Resend cannot rotate during an active lease. A D1 trigger atomically fences action creation by invitation token generation/UID/email/pending state; stale action insertion rolls back prior invalidation. Current session/course authority and current pending token are checked after provider awaits, immediately before sending. Receipt writes also require the current token generation. A send already handed to Firebase cannot be recalled; generation fencing makes its stale result harmless.

Recovery request does identical public admission/cooldown/database work for known/unknown addresses, then schedules a bounded ephemeral closure through Worker context.waitUntil; the public response does not await provider/mail latency. No raw-proof durable outbox is introduced. Background lifetime/delivery must be tested on the real hosted Free environment; acknowledgement means requested, not delivered.

Invitation UI consumes courseId only as navigation context from Keith's future course workspace, never as authority. There is no raw course-ID input or invented course picker; missing context/producer is unavailable. Approved synthetic preview separately injects one invented instructor/course and captures mail locally.

### Native email operational constraints

Firebase password-reset templates have one project-wide custom action URL. Use separate Firebase Spark projects for concurrent local/staging/production mail flows; each matching project/API-key/service-account set uses its environment-specific /auth/action URL and authorized hostname. Sharing one project supports only the environment currently named by that action URL; wrong-origin continuation is rejected, never forwarded. Native template wording cannot be fully customized per invitation versus recovery; configure a neutral Codewise password setup/reset subject. The mailer acknowledgement is queued, never delivery/read evidence. Set FIREBASE_EMAIL_ACTIONS_READY only after console settings are prepared, then verify actual NUS delivery; failure/unavailable is honest. No real key or inbox is inspected by local tests.

Migration0005 consumes prior generated-code actions and preserves users/sessions/invitations. Old pending invitation links can request new native-mail proofs. Legacy field code_hash now stores only ticket hashes; actual Firebase codes stay transient. URL query proofs may reach the serving platform request URL, so no application URL/analytics logging is permitted on the handler; real platform/email privacy remains a live check.

## Current operator-owner design — 2026-11-07

BOOTSTRAP_OWNER_EMAIL/PASSWORD are optional server secrets with no shipped values. On POSTlogin after normal preauthCSRF/origin/distributed rate checks, OwnerBootstrap compares configured email and fixed-length password hashes before writes. It reserves one D1 singleton and stable project/email-derived UID, obtains a120s lease, Firebase-creates that UID with the selected password and emailVerified:false, then authenticates exactUID/email/password. Existing collisions fail closed, no password overwrite/reactivation/email linking. Reuses the existing invitation admission/account/session transaction; bootstrap session is never exposed and is logged out. D1 completion and auth_administrators grant occur in one lease-fenced batch. Completed marker identity/timestamps/pinnedpasswordAt+validSince are immutable; delete cannot reopen setup. Disabled/revoked/credential-changed owners are not revived.

All owner login/session reads require exact completed marker, active account, auth-administrator record and matching provider UID/email/pinned credential metadata, regardless of current emailVerified. This prevents another controller of the invented email from resetting its Firebase password externally and gaining owner authority. Ordinary unverified identities remain denied. App reset does not send owner recovery; provider reset is not claimed disabled, but its credential change blocks owner authority. Owner recovery/rotation needs explicit trusted operation, not rebootstrap. Bootstrap secrets may be removed after completion without losing the pinned identity.

Shared identity/SessionView remains closed; administrator presentation is server-derived. Auth administration does not supply Keith course/object permissions or default memberships. Missing ports remain unavailable. User-approved policy8–64 scalars applies consistently to app/server. Real fake-alias owner provisioning is a local authorized test only; production singleton creation after reviewed migrations/release requires its own operator configuration and sign-in, not copied fixtures.

Current follow-up2026-11-07:8–64 validation is now implemented in app/server as part of one-time owner bootstrap. Prior documentation-only statements about15-character runtime describe the earlier state. Real Firebase policy/provider and production verification remain separate gates. Owner administration grants no course rights.
