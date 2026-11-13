# Student question views

Owner: Keith. Increment: `student-question-views`. Requirements: TBD (set by openspec-propose). Branch/PR: <reference, or unavailable>.

## How entries work

- **One entry per substantial request, at a checkpoint.** Routine questions, and work while recording is off, need no entry. This is Keith's policy and is separate from Darryl's every-prompt format.
- **Entries are generated** by `python3 workflow/experiment-tracker/tracker.py checkpoint ...`. Do not hand-edit generated tables. Append corrections as a new entry, and never rewrite history.
- **Sections in each entry:** Request, Results, Agents spawned, Turn activity, Reconciliation and Coverage.
- **Turn activity** lists only admitted turns not shown at an earlier checkpoint. A turn's output is therefore never counted in two Turn activity tables.
- **Reconciliation** appends final values for turns that an earlier entry showed as provisional, pending or partial. The earlier row stays unchanged.
- **Counters:** tables show output and reasoning output tokens only. Output measures how much an agent produced, not what it cost. Input, cached input and cache writes stay in the private report and in the cumulative Coverage line. Do not add cumulative checkpoint totals together.
- **Committed content:** labels, roles, 8-character session prefixes, timestamps, models, efforts, statuses and counters only. Never source paths, raw prompts, tool content or learner code. Missing values are `unavailable`, never zero.


<!-- experiment-checkpoint:student-question-views:propose-01 -->
<!-- experiment-turns:propose-01:7a2169b2157b812b -->
## Checkpoint `propose-01` — 2026-11-13T00:50:13.946361+00:00

### Request

Start recording; propose student-question-views (per-question Submitted/Released feedback views follow-up)

### Results

- Owner: Keith.
- Changes and why: Recording started (root Coordinator, no agents). OpenSpec change created: proposal, specs (new student-question-views SQ-01-07; modified SW-08, SF-03, SF-05), design, tasks. Keith chose 3 tabs + attempt summary, URL view/attempt state, latest-attempt overview link. openspec validate --strict passed. Planning only; no code changed.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: openspec/changes/student-question-views/proposal.md.
- Remaining limitations and next owner: Keith: review artifacts, then request apply.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | root | 2026-11-13T00:43:52.760Z | open | provisional | claude-opus-5-5 | medium | 22763 | 2902 | 22763 |

### Reconciliation

No earlier provisional, pending or partial turns changed status.

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 2830022; cached input subset 2732941; output 22763; reasoning output subset 2902; total 2852785.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-question-views:refinements-01 -->
<!-- experiment-turns:refinements-01:ef152aa0b1e9ee91,0a8d955b68e0a334 -->
## Checkpoint `refinements-01` — 2026-11-13T01:04:26.851813+00:00

### Request

Plan student times (SGT), max-only points, assignment status tags; split into a second change

### Results

- Owner: Keith.
- Changes and why: Verified instructor review screens use machine-local toLocaleString (SGT only because the Mac is set to Asia/Singapore). Created separate change student-dashboard-refinements (DR-01-03 display conventions, AS-01-03 status tags via a new Keith-owned status endpoint; no migration, SD list DTO unchanged). student-question-views left unchanged. Both changes pass openspec validate --strict. Planning only; no code changed. No agents.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: openspec/changes/student-dashboard-refinements/proposal.md.
- Remaining limitations and next owner: Keith: review both changes, then request apply; archive-order note for SD-02 and SF-03.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | root | 2026-11-13T00:57:33.019Z | open | provisional | claude-opus-5-5 | medium | 22995 | 5567 | 22995 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | 2026-11-13T00:43:52.760Z | provisional | final | 23638 | 2940 | 23638 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 6083796; cached input subset 5947797; output 46633; reasoning output subset 8507; total 6130429.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-question-views:apply-refinements-01 -->
<!-- experiment-turns:apply-refinements-01:43e04c78141016da,c934e8ea0b0174d7 -->
## Checkpoint `apply-refinements-01` — 2026-11-13T01:14:29.559877+00:00

### Request

Apply student-dashboard-refinements (DR-01-03 times/points/scores, AS-01-03 status tags)

### Results

- Owner: Keith.
- Changes and why: On branch keith/student-dashboard-refinements (uncommitted): tasks 1.1-4.1 done. Singapore-time formatter, (N points), Score: X / N, new Keith-owned GET /api/student/courses/:id/assignment-status (repeated id query; revised from comma ids during apply), client tags. npm run check exit 0 on rerun (770 passed); first run had one flaky unrelated SoCLaaS ledger test (1 fail/2 pass in isolation). openspec validate --strict valid. 4.2 UI review and 4.3 handoff open. No agents. Note: work is for student-dashboard-refinements but recorded under the active student-question-views run.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-dashboard-refinements/verification.md.
- Remaining limitations and next owner: Keith: browser UI review and acceptance (4.2), then handoff (4.3); commit/PR when asked.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | root | 2026-11-13T01:05:36.365Z | open | provisional | claude-opus-5-5 | medium | 40188 | 5571 | 40188 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | 2026-11-13T00:57:33.019Z | provisional | final | 23898 | 5607 | 23898 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 18056588; cached input subset 17835495; output 87724; reasoning output subset 14118; total 18144312.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-question-views:refinements-layout-01 -->
<!-- experiment-turns:refinements-layout-01:ef9442db74e57198,e53ce232e9306c5e,3eb47d0f6e49ad9e -->
## Checkpoint `refinements-layout-01` — 2026-11-13T01:30:03.553913+00:00

### Request

Keith accepted 4.2 for MVP; move Open action / View assignments to the far right of rows

### Results

- Owner: Keith.
- Changes and why: Recorded 4.2 as Keith-reported MVP acceptance (no template/screenshots; matrix unverified). Task 3.2: assignment rows use instructor row pattern (details left, Open right, tag under deadline); course entry spans row (fixed .cw-student a inline-flex override). Artifacts updated (AS-01 wording, proposal decision 6, design, tasks). npm run check exit 0 (771 passed). Layout not yet re-viewed in a browser. No agents. Recorded under the active student-question-views run.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-dashboard-refinements/verification.md.
- Remaining limitations and next owner: Keith: glance at row layout in the browser; then 4.3 handoff and commit/PR when asked.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | root | 2026-11-13T01:16:09.068Z | 2026-11-13T01:16:38.154Z | final | claude-opus-5-5 | medium | 2606 | 742 | 2606 |
| Coordinator / coordinator | 856f12d0 | root | 2026-11-13T01:27:24.717Z | open | provisional | claude-opus-5-5 | medium | 9853 | 2673 | 9853 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | 2026-11-13T01:05:36.365Z | provisional | final | 41156 | 5571 | 41156 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 22748732; cached input subset 22503539; output 101151; reasoning output subset 17533; total 22849883.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-question-views:long-title-fix-01 -->
<!-- experiment-turns:long-title-fix-01:4e62b9c426fe9249,00f24a141a3ddba7 -->
## Checkpoint `long-title-fix-01` — 2026-11-13T01:34:48.392846+00:00

### Request

Fix long assignment title collapsing the row (Open action not wrapping)

### Results

- Owner: Keith.
- Changes and why: Cause: shared .cw-row-action flex-shrink:0 with title-length link text. Student-only CSS: link flex 0 1 auto, max-width 16rem (none <=600px); details min-width min(16rem,100%). Headless Edge static renders at 320/390/700/1280 show word wrapping, no overflow (screenshots in evidence). Regression test added; npm run check exit 0 (771 passed). No agents.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-dashboard-refinements/verification.md.
- Remaining limitations and next owner: Keith: confirm in running app; then 4.3 handoff and commit/PR when asked.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | root | 2026-11-13T01:32:46.403Z | open | provisional | claude-opus-5-5 | medium | 6118 | 1356 | 6118 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | 2026-11-13T01:27:24.717Z | provisional | final | 10445 | 2673 | 10445 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 25011086; cached input subset 24748365; output 107861; reasoning output subset 18889; total 25118947.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-question-views:handoff-pr-01 -->
<!-- experiment-turns:handoff-pr-01:60b96fa92f1bea2d,524eaaa6e934d94d -->
## Checkpoint `handoff-pr-01` — 2026-11-13T01:38:17.261202+00:00

### Request

Keith accepted the long-title fix; do all remaining: handoff, commit, PR

### Results

- Owner: Keith.
- Changes and why: Task 4.3 handoff written (workflow/handoffs/student-dashboard-refinements.md); change 10/10 tasks. Committed on keith/student-dashboard-refinements and opened PR for Darryl review. student-question-views planning artifacts left out of this PR. No agents.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/handoffs/student-dashboard-refinements.md.
- Remaining limitations and next owner: Darryl: review PR; Keith: staging after merge, then archive in documented order.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | root | 2026-11-13T01:37:11.780Z | open | provisional | claude-opus-5-5 | medium | 5835 | 732 | 5835 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | 2026-11-13T01:32:46.403Z | provisional | final | 6576 | 1356 | 6576 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 27663622; cached input subset 27389663; output 114154; reasoning output subset 19621; total 27777776.
- Coverage/status: provisional; 1 linked sessions, 1 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-question-views:archive-dashboard-01 -->
<!-- experiment-turns:archive-dashboard-01:eb9d3d6aa933af20,5e1e055fe6cbdaea,a0e05d3dfa9bbac1,0017de3d1d8b10c7,3290dca88b2d232d -->
## Checkpoint `archive-dashboard-01` — 2026-11-13T01:49:45.831587+00:00

### Request

Identify the proposed Keith spec; archive student-dashboard-refinements following its handoff archive order

### Results

- Owner: Keith.
- Changes and why: Keith chose: follow the order and move SF-03/DR-03 to student-question-views. Archived student-assignment-dashboard (new main spec SD-01-06). Added an SD-02 MODIFIED delta to refinements (UTC label replaced by DR-01) and updated the proposal. Synced the new AS-01-03 and DR-01-03 main specs and archived refinements. Added the SF-03 follow-up to the student-question-views tasks. npm run specs:validate passed: 21/21. Branch keith/archive-student-dashboard-changes, not committed. PR #40 staging deploy passed; production awaiting approval. No agents.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: openspec/changes/archive/2026-11-13-student-dashboard-refinements/proposal.md.
- Remaining limitations and next owner: Keith: review and commit/PR the archive branch; then apply student-question-views.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | root | 2026-11-13T01:39:53.947Z | 2026-11-13T01:40:01.852Z | final | claude-opus-5-5 | medium | 509 | 0 | 509 |
| Coordinator / coordinator | 7cb88687 | root | 2026-11-13T01:42:41.628Z | 2026-11-13T01:43:06.139Z | final | claude-opus-5-5 | medium | 1871 | 126 | 1871 |
| Coordinator / coordinator | 7cb88687 | root | 2026-11-13T01:45:48.106Z | 2026-11-13T01:46:02.464Z | final | claude-opus-5-5 | medium | 1270 | 116 | 1270 |
| Coordinator / coordinator | 7cb88687 | root | 2026-11-13T01:47:04.588Z | open | provisional | claude-opus-5-5 | medium | 9649 | 2131 | 9649 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 856f12d0 | 2026-11-13T01:37:11.780Z | provisional | final | 8745 | 832 | 8745 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 31676381; cached input subset 31334041; output 130363; reasoning output subset 22094; total 31806744.
- Coverage/status: provisional; 2 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.
