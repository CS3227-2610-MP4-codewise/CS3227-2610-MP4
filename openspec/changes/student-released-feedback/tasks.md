# Tasks

Planning is complete, but that does not mean implementation or review is. Every task starts unchecked. The human owner is Keith. Darryl is the C-REL producer owner: he grants Keith's writer window for the files named in 1.1 and reviews Keith's producer change. Design revision: warm-workbook-v1. Implementation starts only on a later apply instruction.

## 1. Gates and shared writer window

- [x] 1.1 Get Darryl's agreement to the `attemptReleases` port method (design D1: name, batch bound 1..50, `null` meaning no release, all-or-nothing authorization, version list including superseded and withdrawn). Also get his grant of a Keith writer window for `src/server/instructor/ports/contracts.ts`, `src/server/instructor/assessments/service.ts` (plus `repository.ts` and the producer test file if needed) and the `studentHandler` composition line in `src/server/index.ts`, with Darryl as reviewer. **Verify:** `workflow/Ownership.md` and `workflow/IntegrationContracts.md` C-REL record the dated grant, Keith as sole writer of each named file for this window, and Darryl as reviewer; specs and design are updated if Darryl reshapes the method. No edit to those files happens before this. [SF-01, SF-02, SF-05, C-REL]
- [x] 1.2 Record Keith's consumer acceptance of K5 and P4 in `workflow/IntegrationContracts.md` C-REL (history shown labelled as replaced, tombstones only, no revival, currentness gates every display, no consumer cache). **Verify:** the "Keith consumer agreement pending" line is replaced with a dated Keith acceptance that links this change. [SF-02, SF-05, REL-03/04/06]
- [ ] 1.3 Record the tracker attribution for this increment (run `student-released-feedback`) and the apply instruction in `logs/keith/student-released-feedback.md`. **Verify:** `tracker.py status` shows the run and role; unavailable telemetry is recorded as a gap. [DEV-02/04]

## 2. Feedback contract and fake producer

- [ ] 2.1 Add `src/shared/student-feedback.ts`: closed `schemaVersion 1` schemas for the feedback summary (`none`/`released`/`withdrawn`, currentness, version list, optional current release) and the history-row `feedbackReleased` flag. Embed Darryl's `releaseSchema`, `withdrawnSchema` and `currentnessSchema` unchanged. **Verify:** schema tests reject unknown fields, a `release` present with state `none`, and private keys (reason, approval, reviewer); round-trip the public fixtures in `workflow/assessment-preview/public-fixtures.ts`. [SF-01, SF-05]
- [ ] 2.2 Add the `StudentReleasePort` type and a fake in `src/server/student/test-fixture.ts`, built from the C-REL public fixtures. It supports the v1 → v2 → withdraw-v1 → withdraw-v2 sequence and an injected race between read and re-check. **Verify:** fake self-tests reproduce the K5 example sequence states exactly. [SF-02, SF-05, SF-08]

## 3. Student feedback routes

- [ ] 3.1 Add `GET /api/student/attempts/:attemptId/feedback` and `.../feedback/:releaseVersion` to `studentHandler` (design D2): session, then the guarded own-attempt read, then `attemptReleases`, then `getAuthorized`, then `assertCurrentRelease` and the currentness re-check. Without a port, respond 503. **Verify:** integration tests on local D1 with the fake cover no session (401); another student, an instructor, a revoked member and foreign or unknown IDs getting the same 404 with no producer call; none, released, superseded and withdrawn; a race returning 409 `STALE_FEEDBACK`; a mismatched assessment or attempt ID not shown as current; `no-store`; and bodies with no draft or private keys. Document the routes in `src/server/student/README.md`. [SF-01, SF-02, SF-05, REL-01/02, AUTH-02]
- [ ] 3.2 Add `feedbackReleased` to the attempt-history rows with one batched `attemptReleases` call per page. **Verify:** tests cover a mixed page (only the current release flagged), withdrawn-only and stale rows false, the port absent giving false with the list still 200, and exactly one producer call per page. [SF-07]
- [ ] 3.3 Measure D1 reads per feedback open and per history page on local D1 with the fake and, after 5.2, with the real producer. **Verify:** `workflow/evidence/student-released-feedback/read-cost.md` records the counts and timings. [SF-07, OPS-01]

## 4. Attempt-view feedback UI

- [ ] 4.1 Add `src/web/student/feedback-model.ts`: annotation matching against the loaded attempt (design D4) and the panel state model (loading, none, released, withdrawn, stale, expired, network, unavailable). **Verify:** unit tests cover an exact match, an excerpt mismatch, an end line beyond the source, a start line of 0, a foreign answer ID, a question mismatch, a final LF, multi-line ranges, and every state transition including the 401 path. [SF-04, SF-06, UI-06/08]
- [ ] 4.2 Render the feedback panel in `AttemptView`: per-question criterion table, numbered source with letter-marked annotation buttons, an equivalent Observations list, the selected note with a live announcement, the unavailable-evidence list and the version selector with replaced and withdrawn entries. Fetch on mount, with no cache. **Verify:** DOM tests cover the earlier-attempt case (source is that attempt's, not the draft or a later attempt), keyboard selection keeping focus and announcing, unmatched annotations marking no line, a withdrawn current showing a tombstone and no older release as current, a remount refetching, and the working copy unchanged. [SF-02–SF-06, SUB-04, UI-04/06/08]
- [ ] 4.3 Show the "Feedback released" text marker on history rows. **Verify:** a DOM test for a mixed history shows the marker only on flagged rows and no scores. [SF-07, SUB-04]
- [ ] 4.4 Complete `workflow/templates/ui-review.md` for the feedback panel: keyboard path, focus and announcements, 44 px targets, 320/768/1024/1440 px, 200% zoom, light and dark, contrast, reduced motion and wrapped-line numbering, with screenshots of every SF-06 state, plus Keith's manual acceptance. **Verify:** the filled review and screenshots are in `workflow/evidence/student-released-feedback/`, with untested combinations listed. Screenshots do not complete the authorization or integration tasks. [UI-01/04/06/07/08, warm-workbook-v1]

## 5. Composition and conformance

- [ ] 5.1 After 1.1, Keith implements `attemptReleases` in `AssessmentService.consumer` within the granted window. It reuses the existing `authorize` for every attempt and uses one repository read for the attempt → assessment and release-version mapping. **Verify:** new producer tests beside Darryl's, on local D1, cover the batch bound (0 and 51 rejected), duplicate IDs rejected, one foreign attempt failing the whole batch, a revoked member, `null` for no assessment and for assessed-but-unreleased, and a version list including superseded and withdrawn versions after the K5 sequence. All of Darryl's existing assessment tests still pass. [SF-01, SF-05, C-REL]
- [ ] 5.2 Get Darryl's review of the 5.1 producer change, then compose `AssessmentService.consumer` into `studentHandler` in `src/server/index.ts` (real producer only, never loopback samples). **Verify:** Darryl's review outcome is recorded in the handoff (an agent review is recorded separately); a composed local request returns 200 for an own released attempt and 404 for a foreign one. [SF-01, C-REL, DEV-02]
- [ ] 5.3 Run the C-REL release conformance suites (`workflow/contracts/instructor-contracts.ts`, `workflow/assessment-preview/conformance.ts`) from Keith's consumer against the real composed producer on local D1. **Verify:** the outcomes and exact producer and consumer revisions are in `workflow/evidence/student-released-feedback/conformance.md`; fixture-only runs are labelled as such. [SF-08, C-REL]
- [ ] 5.4 Run a composed local acceptance with real SH-AUTH, SH-ID, SH-SUB and SH-REL:
  1. Submit, then the instructor releases v1, and the student views it.
  2. The instructor releases correction v2, and the student sees v2 current and v1 replaced.
  3. The instructor withdraws v1, then v2.
  4. The student's membership is revoked during viewing.
  5. A second student tries the first student's attempt.
  6. A dual-role account uses both workspaces.

  **Verify:** the outcomes, repairs and revisions are in `workflow/evidence/student-released-feedback/composed-acceptance.md`. [SF-01–SF-07, AUTH-01–03]

## 6. Final checks and handoff

- [ ] 6.1 Run `npx openspec validate student-released-feedback --strict`, `npm run check` and a privacy and security review (no draft or private fields in DTO, DOM or errors; authority before producer calls; no cache; no execution path). **Verify:** the outcomes are in the handoff and log, with any other agent's review recorded separately from Keith's or Darryl's. [SF-01–SF-08, DEV-02/04]
- [ ] 6.2 Write `workflow/handoffs/student-released-feedback.md` from the template with the requirement IDs, owned files, exact revisions, checks, blockers and next owner. **Verify:** the handoff links the evidence and log, and Darryl's review status is stated honestly. [DEV-02]
