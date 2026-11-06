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
