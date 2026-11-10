# Student drafts

Owner: Keith. Increment: `student-drafts`. Requirements: SW-01–SW-10 (SUB-02–SUB-04, C-SUB). Branch/PR: `keith/student-drafts`, draft PR (see below).

## How entries work

- **One entry per substantial request, at a checkpoint.** Routine questions, and work while recording is off, need no entry. This is Keith's policy and is separate from Darryl's every-prompt format.
- **Entries are generated** by `python3 workflow/experiment-tracker/tracker.py checkpoint ...`. Do not hand-edit generated tables. Append corrections as a new entry, and never rewrite history.
- **Sections in each entry:** Request, Results, Agents spawned, Turn activity, Reconciliation and Coverage.
- **Turn activity** lists only admitted turns not shown at an earlier checkpoint. A turn's output is therefore never counted in two Turn activity tables.
- **Reconciliation** appends final values for turns that an earlier entry showed as provisional, pending or partial. The earlier row stays unchanged.
- **Counters:** tables show output and reasoning output tokens only. Output measures how much an agent produced, not what it cost. Input, cached input and cache writes stay in the private report and in the cumulative Coverage line. Do not add cumulative checkpoint totals together.
- **Committed content:** labels, roles, 8-character session prefixes, timestamps, models, efforts, statuses and counters only. Never source paths, raw prompts, tool content or learner code. Missing values are `unavailable`, never zero.


<!-- experiment-checkpoint:student-drafts:proposal-2026-11-10 -->
<!-- experiment-turns:proposal-2026-11-10:f4c73325853ac880,901ddda642263bb8,79620c96f1c455f1,04a9b0ad20be7c0d -->
## Checkpoint `proposal-2026-11-10` — 2026-11-10T04:31:42.137622+00:00

### Request

Draft the student-drafts OpenSpec proposal from Keith's 2026-11-10 decisions (no late submissions, unlimited attempts with latest assessed, idempotency and save/submit recommendations, K4, Python with one source per question, retention until course archive + 90 days, pinned drafts, conflict window, CodeMirror 6 editor gate, migration 0015, C-SUB catalog handoff).

### Results

- Owner: Keith.
- Changes and why: Created openspec/changes/student-drafts (proposal, specs/student-submissions SW-01–SW-10, design, tasks 1.1–7.2) on branch keith/student-drafts. openspec validate --strict passes. Planning only: no application code, shared files, migration or dependency edited; no commit or push. Main /root only, no subagents. Darryl's acceptance of the writer window, the C-SUB gates, the Python decision and the retention dependency is pending.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: openspec/changes/student-drafts/.
- Remaining limitations and next owner: Keith reviews the plan and arranges task 1.1/1.2 with Darryl; the apply workflow starts on a later instruction..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a7cfb9e4 | root | 2026-11-10T04:06:25.190Z | 2026-11-10T04:07:10.855Z | final | claude-opus-5-5 | medium | 1991 | 362 | 1991 |
| Coordinator / coordinator | a7cfb9e4 | root | 2026-11-10T04:07:35.827Z | 2026-11-10T04:08:12.719Z | final | claude-opus-5-5 | medium | 3309 | 486 | 3309 |
| Coordinator / coordinator | a7cfb9e4 | root | 2026-11-10T04:17:50.005Z | 2026-11-10T04:19:01.845Z | final | claude-opus-5-5 | medium | 6466 | 3248 | 6466 |
| Coordinator / coordinator | a7cfb9e4 | root | 2026-11-10T04:27:21.090Z | open | provisional | claude-opus-5-5 | medium | 23600 | 3583 | 23600 |

### Reconciliation

No earlier provisional, pending or partial turns changed status.

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 2747224; cached input subset 2638837; output 35366; reasoning output subset 7679; total 2782590.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.
