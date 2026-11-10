# Final review: student-assignment-dashboard (task 5.3) — 2026-11-10

- **Reviewer:** main `/root` (Implementer), self-review. No independent reviewer or subagent. Team review is Darryl's GitHub review of PR #25, which is still outstanding at the time of writing.
- **Revisions reviewed:** committed `8a7951f` (reviewed in [implementation verification](implementation-verification.md)) plus the 2026-11-10 working-tree changes listed below.
- **Requirements:** SD-01–06, AUTH-01–03, DEV-02/04.

## Changes since `8a7951f`

| File                                                            | Change                                                       | Authority / privacy / pinning / stale-result impact                                                                                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/web/student/student.css`                                   | Link colour rule narrowed to `a:not(.cw-action)` (finding 2) | Presentation only.                                                                                                                                                                          |
| `src/web/student/StudentWorkspace.tsx`                          | Try again focuses the page heading before reloading (F1)     | Presentation and focus only; the reload still goes through the request-generation guard, so a superseded response is still ignored.                                                         |
| `src/web/student/model.test.ts`, `StudentWorkspace.dom.test.ts` | Regression tests for the two repairs                         | Tests only.                                                                                                                                                                                 |
| `workflow/student/seed-courses*.mjs`, `seed-courses.test.ts`    | Local-only synthetic membership helper                       | Not imported by the Worker or browser build. Fixed to the local `codewise-development` D1; no remote flag; account matched by ID, issuer and subject and must be active; Student role only. |
| Evidence, handoff, tasks, logs                                  | Records only                                                 | No runtime effect.                                                                                                                                                                          |

No server, shared contract, SQL, migration or dependency change since `8a7951f`. The authority model (per-statement current-Student guard, one-snapshot batch for the overview), the private-data projection (no private reference, draft payload, fingerprint, source revision or publisher selected), exact-version pinning and the browser's stale-result handling are therefore unchanged from the reviewed revision, and the composed local acceptance in [composed-acceptance.md](composed-acceptance.md) exercised them against the real sign-in setup.

## Checks

- `npm run check` exit 0 on 2026-11-10: strict OpenSpec validation 16/16, typecheck, lint, Vitest 40 files / 456 tests, deployment-script tests 4/4, production build.
- **Limitation:** that local run used a working tree whose `package.json` and `package-lock.json` had unrelated, uncommitted changes (an unused `firebase` dependency and `typescript-eslint` 8.36). Those files are not part of this change and are not committed; the CI run on the pushed branch, which installs from the committed lockfile, is the authoritative check.
- Text and image search of the evidence found no account email addresses and no non-neutral course names; all screenshots and inspector captures were inspected.

## Outcome

No findings in the code changed since `8a7951f`. Open items belong to other owners and are tracked in the handoff: finding 1, F2 and F4 (Darryl, shared sign-in and shell), and a GitHub approval of PR #25.
