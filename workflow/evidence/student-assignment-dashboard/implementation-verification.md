# Implementation verification: student-assignment-dashboard (2026-11-09)

- **Who did the work:** main `/root`, role Implementer, in Claude Code session `c1aaaded…`. No subagents and no independent review.
- **Base:** HEAD `3a7e5e4`. All changes are uncommitted in the working tree; nothing was committed, pushed or deployed.
- **Recording:** run `428b26fb…`.
- **Requirements:** SD-01–06, AUTH-01–03, COU-06/07, SUB-01/04, UI-01/02/03/04/07/08 (warm-workbook-v1).

## Gates

- **1.1 Producer review:** Keith accepted HEAD `3a7e5e4`, dashboard producer `8f93f51` and the later SH-AUTH change `5e0ed6b`.
- **1.2 Listing agreement:** Keith reported that Darryl agreed design §2–§4 as written, with Keith as sole writer of all named shared files. This is recorded in `workflow/Ownership.md` and `workflow/IntegrationContracts.md`. Darryl's direct confirmation and code review are not claimed.

## Files

New:

- `src/shared/student-assignments.ts`: closed listing schema; opaque canonical base64url cursor of at most 512 characters; route-ID validator.
- `src/server/student/repository.ts`: guarded latest-publication listing and exact-version overview. Both read the existing D1 tables, so there is no new storage and no migration.
- `src/server/student/http.ts`: GET-only handler. Denied and missing objects both return 404 `NOT_FOUND`; all responses are `no-store`.
- `src/web/student/model.ts`: routes, client, response binding and request generations.
- `src/web/student/StudentWorkspace.tsx`: course, assignment and overview pages.
- `src/web/student/WorkspaceEntry.tsx`: role-aware `/workspace` entry.
- `src/web/student/student.css`: page styles.
- `src/web/ui/instruction-text.tsx`: the extracted shared sanitized renderer.
- Tests: `workflow/student/dashboard.test.ts`, `src/web/student/model.test.ts`.

Edited shared files (Keith window):

- `src/server/courses/authority.ts`: added `currentStudentGuard` and `studentGuardBindings`. The `student-read` action and instructor reads are unchanged.
- `src/server/index.ts`: added the `/api/student/` route and no-store headers for `/student` pages.
- `src/web/main.tsx`: added `/workspace` → `WorkspaceEntry` and the `/student…` routes.
- `src/web/instructor/assignments/InstructionPreview.tsx`: now delegates to the shared renderer, with the same empty-value placeholder.

## Query and cursor limits

- **Listing:** one SQL statement. A course envelope row is returned only when the account has current active Student membership, an active account, an unrevoked and unexpired session idle under 30 minutes, and the course is active. Rows are the latest `publication_number` per assignment, ordered `(deadline_at, assignment_id)`, `LIMIT 51` to return 50 plus a next-page check. Selected columns: publication id, assignment_id, title, published_at, deadline_at. It never selects the draft payload, private reference, fingerprint, source revision or publisher.
- **Overview:** one D1 batch, so a single transaction, of 3 statements. Each statement repeats the Student guard on the publication's course. Fields match the instructor public projection, and the result is validated with the C-PUB `publicationSchema`. The returned version ID must equal the requested one.
- **Cursor:** canonical base64url JSON of `[deadlineAt, assignmentId]`. Non-canonical, malformed, empty, duplicate or unknown query parameters return 400.

## Checks run

| Command                                             | Result                                                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run workflow/student/dashboard.test.ts` | 11/11 pass                                                                                                                       |
| `npx vitest run src/web/student`                    | 12/12 pass; 3 failed on the first run because ICU date formatting varied, fixed by locale-independent UTC formatting, then rerun |
| `npm run check` (Node v22.19.0)                     | exit 0: 16 specs valid, typecheck, lint, 38 test files / 433 tests, deployment-script tests, build                               |

The server tests use a synthetic Miniflare D1 with a fake session port. They cover:

- unpublished drafts excluded
- V2 listed instead of V1
- past deadlines kept, equal deadlines ordered by ID
- 51 assignments returned as 50 + 1 with deterministic traversal
- an empty course still returns its envelope
- instructor-only, dual-role-on-instructor-course, cross-course and missing courses all return identical 404 bodies
- malformed, non-canonical, oversized, duplicate and unknown queries return 400
- no session returns 401; POST returns 404
- revoking the membership, account, session or course after the session pre-check returns 404 for both the listing and the overview
- V1 is still served after V2 is published
- private, draft and fingerprint markers never appear in responses
- the application's `/api/student/` route returns 401 with `no-store` when unauthenticated

The web tests cover:

- route parsing rejects forged roles, cursors, encoded slashes and unknown parameters
- responses are bound to the requested course and version (no substituted course or version)
- a repeated cursor is reported as invalid
- extra or private fields and learner-status fields cause a payload to be rejected, not rendered
- each failure has a distinct recovery state
- superseded request generations are ignored
- static rendering of the list and overview shows no learner status and no editor, submit, run, feedback or history controls, and keeps code indentation
- the sanitizer removes script tags, `onerror` handlers and `javascript:` URLs
- the student source code contains no browser-storage APIs

## Follow-up verification (2026-11-09, second pass)

New tests: `src/web/student/StudentWorkspace.dom.test.ts` (jsdom and Testing Library, 17 tests), plus additions to the server and model tests.

**Task 2.3**

- The largest publication C-PUB accepts serializes to **1,048,564 bytes** and is served in 23 ms locally (Miniflare D1). The binding limit is the shared `inspectJson` cap of 1 MiB on strings plus keys, not the per-field maximums.
- Question and rubric version IDs are pinned to the requested version (V1 versus V2).
- **Repair:** stored content that fails the public contract now fails closed with 503 `UPSTREAM_UNAVAILABLE`, no content and no private data. Previously it returned 400, which the browser would have shown as "invalid link".

**Task 3.1**

- Dual-role accounts see the shared switch with Student checked; single-role accounts see no switch.
- 100-course pages offer next and first-page links. Repeated cursors are rejected.
- `chooseWorkspace` keeps the Instructor-first fallback, including a first-admin Instructor with zero courses. Forged role preferences grant nothing.
- A course beyond page one works because the listing envelope is guarded per course and does not depend on context pages.
- Shell integration is at HEAD `3a7e5e4` plus this branch.

**Task 3.2**

- An empty course shows its empty state.
- Refreshing the list shows a newly published assignment.
- A response for a different course is rejected.
- Rows carry no learner status. No browser storage writes (`Storage.setItem` spy).

**Task 3.3**

- A slower, superseded response is ignored.
- Revocation detected on focus clears the rows.
- Restoring a page from the back/forward cache re-authorizes it.
- Retry works after a 503.
- An expired session shows a sign-in link; after sign-in the student lands on `/workspace`, per the revised SD-05.
- Cancelling the unsaved-instructor-work prompt keeps the Instructor role and makes no student request.
- **Repair:** failure messages are now announced once, using a visually hidden status, instead of being shown twice.

**Task 4.1**

- Reload keeps the exact version.
- The back link points to the course.
- Version substitution is rejected.
- A malformed direct link shows unavailable without sending any request.
- No inputs, textareas, or Submit/Run/Save controls. The overview is a document; question-work editing stays with later UI-05/06 increments.

**Task 4.2**

- Long content is rendered without truncation; plain-text symbols are preserved.
- The renderer is the same component and sanitizer schema the instructor preview used, extracted without behaviour change.
- No dependency change: `package.json` and the lockfile are unchanged.

**Checks**

- `npm run check` exits 0: 16 specs, typecheck, lint, 39 files / 452 tests, 4/4 deployment-script tests, build.
- Prettier check is clean on the new files.

## Not verified / remaining

**5.1–5.3:**

- No composed run against real SH-AUTH (Firebase) and the onboarding producers: invitations, dual roles, revocation, more than 100 real memberships.
- No `ui-review.md` evidence: real keyboard, pointer/Space, 320/768/1024/1440px, 200% zoom, light/dark, reduced motion, contrast, screenshots.
- No manual acceptance by Keith.
- No independent or final review.
- jsdom does not verify layout, focus visibility or contrast.

## Self-review notes

- `WorkspaceEntry` keeps the existing Instructor-first fallback. Student-only accounts and explicit `?role=student` go to the Student workspace.
- `Workspace.tsx` still contains its now-unreachable "Student workspace is not yet available" branch; it was left untouched because that file is Darryl's.
- The `/workspace` entry fetches contexts one extra time for instructors.
