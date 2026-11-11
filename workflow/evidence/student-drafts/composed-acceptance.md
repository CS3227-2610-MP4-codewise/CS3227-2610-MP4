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

## 7.1 scenarios

Not yet run: two tabs causing a conflict, republish during editing, revocation during editing, submit near the deadline, retry after a dropped response. The dual-role account above is in place for them.
