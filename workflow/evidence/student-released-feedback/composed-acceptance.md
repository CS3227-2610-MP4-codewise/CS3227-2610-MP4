# Composed local acceptance: student-released-feedback (task 5.4)

Requirement IDs: SF-01–SF-07, AUTH-01–03, C-REL. Run on 2026-11-12 by Keith in a browser.

- **Environment:** local only, main checkout, `npm run build && npx wrangler dev --env development --port 8787`. This is the plain Worker: real `D1SubmissionCatalog` and `studentReleasePort`, no connected-preview sample port.
- **Data:** local D1 under `.wrangler/state`, with real local Firebase sign-in. Synthetic assignment content only.
- **Revision:** `0c8b38b` on `keith/student-released-feedback` (PR #32). Staging and production were not touched.

## Setup

Course **Local workflow test** (`course_local_workflow`) with two real local accounts (identities omitted):

- **Account A:** Instructor and Student in the course (dual-role).
- **Account B:** Student only.

Instructor A republished "Assignment 1" with a future deadline. Student B submitted attempt `81ae4c9e-7346-4e92-9d1e-5364e1771f39` (2 answers, 2026-11-12T15:27:59.078Z).

## Recorded state

Read from local D1 after the run. These rows are recorded data, not only Keith's report.

| Audit (time, UTC)   | Action                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| 15:29:26            | create assessment                                                      |
| 15:31:13 – 15:31:28 | save, approve                                                          |
| 15:31:34            | **release v1**                                                         |
| 15:35:06 – 15:35:15 | save, approve                                                          |
| 15:35:20            | **release v2** (v1 superseded)                                         |
| 15:38:54 – 15:43:13 | save, save, approve                                                    |
| 15:43:21            | **release v3**                                                         |
| 15:44:25            | **withdraw v3** while current (current cleared; v1 and v2 not revived) |
| 15:46:30 – 15:46:40 | correction, approve                                                    |
| 15:46:45            | **release v4** (current)                                               |
| 15:52:28            | **withdraw v1** while historical (v4 stays current)                    |

Final head: `current_release_version` 4, `maximum_release_version` 4, `availability_revision` 7; withdrawals {1, 3}.

The expected student version list is therefore: v4 current, v3 withdrawn, v2 replaced, v1 withdrawn.

## Scenarios

| #   | Scenario (tasks.md 5.4)                                                                            | Outcome                                                                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Submit; instructor releases v1; student views                                                      | As expected (Keith's report); release recorded above                                                                                                                                                                                                                                                                                   |
| 1b  | Saved but unreleased draft: student sees "not released yet", no draft scores                       | As expected (Keith's report)                                                                                                                                                                                                                                                                                                           |
| 2   | Correction released (v2): v2 current, v1 replaced                                                  | As expected (Keith's report); recorded above                                                                                                                                                                                                                                                                                           |
| 3   | Withdrawals                                                                                        | Done as v3 withdrawn while current (no older version revived; a correction then released as v4) and v1 withdrawn while historical (v4 stays current). As expected (Keith's report); recorded above. The script's literal order (withdraw v1, then v2) was not followed; both paths, historical and current withdrawal, were exercised. |
| 4   | Student membership revoked during viewing (local SQL `active=0` on B's Student row), then restored | As expected (Keith's report). Revocation was a local SQL update, not the instructor removal flow; B's Student membership is active again (checked).                                                                                                                                                                                    |
| 5   | Second student opens the first student's attempt (A as Student requests B's attempt feedback API)  | As expected (Keith's report): uniform 404                                                                                                                                                                                                                                                                                              |
| 6   | Dual-role account uses both workspaces                                                             | As expected (Keith's report)                                                                                                                                                                                                                                                                                                           |

Keith's report: "there are no functional issues that I have noticed." Screenshots, request logs and response bodies were not captured. Rows marked "Keith's report" rest on that report; the audit and head rows above are recorded data.

## Repairs

None needed.

## Not covered

- Staging and production; the CPU-time check (task 6.3).
- The instructor's real membership-removal flow (SQL was used).
- More than two accounts.
- The same scenarios are covered by automated tests against the real producer on local D1: `src/server/student/release-port.test.ts` and `release-conformance.test.ts`.

## Follow-up raised during acceptance

Keith observed that feedback is reachable only through Submitted attempts → Open attempt, and that the attempt view lists every question while the workbook focuses on one. `docs/ui/design.md` UI-04 calls for per-question Working copy / Submitted attempt / Released feedback views.

**Keith decided (2026-11-12) to address this in a separate follow-up change**, not in this one. The follow-up covers per-question Submitted and Feedback views with an attempt selector and an overview entry point. The current UI remains functionally accepted (task 4.4).
