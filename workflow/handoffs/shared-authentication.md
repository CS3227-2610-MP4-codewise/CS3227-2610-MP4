# Current SH-AUTH handoff — committed Firebase/Gmail and owner bootstrap, 2026-11-07

Producer revision: 9b3d007e3f3d796b60b5e101f2758d3c443165d7 on codex/shared-authentication. Authentication implementation commit: 59560cf; instructor interface cleanup: 9b3d007. [Source manifest](../evidence/shared-authentication/owner-bootstrap/source-manifest.json) pins committed Git blobs and SHA-256 bytes. Earlier working-tree/native/Brevo manifests below are historical. This is source publication, not a deployment or Keith acceptance.

Darryl owns SH-AUTH; Keith owns course/membership/object authorization and student features. AUTH-01–03, SHA-01–12, CON-03/07; warm-workbook-v1 UI-01/02/07/08. Current password policy is 8–64 Unicode characters in UI/server. Firebase is the password authority; Gmail app-password SMTP delivers direct Codewise setup/recovery links. Password entry remains in Codewise. Use [setup and secret names](../auth/SETUP.md), [synthetic payloads](../auth/firebase-examples.json) and [trusted-session checks](../auth/conformance.ts).

Compose ManagedAuthRoutes(ManagedStore(DB), firebaseConfig, FirebaseCredentials, AuthEmail(GmailTransport), keithCoursePort, destinationAuthorizer, backgroundDispatcher, optionalOwnerBootstrap). The Worker supplies no synthetic fallback or Keith implementation. SessionView remains schemaVersion:1,userId,expiresAt. Setup confirmation requires {invite,ticket,code,password}; reset confirmation requires {ticket,code,password}. Origin, preauth/session CSRF, current provider identity/revocation and bound single-use proof checks remain mandatory. Invitations do not expire; generated password proofs expire after ten minutes.

Apply additive migrations 0005 and 0006 through the reviewed release workflow. 0005 invalidates older proof records without deleting accounts/sessions/invitations. 0006 records one-time owner completion and immutable provider credential pins; optional explicit bootstrap secrets use normal guarded login. Account administration never grants course permissions. Local owner provisioning/login with the configured Firebase project was actually verified, including login after removing bootstrap secrets. No remote D1 owner, course membership, staging or production deployment is claimed. The invented operator alias has no app email recovery; an external credential change blocks it pending trusted operator recovery.

Final npm run check passed: six strict OpenSpec changes, types, lint, 191 Vitest tests across 12 files, four Node deployment tests, and production browser build. Redacted source-export Gitleaks 8.24.2 scan passed; ignored local credentials/data and Git history were excluded. Existing read-only auth_review supplied independent source review; main ran checks. [Owner verification and manual checklist](../evidence/shared-authentication/owner-bootstrap/verification.md), [Gmail limitations](../evidence/shared-authentication/gmail/verification.md), and [UI review](../evidence/shared-authentication/ui-clarity/review.md) record actual evidence.

Pending: Keith's revised-boundary review and exact requireCourse/destination producer revision; real instructor authorization; Gmail authentication and consented NUS inbox delivery; normal student setup/recovery integration; hosted Free CPU/background lifetime; complete UI/manual acceptance; reviewed staging/release. Missing Keith authority returns unavailable, including for the account owner. Keith should consume the pinned producer and reusable checks, then provide his exact producer and composed authorization evidence.

---

## Historical working-tree Gmail handoff — superseded by committed producer above

Darryl owns SH-AUTH; Keith owns course/membership/object authority and student features. AUTH-01–03 SHA-01–11 CON-03/07; UI-01/02/07/08 warm-workbook-v1. User rejected hosted password entry; it remains inside Codewise. Native Firebase template update blocked in actual account; SMTP2GO signup unavailable. Current mail uses existing personal Gmail app password via implicitTLS465. No template editor/new Firebase project required.

Uncommitted producer on codex/shared-authentication, base b169c11b02959ca60191aef1e8dced29941c4968. [Gmail source manifest](../evidence/shared-authentication/gmail/source-manifest.json) pins working-tree bytes, not a new Git revision. Native/Brevo manifests below are historical. No commit/push/deploy is claimed. Prior UI edits preserved.

Compose ManagedAuthRoutes(ManagedStore(DB),firebaseConfig,FirebaseCredentials,AuthEmail(GmailTransport),keithCoursePort,destinationAuthorizer,backgroundDispatcher). index.ts enables mail only with GMAIL_SENDER_EMAIL/GMAIL_APP_PASSWORD/AUTH_MAIL_ENABLED=true; no provider fixture in production. Keith ports are still absent deliberately, so instructor APIs/workspace fail unavailable.

Credential generation now precedes final current instructor/pending recheck. Gmail sends direct app fragments containing code+ticket(+invite), so POST setup/confirm {invite,ticket,code,password} and reset/confirm {ticket,code,password} remain. Public closed SessionView, trusted principal, CSRF/origin/current-provider/revocation and admission boundaries unchanged. One-use ticket/UID/email/purpose/invite-generation/ten-minute TTL, non-expiring pending invitations, no automatic email identity merge or enrollment.0005 invalidates older generated-code proof records only, preserves accounts/sessions/invitations; no0006 hosted-action schema exists.

SMTP connection fixed to Gmail465implicitTLS; validated sender/recipient/subject, base64 plain-text body76cols,15s total deadline, bounded responses, no transcript/credentials logging or automatic retry. Queue receipt only after DATA250; explicit failure vs ambiguous unknown. Real account policies/quota/delivery and hosted lifetime remain gates, not synthetic claims.

[Setup/secrets](../auth/SETUP.md), [verification/manual checklist](../evidence/shared-authentication/gmail/verification.md), [synthetic payloads](../auth/firebase-examples.json), [reusable trusted-session checks](../auth/conformance.ts), [D1/auth tests](../auth/managed.test.ts), [SMTP tests](../auth/gmail.test.ts). Main executed179Vitest+4Node/specs/types/lint/build, local TLS greeting (noauth/mail) and dryrun. Existing auth_review independently inspected source/read-only. Keith's boundary review and producer revision remain pending; supply exact reviewed requireCourse/destination ports/first-instructor authority before integration. No implementation of his services or fabricated memberships.

Actual Gmail auth/NUS inbox, real Firebase chosen password/reset/session denial, hosted Free CPU/background lifetime, full UI/manual acceptance and reviewed staging/release pending. Consumer must pin a committed Gmail revision after separate publication authorization before dependent integration. Shared Firebase project can use both origins; cross-environment account mappings require verified same UID, not implicit email linking.

---

## Password policy follow-up — 2026-11-07

Darryl confirmed an 8-character minimum on2026-11-07 and reports changing Firebase accordingly. The intended policy is8–64 Unicode characters; maximum64 and no truncation remain. This is a documentation update: src/server/auth/firebase.ts and src/web/auth/App.tsx still enforce15, and runtime/test alignment is pending. Firebase console configuration was not independently verified in this request. Task8.2 is pending;179-test results above verify the prior15-character runtime, not the new policy.

## Historical native-mail handoff — superseded by Gmail direct delivery

# Current SH-AUTH handoff — Firebase native email, 2026-11-07

Darryl approved replacement of Brevo with Firebase native password-action email. AUTH-01–03, SHA-01–11, CON-03/07; warm-workbook-v1 UI-01/02/07/08. Keith revised-boundary review is pending. No course/student code or real integration claimed.

Producer is an UNCOMMITTED working-tree revision on codex/shared-authentication based on b169c11b02959ca60191aef1e8dced29941c4968. Native source identity is recorded in [native-email/source-manifest.json](../evidence/shared-authentication/native-email/source-manifest.json); do not consume the old386b681 source manifest as native-mail implementation. No commit/push/deployment authorized by this request. Prior UI clarity edits remain preserved.

- Compose ManagedAuthRoutes(ManagedStore(DB),firebaseConfig,FirebaseCredentials,FirebaseMailer,keithCoursePort,destinationAuthorizer,backgroundDispatcher). The mailer is enabled only when FIREBASE_EMAIL_ACTIONS_READY is true. No Brevo keys. Keith ports remain absent in production; invitation APIs/workspace unavailable.
- Closed SessionView and trusted-session/mutation guards unchanged; no memberships, roles, passwords or Firebase tokens added to DTOs. Require current provider identity and Keith course/object authorization on each protected request.
- POST setup/confirm now requires {invite,ticket,code,password}; reset/confirm {ticket,code,password}. Other current routes below remain. The one-use local ticket hashes into legacy code_hash and binds UID/email/purpose/invite generation/ten-minute TTL; native Firebase code is inspected for PASSWORD_RESET and exact email before mutation.
- Additive0005 invalidates old generated-code actions only; preserves stable accounts/sessions/non-expiring invitations. GET does not consume. Pending old invitation capabilities can request a new setup email. Proof expiry/replay/mismatch/stale generation cannot grant admission. Native setup ends without an authenticated session; explicit sign-in follows.
- /auth/action accepts Firebase query parameters only with supported mode, unique code/continueUrl and exact-origin /sign-in or /auth/reset continuation. It snapshots live Location before clearing query/fragment, never follows arbitrary URLs, and passes code/ticket transiently. No request-URL/proof logging.
- Firebase sends its native password-reset template for both setup and recovery. Queued means provider acknowledgement, not inbox delivery/read.150/day Spark native-email quota is shared across all such sends. Separate Spark projects are needed for simultaneous environment-specific custom action URLs.

[Setup/secrets/manual checklist](../auth/SETUP.md), [synthetic payloads](../auth/firebase-examples.json), [reusable C-ID checks](../auth/conformance.ts), [security/D1/provider tests](../auth/managed.test.ts), [verification](../evidence/shared-authentication/native-email/verification.md). User reports credentials entered in local/staging/production; values were not inspected. Live native-link shape/fragment, email-enumeration response shape, NUS inbox delivery/privacy, real Free capacity, first instructor and Keith course composition, full UI/manual acceptance and staging/release all remain pending. Keith should consume only a pinned committed producer once separately authorized and supply his exact SH-ID revision/review.

---

## Historical Firebase/Brevo handoff — superseded mail protocol

# Current SH-AUTH handoff — Firebase/Brevo revision, 2026-11-06

Darryl owns SH-AUTH; Keith owns SH-ID. AUTH-01–03, SHA-01–10, CON-03/07; warm-workbook-v1 UI-01/02/07/08. Darryl approved Firebase/Brevo and coding before external setup. Neither service account exists yet; no real mail/login/deployment is verified.

Producer: committed revision 386b681cf8b352374e748a329691ac158b1cc132 on codex/shared-authentication, after feasibility batch b62165f. Exact producer files are pinned by Git blob and SHA-256 in [firebase-source-manifest.json](../evidence/shared-authentication/firebase-source-manifest.json). Local checks and live integration limits below remain unchanged; PR8 has not been pushed/updated by this request.

## Consumer contract and ownership

- Compose ManagedAuthRoutes(ManagedStore(DB),firebaseConfig,FirebaseCredentials,BrevoMailer,keithCoursePort,destinationAuthorizer,backgroundDispatcher). Production currently omits Keith's ports deliberately; instructor APIs/workspace are unavailable, with no fixture fallback.
- requireSession returns the existing server-only TrustedPrincipal; public SessionView remains exactly schemaVersion:1,userId,expiresAt. Provider UID/email are never a course role. requireMutationOrigin retains cookie CSRF and exact origin.
- Supply requireCourse(principal,courseId,'instructor-read'|'instructor-write') and DestinationAuthorization.authorize. Course navigation may open /auth/invitations?courseId=<id>; this is untrusted context, always rechecked. No new enrollment endpoint or membership store is implemented.
- POST /api/auth/login {email,password,returnTo?}; POST setup/request {invite}; POST setup/confirm {invite,code,password}; POST reset/request {email}; POST reset/confirm {code,password}. Auth mutations require bootstrap preauth cookie + X-CSRF-Token and exact Origin. Requests are closed, bounded JSON.
- GET bootstrap/session/workspace; POST logout {}; instructor GET invitations?courseId=&after=; POST invitations {courseId,email}; POST invitations/:id/resend|revoke {courseId}. Instructor commands require current authenticated session, CSRF/origin, Keith current authority and trusted inviter scope.
- Reset request returns generic202 {ok:true}, Retry-After90; provider work is deferred with waitUntil. Confirmation requires current one-use local/provider proof; it cannot activate an uninvited/disabled account. Login requires admitted verified UID and stable provider snapshot. Current-provider reset/disable/revocation invalidates opaque cookies too.
- Non-expiring pending invitations are distinct from ten-minute proof expiry. Resend retains audit ID and rotates the bearer; dispatch leases/generation prevent stale action/receipt writes. Lists expose only allowlisted recipient/course/status/send fields, no capability/provider UID. queued is provider acknowledgement, never delivery/read.
- Firebase owns passwords and immutable project/UID credential identity; D1 owns app mapping/sessions/invitation/audit only. Additive0004 preserves0003 and IDs. Existing Google accounts need trusted explicit mapping, not email auto-linking. Local operator bootstrap/map/disable/revoke commands are documented in SETUP.md and grant no roles.

## Verification and reusable checks

[Verification and limitations](../evidence/shared-authentication/firebase-brevo.md), [synthetic payloads](../auth/firebase-examples.json), [reusable C-ID checks](../auth/conformance.ts), [Firebase/D1/security tests](../auth/managed.test.ts), [setup and manual checklist](../auth/SETUP.md). Synthetic payloads are not integration evidence. Independent auth_review inspected provider contracts and security/UI source, found and re-reviewed repairs; actual test execution belongs to main.

Keith: review the revised session-to-course boundary, supply exact SH-ID revision, instructor bootstrap/assignment and destination ports; run shared checks with the real composition. Your review is pending, not inferred from Darryl approval. Darryl: configure Firebase/Brevo and consented NUS verification, complete actual UI/hosted capacity/manual acceptance before claiming integration. No student services, commits/pushes or deployment in this revision.

---

## Historical Google handoff — preserved, superseded target

# Handoff: SH-AUTH / shared-authentication

- Human owner: Darryl. Next consumer/cross-reviewer: Keith (SH-ID).
- Review PR: [draft #8](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/8), opened against main by Darryl's separate publication authorization. Draft status preserves the pending policy/manual/integration gates below.
- Agent work: main implements, one independent read-only `/root/auth_review` reviews security, contracts and UI source. Same inherited model configuration; no parallel writers or recursive delegation.
- Requirements: AUTH-01–03, CON-03/07, SHA-01–07; warm-workbook-v1 UI-01/02/07/08. Existing C-ID remains authoritative.
- Input: reviewed main `2d8a8617f86992c71e7c93facabb822455c6fc70`; matching `codex/shared-authentication` branch reused for continuation. Producer source commit: `1c1174d` (exact file SHA-256 identity in [source-manifest.json](../evidence/shared-authentication/source-manifest.json)). Darryl separately authorized commit/push/PR on 2026-11-06. Merge/deployment remain unauthorized and unperformed.
- Exclusive ownership: recorded SH-AUTH window in Ownership; src/server/auth/, src/web/auth/, src/shared/auth.ts, 0003 authentication migration, minimal root environment/API/frontend/config/package integration and this slice's workflow/docs/log. No Keith student/course/submission implementation, duplicate domain storage, release/CI or generic skill changes.
- Contract/config/operator commands: [producer README](../auth/README.md). Synthetic public [examples](../auth/examples.json); reusable [trusted-session checks](../auth/conformance.ts). Exact closed C-ID session projection unchanged; roles, memberships and provider tokens excluded. Keith supplies destination/course/object authorization; deployed composition deliberately has no substitute.
- Actual verification: [verification](../evidence/shared-authentication/verification.md), [UI review](../evidence/shared-authentication/ui-review.md). Google adapter uses maintained openid-client with signature checks, tested using signed synthetic responses. These are not live Google or deployment results.
- Independent findings repaired: atomic previous-session revocation; first-time invitation retry recovery; essential input contrast; real private-reader conformance; unrelated landing fragments preserved. Focused re-review reported no remaining blocking source findings. Reviewer inspected source/tests and did not independently run tests or live Google.
- Accepted by Darryl: provider, invitation/admin UI, session policy and named implementation window. **Not yet accepted:** final manual feature acceptance; Keith's revised-boundary/C-ID cross-review; real SH-ID producer; real Google client/callback and hosted provisioning; deployment/recovery verification. Do not describe policy approval or review agent clearance as these acceptances.
- Resource checkpoint: member log records provisional attributable usage; detailed recorder data remains outside Git. No optimality/cost claim.

## Keith's concrete next action

Review policy follow-up as well as source: Darryl now requests non-expiring invitations and is considering NUS-only/institutional sign-in. He explicitly deferred implementation; this source still uses Google and 24-hour invitations. NUS provider choice/tenant consent remain unconfirmed. Publishing this draft for review does not accept those policies, close final manual acceptance or authorize dependent integration.

Review account identity/session expiry/revocation and the server-only principal handoff at the source manifest above. Consume `requireSession` + mutation guard and the unchanged SessionView, then implement current course/membership/object authorization in your own slice/store sections. Provide the exact SH-ID revision, deny/foreign/revoked/allowed-context cases and adapter for `DestinationAuthorization`. Run reusable checks with the real composed producer and the existing C-ID conformance suite. An authentication admin is not an instructor; do not infer memberships from email or browser role. Serialize any shared migration/API/schema edits after this window. Your review is pending, not reported as supplied by Darryl's approval.

## Darryl's manual acceptance checklist — pending

- In the labelled local preview, create an invitation; copy then hide its link; refresh and confirm only status remains. Revoke a pending invitation and confirm acknowledged status. No email delivery is implied.
- Open Workspace: signed-in but unavailable until Keith integration. Sign out: session ends and invitation management disappears. Check cancellation/failure instructions and keyboard/focus at your preferred text size, including native 200% zoom.
- Separately configure real Google and test invited matching email, rejected/non-invited account, cancellation/retry, session expiry and logout on the real single-origin app. These live gates cannot be accepted from synthetic tests.

Final manual UI acceptance, live integration and release are separate gates; this change remains unarchived.

## Current owner-bootstrap continuation — 2026-11-07

Darryl implemented optional BOOTSTRAP_OWNER_EMAIL/PASSWORD, singleton0006 state and pinned operator identity through normal guarded login. Current owner source manifest/evidence is workflow/evidence/shared-authentication/owner-bootstrap/ (relative from repository root). Actual local owner now created with Firebase emailVerified:false; local login/session200, admintrue, then successful login after removing temporary local bootstrap settings. No email or staging/production D1 mutation. Real shared Firebase test identity exists; this is distinct from deployed app-owner admission. Global8–64 validation now aligned.

No course permissions are implied. Keith producer is still absent, workspace unavailable; fakealias cannot receive recovery, external credential changes deny pinned owner even after mailbox verification. Bootstrap is not a public default password or self-promotion route. Deploy reviewed0006/code, configure explicit per-environment operator secrets, first sign-in and then remove bootstrap secrets; do not copy local D1/fixtures. Owner/course revised-boundary review by Keith remains pending.

Actual runtime debugging fixed Firebase client defaultfetch binding and unsupported redirect:error. Client uses boundfetch, manualredirect and rejects3xx before parsing. New nativeMiniflare regression covers actualWorkerfetch and no-redirect credential forwarding; defaultNode unit tests alone had missed these incompatibilities.

## Setup reset recovery continuation — 2026-11-08

Darryl owns `src/server/auth/managed-store.ts`, `managed-routes.ts`, additive migration 0012, scoped synthetic auth tests and shared-authentication artifacts on `codex/instructor-assessment-completion`. [Recovery evidence and escalation](../evidence/authentication-reset-recovery/verification.md) describes journalled terminal claims, fresh proof and identity guards, and legacy/unknown locks that remain held. The implementation does not automatically replay resets or infer provider settlement from time, email or invalid codes. Current revision is an uncommitted candidate; live provider, hosted migration, manual acceptance and Keith review remain pending. Next owner: Darryl verifies and accepts the local candidate; Keith reviews the composed boundary.
