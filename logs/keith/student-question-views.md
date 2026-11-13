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


<!-- experiment-checkpoint:student-question-views:apply-01 -->
<!-- experiment-turns:apply-01:098cd2fbc34f8942,b6cd52533ab7c563,31ff6ac08a777c48,8b0a2d38c6d59718,c17ebf0972f229af,7b34f873c4e393da,ae25e2895127725e,8807320dfff9634e,f7a129421853297b,a3d95764b7b9e5bb,e57910c3e66420f4,06a401740558e2c4,0014543ed41ad7d6,343de14a5c10fbe6,445aa64751c68248,f6afe464747881bb,7905c5e34417be6f,629b8dbbc298a33b,0f8e218a7ce3be52,98ff12c324c814d9,f75cb56080c9f27e,b892b4e923d602d1,0682427cafffd74b,f4b32a2311e05aee,8be00b9958c96747,d914eca76841fe96,1af00cde708b0edb -->
## Checkpoint `apply-01` — 2026-11-13T02:45:05.589869+00:00

### Request

Compare three independent Sonnet proposals and worktree implementations for the per-question views; adopt A with fixes

### Results

- Owner: Keith.
- Changes and why: Three Plan proposals (A/B/C) and three worktree implementations produced. Keith chose A. Applied A plus fixes (per-question markers, attempt-held release version with reset announcement, view in announcement, extra failure/refetch/race tests). npm run check exit 0 (789 passed, 2 skipped). Tasks 2.1, 2.2, 3.1, 3.2, 4.2 ticked; 2.3/4.1 partial pending SQ-05. B/C worktrees removed. Local sign-in on Vite ports blocked by AUTH_ORIGIN; preview via 8787 build workaround.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [Verification](../../workflow/evidence/student-question-views/verification.md), [Proposals](../../workflow/evidence/student-question-views/proposals/).
- Remaining limitations and next owner: Keith: manual review at 127.0.0.1:8787; decide whether SQ-05/SQ-07 join this PR; then commit/PR with Darryl as reviewer.

### Agents spawned

- Coordinator turn started 2026-11-13T01:59:30.719Z spawned Plan / Plan (ab5994cd).
- Coordinator turn started 2026-11-13T01:59:30.719Z spawned Plan / Plan (ad2a342a).
- Coordinator turn started 2026-11-13T01:59:30.719Z spawned Plan / Plan (a2148d0f).
- Coordinator turn started 2026-11-13T02:06:12.006Z spawned general-purpose / general-purpose (a9d2a26f).
- Coordinator turn started 2026-11-13T02:06:12.006Z spawned general-purpose / general-purpose (a8fbd157).
- Coordinator turn started 2026-11-13T02:06:12.006Z spawned general-purpose / general-purpose (a6eab888).

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 7cb88687 | root | 2026-11-13T01:50:44.196Z | 2026-11-13T01:52:12.848Z | final | claude-opus-5-5 | medium | 2876 | 189 | 2876 |
| Coordinator / coordinator | 7cb88687 | root | 2026-11-13T01:55:22.068Z | 2026-11-13T01:55:30.474Z | final | claude-opus-5-5 | medium | 512 | 0 | 512 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T01:56:03.726Z | 2026-11-13T01:56:21.030Z | final | claude-opus-5-5 | medium | 1108 | 26 | 1108 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T01:57:23.271Z | 2026-11-13T01:57:42.451Z | partial | claude-opus-5-5 | medium | 1013 | 99 | 1013 (partial) |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T01:59:30.719Z | 2026-11-13T02:00:06.380Z | final | claude-opus-5-5 | medium | 3888 | 765 | 28484 |
| Plan / Plan | ab5994cd | Coordinator (84b02526) / 58dd1c78 | 2026-11-13T01:59:57.333Z | open | provisional | claude-sonnet-5-5 | high | 9178 | 5221 | 9178 |
| Plan / Plan | ad2a342a | Coordinator (84b02526) / 58dd1c78 | 2026-11-13T01:59:57.350Z | open | provisional | claude-sonnet-5-5 | high | 8574 | 4563 | 8574 |
| Plan / Plan | a2148d0f | Coordinator (84b02526) / 58dd1c78 | 2026-11-13T01:59:57.380Z | open | provisional | claude-sonnet-5-5 | high | 6844 | 3425 | 6844 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:00:55.415Z | 2026-11-13T02:00:57.234Z | final | claude-opus-5-5 | medium | 53 | 18 | 53 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:01:08.505Z | 2026-11-13T02:01:10.225Z | final | claude-opus-5-5 | medium | 24 | 0 | 24 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:01:14.064Z | 2026-11-13T02:01:43.345Z | final | claude-opus-5-5 | medium | 2746 | 916 | 2746 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:03:37.384Z | 2026-11-13T02:04:28.596Z | final | claude-opus-5-5 | medium | 7002 | 360 | 7002 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:06:12.006Z | 2026-11-13T02:06:51.876Z | final | claude-opus-5-5 | medium | 4311 | 917 | 151851 |
| general-purpose / general-purpose | a8fbd157 | Coordinator (84b02526) / 82bb362f | 2026-11-13T02:06:43.303Z | open | provisional | claude-sonnet-5-5 | high | 65392 | 23584 | 65392 |
| general-purpose / general-purpose | a6eab888 | Coordinator (84b02526) / 82bb362f | 2026-11-13T02:06:43.308Z | open | provisional | claude-sonnet-5-5 | high | 36029 | 7307 | 36029 |
| general-purpose / general-purpose | a9d2a26f | Coordinator (84b02526) / 82bb362f | 2026-11-13T02:06:43.309Z | open | provisional | claude-sonnet-5-5 | high | 46119 | 10985 | 46119 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:11:59.026Z | 2026-11-13T02:12:01.731Z | final | claude-opus-5-5 | medium | 159 | 0 | 159 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:12:01.749Z | 2026-11-13T02:12:03.287Z | final | claude-opus-5-5 | medium | 27 | 0 | 27 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:13:04.165Z | 2026-11-13T02:13:07.444Z | final | claude-opus-5-5 | medium | 216 | 0 | 216 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:13:07.454Z | 2026-11-13T02:13:08.967Z | final | claude-opus-5-5 | medium | 22 | 0 | 22 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:15:43.917Z | 2026-11-13T02:16:33.995Z | final | claude-opus-5-5 | medium | 2717 | 572 | 2717 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:25:09.063Z | 2026-11-13T02:26:24.383Z | final | claude-opus-5-5 | medium | 5524 | 2241 | 5524 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:27:19.081Z | 2026-11-13T02:27:24.150Z | final | claude-opus-5-5 | medium | 409 | 29 | 409 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:32:32.268Z | 2026-11-13T02:32:39.781Z | final | claude-opus-5-5 | medium | 709 | 28 | 709 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:38:10.173Z | 2026-11-13T02:38:18.999Z | final | claude-opus-5-5 | medium | 731 | 107 | 731 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:38:47.808Z | open | provisional | claude-opus-5-5 | medium | 20187 | 5089 | 20187 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 7cb88687 | 2026-11-13T01:47:04.588Z | provisional | final | 10401 | 2187 | 10401 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 55342327; cached input subset 54253860; output 357485; reasoning output subset 88591; total 55699812.
- Coverage/status: partial; 9 linked sessions, 3 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-question-views:apply-02 -->
<!-- experiment-turns:apply-02:c61e88210f99a5a1,68e03b0b0ae72fd4,1151a09e4ef3aa4c,d1ac079493eb811a,43d5c06f76fbdc13 -->
## Checkpoint `apply-02` — 2026-11-13T02:59:49.258062+00:00

### Request

Implement SQ-05 URL state and SQ-07 overview link in this PR, then verify

### Results

- Owner: Keith.
- Changes and why: Tasks 1.1, 1.2, 2.3, 4.1, 5.1, 6.1 done by the coordinator without subagents. npm run check exit 0 (802 passed, 2 skipped); strict validation valid. A vacuous race test was found and corrected. Unrelated package-lock.json churn flagged for exclusion.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [Verification](../../workflow/evidence/student-question-views/verification.md).
- Remaining limitations and next owner: Keith: 6.2 manual UI review at 8787; then 6.3 handoff, SF-03/DR-03 wording reconciliation, commit and PR (Darryl reviews).

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:48:45.892Z | 2026-11-13T02:48:52.983Z | final | claude-opus-5-5 | medium | 648 | 58 | 648 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:49:57.425Z | 2026-11-13T02:50:10.573Z | final | claude-opus-5-5 | medium | 1060 | 294 | 1060 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:52:56.587Z | 2026-11-13T02:53:14.408Z | final | claude-opus-5-5 | medium | 1710 | 402 | 1710 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T02:53:46.655Z | open | provisional | claude-opus-5-5 | medium | 29239 | 6867 | 29239 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 84b02526 | 2026-11-13T02:38:47.808Z | provisional | final | 22440 | 5253 | 22440 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 64765726; cached input subset 63624224; output 392395; reasoning output subset 96376; total 65158121.
- Coverage/status: partial; 9 linked sessions, 3 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-question-views:handoff-01 -->
<!-- experiment-turns:handoff-01:7143305100e64897,5f0ead00dcbc2b76,9a57cb417010e76a,36c18f190ed0b231,bdce28991d091623 -->
## Checkpoint `handoff-01` — 2026-11-13T03:10:37.617059+00:00

### Request

Finish the increment: 6.2 as owner MVP acceptance, SF-03/DR-03 wording, housekeeping and 6.3 handoff

### Results

- Owner: Keith.
- Changes and why: All 13 tasks complete. 6.2 marked complete by Keith as suitable for MVP; ui-review.md records unverified rows. SF-03 and SQ-04 deltas aligned to DR-03 Score: X / N. package-lock.json churn reverted; worktree A removed. Handoff written. npm run check exit 0 (802 passed, 2 skipped); strict validation valid. Uncommitted.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [Handoff](../../workflow/handoffs/student-question-views.md), [Verification](../../workflow/evidence/student-question-views/verification.md), [UI review](../../workflow/evidence/student-question-views/ui-review.md).
- Remaining limitations and next owner: Keith: approve commit and PR; Darryl: review; then hosted staging, archive and stop recording.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T03:03:16.241Z | 2026-11-13T03:04:25.927Z | final | claude-opus-5-5 | medium | 5313 | 1983 | 5313 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T03:05:09.784Z | 2026-11-13T03:05:22.289Z | final | claude-opus-5-5 | medium | 1004 | 101 | 1004 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T03:07:22.903Z | 2026-11-13T03:08:00.699Z | final | claude-opus-5-5 | medium | 3585 | 208 | 3585 |
| Coordinator / coordinator | 84b02526 | root | 2026-11-13T03:08:41.064Z | open | provisional | claude-opus-5-5 | medium | 6232 | 540 | 6232 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 84b02526 | 2026-11-13T02:53:46.655Z | provisional | final | 30123 | 6867 | 30123 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 72068520; cached input subset 70899793; output 409413; reasoning output subset 99208; total 72477933.
- Coverage/status: partial; 9 linked sessions, 3 bounded runs. Only admitted turns count; legacy unbounded records are excluded.
