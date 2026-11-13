# Proposal

## Why

Keith reviewed the student screens on 2026-11-13 and asked for three refinements:

- Times read differently from the instructor screens.
- Rubric guidance shows a "0–2 points" range where only the attainable maximum matters.
- The course assignment list gives no hint of what needs attention.

This change makes student times, points and assignment status clear and consistent. The per-question workbook views are planned separately in `student-question-views`.

## What Changes

- **Student times.** Show every student-facing timestamp (deadlines, publication, submission and release times) in Singapore time as `DD/MM/YYYY, h:mm:ss am/pm`, for example `13/11/2026, 2:05:09 pm`, with no time-zone label. The output does not depend on the viewer's computer locale or time zone. This replaces the current `Fri 13 Nov 2026, 06:05 UTC` text. [DR-01, UI-04]
- **Rubric guidance points.** Show only the attainable maximum in brackets, `(2 points)`, on the assignment overview and in the workbook question pane. This applies even when a criterion's minimum is non-zero. [DR-02]
- **Released feedback scores.** Show each criterion score as `Score: X / N` instead of `X of N (range min–max)`. [DR-03, SF-03]
- **Assignment status tags.** Each row of the course assignment list gets at most one text tag under its deadline, with the row's Open action at its far right as in the instructor lists (Keith, 2026-11-13), in this priority order:
  1. **Feedback released:** the latest attempt has a current, non-withdrawn release.
  2. **Submitted:** at least one attempt exists.
  3. **Due soon:** no attempt yet, and the deadline is within the next 24 hours and has not passed.

  The server works out the tags from authoritative data through a new Keith-owned status read. When that read fails, rows show no tag and the list is unaffected. [AS-01–03, SD-04]

### Decisions recorded (Keith, 2026-11-13)

| # | Decision |
|---|----------|
| 1 | **Times are pinned to Asia/Singapore, not the viewer's machine.** Keith asked whether the instructor screens use machine or server time. They use the browser's local time (`toLocaleString()` with no time zone). On Keith's Mac that is Singapore time only because the Mac is set to Asia/Singapore. Students get the same en-SG layout, with a 4-digit year as on the instructor screens, but always in Singapore time, and with no "SGT" label. |
| 2 | **Points.** Always `(N points)`. The feedback table shows `Score: X / N`. |
| 3 | **Tags.** One tag per row, with priority Feedback released > Submitted > Due soon. |
| 4 | **Split.** These refinements are a separate change from `student-question-views` (Keith, 2026-11-13). |
| 5 | **Endpoint.** The status read is a separate Keith-owned endpoint. The reviewed SD assignment-list contract (`src/shared/student-assignments.ts`) stays unchanged. |
| 6 | **Row layout.** Assignment rows follow the instructor row pattern: details (title, deadline, tag) on the left and the Open action at the far right. The course list's View assignments sits at the far right of each row. (Keith, 2026-11-13, after reviewing the running app.) |

## Capabilities

### New Capabilities

- `student-display-conventions`: how student screens present times, rubric points and released scores.
- `student-assignment-status`: authoritative per-assignment learner status for the student's course assignment list, and its tags.

### Modified Capabilities

- `student-assignment-dashboard`: SD-02's "UTC-labelled deadline" becomes a deadline shown in Singapore time as DR-01 specifies (added 2026-11-13 at archive, after the dashboard change archived).

SF-03's "score, bounds" is met by the displayed maximum. DR-03 adds the exact score format without rewriting SF-03, because `student-question-views` also modifies SF-03. See the open items.

## Impact

- **Keith-owned client:** `src/web/student/` (`model.ts` `formatDeadline` and its six importing files, `StudentWorkspace.tsx` list rows and rubric guidance, `Workbook.tsx` question-pane rubric, `Feedback.tsx` score cell, CSS) and their tests.
- **Keith-owned server:** a new GET route in `src/server/student/http.ts` and a status read in `src/server/student/`. It reuses `currentStudentGuard`, the `student_attempts_history` index and the existing batched `StudentReleases.released()` producer call. No migration, no new table, no dependency.
- **Shared types:** one closed status response schema in Keith's student shared file `src/shared/student-work.ts`. `student-assignments.ts`, the instructor contracts and Darryl's release port are used unchanged.
- **UI:** `docs/ui/design.md` revision `warm-workbook-v1`, UI-01/04/07/08. Affected screens are the course assignment list, the assignment overview, the workbook question pane, attempt and review times, and the released-feedback table. Tags are text, not colour alone. Role switching grants nothing.

## Assumptions, exclusions and open items

- **Assumption:** "Latest attempt" means the newest attempt for the assignment across all its publication versions, the same ordering as SW-08 history.
- **Assumption:** a fixed Singapore display is acceptable for all users. Singapore has no daylight saving, so the offset is fixed at UTC+8.
- **Excluded:** changing instructor screens (they keep machine-local time, which is Darryl's area), Past due or Not started tags, grades or totals in tags, notifications, and per-question workbook changes (`student-question-views`).
- **Open (archive order):** the open `student-assignment-dashboard` change's SD-02 requires a "UTC-labelled deadline", which DR-01 replaces. That spec is not yet in `openspec/specs/`. Archive the dashboard change first, then amend SD-02 in this change before it archives. Likewise, reconcile SF-03's wording with DR-03 after `student-question-views` archives.
  - **Resolved 2026-11-13 (Keith):** the dashboard change archived first and SD-02 is amended here. The SF-03/DR-03 reconciliation moves to `student-question-views`, which already modifies SF-03, so this change archives without waiting for it.
- **Open:** Darryl reviews the new student route as team reviewer. The change does not touch his files.
