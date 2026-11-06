# Firebase native email replacement — local verification, 2026-11-07

Darryl/SH-AUTH; codex/shared-authentication based on b169c11b02959ca60191aef1e8dced29941c4968. AUTH-01–03, SHA-01–11, CON-03/07; UI-01/02/07/08 warm-workbook-v1. Working tree includes previously approved uncommitted UI clarity changes; none discarded. No commit/push/deployment/live email performed. User-reported credentials were not opened or verified.

## Actual checks

- npm run check: strict OpenSpec6 passed; typecheck/lint passed;173 Vitest tests across9 files and4 Node deployment checks passed; Vite build passed242.93kB JS/gzip76.24,10.49kB CSS/gzip2.73. Final run includes27 managed-auth tests (four new tests: native handler validation, live Location mutation regression, native send contract and mailbox/ticket mismatch).
- Initial focused suite22/23: a leftover old Brevo class reference in a test failed, repaired; next focused suite26/26 passed. Full final suite includes the independent-review regression. No failures hidden.
- Worker dry run:59.94KiB/gzip14.57, exit0. Local output filtered to package/dry-run status so no settings displayed. No deploy.
- Gitleaks8.24.2: source-export scan passed/no leaks. Export is git tracked and nonignored untracked files, excluding missing/deleted files. Ignored credentials/Git history not scanned, no allowlist added.
- Browser synthetic smoke at127.0.0.1:5176: native-style /auth/action query opened Create your password and cleaned URL to /sign-in; external continueUrl became /auth/reset with invalid-link/recovery state. No password entered, no mailbox/provider call. Screenshots setup-browser.jpg and invalid-browser.jpg. Initial preview connection refused because process was stopped; started loopback synthetic preview and verified. No real inbox simulated as integration.

## Independent review

Reused /root/auth_review read-only for independent security judgment; no parallel writer/new agent. It found P1: clearing history mutates live window.location before query parsing, invalidating real emailed links. Main snapshots search/origin/path/hash before cleanup and added a regression whose callback mutates the supplied location. Focused re-review confirms blocker resolved; no additional confirmed privilege/proof defect. Reviewer inspected source/tests, did not execute checks or live provider calls. Main executed checks above.

## Pending live acceptance

Firebase custom /auth/action URL and authorized hostname(s), native link shape and preserved nested fragment, acknowledgement shape with enumeration protection, actual sender/NUS inbox/privacy/provider abuse controls/quota, hosted Free CPU/background lifetime, first instructor and real Keith course/destination integration, full UI matrix/manual acceptance and reviewed staging/production release are UNVERIFIED. Native password-reset sending uses150/day Spark quota shared by setup/invites/recovery. Separate Firebase projects are needed for simultaneous custom action origins. No source test proves these external behaviors.

## Manual checklist

1. Configure matching Firebase project/keys/action handler/domains and FIREBASE_EMAIL_ACTIONS_READY (SETUP.md).
2. With reviewed Keith current instructor/course authority, send invite to consented NUS inbox; confirm native link shows password setup/clean URL, save then explicitly sign in. Course enrollment is separate.
3. Check own-invite status, denied/foreign/revoked instructor and revoked/rotated/expired/replayed/mismatched proof behavior.
4. Request recovery, choose replacement password, confirm old password/cookie rejected and fresh login works; generic unknown/disabled requests, mail fault/cooldown and safe unavailable workspace.
5. Native email beyond local10min retains invitation renewal; new setup email works. Verify inbox/link privacy and real quota/CPU limits. Obtain Darryl manual acceptance/Keith revised-boundary review separately.

## Actual console configuration attempt — 2026-11-07

User requested production setup as well. Authenticated Firebase console shows both real staging/production Worker hostnames already authorized. Attempted production custom action URL through UI; actual HTTP400 response EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED / INVALID_ARGUMENT. Cancelled editor after rejection, original Firebase-hosted URL verified unchanged. This is a real provider configuration blocker, superseding any assumption that documented customization is available to this account. Cloudflare dashboard required login; no secrets/configuration changed. Public production health retrieval also unavailable, so no deployment status inferred. No live mail, passwords, keys, broad IAM permissions, provider purchases or support messages. Redacted error only in production-configuration-blocker.json.
