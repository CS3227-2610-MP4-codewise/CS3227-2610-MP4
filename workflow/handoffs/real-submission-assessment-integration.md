# C-REL integration handoff - blocked consumer composition

- Human owner: Darryl (assessment/release producer). Next owner: Darryl for the assessment boundary and Keith for the student consumer and submission producer review.
- Requirements: SUB-03/04, GRADE-02-04, AUTH-01-03; UI-04/05/06/07/08, warm-workbook-v1.
- Inspected remote main: `e5c981d0c934f062a1056fa753c812733df6b809` (confirmed through GitHub on 2026-11-12). Submission producer reviewed revision per Keith's handoff: `53c1974`; catalog normal composition: `1a5b924`. This packet records source findings, not an accepted or verified real-student C-REL implementation.

## Current behavior and blocker

`AssessmentService.consumer(request)` exposes the existing `ReleaseReadPort` (`getAuthorized(principal, assessmentId, releaseVersion)` and `currentness(principal, assessmentId)`). It checks that the submission belongs to the principal and hashes to the pinned evidence. However, normal `AssessmentWorkflow` injects `D1SubmissionCatalog`, whose `getAuthorized` only permits a current instructor; its assessment object wrapper also requires instructor course authority. A student using that exact composition cannot meet the consumer's own checks. Do not publish a student route or treat instructor `feedbackPreview` as a student consumer. A reviewed composition must support an authenticated student's own committed attempt and same-course current Student membership without weakening instructor authorization or copying submission storage. Keith owns the producer and student integration; serialize any shared API/composition edits.

The latest-per-assignment catalog listing and the submit fingerprint and key-scope rules are described in `workflow/handoffs/student-drafts.md` and `openspec/changes/student-drafts/design.md`. They differ from an earlier proposed packet; that proposal alone does not prove the merged producer is wrong. Review the exact inputs, immutable version pinning, retry/authorization and cross-version key behavior with Keith before changing their contract.

## Safe examples and reusable checks

Existing synthetic-only fixtures: `workflow/assessment-preview/public-feedback.json` and `workflow/assessment-preview/public-fixtures.ts`. Executable release conformance suite: `workflow/assessment-preview/conformance.ts`, exercised in `workflow/assessment-preview/conformance.test.ts`; C-SUB suite: `workflow/contracts/instructor-contracts.ts`, exercised by `src/server/student/catalog.test.ts`. These historical checks use isolated ports and do not prove real student composition.

Required real-composition checks: student owns attempt and has current same-course membership; other users/courses, forged IDs and revoked sessions/memberships cannot read; draft and approval-only revisions never appear; only the current released projection is exposed; correction creates a new revision/release; withdrawal returns the correct tombstone and never revives an older release; authorization and currentness are checked before cached or repeated reads; private references, audit reasons and other private fields never reach a student response. Recheck pinned submission, publication, rubric and revision IDs. Verify write revocation, CSRF, revision conflicts, approval invalidation and idempotent replay on the instructor side.

## Verification and limits

Keith reports local student submit to instructor open at `1a5b924`, without captured request IDs/screenshots; it does not establish approval/release/student-consumer acceptance. Prior producer evidence records `npm run check` passing at `53c1974` with 651 tests. This session's focused D1 suites were attempted on `e5c981d` but Miniflare could not connect to its loopback listener (`EACCES 127.0.0.1`); no D1 test pass is claimed. Full release journey, current UI manual acceptance, exact consumer revision, Keith review and independently reviewed shared writer window remain outstanding. No deployment or live provider calls were made.

