# Student released feedback

Owner: Keith. Increment: `student-released-feedback`. Requirements: GRADE-01–04, SUB-04, REL-01–06, C-REL. Branch/PR: <reference, or unavailable>.

## How entries work

- **One entry per substantial request, at a checkpoint.** Routine questions, and work while recording is off, need no entry. This is Keith's policy and is separate from Darryl's every-prompt format.
- **Entries are generated** by `python3 workflow/experiment-tracker/tracker.py checkpoint ...`. Do not hand-edit generated tables. Append corrections as a new entry, and never rewrite history.
- **Sections in each entry:** Request, Results, Agents spawned, Turn activity, Reconciliation and Coverage.
- **Turn activity** lists only admitted turns not shown at an earlier checkpoint. A turn's output is therefore never counted in two Turn activity tables.
- **Reconciliation** appends final values for turns that an earlier entry showed as provisional, pending or partial. The earlier row stays unchanged.
- **Counters:** tables show output and reasoning output tokens only. Output measures how much an agent produced, not what it cost. Input, cached input and cache writes stay in the private report and in the cumulative Coverage line. Do not add cumulative checkpoint totals together.
- **Committed content:** labels, roles, 8-character session prefixes, timestamps, models, efforts, statuses and counters only. Never source paths, raw prompts, tool content or learner code. Missing values are `unavailable`, never zero.


<!-- experiment-checkpoint:student-released-feedback:proposal-2026-11-12 -->
<!-- experiment-turns:proposal-2026-11-12:f6b9103b310c3ddf,a7d457ed5d156127 -->
## Checkpoint `proposal-2026-11-12` — 2026-11-11T19:42:02.705729+00:00

### Request

Archive student-drafts (sync student-submissions main spec), start recording, then propose the student released-feedback consumer change.

### Results

- Owner: Keith.
- Changes and why: student-drafts archived to openspec/changes/archive/2026-11-12-student-drafts with first main spec openspec/specs/student-submissions (11 req, strict valid). Created openspec/changes/student-released-feedback: proposal, student-feedback spec SF-01–SF-08, design D1–D6, tasks 1.1–6.2. openspec validate --strict passes. Three Keith decisions recorded (attempt-keyed port ask to Darryl, current+history, attempt-view placement). Planning only; no code.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [Proposal](../../openspec/changes/student-released-feedback/proposal.md).
- Remaining limitations and next owner: Keith: review artifacts and send Darryl the D1 attemptReleases ask (task 1.1); then apply..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 0730cfb2 | root | 2026-11-11T19:29:44.103Z | 2026-11-11T19:32:44.224Z | final | claude-opus-5-5 | medium | 4493 | 831 | 4493 |
| Coordinator / coordinator | 0730cfb2 | root | 2026-11-11T19:35:44.730Z | open | provisional | claude-opus-5-5 | medium | 21247 | 2546 | 21247 |

### Reconciliation

No earlier provisional, pending or partial turns changed status.

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 3251113; cached input subset 3176238; output 25740; reasoning output subset 3377; total 3276853.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.
