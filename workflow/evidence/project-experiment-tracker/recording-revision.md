# Explicit recording revision — 2026-11-08

Owner: Keith. Branch: `codex/project-experiment-tracker`, uncommitted implementation. Requirements EXP-07–09 plus EXP-01–06/DEV-02/04. This supplements the preserved v1 [verification](verification.md); it does not retroactively reinterpret the old whole-session experiment.

## Implemented boundaries

- Default off. Explicit start/resume includes only the reliably identified initiating turn. Registration, annotations, directory context and routine tasks never opt in.
- Pause/stop freeze admission, then drain admitted root/child turns using source terminal evidence. Hook Stop does not prove counters flushed. Partial finalization requires an explicit flag and records incomplete coverage.
- Both queue writes and importer admission serialize against controls in SQLite. Excluded usage rows are never stored; structural IDs/cumulative baselines may be inspected to avoid charging gaps.
- Actual parent evidence permits nested inheritance while recording; no new child joins while draining. Unknown/conflicting relationships remain excluded. Role labels retain runtime/session identities and append history.
- v1 SQLite was backed up before migration. Legacy/unbounded records remain retained but excluded; prior logs/exports stay historical. New exports carry run/window provenance.

## Executed verification

| Check                 | Actual outcome                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python tracker suite  | PASS: 49 synthetic cases, including default off, initiating-turn inclusion, excluded earlier/general turns, pause/resume, root/child drain, late admitted usage after stop, explicit partial finalization, cumulative-boundary gaps, role history, multiple increments per session, nested linkage, concurrent starts/queue writes, source replay and migration/privacy/log invariants. |
| `npm run check`       | PASS: 11 strict OpenSpec changes, TypeScript, ESLint, 352 Vitest cases in 31 files, 4 Node deployment cases and Vite build. Approved local listener access used for Miniflare, as in v1.                                                                                                                                                                                                |
| Skill validator       | PASS: bundled `quick_validate.py` using the existing temporary validation environment. Runtime remains dependency-free.                                                                                                                                                                                                                                                                 |
| Browser               | PASS: revised run selector, Coordinator/runtime display, legacy exclusion, increment/task filters and reset; 8 metric cards and 7 section headings; no page errors. Mobile 375px screenshot inspected locally. Headless browser needs approved execution permissions on this host.                                                                                                      |
| Current-source pilot  | PASS: explicit current session only, exactly one initiating turn admitted. At the first bounded checkpoint, 14 unique response records reconciled exactly against source counters for that turn; replay preserved totals. Earlier turns are excluded. Current-turn final usage remains provisional.                                                                                     |
| Migration recovery    | PASS after repair: 104 original legacy records retained and excluded, with their original logs/exports unchanged.                                                                                                                                                                                                                                                                       |
| Live client callbacks | NOT OBSERVED: project hooks were installed during the existing running session. Actual restart/load and real multi-turn pause/general-question/resume callback sequence remain pending. Synthetic hooks and source sequences are not reported as live callbacks.                                                                                                                        |

## Self-review findings and repairs

Main agent only; no children or independent reviewer spawned. Source replay initially deleted legacy rows sharing the source path. The migration backup was intact; 104 rows were restored from it, replay deletion was restricted to bounded records, and a regression verifies preservation through repeated source resets. An actual v1-column migration case also passes. No old measurement was silently relabelled as bounded.

Import admission now holds the same write lock as lifecycle controls so an importer cannot admit a turn from a stale recording-state read after pause. Concurrent activation admits only one run. Dashboard filtering uses run IDs rather than a session's last increment, preventing cross-increment contamination when one session has several runs.

## Limits and next verification

The actual pilot is a current-turn-only reconciliation, not a completed live pause/resume experiment. The current run will be stopped into graceful draining at handoff; this turn's terminal source record and final usage appear after the assistant finishes. Next session, run sync/status/report to settle it and reconcile admitted late counters. Do not auto-resume. Restart/review project hooks and explicitly opt into a fresh run for the real paused-general-question/resumed-project smoke test.

Ambiguous first cumulative samples at boundaries are excluded and marked partial. Paused discussion may still be input context for later recorded requests; separate chats provide cleaner comparisons. Runtime identity supplied for a child's initial role is an explicit annotation, not independent proof of its path. This work measures no causal token savings, cost reduction, idle time or multi-agent benefit.


## Setup publication verification — 2026-11-09

Base: `62eb11d` on `codex/project-experiment-tracker`. Requirements EXP-01–09 and DEV-02/04. Main agent reviewed the setup and prepared publication; no child agents or independent review. Existing redacted pilot exports are historical snapshots and were not regenerated for this request. Private state, local hook configuration and Python caches remain ignored.

- `python3 -m unittest discover -s workflow/experiment-tracker -v`: PASS, 49 synthetic cases.
- Bundled skill `quick_validate.py`, using `/private/tmp/codewise-tracker-skill-venv/bin/python`: PASS. System Python lacks PyYAML; the existing validation environment supplies it without adding a runtime dependency.
- `npm ci --no-audit --no-fund`: PASS with Node 24.21.0 and the committed lockfile. The initial Node 22.19.0 sandbox attempt warned about engine requirements and stalled; it was interrupted before the successful install. No package/lockfile edits.
- `npm run check` with Node 24.21.0 and local listener permissions: PASS, 14 strict OpenSpec changes, TypeScript, ESLint, 376 Vitest tests in 35 files, four deployment tests and Vite build. This resolves the earlier missing-local-dependencies typecheck failure.
- `git diff --check`: PASS before staging. Targeted scan of shared tracker evidence/log/skill found no local home paths, transcript paths or credential patterns; only explicit redacted metadata exports are included.
- Existing tracker `sync` and `report`: PASS; historical admitted records reconciled without starting/resuming recording. This publication turn is not opted in; its usage is unavailable in the tracker and no savings claim is made.

Contract/design confirmation is a separate documentation commit: Keith directly accepted C-ID, onboarding, dashboard contexts and K1–K6 on 2026-11-09. Exact-revision source review, real student integration and unresolved SH-SUB policy proposals remain pending. Preserve the old K-packet anchor for historical links. No runtime, API, database or application UI change is included in that confirmation.

Task 5.4 stays open for real loaded-client callback and pause/general/resume lifecycle verification. No live recording test, independent review, deployment, archive or completed student implementation is claimed by publication.


## PR review repairs — 2026-11-09

Input: `a794d01`, PR #23. User reported two confirmed defects; main implemented and self-reviewed the repairs without child agents. Requirements EXP-02/03/04/08/09; tasks 6.1–6.2 complete, overall 9/10 tasks. Live callback task 5.4 remains open.

1. Source replay deleted lifecycle records while retaining `admitted.terminal`, allowing pause/stop to settle on removed evidence. Reset terminal and source-derived abort flags for the affected session within the import transaction, then reconstruct them from replayed lifecycle records. Preserve explicit partial finalization and other sessions. Run-level partial warnings stay conservative; closed runs are not automatically reopened or recording activated.
2. Blocked interval keys omitted `increment_id`, pairing unrelated experiments with reused session/agent/task/dependency identifiers. Include the increment in the key. All-increment and filtered reports now agree; unmatched annotations remain open without fabricated duration.

Verification:

- Before repairs, new regression cases failed for removed terminal evidence (truncation/rewrite with both pause/stop) and cross-increment wait pairing: five failing assertions. Existing tests continued to pass.
- After repairs, `python3 -m unittest discover -s workflow/experiment-tracker -v`: PASS, 57 cases. Eight new tests cover the four replay/drain combinations, surviving completion and unrelated-session preservation, derived abort reset, explicit partial preservation, and interleaved increment waits/filter parity. Restored terminal evidence settles draining and repeated sync remains safe.
- `npm run check` using Node 24.21.0 with local listener access: PASS, 14 strict changes, typecheck, lint, 376 Vitest cases in 35 files, four deployment tests and Vite build.
- OpenSpec apply confirms tasks 6.1 and 6.2 complete; task 5.4 is still pending. `git diff --check`: PASS.
- Existing tracker sync/report completed without opt-in or new exports. This request has no recorded usage; no live callback, browser UI change, independent reviewer, savings, migration or deployment claim.

Next: review the repair commit in PR #23, then perform separately opted-in live lifecycle verification. Historical pilot summaries remain unchanged.


## Complete-prefix rewrite verification — 2026-11-09

Input: `c7130ec`, PR #23. The user supplied a valid additional case: changing an earlier consumed record while preserving the source header, byte length and final 256 bytes defeats the tail checkpoint. Earlier rewrite regressions changed bytes inside the tail and did not establish middle-of-file detection. Main reproduced and repaired this case; no child agents or independent reviewer.

- Before repair, two new tests failed: removed terminal evidence remained `task_complete`, and rewritten input usage stayed at 100 rather than 200. Fixtures explicitly assert identical header, byte length and tail.
- Replace tail-only validation with SHA-256 over the complete consumed prefix, read in chunks of at most 1 MiB. Extend the digest with newly consumed complete lines. Incomplete trailing lines change neither checkpoint offset nor hash. A mismatch, truncation or legacy checkpoint missing the stronger digest triggers scoped replay and the existing terminal-state reset. No new database schema or raw source persistence.
- After repair, all 61 Python tracker tests pass. Four added tests cover terminal/usage rewrites before an unchanged tail (with padding spanning multiple hashing chunks), append/partial-line checkpoint behaviour and legacy checkpoint upgrade. Repeated sync does not duplicate measurements; restored completion settles stop.
- Full `npm run check` with Node 24.21.0 and local listener permissions passes: 14 strict OpenSpec changes, typecheck, lint, 376 Vitest cases in 35 files, four deployment cases and Vite build. `git diff --check` passes.
- OpenSpec task 6.3 is complete; overall 10/11 tasks, with live-client lifecycle task 5.4 still open. Existing private tracker sync/report succeeds without activating recording; current-request usage is unavailable and historical shared exports are unchanged.

Tradeoff: every sync reads/hashes O(consumed bytes) under the existing import transaction; hashing memory is bounded and unchanged records are not reparsed. This is not an atomic filesystem snapshot against concurrent in-place mutation during the same sync; subsequent sync revalidates the prefix. No live callback, UI acceptance, independent review, merge or deployment is claimed.

Next owner: Keith reviews the additional repair in PR #23 and later performs separately opted-in live-client verification.


## Usage coverage and malformed-header verification — 2026-11-09

Input: `09ccb87`, PR #23. Both user findings are valid and were reproduced before repair. Main implementation and self-review only; no child agents or independent reviewer. Requirements EXP-01/02/04/06/07/09, tasks 6.4–6.5 complete; overall 12/13, live-client task 5.4 still open.

- Missing usage: one completed measured turn plus a completed unmeasured turn incorrectly produced `observed-complete` with only the first turn's total. Compare each completed admitted turn within the selected runs against usable total-token records. Missing turns and unavailable counter fields mark coverage partial with explicit gaps. Preserve known observed sums and null unknowns, accept measured zeros, and reevaluate on late usage. Exports carry the same status and gap information. This does not prove response-level completeness within a turn that has some measurements.
- Malformed header: a linked child's source-bearing callback could parse `[]` then raise AttributeError, yielding traceback/nonzero exit. A shared header parser now requires a session_meta object and object payload before dereferencing fields in attach, import, current-turn lookup and hook admission. Existing ValueError handling returns `{}` with exit zero and empty stderr, without admitting the child turn or registering/persisting its invalid source. No broad programming-error catch was introduced.

Verification:

- Before repair, regressions reproduced incorrect coverage classification and malformed-header failures across callback/attachment/import paths. The mixed measured/unmeasured case returned `observed-complete`; malformed child callbacks exited nonzero. New measured-zero control passed before and after.
- After repair, all 69 Python tracker cases pass (eight added). Coverage tests include late usage recovery, no usable counters, partial counters, measured zeros, increment isolation and exported status. Header tests exercise arrays, null, numeric/string roots and array/null payloads, verifying CLI exit/stdout/stderr and no source registration/admission/queue additions; registered-source import/current-turn and attachment reject safely.
- Full `npm run check` with Node 24.21.0 and local listener permissions passes: 14 strict OpenSpec changes, typecheck, lint, 376 Vitest cases in 35 files, four deployment cases and Vite build. `git diff --check` passes.
- Existing private tracker sync/report succeeds without recording activation. Current-request measured usage is unavailable; historical shared exports are unchanged. No live callback evidence or deployment is claimed.

Next owner: Keith reviews the follow-up repair in PR #23 and later explicitly opts into live-client lifecycle verification.


## Dashboard membership and filter verification — 2026-11-09

Input: `4bb2181`, PR #23. Both findings are valid: the browser derived session membership from admissions, dropping linked/unadmitted children, and reused global coverage/status across filters. Main implementation/self-review only; no child agents or independent reviewer. Requirements EXP-01/02/04/09; tasks 6.6–6.7 complete, overall 14/15. Live-client task 5.4 remains pending.

- Snapshot and JSON summaries now expose actual member rows (`run_id`, `session_id`, `parent`). The dashboard uses those rows to select runs and sessions, including a linked child paused before admission. Every selected session has a source row; missing transcripts are explicit rather than hidden.
- Dynamic coverage and generated-header status are recomputed for selected increment/group/run/session relationships. Missing sources, source warnings, completed-turn usage gaps, unavailable counters, fallback and pending/draining evidence stay within that selection. A complete selected experiment is not labelled by unrelated gaps; conflicting empty filters show unavailable; reset restores global coverage. Reused sessions are associated through their actual run memberships.
- Session-specific status uses selected turn partial flags; whole-run partial flags remain in the run table. Source warnings remain source-wide for selected sessions. Model filtering narrows totals only; coverage includes all models in selected runs/sessions. Task filtering narrows annotations; run-specific coverage omits annotation gaps without run attribution. Legacy counts and sync overhead are labelled workspace-wide.

Verification:

- Python baseline regression failed because snapshot/export omitted `members`. After repair all 70 Python tracker tests pass, including paused-before-admission member/export identity and privacy checks.
- Initial DOM harness used a non-file import.meta URL; corrected template loading before baseline comparison. The seven initial report regressions all failed against the original HTML and passed after repair. Expanded coverage now has 12 passing jsdom/Vitest cases executing the actual report script and change/reset controls: linked source/missing-source rows, increment/group/run/session isolation, empty selections, reset, shared-session runs, pending/draining, unavailable counters/fallback and per-session partial isolation.
- Full `npm run check` on Node 24.21.0 with local listener access: PASS, 14 strict OpenSpec changes, typecheck, ESLint, 388 Vitest cases in 36 files (including the 12 report cases), four deployment cases and Vite build. `git diff --check` passes.
- Existing private sync/report succeeds without activating recording; current-request usage is unavailable. Historical shared pilot exports remain unchanged. No new dependency, database migration, application UI/runtime change, browser screenshot, live callback, manual UI acceptance, merge or deployment is claimed. DOM regression tests are not a live-client lifecycle test.

Next owner: Keith reviews the additional PR #23 repair and separately opts into live-client lifecycle verification.


## Settled lifecycle and partial provenance verification — 2026-11-09

Input: `23e5b09`, PR #23. Both findings are valid: replay after a settled stop left stopped-plus-unresolved admissions, and removed abort evidence left a sticky run partial flag. Two initial regressions reproduced both failures. Main implementation/self-review only; no children or independent reviewer. Requirements EXP-02/07/08/09; tasks 6.8–6.9 complete, overall 16/17; live-client task 5.4 remains open. Earlier checkpoint statements that closed runs stay closed and run partial flags remain conservative describe the superseded implementation.

- Reconcile run aggregates from rebuilt admissions after terminal transitions, replay and metadata startup. Stopped/paused intent returns to the matching draining state when non-finalized terminal evidence disappears, then settles when restored. Recording windows remain closed; new turns/children are not admitted by recovery.
- Separate explicit `finalized_partial` provenance from source-derived abort flags. Admission/run partial values are rebuilt from remaining evidence and explicit rows. Removing abort evidence clears stale partial classification, while explicit partial finalization persists through late completion and replay. Other admissions' abort/partial state is retained.
- The backed-up additive private SQLite upgrade preserves identifiable old explicit rows, repairs existing stale aggregates and adjusts the active-root index to permit historical stop recovery beside a newer live run while preserving one recording/paused owner. The transactional start guard still blocks new runs while unresolved work exists. Previously erased provenance cannot be reconstructed.
- Default status finds open recovery before the latest settled history. `status --session ROOT --run ID` and root-owned `finalize --session ROOT --run ID --partial` target historical recovery without finalizing or changing a newer run. No real partial-finalization command was run during this request; tests use temporary synthetic databases.

Verification:

- All 81 Python tracker cases pass (11 added). Cases cover settled stop/pause rewrites, later terminal restoration, no implicit admission/window reopening, explicit recovery, stale abort flags in snapshots/exports, other admissions, persistent explicit provenance, CLI targeting, newer live/stopped runs, and backed-up v2 upgrades including the original index beside a newer recording. Existing concurrent-start and callback/privacy cases still pass.
- Full Node 24.21.0 `npm run check` with local listener access passes: 14 strict OpenSpec changes, typecheck, ESLint, 388 Vitest cases in 36 files (including 12 report cases), four deployment cases and build. Updated repository skill validation and `git diff --check` pass.
- Existing private tracker sync/report and database integrity validation pass; the existing metadata upgrade was backed up. Recording was not started/resumed; current-request usage is unavailable and historical shared pilot exports are unchanged.

Next owner: Keith reviews the follow-up in PR #23 and later explicitly opts into live-client lifecycle verification. No application D1 migration, provider operation, merge, deployment or live callback/manual acceptance is claimed.
