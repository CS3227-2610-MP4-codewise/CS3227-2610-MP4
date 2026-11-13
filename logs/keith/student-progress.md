# Student progress explanations

Owner: Keith. Increment: `student-progress`. Requirements: PROG-01, PROG-02, PROG-03, AI-01, AI-02, UI-04. Branch/PR: <reference, or unavailable>.

## How entries work

- **One entry per substantial request, at a checkpoint.** Routine questions, and work while recording is off, need no entry. This is Keith's policy and is separate from Darryl's every-prompt format.
- **Entries are generated** by `python3 workflow/experiment-tracker/tracker.py checkpoint ...`. Do not hand-edit generated tables. Append corrections as a new entry, and never rewrite history.
- **Sections in each entry:** Request, Results, Agents spawned, Turn activity, Reconciliation and Coverage.
- **Turn activity** lists only admitted turns not shown at an earlier checkpoint. A turn's output is therefore never counted in two Turn activity tables.
- **Reconciliation** appends final values for turns that an earlier entry showed as provisional, pending or partial. The earlier row stays unchanged.
- **Counters:** tables show output and reasoning output tokens only. Output measures how much an agent produced, not what it cost. Input, cached input and cache writes stay in the private report and in the cumulative Coverage line. Do not add cumulative checkpoint totals together.
- **Committed content:** labels, roles, 8-character session prefixes, timestamps, models, efforts, statuses and counters only. Never source paths, raw prompts, tool content or learner code. Missing values are `unavailable`, never zero.


<!-- experiment-checkpoint:student-progress:sp-plan-01 -->
<!-- experiment-turns:sp-plan-01:d2ff8ce471b32f8b -->
## Checkpoint `sp-plan-01` — 2026-11-13T03:57:58.936963+00:00

### Request

Start tracking and implement Keith's student progress AI feature (PROG-01–03) for this increment

### Results

- Owner: Keith.
- Changes and why: Recording started (run dd9f5b69, root Coordinator, no child agents). Keith chose: small shared wiring edits with Darryl review pending; automatic per-course evidence (newest released attempt per assignment, cap 8); new Keith-owned student_progress_results table. Created OpenSpec change openspec/changes/student-progress (proposal, design D1–D8, spec SP-01–SP-09, tasks 1.1–6.4) on branch keith/student-progress; openspec validate --strict passes (first draft failed strict on >500-char requirements; split and renumbered). No code changed; npm run check not run yet. Unrelated: a student-question-views run in session 84b02526 is still recording (partial) and was not touched.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: openspec/changes/student-progress/.
- Remaining limitations and next owner: Keith reviews the planning artifacts, then asks to apply the change (openspec-apply-change); Darryl reviews shared wiring D7 on the PR.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T03:52:05.123Z | open | provisional | claude-opus-5-5 | medium | 26133 | 5082 | 26133 |

### Reconciliation

No earlier provisional, pending or partial turns changed status.

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 2991820; cached input subset 2909546; output 26133; reasoning output subset 5082; total 3017953.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-progress:sp-plan-02 -->
<!-- experiment-turns:sp-plan-02:8e0ea4843cbcbdbe,9edb2dcc1eef49cf,2f45556463518c9f -->
## Checkpoint `sp-plan-02` — 2026-11-13T04:04:17.652711+00:00

### Request

Keith can provide SoCLaaS; identify prompt-injection sources and scope the feature's context

### Results

- Owner: Keith.
- Changes and why: Added task 6.4 (local live SoCLaaS check, Keith-entered distinct student key, ≤4 attempts, no retries). Added design D9 (injection sources I1–I8; server decides facts, model only words them; opaque R/K labels; facts vs notes separation; text canaries), revised D3/D4, new requirement SP-10 and task 3.3a. openspec validate --strict passes. No code changed.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: openspec/changes/student-progress/design.md#d9.
- Remaining limitations and next owner: Keith says apply; Darryl gets the I1 upstream suggestion in the handoff.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T03:59:17.127Z | 2026-11-13T03:59:50.541Z | final | claude-opus-5-5 | medium | 2549 | 789 | 2549 |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T04:03:01.026Z | open | provisional | claude-opus-5-5 | medium | 7082 | 2065 | 7082 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | 2026-11-13T03:52:05.123Z | provisional | final | 27574 | 5101 | 27574 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 4633500; cached input subset 4529758; output 37205; reasoning output subset 7955; total 4670705.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-progress:sp-apply-01 -->
<!-- experiment-turns:sp-apply-01:2907cb42421c1e69,7a64b9673eaf60da -->
## Checkpoint `sp-apply-01` — 2026-11-13T04:20:32.652003+00:00

### Request

apply (implement openspec change student-progress)

### Results

- Owner: Keith.
- Changes and why: Implemented tasks 1.1–5.3 and 6.3 (20/24). Shared contract and validator with text canaries; server selection, comparability gate, resolver (R/K labels, facts vs notes), migration 0017, service, GET/POST routes, progress rate limit; shared wiring (studentAIConfig, env, index composition, .dev.vars.example) with Darryl review pending; Progress page, client, course link, CSS. Found that the gateway's single pinned soclaas-shared quota policy forces the student limits to equal the instructor's (recorded in D7 and the handoff). Rework: control-char regex literal broke esbuild; immutable publications forced new injected-title fixtures; DOM queries scoped to main; date text tripped the score check; CSS link rule needed :not(.cw-action); no-ex-assign lint. Checks: focused 77/77; student web 223/223; strict validate ok; typecheck and lint ok; npm run check fails only on workflow/ai-quality-evaluation/ledger.test.ts, which also fails on unmodified b362618 (stash test). 6.1, 6.2, 6.4 and 6.5 open.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-progress/verification.md; workflow/evidence/student-progress/ui-review.md; workflow/handoffs/student-progress.md.
- Remaining limitations and next owner: Keith: enter a separate student key in .dev.vars for live check 6.4; manual UI review; Darryl: review shared wiring and quota constraint.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T04:05:12.373Z | open | provisional | claude-opus-5-5 | medium | 89727 | 17256 | 89727 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | 2026-11-13T04:03:01.026Z | provisional | final | 8378 | 2065 | 8378 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 19908427; cached input subset 19653777; output 128228; reasoning output subset 25211; total 20036655.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.

> Correction to checkpoint `sp-apply-01` (2026-11-13): the task count is **18 of 22** done (open: 6.1, 6.2, 6.4, 6.5), not "20/24".


<!-- experiment-checkpoint:student-progress:sp-live-01 -->
<!-- experiment-turns:sp-live-01:3bf4e392e9a6b868,4e3d67df0bdbe25d,d71dbee46fe70ebe -->
## Checkpoint `sp-live-01` — 2026-11-13T04:28:02.608257+00:00

### Request

Keith entered the student key; asked how the local check runs, then approved up to 4 calls

### Results

- Owner: Keith.
- Changes and why: Explained the harness, then ran it. Opt-in workflow/student-progress/live-progress.test.ts (skips without PROGRESS_LIVE=1) uses Darryl's boundedTransport and withoutAutomaticRetries. Run 1 failed before any generation: the quoted .dev.vars key was sent with its quotes, giving 401 on models (fixed with dotenv quote handling), and fixture assignment IDs clashed (fixed). Run 2: models 200, L1 accepted, L2 injected rejected (evidence as prose; injection not followed), L3 accepted; L1 leaked R1/R2 into prose. Repaired the prompt and added a label rule to progressText (+2 tests). Run 3: L2 accepted, injection ignored, no leak. 4 generation calls total, 2159 in / 914 out tokens, no 429, timeout or retry. Offline progress suites 64/64; strict validate ok. Task 6.4 checked; open: 6.1 (pre-existing ledger failure), 6.2 (manual UI), 6.5.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-progress/live-check.md.
- Remaining limitations and next owner: Keith: manual UI review and commit/PR; Darryl: shared wiring and quota review.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T04:22:20.384Z | 2026-11-13T04:22:50.858Z | final | claude-opus-5-5 | medium | 2683 | 1144 | 2683 |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T04:25:04.101Z | open | provisional | claude-opus-5-5 | medium | 15642 | 3092 | 15642 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | 2026-11-13T04:05:12.373Z | provisional | final | 91436 | 17436 | 91436 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 24442490; cached input subset 24158899; output 148262; reasoning output subset 29627; total 24590752.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-progress:sp-revise-01 -->
<!-- experiment-turns:sp-revise-01:f307bcd53341dc76,ea0a9ffeefe6c7d4,eeb90b6cb4cf9d59,fb4a54e4d716e397,d984468e416d3f14 -->
## Checkpoint `sp-revise-01` — 2026-11-13T04:55:43.511223+00:00

### Request

Relax the comparable-criteria gate: always summarise up to the 3 most recent assignments; Good job encouragement when all feedback is positive

### Results

- Owner: Keith.
- Changes and why: Keith chose: full marks decided from scores; AI-written strengths under a fixed Good job line; always a recent summary plus progress sections when criteria match. Implemented: shared contract (keyScores, recent/allFullMarks context, recentAssignments payload with strength/focus rules, comparable-only progress observations, no-feedback state, view flags); server selection, prompt and mapping; page (Recent assignments with What went well / To work on, Good job line, summary-not-comparison note, no-feedback message); spec SP-03/06/06a/07/09, proposal decisions 4-5, design D2/D3/D4, tasks 3.8-3.9. Rework: the gateway cache answered repeat requests in two misbehaving-model tests, so they now use fresh students. Checks: affected suites 499 passed, 2 skipped; typecheck and lint ok; strict validate ok; frontend rebuilt. The live check results are for the old prompt; 3.9 rerun pending approval.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: openspec/changes/student-progress/; dist rebuilt for local review.
- Remaining limitations and next owner: Keith: approve live rerun (3.9) and test locally at 8787; then manual UI review.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T04:28:57.329Z | 2026-11-13T04:30:00.804Z | final | claude-opus-5-5 | medium | 5622 | 2204 | 5622 |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T04:34:30.422Z | 2026-11-13T04:34:59.005Z | final | claude-opus-5-5 | medium | 2048 | 674 | 2048 |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T04:42:15.192Z | 2026-11-13T04:42:36.704Z | final | claude-opus-5-5 | medium | 1725 | 536 | 1725 |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T04:46:34.642Z | open | provisional | claude-opus-5-5 | medium | 35058 | 8113 | 35058 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | 2026-11-13T04:25:04.101Z | provisional | final | 16799 | 3120 | 16799 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 38081019; cached input subset 37733288; output 193872; reasoning output subset 41182; total 38274891.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-progress:sp-local-01 -->
<!-- experiment-turns:sp-local-01:529249c996634f1a,513282e6084e1b68,a0a7510cca12c399,e0c5de2cc2ccadc8,d3d21b3f6ddf08de -->
## Checkpoint `sp-local-01` — 2026-11-13T05:11:11.060806+00:00

### Request

Local review: restart help, 503 failures, then accepted

### Results

- Owner: Keith.
- Changes and why: Keith's local runs through the real app against SoCLaaS: 2 rejections diagnosed and repaired. (1) The code check flagged 'return …' and 'import …' prose; narrowed to code-shaped patterns, with a probe of 15 feedback sentences. (2) A label leaked into a suggestion; known labels are now renamed to quoted titles and criterion names at display, unknown ones rejected. Added an operator log of the failing rule (path and code only). Then 2 successes; Keith accepted. Suites 88/88; frontend rebuilt; strict validate ok. Rework: a mis-scoped vitest --root / probe hung and was stopped; reran with an esbuild bundle.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-progress/verification.md.
- Remaining limitations and next owner: Keith: manual UI checks and the remaining local cases; optional 3.9 live matrix; then commit/PR and Darryl review.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T04:57:36.606Z | 2026-11-13T04:57:39.892Z | final | claude-opus-5-5 | medium | 267 | 0 | 267 |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T04:58:57.760Z | 2026-11-13T05:02:33.358Z | final | claude-opus-5-5 | medium | 7707 | 2873 | 7707 |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T05:03:29.602Z | 2026-11-13T05:04:40.090Z | final | claude-opus-5-5 | medium | 5937 | 1630 | 5937 |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T05:10:45.558Z | open | provisional | claude-opus-5-5 | medium | 2201 | 651 | 2201 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | 2026-11-13T04:46:34.642Z | provisional | final | 35871 | 8113 | 35871 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 44327326; cached input subset 43961478; output 210797; reasoning output subset 46336; total 44538123.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-progress:sp-pr-01 -->
<!-- experiment-turns:sp-pr-01:7af44de180e98018,e592cbd040c9a48e -->
## Checkpoint `sp-pr-01` — 2026-11-13T05:13:37.341722+00:00

### Request

Mark 6.2 manual checks complete; commit and open PR

### Results

- Owner: Keith.
- Changes and why: Recorded Keith's reported manual checks (not itemized) and ticked 6.2; refreshed ui-review and handoff. Final checks: prettier, typecheck, lint, strict validate; affected suites 505 passed, 2 skipped. Verified the student key is not in any committed file. Commits b40e223 (feat) and 3b9a4ab (docs) on keith/student-progress; PR #47 opened, asking Darryl to review the shared wiring and quota pool. The docs commit message miscounts tasks (19/23); the PR states the correct 21/24.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/47.
- Remaining limitations and next owner: Darryl: review PR #47 shared wiring; Keith: optional 3.9 live matrix; 6.1/6.5 after the ledger test is fixed.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | root | 2026-11-13T05:11:44.808Z | open | provisional | claude-opus-5-5 | medium | 8206 | 1025 | 8206 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 140dd212 | 2026-11-13T05:10:45.558Z | provisional | final | 2650 | 651 | 2650 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 48657709; cached input subset 48279114; output 219452; reasoning output subset 47361; total 48877161.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.
