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


<!-- experiment-checkpoint:student-released-feedback:apply-2026-11-12 -->
<!-- experiment-turns:apply-2026-11-12:7fcfd83dcb2ab17b,ea7fdb4b4ecdca3a,fd13454ec2991990,8785545f319a8123,cf33d88b199c4e42,749f9ca537c3c3fe,ea1b01911012cb62,295488583d021cd4,87a4a508381c4e5c -->
## Checkpoint `apply-2026-11-12` — 2026-11-12T02:55:23.338647+00:00

### Request

Start recording run for student-released-feedback (Keith, root Coordinator), then /openspec-apply-change student-released-feedback.

### Results

- Owner: Keith.
- Changes and why: Owner: Keith (root coordinator, no agents spawned). Recording run 414f6b81 started this session; earlier proposal run stays separate. Done and checked: 2.1 closed student-feedback schemas plus history feedbackReleased; 2.2 StudentReleasePort and FakeReleasePort (K5 self-test); 3.1 feedback summary/version routes (401, uniform 404 before producer, none/released/superseded/withdrawn, 409 STALE_FEEDBACK race, mismatched IDs, 503 without port, no-store); 3.2 one batched attemptReleases per history page; 4.1 annotation matching and SF-06 state model; 4.2 feedback panel in AttemptView; 4.3 history marker; 5.1 attemptReleases in contracts.ts/service.ts/repository.ts inside the 2026-11-12 window, additions only, plus producer tests. Checks: npm run check exit 0 (openspec 18/18 strict, typecheck, lint, vitest 55 files/690 tests, node deployment tests 4/4, build); prettier clean. Route tests use the fake and are fixture runs, not integration. Open: 3.3 needs the real producer; 4.4 needs manual UI review, screenshots and Keith acceptance; 5.2 blocked on Darryl review, and composition needs student-capable identity/submission ports because the current workflow ports authorize instructors only; 5.3/5.4/6.x follow. Design departures for Keith: version option labels omit times; summary version states come from the currentness projection; new service ApiError kind; producer authorizeAttempt helper for unassessed attempts.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: openspec/changes/student-released-feedback/tasks.md; src/server/student/feedback.ts; src/web/student/Feedback.tsx; workflow/assessment-preview/attempt-releases.test.ts.
- Remaining limitations and next owner: Keith: review departures and the diff; send Darryl the 5.1 producer change and the student-port composition question for review (5.2); then 4.4 UI review..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 0730cfb2 | root | 2026-11-12T02:10:32.332Z | 2026-11-12T02:10:41.962Z | final | claude-opus-5-5 | medium | 803 | 219 | 803 |
| Coordinator / coordinator | 0730cfb2 | root | 2026-11-12T02:16:03.944Z | 2026-11-12T02:16:57.079Z | final | claude-opus-5-5 | medium | 5834 | 47 | 5834 |
| Coordinator / coordinator | 0730cfb2 | root | 2026-11-12T02:23:43.123Z | 2026-11-12T02:24:11.258Z | final | claude-opus-5-5 | medium | 2601 | 470 | 2601 |
| Coordinator / coordinator | 0730cfb2 | root | 2026-11-12T02:25:23.769Z | 2026-11-12T02:25:33.585Z | final | claude-opus-5-5 | medium | 754 | 211 | 754 |
| Coordinator / coordinator | 0730cfb2 | root | 2026-11-12T02:26:09.390Z | 2026-11-12T02:26:21.724Z | final | claude-opus-5-5 | medium | 1238 | 0 | 1238 |
| Coordinator / coordinator | 0730cfb2 | root | 2026-11-12T02:31:43.093Z | 2026-11-12T02:32:44.460Z | final | claude-opus-5-5 | medium | 2094 | 430 | 2094 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T02:35:26.292Z | 2026-11-12T02:35:45.501Z | final | claude-opus-5-5 | medium | 1472 | 57 | 1472 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T02:38:15.476Z | open | provisional | claude-opus-5-5 | medium | 90359 | 23329 | 90359 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | 0730cfb2 | 2026-11-11T19:35:44.730Z | provisional | final | 22123 | 2546 | 22123 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 19805960; cached input subset 19369722; output 131771; reasoning output subset 28140; total 19937731.
- Coverage/status: provisional; 2 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-released-feedback:compose-2026-11-12 -->
<!-- experiment-turns:compose-2026-11-12:d09bb5e837aa1e09,b4a3dccbc85d0fce,f07f5613bf63c9fe,5cbd0bc8a4fdacd7 -->
## Checkpoint `compose-2026-11-12` — 2026-11-12T03:20:34.100030+00:00

### Request

Darryl gave the go-ahead; implement the student read ports and compose the real producer into studentHandler.

### Results

- Owner: Keith.
- Changes and why: Owner: Keith (root coordinator, no agents). Recorded the reported go-ahead in workflow/Ownership.md (extension table: new src/server/student/release-port.ts and the index.ts studentHandler argument) and a C-REL note. Added studentReleasePort: student requireObject for assessment/submission read (own attempt plus current Student membership in one SQL check; assessment scope via AssessmentRepository.scope), student SubmissionReadPort via StudentWork.attempt, returning AssessmentService.consumer; AssessmentWorkflow, CourseAuthority and instructor ports unchanged. index.ts passes it to studentHandler (real D1 only). Checks: release-port.test.ts 3/3 on local D1 with the real producer and instructor workflow (own released 200; foreign student and instructor 404; unreleased draft shows none with no leak; K5 v1, v2, withdraw v1, withdraw v2 with tombstones and no revival; revoked member 404); mutation with instructor-only identity fails all 3; npm run check exit 0 (openspec 18/18, 56 files/693 tests, build). Task 5.2 stays unchecked: its verify needs Darryl's review outcome recorded. Not deployed.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: src/server/student/release-port.ts; src/server/student/release-port.test.ts; workflow/Ownership.md.
- Remaining limitations and next owner: Darryl: review 5.1 producer change and release-port.ts; then Keith checks 5.2, runs 5.3 conformance and 3.3 read cost on the composed producer, then 4.4 UI review..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T03:08:25.135Z | 2026-11-12T03:08:40.077Z | final | claude-opus-5-5 | medium | 1393 | 742 | 1393 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T03:11:33.179Z | 2026-11-12T03:11:37.743Z | final | claude-opus-5-5 | medium | 329 | 61 | 329 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T03:16:04.606Z | open | provisional | claude-opus-5-5 | medium | 21598 | 6693 | 21598 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | 2026-11-12T02:38:15.476Z | provisional | final | 93627 | 23642 | 93627 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 26996448; cached input subset 26516928; output 158359; reasoning output subset 35949; total 27154807.
- Coverage/status: provisional; 2 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-released-feedback:conformance-2026-11-12 -->
<!-- experiment-turns:conformance-2026-11-12:cc60ef595e1ff32c,80b3e0fadcfc752c,2222089f78e91e61,7da77a3183864758,e95a7eb974445c40 -->
## Checkpoint `conformance-2026-11-12` — 2026-11-12T04:38:47.368313+00:00

### Request

Record Darryl's review as accepted (no findings or conditions), commit and push, then continue: 5.3 conformance and 3.3 read cost.

### Results

- Owner: Keith.
- Changes and why: Owner: Keith (root coordinator, no agents). Recorded Darryl's reported acceptance in the new handoff, Ownership.md and IntegrationContracts.md; ticked 5.2; pushed ac155f7 to PR #32. 5.3: verifyAssessmentProducer passes from the consumer over the composed producer (reads via studentReleasePort as the student, cross-checked with HTTP routes); releaseContractSuite properties pass on real values, but the suite as written fails one check because it hard-codes availabilityRevision 2 and the real producer is already at 2 after the first release; finding and fix suggestion for Darryl; 5.3 left open. 3.3: measured on local D1 at 1edbb16; real released open 30 round trips, history about 3 per attempt (66 for 20), fake 1; OPS-01 finding against the per-invocation D1 query limit (plan unverified); 3.3 ticked. npm run check exit 0 (57 files/697 tests). Rework: first read-count instrumentation returned zeros and was redone with a Proxy.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-released-feedback/conformance.md; workflow/evidence/student-released-feedback/read-cost.md; workflow/handoffs/student-released-feedback.md.
- Remaining limitations and next owner: Keith: decide the OPS-01 history-cost option and whether to send Darryl the suite fix; then 4.4 UI review, 5.4 composed acceptance, 6.1, 6.2..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T04:27:40.683Z | 2026-11-12T04:27:50.501Z | final | claude-opus-5-5 | medium | 682 | 222 | 682 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T04:27:52.806Z | 2026-11-12T04:28:44.464Z | final | claude-opus-5-5 | medium | 3901 | 328 | 3901 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T04:30:43.677Z | 2026-11-12T04:31:31.654Z | final | claude-opus-5-5 | medium | 4423 | 1016 | 4423 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T04:32:17.834Z | open | provisional | claude-opus-5-5 | medium | 28564 | 7194 | 28564 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | 2026-11-12T03:16:04.606Z | provisional | final | 22415 | 6693 | 22415 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 36351109; cached input subset 35819472; output 196746; reasoning output subset 44709; total 36547855.
- Coverage/status: provisional; 2 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-released-feedback:ops01-2026-11-12 -->
<!-- experiment-turns:ops01-2026-11-12:9886f23a2d5c76f5,fd9e361968ba7a9d,15186d0af57af730 -->
## Checkpoint `ops01-2026-11-12` — 2026-11-12T05:01:19.478897+00:00

### Request

We are on the Free plan: what fix is needed? Then Darryl agreed to the batched check; implement it.

### Results

- Owner: Keith.
- Changes and why: Owner: Keith (root coordinator, no agents). Verified Cloudflare docs: Workers Free 50 D1 queries per invocation, batch counts as one. Recorded Darryl's agreed amendment in Ownership.md and IntegrationContracts.md. attemptReleases now authorizes with one session check plus one SQL ownership and current-Student check in its single D1 batch; the per-attempt authorizeAttempt helper is removed; content reads keep the full authorize. Found that production session checks cost 4 D1 plus 1 Firebase call each and the producer re-resolved them up to 6 times per open; studentReleasePort now resolves the session once per request (revocation still re-checked in SQL; new mid-request revocation test) and uses the student clock (a mismatch surfaced by tests). Result: history 2 local D1 calls at any page size (about 10 production, estimated); released open 25 (about 33 production, estimated); before, about 54 and about 150. Producer tests moved to the composed fixture (6, including a full page of 50); mutation check fails 2 as expected. npm run check exit 0, 57 files/700 tests. Conformance re-run passes.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-released-feedback/read-cost.md; workflow/evidence/student-released-feedback/conformance.md; workflow/Ownership.md.
- Remaining limitations and next owner: Darryl reviews the amended attemptReleases and the session memo; Keith decides on sending the releaseContractSuite fix (5.3); then 4.4 UI review, 5.4, 6.1, 6.2..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T04:48:29.838Z | 2026-11-12T04:49:20.964Z | final | claude-opus-5-5 | medium | 3254 | 1928 | 3254 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T04:55:26.984Z | open | provisional | claude-opus-5-5 | medium | 23022 | 7380 | 23022 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | 2026-11-12T04:32:17.834Z | provisional | final | 29570 | 7194 | 29570 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 43568421; cached input subset 43000936; output 224028; reasoning output subset 54017; total 43792449.
- Coverage/status: provisional; 2 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-released-feedback:ui-review-2026-11-12 -->
<!-- experiment-turns:ui-review-2026-11-12:ee881cb2cd09751e,27ba0d718aa04ebf,0a1ede1bf894feff,62e0eeb8a625f6ac,59d932917e7d1de7,2a572d3503087649,b0128ab146a5bed2,63014a8b60030e9d,a10e6b60bb48895c,21b6f621ad2a5a66 -->
## Checkpoint `ui-review-2026-11-12` — 2026-11-12T07:44:39.002634+00:00

### Request

Producer amendment approved; plan the UI review; provide a pasted brief for another agent to run checks; review its result; record decisions and Keith's manual acceptance.

### Results

- Owner: Keith.
- Changes and why: Owner: Keith (root coordinator, no agents spawned here). Recorded Darryl's acceptance of the OPS-01 amendment (0e843c5). Added task 6.3 (staging CPU and D1 check). Wrote a pasted UI-review brief; Keith ran it in a separate agent outside this tracker run, so its usage is not counted. That agent built a loopback harness and covered 104 combinations, 48 annotation activations and 112 screenshots, with npm run check exit 0 (700 tests). It returned F1 (focus-only heading 22 px under the brief's literal [tabindex] rule). I verified the agent changed no product files; the Vite cache is git-ignored; two failed-run logs contained local paths and browser scripts. Keith accepted the three implementation decisions (design D2/D6 updated, 36ab141; PR description updated through the REST API after a gh pr edit GraphQL error), recorded F1 as not applicable, dropped the two logs, and approved the UI after his manual pass. 4.4 ticked (14/19).
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-released-feedback/ui-review.md; workflow/handoffs/student-released-feedback.md; openspec/changes/student-released-feedback/design.md.
- Remaining limitations and next owner: Keith: 5.4 composed acceptance, 6.1 privacy/security review, 6.2 handoff; 5.3 pending Darryl's suite fix; 6.3 after merge..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T05:04:30.685Z | 2026-11-12T05:04:45.324Z | final | claude-opus-5-5 | medium | 1241 | 484 | 1241 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T06:12:13.544Z | 2026-11-12T06:12:36.500Z | final | claude-opus-5-5 | medium | 1350 | 327 | 1350 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T06:21:18.933Z | 2026-11-12T06:21:59.843Z | final | claude-opus-5-5 | medium | 3005 | 474 | 3005 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T06:31:06.871Z | 2026-11-12T06:31:50.971Z | partial | claude-opus-5-5 | medium | 1954 | 1112 | 1954 (partial) |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T06:32:04.511Z | 2026-11-12T06:32:51.714Z | final | claude-opus-5-5 | medium | 5006 | 26 | 5006 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T06:55:02.063Z | 2026-11-12T06:55:47.818Z | final | claude-opus-5-5 | medium | 3824 | 1674 | 3824 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T07:07:52.765Z | 2026-11-12T07:08:09.189Z | final | claude-opus-5-5 | medium | 1513 | 565 | 1513 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T07:38:59.438Z | 2026-11-12T07:39:48.811Z | final | claude-opus-5-5 | medium | 3433 | 601 | 3433 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T07:43:52.767Z | open | provisional | claude-opus-5-5 | medium | 3799 | 614 | 3799 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | 2026-11-12T04:55:26.984Z | provisional | final | 23993 | 7380 | 23993 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 55205025; cached input subset 54607160; output 250124; reasoning output subset unavailable; total 55455149.
- Coverage/status: partial; 2 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-released-feedback:composed-2026-11-12 -->
<!-- experiment-turns:composed-2026-11-12:2693408f2ac90e76,b35d265d20a325aa,996915183bece4c7,b61c4b47f1538415 -->
## Checkpoint `composed-2026-11-12` — 2026-11-12T15:54:19.821765+00:00

### Request

Run 5.4 composed acceptance; Keith reported no functional issues and attempt 81ae4c9e; asked why feedback sits behind Open attempt; chose a follow-up change; asked to verify the historical withdrawal step.

### Results

- Owner: Keith.
- Changes and why: Owner: Keith (root coordinator, no agents). Checked local readiness (all migrations applied, two real local accounts in course_local_workflow) and gave Keith the steps. Verified from local D1: releases v1-v4, v3 withdrawn while current, correction released as v4, v1 withdrawn while historical with v4 still current, availability_revision 7, B's membership restored. Wrote composed-acceptance.md (recorded audit plus Keith's report; no identities). Explained the UI-04 mismatch (inherited all-question attempt view plus Decision 3); Keith chose option B (follow-up change); recorded in proposal open items and evidence. 5.4 ticked (15/19).
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-released-feedback/composed-acceptance.md; openspec/changes/student-released-feedback/proposal.md.
- Remaining limitations and next owner: Keith: 6.1 privacy/security review, 6.2 handoff; 5.3 pending Darryl's suite fix; 6.3 after merge; propose the per-question views follow-up change..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T07:57:00.697Z | 2026-11-12T07:58:06.563Z | final | claude-opus-5-5 | medium | 5118 | 2696 | 5118 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T15:49:09.352Z | 2026-11-12T15:50:11.259Z | final | claude-opus-5-5 | medium | 5074 | 2941 | 5074 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T15:53:22.894Z | open | provisional | claude-opus-5-5 | medium | 5208 | 1034 | 5208 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | 2026-11-12T07:43:52.767Z | provisional | final | 4357 | 614 | 4357 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 60048626; cached input subset 58998061; output 266082; reasoning output subset unavailable; total 60314708.
- Coverage/status: partial; 2 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-released-feedback:final-checks-2026-11-13 -->
<!-- experiment-turns:final-checks-2026-11-13:2f2577f21132b230,b6326942eea1e008 -->
## Checkpoint `final-checks-2026-11-13` — 2026-11-12T16:02:38.919988+00:00

### Request

Run 6.1: final validation, npm run check and privacy/security review.

### Results

- Owner: Keith.
- Changes and why: Owner: Keith (root coordinator agent review, no agents spawned; recorded separately from Keith's and Darryl's). openspec validate --strict exit 0; npm run check exit 0 (18/18 specs, 57 files/700 tests, 4/4 deployment, build). Review checklist all pass: closed DTOs, no private fields in bodies/errors/DOM, authority before any producer call (zero producer calls for denied callers), batched producer authorization with SQL revocation re-check, currentness gating, no-store and no client cache, Prism escaping verified, bound SQL parameters, no execution path, no secrets or identities committed. Findings: S1 medium, feedback reads not rate-limited (~33 production D1 queries per open); S2 informational (metadata-only path skips the evidence check, agreed); S3 redacted one home path in UI-review check output. 6.1 ticked (16/19).
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-released-feedback/final-checks.md; workflow/evidence/student-released-feedback/final-check.txt.
- Remaining limitations and next owner: Keith decides S1 (limiter, accept, or defer); then 6.2 handoff; 5.3 pending Darryl; 6.3 after merge..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T16:00:22.131Z | open | provisional | claude-opus-5-5 | medium | 8602 | 3215 | 8602 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | 2026-11-12T15:53:22.894Z | provisional | final | 5787 | 1034 | 5787 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 62355399; cached input subset 61296928; output 275263; reasoning output subset unavailable; total 62630662.
- Coverage/status: partial; 2 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-released-feedback:handoff-2026-11-13 -->
<!-- experiment-turns:handoff-2026-11-13:55bb66db4f015833,9a00f6413ab2c740,232b797a8e918957 -->
## Checkpoint `handoff-2026-11-13` — 2026-11-12T16:08:17.050865+00:00

### Request

Accept S1 risk; complete 6.2 handoff.

### Results

- Owner: Keith.
- Changes and why: Owner: Keith (root coordinator, no agents). Recorded S1 acceptance in final-checks.md, design.md Risks and handoff (8dd9d56). Rewrote workflow/handoffs/student-released-feedback.md from the template: requirement IDs, exact revisions (last code 2b2b7d3, final checks 71800b9), owned files and windows, decisions table, actual verification results with evidence links, findings, resource measurements, Darryl's review status stated as Keith's report, blockers (5.3 Darryl suite fix, 6.3 staging after merge, follow-up per-question views) and next owner. All handoff evidence links resolve. 6.2 ticked (17/19).
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/handoffs/student-released-feedback.md.
- Remaining limitations and next owner: Darryl: fix releaseContractSuite (5.3) and merge review of PR #32; Keith: mark PR ready, then 6.3 on staging after merge; propose the per-question views follow-up..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T16:05:14.203Z | 2026-11-12T16:05:37.218Z | final | claude-opus-5-5 | medium | 1467 | 118 | 1467 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T16:07:29.478Z | open | provisional | claude-opus-5-5 | medium | 5146 | 245 | 5146 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | 2026-11-12T16:00:22.131Z | provisional | final | 9359 | 3215 | 9359 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 64712902; cached input subset 63643849; output 282633; reasoning output subset unavailable; total 64995535.
- Coverage/status: partial; 2 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.


<!-- experiment-checkpoint:student-released-feedback:merge-main-2026-11-13 -->
<!-- experiment-turns:merge-main-2026-11-13:05bd943bf3f8ca24,85830755b0bfd2a7,87f3ac44de5540bc,fc184d496cf0abbd,1cefe82c5310bf6b,77d5f44c7c426d07 -->
## Checkpoint `merge-main-2026-11-13` — 2026-11-12T16:23:59.781139+00:00

### Request

Explain the conformance suite; check whether main has the suite fix; weigh adopting Darryl's routes; keep own routes per recommendation.

### Results

- Owner: Keith.
- Changes and why: Owner: Keith (root coordinator, no agents). Suite fix not on main (releaseContractSuite unchanged since 6b4bd97); the suite file is Darryl's (Ownership.md line 69), so the fix needs his write or grant. Found main moved: PR #33 changed consumer authorization (ownedAttempts), added Darryl's assessment-keyed student route and a release-existence rule. Explained the hybrid option's cost; Keith kept the attempt-keyed routes. Merged origin/main: resolved index.ts and Ownership.md; release-port now uses D1OwnedAttemptReader with the session memo; conformance driver adapted. npm run check exit 0 (58 files/710 tests). Re-measured: released open 14 local D1 calls (~22 est production, was ~33), history 2 (~10). Updated read-cost.md, conformance.md, README and handoff.
- Checks actually run and outcomes: see Results above and evidence; no automatic acceptance claim.
- Evidence or handoff links: workflow/evidence/student-released-feedback/read-cost.md; workflow/evidence/student-released-feedback/conformance.md; workflow/handoffs/student-released-feedback.md.
- Remaining limitations and next owner: Keith sends Darryl the note (duplicate route plus suite fix); Darryl merge-reviews PR #32; 6.3 after merge..

### Agents spawned

None.

### Turn activity

| Agent / role | Session | Parent | Turn start | End | Status | Model | Effort | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T16:11:17.417Z | 2026-11-12T16:11:25.187Z | final | claude-opus-5-5 | medium | 700 | 0 | 700 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T16:12:12.969Z | 2026-11-12T16:12:22.842Z | final | claude-opus-5-5 | medium | 712 | 85 | 712 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T16:13:10.818Z | 2026-11-12T16:13:59.038Z | final | claude-opus-5-5 | medium | 3833 | 1769 | 3833 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T16:16:55.685Z | 2026-11-12T16:17:27.134Z | final | claude-opus-5-5 | medium | 2838 | 1646 | 2838 |
| Coordinator / coordinator | a137a81a | root | 2026-11-12T16:19:36.361Z | open | provisional | claude-opus-5-5 | medium | 14173 | 2683 | 14173 |

### Reconciliation

| Agent / role | Session | Turn start | Earlier status | Status | Output | Reasoning output | Output incl. spawned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coordinator / coordinator | a137a81a | 2026-11-12T16:07:29.478Z | provisional | final | 10527 | 525 | 10527 |

### Coverage

- Turn tables show output tokens only; output is production volume, not cost.
- Measured usage (cumulative for this increment; do not add checkpoint totals together): input 79743100; cached input subset 78629448; output 310270; reasoning output subset unavailable; total 80053370.
- Coverage/status: partial; 2 linked sessions, 2 bounded runs. Only admitted turns count; legacy unbounded records are excluded.
