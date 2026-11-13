# Proposal

## Why

Students can now submit attempts (student-drafts, SW) and read released feedback (student-released-feedback, SF), but both appear only on one all-question attempt page reached from a "Submitted attempts" tab. The workbook design (`docs/ui/design.md` revision `warm-workbook-v1`, UI-04/05) expects per-question **Working copy / Submitted attempt / Released feedback** views beside the question, with Previous/Next keeping the selected view and attempt. Keith recorded this as a follow-up on 2026-11-12 (student-released-feedback proposal, "Follow-up"; handoff item 4). This change delivers it.

## What Changes

- Replace the work pane's two tabs (Work, Submitted attempts) with three equal answer-view tabs: **Working copy**, **Submitted attempt** and **Released feedback**. The two historical views show only the current question of the selected attempt, beside that question's prompt. [SQ-01, UI-04]
- Add an **attempt selector** to the historical views: the student's own attempts for the assignment, newest first, with submission time and the existing "Feedback released" marker, paged with the existing history cursor. The default is the latest attempt. [SQ-02, SW-08, SF-07]
- Show a selected attempt's submitted answer for the current question, read only, with the server time, attempt ID and pinned version. Show that question's released criteria, annotations, observation list, unavailable evidence and release-version history in the feedback view. Both views use the attempt's own pinned publication and source. They never use the working copy or a newer publication. [SQ-03, SQ-04, SF-03/04/05/06]
- Keep the view and attempt in the URL (`?view=submitted|feedback&attempt=ID`). Reload, Back/Forward and links restore them. The server re-authorizes the attempt each time, and a forged or foreign ID gets the uniform unavailable state. [SQ-05, AUTH-02]
- In the historical views, Previous/Next follow the attempt's pinned question order and keep the view and attempt. On the last question, Next becomes **Attempt summary**, which is the existing all-question read-only page, re-scoped. The summary never offers submission. [SQ-06, UI-05]
- Add an entry point on the assignment overview: when the student has attempts, **View latest submission** (or **View released feedback** when the latest attempt has a current release) opens question 1 in that view for the latest attempt. Nothing is shown with no attempts. **Open my work** is unchanged. [SQ-07, SD-03]
- **BREAKING (UI only):** the "Submitted attempts" tab and its list-then-open flow are removed. The all-question page remains, as the attempt summary. No API or DTO changes.

### Decisions recorded (Keith, 2026-11-13)

| # | Decision |
|---|----------|
| 1 | **View model.** Three per-question tabs. The all-question attempt page is kept as the read-only attempt summary that UI-05 places at the end of historical navigation. |
| 2 | **URL state.** The selected view and attempt live in the workbook URL query. They are re-authorized on every load. |
| 3 | **Overview entry.** One "latest attempt" link, labelled by whether the latest attempt has a current release. No attempt list on the overview. |

## Capabilities

### New Capabilities

- `student-question-views`: the student's per-question answer views in the workbook. It covers the Working copy / Submitted attempt / Released feedback tabs, the attempt selector, URL-restored view and attempt context, historical Previous/Next with the attempt summary, and the overview entry point.

### Modified Capabilities

- `student-submissions`: SW-08 changes from a list-then-open history tab to an attempt selector with per-question read-only views plus an all-question attempt summary. Its read-only and no-working-copy-change rules are kept.
- `student-feedback`: SF-03 and SF-05 move from "the attempt view" to the per-question Released feedback view. Criteria, annotations and unavailable evidence are filtered to the current question, and the release-version selector stays per attempt.

## Impact

- **Keith-owned code only:** `src/web/student/` (`Workbook.tsx`, `Attempts.tsx`, `Feedback.tsx`, `model.ts` route parsing and paths, `StudentWorkspace.tsx` overview entry, `workbook.css`) and their tests.
- **No server, API, DTO, schema, migration or dependency change.** Existing routes are reused: `GET /api/student/publications/:pub/attempts`, `GET /api/student/attempts/:id`, `/feedback` and `/feedback/:version`, plus the publication read. No shared file and no Darryl writer window is needed. The shared shell (`WorkspaceSwitch`, `AccountMenu`) is consumed unchanged.
- **UI:** `docs/ui/design.md` revision `warm-workbook-v1`, UI-04/05/06/07/08. Affected screens are the student workbook work pane, its footer navigation, the attempt summary and the assignment overview. Role switching grants nothing.

## Assumptions, exclusions and open items

- **Assumption:** attempt history spans every publication version of the assignment (the observed behaviour of `StudentWork.history`). An attempt pinned to an earlier version shows that version's questions and order, even when the workbook route is on the latest version.
- **Assumption:** the overview can call the existing history read (first page, one item used) without a new endpoint. The extra request is bounded to one per overview load.
- **Excluded:** server changes, attempt deletion or comparison, side-by-side diff of attempts, AI explanations, scores or totals beyond C-REL, notifications, student progress (PROG), instructor screens and the shared shell.
- **Open:** Darryl's outstanding reviews from earlier increments remain pending and do not block this change. Hosted staging acceptance runs after merge, through the reviewed release workflow.
