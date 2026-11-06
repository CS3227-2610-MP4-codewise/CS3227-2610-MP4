# Gmail direct delivery verification — 2026-11-07

Darryl SH-AUTH, codex/shared-authentication based on b169c11b02959ca60191aef1e8dced29941c4968. AUTH-01–03 SHA-01–11 CON-03/07 UI-01/02/07/08 warm-workbook-v1. Uncommitted working tree; prior UI clarity changes preserved. No account/password created, real Gmail auth/email, credentials inspection, deployment/migration/commit/push. User manually sets up the app password.

## Current behavior

FirebaseCredentials.action generates a Firebase PASSWORD_RESET link server-side and extracts only its code. Existing managed routes bind their local one-use ten-minute ticket and intended invitation/UID/email/purpose/generation, build a direct Codewise proof fragment, then recheck current instructor/pending authority before dispatch. Gmail delivers a plain-text app URL; users choose/reset/login inside Codewise. No native Firebase mail/custom template URL, hosted password page, SMTP2GO adapter or another provider account.

AuthEmail is transport-independent; GmailTransport uses fixed smtp.gmail.com465 implicitTLS, certificate validation,15s total deadline, one connection/message/recipient, ASCII envelope/subject bounds and UTF8 base64 MIME76cols. SMTP responses bounded64KiB total/32multilines/1024charline. AUTH after TLS opened/banner/EHLO. Expired operation cannot send later commands. Explicit SMTP rejection failed; uncertain connection/DATA/parser/timeout unknown; final DATA250 queued, not inbox delivery. No automatic retries/transcript logs. GMAIL_SENDER_EMAIL/GMAIL_APP_PASSWORD/AUTH_MAIL_ENABLED are the new settings; existing Firebase/origin retained.

## Executed checks

- npm run check passed:6 strict OpenSpec changes, types, lint,179 Vitest tests/10 files,4 Node deployment checks and Vite build. JS242.93kB/gzip76.24; CSS10.49kB/gzip2.73. Focused auth+Gmail tests32/32 before additional reviewer-requested late-connect/stalled-AUTH case; final suite includes7 SMTP tests and26 managed-auth tests.
- Synthetic socket tests assert exact SMTP commands, one message, correct authentication/MIME, injected headers/envelope/body and longline protection, auth/recipient/DATA rejection, disconnect without retry, malformed/mixed/oversized replies, stalledEHLO/opened/connect/AUTH and cleanup/no post-deadline credential/DATA writes. No real credentials.
- Local native Miniflare Worker connected smtp.gmail.com465 with secureTransport:on and read220 greeting. Result tlsGreeting:true,authenticated:false,emailSent:false. No real message or provider login. This proves local Worker socket capability/reachability, not deployed egress or Gmail account acceptance.
- Worker dryrun passed66.65KiB/gzip16.47, exit0; no deployment. Output filtered to bundle status, no local configuration shown.
- Secret scan result recorded after source manifest; ignores local credential files and Git history, no new allowlist.

## Independent review

Reused read-only /root/auth_review, no new agent/parallel edits. Source review found no blocker in fixedTLS/proof/encoding/bounds/deadline/receipt flow. Reviewer suggested delayed-connect and stalled-AUTH cases; main added and ran them in final full suite. Reviewer did not run tests or real account operations. Design-only hosted-widget review from earlier was rejected by user and is not this implementation.

## Actual pending integration gates

Actual Google app-password availability/auth, sender/NUS inbox delivery/privacy, Firebase generated-action permissions/response, real chosen-password/login/reset/old-cookie denial, hosted Workers Free CPU and recovery waitUntil30s background lifetime, verified first instructor and real Keith course/destination ports, Keith revised-boundary review, full UI/manual acceptance and staging/release remain unverified. Missing Keith producer still denies instructor mail/list/protected workspaces. Native-template restriction was actually observed but is no longer a dependency of this send path.

## Manual checklist

1. Add GMAIL_SENDER_EMAIL/GMAIL_APP_PASSWORD to local and both named Cloudflare Worker runtime Secrets; retain matching Firebase/origin settings. AUTH_MAIL_ENABLED=false until ready to run a consented real staging test. Existing Google app password, not ordinary password; no chat/Git secrets.
2. Release reviewed code/migrations to staging using existing workflow; supply verified first-instructor identity and Keith current course/destination adapters. Enable staging AUTH_MAIL_ENABLED=true for a consented recipient.
3. Invite intended NUS address; open direct Codewise link, choose password in app, explicitly login/logout; inspect own-invite status and reject denied/foreign/revoked instructor, rotated/expired/replayed/mismatched proofs. No course enrollment from invitation.
4. Recover password in app; old password/cookie denied, new explicit login works. Check genericunknown/disabled response, SMTPfailure/cooldown and no default workspace membership.
5. Verify actual inbox/privacy, total background lifetime/FreeCPU and account/quota behavior. Accept staging manually, approve production release and configure production origin/flag. Report success only from real evidence.

Final source-export Gitleaks8.24.2 scan passed with no leaks/new allowlist; source manifest pins current uncommitted Gmail implementation. Focused reviewer return confirmed delayed-connect/AUTH tests and no new blocker; no live provider authentication/delivery inferred.
