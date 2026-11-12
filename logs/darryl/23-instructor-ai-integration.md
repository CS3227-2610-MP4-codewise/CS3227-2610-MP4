# Instructor AI integration

Owner: Darryl. Requirements: AI-01–05, GRADE-01–04, UI-01/04/06/07/08; warm-workbook-v1. Base: f787176044f70fe6d2902182a59dbe59528f38cc.

## Prompt CAI-01 — 2026-11-12 (time unavailable, Asia/Singapore)

**Prompt (redacted):** Complete offline instructor AI integration on current main; no live calls or deployment.

### Agents spawned

- New: `/root/ai_review`, independent read-only security and correctness reviewer, chosen for independent judgment on the composed boundary. Assignment: AI-01–05, GRADE-01–04 and relevant UI states, current source and final diff. No editing or delegation.
- Reused: none. Main: `/root`.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | current turn | provisional |
| /root/ai_review | unavailable | unavailable | unavailable | unavailable | current turn | provisional |

Total and source group unavailable at entry; reconcile at next checkpoint. Current turn and child are incomplete. Cached input is a subset. No controlled comparison.

### Experiment outcome

- In progress. Single writer for shared composition; preserved existing dirty log and worktrees. Provider facts and live tests remain outside this prompt.

## Review and current verification checkpoint

Independent read-only reviewer `/root/ai_review` identified the durable recovery gap and confirmed the first admitted quota policy is pinned, with no supported update operation. Reviewer found no additional clear security defect in current default-off composition, but integrated D1 verification is not established. No UI files changed; existing warm-workbook manual acceptance is still pending, so UI-01/04/06/07/08 are not newly accepted. OpenSpec apply reports 3/5 instructor AI tasks complete; remaining checkboxes stay open. Default `npm run check` passed OpenSpec validation, typecheck and lint, then reported parallel Vitest timeouts/failures and was interrupted before completion. Initial sandboxed serial invocation failed during esbuild configuration loading with access denied; an elevated serial run is in progress. Recorder project scope matched, but report failed with EPERM writing outside the workspace; measurements unavailable and provisional. No real provider calls or deployment.

**Recorder checkpoint 2026-11-12:** project scope verified; initial sandbox report failed EPERM, and an approved elevated report succeeded. Group `01a1cf6a-633f-7703-b9c5-d9734f3f0b93`: main `turn-0a77282848cf0d60e2b6896f` input 3,607,892, cached 3,531,008, output 9,990, total 3,617,882 (provisional, incomplete). Reviewer `/root/ai_review` initial `turn-7198916ead999155a12ea364` input 656,470, cached 622,336, output 1,628, total 658,098; focused re-review `turn-850997291a486777a84a490d` input 142,393, cached 139,648, output 467, total 142,860 (both completed). Combined snapshot 4,418,840 tokens; later main calls and final response excluded. Per-response source; cached input is a subset. Reconcile at next checkpoint; no controlled comparison.

Final checkpoint: `npm run check` passed strict OpenSpec (17), typecheck and lint, then reported parallel Vitest failures/timeouts and was interrupted before a summary. Serial `npx vitest run --maxWorkers=1 --testTimeout=30000 --hookTimeout=60000` initially failed sandbox access to the Vite configuration; elevated retry started but produced no result for several minutes and was interrupted. An elevated focused run of runtime-config passed 2/2; focused gateway/connected/real-submission run also stalled without a result and was interrupted. Deployment-script tests passed 4/4 and `npm run build` passed with a chunk-size warning. `git diff --check` passed (line-ending warnings only). No integrated AI D1 pass or end-to-end acceptance is claimed. Existing unrelated dirty log and worktrees were preserved. Durable restart recovery and quota policy administration remain unfinished; next owner Darryl.

## Prompt CAI-02 — 2026-11-12 (time unavailable, Asia/Singapore)

**Prompt (redacted):** Why was the work not finished, and is user action needed?

### Agents spawned

- New: none; this is a status question about the existing work and no independent review is needed. Reused: none. Main: `/root`.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | current turn | provisional; reconcile next checkpoint |
| Children | none | none | none | none | observed | no children |

Total and current turn group unavailable at this checkpoint; later calls and final response excluded. Earlier CAI-01 provisional recorder checkpoint remains to be reconciled. No controlled comparison.

### Experiment outcome

- Answered from the existing worktree and recorded verification: unfinished recovery and test investigation are agent-owned offline work, not a request for user input. Provider information is needed later for a separately authorized live test, not to finish offline implementation. Prior stop was premature.

## Prompt CAI-03 — 2026-11-12 (time unavailable, Asia/Singapore)

**Prompt (redacted):** Finish the authorized offline instructor AI integration.

### Agents spawned

- New: none; the user authorized one independent reviewer, already created as `/root/ai_review` in CAI-01. Reuse that reviewer for focused review as needed. Main: `/root`, sole writer.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | current turn | provisional; reconcile next checkpoint |
| /root/ai_review | unavailable | unavailable | unavailable | unavailable | current turn | provisional if reused |

Current turn incomplete; total and source group unavailable. Cached input is a subset. No controlled comparison.

### Experiment outcome

- Continuing the previously approved offline work; no live calls or deployment.

**Recorder reconciliation, 2026-11-12:** project-scoped per-response report refreshed. CAI-01 main `turn-0a77282848cf0d60e2b6896f` final: input 7,763,522, cached 7,671,680, output 14,946, total 7,778,468; reviewer turns remain as previously recorded. CAI-02 main `turn-12e1fc61519b719689bb6a5d` final: input 534,104, cached 528,128, output 1,544, total 535,648; no children. CAI-03 main `turn-5660d76dd0d08ea438098b23` provisional: input 14,973,787, cached 14,918,400, output 27,805, total 15,001,592; later calls and response excluded. Reused `/root/ai_review` has nine completed linked review turns: `turn-6324af0d92d162eaaaf792dd`, `turn-1bf027b6e92c7645f00b028f`, `turn-df59cc13994024b5e4ef290a`, `turn-d3b96b8a36525a9c1f26f16a`, `turn-527d4c6e5a02c4ec05e57b54`, `turn-b0c5f7a212dafcd5fd97ebd0`, `turn-08065c66f3f3e9d7cdf9b75e`, `turn-76fe2a61c350276ca376a71d`, `turn-b79ddbafc285722a0151c72e`, totaling input 2,613,420, cached 2,572,672, output 4,760, total 2,618,180. This is one reused agent, not nine agents. Cached input is a subset. CAI-03 group subtotal 17,619,772 at this snapshot, provisional; reconcile later. No controlled comparison.

CAI-03 review record: reused `/root/ai_review` read-only across focused review/repair cycles. Findings repaired: newer interrupted success hidden by older candidate; status retry could dispatch a fresh key; unknown network errors and stale session keys could permit duplicate or replay; binding-before-begin was invisible; same-key cleanup race. Final reviewed resume uses the persisted key/reference selection and gateway idempotency. Reviewer found no additional defect in that path and recorded the independent-request ordering limitation in the design. No recursive delegation or parallel file edits.

Correction: recovery GET does not create or adopt a candidate. It may update internal gateway request/lease expiry bookkeeping through `readAuthorized`; this preserves conservative accounting. The explicit POST resume may submit the already-bound request if dispatch never began. Earlier wording that recovery reads make no state changes was too broad.

## Prompt CAI-04 — 2026-11-12 (time unavailable, Asia/Singapore)

**Prompt (redacted):** Is SoCLaaS disabled, and should work pause for activation?

### Agents spawned

- New: none; this is a status question. Reused: none for this prompt. Main: `/root`. The previously authorized reviewer and ongoing CAI-03 serial check continue independently.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | shared active turn | provisional; per-prompt allocation unavailable |
| Children | none for this prompt | none | none | none | observed | no new or reused agent for this prompt |

Shared-turn group and allocation unavailable at this checkpoint; count shared usage once and reconcile next checkpoint. Later calls and response excluded. Cached input is a subset.

### Experiment outcome

- Confirmed `SOCLAAS_INSTRUCTOR_ENABLED` defaults off and missing validated configuration prevents construction of the real gateway. Synthetic previews are separate. User action is not needed to finish offline work. Current instructions prohibit live calls/deployment; separately authorized provider verification and controlled testing require account-specific facts before activation. Serial verification continues. No controlled comparison.

## Prompt CAI-05 — 2026-11-12 (time unavailable, Asia/Singapore)

**Prompt (redacted):** Is the proposed preview check live?

### Agents spawned

- New: none. Reused: none for this question. Main: `/root`; the prior serial check continues.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | shared active turn | provisional; per-prompt allocation unavailable |
| Children | none for this prompt | none | none | none | observed | no new or reused agent for this question |

Shared-turn group and per-prompt allocation unavailable at this checkpoint; count a shared group once and reconcile later. Later calls and response excluded. Cached input is a subset.

### Experiment outcome

- Clarified that an interactive loopback synthetic preview is a live local interaction, not a SoCLaaS call or deployment. No preview was started and no UI check made. Respecting the user's concern, continue automated offline verification only; manual UI acceptance remains pending. No controlled comparison.

CAI-03 final automated outcome: full serial Vitest passed 52 files / 666 tests on final product source; subsequently added real-submission-to-gateway and normal-application tests passed individually. Normal-app fixture initially emitted an extra criterion field and was safely rejected; corrected closed-schema fixture passed and replay matched the same candidate with one synthetic call. Cross-course denial correctly returned 403, not the initial test's expected 404. Default parallel check failed 21 tests / 11 files with Windows timeouts and Miniflare errors; report separately. Final focused UI/config tests 14/14; typecheck, lint, strict OpenSpec, build, deployment scripts and diff check passed separately. Independent reviewer re-reviewed source and test, identifying the documented delayed-before-binding ordering limitation. No interactive preview, live provider call, deployment or human acceptance. Remaining: UI visual/keyboard/manual acceptance and account-specific live-test gates; next owner Darryl. No controlled comparison.

**Final recorder snapshot, 2026-11-12:** CAI-03/04/05 share root turn `turn-5660d76dd0d08ea438098b23` in group `01a1cf6a-633f-7703-b9c5-d9734f3f0b93`; per-prompt allocation is unavailable and the group is counted once. Main provisional input 42,708,377, cached 42,599,296, output 63,086, total 42,771,463. The one reused reviewer `/root/ai_review` has 15 linked completed turns, aggregate input 4,572,252, cached 4,517,376, output 6,620, total 4,578,872; source IDs are in the private recorder, including earlier nine listed above and `turn-f4e8cb77816e7b244d433b9a`, `turn-4d27339f99b8c8230e0d4087`, `turn-62ce1cc4adf628129c8344c9`, `turn-52ba741bab9f02ab35656d36`, `turn-ac965b007e755b4c8fc5b47c`, `turn-026b5f6f3b098a0715f62803`. Group subtotal 47,350,335; the main turn is incomplete and later calls/final response are excluded. Cached input is a subset; no controlled efficiency comparison. Reconcile on the next checkpoint.
