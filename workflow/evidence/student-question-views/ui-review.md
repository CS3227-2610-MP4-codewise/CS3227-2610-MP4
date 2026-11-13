# UI review: student-question-views

- **Human owner and role area:** Keith, student features.
- **Source revision / PR:** branch `keith/student-question-views` from `64a9159`. It was uncommitted at review time, and there is no PR yet.
- **Design reference:** `docs/ui/design.md`, `warm-workbook-v1`.
- **Relevant UI and MVP requirement IDs:** UI-04/05/06/07/08 for the UI. SQ-01–07, SW-08 (modified) and SF-02–06 (SF-03/05 modified) for the MVP.
- **Shared-file writer window / producer-consumer revisions:** none. Only Keith-owned `src/web/student/` files changed. Shared `styles.css`, `ui/primitives` and DTOs were consumed unchanged.
- **Reviewer and actual review mode:**
  - Human: Keith reviewed locally at `http://127.0.0.1:8787`, using his own local data. The specific screens and states he exercised were not itemized.
  - Automated: DOM tests (jsdom).
  - No independent reviewer yet. Darryl reviews the PR.
- **Evidence directory:** `workflow/evidence/student-question-views/` ([verification](verification.md), [proposals](proposals/)).

**Task 6.2 basis.** On 2026-11-13, Keith first accepted 6.2 as suitable for MVP. He then reported running the manual checks himself: 320/768/1024/1440 px, 200 % zoom, keyboard operation and dark mode, all with no issues. The rows below record those results as Keith's reported manual checks. No itemized per-screen script or screenshots were kept.

| Review area         | Requirement / acceptance | Outcome and evidence                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design identity     | UI-01                    | **Pass (code review).** It uses existing tokens and components only: `cw-action` primary/secondary, the tab pattern, `cw-fb-*`, `cw-student-meta`. There are no new colours. Keith's local review accepted the look, including a repaired equal-height overview action row (rework recorded in the log).                                             |
| Sign-in             | UI-02                    | **Not applicable.** It is not changed by this increment.                                                                                                                                                                                                                                                                                             |
| Role switch         | UI-03                    | **Not applicable.** The shared shell is consumed unchanged, and browser role state grants nothing.                                                                                                                                                                                                                                                   |
| Versioned workspace | UI-04                    | **Pass (automated).** DOM tests cover: three per-question views; the selected attempt's source, time, ID and pinned version; the editor staying mounted, with text and save state unchanged and no PUT/POST on view switch; and the pinned publication used for earlier-version attempts.                                                            |
| Next/Previous       | UI-05                    | **Pass (automated).** DOM tests cover: Next keeping the view and attempt, with both panes updating; heading focus and the announcement "Question n of N, <view>: title"; last-question **Attempt summary**, with no Review or Submit; Back to question N; Working copy keeping **Review assignment**; push/replace history and Back/Forward restore. |
| Evidence links      | UI-06                    | **Pass (automated).** Per-question criteria, markers and observations; markers lettered from A per question; no cross-question markers; unavailable evidence only on its own question; existing SF-03/04 keyboard selection tests still passing.                                                                                                     |
| Responsive/keyboard | UI-07                    | **Pass (manual, Keith; automated).** Keith reported 320/768/1024/1440 px, 200 % zoom and keyboard operation all fine. Arrow-key tab operation also passes in DOM tests, and the 44 px overview link box was fixed in CSS. **Not checked:** touch input and reduced motion.                                                                           |
| Contrast/appearance | UI-01/UI-07              | **Pass (manual visual, Keith).** Keith reported dark mode fine (light mode was used during review). There are no new colour combinations, only existing tokens. Contrast ratios were not measured and no screenshots were taken.                                                                                                                     |
| Honest state        | UI-08                    | **Pass (automated).** Loading placeholders (never the route question beside a loading attempt), no attempts, unavailable or forged attempt, session expired, network with retry, not released, withdrawn tombstone, replaced version, dropped-version announcement, stale with retry, question without feedback, and late/stale responses ignored.   |
| Privacy             | AUTH-02/GRADE-04         | **Pass (code review and automated).** There is no new endpoint or DTO, and only the closed C-SUB/C-REL projections are rendered. A forged attempt ID shows only "This is not available to you." with no metadata and no feedback request. Nothing new goes to web storage. See [verification](verification.md#diff-review-task-61).                  |
| Verification        | exact results            | `npm run check`: exit 0 (21 specs; 802 tests passed, 2 skipped; deployment tests 4/4; build). `openspec validate student-question-views --strict`: valid. Snapshots and local runs are not hosted deployment proof.                                                                                                                                  |

## Evidence and decisions

- **Screenshots:** none taken.
- **Automated checks actually run:** as in the Verification row. Student suite: 173 tests passed. After the overview CSS fix: overview and model tests 56 passed, Prettier clean, build succeeded.
- **Manual checks actually performed:** Keith, locally at 8787: the workbook and overview in use; 320/768/1024/1440 px; 200 % zoom; keyboard operation; dark mode. All were reported fine. Earlier, he found the unequal heights of Open my work and View latest submission / View released feedback; that was repaired, and he accepted the fix.
- **Intentional departures:**
  - None from `warm-workbook-v1`.
  - Not a departure: historical option labels omit "Attempt k" numbering, because list position misnumbers once older pages are loaded. Options show the server submission time instead, which SQ-02 requires.
- **Findings returned to owner / repair and re-review:** the overview link height and 44 px target, repaired in `student.css` and accepted by Keith.
- **Untested combinations, blockers and next owner:**
  - Light/dark contrast ratio measurement.
  - Screen-reader announcement in a real assistive technology.
  - Touch input.
  - Withdrawn, replaced and earlier-version cases with real local data (covered only by synthetic DOM tests).
  - Next owner: Darryl (review of #44 and #45). Staging already succeeded for `11fdc88` (run 43358135628).
- **Outcome:** **accept, verified (Keith, 2026-11-13).** The remaining gaps are listed above.
