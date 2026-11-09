# Project experiment tracker

## Request

Keith — Project experiment tracker. Requirements: EXP-01–06; DEV-02/04. Increment: `project-experiment-tracker`.

## Results

- Changes and why:
- Contributor / agent responsibilities:
- Checks actually run and outcomes:
- Evidence or handoff links:
- Remaining limitations and next owner:

Keith retains this existing summary format. Append a Request/Results entry for substantial follow-ups in the same increment; preserve history and do not invent usage metrics.

**Darryl uses [the prompt-experiment template](darryl-prompt-experiment.md) for every prompt**, including questions, corrections and continuations. That additional logging requirement applies only to Darryl.


<!-- experiment-checkpoint:project-experiment-tracker:implementation -->
## Request

Implement the approved independent tracker on a new branch

## Results

- Checkpoint: 2026-11-08T11:14:41.788003+00:00 (`implementation`); owner: Keith.
- Changes and why: Added scoped collector, offline dashboard, project skill and Keith log checkpoints. Main agent only; no subagents spawned. Synthetic tests passed; full repository checks and pilot validation in progress.
- Contributor / agent responsibilities: see linked experiment annotations; no inferred agent activity.
- Measured usage: input 3371227; cached input subset 3133312; output 31062; reasoning output subset 2262; total 3402289.
- Coverage/status: provisional; 1 explicitly linked sessions. Totals are cumulative for this increment; do not add checkpoint totals together.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [Tracker verification](../../workflow/evidence/project-experiment-tracker/verification.md).
- Remaining limitations and next owner: Keith: inspect final verification and reconcile current-turn provisional usage next session.


<!-- experiment-checkpoint:project-experiment-tracker:verification -->
## Request

Complete and verify the approved tracker and Keith log integration

## Results

- Checkpoint: 2026-11-08T11:19:36.608536+00:00 (`verification`); owner: Keith.
- Changes and why: Implemented independent scoped hooks, importer, annotations, offline report, exports and idempotent Keith log checkpoints. Main agent only, no children. Passed 29 tracker tests, full npm run check (352 Vitest and 4 deployment cases), skill validation, browser filters and exact current-session source reconciliation. Fixed dashboard marker formatting, ownership windows and ancestry/log safety during self-review.
- Contributor / agent responsibilities: see linked experiment annotations; no inferred agent activity.
- Measured usage: input 4833700; cached input subset 4589056; output 37734; reasoning output subset 4728; total 4871434.
- Coverage/status: provisional; 1 explicitly linked sessions. Totals are cumulative for this increment; do not add checkpoint totals together.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [Verification](../../workflow/evidence/project-experiment-tracker/verification.md); [handoff](../../workflow/handoffs/project-experiment-tracker.md).
- Remaining limitations and next owner: Keith: restart/review project hooks, then sync and append a reconciliation checkpoint for the completed prior turn. Human acceptance and matched multi-agent/context trials remain separate..


<!-- experiment-checkpoint:project-experiment-tracker:bounded-revision -->
## Request

Implement explicit recording windows, graceful lifecycle controls, root roles and general-question exclusion

## Results

- Checkpoint: 2026-11-08T13:09:21.177855+00:00 (`bounded-revision`); owner: Keith.
- Changes and why: Main agent only; no children spawned. Added v2 run/window/turn admission with explicit opt-in, pause/resume/stop/status/partial finalize, child gating and role history. Old whole-session totals above are legacy/unbounded and excluded from bounded comparisons; 104 records retained, restored from backup after a source-replay defect was repaired and regression-tested. Passed 49 tracker cases, full npm run check (352+4), skill validation, browser filters and exact current-turn source reconciliation. Real restarted-client pause/general/resume callback lifecycle remains pending.
- Contributor / agent responsibilities: see linked experiment annotations; no inferred agent activity.
- Measured usage: input 3522154; cached input subset 3500928; output 28541; reasoning output subset 8570; total 3550695.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded totals are excluded. Totals are cumulative for this increment; do not add checkpoint totals together.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [Revision verification](../../workflow/evidence/project-experiment-tracker/recording-revision.md).
- Remaining limitations and next owner: Keith: sync/status after the current final response to settle the stopped pilot; restart/review hooks and explicitly opt into the live lifecycle smoke test. Do not add old unbounded or cumulative checkpoint totals to bounded totals..


## Request

2026-11-09: Commit the setup changes and create a pull request. Include the existing experiment tooling and the directly confirmed shared contract decisions, with separate logical commits.

## Results

- Human owner: Keith. Main agent inspected and prepared the changes; no subagents spawned or independent review claimed.
- Requirements: EXP-01–09, DEV-02/04; contract confirmation covers AUTH-01–03, COU-01–07, SUB-01–04, GRADE-01–04, PROG-01–03, AI-01–05 and UI-03 (`warm-workbook-v1`).
- Checks: 49 tracker tests and skill validation passed. Restored locked dependencies using Node 24.21.0; full `npm run check` passed (14 strict changes, typecheck, lint, 376 Vitest tests, four deployment tests and build). The earlier missing dependency failure is resolved.
- Recording remains off for this request. Existing admitted pilot records were synced and the private report refreshed; this request's measured usage is unavailable. Prior cumulative exports/log entries remain historical and are not added together.
- Evidence: [publication verification](../../workflow/evidence/project-experiment-tracker/recording-revision.md#setup-publication-verification--2026-11-09), [handoff](../../workflow/handoffs/project-experiment-tracker.md), [accepted contract decisions](../../workflow/IntegrationContracts.md#current-decision-status--keith-confirmation-2026-11-09).
- Publication: prepare two logical commits on `codex/project-experiment-tracker` and open a review PR; no merge or deployment. Exact published commits and PR are reported in the session and PR metadata.
- Next owner: Keith for PR review, explicit live tracker lifecycle verification (task 5.4), and subsequent producer-review/student-dashboard increment. Contract acceptance does not establish executed consumer integration.


## Request

2026-11-09: Investigate and repair PR findings concerning stale terminal state after transcript replay and blocked/unblocked pairing across increments.

## Results

- Human owner: Keith. User supplied both findings; main reproduced, repaired and self-reviewed them. No child agents or independent review.
- Requirements EXP-02/03/04/08/09: reset/recompute source-derived terminal flags on replay while retaining explicit partial finalization and unrelated sessions; include increment identity in wait pairing.
- Regression checks failed before repair for both reported defects. After repair all 57 tracker cases pass (eight new cases); full project check passes with Node 24.21.0: 14 strict changes, type/lint, 376 Vitest cases, four deployment cases and build. Diff whitespace checks pass.
- [Evidence](../../workflow/evidence/project-experiment-tracker/recording-revision.md#pr-review-repairs--2026-11-09); [handoff](../../workflow/handoffs/project-experiment-tracker.md#pr-review-repair-continuation--2026-11-09). Tasks 6.1–6.2 complete; overall 9/10, with live-client task 5.4 still open.
- Existing admitted tracker data synced and private report refreshed without activating recording; this request's measured usage is unavailable. Historical exports are unchanged.
- Publish the repair as a follow-up commit to PR #23. No merge, deployment or live-client verification. Next owner: Keith for repair review and separately opted-in live lifecycle verification.


## Request

2026-11-09: Verify the reported same-size rewrite outside the checkpoint tail and repair it if valid.

## Results

- Human owner: Keith. User supplied the additional finding; main reproduced and repaired it without children or independent review. Requirements EXP-02/08; task 6.3 complete, overall 10/11 with live-client task 5.4 still pending.
- Confirmed the previous tests only covered tail changes. Two new unchanged-header/size/tail regressions failed before repair for stale completion and stale usage. Hash the full consumed prefix in bounded chunks, extend only for complete lines, and replay legacy checkpoints once. Document O(consumed bytes) sync hashing cost and concurrent-file mutation limits.
- All 61 tracker tests pass; full Node 24.21.0 project check passes (14 strict changes, type/lint, 376 Vitest cases, four deployment cases and build); diff whitespace checks pass.
- [Evidence](../../workflow/evidence/project-experiment-tracker/recording-revision.md#complete-prefix-rewrite-verification--2026-11-09); [handoff](../../workflow/handoffs/project-experiment-tracker.md#complete-prefix-repair-continuation--2026-11-09). Historical evidence is preserved and corrected by this additional checkpoint.
- Existing private tracker sync/report succeeded without starting/resuming recording. This request's measured usage is unavailable; no shared pilot exports changed. Publish the follow-up repair to PR #23; no merge or deployment. Next owner: Keith for PR review and separately opted-in live-client verification.
