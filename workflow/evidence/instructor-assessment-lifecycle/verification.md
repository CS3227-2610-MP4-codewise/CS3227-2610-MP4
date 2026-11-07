# Assessment implementation verification — 2026-11-07

Owner Darryl; instructor-assessment-lifecycle, GRADE-02–04/CON-05/IAL-01–09; warm-workbook-v1 UI-01/04/05/06/07/08. Isolated codex/instructor-assessment-lifecycle rebased onto reviewed main969a062f5bdc8171c5a36a0ba06baedde8d2cb6d. Committed producerb7df0b9047d3ad57a4dda95e09bfa1d7258731a3; source-manifest.json pins committed Git bytes. This is not a deployed or jointly accepted assessment producer.

## Final rebase verification

- Main is authoritative: inherited OpenSpec config/MVP/auth/contracts/publication/readiness/warm-workbook artifacts are byte-for-byte main. Only the new assessment delta reconciles scope/ownership and adds assessment requirements. Darryl owns SH-ID, Keith owns submissions/student features; course/assignment foundation remains unchanged.
- Rebase resolved Ownership.md, package.json and IntegrationContracts.md conflicts by retaining main’s current ownership, scripts and producer context plus assessment-specific additions. Assessment migration is0008 after main0007_courses.
- Ordered fresh local D1 application passed all eight migrations, preserving account/course/assessment schema. The local preview accepts its identical pre-rebase0007 assessment marker; persistence restart regression confirms existing synthetic grades survive. No remote SQL/state changes.
- Final npm run check passed with VITEST_MAX_WORKERS=2:225Vitest tests/20files,4Node deployment checks,7strict OpenSpec changes, types, lint and application build. Initial post-rebase lint found a throw in the persistence test finally block; moved path validation before cleanup and reran successfully.
- Application build:45modules, JS281.33kB/gzip86.06 and CSS16.15kB/gzip3.74, reflecting the inherited instructor foundation. Separate assessment preview build passed:38modules, JS252.87kB/gzip78.50 and CSS12.21kB/gzip3.08.
- Redacted Gitleaks8.24.2 source scan passed (~2.02MB); ignored credentials/state/dependencies and Git history excluded. No allowlist added.
- UI/manual acceptance, real SH-SUB/assessment-object composition and cross-review gates remain pending. No push, merge or deployment.

## Historical pre-rebase automated results

- Strict OpenSpec: seven changes passed. Typecheck and ESLint passed.
- Full npm run check with VITEST_MAX_WORKERS=2 passed214Vitest tests/15files,4Node deployment checks and the application build. The initial unrestricted run passed213tests but timed out one existing auth restart test at5000ms under competing local database startup. No auth test/configuration was changed. Bounded concurrency is a local environment setting, not a production/configuration change.
- Additional focused transaction suite:2/2 passed, covering competing correction release/current withdrawal and injected withdrawal-child failure rollback/private reason separation.
- Additional focused persistence suite:2/2 passed, covering actual local D1 runtime close/reopen and bounded cursor history without duplicated full feedback. These four tests were added after the full suite collected; do not describe them as part of that214-test run.
- Final targeted consumer/HTTP conformance plus controller suite:9/9 passed, including mixed/duplicate localhost cookies, safe C-REL fixture output, actual D1 lifecycle conformance and late/conflicting save/read/action handling. Focused consumer digest/rollback regression run previously passed9selected tests.
- Application build:37modules, JS242.97kB/gzip76.26 and CSS10.49kB/gzip2.73. Existing production entries/feature wiring unchanged. Assessment preview separately built38modules, JS252.87kB/gzip78.50 and CSS12.21kB/gzip3.08. No cloud publish or migration.
- Gitleaks8.24.2 redacted source export: approximately1.95MB scanned, no leaks. Ignored local state/dependencies/credentials and Git history excluded. No allowlist added.

## Covered invariants

Real local D1 with synthetic external authorization/submission producers: private partial saves/reopen, score precision/bounds/coverage, exact canonical source/range/excerpt joins including terminal empty LF line, pinned evidence after republish and mutation detection, foreign/revoked/origin/CSRF denial, concurrent stale saves, separate exact approval/edit invalidation, same-key release replay/changed payload/duplicate revision denial, release-child rollback, reviewed corrections/supersession, historical/current withdrawal/tombstones/no revival, once-only availability, revoked/withdrawn receipt denial, self-only consumer reads/currentness and private immutable audit/history. No real learner source or code execution.

Synthetic preview consumes the existing real publication service/repository and seeds only isolated local fixture data. API initialization and actual browser response decoder were separately executed through Node and passed. Mixed unrelated localhost cookies initially exposed an overly strict synthetic cookie comparison; repaired with exact unique named-cookie parsing and regression checks.

## Independent review

Read-only /root/assessment_review inspected the approved baseline/delta and security/UI state boundaries. Initial findings: stale private UI context after denied loads; consumer immutable evidence not checked; unfinished observation edits lost on navigation; all database failures labelled conflicts. Main repaired them and added regressions. Focused review found missing observation-release and id-change local-state guards; main repaired them. Reviewer confirmed focused repairs with no further blocker in that scope. Independent initial typecheck passed. Reviewer Vitest could not collect because of local worktree access restrictions; main's actual runs above are the test evidence. No Keith human review inferred.

## UI and external limits

UI rendering/accessibility acceptance is UNVERIFIED. Initial browser visit showed preview unavailable; later browser navigation reported ERR_NETWORK_IO_SUSPENDED and URL policy blocked its generated error page. Did not bypass it or substitute screenshots. [UI review](ui-review.md) lists320px/native200% zoom/theme/focus/announcement/navigation combinations still pending. Preview was restarted after tests for manual inspection. A user question about its visible state remains pending.

Keith K1–K6 agreement, real SH-ID/SH-SUB producers, real student feedback/progress/cache integration, hosted resource measurements, feature-route composition, remote assessment migration/deployment and Darryl manual acceptance remain open. Local identity-admin bootstrap does not grant course authority. Nothing in this verification activates the deployed assessment workspace.

## Manual checklist

- Save a partial rubric, reload and confirm it persists; complete all criteria and observe no automatic release.
- Add/select/update an exact source observation by keyboard; preserve focus and exact logical lines, including final empty line; check unfinished observation guards on navigation/reload.
- Approve, edit and confirm approval clears; approve again and explicitly release.
- Open a historical revision, create a correction, and confirm old release stays current until new approval/release.
- Withdraw a historical release then the current one; verify no older revival and safe tombstone/currentness fixtures.
- Check light/dark,320px,200% zoom, labelled44px controls, keyboard/focus/announcements and conflict/network/session states.

These boxes remain manual acceptance work, not claims of completed tests.

## Connected workflow continuation — IAL-10, 2026-11-07

Current source: uncommitted working tree based on e6dbdb94ec9bf2b7061660e23698b4c1a491d377, with inherited main969a062. See connected-source-manifest.json for hashes; historical committed producer manifests remain historical.

- Full `npm run check` with VITEST_MAX_WORKERS=2: PASS. Seven strict OpenSpec changes, TypeScript, ESLint,233 Vitest tests/21files (188.20s), four Node deployment checks and Vite build (53modules) passed. An initial lint attempt included generated nested Wrangler files; narrowed generated-folder exclusion to **/.wrangler/**, then reran the full check successfully. No source lint rules weakened.
- Connected local-D1 suite:8/8 passed, including real course-authority composition, missing upstream/CSRF/foreign denial, deterministic sample evidence and production/staging injection denial. Revoke membership immediately before create and session immediately before commit: FORBIDDEN with no unauthorized head/audit mutation.
- Actual native Worker/Firebase API workflow: bootstrap200, login200, session200, courses200; create201, save200, publish200; review/publication200; sample assessment201; score4.5/exact line1 observation save200, approve200, release200; public feedback200 with private reference sentinel absent; logout200. Existing owner granted explicit local instructor membership via existing operator plan. All persistent writes were local. No invitation mail or remote D1/deployment operation.
- Normal Worker dry-run passed (162.64KiB, gzip34.98KiB). Bundle search found no localSamples/sample_student/Local sample submission producer literals. No deployment.
- Repository-source Gitleaks scan: PASS, approximately2.10MB, no leaks. Ignored local credentials/state/dependencies excluded. `git diff --check` passed.
- Independent assessment_review read-only source review confirmed repairs for same-D1 transaction authority, missing public preview UI and lost deep-assessment return destinations. Reviewer did not execute tests; main executed checks above.
- Browser navigation to native local sign-in timed out/reset the connection. No rendered screenshots/keyboard/native zoom/announcements or manual acceptance claimed. Existing tasks4.2/4.3/4.5/5.4 and real Keith integration6.1 remain open.

Manual entry: http://127.0.0.1:8787/sign-in; choose Local workflow test. Startup, source boundary and manual checklist are in workflow/connected-preview/README.md. Server remained running and sign-in returned200 at final verification. Keith's immutable submission producer, consumer execution and joint K agreement remain pending. Production missing producer is honestly unavailable; sample-only development is not completed integration.
