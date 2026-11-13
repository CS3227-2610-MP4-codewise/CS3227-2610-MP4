# Proposal A (independent, Plan subagent, Sonnet)

This is the subagent's final report, kept verbatim. It is model output and has not been verified. Line references are against `64a9159`. There were three independent agents with identical prompts, and none saw another's output.

---

**Proposal: smallest PR for SQ-01, replacing the Work/Attempts tabs with three per-question views**

**1. Scope**

In this PR:

- SQ-01, with tasks 2.1, 2.2, 2.3, 3.1 and the refetch part of 3.2.
- SQ-02: native selector, latest attempt by default, "Show older attempts", no-attempts state.
- SQ-03 and SQ-04.
- SQ-06 core (4.1, 4.2): Previous/Next in the historical views follow the attempt's pinned publication and keep the view. The last-question Next becomes "Attempt summary", which opens the existing all-question page.
- Needed so versions never mix.

Deferred to later PRs, each named:

- SQ-05 and tasks 1.1/1.2: the `?view=&attempt=` URL. `model.ts:67` still rejects query keys. The view and attempt live in component state, so a reload returns to Working copy. This is a visible narrowing.
- SQ-07 and task 5.1: the overview link.
- The "version reset announcement" part of 3.2 (SF-05). The version is kept across questions, and a version no longer listed falls back to the default silently.
- Task 6.2 manual UI review, until Keith runs it.

**2. Edits**

- `Workbook.tsx` (~+90/−40)
  - `tab` becomes `view: 'work'|'submitted'|'feedback'` (:349). `TABS` gets three entries (:920). The types in `Tabs` and the `onKey` arrow-key code are unchanged.
  - Drop `tab === 'work' &&` at :740 so the editor stays mounted while hidden. It is currently unmounted.
  - `commit` (:400) must stop calling `setTab('work')`.
  - `onViewAttempt` (:690) selects that attempt and sets `view = 'submitted'`.
  - Call the attempt-context hook once above the tabs, so the selection survives view switches. Replace the attempts panel (:838) with Submitted and Feedback panels.
  - Derive `viewPub = ctx.pub ?? pub` and `viewPos = min(position, viewPub.length)`. In historical views the question pane (:703-722), the footer count and Next use these.
  - `commit` clamps the pushed path to the route publication's length.
  - Add `mode 'summary'`. The footer passes `finalLabel="Attempt summary"` (`primitives.tsx:53`) in historical views.
  - Show a one-line earlier-version note.
- `Attempts.tsx` (~+60/−30): turn the history and attempt loading in `AttemptsPanel` (:35-65) and `AttemptView` into a `useAttemptContext` hook.
  - It resolves the pinned publication. A failed resolve is an error, not the current silent `null` fallback.
  - Add `AttemptSelector`, a native `<select>` labelled "Attempt" with "Submitted <time> · Feedback released". I would not number "Attempt k" (:101 `items.length - index`), because it is wrong when only some pages are loaded.
  - Export `AttemptView` with a `backLabel`.
  - Submitted panel: the existing metadata `dl` plus the read-only source `pre` for `viewQuestion`'s answer.
- `Feedback.tsx` (~+25): `AttemptFeedback` takes an optional `questionVersionId`.
  - It filters `attempt.answers` (:174) and the unavailable list to that question. `matchAnnotations` still runs on the whole attempt.
  - It adds a "no released feedback for this question" line.
  - The fetch effect (:49-60) depends on `questionVersionId`, so it refetches per question. The `setChosen(null)` reset is split to `attemptId` only. `shown` falls back when `chosen` is not in `versions`.
- `workbook.css`: `.cw-wb-tabs` columns `1fr 1fr` become `repeat(3, 1fr)` (:62-67). Allow label wrap. No new tokens.
- `model.ts` and `primitives.tsx`: no change.

**3. Sketch**

```
| Question pane | [Working copy][Submitted attempt][Released feedback] |
|  Q2 title     | Attempt [Submitted 13/11 10:00 · Feedback released v]|
|  text/rubric  | (source or feedback for Q2 of that attempt)          |
[Previous]   Question 2 of 3   [Next question | Attempt summary]
```

**4. Tests**
Migrate `Workbook.dom.test.ts:1086` and `:1111`: the empty state and read-only open now go through the "Submitted attempt" tab, with no "Open attempt" button and no "Back to submitted attempts". Add the following.

- Keyboard operation of three tabs.
- The editor stays mounted, and no PUT or POST is sent on a view switch.
- Selector default, paging and selecting an older attempt.
- Next keeps the view and attempt.
- An earlier-version attempt with fewer questions uses the pinned titles.
- Last-question Next reads "Attempt summary", with no Review or submit control.
- Per-question feedback filtering and the request count per question, in `Feedback.dom.test.ts` and `feedback-model.test.ts`.

**5. Risks**

1. Transient version mixing. The pinned publication loads after the attempt, so the question pane can briefly show the route question beside the historical "Loading" panel. Mitigation: render a loading placeholder, not the route question, in the historical views until `ctx.pub` resolves.
2. Shared `position` between the editor and the historical views. Clamping and the `go()` save-block (:418-422) can behave oddly when the historical question count differs from the route's. The editor also now stays mounted for the rest of the workbook's life (PrismEditor focus and measurement behaviour untested).
