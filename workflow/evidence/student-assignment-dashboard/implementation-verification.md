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

| Command | Result |
| --- | --- |
| `npx vitest run workflow/student/dashboard.test.ts` | 11/11 pass |
| `npx vitest run src/web/student` | 12/12 pass; 3 failed on the first run because ICU date formatting varied, fixed by locale-independent UTC formatting, then rerun |
| `npm run check` (Node v22.19.0) | exit 0: 16 specs valid, typecheck, lint, 38 test files / 433 tests, deployment-script tests, build |

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

## Not verified / remaining (tasks still unchecked)

- **2.3:** no measurement of the maximum payload (20 questions with full bounds); the fixture has 1 question.
- **3.1:** no consumer tests yet for first-admin zero-course Instructor retention, a selected course beyond page one, or composed dual-role switching. Course pages offer next and first-page links plus browser Back, not an explicit "previous" link.
- **3.2:** no test that a new publication appears after refresh in the browser.
- **3.3:** stale-result and abort guards are covered only by unit tests; no DOM race test. **Safe sign-in return to `/student…` is not implemented**: SH-AUTH `returnDestination` accepts only `/workspace` and instructor paths, so an expired session returns the student to `/workspace`. This needs a change to the SH-AUTH return destinations, which is outside the recorded window.
- **4.1:** reload and direct entry were not run in a browser.
- **4.2:** no long-content test; no record yet of format-revision compatibility.
- **5.1–5.3:** no composed run against real SH-AUTH (Firebase), no `ui-review.md` evidence (keyboard, 320px, zoom, themes, screenshots), no manual acceptance, no independent review.

## Self-review notes

- `WorkspaceEntry` keeps the existing Instructor-first fallback. Student-only accounts and explicit `?role=student` go to the Student workspace.
- `Workspace.tsx` still contains its now-unreachable "Student workspace is not yet available" branch; it was left untouched because that file is Darryl's.
- The `/workspace` entry fetches contexts one extra time for instructors.
