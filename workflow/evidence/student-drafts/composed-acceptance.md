# Composed local acceptance: student-drafts (tasks 6.2 verify and 7.1)

Local only: main checkout, `wrangler dev --env development --port 8787` (plain Worker, no connected-preview sample port), local D1 under `.wrangler/state`, real local sign-in. Synthetic assignment content only (SW-10).

## Setup (2026-11-12)

- Owner account made Instructor of `course_local_workflow` ("Local workflow test") with `npm run dev:workflow -- --setup-owner-course` (the existing operator course plan).
- The same account enrolled as Student in that course by a local-only SQL insert into `course_memberships`, bypassing the invitation flow. This makes one dual-role account; the invitation path is not exercised by this setup.

## 6.2 C-SUB producer: student submit loaded by the instructor workflow

Revision: `1a5b924` (`D1SubmissionCatalog` composed in `src/server/index.ts`).

| Step | Expected | Outcome (Keith's report) |
|---|---|---|
| Instructor creates and publishes an assignment with a future deadline | publication visible to the student | as expected |
| Student opens the workbook, writes answers, reviews and submits | attempt committed, attempt ID shown under Submitted attempts | as expected |
| Student edits an answer afterwards without submitting | working copy changes, attempt does not | as expected |
| Instructor opens Assessments for that publication | the student is listed; opening shows the same attempt ID and the submitted source, not the later edit; nothing labelled sample | as expected |

Keith reported: "Accepted. All steps show the intended behaviour". Screenshots, attempt IDs and request logs were not captured; this row is Keith's report, not recorded evidence.

## 7.1 scenarios (2026-11-12, revision `a59cb28`, same setup)

| Scenario | Expected | Outcome (Keith's report) |
|---|---|---|
| Two tabs on one question: save in A, edit in B | B opens the conflict window; Keep mine saves on top of A's revision; Use saved takes A's text | as expected |
| Instructor republishes while the student edits | newer-version notice appears, the student's text is untouched; Move my work copies it onto the new version | as expected |
| Student membership deactivated during editing (local SQL `active=0`), then restored | next save reports the work is no longer available, text stays on screen; access returns after `active=1` | as expected |
| Submit near a 2–3 minute deadline | submit just before succeeds; just after reports the deadline passed while editing continues | as expected |
| Submit with the browser offline, then Try again online | error first; exactly one new attempt after retry | as expected |
| Dual-role account switching Student/Instructor | no student data on instructor pages or the reverse; permissions follow the server, not the switch | as expected |

Keith reported: "Each step works as intended". As in 6.2, screenshots, attempt IDs and request logs were not captured; the rows are Keith's report. The membership change was a local SQL update, not the instructor's removal flow. Real Firebase sign-in was used; staging and production were not touched.
