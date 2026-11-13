# Proposal C (independent, Plan subagent, Sonnet)

This is the subagent's final report, kept verbatim. It is model output and has not been verified. Line references are against `64a9159`. There were three independent agents with identical prompts, and none saw another's output.

---

**Proposal: three per-question views, first PR (client only, `src/web/student/`)**

**1. Scope**

- IN: SQ-01 (3 tabs; editor stays mounted). SQ-02 minimum: native "Attempt" select, newest first, "Feedback released" marker, "Show older attempts", latest as default, no-attempts state. SQ-03. SQ-04 filtered to the current question. Previous/Next keep the view and attempt (UI-05).
- DEFERRED, each named:
  - SQ-05 and tasks 1.1/1.2: no `?view=&attempt=`. The selection is Workbook state. Reload returns to Working copy; Back/Forward changes the question only.
  - SQ-06 and tasks 4.1/4.2: no pinned-publication position and no Attempt summary. If the attempt has no answer for this question's `questionVersionId`, the panel says "Submitted against a different version; this question is not in it". It never falls back to other data. On the last question in a historical view, Next reads "Back to working copy", so it never invites submitting a snapshot.
  - SQ-07 / 5.1: overview link.
  - Task 3.2 / SF-05 (modified): the chosen release version resets when the question changes.
  - Design Decision 2: history and attempt are refetched on re-entry, not kept in memory.

**2. Edits**

- `Workbook.tsx` (~60 lines).
  - Line 349: `tab` becomes `'work'|'submitted'|'feedback'`, plus `attemptId` state.
  - Line 400: `commit` no longer calls `setTab('work')`, except for target `'review'`.
  - Line 418: the flush stays tied to `tab==='work'`.
  - Line 740: change `{tab==='work' && item && …}` to `{item && …}`. It currently unmounts the editor while hidden, so this is the mount fix.
  - `TABS` (line 919) gets 3 entries. Replace the attempts panel (838–855) with `{tab!=='work' && <AttemptViews view={tab} …/>}`. That is one component instance, so history survives switching between the two historical tabs.
  - Line 692: `onViewAttempt` sets `tab='submitted'` and `attemptId=id`.
  - Footer (line 859): pass `finalLabel` and `onNext` for the historical case.
- `Attempts.tsx` (~+120/−90). `AttemptsPanel` becomes `AttemptViews`.
  - Reuse the history effect (lines 52–73) and the `AttemptView` load effect (lines 150–171).
  - Render the selector, then the read-only source block (reusing the `cw-student-meta` and `cw-wb-attempt-source` markup) or `<AttemptFeedback questionVersionId key={questionVersionId}>`. The `key` forces a refetch per question (SF-02).
  - Delete the list UI and "Back to submitted attempts".
- `Feedback.tsx` (~+25). Add an optional `questionVersionId` prop.
  - Filter `attempt.answers.map` and `match.unavailable` by it. `matchAnnotations` still runs on the whole attempt.
  - Add the "no released feedback for this question in this version" state.
- `workbook.css` (~3 lines): `.cw-wb-tabs` becomes `repeat(3,1fr)` (line 64), with `min-width:0` and wrapping at 320px. Plus a small select style that reuses `.cw-fb-version`.
- `model.ts`: no change.

**3. Sketch**

```
[Working copy][Submitted attempt][Released feedback]   <- cw-wb-tabs, 3 equal
Attempt [ Attempt 2 - 10/11/2026 (Feedback released) v]  [Show older attempts]
Submitted 10/11 | attempt-9 | pinned vN   (read only)
<source or AnnotatedSource + criteria for this question>
[Previous question]  Question 2 of 5  [Next question | Back to working copy]
```

**4. Tests**

- Migrate `Workbook.dom.test.ts` 1084–1135 (tab name "Submitted attempts", Open-attempt flow, "Back to submitted attempts").
- Migrate `Feedback.dom.test.ts` 18 and 179–190 (`AttemptsPanel` import) to `AttemptViews`.
- Add tests for:
  - keyboard and click selection across 3 tabs;
  - editor text and save state unchanged after a round trip, with no PUT or POST on a view switch;
  - default latest attempt, earlier-attempt pick, older-page append, no attempts;
  - per-question filtering with no cross-question markers, and the empty-question state;
  - a refetch on Next in the feedback view;
  - a different-version attempt showing the notice;
  - the Next label on the last question.

**5. Risks**

1. The editor unmount (line 740). Mounting it while hidden changes focus and timer behaviour, so the conflict-window and `focusEditorNext` tests need care.
2. Interim honesty. Without SQ-05/06, a version-mismatched attempt shows nothing for some questions. Selection is lost on reload. Both must be stated in the PR description and the UI review.
