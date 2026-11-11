# Student drafts

Owner: Keith. Increment: `student-drafts`. Requirements: SW-01–SW-10 (SUB-02–SUB-04, C-SUB). Branch/PR: `keith/student-drafts`, draft PR #26.

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


<!-- experiment-checkpoint:student-drafts:domain-2026-11-10 -->
<!-- experiment-turns:domain-2026-11-10:48b471f8f20f0cbd,634660e009a94572,784bc29b803d2205,eb63676c300aad2f,600f8e0195841f36,92da76eb0d79fb01,03b95abe2035af93,9c77280ee6f41b22,9adb18f9a4a9164f,713df5ba1ef7d9fe,fa3ac52e1203b38a,3a28d247b90d798c,0bc2d91121b47639,dec5960eb6ebb60f -->
## Checkpoint `domain-2026-11-10` — 2026-11-10T05:22:00.577846+00:00

### Request

Apply student-drafts (Darryl approved all shared decisions); root as Coordinator spawning a Sonnet 5.5 domain Implementer and an Opus 5.5 Reviewer, then three UI Implementers

### Results

- Owner: Keith.
- Changes and why: Coordinator revised task 4.1/design §9 for three worktree workbook variants; recorded writer window (Ownership) and C-SUB gate acceptance (IntegrationContracts) on Keith's report; cited Cloudflare Free allowances. Domain Implementer delivered 2.1-2.3, 3.1-3.4, 6.1 and the 1.4 measurement; Reviewer found 0 high, 2 medium, 8 low, then N1 low after repair; all fixed except per-user rate limit (deferred to Keith as new scope). Coordinator re-ran npm run check: exit 0, 45 files / 527 tests. Committed defbd63. Tasks 1.1, 1.2, 1.4, 2.x, 3.x, 6.1 ticked after Coordinator verification.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [save cadence](../../workflow/evidence/student-drafts/save-cadence.md), [submit batch](../../workflow/evidence/student-drafts/submit-batch.md).
- Remaining limitations and next owner: Coordinator: launch three UI Implementer worktree variants (4.1, 5.1-5.3).

### Agents spawned

- Coordinator turn started 2026-11-10T04:47:21.064Z spawned Domain Implementer / implementer (a93df894).
- Coordinator turn started 2026-11-10T05:07:43.804Z spawned Reviewer / reviewer (a941df52).

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a7cfb9e4 | root | 2026-11-10T04:33:53.004Z | 2026-11-10T04:34:05.157Z | final | claude-opus-5-5 | medium | 1037 | 283 | 1037 |
| Coordinator / coordinator | a7cfb9e4 | root | 2026-11-10T04:36:54.726Z | 2026-11-10T04:37:34.988Z | final | claude-opus-5-5 | medium | 2706 | 254 | 2706 |
| Coordinator / coordinator | a7cfb9e4 | root | 2026-11-10T04:38:50.018Z | 2026-11-10T04:38:58.902Z | final | claude-opus-5-5 | medium | 568 | 0 | 568 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T04:40:41.979Z | 2026-11-10T04:41:02.891Z | final | claude-opus-5-5 | medium | 1581 | 123 | 1581 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T04:43:58.458Z | 2026-11-10T04:44:15.556Z | partial | claude-opus-5-5 | medium | 513 | 0 | 513 (partial) |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T04:47:21.064Z | 2026-11-10T04:52:46.717Z | final | claude-opus-5-5 | medium | 17781 | 3432 | 135435 |
| Domain Implementer / implementer | a93df894 | Coordinator (970664a8) / c14147bb | 2026-11-10T04:52:23.872Z | open | provisional | claude-sonnet-5-5 | medium | 117654 | 34987 | 117654 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T05:07:43.804Z | 2026-11-10T05:08:05.391Z | final | claude-opus-5-5 | medium | 2157 | 41 | 43201 |
| Reviewer / reviewer | a941df52 | Coordinator (970664a8) / 4011bd9c | 2026-11-10T05:08:00.118Z | open | provisional | claude-opus-5-5 | medium | 41044 | 21044 | 41044 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T05:14:43.460Z | 2026-11-10T05:15:33.719Z | final | claude-opus-5-5 | medium | 4826 | 1043 | 4826 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T05:17:43.358Z | 2026-11-10T05:19:22.760Z | final | claude-opus-5-5 | medium | 1394 | 126 | 1394 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T05:19:26.227Z | 2026-11-10T05:19:33.286Z | final | claude-opus-5-5 | medium | 593 | 40 | 593 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T05:20:39.989Z | open | provisional | claude-opus-5-5 | medium | 2339 | 449 | 2339 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a7cfb9e4 | 2026-11-10T04:27:21.090Z | provisional | final | 25235 | 3596 | 25235 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 24695818; cached input subset 23856514; output 231194; reasoning output subset unavailable; total 24927012.
- Coverage/status: partial; 4 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-drafts:ui-variants-2026-11-10 -->
<!-- experiment-turns:ui-variants-2026-11-10:133995202c517892,5f19ff6fb18d9c30,9929b84a68e377cd,eb691bb1f1bd6cd0,456860fc6f0c2096,549c309bd7419567,b2889895fd1a2f46,af74c586bf60f77f,a781c7430710e11e,05afcc924eec6e80,66b2eaa03b7a9808,0cd19ae8ec561155,d9de97b916454005,0673c6c21065d184 -->
## Checkpoint `ui-variants-2026-11-10` — 2026-11-10T06:20:12.496285+00:00

### Request

Build three student-draft UI variants with separate UI Implementer agents after the domain work, review them, and propose how Keith can run and compare them locally

### Results

- Owner: Keith.
- Changes and why: Three Sonnet 5.5 UI Implementers built full 5.1-5.3 workbooks in isolated worktrees off defbd63: A CodeMirror 6 (9e89d94), B textarea+prismjs (31ab727), C Monaco (3ec770b). Opus 5.5 Reviewer: A 2 low; B 1 low-medium, 1 low; C 1 high (Worker CSP style-src self breaks Monaco), 3 medium, 1 low; one repair round each, all fixed except C's CSP blocker. Coordinator re-ran npm run check per worktree: A 591, B 597, C 585 tests, all exit 0; no server/shared/migration/openspec edits on variant branches. Design §8 reworded per Reviewer ruling (older versions editable; 1-based URLs). Task 4.1 ticked; 5.x not ticked because no variant is merged. No real sign-in or live API was exercised by any agent.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [editor-gate comparison](../../workflow/evidence/student-drafts/editor-gate/comparison.md).
- Remaining limitations and next owner: Keith: run and compare the three variants, choose one and approve its dependencies (4.2); decide C's CSP question and the rate-limit question.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UI Implementer A (CodeMirror 6) / implementer | ac08cb72 | Coordinator (970664a8) / ec62087c | 2026-11-10T05:23:15.650Z | open | provisional | claude-sonnet-5-5 | medium | 191076 | 62421 | 191076 |
| UI Implementer B (textarea+prismjs) / implementer | ab0c9394 | Coordinator (970664a8) / ec62087c | 2026-11-10T05:23:15.657Z | open | provisional | claude-sonnet-5-5 | medium | 153818 | 47569 | 153818 |
| UI Implementer C (Monaco) / implementer | a8259647 | Coordinator (970664a8) / ec62087c | 2026-11-10T05:23:15.720Z | open | provisional | claude-sonnet-5-5 | medium | 164161 | 42563 | 164161 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T05:45:33.084Z | 2026-11-10T05:45:40.745Z | final | claude-opus-5-5 | medium | 532 | 166 | 532 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T05:50:48.558Z | 2026-11-10T05:50:50.273Z | final | claude-opus-5-5 | medium | 52 | 0 | 52 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T05:50:50.283Z | 2026-11-10T05:50:51.663Z | final | claude-opus-5-5 | medium | 12 | 0 | 12 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:03:21.878Z | 2026-11-10T06:05:58.758Z | final | claude-opus-5-5 | medium | 3445 | 378 | 3445 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:09:43.765Z | 2026-11-10T06:10:16.235Z | final | claude-opus-5-5 | medium | 3360 | 248 | 3360 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:11:34.843Z | 2026-11-10T06:11:36.277Z | final | claude-opus-5-5 | medium | 31 | 0 | 31 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:11:36.293Z | 2026-11-10T06:11:37.670Z | final | claude-opus-5-5 | medium | 11 | 0 | 11 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:12:49.902Z | 2026-11-10T06:12:51.651Z | final | claude-opus-5-5 | medium | 48 | 0 | 48 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:12:51.668Z | 2026-11-10T06:12:53.166Z | final | claude-opus-5-5 | medium | 11 | 0 | 11 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:17:02.506Z | open | provisional | claude-opus-5-5 | medium | 4982 | 933 | 4982 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 970664a8 | 2026-11-10T05:20:39.989Z | provisional | final | 12412 | 1250 | 521467 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 112339119; cached input subset 109390145; output 781594; reasoning output subset unavailable; total 113120713.
- Coverage/status: partial; 7 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.

> Correction (Coordinator, 2026-11-10): checkpoint `ui-variants-2026-11-10` shows "Agents spawned: None" because the Coordinator turn that spawned UI Implementers A, B and C (`ec62087c`) had already been shown at checkpoint `domain-2026-11-10`. The three UI Implementers were spawned in that turn; their rows above carry parent `ec62087c`.


<!-- experiment-checkpoint:student-drafts:editor-choice-2026-11-10 -->
<!-- experiment-turns:editor-choice-2026-11-10:33c191adec8e4a6b,8f2aa359ab90404c,baf78c9ed348c5f4,cccd409c35bce115,96aaa2d58bb21250,8d16005cc43ec138,b393d24f2a7db101,115961e64648785e,7038fd993199732a -->
## Checkpoint `editor-choice-2026-11-10` — 2026-11-10T07:07:18.068132+00:00

### Request

Keith compared the three variants locally and chose B

### Results

- Owner: Keith.
- Changes and why: Keith ran A, B, C on ports 8791-8793 against the real student API (Coordinator seeded his local accounts in B and C). Choice recorded in proposal decision 10, design §9 and comparison.md. Merged keith/student-drafts-ui-b (31ab727) as c347460; A and C unmerged. Coordinator npm run check on merged branch: exit 0, 47 files / 597 tests; package.json and lockfile unchanged. Tasks 4.2, 5.1-5.3 ticked; 17/21 complete.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [editor-gate comparison](../../workflow/evidence/student-drafts/editor-gate/comparison.md).
- Remaining limitations and next owner: Keith: decide rate limit; then 5.4 UI review + manual acceptance, 6.2 handoff/composition with Darryl, 7.1 composed acceptance, 7.2 final checks.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:26:36.047Z | 2026-11-10T06:26:40.913Z | final | claude-opus-5-5 | medium | 417 | 98 | 417 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:31:35.589Z | 2026-11-10T06:31:48.081Z | final | claude-opus-5-5 | medium | 1107 | 358 | 1107 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:35:59.062Z | 2026-11-10T06:36:04.409Z | final | claude-opus-5-5 | medium | 432 | 136 | 432 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:37:20.114Z | 2026-11-10T06:37:23.910Z | final | claude-opus-5-5 | medium | 339 | 0 | 339 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:45:17.665Z | 2026-11-10T06:45:32.585Z | final | claude-opus-5-5 | medium | 1007 | 298 | 1007 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:48:42.473Z | 2026-11-10T06:48:53.321Z | final | claude-opus-5-5 | medium | 513 | 36 | 513 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T06:56:54.973Z | 2026-11-10T06:57:08.614Z | final | claude-opus-5-5 | medium | 734 | 50 | 734 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T07:06:00.273Z | open | provisional | claude-opus-5-5 | medium | 3485 | 519 | 3485 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 970664a8 | 2026-11-10T06:17:02.506Z | provisional | final | 7998 | 1387 | 7998 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 116313555; cached input subset 113352491; output 792644; reasoning output subset unavailable; total 117106199.
- Coverage/status: partial; 7 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-drafts:ui-review-2026-11-11 -->
<!-- experiment-turns:ui-review-2026-11-11:26440246e2d82e96,9f9cf64d703edaac,06a852ec0f9d179d,3c2f254af7e39d46,5159a68270c52d60,87931cae422216aa,e7599bb4d1e77e12,7ac434572dd85271 -->
## Checkpoint `ui-review-2026-11-11` — 2026-11-10T19:54:53.813916+00:00

### Request

Conduct computer-use UI testing of merged workbook variant B and capture save/conflict states.

### Results

- Owner: Keith.
- Changes and why: Main agent only; no subagents. Native Edge reviewed required widths, both appearances, actual 200% zoom, reduced motion, keyboard and save/conflict states. 29 screenshots; contrast minimum 4.92:1. Return with F1 narrow conflict overflow, F2 undersized links and F3 conflict focus loss. npm run check passed: 597 Vitest and 4 deployment tests. Synthetic browser responses do not verify real authentication or durability. Current Codex tracker session off; no recording activated and current usage unavailable.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: [UI review](../../workflow/evidence/student-drafts/ui-review.md); [handoff](../../workflow/handoffs/student-drafts-ui-review.md).
- Remaining limitations and next owner: Keith: repair F1-F3, re-review and provide human acceptance; run real composed acceptance separately..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T07:09:01.837Z | 2026-11-10T07:09:19.794Z | final | claude-opus-5-5 | medium | 532 | 22 | 532 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-10T08:52:53.385Z | 2026-11-10T08:54:00.006Z | final | claude-opus-5-5 | medium | 969 | 128 | 969 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Domain Implementer / implementer | a93df894 | 2026-11-10T04:52:23.872Z | provisional | pending | 117654 | 34987 | 117654 |
| Reviewer / reviewer | a941df52 | 2026-11-10T05:08:00.118Z | provisional | pending | 59832 | 29053 | 59832 |
| UI Implementer A (CodeMirror 6) / implementer | ac08cb72 | 2026-11-10T05:23:15.650Z | provisional | pending | 191076 | 62421 | 191076 |
| UI Implementer B (textarea+prismjs) / implementer | ab0c9394 | 2026-11-10T05:23:15.657Z | provisional | pending | 153818 | 47569 | 153818 |
| UI Implementer C (Monaco) / implementer | a8259647 | 2026-11-10T05:23:15.720Z | provisional | pending | 164161 | 42563 | 164161 |
| Coordinator / coordinator | 970664a8 | 2026-11-10T07:06:00.273Z | provisional | final | 4127 | 519 | 4127 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 117433038; cached input subset 114428708; output 794787; reasoning output subset unavailable; total 118227825.
- Coverage/status: partial; 7 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.

### UI review verification correction — 2026-11-11

The generated checkpoint above records the earlier successful full check. A later full parallel `npm run check` exited 1: 592/597 passed, four 5000 ms timeouts and one course-invitation assertion failure. The affected three files then passed serially, 111/111, exit 0, without changing application code or timeout settings. All three outputs are linked from the UI review. The parallel cause is unproven. Current Codex session remains off; the generated historical activity/reconciliation tables do not measure this UI-review turn. No subagents were spawned. Final outcome remains return with F1–F3 and unverified real authenticated browser integration.


<!-- experiment-checkpoint:student-drafts:ui-review-repair-2026-11-11 -->
<!-- experiment-turns:ui-review-repair-2026-11-11:5d065493c40af176,eef18ad6f54eb766,3dc1c0abf7c560ec,32a08fcf3c9cd09d,7e62cdcf939cdc2d,d425d53fbc9b60e4 -->
## Checkpoint `ui-review-repair-2026-11-11` — 2026-11-11T05:44:32.213109+00:00

### Request

Restart usage tracking; repair UI review findings F1-F3 (task 5.4)

### Results

- Owner: Keith.
- Changes and why: Run a1e42c75 finalized partial (5 child turns lacking terminal evidence, Keith approved) and new run 3e568c5e started. F1 fixed (diff scroll box positioned). F2: session Sign in fixed, Workbook imports student.css; Skip to content (42px, shared styles.css) returned to Darryl. F3 focus moves with 2 failing-first DOM tests. npm run check exit 0, 599 tests. No agents spawned. 5.4 unchecked pending Keith acceptance; nothing committed.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-drafts/ui-review.md#repair-round-1-2026-11-11-claude-code-coordinator-self-repair-not-an-independent-re-review.
- Remaining limitations and next owner: Keith manual acceptance of the workbook, then tick 5.4 and commit; tell Darryl about the skip-link target and the auth lock flaky assertion.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T05:39:04.969Z | open | provisional | claude-opus-5-5 | medium | 22642 | 6083 | 22642 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Domain Implementer / implementer | a93df894 | 2026-11-10T04:52:23.872Z | pending | partial | 117654 | 34987 | 117654 (partial) |
| Reviewer / reviewer | a941df52 | 2026-11-10T05:08:00.118Z | pending | partial | 59832 | 29053 | 59832 (partial) |
| UI Implementer A (CodeMirror 6) / implementer | ac08cb72 | 2026-11-10T05:23:15.650Z | pending | partial | 191076 | 62421 | 191076 (partial) |
| UI Implementer B (textarea+prismjs) / implementer | ab0c9394 | 2026-11-10T05:23:15.657Z | pending | partial | 153818 | 47569 | 153818 (partial) |
| UI Implementer C (Monaco) / implementer | a8259647 | 2026-11-10T05:23:15.720Z | pending | partial | 164161 | 42563 | 164161 (partial) |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 121834976; cached input subset 118713889; output 817429; reasoning output subset unavailable; total 122652405.
- Coverage/status: partial; 7 linked sessions, 3 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-drafts:rate-limit-2026-11-12 -->
<!-- experiment-turns:rate-limit-2026-11-12:3a7fa695e5ef9cc7,e7b3801c54eda093,9c7f6d07ad7f8af1,d7ba59b3f946eb1c,9822842de4b7c420,8ad30295d27bd8d3,91c62eee16be1b2d,f887cc65603f5429,fdf29a154200d265,279ba59621bd68f9,c1f4b89d5f95e44a,2336c4ad2a28a1e9,93046d2a54ac9aef,7330fb58aeead180,66917cd336e756c1 -->
## Checkpoint `rate-limit-2026-11-12` — 2026-11-11T17:09:20.697371+00:00

### Request

Decide and build per-student rate limit (decision 13, SW-11): binding probe, drop binding, tasks 8.2/8.3

### Results

- Owner: Keith.
- Changes and why: Planning updated (decision 13, SW-11, design 10, tasks 8.x). Binding probe on deployment account: deployed, refused nothing (~90 requests); Keith dropped it (8.1 done, 8.4 not applicable). Built D1 limiter for saves 12/60s and submits 3/60s, client pause/resume and submit retry message. npm run check exit 0, 610 tests. No agents spawned. Uncommitted.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-drafts/rate-limit.md.
- Remaining limitations and next owner: 8.5 worst-case evidence; commit; then 6.2 handoff, 7.1, 7.2.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T10:11:27.369Z | 2026-11-11T10:12:08.823Z | final | claude-opus-5-5 | medium | 2215 | 548 | 2215 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T10:26:22.731Z | 2026-11-11T10:26:52.988Z | final | claude-opus-5-5 | medium | 2457 | 265 | 2457 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T10:59:31.644Z | 2026-11-11T11:00:13.088Z | final | claude-opus-5-5 | medium | 3617 | 2216 | 3617 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T11:02:19.042Z | 2026-11-11T11:03:09.977Z | final | claude-opus-5-5 | medium | 3668 | 1112 | 3668 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T11:06:26.651Z | 2026-11-11T11:06:38.911Z | final | claude-opus-5-5 | medium | 1144 | 201 | 1144 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T11:07:49.496Z | 2026-11-11T11:08:17.271Z | final | claude-opus-5-5 | medium | 2362 | 666 | 2362 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T16:40:33.352Z | 2026-11-11T16:41:02.912Z | final | claude-opus-5-5 | low | 2272 | 390 | 2272 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T16:43:32.523Z | 2026-11-11T16:44:08.885Z | final | claude-opus-5-5 | medium | 3844 | 69 | 3844 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T16:47:19.443Z | 2026-11-11T16:48:00.029Z | final | claude-opus-5-5 | medium | 3887 | 847 | 3887 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T16:49:23.402Z | 2026-11-11T16:49:29.244Z | final | claude-opus-5-5 | medium | 509 | 0 | 509 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T16:50:55.154Z | 2026-11-11T16:51:07.312Z | final | claude-opus-5-5 | medium | 1090 | 283 | 1090 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T16:51:45.721Z | 2026-11-11T16:51:52.066Z | final | claude-opus-5-5 | medium | 619 | 88 | 619 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T16:54:58.543Z | 2026-11-11T16:57:19.760Z | final | claude-opus-5-5 | medium | 3453 | 467 | 3453 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T17:04:00.847Z | open | provisional | claude-opus-5-5 | medium | 25529 | 5209 | 25529 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 970664a8 | 2026-11-11T05:39:04.969Z | provisional | final | 23628 | 6083 | 23628 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 137192055; cached input subset 133715743; output 875081; reasoning output subset unavailable; total 138067136.
- Coverage/status: partial; 7 linked sessions, 3 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-drafts:csub-composition-2026-11-12 -->
<!-- experiment-turns:csub-composition-2026-11-12:def570768b5903c8,2b870483fc1f4ce6,7884d55f2a585a2f,a7a60b7f7ee52108,1d3203806340bfc1,dbfcb630fafc0bcb,86735a3fc6592d1d,69869bf533afcc8f -->
## Checkpoint `csub-composition-2026-11-12` — 2026-11-11T18:23:23.020203+00:00

### Request

Write C-SUB handoff, apply catalog composition (Darryl grant), composed local run (task 6.2)

### Results

- Owner: Keith.
- Changes and why: Handoff written; Darryl granted Keith the index.ts composition (reported); D1SubmissionCatalog composed outside loopback sample runs; npm run check exit 0, 611 tests; Keith accepted the composed run. 6.2 ticked (24/26). No agents spawned.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/handoffs/student-drafts.md; workflow/evidence/student-drafts/composed-acceptance.md.
- Remaining limitations and next owner: Task 7.1 remaining scenarios, then 7.2.

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T17:10:25.463Z | 2026-11-11T17:11:47.926Z | final | claude-opus-5-5 | medium | 7002 | 2020 | 7002 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T17:18:49.438Z | 2026-11-11T17:19:00.438Z | final | claude-opus-5-5 | medium | 806 | 34 | 806 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T17:19:51.237Z | 2026-11-11T17:20:08.244Z | final | claude-opus-5-5 | medium | 1324 | 365 | 1324 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T17:29:58.761Z | 2026-11-11T17:30:19.435Z | final | claude-opus-5-5 | medium | 622 | 53 | 622 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T17:36:53.359Z | 2026-11-11T17:38:07.993Z | final | claude-opus-5-5 | medium | 6816 | 1340 | 6816 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T17:42:21.675Z | 2026-11-11T17:44:21.790Z | final | claude-opus-5-5 | medium | 7468 | 2158 | 7468 |
| Coordinator / coordinator | 970664a8 | root | 2026-11-11T18:23:04.770Z | open | provisional | claude-opus-5-5 | medium | 1785 | 56 | 1785 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 970664a8 | 2026-11-11T17:04:00.847Z | provisional | final | 26650 | 5209 | 26650 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 147793674; cached input subset 144275560; output 902025; reasoning output subset unavailable; total 148695699.
- Coverage/status: partial; 7 linked sessions, 3 bounded runs. Only admitted turns count; legacy unbounded records are excluded.
