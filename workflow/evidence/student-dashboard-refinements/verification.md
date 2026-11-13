# student-dashboard-refinements: task 4.1 verification

Date: 2026-11-13. Owner: Keith. Branch `keith/student-dashboard-refinements`, base `bb990cd`, uncommitted working tree. Implementer: main `/root` session (Claude Code). No subagents and no independent review. Fixture and local-D1 runs only: there is no hosted staging run and no real-browser UI check yet (that is task 4.2).

## Checks run

| Check                                                                                      | Outcome                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`, first run                                                                 | Exit 1. One failure, in `workflow/ai-quality-evaluation/ledger.test.ts` (`SoclaasTransportError: invalid_response`). This change does not touch that file or `src/server/ai/`. Rerun in isolation three times: it failed once and passed twice, so the test is flaky and unrelated. |
| `npm run check`, rerun                                                                     | **Exit 0.** 66 files passed and 2 skipped. 770 tests passed and 2 skipped.                                                                                                                                                                                                          |
| `openspec validate student-dashboard-refinements --strict`                                 | Valid.                                                                                                                                                                                                                                                                              |
| Focused suites after the last edit (`src/web/student`, `src/server/student`, `src/shared`) | 16 files, 333 tests passed. `tsc --noEmit` and `eslint` were clean.                                                                                                                                                                                                                 |

## Requirement coverage (tests)

- **DR-01:** `src/web/student/model.test.ts` covers afternoon, midnight, noon and year-boundary instants. It also covers `TZ=America/New_York`, where the process clock reads 01:00 local and the output is still `13/11/2026, 2:05:09 pm`. DOM tests assert the new text. The `datetime` attributes are unchanged (ISO instant).
- **DR-02:** `model.test.ts` covers `(2 points)`, `(1 point)`, `(2.5 points)` and `(0.25 points)`, plus an overview with a minimum of 1 and a maximum of 3 showing `(3 points)` and no `1–3`. `Workbook.dom.test.ts` checks the question pane shows `(1 point)` and no range.
- **DR-03:** `Feedback.dom.test.ts` asserts `Score: 4 / 5`, no `range` or `0–5` text, and no `Score:` on a withdrawn tombstone.
- **AS-01:** `src/server/student/status.test.ts` (local D1, `FakeReleasePort` fixture) covers:
  - each status and the priority order;
  - feedback on an earlier attempt only, and a withdrawn-only release, both giving Submitted;
  - an attempt on an earlier publication giving Submitted;
  - Due soon at exactly 24 h, at 24 h + 1 s (none), at 1 minute, and after the deadline has passed (none);
  - only the caller's own attempts;
  - 50 IDs with no producer call when nothing was submitted, and one batched `attemptReleases` call when there are attempts.
- **AS-02:** the same file covers:
  - 401 without a session, and `no-store`;
  - foreign-course and unknown IDs omitted;
  - the uniform 404 for a non-member, an instructor, a revoked member and an inactive course;
  - 400 for no `id`, an `ids` key, an extra key, a duplicate, 51 IDs or an empty `id`;
  - producer absent or failing, falling back to Submitted;
  - no attempt ID, times, scores or private marker in the body.

  `src/shared/student-status.test.ts` covers the closed schema and the ID parser.

- **AS-03:** `StudentWorkspace.dom.test.ts` covers:
  - every tag, and no tag for `none`;
  - the tag after the heading in DOM order and linked to the Open action with `aria-describedby`;
  - no tags while the status read is pending or after a 503, 401 or malformed response, with no alert and the list intact;
  - next-page isolation, with a late result for the earlier page ignored;
  - a status refetch on focus revalidation;
  - no status request for an empty course.

## Self-review of the final diff

- **Authority:** both statements embed `currentStudentGuard` for the course, and attempts are filtered by `user_id = principal` and `course_id`. Release currentness goes through the existing `StudentFeedback.released`, which uses the own-attempt port. Out-of-course IDs are omitted, not reported as errors.
- **Data:** the response is the closed `{assignmentId, status}` page. Attempt IDs, times, scores and release content are never serialized. Nothing is written to browser storage. The tag state is cleared on any list failure (a review fix in the final edit).
- **Clock:** Due soon uses the server's injected `clock()`, read once per request. Client time is never sent.
- **Revision during apply:** the query uses repeated `id` keys instead of one comma-separated `ids` key, because contract assignment IDs may contain commas. Recorded in design.md, Decision 3.
- **Resources:** one extra request per list page, with two D1 statements in one batch and at most one producer call. No migration, binding or dependency.

## Not done here

- Task 4.2: a real-browser UI review (keyboard and screen reader, viewports, zoom, light and dark, another browser time zone) and Keith's manual acceptance.
- Task 4.3: the handoff.
- Darryl's review of the new route, hosted staging, and the archive-order items (SD-02 and SF-03 wording).

## Update: 2026-11-13, acceptance and row layout

- **Task 4.2 (as reported by Keith):** Keith ran the app locally and accepted it as "suitably fine for an MVP", asking for no further checks. The UI-review template was not filled in and no screenshots exist, so the viewport, zoom, theme, screen-reader and time-zone results are unverified.
- **Task 3.2 (Keith's request after that check):**
  - Assignment rows now follow the instructor row pattern: title, deadline and tag on the left, and the `cw-row-action` Open link at the far right.
  - Course rows now span the full width, so View assignments sits at the far right. The cause was the generic `.cw-student a { display: inline-flex }` rule shrinking the shared `.cw-course-entry`. It is fixed by a student-scoped `a.cw-course-entry { display: flex }`, with no edit to the shared `styles.css`.
  - New DOM and CSS tests pin the layout. The link-colour regression guard required `:not(.cw-action)` on the new accent rule.
  - This layout has not yet been checked in a browser.
- **Checks after this change:** student web suites 6 files / 142 tests passed. `npm run check` exit 0 (66 files passed, 2 skipped; 771 tests passed, 2 skipped). `openspec validate student-dashboard-refinements --strict` valid.

## Update: 2026-11-13, long-title wrap fix

- **Defect (reported by Keith with screenshots):** a long assignment title collapsed the row's details column to about one letter per line. The shared `.cw-row-action` has `flex-shrink: 0`, and the student Open link's text includes the full title, so the link took the whole row.
- **Fix (student CSS only):** the Open link can shrink (`flex: 0 1 auto`), capped at `max-width: 16rem`, with no cap at 600px or below, where it wraps under the details. The details column gets `flex: 1 1 auto; min-width: min(16rem, 100%)`. A CSS regression test was added in `model.test.ts`.
- **Visual check:** headless Edge rendered the built CSS with synthetic static markup (the real row structure, a long title, a tag, and a long course name): [1280px](screenshots/long-title-rows-1280.png), [320 / 390 / 700px](screenshots/long-title-rows-320-390-700.png). Titles wrap by word, the Open link stays on the right on wide rows and moves under the details on narrow ones, and nothing overflows. This is a static render, not the running app. Dark theme was not rendered (colours are unchanged).
- **Checks:** `npm run check` exit 0 (66 files passed, 2 skipped; 771 tests passed, 2 skipped).
