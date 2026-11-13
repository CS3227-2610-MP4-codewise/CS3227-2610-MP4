# student-question-views: verification

Branch `keith/student-question-views` from `64a9159`. The changes are uncommitted. The local run was on 2026-11-13. Requirements: SQ-01–07, SW-08 and SF-02–06 (modified), against UI design `warm-workbook-v1`.

## Scope verified

- **First increment.** Implementation A, chosen by Keith from three independent worktree implementations (see `proposals/`). Coordinator fixes added after the choice:
  - Per-question observation letters start from A.
  - The chosen release version is held by the attempt context and survives leaving the tab. It resets with a polite announcement when it is no longer listed.
  - The navigation announcement names the historical view.
  - Tests were added for: history network and 401 failures; history refetch after submit; a slow attempt response ignored after another selection.
- **Second increment.**
  - SQ-05 (tasks 1.1/1.2): a closed `view`/`attempt` query. A damaged query opens Working copy with the values dropped and the address replaced. Student actions push history entries. Latest-attempt resolution and clamping replace the current entry. Back/Forward restore the view and attempt.
  - Completes 2.3: a forged attempt ID in the address shows the uniform unavailable state.
  - Completes 4.1: clamping replaces the address.
  - SQ-07 (task 5.1): the overview's latest-attempt link.

## Results (exact)

- `npm run check`: exit 0.
  - `openspec validate --all --strict`: 21 passed, 0 failed.
  - typecheck and lint: pass.
  - vitest: 66 files passed, 2 skipped. 802 tests passed, 2 skipped.
  - deployment node tests: pass 4, fail 0.
  - vite build: built (existing >500 kB chunk warning).
- `openspec validate student-question-views --strict`: "Change 'student-question-views' is valid".
- `npx vitest run src/web/student`: 173 passed.
- `npx prettier --check src/web/student`: clean (after `--write`).

## Diff review (task 6.1)

- **Private fields.** No new endpoint, DTO or schema. The views render only the closed C-SUB and C-REL projections already parsed client side (`attemptSchema`, release/withdrawn schemas, `attemptHistorySchema`). No drafts, approval state or submitter fields are added to the display. Nothing new goes to `localStorage` or `sessionStorage`.
- **Version pinning.**
  - The historical panes, position, Previous/Next and summary use the attempt's own pinned publication (`loadAttempt`). A publication that cannot be read is a failure, never a fallback to the current one.
  - A loading placeholder replaces the question pane until that publication resolves.
  - Earlier-version attempts are covered by DOM tests (fewer questions, with clamping).
- **Stale results.**
  - Attempt loads are tagged by ID, so the derived state never shows the previous attempt.
  - The feedback summary and version fetches use active flags.
  - The overview link uses the destination-scoped request generation plus a versionId check.
  - Tests cover a slow attempt response and a late overview history result.
- **URL IDs.**
  - `attempt` must match the existing route-ID pattern, or it is dropped before any request.
  - Valid IDs are sent only through `encodeURIComponent` paths to the existing own-attempt routes, which return a uniform 404.
  - The forged-ID test shows only "This is not available to you.", with no metadata and no feedback request.
  - Browser state grants nothing.

## Not verified / open

- **Task 6.2:** the manual UI review (keyboard, focus and announcement, 44 px, light/dark, 320–1440 px, 200 % zoom) has not been run.
- **Hosted staging:** no check yet.
- **`package-lock.json`:** a local `npm install` modified it (removed `libc` fields). This is unrelated to this increment and must not be committed with it.

## Post-merge review fixes (PR #44 Codex findings, 2026-11-13)

Branch `keith/student-question-views-fixes` from `11fdc88`.

| Finding (P2)                                                                               | Assessment                                                                                                                     | Fix                                                                                                                                                                               | Test                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| An own attempt for another assignment, named in the address, renders under this assignment | Confirmed. The server authorizes any attempt the student owns.                                                                 | `loadAttempt` requires the attempt's `courseId` and the pinned publication's `assignmentId`/`courseId` to match the workbook's; otherwise the uniform unavailable state is shown. | Fails without the fix, passes with it.              |
| Back/Forward from the Attempt summary keeps the summary on screen                          | Confirmed.                                                                                                                     | A valid workbook `popstate` resets `mode` to `question` (this also covers Review).                                                                                                | Fails without the fix, passes with it.              |
| The previous attempt's feedback state could render beside a newly selected attempt         | Not reproducible in the per-question views: a new selection always renders a loading state, which unmounts the feedback panel. | `AttemptFeedback` is keyed by attempt ID (hardening).                                                                                                                             | Passes before and after the fix (regression guard). |

- **`npm run check`:** exit 0. 21 specs. Vitest: 66 files passed and 2 skipped; 805 tests passed and 2 skipped. Deployment tests 4/4. Build succeeded.
