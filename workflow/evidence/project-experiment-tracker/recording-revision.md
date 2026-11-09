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
