# Proposal

## Why

Instructors can now approve and release feedback on a submitted attempt (Darryl's instructor-assessment-lifecycle, C-REL), and students can submit real attempts (student-drafts, SH-SUB). But no student can see that feedback yet. Darryl's `ReleaseReadPort` seam (`AssessmentService.consumer`) exists, but no student route, screen or consumer check uses it, and the C-REL contract records Keith's consumer agreement (K5, P4) as pending. This change adds Keith's student consumer: released feedback shown against the exact submitted attempt.

## What Changes

- Show released feedback on the existing read-only submitted-attempt view. Per question, show each rubric criterion's awarded score, its bounds and the explanation. Show annotations beside the exact submitted lines of that attempt. Never use the current working copy or a newer publication. [SF-01, SF-03, SUB-04, UI-04/06]
- Mark annotated source lines and provide an equivalent labelled observation list. Selecting either highlights the exact line range and shows the criterion, range and explanation in a proportional-text note, keeps focus on the trigger and announces the change. [SF-03, UI-06/07]
- Re-check every annotation against the attempt's own source before display: line range inside the answer and excerpt equal to those lines. An annotation that does not match is shown as unavailable evidence. It is never moved to another line. [SF-04, REL-05, UI-06]
- Show the current release and, read-only, earlier releases of the same attempt, labelled as replaced. A withdrawn release shows only a tombstone (version and time). Keith accepts P4 as consumer: no older release is revived when the current one is withdrawn. [SF-02, SF-05, REL-03/04/06, GRADE-04]
- Show only released content. A student never sees drafts, approval state, private reasons, references or AI material. With no release, the view says feedback has not been released yet. [SF-01, SF-06, REL-01/02, UI-08]
- Add Keith's student feedback routes under `/api/student/attempts/:attemptId/feedback`. They need a trusted session and own-attempt authority, return `no-store` and the closed C-REL projections, and re-check currentness before responding. There is no client or server cache. [SF-01, SF-02, SF-06, AUTH-02]
- Add a "Feedback released" marker to submission-history rows whose attempt has a current release. [SF-07, SUB-04]
- Run Darryl's reusable C-REL release conformance checks against the real composed producer from Keith's consumer side. [SF-08, C-REL]

### Decisions recorded (Keith, 2026-11-12)

| # | Decision |
|---|----------|
| 1 | **Attempt lookup.** `ReleaseReadPort` is keyed by assessment ID, but a student only knows their attempt ID. An additive port method keyed by the caller's own attempt ID will return the assessment ID, currentness and the attempt's released version numbers (or not-found). Keith writes it, and its composition, in a writer window that Darryl grants, and Darryl reviews it as the SH-REL producer owner. Only that producer method reads `instructor_assessments`; Keith's student routes do not. (Revised 2026-11-12: originally Darryl was to write it.) |
| 2 | **History.** Students see the current release plus earlier superseded releases (read-only, labelled replaced). Withdrawn versions show tombstones only. This is Keith's consumer acceptance of P4 and K5. |
| 3 | **Placement.** Feedback appears on the existing submitted-attempt view, not a separate page. History rows carry a marker. |

## Capabilities

### New Capabilities

- `student-feedback`: the student's read-only view of released assessment feedback on their own submitted attempts. It covers the authorized feedback routes, current and historical release display, source-linked annotations and their validation, tombstones, empty and stale states, and the history marker.

### Modified Capabilities

None. `student-submissions` (SW-08) keeps its attempt view unchanged. Feedback is an added panel, and SW-08's read-only and no-substitution rules still hold.

## Impact

- **Keith-owned code:** `src/server/student/` (new feedback routes and consumer checks), `src/web/student/` (`Attempts.tsx` feedback panel, observation list, marker) and a new closed student feedback response schema in `src/shared/` (a Keith-owned student file) that wraps the existing C-REL projections.
- **Darryl-owned files, Keith as writer in a granted window (gate):** an additive `ReleaseReadPort` method in `src/server/instructor/ports/contracts.ts`, its implementation and producer tests in `src/server/instructor/assessments/` (`service.ts`, plus `repository.ts` if a read is needed), and its composition into `studentHandler` in the shared `src/server/index.ts`. Darryl grants the window, agrees the method shape and reviews the change before composition. `src/shared/instructor-contracts/release.ts` is used unchanged.
- **No migration.** Keith adds no new tables and stores no copy of assessment or release data.
- **Contracts:** `workflow/IntegrationContracts.md` C-REL K5/P4 consumer status moves from pending to accepted (Keith), once Darryl confirms the port method.
- **UI:** follows `docs/ui/design.md` revision `warm-workbook-v1`, UI-04/06/07/08. Affected screen: the student submitted-attempt view and the submission-history list. Role switching grants nothing.

## Assumptions, exclusions and open items

- **Assumption:** a released version number is unique per assessment, and one assessment exists per attempt (`instructor_assessments.attempt_id` is UNIQUE).
- **Assumption:** student routes do not report or count AI involvement. Feedback is shown as instructor-released whatever its origin.
- **Excluded:** student progress (PROG-01–03) and any AI explanation of feedback, an overall assignment score or grade total (not in C-REL), notifications when feedback is released, course-level feedback summaries and instructor screens.
- **Open (gate):** Darryl's agreement to the port method's name and shape, his grant of a Keith writer window for `contracts.ts`, `service.ts` (and `repository.ts` if needed) and `index.ts`, and later his review of Keith's producer change. Until the grant, Keith builds against a fake port with the C-REL public fixtures. Fixture runs are not integration.
- **Open:** Darryl's review of the student-drafts handoff and the fingerprint/key-scope reply remain pending from the previous increment. They do not block this change.
