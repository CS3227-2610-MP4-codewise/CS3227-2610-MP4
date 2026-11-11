# local-shell-recovery-01 verification

## Publication and UI-03 continuation - 2026-11-12

Final code was committed/published as `6a277026df23c6097733bed13b2762900e177e81` after initial `fe8f49b`. GitHub read-back confirms both continuation source files exactly match the reviewed snapshot. Final-source CI501pass/3student compatibility failures, secrets success: [exact CI checkpoint](ci-summary.md#final-source-checkpoint). The final documentation checkpoint preserves this code revision; native/manual and Keith's exact consumer acceptance remain open. Current local checkout remains on main because Git metadata is read-only.

Initial26-file scoped snapshot committed/published through GitHub's connector at `fe8f49b7f74db248344fe40ba47e8d99ef9334f6`, [draft PR27](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/27), before the user's requested follow-up. Local Git metadata denied branch creation, so local HEAD remains main `af1bc90`; it is not the published branch/head. Unrelated dirty work is excluded from the remote tree. Two task-attachment attempts failed with Codex app tool request errors; PR creation itself succeeded.

The repeated bounded request identified a remaining UI-03 gap: parent destination focus can run while shared availability checks still hide the page, and role arrival was not explicitly announced. Continuation changes shared switch/test only: destination focus after authorization mask removal, once-per-entry workspace live status, restored pre-check focus unless the user chose another target, and clear checking text/switch focus after cancelled navigation. Main43/43 focused checks pass; actually reused read-only reviewer `/root/shell_review` found no findings and independently ran shared31/31. These source/DOM checks do not claim actual native Space, beforeunload cancellation, screen-reader speech, rendered matrix or human acceptance.

Exact continuation source: [arrival manifest](shell-arrival-source-manifest.txt). Focused Keith packet: [shared-shell recovery](../../handoffs/shared-shell-recovery.md). Earlier checkpoints below are retained as history, not final producer revisions. Final static/build/publication results are appended at this prompt's completion.

Continuation verification: main43/43 focused tests; independent shared31/31; final changed-source ESLint and Vite build pass (373modules,747.98kB main chunk, existing large-chunk warning). Required full check still stops at unrelated dirty evidence lint after strict specs16/16/typecheck. Initial committed CI, which excludes that dirty evidence, executes500 tests with497pass/3student compatibility failures and passes secrets; see [redacted CI summary](ci-summary.md). No source tests or shared SessionView were changed to hide those failures.

Owner: Darryl. Base: local main `af1bc90fa47ed0b8726a46084ce642992c807e15` plus the exact uncommitted source snapshot in [source manifest](shell-source-manifest.txt). No new commit or remote revision claimed. Requirements AUTH-01–03, COU-06/07, SHA-06/07, UI-01/02/03/07/08; `warm-workbook-v1`.

## Behavior and owned source

- Acknowledged Student/Instructor/dual joins link to existing `/workspace?role=...` entries; obsolete Student-unavailable copy is removed from auth and instructor fallback. Existing safe sign-in return policy is retained.
- Native checkbox switch, stable name “Instructor workspace”, Student off/Instructor on, visible labels and one 44px labelled target. Single-role accounts show text; pointer/Space use the native checkbox change path. No animation needs a reduced-motion exception. Current role/checked state changes on destination, not an optimistic local permission change.
- Session, contexts and applicable course/bulk checks distinguish 401/session change, role removal, selected-course denial and network/provider/malformed failure. Same-user replaced session and cross-account replacement are checked using existing user ID/session-bound CSRF, without logging those values. Instructor parents bind checks to their existing AuthView, including initial mount/late parent identity.
- A scoped nearest-shell selector withholds protected page content and keeps recovery in a sibling portal. Session recovery exposes heading/Sign in and hides old account/navigation. Errors are latched until account/private data reload; a later successful context refresh alone cannot reveal an earlier account's stale page. This is browser presentation protection; server authorization remains authoritative.
- Existing beforeLeave/beforeunload dirty-work protections remain. Requests suppress duplicate pending activation; a cancelled browser navigation does not leave the page locked. Stale/unmounted responses cannot navigate or overwrite newer checks. bfcache restoration rechecks.

Product scope: shared `workspace-switch.tsx`, role/recovery styles, auth client/App, instructor Workspace/course client, and identity-only wiring in instructor AssignmentWorkspace/AssessmentWorkspace/ReviewWorkspace. New focused tests are in shared UI, auth and instructor course directories. No student source, backend, DTO, migration, database, bootstrap, account, membership, provider/mail or deployment changes.

## Independent review and repairs

Actual reviewer: `/root/shell_review`, fresh context, read-only, applying quality-review. Initial source return: (1) cross-account stale page with matching course/role, (2) permanent pending lock when beforeunload navigation is cancelled, (3) Promise.all's first rejection masking a later 401. Main repaired all three. Necessary exact instructor identity-prop files were announced before editing, using the approved brief's conditional parent-consumer scope.

Focused re-review found no remaining source issues. Reviewer independently reproduced one focus timing failure (26/27 pass) because passive focus could follow the observable recovery DOM. Main moved focus to layout effect; reviewer reran isolated 401 cases 3/3 and complete shared suite 27/27, exit 0. Reviewed-file diff whitespace check passed. Reviewer ran synthetic DOM checks and inspected source; no independent native/browser/provider/human acceptance claimed.

## Executed checks and limits

- Main first focused three suites: 28/28 pass before the later review repairs; retained as an earlier checkpoint, not final-tree proof.
- Main expanded six suites after identity/401/navigation repairs: 57/57 pass. Reviewer then exposed the focus timing issue described above; final focused main retry is recorded in the completion append.
- `npm run check`: strict OpenSpec 16/16 and TypeScript pass; ESLint stops on pre-existing unrelated dirty `workflow/evidence/module-wrapup-parallel-simulation/run.mjs:15`, unused `tasks`. No introduced lint defect reported by that run; tests/build are not reached by the chain. Later documentation changes receive a final required check.
- Existing unchanged student DOM suite: **22 pass/3 fail**. Two expectations explicitly query the removed radios (lines 136 and 431–436). The third session-menu fixture (line 599) queues replies for the former request count; the new legitimate shared session read consumes its future 401 earlier. Independent reviewer confirmed fixture coupling; this does not establish a network-only product regression. These are introduced consumer-test compatibility failures, not silently classified as pre-existing passes. Keith owns the exact assertion/fixture alignment; no test was removed, skipped or weakened.
- Prior broad baseline D1/Worker attempts fail `connect EACCES 127.0.0.1` with secondary EBUSY cleanup. No fresh D1 concurrency/rollback/idempotency/restart/revocation/CSRF pass claimed. No backend/persistence code changed by this slice. Existing owner/membership/bootstrap data were not touched.
- Separate build/deployment checks and final focused/static results: completion append below. No new source test claims rely solely on typechecking.

## Browser/manual checkpoint — not accepted

A temporary synthetic-only Vite shell fixture served actual shared source/CSS at loopback port 5191; its fetch responses were synthetic, with no API/provider/database calls. Browser automation failed before page inspection: in-app tab creation reported a browser-session binding mismatch, and selecting the existing native Codewise Chrome window timed out awaiting app approval. Computer-use completion recorded the blockage. No screenshot, native click/Space result, rendered width/zoom/contrast, screen-reader speech or native beforeunload acceptance is claimed. The temporary fixture server was stopped; no user browser settings or account state changed.

Remaining Darryl manual checklist, using local synthetic/test accounts and no live mail/provider operation:

1. Student-only, Instructor-only and dual acknowledged joins offer only the applicable real workspace entries. Open both roles; heading/context and checked state agree. Single-role context omits the switch.
2. Tab to the switch and press Space in each direction; click either label/track. Destination heading receives focus; new workspace announcement is heard once. Check focus visibility, labels and 44px target.
3. Make unsaved instructor edits, toggle, cancel the native Leave page prompt: original text/role remain, editing works, switch/focus refresh are usable. Accept deliberate departure separately; do not claim unsaved text was saved.
4. Simulate cross-tab sign-out/session expiry, same-user replacement session and different account with the same roles/course. Heading/Sign in remain visible; old private content/account controls stay withheld. A later successful context response cannot unmask the page before reload.
5. Revoke only the current course or current role: distinguish course denial from workspace removal; remaining authorized workspace is reachable. Forged/stale selection never grants access.
6. Simulate network/provider/malformed failure and a delayed 401 behind another failed check. Availability errors do not claim revoked membership; any 401 wins with Sign in. Reload recovers through fresh authorization.
7. Repeat relevant states at 320/768/1024/1440px, 200% zoom, light/dark and reduced motion. Check no page overflow, actual contrast, reading order, no hidden focus or duplicate live announcements. Record actual combinations and exceptions.

Stop at explicit human acceptance before another substantive feature iteration. Keith's exact source/consumer test recheck is separate from Darryl's manual acceptance. Onboarding/authoring and formatted-instruction compatibility remain the next independent work and Keith dependencies in the integration packet; no unfinished change archived.

## Completion append

Independent ordinary acceptance work while the manual gate is pending: existing Python-highlighting and shared instructor-contract suites pass **84/84, 2 files**, with no source changes. This verifies escaped highlighting and pure schema/projection evidence; it does not replace D1 immutable-storage checks or complete authoring's native keyboard/persistence/manual tasks.

Main after-review focused run: **57/57, 6 files, exit 0** (shared switch, course client, auth client, actual join DOM, authoring controller and assessment controller). Separate Vite build passes, 373 modules, with the existing >500 kB chunk warning (747.25 kB main output); four deployment checks pass. Final required check/spec/task/format/diff outcomes are recorded in the LOCAL-02 member-log completion checkpoint. Local temp overrides affect test processes only. Recorder refresh still fails EPERM outside writable roots, so main/child token measurements and preceding prompt reconciliation remain unavailable. No count inferred from test duration or tool calls.
