# Current authentication setup — 13 November 2026

The active Worker uses **Firebase passwords/proof links and Gmail delivery**, composed with Darryl's course authority. Google/OIDC instructions below are preserved history; do not follow them to configure the current app. Sources: src/server/index.ts, auth/managed-routes.ts, auth/firebase.ts, auth/owner.ts and .dev.vars.example.

1. Copy .dev.vars.example to ignored .dev.vars. Set exact AUTH_ORIGIN=http://127.0.0.1:8787 for local authenticated testing.
2. Supply approved server-only FIREBASE_PROJECT_ID, FIREBASE_API_KEY, FIREBASE_SERVICE_ACCOUNT_EMAIL and FIREBASE_PRIVATE_KEY. Follow the example's PEM formatting. The team must configure its approved Firebase password service; missing configuration fails closed.
3. For real email proof delivery configure GMAIL_SENDER_EMAIL, GMAIL_APP_PASSWORD and explicitly enable AUTH_MAIL_ENABLED only in the approved environment. Never use a normal Gmail password or commit credentials.
4. A fresh local database needs an approved starting owner: set explicit BOOTSTRAP_OWNER_EMAIL and BOOTSTRAP_OWNER_PASSWORD privately, then sign in using them. There are no default credentials. Bootstrap establishes a reserved owner identity, not arbitrary course memberships. Existing accounts use their existing passwords; do not casually reset a shared provider identity.
5. Run npm.cmd run build, npm.cmd run db:local and npm.cmd run dev:api. Open the exact origin above. Eligible users create courses and invite NUS recipients through the app; validated acceptance grants the selected Student/Instructor role. No public registration.
6. Leave SoCLaaS disabled for manual tests. See [Developer Guide](../../docs/DeveloperGuide.md) and [User Guide](../../docs/UserGuide.md). Synthetic previews do not verify Firebase credentials, email delivery or hosted readiness.

No remote provisioning or production migration is performed by this setup. Use reviewed release procedures for hosted changes.

---

## Historical Google/OIDC producer record

# SH-AUTH producer and local operation

Darryl owns this slice (AUTH-01–03, CON-03/07, UI-01/02/07/08; warm-workbook-v1). Keith owns courses, memberships and object authorization. See [handoff](../handoffs/shared-authentication.md) for exact source identity, evidence and pending integration. This directory contains local helpers, never a deployed alternate identity store/provider.

## Approved behavior

Google OIDC code/PKCE-S256/state/nonce, with explicit RSA signature verification using maintained openid-client 6.8.9. New accounts need a 24-hour, single-use invitation matching verified Google email. Mapping is canonical issuer + subject, never email auto-linking. Existing active accounts need no new invitation. An invitation, Google login and authentication administrator status grant no course roles. There is no public registration or instructor self-promotion.

Sessions use 256-bit opaque HttpOnly cookies; only hashes persist. Thirty-minute idle and eight-hour absolute expiry, logout, operator revocation and account disable are server-enforced. Successful sign-in rotates/revokes the browser's previous session atomically; failed sign-in leaves it intact. Codewise logout does not log out Google. Pending invites are independently valid until accepted, expired or explicitly revoked; removing an administrator does not silently invalidate invitations they previously created.

## Runtime and adapter contract

- Existing closed `sessionViewSchema` remains `{schemaVersion:1,userId,expiresAt}`; expiry is the earlier idle/absolute boundary at lookup. No roles or provider tokens enter it.
- `AuthRoutes.requireSession(request)` resolves the cookie against current D1 and returns a **server-only** `{principal,session,token}`; compose only `principal` into Keith's methods. The raw `token` is for the auth transport implementation, never a response/log/consumer DTO. Principal is `{userId,sessionHandle}` with the existing TrustedPrincipal brand; the internal handle is not a login bearer. Call requireSession per request, not once at sign-in.
- `AuthRoutes.requireMutationOrigin(request)` enforces configured exact Origin, active session and session-bound `X-CSRF-Token`. Keith must still check current object/course authority through existing C-ID methods before reads/writes. Never replace missing checks with permit defaults.
- `composeIdentityCourse(auth, keith)` supplies the existing IdentityCoursePort by forwarding those two authentication methods and Keith's required `requireCourse`/`requireObject`. No authorization implementation is supplied or defaulted by Darryl.
- `DestinationAuthorization.authorize(principal,destination)` is the injected Keith boundary for workspace returns. It must validate current allowed context plus every requested object/course. Missing producer yields `{state:'unavailable',destination:null}`. This is the deployed default. Authorization failure never returns a destination or private data. Approved destination allowlist is `/workspace` or `/instructor/assignments/<ASCII id>`; queries/fragments/encoding/external URLs/backslashes are rejected. Destination authorization does not replace authorization on the destination's own requests.
- UI-only schemas live in `src/shared/auth.ts`; they do not widen C-ID. `administrator` controls presentation only. D1 rechecks current administrator/account/session authority for invitation operations.

Routes: GET `/api/auth/bootstrap` supplies configured state and pre-auth CSRF; POST `/api/auth/login` accepts only optional invite + returnTo; GET callback consumes a browser-bound ten-minute transaction once and always redirects to clean `/auth/finish` or fixed failure/cancellation notice. GET `/session` returns `{session,email,administrator,csrfToken}`. POST `/logout` takes `{}`. GET `/invitations?after=<cursor>` returns at most 50 status-only records. POST `/invitations` takes `{email}` and returns `{invitation,url}` once; POST `/invitations/:id/revoke` takes `{}`. GET `/workspace` returns only unavailable/authorized destination. All paths above are relative to `/api/auth`; no CORS grants. Mutations require JSON, exact Origin and CSRF. No application feature routes are enabled by this change.

Invitation links use `/sign-in#invite=<capability>`. Only the sign-in page removes the fragment into memory and POSTs it; GET/link scanning does not redeem it. No local/session storage. Copy the new link before leaving; only its hash persists. After cancelled/failed first-time Google login, reopen the original invitation link; a plain retry cannot recover the in-memory capability. URLs, tokens, private provider errors and raw IPs are not logged. Auth pages/API are no-store/no-referrer. Fixed-window admission limits login starts and admin invitation creation; hashed expired transaction/session/rate rows are cleaned in bounded batches on admitted login starts. Account/invitation audit retention is not silently purged.

## Real local Google setup — not executed here

1. Configure an approved Google Web OAuth client, consent screen/test users as applicable, and exact redirect `http://127.0.0.1:8787/api/auth/callback`. Google consent-screen test users and Codewise invitations are separate controls. Hosted origins need their own approved exact HTTPS callbacks and isolated credentials/config.
2. Copy `.dev.vars.example` to ignored `.dev.vars`. Set AUTH_ORIGIN to the exact single browser origin, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET directly in that file. Never use VITE-prefixed secrets, commit credentials or paste them into logs/chat. Missing/invalid config disables sign-in honestly. HTTPS is required outside explicit loopback development.
3. Run `npm run build`, `npm run db:local`, then `npm run dev:api`; open `http://127.0.0.1:8787/sign-in`. This single-origin path avoids the separate Vite proxy's different browser origin. Do not use the synthetic preview as proof of Google setup.
4. `npm run auth:local -- invite your-google-email@example.test` creates the first local invitation. CLI prints its link suffix once; append to the configured origin and open it privately. Sign in with that verified Google email.
5. `npm run auth:local -- accounts` lists existing verified local account mappings. `npm run auth:local -- grant-admin <account-id> <verified-subject>` grants authentication administration only. Inspect affected rows and refresh your session; never grant based on an email alone. No account can be created by this grant command.
6. Use `/auth/invitations` to create/copy/list/revoke invitations. Send links manually; the app does not send email. Other operator commands: `revoke-admin`, `revoke-sessions`, `disable`, each with account ID + verified subject. Disable has no automatic invite reactivation path.

Operator helper is deliberately fixed to **LOCAL codewise-development**, refuses arbitrary targets/remote flags, and leaves secret-free SQL only in temporary external files during execution. Hosted bootstrap/revocation requires separately authorized reviewed operator/release procedures; no remote provisioning or production migration was run. Deploy through reviewed staging/release workflow only. Live provider setup, hosted bootstrap and recovery must be verified before release, not ticked from local fixtures.

## Isolated verification

`npx vitest run workflow/auth` runs actual local D1, signed synthetic Google transport, cookie/origin/CSRF, callback replay/cancel, invitation/identity races, expiry/disable/revocation/rotation, restart and reusable `trustedSessionChecks` with actual SH-AUTH plus explicitly synthetic Keith authorization. `examples.json` contains synthetic public DTOs; tests generate all bearer capabilities at runtime. Raw credentials/invite links are never fixture files.

`npm run dev:auth` opens a loopback-only ephemeral-D1 preview at `http://127.0.0.1:5176/workflow/auth/preview.html`. Its explicit **Open synthetic administrator session** button is only for invitation/workspace/logout UI checks. Every page carries a synthetic banner. Normal Google sign-in success is **not** provided by this preview: the production UI retains its strict Google-origin guard. Use signed protocol/route tests for simulated success and actual configured Google for live browser success. Preview state disappears on server restart. No preview module is imported into the production Worker or frontend build.

## Current Firebase native email revision

The Google-only instructions above are historical. Follow [SETUP.md](SETUP.md) for current native-email configuration (superseding old Google/Brevo instructions), trusted local bootstrap/mapping, synthetic preview and pending real integration. The deployed composition uses FirebaseCredentials + FirebaseMailer + ManagedAuthRoutes. The previous Google implementation remains for regression/history but is not composed into the Worker. Keys alone do not supply Keith course authorization.

## Current Gmail transport (supersedes native-mail/SMTP2GO setup)

Follow SETUP.md. Production composes FirebaseCredentials + AuthEmail + GmailTransport, with GMAIL_SENDER_EMAIL/GMAIL_APP_PASSWORD and AUTH_MAIL_ENABLED. Firebase generates proof only; email links open app password forms directly. No template URL edit/new project or hosted password screen. Reusable C-ID boundary and missing Keith behavior unchanged. No real delivery/deployment verified.

## Persistent first operator owner

See SETUP.md one-time operator owner. BOOTSTRAP_OWNER_EMAIL/PASSWORD authorize first admission through guarded sign-in after reviewed0006. No default credentials or course rights. Completed marker plus provider credential pins persist after bootstrap secrets are removed. Actual local owner created/verified; production admission remains pending. Fakealias is unverified and external resets invalidate pinned authority. Codewise forms/server now use8–64.
