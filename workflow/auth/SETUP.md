# Firebase and Brevo setup (pending live integration)

Darryl owns SH-AUTH. Neither provider account is configured yet. The application is coded against real REST adapters and tested with injected synthetic transports; this is not a live login/delivery claim. Do not paste secrets into chat.

## Local configuration

1. Create a Firebase project on Spark (no billing upgrade required for the selected authentication APIs). Enable Email/Password in Authentication. Set enforced password minimum 15 and maximum 64, and enable email-enumeration protection. Do not enable public application registration or optional SMS/billing products.
2. Register the project's web app to obtain its project ID and Web API key. Add the actual app domains/approved URLs in Authentication settings. Our custom handlers are /sign-in and /auth/reset; the server generates Firebase reset proofs and constructs its own same-origin links. No Google sign-in account is required of students.
3. Create a dedicated server service account with only authentication user create/get/update/sendEmail permissions needed by the adapter. Generate its credential privately. Put the service-account email and PKCS8 private key in ignored .dev.vars. Keep the JSON/key outside the repository; the browser never receives it. Firebase email uniqueness is provider-owned; do not delete unknown existing users to resolve conflicts.
4. Create a Brevo Free account, complete sending/account approval and verify a sender address you control. Configure its API key and sender in .dev.vars. A NUS recipient does not require or permit sending as NUS. Existing free-provider terms/quotas and sender restrictions must be checked on your actual account.
5. Inspect an actual test message before setting BREVO_AUTH_LINKS_VERIFIED=true: proof links must not be rewritten/tracked or leak into analytics, messages must reach a consented NUS inbox, and sender identity must be accurate. This is an explicit live-configuration gate; no invented per-message tracking-disable header is used. Brevo tracking anonymization does not mean tracking is disabled. If account settings cannot satisfy this, report the blocker before enabling live sends.
6. Copy .dev.vars.example to .dev.vars and fill AUTH_ORIGIN, FIREBASE_PROJECT_ID, FIREBASE_API_KEY, FIREBASE_SERVICE_ACCOUNT_EMAIL, FIREBASE_PRIVATE_KEY, BREVO_API_KEY and BREVO_SENDER_EMAIL. Keep the PEM as one quoted value with escaped newline sequences. Never use VITE_ secret names. There is no Supabase or SendGrid configuration in the new deployed composition.
7. Build, apply development migrations locally and run the Worker locally. For simplest same-origin testing use the built app at http://127.0.0.1:8787 and set AUTH_ORIGIN to that exact origin. The ordinary Vite proxy origin differs unless deliberately configured; a mismatched origin must be rejected, not bypassed. Deployed secrets belong in Cloudflare's environment secret settings, not .env files committed to Git.

## Trusted first instructor and existing data

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

Open http://127.0.0.1:5176/workflow/auth/preview.html. Use its explicit synthetic-instructor button, an invented @u.nus.edu recipient and the synthetic mailbox. Emails are captured locally; no Firebase/Brevo call occurs. Invented identities/passwords and isolated D1 disappear when the server stops. Never use real passwords or learner data in this preview.

## Live acceptance checklist — all pending

- Approved Firebase/Brevo accounts, least-privilege credentials, password/action/domain configuration, sender/link privacy and confirmed actual quotas.
- Real trusted first-instructor identity plus Keith current course authorization; revoked and other-instructor denial.
- Consented NUS inbox: invitation, password setup, explicit password login/logout, recovery, old-password/old-cookie denial and fresh login.
- Delayed invitation renewal, expired/replayed proof, disabled identity, mail timeout and safe unavailable states.
- Workers Free CPU/latency/dispatch-lifetime measurements with real provider calls; no assumption that local crypto/network tests prove hosted capacity.
- Actual UI matrix, manual acceptance, Keith revised-boundary review and reviewed staging deployment. Nothing in this guide completes these tasks.

Provider documentation: [Firebase REST](https://firebase.google.com/docs/reference/rest/auth), [link generation](https://firebase.google.com/docs/auth/admin/email-action-links), [quotas](https://firebase.google.com/docs/auth/limits), [Brevo transactional API](https://developers.brevo.com/reference/send-transac-email).

Firebase local incident operations use explicit project, verified UID and account ID:

    npm run auth:local -- revoke-firebase-sessions <project-id> <verified-uid> <account-id>
    npm run auth:local -- disable-firebase <project-id> <verified-uid> <account-id>

These affect only the LOCAL Codewise account/sessions. They do not change Firebase, course roles or remote environments. A provider-side disable/revoke/reset must also be reflected by the current-provider checks. Legacy Google-only disable/revoke commands do not target Firebase identities.
