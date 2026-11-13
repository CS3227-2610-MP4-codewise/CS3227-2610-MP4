# Handoff: student-dashboard-refinements

**Status:** implementation complete and accepted by Keith for the MVP, as he reported it. All tracked tasks are done: 10 of 10 after this handoff. The PR is open for Darryl's review. Hosted staging and archiving follow the merge.

- **Human owner:** Keith (student features). Reviewer: Darryl, team reviewer of the new student route.
- **Agent role / model / configuration:** Claude Code root Coordinator (`claude-opus-5-5`), one session, tracker run `0aa70085` (Coordinator role). No agents were spawned and there was no independent agent review. The run was started for increment `student-question-views` and was not switched, so this work's checkpoints are in `logs/keith/student-question-views.md` (see Resource measurements).
- **Requirement IDs and OpenSpec change:** DR-01–03 (`student-display-conventions`), AS-01–03 (`student-assignment-status`). Related: SD-02/04/06, SF-03, SF-07, AUTH-02, UI-01/04/07/08 (`docs/ui/design.md`, `warm-workbook-v1`), DEV-02/04. Change: `openspec/changes/student-dashboard-refinements` (strict-valid).
- **Input versions:** base `main` at `bb990cd`. Branch `keith/student-dashboard-refinements`. The commit is the PR head.

## Owned files

All of these are Keith's files. No Darryl file, shared stylesheet, migration or dependency changed.

- `src/web/student/`:
  - `model.ts`: `formatDeadline` (Singapore time), `formatPoints`, and the `status` client call;
  - `StudentWorkspace.tsx`: tags, row layout and rubric points;
  - `Workbook.tsx`: question-pane points;
  - `Feedback.tsx`: `Score: X / N`;
  - `student.css` and `workbook.css`;
  - tests.
- `src/server/student/`:
  - `work.ts`: `assignmentStatus`;
  - `http.ts`: the new route;
  - `README.md`;
  - `status.test.ts`.
- `src/shared/student-work.ts`: the closed `assignmentStatusPageSchema` and `assignmentStatusIds`, plus `src/shared/student-status.test.ts`.
- Unchanged: `src/shared/student-assignments.ts`, the reviewed SD list contract.

## What changed

- **Times (DR-01):** every student time is the server instant converted to Asia/Singapore, shown as `DD/MM/YYYY, h:mm:ss am/pm` with no zone label. The output does not depend on the viewer's locale or time zone. ISO `datetime` attributes are kept.
- **Points (DR-02):** rubric guidance shows `(N points)` (`(1 point)` for 1), even when the minimum is non-zero. **Scores (DR-03):** the feedback table shows `Score: X / N`.
- **Status tags (AS-01–03):** the new route is `GET /api/student/courses/:course/assignment-status?id=…` (repeated `id`, 1–50).
  - Each row gets at most one tag, in priority order: Feedback released (the latest attempt has a current release), then Submitted, then Due soon (no attempt, deadline in the next 24 h by the server clock, not passed).
  - The client requests status after the list loads. A failed status read shows no tags and no error, and the list stays as it is.
- **Row layout (Keith, 2026-11-13):**
  - Assignment rows follow the instructor row pattern: title, deadline and tag on the left, the Open action at the far right.
  - Course rows put View assignments at the far right.
  - A long-title collapse defect was fixed: the Open link wraps within 16rem.

## Decisions

| Decision                                                                                                                                                    | By / date                          | Where               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------- |
| Student times pinned to Singapore time, no label, 4-digit year. Instructor screens use machine-local time; left unchanged and reported to Darryl as an FYI. | Keith, 2026-11-13                  | proposal Decision 1 |
| Always `(N points)`; `Score: X / N`                                                                                                                         | Keith, 2026-11-13                  | proposal Decision 2 |
| One tag per row; priority Feedback released > Submitted > Due soon                                                                                          | Keith, 2026-11-13                  | proposal Decision 3 |
| Split from `student-question-views`                                                                                                                         | Keith, 2026-11-13                  | proposal Decision 4 |
| Separate Keith-owned status endpoint; SD list DTO unchanged                                                                                                 | Keith, 2026-11-13                  | proposal Decision 5 |
| Instructor row pattern for student course and assignment rows                                                                                               | Keith, 2026-11-13                  | proposal Decision 6 |
| Repeated `id` query instead of comma-separated `ids`, because contract IDs may contain commas                                                               | Implementer during apply, recorded | design Decision 3   |

## Verification (actual results)

- `npm run check`, latest: **exit 0**, 66 files passed and 2 skipped, 771 tests passed and 2 skipped. One earlier run hit a flaky test this change doesn't touch (`workflow/ai-quality-evaluation/ledger.test.ts`, SoCLaaS transport; in isolation it failed once and passed twice).
- `openspec validate student-dashboard-refinements --strict`: valid.
- The tests and per-requirement coverage are listed in [verification.md](../evidence/student-dashboard-refinements/verification.md). Status tests run on local D1 with the `FakeReleasePort` fixture. They are fixture runs, not real-producer integration.
- **UI (task 4.2):** Keith checked the running app locally and accepted it as "suitably fine for an MVP", as he reported it. The UI-review template was not filled in, so the viewport, zoom, theme, screen-reader and time-zone matrix is unverified.
- **Long-title fix:** checked with headless Edge static renders at [1280px](../evidence/student-dashboard-refinements/screenshots/long-title-rows-1280.png) and [320 / 390 / 700px](../evidence/student-dashboard-refinements/screenshots/long-title-rows-320-390-700.png). Keith then accepted it.

## Security findings / unresolved defects

- **Self-review, no findings left open:**
  - own-data-only SQL (the course guard in both statements, attempts filtered by user and course);
  - out-of-course IDs omitted, so nothing can be enumerated;
  - the closed response carries no attempt IDs, times or scores;
  - `no-store`, and only the server clock is used.
- **Review fix:** tags are cleared on any list failure.
- **Known gap:** the instructor screens show machine-local time while students now see Singapore time. They read the same on a Singapore-configured machine. This is Darryl's area.

## Resource measurements

Tracker run `0aa70085` (Claude Code, root only). The cumulative bounded-increment snapshot at the `long-title-fix-01` checkpoint was:

- input 25,011,086 tokens (cache reads 24,748,365);
- output 107,861 (reasoning 18,889);
- total 25,118,947.

That increment also includes the `student-question-views` planning turns, so it is not a per-change total. The current turn is provisional until the next sync. Request costs are not recorded.

## Blockers and next actions

1. **Darryl:** review the PR, especially the new route in `http.ts` and `work.ts`, and the FYI about instructor times.
2. **Keith:** after the merge, run the hosted staging check through the reviewed release workflow.
3. **Archive order:** archive `student-assignment-dashboard` first. Then amend SD-02's "UTC-labelled deadline" in this change to DR-01. Reconcile SF-03's score wording once `student-question-views` archives. Then archive this change.
4. **Recording:** pause or stop run `0aa70085`, or switch increments, before the next feature, so the logs stay per-change.

- **Next owner:** Darryl (review), then Keith (staging and archive).
- **Independent review outcome:** pending (Darryl).
