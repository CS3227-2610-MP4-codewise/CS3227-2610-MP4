# Proposal B (independent, Plan subagent, Sonnet)

This is the subagent's final report, kept verbatim. It is model output and has not been verified. Line references are against `64a9159`. There were three independent agents with identical prompts, and none saw another's output.

---

**Proposal: smallest first PR for SQ-01 (client only, src/web/student/)**

**1. Scope**
In this PR:

- SQ-01 and UI-04/07: three tabs, with the editor panel kept mounted while hidden.
- SQ-02: native "Attempt" select, newest first, with the "Feedback released" marker, "Show older attempts" and the latest attempt as default.
- SQ-03: read-only submitted source with time, attempt ID and pinned version.
- SQ-04: feedback scoped to the current question (tasks 2.1, 2.2 (no URL), 2.3 (no URL), 3.1).
- UI-05, partly: Previous/Next keep the selected tab.

Deferred, each named:

- SQ-05 and tasks 1.1/1.2 (URL `view`/`attempt`, popstate). The selection lives in `Workbook` state, so reload and Back lose it.
- SQ-06 and tasks 4.1/4.2. There is no pinned-publication positioning, no earlier-version clamp and no Attempt summary. The last Next stays "Review assignment" in historical tabs, which UI-05 says it should not. I'll keep `AttemptView` as-is for task 4.2.
- SQ-07 and task 5.1 (overview link).
- Task 3.2 (SF-05 version kept across questions, refetch per question). The release version stays per `AttemptFeedback` mount.
- Heads-up: the selected attempt's pinned version can differ from the route's version. In that case the PR shows a notice, "Submitted against an earlier version; question view for it arrives with SQ-06". It never shows a mismatched answer.

**2. Edits**

- `Workbook.tsx` (about +45/-25):
  - `TABS` (:919) becomes `work|submitted|feedback`; the `tab` type (:349, :929) widens.
  - Add `attemptId: string|null` state; null means the latest attempt. It replaces `openAttempt` (:350).
  - `commit` (:400): drop `setTab('work')` so Next keeps the view.
  - `go` (:418): drop the `tab==='work'` flush guard, so a pending save is always flushed.
  - Line :740: remove `tab === 'work' &&` so the editor stays mounted under `hidden`.
  - Panels (:735-856): the two attempt panels become `<AttemptViews view=… question={question}>`, rendered only when active.
  - `onViewAttempt` (:691): set `tab='submitted'` and `attemptId`.
- `Attempts.tsx` (+~150): add `AttemptViews`.
  - It reuses the history/paging/`Load`/`kindOf` code from `AttemptsPanel` (:24-170).
  - It adds a native `<select>` whose options show the time only, not "Attempt k", because `items.length - index` misnumbers once paged (:100).
  - It loads the attempt and pinned publication as `AttemptView` does (:174-190).
  - `submitted` renders the existing `dl` meta plus the source `<pre class="cw-wb-attempt-source">` for the answer matching `question.questionVersionId`.
  - `feedback` renders `<AttemptFeedback questionVersionId>`.
  - `AttemptsPanel` and `AttemptView` stay exported, which keeps `Feedback.dom.test.ts:181` unchanged.
- `Feedback.tsx` (+~20): optional `questionVersionId`.
  - Filter `attempt.answers.map` (:180) and `match.unavailable` (:~290) by question.
  - `matchAnnotations` still runs on the whole attempt, so SF-04 is unchanged.
  - Add a "no released feedback for this question in this version" line.
- `workbook.css` (+~15): `.cw-wb-tabs` (:64) goes to `repeat(3,1fr)`, with labels wrapping at 320px. Add selector spacing. No new tokens.
- No change to `model.ts` or any other file.

**3. Sketch**

```
[Working copy | Submitted attempt | Released feedback]
Attempt [ Submitted 10 Nov 10:00 · Feedback released v ] [Show older attempts]
Submitted 10 Nov · attempt-9 · pinned v1   (read only)
 1 | total = 0 ...                 (feedback tab: criteria, marked lines, observations)
------------------------------------------------------------
[Previous question]  Question 2 of 5  [Next question]
```

**4. Tests**

- Migrate `Workbook.dom.test.ts:1082-1135`, the two tests that use "Submitted attempts" and "Open attempt".
- New cases:
  - arrow keys across three tabs
  - the editor textarea node is identical after a round trip, with no PUT or POST
  - default latest attempt, and selecting an earlier one
  - Next keeps the tab
  - a mismatched-version notice with no source shown
  - empty history
- `Feedback.dom.test.ts`: two-question release scoped per question; a question with no feedback.

**5. Risks**

1. The hidden editor stays mounted (`PrismEditor` is under a `hidden` panel). Focus and save timers must still behave, so check the conflict-window focus path (`focusEditorNext`) and the `go()` flush change.
2. The attempt state is not in the URL, so reload resets it. The earlier-version notice is a visible gap until SQ-06. The history refetch on each tab entry is cheap but deviates from design Decision 2 ("history stays in memory").
