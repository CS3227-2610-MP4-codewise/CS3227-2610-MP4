# Handoff: student-question-views

**Status:** complete. PR #44 merged as `11fdc88`. The staging deploy for that revision succeeded (run 43358135628: CI checks, secrets scan and deploy all passed); production awaits its approval gate. Codex review findings are fixed and the change is archived in a follow-up PR.

- **Human owner:** Keith (student features). Reviewer: Darryl.
- **Agent role / model / configuration:**
  - **Coordinator:** a Claude Code root session (Opus 5.5) acting as Coordinator, recorded in tracker run `f2764e33`.
  - **Proposals:** at Keith's request, it spawned three independent read-only **Plan** subagents (Sonnet 5.5, identical prompts) to propose a small UI change.
  - **Implementations:** it then spawned three **general-purpose** subagents (Sonnet 5.5), each implementing one proposal in its own git worktree.
  - **Choice:** Keith chose A. The Coordinator applied A, then made the fixes and the remaining tasks itself, without further agents.
  - **Records:** the proposals are kept in [`proposals/`](../evidence/student-question-views/proposals/). The worktrees for A, B and C have been removed.
- **Requirement IDs and OpenSpec change:** SQ-01–07; SW-08 (modified); SF-02–06 (SF-03/05 modified, with SF-03 aligned to DR-03 `Score: X / N`); UI-04/05/06/07/08 (`docs/ui/design.md`, `warm-workbook-v1`); AUTH-02; SD-03; DEV-02/04. Change archived as `openspec/changes/archive/2026-11-13-student-question-views`; main specs synced (`student-question-views` new, `student-feedback` SF-03/05, `student-submissions` SW-08).
- **Revisions:** base `64a9159` (main). Branch `keith/student-question-views`: `8479197` (increment), then `b1c5418` (merge of `origin/main` with PR #43 icons; `Attempts.tsx` conflict resolved and icons carried to the new controls; `npm run check` exit 0 on the merged tree, 802 passed and 2 skipped).

## Owned files

All files are Keith's, under `src/web/student/`:

- `Workbook.tsx`, `Attempts.tsx`, `Feedback.tsx`, `StudentWorkspace.tsx`, `model.ts`;
- `workbook.css`, `student.css`;
- tests: `Workbook.dom.test.ts`, `Feedback.dom.test.ts`, `StudentWorkspace.dom.test.ts`, `model.test.ts`, `work-model.test.ts`, `feedback-model.test.ts`.

No server, shared DTO, schema, migration, dependency or shared-shell change. No Darryl writer window was needed.

## What changed

- **Answer views (SQ-01–04):**
  - **Tabs:** the work pane has three equal tabs: Working copy, Submitted attempt and Released feedback. The editor stays mounted while hidden.
  - **Attempt selector:** a shared attempt context (`useAttemptContext`) provides a native "Attempt" select, newest first, with "· Feedback released" and "Show older attempts". It loads one attempt plus its pinned publication.
  - **Submitted attempt panel:** the current question's source, read only, with time, ID and pinned version.
  - **Released feedback panel:** `AttemptFeedback` is scoped to the current question. Annotations are matched against the whole attempt, then filtered, with markers lettered from A for each question.
  - **Feedback fetching:** the summary is refetched for every question shown.
  - **Release version:** the chosen version is held per attempt across questions and across leaving the tab. It resets with an announcement when it is no longer listed.
- **Historical navigation (SQ-06):**
  - Panes, position and Previous/Next follow the attempt's pinned publication.
  - The question pane shows a loading placeholder instead of the route's question while that publication loads.
  - An earlier-version note is shown when the versions differ.
  - The last question's Next becomes **Attempt summary**, which opens the read-only all-question page with "Back to question N". It never offers Submit or Review.
- **Address (SQ-05):**
  - **Query format:** `?view=submitted|feedback&attempt=ID`, closed. A damaged query opens Working copy with the values dropped and the address replaced.
  - **History entries:** student actions push. Latest-attempt resolution and clamping replace.
  - **Back/Forward:** restores the view and attempt.
  - **Forged IDs:** a forged or foreign ID gets the uniform unavailable state.
- **Overview (SQ-07):**
  - **The link:** **View latest submission** or **View released feedback** for the latest attempt, from one history read after the overview loads.
  - **When hidden:** with no attempts or on any failure.
  - **Layout:** an equal-height 44 px action row.
- **Breaking (UI only):** the "Submitted attempts" list tab is gone. Old `/work/:n` links still open Working copy. An unknown query key on a work URL now opens Working copy instead of the unavailable page.

## Decisions

| Decision                                                                                                                 | By                                                | Recorded in                  |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ---------------------------- |
| View model, URL state and overview entry (Decisions 1–3)                                                                 | Keith, 2026-11-13                                 | proposal.md                  |
| Compare three independent proposals and implementations; adopt A plus fixes                                              | Keith, 2026-11-13                                 | log `apply-01`; `proposals/` |
| Include SQ-05 and SQ-07 in this PR rather than a follow-up                                                               | Keith, 2026-11-13                                 | log `apply-02`               |
| Attempt options show the submission time, not "Attempt k" (list-position numbering is wrong once older pages are loaded) | Coordinator (from proposals A/B), accepted with A | ui-review.md                 |
| Task 6.2 complete as suitable for MVP without the full manual matrix                                                     | Keith, 2026-11-13                                 | ui-review.md, tasks.md       |

## Verification (actual results)

- **`npm run check`:** exit 0.
  - 21 specs valid.
  - Typecheck and lint pass.
  - Vitest: 66 files, 802 tests passed, 2 skipped.
  - Deployment tests: 4/4.
  - Build succeeded.
  - Re-run after every final edit (overview CSS fix, SF-03 wording, handoff and evidence), with the same result. `openspec validate student-question-views --strict` reports the change as valid. Prettier is clean on the student code and the new docs.
- **Student suite:** 173 tests.
- **Diff review:** private fields, version pinning, stale results and URL IDs. See [verification.md](../evidence/student-question-views/verification.md).
- **UI review:** [ui-review.md](../evidence/student-question-views/ui-review.md).

## Limitations and open items

- **UI verification:** Keith manually checked 320/768/1024/1440 px, 200 % zoom, keyboard operation and dark mode, with no issues found. Still unverified: contrast ratio measurement, a real screen reader, touch input, and withdrawn/replaced/earlier-version cases with real local data (synthetic DOM tests only).
- **Local preview setup:** sign-in is rejected on Vite ports while `AUTH_ORIGIN` is `http://127.0.0.1:8787`. Use the build served on 8787, or point `AUTH_ORIGIN` at 5173 for local live reload.
- **Overview cost:** one extra bounded history read per overview load.
- **Hosted staging:** no check yet.

## Post-merge fixes

PR #44 merged as `11fdc88`. Codex review found three P2 issues: a cross-assignment attempt rendered under the wrong assignment; Back/Forward kept the summary on screen; and a theoretical stale feedback render. They are fixed with tests in `keith/student-question-views-fixes`. See [verification.md](../evidence/student-question-views/verification.md#post-merge-review-fixes-pr-44-codex-findings-2026-11-13).

## Next owner

- **Darryl:** PR #44 was merged by Keith before Darryl's review (only the automated Codex review ran). A post-merge review of #44 is still pending.
- **Darryl:** review the follow-up PR (review fixes and archive). Production approval follows the reviewed release workflow.
