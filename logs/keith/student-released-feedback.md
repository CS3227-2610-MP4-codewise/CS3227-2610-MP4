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
