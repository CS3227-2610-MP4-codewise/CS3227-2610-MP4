# Instructor UI acceptance continuation — 2026-11-08

Requirements: COU-01–07, IAL-03/08/11, UI-01–08; design warm-workbook-v1. Source baseline: worktree `.worktrees/instructor-assessment-completion`, commit 7b593a7 plus uncommitted continuation. Original checkout at f9cc6aa has overlapping pre-existing changes including a deleted workspace switch, and was not reset.

- Exact source evidence: the instructor workbook now checks answer/question/rubric/criterion joins and canonical excerpt/range before attaching any observation to lines. Invalid evidence suppresses all markers and counts and presents an unavailable message. Focused tests cover valid Unicode/trailing LF and mismatched/out-of-range/foreign joins.
- Invitation form disables email and role while its request is pending, avoiding loss of input entered during an earlier request. No real invitation was sent.
- Next/Previous focus is applied after the question render. In the local synthetic preview, a two-question current workbook and an older saved revision both moved to question two and the accessibility tree reported focus on its heading. The preview used only synthetic feedback; this is not screen-reader announcement verification.
- Independent reviewer /root/review identified the source evidence, navigation and invitation problems and inspected the repairs. Re-review identified and led to repair of misleading empty text and count in invalid-evidence display.
- Prior Darryl closure of assessment tasks 4.2, 4.3, 4.5 and 5.4 remains intact; this continuation does not rewrite that decision or claim previously unperformed checks passed.
- Open: manual keyboard/screen-reader, failure/retry/revocation, unsaved-work recovery, 320px/zoom and light/dark matrix across onboarding and assessment. Live Firebase/Gmail and hosted verification remain pending, as do Keith's submission and student consumers and actual integration agreement.
- Additional independent review finding: forbidden assessment save/action retains the private view and unsaved data. Safe revocation recovery requires a separately bounded design balancing clearing inaccessible content and recovery; it is not repaired or accepted here.
- Initial `npm run check`: specs, typecheck and lint passed; 304 tests passed and nine timed out in three auth/course suites at default concurrency; build not reached. A reduced-concurrency rerun is recorded separately after completion.

## UI review matrix

Reviewer: /root/review, independent source inspection; main agent ran checks and browser smoke. Writer: Darryl; no shared contracts or schema changed. Design: warm-workbook-v1. Acceptance remains pending.

| Review area | Outcome and evidence |
| --- | --- |
| UI-01 design identity | Unverified for this continuation; no complete appearance review. |
| UI-02 sign-in | Unverified; live provider and failure matrix pending. |
| UI-03 role switch | Unverified in this continuation; Keith consumer remains absent. |
| UI-04 version context | Partial: synthetic historical revision labelled historical and read-only; real submission integration pending. |
| UI-05 navigation | Partial: synthetic current and historical two-question Next focused the rendered second heading. Previous, single/final and actual announcements remain unverified. |
| UI-06 evidence | Partial: automated join/excerpt helper tests and source review passed; browser invalid-evidence and focus/announcement matrix remain unverified. |
| UI-07 responsive/keyboard | Unverified: full keyboard, widths, zoom, touch and reduced-motion matrix. |
| UI-01/07 contrast and appearance | Unverified: light/dark rendered contrast and state matrix. |
| UI-08 honest states | Partial: invitation input race repaired; pending/error/retry/revocation and unsaved recovery still need UI verification. |
| Privacy AUTH-02/GRADE-04 | Return with finding: denied assessment actions can retain private content; review recovery/clearing in separate bounded iteration. Student integration and DOM/cache checks remain unverified. |
| Verification | See checks above and later checkpoint. Synthetic preview is not hosted or provider verification. |

No new design departure or user acceptance is claimed. No screenshots were captured. Next owner: Darryl, with Keith responsible for student/submission integration and review.

Verification checkpoint: `VITEST_MAX_WORKERS=2 npm run check` passed: 8 strict OpenSpec changes, typecheck, lint, 313 tests in 28 files, 4 deployment-script checks and Vite production build. `git diff --check` passed with a line-ending warning. Focused presentation/controller suites passed 14 tests. These are local checks; no deployment or live delivery is implied.

Acceptance checkpoint, 2026-11-08: Darryl accepted the verified repair group with the limitations above. This decision does not establish that the outstanding checks passed or close the separate denied-access recovery finding.
