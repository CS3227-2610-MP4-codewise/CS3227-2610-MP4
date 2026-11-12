# UI review: instructor-ai-assessment

- Human owner and role area: Darryl, instructor assessment.
- Source revision / PR: working tree based on main e52544f; no PR.
- Design reference: `docs/ui/design.md`, `warm-workbook-v1`.
- Requirements: UI-01/04/06/07/08, GRADE-01–04, AI-02/05.
- Shared-file writer: Darryl; Keith review pending.
- Reviewers: main agent and independent read-only `/root/review_completion`; no human acceptance yet.
- Evidence directory: `workflow/evidence/instructor-ai-assessment/`.

| Review area | Outcome and evidence |
| --- | --- |
| Design identity / appearance | Unverified visually; existing tokens reused. Light/dark contrast and screenshots pending. |
| Sign-in and role switch | Not applicable to the changed controls; existing authentication remains a dependency. |
| Versioned workspace | Synthetic service and connected tests cover private candidate, explicit adoption, provenance and separate approval/release; browser interaction unverified. |
| Next / Previous | Existing navigation unchanged; AI candidate multi-question labels added. Browser navigation unverified. |
| Evidence links | Existing validator rejects a fabricated excerpt in a synthetic service test; interactive focus and highlighting unverified. |
| Responsive / keyboard | Unverified at 320/768/1024/1440px and 200% zoom; local browser access disabled in Work settings. |
| Honest state | Controller presents generation, pending, failure, retry and manual fallback; interactive behavior and network loss remain unverified. |
| Privacy | Candidate reads and adoption are actor and course scoped in synthetic service and connected tests; real submission and student projection integration remain pending. |
| Verification | See `verification.md` for exact checks and full-suite failures. |

## Evidence and decisions

- The instructor reviewed the synthetic workflow and said it looked right but felt somewhat cluttered. AI controls were subsequently moved into an expandable disclosure; the instructor could not check the revision now, so acceptance is pending.
- On later feedback that scoring and completion were confusing and AI suggestions formed a wall of text, the workspace replaced the counter with a plain instruction, removed the 0.01 input step, grouped suggestions by question and labelled synthetic minimum scores. Typecheck, lint, 15 focused tests and build passed; visual and manual acceptance remain pending.
- Following the instructor's request, selected code can start a line-linked comment; line-number entry remains available as the keyboard alternative. Focused UI/controller tests (16), typecheck, lint and build passed. Browser selection, touch, keyboard and appearance verification remain unverified.
- Independent review found highlight-state, cancel and focus defects; repairs were re-reviewed in source. Final focused UI/controller tests: 17 passed. Browser/touch and rendered focus remain unverified.
- Final `npm run check` with two test workers passed 352 Vitest tests, four deployment tests, strict spec validation, typecheck, lint and build. A label-only change occurred during the run.
- The instructor subsequently requested removing the numeric line controls in favor of highlighting. Those controls were removed; browser and keyboard selection need manual verification. This supersedes the earlier statement that line-number entry remains available.
- Screenshots, manual keyboard and themed checks: unverified, not inferred from source.
- Independent review returned provenance, recovery, synthetic composition, stale controls, reference choice and question-context findings; repairs reviewed. Browser navigation reset still needs human verification.
- Intentional design departures: none recorded.
- Outcome: pending checks and instructor acceptance; next owner Darryl.

### Current worktree review — 2026-11-12

- Owner: Darryl; base `f787176`, current uncommitted work. Design: `warm-workbook-v1`; UI-01/04/06/07/08 and AI-01–05. Existing workbook tokens and disclosure are reused; no intentional design departure.
- The native button changes from Generate draft to Resume or check draft when the most recent bound request is pending or its state is unknown. A text explanation says resuming may send a saved request that has not started. The reference-selection checkbox is disabled while resuming; manual feedback remains editable. Controller coverage checks pending and network-failure states, with actual results to be recorded in verification.
- Independent read-only `/root/ai_review` reviewed state transitions and identified duplicate-dispatch and stale-key issues; repairs include an idempotent server resume, guarded request binding and conservative unknown-state control. Final source review and integrated checks remain as recorded in verification.
- Desktop/narrow screenshots, both appearances, 200% zoom, keyboard/touch and human acceptance remain unverified on this revision. Existing screenshots are not evidence for the new control. No live provider call or deployment.
- Outcome: pending verification and manual acceptance; next owner Darryl.

Correction for final control: while pending or the status is unknown, the reference checkbox is hidden rather than shown disabled. The disclosure warns that resume uses the original selection and may include instructor-only references. `/root/ai_review` re-reviewed that repair. The interactive preview was not started; human and visual acceptance remain unverified.
