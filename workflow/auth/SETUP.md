# Firebase passwords and Gmail delivery — current setup

Darryl owns SH-AUTH. Users choose, reset and enter passwords inside Codewise; Firebase performs secure credential handling behind the scenes. Gmail sends instructor invitations and recovery emails directly to the app. Brevo/SMTP2GO/native Firebase mail are not composed. No Firebase email-template edit or new Firebase project is required. Actual delivery/integration/manual acceptance is pending; local tests are not production verification.

## Current password policy — 2026-11-07

The app and server now enforce8–64 Unicode characters, matching Darryl's revised policy. Actual Firebase policy is user-reported and remains a live check; previous15-character evidence is historical. No silent truncation.

## 1. Create the Gmail app password

Use a personal Gmail account you control. Enable Google Account > Security > 2-Step Verification, then open https://myaccount.google.com/apppasswords. Create an app password named Codewise. Google displays a16-character password: remove grouping spaces. Keep it private, not in chat or Git. Use this app password, never your ordinary Google password. Some managed/Advanced Protection/security-key-only accounts do not offer app passwords. Google revokes app passwords when the account password changes; replace the Worker secret after that event. A dedicated sender account is preferable when available; the app password is a Google-account credential, not a restricted SMTP2GO send-only API key.

## 2. Local settings

In ignored .dev.vars preserve the existing Firebase settings and add:

    GMAIL_SENDER_EMAIL=your-address@gmail.com
    GMAIL_APP_PASSWORD=your16characterapppassword
    AUTH_MAIL_ENABLED=false

The example above names the settings, not a valid app password. Set AUTH_MAIL_ENABLED=true only when ready to send a consented real staging/local test. The sender must be a gmail.com or googlemail.com address owned by the app-password account. The code fixes smtp.gmail.com:465 with implicit TLS; no host/port/certificate override or plaintext fallback.

Retain:

    AUTH_ORIGIN=http://127.0.0.1:8787
    FIREBASE_PROJECT_ID=your-existing-project-id
    FIREBASE_API_KEY=that-project-web-api-key
    FIREBASE_SERVICE_ACCOUNT_EMAIL=dedicated-server-account-email
    FIREBASE_PRIVATE_KEY="complete PKCS8 PEM with escaped newline sequences"

Use the matching project/key/service-account set, preserving the exact Project ID even if named codewise-staging. Server role needs firebaseauth.users.create/get/update/sendEmail for existing password/proof operations. Firebase Authentication Email/Password enabled, enforced password policy8–64 and email-enumeration protection. No public app signup, NUS password collection or instructor self-promotion. Keys never have VITE_ prefix.

## 3. Cloudflare staging

Cloudflare > Workers & Pages > codewise-staging > Settings > Variables and Secrets > Add > Secret. Add GMAIL_SENDER_EMAIL, GMAIL_APP_PASSWORD and AUTH_MAIL_ENABLED (initially false); keep the five existing Firebase/origin entries. Select Production for that named Worker's normal deployment, not Previews. The two checkbox options do not copy between our two named Workers.

AUTH_ORIGIN must be exactly:

    https://codewise-staging.codewise-cs3227-2610.workers.dev

Runtime Secrets persist through Wrangler releases; local .dev.vars is not uploaded by GitHub. Ordinary dashboard variables may be overwritten by repository configuration. Cloudflare's Deploy button applies config immediately; do staging first. When the reviewed code/migrations reach staging, and a consented recipient plus reviewed Keith authority/first instructor are available, set AUTH_MAIL_ENABLED=true for the actual delivery test.

## 4. Cloudflare production

Repeat the same three Gmail runtime Secrets in codewise-production using its existing Firebase settings. Production AUTH_ORIGIN must be exactly:

    https://codewise-production.codewise-cs3227-2610.workers.dev

Enable AUTH_MAIL_ENABLED=true during the approved production release only after staging succeeds. This is different from GitHub's CLOUDFLARE_API_TOKEN/ACCOUNT_ID deployment credentials. No ad hoc production migration/deploy command: use the existing reviewed GitHub Actions release, staging smoke and production approval. This guide does not authorize or establish deployment success.

FIREBASE_EMAIL_ACTIONS_READY, SMTP2GO_API_KEY/SMTP2GO_SENDER_EMAIL/SMTP2GO_AUTH_LINKS_VERIFIED and BREVO_API_KEY/BREVO_SENDER_EMAIL/BREVO_AUTH_LINKS_VERIFIED are not read by the current composition. They can be removed without changing Firebase credential settings. Do not keep toggling these old flags or editing the locked Firebase template URL.

## 5. Firebase configuration and environment identity

The generated-link API returns a PASSWORD_RESET proof server-side; the app extracts its code and builds its own direct Codewise URL. Gmail delivers that URL; Firebase sends no native email. Therefore the account's EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED error is no longer on the send path. No custom action URL, Firebase-hosted password screen or separate Firebase project is required for this transport. Existing authorized domains can remain.

One Firebase project can serve both app origins; per-environment origins build the correct links. D1 staging and production remain separate. A person tested in both must have an explicitly verified account mapping to the same Firebase UID; do not auto-link by email or create a second Firebase UID on collision. The first-instructor/migration handoff below is still required, and tested staging accounts must not be copied to production blindly. Separate projects remain an optional isolation choice, not a requirement to unlock email.

## 6. Verification and limits

Run npm run build and npm run db:local, then npm run dev:api for local real-provider use at127.0.0.1:8787. Port5176 dev:auth is explicitly synthetic, captures mail and sends nothing real. Do not use real passwords in the synthetic preview.

Local Worker TLS greeting from Gmail passed without authentication or email. Synthetic SMTP tests cover secure connection sequencing, command/header injection, message encoding/line limits, explicit rejection, missing acknowledgement, bounded parser/timeout and no post-deadline commands. They do not prove Gmail authentication, NUS inbox delivery, hosted Free CPU or complete recovery waitUntil lifetime.

Gmail is available without a paid email-provider subscription but has sending/abuse limits; Google documents possible blocking above500 emails/day. Do not treat that as a delivery guarantee. Firebase generated-reset-link Spark allowance is1500/day (different from native reset-email150/day); actual quota/permissions/provider behavior must be verified. SMTP final DATA250 means queue acceptance, not delivery/read. Timeouts/disconnects are unknown with no automatic resend. Proof/email bodies, passwords, SMTP transcripts and tokens are never logged. Gmail will retain normal sent-mail data as part of account operation; verify actual provider privacy with the sender account.

## One-time operator owner (current first-account path)

Configure two optional server secrets, with no shipped default values:

    BOOTSTRAP_OWNER_EMAIL=your-selected-NUS-format-login-alias
    BOOTSTRAP_OWNER_PASSWORD=your-selected-8-to-64-character-password

Locally use ignored .dev.vars. In staging/production use each named Worker's runtime Secrets after the reviewed0006_owner_bootstrap migration/code release. No production SQL or deployment is performed by local bootstrap. Then open /sign-in at that environment and enter those configured credentials. Normal origin/preauthCSRF/rate checks run before bootstrap. No separate public setup/register route or browser admin flag.

First correct sign-in creates a stable Firebase identity (unverified email), admits exactly one account through the existing store and records completion/auth administration in D1. Subsequent deployments/restarts retain this identity. Remove the two bootstrap settings after successful completion if desired; ordinary owner sign-in still works against the pinned identity. Changing/re-adding settings never recreates, resets or reactivates completed owner state. Do not copy the synthetic5176 fixture to production. Existing/shared Firebase email collisions fail closed; operator provisioning never overwrites another UID/password.

Darryl explicitly selected an invented NUS-format alias for local owner testing. It is a login alias, not an asserted verified mailbox. Codewise does not send owner recovery emails. Firebase's external reset capability is not claimed disabled: any owner provider password/revocation change blocks owner authority via immutable credential pins, even if the mailbox becomes verified. Explicit trusted operator recovery/rotation is required after that event; it is not implemented as an automatic bootstrap fallback. There is no hidden universal login.

The owner is labelled Account admin, not automatically an instructor. Keith's current course/object authorization still gates invitations and protected destinations. Missing Keith producer gives unavailable/503; this bootstrap cannot make a real course or fabricate membership. A user with no membership can sign in but cannot send course invitations yet.

Localreal-provider /sign-in uses configured Firebase and persistent local D1; Gmail can send actual consented messages once enabled, with no merge required. The5176preview remains synthetic and never sends real email. Production needs the reviewed release, its own D1 singleton/configuration and first sign-in; local owner rows are not uploaded. Shared Firebase project/alias uses the same reservedUID, but app owner completion is separate per environment.

## Historical verified-mailbox operator helpers



The first operator must independently verify the Firebase project's UID, email and verified/active status before bootstrapping the app account. The local-only operator can create a mapping:

    npm run auth:local -- bootstrap-firebase <project-id> <verified-uid> <eligible-NUS-email>

This command targets only LOCAL codewise-development, never remote/production. It grants no administrator, instructor or course role. Keith must independently assign authoritative course permissions and supply his reviewed producer. Student eligibility remains the approved exact u.nus.edu/u.duke.nus.edu/u.yale-nus.edu.sg allowlist; staff domains require an explicit policy change, not an invisible bootstrap exception.

For an existing Google account, inventory and verify both identities first. Explicit local mapping preserves the existing Codewise account ID:

    npm run auth:local -- map-firebase <project-id> <verified-firebase-uid> <existing-account-id> <verified-old-Google-subject>

There is no automatic email-based migration. Mapping revokes old local sessions. Legacy Google operator commands remain historical compatibility helpers; grant-admin does not enable instructor operations. Remote/staging/production account cutover requires its own reviewed operational process; do not run ad hoc production SQL.

## Keith integration dependency

The deployed Worker deliberately has no default course producer. Keys alone will not enable instructor sends or course workspaces. Compose ManagedAuthRoutes with Keith's requireCourse adapter and destination authorizer once his exact revision is reviewed. Course navigation opens /auth/invitations?courseId=<id>; this is presentation context, not authority. All server operations recheck current permission and inviter ownership.

## Synthetic preview before keys

    npm run dev:auth

Open http://127.0.0.1:5176/workflow/auth/preview.html. Use its explicit synthetic-instructor button, an invented @u.nus.edu recipient and the synthetic mailbox. Emails are captured locally; no Firebase/Gmail call occurs. Invented identities/passwords and isolated D1 disappear when the server stops. Never use real passwords or learner data in this preview.

## Live acceptance checklist — all pending

- Configured Firebase and Gmail app-password accounts, least-privilege Firebase permissions, password policy, direct generated proof links, sender/link privacy, SMTP connectivity and actual quotas.
- Real trusted first-instructor identity plus Keith current course authorization; revoked and other-instructor denial.
- Consented NUS inbox: invitation, password setup, explicit password login/logout, recovery, old-password/old-cookie denial and fresh login.
- Delayed invitation renewal, expired/replayed proof, disabled identity, mail timeout and safe unavailable states.
- Workers Free CPU/latency/dispatch-lifetime measurements with real provider calls; no assumption that local crypto/network tests prove hosted capacity.
- Actual UI matrix, manual acceptance, Keith revised-boundary review and reviewed staging deployment. Nothing in this guide completes these tasks.

Provider documentation: [Firebase generated links](https://firebase.google.com/docs/auth/admin/email-action-links), [Firebase quotas](https://firebase.google.com/docs/auth/limits), [Google app passwords](https://support.google.com/accounts/answer/185833), [Gmail SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp), [Cloudflare TLS sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/), [Gmail sending limits](https://support.google.com/mail/answer/22839).

Firebase local incident operations use explicit project, verified UID and account ID:

    npm run auth:local -- revoke-firebase-sessions <project-id> <verified-uid> <account-id>
    npm run auth:local -- disable-firebase <project-id> <verified-uid> <account-id>

These affect only the LOCAL Codewise account/sessions. They do not change Firebase, course roles or remote environments. A provider-side disable/revoke/reset must also be reflected by the current-provider checks. Legacy Google-only disable/revoke commands do not target Firebase identities.
