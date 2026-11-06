# Firebase/Brevo candidate verification — 2026-11-06

Human owner Darryl; matching codex/shared-authentication, reviewed base2d8a861, HEAD e3a49bf preserved. Committed producer 386b681cf8b352374e748a329691ac158b1cc132; see firebase-source-manifest.json. AUTH-01–03, SHA-01–10, CON-03/07; warm-workbook-v1 UI-01/02/07/08. This supersedes the Google target, not its historical evidence.

## Actual checks

- PASS npm run check: six strict OpenSpec changes, TypeScript, ESLint,169 Vitest tests in9 files,4 Node deployment-boundary checks, production build. Final app build242.01kB/gzip75.58kB JS and6.56kB/gzip1.97kB CSS.
- Managed auth suite23 tests includes actual isolated local D1 migrations0003+0004; injected synthetic Firebase/Brevo and course adapters. Tests cover signup/login/reset, external provider change/disable/unavailability, old-password/reset interleave, admission lifetime/proof replay/concurrency, role/origin/domain denial, missing/other instructor, predispatch revocation, lease/generation fencing, email acknowledgement semantics, explicit operator bootstrap/disable and legacy ID mapping, closed payloads and reusable trusted-session C-ID checks. A focused rerun after extending the operator mapping assertions is recorded separately below; no new application change after the full check.
- PASS Worker dry-run (no publish):60.85KiB/gzip14.93KiB, configured DB/assets/environment bindings. No fixture/default course adapter composed.
- PASS existing verified Gitleaks8.24.2 source-export scan, --no-git --redact --exit-code1: ~1.30MB, no leaks, no exceptions/allowlist added. Ignored secrets/dependencies and Git history excluded; final documentation/export recheck follows.
- Browser observation on loopback synthetic preview: explicit invented-instructor entry → scoped invitation screen → captured invitation queued/pending → synthetic mailbox → password-creation screen. Token fragments disappeared from address bar; labels and fresh-setup action present. Narrow dark workbook inspected visually. No real password or external email entered; full responsive/keyboard/zoom/appearance matrix not completed.

## Independent review and repairs

One reused read-only /root/auth_review investigated official Firebase/Brevo contracts and reviewed source across focused turns; no parallel edits or recursive delegation. Main executed tests and evaluated findings.

1. Old-password login racing reset: capture provider snapshot before authentication, compare after, recheck before exposing cookie.
2. Revocation/reinvitation lifecycle: reuse trusted prior reserved UID only, no arbitrary email-based linking.
3. Reset enumeration by provider/mail latency: generic admission plus injected waitUntil background dispatch; tests prove response precedes provider/mail work.
4. Ordinary page fragments: restrict extraction to authentication routes; preserve home anchors.
5. Expired setup same-document navigation: direct fresh-email action instead of ineffective hash navigation.
6. Permission/invitation revoked during provider awaits: final current-session/course and pending-token check immediately before send.
7. Overlapping generation/receipt races: reassessed async design;120s dispatch lease, atomic generation trigger/proof fence and generation-scoped receipts, with controlled-race tests.
8. Local operator gap: explicit Firebase project/UID/account selectors for disable/revoke plus setup guide, verified in real isolated D1; no roles granted.

Reviewer confirmed the dispatch repairs in source and identified the final operator gap; main added/tested that focused correction. Review is evidence, not proof of live provider correctness.

## Remaining gates

Neither Firebase nor Brevo account/key/sender exists yet. No real NUS delivery, Firebase login/reset, actual provider permissions/password policy/quota, Brevo proof-link tracking configuration, background lifetime or hosted Workers Free CPU/concurrency has been verified. The mail adapter is disabled until configured and link privacy checked. Firebase Spark direct signup may still exist; unsolicited provider UIDs gain no Codewise admission.

Keith producer, trusted first-instructor role assignment, composed C-ID/destination authorization and his revised-boundary review remain pending. Production intentionally exposes no usable instructor/course feature without them. Arbitrary existing Firebase email conflicts require trusted operator recovery, not automatic linking or account deletion. No remote account inventory/cutover performed.

See ui-review-firebase.md for partial UI evidence and SETUP.md for configuration/manual acceptance. No release, deployment, commit/push, PR update or archive in this revision. Historical Google145+4 and local Argon2id spike are not current integration evidence.

Final receipt: focused managed suite23/23 passed after explicit legacy-ID mapping assertions; final non-ignored source-export Gitleaks8.24.2 scanned ~1.33MB with no leaks (exit0). Production client/Worker artifact marker search found no SyntheticFirebase, __auth-preview, synthetic instructor/course or demo-recipient fixtures. Only evidence receipt/manifests were written after that final scan.
