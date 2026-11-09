# Synthetic activity

Owner: Keith. Increment: `synthetic-activity`. Requirements: EXP-11-13. Branch/PR: <reference, or unavailable>.

## How entries work

- **One entry per substantial request, at a checkpoint.** Routine questions, and work while recording is off, need no entry. This is Keith's policy and is separate from Darryl's every-prompt format.
- **Entries are generated** by `python3 workflow/experiment-tracker/tracker.py checkpoint ...`. Do not hand-edit generated tables. Append corrections as a new entry, and never rewrite history.
- **Sections in each entry:** Request, Results, Agents spawned, Turn activity, Reconciliation and Coverage.
- **Turn activity** lists only admitted turns not shown at an earlier checkpoint. A turn's output is therefore never counted in two Turn activity tables.
- **Reconciliation** appends final values for turns that an earlier entry showed as provisional, pending or partial. The earlier row stays unchanged.
- **Counters:** tables show output and reasoning output tokens only. Output measures how much an agent produced, not what it cost. Input, cached input and cache writes stay in the private report and in the cumulative Coverage line. Do not add cumulative checkpoint totals together.
- **Committed content:** labels, roles, 8-character session prefixes, timestamps, models, efforts, statuses and counters only. Never source paths, raw prompts, tool content or learner code. Missing values are `unavailable`, never zero.


<!-- experiment-checkpoint:synthetic-activity:first -->
<!-- experiment-turns:first:7879598494be0816,0b455af36fe53db1 -->
## Checkpoint `first` — 2026-11-09T13:24:21.898845+00:00

### Request

Synthetic first request

### Results

- Owner: Keith.
- Changes and why: Synthetic results
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: unavailable.
- Remaining limitations and next owner: Keith; inspect report coverage before acceptance.

### Agents spawned

- Coordinator turn started 2026-11-09T13:24:21.894839+00:00 spawned Reviewer / reviewer (syntheti).

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | syntheti | root | 2026-11-09T13:24:21.894839+00:00 | open | provisional | unavailable | unavailable | 180 | 40 | 220 |
| Reviewer / reviewer | syntheti | Coordinator (syntheti) / turn-1 | 2026-11-09T13:24:21.896796+00:00 | 2026-11-09T13:24:21.896800+00:00 | final | unavailable | unavailable | 40 | 8 | 40 |

### Reconciliation

No earlier provisional, pending or partial turns changed status.

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 1500; cached input subset 1200; output 220; reasoning output subset 48; total 1720.
- Coverage/status: provisional; 2 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:synthetic-activity:second -->
<!-- experiment-turns:second:3fa18255444c44c9,87fdd35dc6ff6c48 -->
## Checkpoint `second` — 2026-11-09T13:24:21.900454+00:00

### Request

Synthetic second request

### Results

- Owner: Keith.
- Changes and why: Synthetic results
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: unavailable.
- Remaining limitations and next owner: Keith; inspect report coverage before acceptance.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | syntheti | root | 2026-11-09T13:24:21.899220+00:00 | 2026-11-09T13:24:21.899223+00:00 | final | unavailable | unavailable | 15 | unavailable | 15 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | syntheti | 2026-11-09T13:24:21.894839+00:00 | provisional | final | 180 | 40 | 220 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 2000; cached input subset 1600; output 235; reasoning output subset unavailable; total 2235.
- Coverage/status: partial; 2 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.
