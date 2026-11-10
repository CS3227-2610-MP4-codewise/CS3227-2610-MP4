# Post-review fixes: student-assignment-dashboard (2026-11-10)

- **Workflow:** generator–verifier, chosen by Keith. Main `/root` (Implementer) acted as generator. One fresh `general-purpose` subagent, labelled Reviewer (role `workflow/agents/review.md`), verified independently under read-only instructions: no edits and no git state changes. The reviewer ran in the same Claude Code session and is recorded with `tracker.py agent-role`. This is an agent review, not a human or team review.
- **Base:** `9432a9d` (PR #25). All changes are in Keith's files: `src/web/student/*` and the opt-in in the shared renderer `src/web/ui/instruction-text.tsx`. Unchanged: server, contracts, SQL, migrations, dependencies, and Darryl's `workspace-switch.tsx` and `styles.css`.
- **Requirements:** SD-03/05/06, UI-02/03/07/08, COU-06.

## Reported bugs

| #   | Report                                                | Valid?                                                                                                   | Outcome                                                                                                                                               |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Cross-tab sign-out hides the expired-session recovery | Yes. `workspace-switch.tsx:64–67` treats a 401 from `/contexts` as revoked; `styles.css:86` hides `main` | Handed to Darryl (his files); same as F2                                                                                                              |
| 2   | Account view not refreshed on focus revalidation      | Yes                                                                                                      | Fixed: the session view refreshes with every focus and bfcache restore; only the newest response applies                                              |
| 3   | Stale `?role=` skips the contexts check               | Yes                                                                                                      | Fixed: `/workspace` always resolves the requested role against current contexts; the address is rewritten to the chosen role                          |
| 4   | Failure message stays after a successful revalidation | Yes                                                                                                      | Fixed: any successful read clears a failure announcement; other messages are kept                                                                     |
| 5   | Radio group instead of the documented switch          | Yes (contradicts `docs/ui/design.md` UI-03)                                                              | Handed to Darryl (code or design decision); same as F4                                                                                                |
| 6   | Back link loses the assignment page                   | Yes                                                                                                      | Fixed: Open links carry the page cursor as a validated `from` value, used only for the Back link                                                      |
| 7   | Instruction code blocks not keyboard-reachable        | Yes                                                                                                      | Fixed: with `codeLabel`, each code block is a focusable, labelled region ("Code example in question N, block M"); the instructor preview is unchanged |

## Generator verification

- Each new test was run against the pre-fix source, by stashing the source files only. The five new tests in the "post-review fixes" block and the two updated model tests failed on the old code. The stale-failure test failed for the intended reason: the old status line kept "This could not be loaded".
- After the fixes, `src/web/student` tests passed 36/36.

## Verifier round 1 — findings and repairs

| Finding                                                                                                                                                                         | Severity | Repair                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint error: the `eslint-disable` comment landed on the wrong line after formatting, so `npm run check` failed at lint                                                           | P1       | The per-render `components.pre` was removed (see next row)                                                                                                                                                                           |
| A focused code block was rebuilt on every re-render, losing focus and scroll position. Cause: a new `components.pre` function on each render                                    | P2       | Attributes are now added by a rehype step (`codeRegions`) that runs after `rehypeSanitize`. The element stays a plain `<pre>`, so React keeps the node. New test: the region stays connected and focused across a focus revalidation |
| The fetch-failure path in `WorkspaceEntry` was untested. If contexts fail, `InstructorWorkspace` can still show Darryl's obsolete "Student workspace is not yet available" text | P3       | Test added for `?role=student` with failing contexts. The stale text in `src/web/instructor/Workspace.tsx:228–229` and `src/web/auth/client.ts:14` is handed to Darryl                                                               |
| Evidence link in tasks section 6 pointed to a file that did not exist                                                                                                           | P3       | This file                                                                                                                                                                                                                            |
| A brief session-request error hid the account menu                                                                                                                              | P3       | The view is cleared only on `UNAUTHENTICATED` or `FORBIDDEN`; network errors keep the last confirmed view. New test covers both cases                                                                                                |

The generator did not separately show the new re-render test failing against the round-1 implementation, because that version was never committed. The reviewer reproduced the focus loss independently in round 1.

## Checks after repair

- `npx tsc --noEmit` and `npx eslint src/web/student src/web/ui/instruction-text.tsx`: clean.
- `npx vitest run src/web/student src/web/instructor`: 9 files, 92/92 passed. The instructor preview is unaffected.
- `npm run check`: exit 0. Strict OpenSpec validation, typecheck, lint, 40 files / 464 tests, 4/4 deployment-script tests and the build.

## Verifier round 2

- **Fixed:** findings 1, 2 and 5.
  - The reviewer re-ran its jsdom script: the code block is the same element and keeps focus after a re-render.
  - Sanitisation still holds. Raw `<pre tabindex="7" role="button" aria-label="EVIL" onclick=…>`, `<script>` and a `javascript:` link were cleaned. With a label, `role` and `aria-label` are set from code and `tabindex` is forced to 0.
  - The instructor preview is unchanged.
- **Finding 3:** the test is real.
- **Checks:** `npm run check` exit 0 (16 specs, 464/464 tests, build); `workspace-switch.tsx` and `styles.css` unchanged.
- **New P3 notes and outcomes:**
  1. Two new tests asserted right after the request count rose, so they might pass with the bug back.
     - Repaired: the focus test now waits for a visibly changed title. The account test settles before asserting and also covers a thrown network `TypeError`.
     - Mutation check: after reintroducing "clear the view on any error", the account test **fails**; after restoring the file, `src/web/student` passed 39/39.
  2. In the instructor preview (no `codeLabel`), author raw HTML can keep its own `tabindex` (for example a positive value that reorders keyboard navigation). This existed before these fixes; the student overview forces 0.
     - Handed to Darryl: removing `tabIndex` from `instructionSchema` would change the shared renderer for his preview.

## Not verified

- Real-browser behaviour: a live two-account cross-tab swap, bfcache, focus retention in a real browser, 320 px / 200% scrolling, and screen-reader output for the new regions.
- Hosted staging.
