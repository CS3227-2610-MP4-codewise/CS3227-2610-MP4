# Tasks

Owner: Keith. Design revision: `warm-workbook-v1`. All files are Keith-owned (`src/web/student/`, `src/server/student/`, `src/shared/student-work.ts`). There is no migration, no dependency and no Darryl writer window. Implementation starts only on a later apply instruction.

## 1. Times, points and scores (client)

- [x] 1.1 Replace `formatDeadline` with the fixed-output Singapore formatter (design Decision 1). **Verify:** `model.test.ts` covers `2026-11-13T06:05:09Z` → `13/11/2026, 2:05:09 pm`, midnight and noon (`12:00:00 am/pm`), the year boundary `2026-12-31T16:00:00Z` → `01/01/2027, 12:00:00 am`, and the same output with `TZ=America/New_York` and a non-en locale. DOM tests that assert the old UTC text are updated, and `datetime` attributes are unchanged. [DR-01]
- [x] 1.2 Add `formatPoints` and use it in the overview and question-pane rubric guidance. **Verify:** tests cover `(2 points)`, `(1 point)`, `(2.5 points)`, and a criterion with minimum 1 showing `(3 points)` with no range text. [DR-02]
- [x] 1.3 Change the feedback criterion cell to `Score: X / N` and remove the range span and its CSS. **Verify:** `Feedback.dom.test.ts` asserts `Score: 1 / 2`, no `range` text, no score on a withdrawn tombstone, and the existing SF tests still passing. [DR-03, SF-03]

## 2. Status read (server)

- [x] 2.1 Add the closed `assignmentStatusPageSchema` to `src/shared/student-work.ts` and the repeated `id` query parser. **Verify:** unit tests cover valid IDs, 0 and 51 IDs, a duplicate, a malformed ID, an extra key, unknown status values and extra fields being rejected. [AS-02]
- [x] 2.2 Implement the status read in `src/server/student/` with the route in `http.ts` (design Decision 3) and the injected clock. **Verify:** D1 tests cover:
  - each tag and the priority (released > submitted > due soon);
  - feedback only on an earlier attempt → Submitted;
  - a withdrawn release → Submitted;
  - an attempt on an earlier publication → Submitted;
  - deadline boundaries at exactly 24 h, 24 h + 1 s, 1 min and passed;
  - foreign-course and unknown IDs omitted;
  - revoked membership and an inactive course → uniform 404, no session → 401;
  - producer failure → no Feedback released;
  - `no-store`, and no attempt IDs or scores in the body;
  - a 50-ID page in one statement.

  Document the route in `src/server/student/README.md`. [AS-01, AS-02, SD-04]

## 3. Status tags (client)

- [x] 3.1 Add the `status` client call and request it after each list load under the same abort/guard. Render the tags in `AssignmentList`. **Verify:** `StudentWorkspace.dom.test.ts` covers:
  - tags for each status and no tag for `none`;
  - no tags while status is pending and after a status failure, with the list intact and no alert;
  - the next page requesting only its own IDs, and a late earlier-page result being ignored;
  - the tag text read within the row after the title;
  - a refresh re-requesting status. [AS-03, UI-07/08]

- [x] 3.2 Match the instructor row pattern (Keith, 2026-11-13). Put the Open action at the far right of each assignment row, with the tag in the details column, and put View assignments at the far right of each course row. **Verify:** DOM tests check the row structure (details then a `cw-row-action` Open link, and title, deadline and tag order), and a CSS test checks the course entry spans the row. The existing link-colour regression guard still passes. Keith checks the result visually in the running app. [AS-03, SD-06, UI-01/07]

## 4. Verification and handoff

- [x] 4.1 Run `npm run check` and `openspec validate student-dashboard-refinements --strict`. Review the diff for own-data filtering, enumeration, private fields and clock use, and record actual results in `workflow/evidence/student-dashboard-refinements/`. [DR-01–03, AS-01–03]
- [x] 4.2 Complete `workflow/templates/ui-review.md` for the list tags, times and points:
  - keyboard and screen-reader reading of tags;
  - 320/768/1024/1440px and 200% zoom;
  - light and dark;
  - a browser time zone other than Singapore, to confirm DR-01.

  Use synthetic courses and attempts, record Keith's acceptance and note any untested combinations. [UI-01/04/07/08, warm-workbook-v1]

  Keith's acceptance, 2026-11-13, as reported by Keith: he checked the running app locally and judged it "suitably fine for an MVP", with no further checks needed. He did not fill in the review template, and no screenshots or recorded viewport, zoom, theme, screen-reader or time-zone results exist. Treat those as unverified. The row-layout change (3.2) was made after this check.
- [x] 4.3 Write `workflow/handoffs/student-dashboard-refinements.md` from the template. Include requirement IDs, owned files, the new route for Darryl's review, verification outcomes, and the instructor machine-time observation as an FYI for Darryl. [DEV-02/04]

## Workflow follow-up

- Archive order: archive `student-assignment-dashboard` first. Before archiving this change, amend SD-02's "UTC-labelled deadline" to DR-01. Reconcile SF-03's score wording with DR-03 after `student-question-views` archives.
- Open the PR with DR/AS IDs and the design revision. Darryl reviews the new route. Run the hosted staging check after the merge, then archive.
