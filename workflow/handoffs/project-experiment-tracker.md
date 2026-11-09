# Handoff: project-experiment-tracker

- Human owner: Keith.
- Agent role / model / configuration: main implementation/self-review only; no child agents. Exposed model/effort live in private tracker records; no inferred configuration or independent review.
- Requirement IDs and OpenSpec change: EXP-01–06, DEV-02/DEV-04; `project-experiment-tracker`.
- Input commit/artifact versions: main `d7f2f34`; output branch `codex/project-experiment-tracker`, uncommitted implementation at handoff. No merge or deployment.
- Owned files: `workflow/experiment-tracker/`, repository `project-experiment` skill, this change and evidence/member log/handoff; additive ignore and Keith logging guidance (AGENTS.md and logs/README.md). One writer; no role-service/shared API edits.
- Relevant context supplied / retrieved: approved conversation plan and Keith-only/independent-collector choices; OpenSpec/ownership/contracts; existing Keith log template; official hook documentation; local source schema keys and explicit current session only.
- Changes and decisions: independent scoped hooks + metadata importer, private SQLite, explicit annotations and coordination checks, offline filterable HTML, redacted exports and idempotent per-increment log checkpoints. No TurnUp source/data/config integration. Existing global hooks are preserved.
- Verification commands and actual results: [verification](../evidence/project-experiment-tracker/verification.md); 29 synthetic tracker tests, full `npm run check` (352+4 tests), skill validation, local browser/pilot reconciliation passed. Sandbox listener/browser startup failures resolved with approved execution permissions.
- Security findings / unresolved defects: raw prompt/tool/reasoning fields discarded; source scope checked; unavailable metrics not zeroed. No outstanding confirmed blocking finding from self-review. No independent review claimed.
- Resource measurements: local current-session snapshot provisional; initial pilot reconciled 39 response records and replay was idempotent. Checkpoint totals are cumulative and include the entire explicitly attached session. No savings claim. Private `.experiment-tracker/report.html` provides details; explicit summary export provides source group IDs.
- Blockers and next action: no implementation blocker. Live project callbacks require a new/restarted client session; sync then inspect doctor. Reconcile prior-turn final usage next session.
- Next owner: Keith; use the repository skill and [commands](../experiment-tracker/README.md) for future substantial increments. A new increment creates one log; later sessions/checkpoints append to it. Routine questions need no entry.
- Independent review outcome: unavailable; main self-review and executed checks only. Actual future multi-agent/context comparisons and human acceptance remain separate evidence.

## Recording revision handoff — 2026-11-08

The approved revision supersedes the v1 whole-session behavior above. [Revision evidence](../evidence/project-experiment-tracker/recording-revision.md) records explicit opt-in, run/window/turn admission, graceful pause/stop/drain, nested-child linkage, runtime-preserving role history and legacy migration. SQLite v1 backup and the 104 unbounded records remain private and excluded from bounded totals. Earlier log/export numbers are historical only.

Main agent implemented and self-reviewed; no subagents spawned. 49 tracker cases, full project checks (352+4), skill validation, browser run/role/legacy filters and exact current-turn pilot reconciliation passed. A source-replay legacy preservation finding was repaired and regression-tested; original data was restored from the intact backup. No independent review claimed.

Next owner Keith: the pilot is stopped into draining at handoff, so run sync/status after this final response to settle its terminal record; do not activate from an ordinary question. Actual live project callbacks and a real multi-turn pause/general/resume sequence still require restart/loading and explicit opt-in. Task 5.4 remains open solely for that live lifecycle verification. No merge, archive or deployment.


## Setup publication checkpoint — 2026-11-09

Prepared on `codex/project-experiment-tracker` at base `62eb11d`, with experiment setup and contract decision confirmation in separate commits. [Current verification](../evidence/project-experiment-tracker/recording-revision.md#setup-publication-verification--2026-11-09): 49 tracker cases, skill validation and full project checks pass (14 strict changes, 376 Vitest cases, four deployment cases, type/lint/build) using Node 24.21.0. Earlier uncommitted statuses above describe their historical checkpoints; final source commits and PR are identified by publication metadata.

Existing admitted records were reconciled without activating recording for this request. No new pilot export or live callback experiment is claimed. Task 5.4 remains open, and no archive, merge or deployment is included. Keith's contract/design acceptance is now recorded in IntegrationContracts.md; source-review clearance and student consumer verification remain separate. Next owner: Keith for PR review and subsequent student dashboard work.


## PR review repair continuation — 2026-11-09

Both user-reported defects are repaired against `a794d01` for PR #23: replay now rebuilds source-derived terminal state, and blocked intervals pair only within their increment. [Repair verification](../evidence/project-experiment-tracker/recording-revision.md#pr-review-repairs--2026-11-09) records failing-before/passing-after regressions, 57 passing tracker tests and the passing full project check (376+4 cases). Tasks 6.1–6.2 complete; task 5.4 remains open. Main implementation/self-review only, no children or recording activation. Next owner: Keith reviews the PR repair and later explicitly opts into real live-client lifecycle verification.


## Complete-prefix repair continuation — 2026-11-09

Against `c7130ec`, confirmed that same-size middle-of-file rewrites escape the tail-only check. Complete consumed-prefix SHA-256 validation now detects them and replays terminal/usage evidence; old checkpoints replay once. [Verification and hashing tradeoff](../evidence/project-experiment-tracker/recording-revision.md#complete-prefix-rewrite-verification--2026-11-09): two failing-before cases, all 61 tracker tests and full project check (376+4) pass. Task 6.3 complete; task 5.4 remains open. Main-only repair; recording remains off for this request. Next owner: Keith reviews the PR #23 update and later explicitly opts into live-client verification.


## Usage coverage and header repair continuation — 2026-11-09

Against `09ccb87`, both findings reproduced and repaired: completed turns missing usable usage and absent counters now produce explicit partial coverage; malformed transcript headers/payloads are validated consistently and child hooks retain empty successful responses without invalid admission/persistence. [Verification](../evidence/project-experiment-tracker/recording-revision.md#usage-coverage-and-malformed-header-verification--2026-11-09): all 69 tracker cases and full project checks (376+4) pass. Tasks 6.4–6.5 complete, overall 12/13; task 5.4 remains pending. Main-only work; no recording opt-in or independent review. Next owner: Keith reviews PR #23 and separately opts into live-client verification.


## Dashboard membership/filter continuation — 2026-11-09

Against `4bb2181`, both report findings are confirmed and repaired: snapshots/JSON exports retain actual run membership; linked/unadmitted children remain visible with source rows; report coverage/status follows selected increment/group/run/session scope. [Verification and scope limits](../evidence/project-experiment-tracker/recording-revision.md#dashboard-membership-and-filter-verification--2026-11-09) records baseline failures, 70 passing Python cases, 12 actual-report DOM regressions and full project checks (388+4). Tasks 6.6–6.7 complete, overall 14/15; task 5.4 remains open. Source-wide warnings, model/annotation scope and workspace-wide overhead are documented. Main-only work, no recording activation or independent review. Next owner: Keith reviews PR #23 and later explicitly opts into real live-client verification.
