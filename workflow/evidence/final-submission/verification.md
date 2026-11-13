# Final submission preparation — verification

Date: 13 November 2026 (Asia/Singapore). Owner: Darryl. Requirements: DEV-01–DEV-04, existing AUTH/COU/SD/SW/SF/GRADE/AI capabilities; guide UI references UI-01–UI-08, warm-workbook-v1 with dated refinements. Documentation/site, formatting of two instructor tests and bounded test-runner concurrency/timeouts; no runtime/schema/API/provider change is intended by this increment.

## Source and scope

Initial audit HEAD: af10461 (PR37 instructor UX merge). During the audit the shared checkout advanced to 4e65c32 (PR38 Darryl reflection merge); those member reflections were preserved and linked. Concurrent warm-workbook UI polish, its ownership/spec records, previews and logs are another increment and were not reverted or claimed as this audit's implementation. Checks run against the shared working tree, so results are not an immutable isolated-release certification. Regenerate the file catalogue and rerun checks after concurrent work settles.

Prepared deliverables:

| Requirement                | Location / result                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product source             | src/web, src/server, src/shared and src/product-site retained in their established structure                                                                 |
| Organized agentic workflow | workflow/FILE-INDEX.md lists workflow files; Developer Guide explains conventional exceptions outside workflow                                               |
| User Guide                 | docs/UserGuide.md: both roles, access/testing, errors, limitations and 12 manually fillable screenshot placeholders; no screenshot images added              |
| Developer Guide            | docs/DeveloperGuide.md: architecture, two UML class diagrams, two UML sequence diagrams, one UML state diagram, setup, process, release and acknowledgements |
| Product website            | src/product-site/index.html and styles.css, existing GitHub Pages workflow retained                                                                          |
| Reflections                | docs/Reflections.md: evidence-based shared analysis, preserved Darryl reflection and explicitly pending Keith contribution                                   |
| Summary logs               | logs/INDEX.md catalogue, existing member records preserved, own per-prompt audit records added                                                               |

## Verification runs

1. Initial npm.cmd run check: strict OpenSpec 18/18, typecheck and lint passed; Vitest 740 passed, 6 failed, 2 skipped across 66 files. All six failures were 5000ms timeouts in four D1-backed files (workflow/auth/course-invitations.test.ts, workflow/auth/owner.test.ts, workflow/student/seed-courses.test.ts and src/server/student/work.test.ts). Deployment tests/build were not reached. This exact command failed.
2. Reduced-worker retry with VITEST_MAX_WORKERS=2: strict OpenSpec 20/20, typecheck/lint passed; Vitest 68 suites failed before collecting tests with sandbox temporary-cache rename EPERM. No tests passed in that retry. Counts changed because the shared checkout advanced; do not add these as unique tests.
3. Sandboxed workspace-local TEMP/TMP and VITEST_MAX_WORKERS=2 retry: cache collection proceeded, but local Worker/D1 suites failed or skipped during runtime setup. Interrupted this unsuccessful run; no complete pass/count claimed. The permitted loopback retry reached real tests but the invitation recovery case again exceeded 5000ms; interrupted that known-failing run. No complete count claimed.
4. Initial npx.cmd prettier --check src: two instructor InstructionEditor test files had formatting differences. Applied Prettier to those two files only; no assertions/behavior intentionally changed. Final source/docs formatting checks passed as recorded below.
5. Test-runner repair: vitest.config.ts now caps workers at four, permits 15000ms per test and 30000ms for hooks. This bounds simultaneous local Worker runtimes and accommodates real D1 I/O; no assertions or application behavior changed. Required full check with the new configuration passed; exact results are recorded below.
6. Submission audit script: checks required files, guide/index local links, product-site assets, exactly 12 screenshot placeholders, no embedded UG images, and diagram presence. Passed on repeated executions. It does not certify remote URLs, UML rendering, visual layout or historical log completeness.

No live screenshot captures, provider generation requests, deployments, production migrations, commits or pushes were performed by this increment. Historical synthetic screenshots remain in existing evidence folders. No fresh signed-in browser acceptance or site visual inspection is claimed.

## Final team actions

- [ ] Darryl/Keith: verify current feature documentation against the exact selected staging release; run the UG two-account walkthrough using synthetic data and record revision/run/results.
- [ ] Team: supply peer testers private invitations, the agreed test course and environment; verify email delivery/recovery in that environment. No reusable password is published.
- [x] UG-01–UG-12 contain explicit screenshot placeholders as requested. No live images were added. Replacing these with manual captures is optional future team work, not part of this placeholder-only pass.
- [ ] Keith: contribute and verify his own reflection; link it from docs/Reflections.md. No personal account is fabricated.
- [ ] Both members: verify logs for accuracy/coverage, reconcile available provisional telemetry and acknowledge remaining gaps. The catalogue is not a complete historical transcript audit.
- [ ] Team: review acknowledgements against any reused external code/assets/ideas not visible in current records.
- [ ] Release owner: merge through reviewed PR flow, verify successful GitHub Pages run and public website links. The Pages workflow is prepared; fresh publication is unverified.
- [ ] Release owner: record the successful staging run/deployed commit and protected production promotion if production is part of the submission. Historical foundation evidence is insufficient.
- [ ] AI owner/instructor: resolve or explicitly accept documented AI quality/compatibility/resource gates before activation; the 12-call study's recommendation is needs repair and instructor review is unfilled. Do not consume more provider calls under that exhausted evaluation budget.

The repository is prepared for review; unchecked manual/remote/member tasks prevent an unconditional final-ready claim.

## Additional audit observations

- Targeted ESLint on the new submission-audit script passed. Generated catalogue/link/placeholder checks passed. Formatting the changed guides/site/script passed; final check follows below.
- A later source formatting snapshot reported 14 files being edited by the separate UI-polish increment; this audit did not overwrite those owned in-flight files. The original two instructor test formatting corrections remain whitespace-only.
- Browser-service reads of staging/production health and the Pages URL were inaccessible via that tool; no hosted success, failure, current revision or new publication can be inferred from this result. Remote verification remains pending.
- Local Node is v26.13.0; CI is pinned to Node 22. Exact CI-environment equivalence is not claimed.

- Final prepared-document/site/script formatting check passed. Scoped git diff --check passed. These checks exclude files owned by the concurrent UI-polish increment.

## Reproducing the permitted local check

On this Windows host the sandbox temp cache and local Worker runtime restrictions affected the earlier runs. The final run uses workspace-local temporary files and permitted loopback execution:

```powershell
New-Item -ItemType Directory -Force .wrangler/submission-temp | Out-Null
$env:TEMP=(Resolve-Path .wrangler/submission-temp).Path
$env:TMP=$env:TEMP
npm.cmd run check
```

No model credentials or hosted database operations are needed. The final check uses the committed-config candidate in vitest.config.ts, without an environment override for worker count.

## Final automated results — 13 November 2026, 10:51 SGT checkpoint

- **Required npm.cmd run check: exit 0.** Strict OpenSpec 20/20; TypeScript and ESLint passed; Vitest **66 files passed, 2 skipped / 771 tests passed, 2 skipped**; deployment script tests **4/4**; Vite build passed. Vitest reported 392.87 seconds. The output includes jsdom's navigation-not-implemented notice and the existing >500 kB bundle warning; neither failed the check. Two skipped tests are not passes.
- Runtime settings: workspace-local TEMP/TMP, permitted local loopback execution, final vitest.config.ts (4 workers, 15-second tests, 30-second hooks), Node v26.13.0. No environment worker override. This is a local pass, not a Node-22 CI or hosted-acceptance result.
- **npx.cmd prettier --check src: exit 0**, all matched source files formatted. The earlier concurrent-polish formatting warnings are superseded by this later formatting snapshot; no external source was reformatted by this increment.
- Prepared README/guides/site/script/catalogue/handoff formatting check passed. Scoped git diff --check passed. Submission structure/local-link/site-asset/placeholder/diagram-presence audit passed.
- Earlier timeout, EPERM and interrupted outcomes remain above and are not relabelled successful. Test counts grew as concurrent work landed; do not add separate runs or reruns as unique tests. Shared-checkout and manual/remote limits still apply.

## Final scope clarification

The user subsequently directed this pass to focus on docs/site and assigned comprehensive testing to Keith. Further comprehensive testing is handed off to Keith; the completed local results above are retained, not repeated. Screenshot placeholders satisfy the requested image treatment. The site is prepared for the existing GitHub Pages workflow; no fresh publication was performed here.

## Docs PR scope — FINAL-SUBMISSION-04

The docs PR is based on latest main f8af24d, which adds the reviewed Cloudflare dashboard-variable preservation fix. It includes only guides/reference docs, the static product website, workflow/log catalogues, submission-audit helper and this increment's records. The earlier full-suite result belongs to the shared candidate tree, including UI-polish and temporary test settings; it is not a comprehensive test result for this isolated docs PR. vitest.config.ts and both instructor test formatting changes are excluded from the docs PR and retained in the original checkout for Keith. No comprehensive tests were repeated. Catalogue/link/format/whitespace and exact staged-file scope are the checks for this PR. Publication of the website follows the existing Pages workflow after merge; no merge is performed here.
