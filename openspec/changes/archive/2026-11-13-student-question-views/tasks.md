# Tasks

Owner: Keith. Design revision: `warm-workbook-v1`. All work is in Keith-owned `src/web/student/`. No server, shared DTO, migration or dependency change, and no Darryl writer window is needed. Implementation starts only on a later apply instruction.

## 1. Route and address state

- [x] 1.1 Extend `parseStudentRoute` and `studentPaths.work` in `model.ts` with the closed `view`/`attempt` query (design Decision 1). Bad or unknown values fall back to Working copy for the same question. **Verify:** `model.test.ts` cases cover a valid submitted/feedback route, `view` without `attempt`, `attempt` without `view`, an unknown view, a malformed or over-long ID, repeated keys, an extra key, position bounds and the round-trip of paths. [SQ-05]
- [x] 1.2 Wire popstate and push/replace semantics in `Workbook.tsx`: a view or attempt change pushes, latest-attempt resolution and position clamping replace. **Verify:** DOM tests cover reload restore, Back/Forward between views, and a `view` with no attempt resolving to the latest attempt with the URL replaced. [SQ-05, UI-05]

## 2. Answer views and attempt selector

- [x] 2.1 Replace the Work/Submitted attempts tabs with Working copy / Submitted attempt / Released feedback, reusing the existing tablist pattern. Keep the editor panel mounted while it is hidden. **Verify:** DOM tests cover arrow-key and click selection with synchronized `aria-selected` and panel, unchanged editor text and save state after a round trip through both historical views, and no save or submit request caused by a view switch. [SQ-01, UI-04/07]
- [x] 2.2 Add the shared attempt context: history paging, a native "Attempt" select with time and the "Feedback released" marker, the latest attempt as default, and one in-memory attempt plus pinned-publication load per selection. **Verify:** DOM tests cover the default latest attempt, selecting an earlier attempt, "Show older attempts" appending without changing the selection, the no-attempts empty state with its return action, a refetch after submit, and network and session failure states. [SQ-02, SW-08, SF-07]
- [x] 2.3 Implement the Submitted attempt panel: the current question's source read only, with server time, attempt ID and pinned version. **Verify:** DOM tests cover the source matching the selected attempt and question, the source unchanged after working-copy edits, no editor or save controls, and a forged or foreign attempt ID in the URL showing only "This is not available to you." with no metadata. [SQ-03, SQ-05, AUTH-02]

## 3. Per-question feedback

- [x] 3.1 Add question scoping to `AttemptFeedback`: match against the whole attempt, then filter criteria, annotations and unavailable evidence by `questionVersionId`, with a "no released feedback for this question in this version" state. **Verify:** `Feedback.dom.test.ts` and `feedback-model.test.ts` cover a two-question release filtered per question, no cross-question markers, a question absent from the release, SF-04 mismatches still listed as unavailable only on their own question, and the existing SF-03/04/06 cases still passing. [SQ-04, SF-03, SF-04]
- [x] 3.2 Lift the chosen release version to the attempt context. Refetch the summary (and any non-current version) on every question shown in the feedback view, and reset the version with an announcement when it is no longer listed. **Verify:** DOM tests cover replaced v1 kept on Next, a refetch per question (request count), a withdrawal between questions resetting to the tombstone without showing an earlier release as current, stale with retry, and the source visible in every state. [SF-02, SF-05, SF-06, SQ-04]

## 4. Historical navigation and summary

- [x] 4.1 Drive the position, question pane and Previous/Next from the selected attempt's pinned publication in historical views, clamping with a URL replace and showing the earlier-version note. **Verify:** DOM tests cover Next keeping the view and attempt, both panes updating together, the heading receiving focus with the announcement text, a 3-question earlier-version attempt opened from a 5-question route, a return to Working copy restoring the route publication, and a stale response after fast navigation being ignored. [SQ-06, UI-05]
- [x] 4.2 Replace the last-question Next with Attempt summary in historical views, re-using the all-question read-only page with "Back to question N" and no submit or Review action. Leave the Working copy's Review assignment unchanged. **Verify:** DOM tests cover the label on the last question, the summary content for the selected attempt, the absence of submit and Review controls, and the Back return. Update the `Attempts.tsx` header comment. [SQ-06, SW-08]

## 5. Overview entry point

- [x] 5.1 Add the latest-attempt link to the assignment overview, with the label chosen from `feedbackReleased`, linking to question 1 in the matching view for that attempt, and hidden on empty or any failure. **Verify:** `StudentWorkspace.dom.test.ts` covers no attempts, the latest attempt without and with a release, a history network failure and 401 leaving the overview intact, abort on navigation, and Open my work unchanged. [SQ-07, SD-03]

## 6. Verification and handoff

- [x] 6.1 Run `npm run check` and strict OpenSpec validation (`openspec validate student-question-views --strict`). Review the final diff for private-field exposure, version pinning, stale results, and URL IDs that never bypass server authority. Record actual results in `workflow/evidence/student-question-views/`. [SQ-01–07, SW-08, SF-02–06]
- [x] 6.2 Complete `workflow/templates/ui-review.md` for the three views, the selector, the summary and the overview link, with real keyboard, focus and announcement checks, 44px targets, light/dark, 320/768/1024/1440px and 200% zoom. Use local synthetic attempts with released, replaced, withdrawn and earlier-version cases, and record Keith's manual acceptance and any untested combinations. Screenshots do not complete the functional tasks. [UI-04/05/06/07/08, warm-workbook-v1] *Verified 2026-11-13: Keith manually checked 320/768/1024/1440 px, 200 % zoom, keyboard operation and dark mode with no issues found; see `workflow/evidence/student-question-views/ui-review.md`.*
- [x] 6.3 Write `workflow/handoffs/student-question-views.md` from the template, with requirement IDs, owned files, exact revisions, verification outcomes, limitations and next owner, and checkpoint `logs/keith/student-question-views.md`. [DEV-02/04]

## Workflow follow-up

- Before archiving, reconcile this change's SF-03 delta with DR-03's `Score: X / N` format (`student-display-conventions`). This was moved here from `student-dashboard-refinements` (Keith, 2026-11-13).
- Open the PR with SQ/SW-08/SF IDs and the design revision. Darryl reviews it as the team reviewer.
- After the merge, run a hosted staging check through the reviewed release workflow, then archive the change. Do not archive before acceptance.
