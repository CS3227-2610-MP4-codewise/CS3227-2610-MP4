# Design

Design revision: `docs/ui/design.md` `warm-workbook-v1`, UI-04/05/06/07/08. Requirements are in `specs/student-question-views` (SQ-01–07) and the modified SW-08, SF-03 and SF-05. The motivation is in proposal.md.

## Context

Observed at `bb990cd`:

- `Workbook.tsx` holds `position`, `mode: 'question' | 'review'` and `tab: 'work' | 'attempts'`. The route is `/student/assignments/:pub/work/:n` (`model.ts` `parseStudentRoute`, `studentPaths.work`). A route with any query key is rejected (`keys.length` → `null`).
- `Attempts.tsx` `AttemptsPanel` lists history (`api.history(pub, cursor)`, newest first, paged, with `feedbackReleased`). `AttemptView` loads one attempt (`api.attempt`), resolves its pinned publication (the current one if the IDs match, otherwise `api.publication(id)`) and renders `AttemptFeedback` for every question.
- `Feedback.tsx` `AttemptFeedback` fetches `api.feedback(attemptId)` on mount, keeps the chosen release version in state, fetches non-current versions by `api.feedbackVersion`, and matches annotations against the whole attempt (`matchAnnotations`).
- Server: `StudentWork.history` lists the student's attempts for the publication's **assignment** (every version), guarded by current Student membership. The attempt, feedback and version routes are own-attempt only, return `no-store` and give a uniform 404. Reads are not rate limited (SW-11 covers saves and submits only).
- The overview (`StudentWorkspace.tsx` `StudentBrowse`) uses the browse API in `model.ts` and has no history call.

All of these files are Keith-owned (`workflow/Ownership.md`: `src/web/student/`).

## Goals / Non-Goals

**Goals:** client-only restructuring of the student workbook and overview. The existing closed DTOs, endpoints and server guards are reused unchanged, and the existing SW/SF tests keep passing or are moved alongside the code they cover.

**Non-Goals:** any server, shared DTO, schema, migration or dependency change. Changes to the shared shell. A client feedback cache. Attempt diffing or comparison. Instructor views.

## Decisions

### 1. Route and URL state

Extend the work route to accept a closed query: `view ∈ {submitted, feedback}` and `attempt` matching the existing `routeId` pattern. Working copy is the absence of `view`. `attempt` is accepted only with a `view`. Any other key, a repeated key, an unknown `view` or a malformed `attempt` parses to the Working copy route for the same question, with the bad values dropped (SQ-05). It does not produce `null`, so a damaged link still opens the work. A `view` without `attempt` means "latest attempt", resolved once history loads, after which the URL is replaced (`history.replaceState`) to name the resolved attempt ID.

`studentPaths.work(pub, n, ctx?)` builds these addresses. Changing view or attempt pushes a history entry. Previous/Next push as they do today. Popstate re-parses the route.

*Alternatives:* path segments (`/work/:n/attempts/:id/feedback`) need more route patterns for the same information. Component state only loses the selection on reload, which Keith rejected (Decision 2).

### 2. Pane composition and answer views

The work pane gets one native tab list with three equal tabs, reusing the existing `role="tablist"` / arrow-key pattern, ids and `hidden` panels in `Workbook.tsx` (SQ-01, UI-04). The Working copy panel is the current editor panel, unchanged. The two historical panels share an `AttemptContext` loader:

- **History:** the first page loads when a historical view is first entered, and stays in memory while the workbook is mounted for this publication. "Show older attempts" appends pages. A successful submit bumps the existing `attemptsKey` to refetch.
- **Attempt:** `api.attempt(id)` plus its pinned publication (the existing resolution in `AttemptView`) load once per selected attempt and stay in memory. Submitted attempts are immutable (SW-05), so this is safe and is not feedback caching.
- **Selector:** a native `<select>` labelled "Attempt", with options "Attempt k — submitted <UTC time>" plus "· feedback released". Older pages are reached with the "Show older attempts" button beside it. A native control keeps keyboard behaviour and 44px targets without a custom listbox.

The Working copy panel stays mounted (hidden) while a historical view is shown, so the editor model, timers and backup behave as they do today when switching between Work and Attempts.

### 3. Pinned publication drives historical position

When the selected attempt's `assignmentVersionId` differs from the route's publication, the question pane, ordinal, `Question n of N`, Previous/Next and the summary all use the **attempt's pinned publication** (SQ-06). `n` is clamped to that publication's length: a link to question 5 of a 3-question attempt shows question 3 and replaces the URL. Switching back to Working copy restores the route publication and its question `n` (clamped to its own length). The question pane shows a one-line version note ("Submitted against an earlier version of this assignment") whenever the pinned version differs. No current-version question text is ever paired with an earlier attempt's source.

*Alternative considered:* matching questions across versions by title or ordinal. Rejected, because question versions are immutable and not guaranteed to correspond across publications.

### 4. Per-question feedback

`AttemptFeedback` gains a `questionVersionId` prop. Criteria and annotations are filtered to that question before display. `matchAnnotations` is still run against the whole attempt first, so SF-04's answer/attempt checks are unchanged, and the result is then filtered by question. Unavailable evidence is also filtered by the annotation's `questionVersionId`. When nothing in the shown release belongs to the question, the panel says so (SQ-04).

The **feedback summary is fetched again each time a question is shown in the feedback view**, when the view is entered and when the attempt changes. This keeps SF-02 ("no caching across views; reopening fetches again") literal, at the cost of one small `no-store` GET per question. Reads are not rate limited, and an assignment has at most 20 questions. The chosen release version is lifted to the attempt context (SF-05 modified). It is kept across questions while it is still in the refreshed version list, otherwise it resets to the default with a polite announcement. A selected non-current version is fetched per question with `feedbackVersion`, for the same SF-02 reason.

The submitted source of the current question renders above the feedback in every state (SF-06). The existing numbered, annotated source component is reused for the question's answer only.

### 5. Footer and attempt summary

In historical views the footer shows `Previous question / Question n of N / Next question` from the pinned publication. On the last question, Next becomes **Attempt summary**. The summary is the existing `AttemptView` (all questions, read only, with full-attempt feedback), re-entered as `mode: 'summary'`. It has a heading, "Back to question N", and no Review assignment or submit action (SQ-06, UI-05). In Working copy the footer is unchanged, and the last Next stays **Review assignment**.

Navigation focuses the question heading and announces "Question n of N, <view>, attempt k" through the existing live region. Requests are tagged with `(attemptId, questionVersionId, view)` and their results are dropped when the context has moved on, following the existing `active` flag pattern (UI-05 race rule).

### 6. Overview entry point

`StudentBrowse` overview data adds one optional call: the existing `GET /api/student/publications/:pub/attempts` first page, issued after the overview itself has loaded and under the same `AbortController`. Only `items[0]` is used: its `attemptId` and `feedbackReleased` choose the label and the target `studentPaths.work(pub, 1, {view, attempt})`. Any failure, including 401, hides the link silently, because the overview's own session handling already covers expiry. The parse uses the existing closed `attemptHistorySchema` (SQ-07).

### Authorization and data boundaries

No new authority. Every attempt, feedback and history read goes through the existing own-attempt plus current-Student guards, with uniform 404 and `no-store`. The URL holds only an attempt ID the student could already see in their history. A forged ID gets the uniform 404, which is rendered as the existing "This is not available to you." with no metadata (SQ-05). Nothing new is written to `localStorage` or `sessionStorage`. The per-tab draft backup is untouched, and attempt and feedback data are held only in component state, cleared on unmount and on role, account or session change through the existing workbook reset paths. No drafts, approval state or private assessment fields can reach the views, because the DTOs are the closed C-SUB and C-REL projections already validated client side.

### Deployment and resources

Client bundle change only, inside the existing lazy workbook chunk plus a small overview change. No Worker, D1 or migration impact. Extra load: one history page per overview view, and one feedback-summary GET per question shown in the feedback view. Both are bounded reads on indexed own-attempt queries.

### UI coverage (warm-workbook-v1)

Tokens and components come from the existing `workbook.css` and `ui/primitives` (`Action`, tab styles, `cw-wb-feedback-marker`, annotation fill and rule). There are no new colours. States: loading history, attempt and feedback; no attempts; unavailable or forged attempt; session expired; network failure with retry; not released; withdrawn; stale; replaced version; question without feedback; earlier-version attempt. Responsive: the tabs and selector wrap within equal targets at 320px, and the stacked question-then-work order and collapsible question brief are unchanged. No departures from the design reference are proposed.

## Risks / Trade-offs

- [The feedback summary is refetched per question, which adds latency on Next] → The submitted source renders immediately from the in-memory attempt, the feedback section shows its loading text, and there are no placeholder scores.
- [A popstate during a pending save in Working copy] → Uses the existing guarded `go()`. View changes away from Working copy do not unmount the editor, and they trigger the same save-first rule as Previous/Next only when leaving the question, not when switching tabs.
- [Historical position clamping can surprise] → The URL is replaced and the version note is shown, so the address always matches what is displayed.
- [Removing the Submitted attempts tab breaks muscle memory and existing DOM tests] → The tests are migrated in the same task group. The attempt summary preserves the all-question page.
- [The overview's history call doubles overview requests] → It is one bounded read, fires after the overview renders and never blocks it.

## Migration Plan

UI-only and shipped through the normal PR → staging → release workflow. Rollback is reverting the PR, with no data to migrate. Old `/work/:n` links keep working as Working copy.
