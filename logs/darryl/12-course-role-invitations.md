# Course role invitations — prompt experiments

Owner: Darryl. Change: course-onboarding, COU-03–05/07, applicable SHA and UI-01/02/07/08. Branch: codex/course-role-invitations.

## Prompt CRI-01 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Update from main, branch and commit existing changes, then implement role-targeted course invitations and authenticated acceptance for tasks 3.1–3.5.
**Retrospective finding on the original request (recorded 2026-11-07):** The later implementation used three distinct agents: one independent reviewer plus UI and test implementers. The reviewer identified concrete security and authorization defects; the UI and test agents delivered changes and evidence. The invoked skill required an independent reviewer for substantive changes and allowed selective specialists; it did not require both implementers. Their necessity or cost-effectiveness is not established, and the requested work remained incomplete. For the implementation continuation CRI-05, the final main plus measured child turns reported 41,289,355 tokens, including 40,874,112 cached input tokens; some child records lacked usage, so complete coverage and monetary cost are unavailable. These figures belong to CRI-05, not CRI-01, and are not added to its token table. No controlled comparison establishes that parallel delegation was cheaper or faster.

### Agents spawned

- **New agents:** None. The requested skill requires a feature brief and explicit approval before product changes; independent review is planned after approval.
- **Reused agents:** None; no delegation occurred during this checkpoint.
- **Main agent:** /root, gpt-6.1-terra (recorder metadata).
- Unknown historical activity/rationale: unavailable.

### Token count

**Usage report for CRI-01:**

| Agent | Input | Cached input (subset) | Output | Total tokens | Source record | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main agent | 335046 | 296576 | 2302 | 337348 | turn-a0b6c3d5c82f1f0c438d984d | Provisional; incomplete turn |
| Children | 0 | 0 | 0 | 0 | Observed no agent spawns | Provisional |

- **Total for CRI-01:** 337348 at checkpoint; later activity excluded.
- Source / checkpoint: project-scoped private Codewise recorder, report refreshed 2026-11-07; initial sandbox attempt could not write outside workspace, elevated retry succeeded.
- Shared-turn group: turn-a0b6c3d5c82f1f0c438d984d; one prompt observed.
- Coverage: final response and subsequent calls excluded; cached and reasoning tokens are subsets. Unlinked approval sessions not attributed.
- Reconciliation: refresh at next checkpoint and retain this provisional snapshot without adding it to final usage.

### Experiment outcome

- Expected benefit: preserve existing work and obtain an independently reviewable, secure bounded implementation.
- Observed result: fetched origin/main 60bc22b, created branch and fast-forwarded; committed existing files as 9e89848. Nested Git worktree excluded. OpenSpec reports planning artifacts complete. No product changes or tests performed in this checkpoint.
- Evidence / handoff / requirement references: course-onboarding proposal, design, spec and tasks; warm-workbook-v1; existing C-ID/SHA packet.
- Comparison basis: no controlled comparison.
- Reflection: usage alone does not establish efficiency or quality.
- Blockers / next owner: explicit feature-brief approval required by invoked skill; Darryl. Live mail and manual acceptance remain separate gates.

**CRI-01 reconciliation, 2026-11-07:** Completed recorder source turn-a0b6c3d5c82f1f0c438d984d: input 532207, cached input 492288, output 3716, total 535923. This replaces, rather than adds to, the provisional snapshot above.

## Prompt CRI-02 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Approve the course-role-invitations brief.

### Agents spawned

- **New agent:** /root/reviewer, independent read-only review of migration and invitation security, chosen for independent judgment. Found no confirmed migration defect; noted old unique indexes, admission-only acceptance, incomplete production migration coverage and immutable legacy NULL quarantine.
- **Reused agents:** None.
- **Main agent:** /root, gpt-6.1-terra. Historical unknowns: unavailable.

### Token count

**Usage report for CRI-02:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 1575266 | 1544064 | 4522 | 1579788 | turn-e843828b7900fd000ac8d2ad | provisional, incomplete |
| /root/reviewer | 848957 | 822272 | 1740 | 850697 | turn-bb6eaf590d1d7b46ae5d7374 | provisional, incomplete; earlier child turns unavailable |

- **Total:** unavailable because earlier child-turn usage is unavailable. Do not treat missing values as zero.
- Source: private project-scoped recorder, 2026-11-07; shared-turn group turn-e843828b7900fd000ac8d2ad, one prompt. Final calls excluded; cached and reasoning tokens are subsets. Reconcile at next checkpoint, replacing rather than adding provisional snapshots.

### Experiment outcome

- Expected: safe implementation with independent security review.
- Observed: additive role column and immutability guard, with isolated D1 migration/restart tests. Reviewer confirmed this is only a partial foundation. Focused test passed 2/2; npm run check passed (26 test files, 266 tests, four deployment tests, validation, typecheck, lint and build). No live mail or deployment.
- Evidence / requirements: COU-03/05; implementation remains incomplete, including DTOs, current instructor authorization, account-aware join, atomic membership, UI and security cases. Existing OpenSpec task checkboxes remain open.
- Comparison: no controlled comparison; tokens alone do not establish quality.
- Next owner: Darryl; complete tasks 3.1–3.5 and review before use. Manual acceptance and live delivery remain pending.

**CRI-02 reconciliation, 2026-11-07:** Main turn-e843828b7900fd000ac8d2ad completed: input 1908062, cached 1875712, output 5750, total 1913812. Replaces the prior main snapshot. Child final attribution remains unavailable until reconciled; no aggregate claimed.

## Prompt CRI-03 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Ask whether the work is finished.

### Agents spawned

- **New agents:** None; a status question requires no delegation.
- **Reused agents:** None; previous review result was received, but no new assignment was made.
- **Main agent:** /root, gpt-6.1-terra. Historical unknowns: unavailable.

### Token count

**Usage report for CRI-03:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 84251 | 84096 | 218 | 84469 | turn-2c86a2c3e54bc27b826e640f | provisional; incomplete |
| Children | 0 | 0 | 0 | 0 | observed no spawns or reuse | provisional |

- Total at checkpoint: 84469; project-scoped private recorder; later calls and final response excluded. Reconcile at next checkpoint without adding snapshots. Cached/reasoning tokens are subsets.
- Shared-turn group: turn-2c86a2c3e54bc27b826e640f, one prompt; no controlled comparison.

### Experiment outcome

- Checked Git state: branch codex/course-role-invitations at 9e89848; migration, migration tests and this log remain uncommitted. Tasks 3.1–3.5 are incomplete, as recorded in CRI-02. No new product checks run for this status question.
- Next owner: Darryl; remaining feature implementation and verification. Tokens do not establish quality.

**CRI-03 reconciliation, 2026-11-07:** Completed turn-2c86a2c3e54bc27b826e640f: input 339480, cached 253824, output 947, total 340427. Replaces the provisional snapshot.

## Prompt CRI-04 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Ask why the feature was not finished.

### Agents spawned

- **New agents:** None; explaining the prior result needs no delegation.
- **Reused agents:** None.
- **Main agent:** /root, gpt-6.1-terra. Historical unknowns: unavailable.

### Token count

**Usage report for CRI-04:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 85611 | 85376 | 143 | 85754 | turn-d2254ae7eb9e15248de6a54a | provisional; incomplete |
| Children | 0 | 0 | 0 | 0 | observed no spawns or reuse | provisional |

- Total at checkpoint: 85754; private project-scoped recorder. Later calls and final response excluded. Cached/reasoning tokens are subsets. Reconcile at next checkpoint without adding snapshots.
- Shared-turn group: turn-d2254ae7eb9e15248de6a54a, one prompt; no controlled comparison.

### Experiment outcome

- The agent stopped after a preliminary migration despite the approved scope; no external blocker was established. Complexity and security concerns required careful implementation and testing, not stopping. No additional product changes or checks in this prompt.
- Next owner: Darryl; complete the requested feature and verification. Tokens alone do not establish quality.

**CRI-04 reconciliation, 2026-11-07:** Completed turn-d2254ae7eb9e15248de6a54a: input 344144, cached 343168, output 844, total 344988. Replaces the provisional snapshot. CRI-02 reviewer turn-bb6eaf590d1d7b46ae5d7374 completed at input 1080569, cached 1053056, output 1868, total 1082437; earlier child records with absent usage remain unavailable.

## Prompt CRI-05 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Continue and finish the requested course-role invitation iteration.

### Agents spawned

- **New /root/ui:** exclusive auth UI/client/styles and synthetic preview; chosen for independent parallel work with an agreed endpoint contract. Delivered role selector, recipient and legacy flows, join acknowledgement and real-authority synthetic preview; focused UI tests and smoke passed.
- **New /root/tests:** exclusive invitation integration suite and auth regression adaptations; chosen to build independent behavior/security evidence while main implemented shared server contracts. Delivered synthetic provider/mail and isolated-D1 tests; focused suite passed.
- **Reused /root/reviewer:** independent read-only review and focused re-reviews; chosen for continuity of prior security findings. Returned reset/legacy, concurrency, current-authority, honest mail, student acknowledgement and recovery issues. Main repaired confirmed defects; uncertain provider reset reconciliation remains unresolved. Final focused review found no new mail cleanup defect; reviewer did not rerun final suite.
- **Main agent:** /root, gpt-6.1-terra; sole writer of shared server/schema/DTO and documentation. Unknown activity or rationale not reconstructed.

### Token count

**Usage report for CRI-05:**

| Agent | Input | Cached input (subset) | Output | Total | Source records | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 19466265 | 19379200 | 33580 | 19499845 | turn-c2cc883b9603e19fbb7e9889 | provisional, incomplete |
| /root/ui | 6008911 | 5922560 | 12382 | 6021293 | turn-e5731e3bf001644be7feb794, turn-0f681ee1d7a71d0c830f062b, turn-ff68908e9bf296b0a526bb33 | measured turns; other records have no usage |
| /root/tests | 10977238 | 10927872 | 20968 | 10998206 | turn-760bdd3f5f6811ae115486d5 | measured turn; other records have no usage |
| /root/reviewer | 3649878 | 3535744 | 5526 | 3655404 | turn-25b0de825853e58f4d5c80d0, turn-873e50d857e3271a4b1e5a99, turn-ddcdd3c1b06acc826d1bf8b2 | measured reuse turns |

- Total: unavailable for complete coverage; sum of listed snapshots is 40174748, not a claim of complete final usage. Cached input and reasoning output are subsets, not additions. Some child records have no usage; unlinked approval-review sessions are not attributed.
- Source: project-scoped private Codewise recorder report, 2026-11-07. Shared-turn group turn-c2cc883b9603e19fbb7e9889, one prompt. Current snapshot excludes later calls and final response; reconcile at next checkpoint without adding earlier snapshots.

### Experiment outcome

- Expected benefit: bounded parallel UI/test work plus independent security judgment while serializing shared server/schema changes.
- Observed result: implemented scoped invitation management and combined acceptance; isolated D1 and synthetic mail/provider checks passed. Independent review identified defects that were repaired, with focused re-review. Final `npm run check` passed 28 Vitest files / 290 tests and four deployment tests, typecheck, lint, spec validation and build. Prior full runs exposed lint and D1 timeout issues, then were repaired. Synthetic browser confirmed Student pending/email queued. No live mail, deployment, human acceptance or Keith integration.
- Evidence: workflow/evidence/course-onboarding/course-role-invitations/ and workflow/handoffs/course-role-invitations.md. OpenSpec 3.1/3.2/3.4 complete; 3.3/3.5 remain open.
- Comparison: no controlled comparison; token usage alone cannot establish efficiency or quality.
- Blockers / next owner: unknown provider-reset outcome remains locked with no reviewed operational reconciliation. Darryl must resolve recovery and complete manual UI acceptance; separately authorized live delivery and Keith student integration remain pending.

**CRI-05 reconciliation, 2026-11-07:** Main turn-c2cc883b9603e19fbb7e9889 completed: input 20577995, cached 20487936, output 36457, total 20614452. This replaces the provisional main snapshot. The previously listed child measured turns are unchanged; their sum plus final main is 41289355 reported tokens, subject to missing-usage child records and recorder attribution limits. Cached input is already included; this is not a cost or uncached-token figure.

## Prompt CRI-06 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Ask why the agents were used and whether their usage was justified.

### Agents spawned

- **New agents:** None; the question concerns existing records and can be answered by the main agent.
- **Reused agents:** None; recorder and existing logs provide the evidence.
- **Main agent:** /root, gpt-6.1-terra. Unknown historical rationale is not inferred.

### Token count

**Usage report for CRI-06:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 187964 | 187776 | 171 | 188135 | turn-b764e7f144f000daedf3c95c | provisional; incomplete |
| Children | 0 | 0 | 0 | 0 | no new or reused agents | provisional |

- Total at checkpoint: 188135; source private project-scoped recorder. Shared-turn group turn-b764e7f144f000daedf3c95c, one prompt. Later calls and final response excluded; cached/reasoning are subsets. Reconcile at next checkpoint without adding snapshots.

### Experiment outcome

- The explicitly invoked feature skill called for an independent reviewer and permitted selective specialists; it did not require parallel UI and testing agents. Reviewer found concrete security and behavior defects; UI and test agents produced code and automated evidence. No controlled comparison establishes that parallel delegation was cheaper or necessary. Feature remained incomplete despite substantial token use.
- Main agent acknowledges that this was an expensive arrangement, and future bounded work should start with main plus independent reviewer and add a specialist only with a specific reason and limited scope.
- Evidence: CRI-05 and workflow/evidence/course-onboarding/course-role-invitations/verification.md. Token counts are reported usage, not monetary charges; no accepted final feature or cost comparison exists.

**CRI-06 reconciliation, 2026-11-07:** Completed turn-b764e7f144f000daedf3c95c: input 754023, cached 753280, output 1560, total 755583. This replaces the provisional snapshot.

## Prompt CRI-07 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Record the agent-efficiency finding beneath the original prompt and commit the fixes in sensible batches.

### Agents spawned

- **New agents:** None; the requested log edit and Git commits did not require delegation.
- **Reused agents:** None.
- **Main agent:** /root, model unavailable from this checkpoint's metadata. Historical unknowns are unavailable.

### Token count

**Usage report for CRI-07:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main, shared turn | 1957450 | 1950464 | 2378 | 1959828 | turn-ba3895e8bbeafb31f4438c6d | provisional; shared with CRI-08 |
| Children | 0 | 0 | 0 | 0 | observed no agents | provisional |

- Per-prompt allocation unavailable. Count shared group turn-ba3895e8bbeafb31f4438c6d once, not once per entry. Source: project-scoped private recorder, 2026-11-07. Later calls and final response excluded; cached/reasoning are subsets. Reconcile at the next checkpoint, replacing this snapshot.

### Experiment outcome

- Added retrospective finding directly below CRI-01's prompt, identifying CRI-05 as the source of the later agent activity and reported usage without double counting. No controlled comparison supports a claim that delegation was cheaper or faster.
- Committed server/migration/security tests as 4847301 and UI/preview as c1047a8; documentation and this log are being committed as a third batch. Nested worktree remains separate.
- Latest implementation verification: previous `npm run check` passed 290 Vitest tests and four deployment tests, validation, typecheck, lint and build; this prompt changes documentation and commits previously verified files. No new product test executed.
- Remaining: unknown provider reset recovery, manual UI acceptance and separately authorized live delivery; see course-role invitation evidence and handoff. No agent-efficiency conclusion follows from token totals alone.

## Prompt CRI-08 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Ask for the local testing link.

### Agents spawned

- **New agents:** None; the existing local synthetic preview was sufficient.
- **Reused agents:** None.
- **Main agent:** /root, model unavailable from this checkpoint's metadata. Historical unknowns are unavailable.

### Token count

**Usage report for CRI-08:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main, shared turn | 1957450 | 1950464 | 2378 | 1959828 | turn-ba3895e8bbeafb31f4438c6d | provisional; shared with CRI-07 |
| Children | 0 | 0 | 0 | 0 | observed no agents | provisional |

- Per-prompt allocation unavailable. Count shared group turn-ba3895e8bbeafb31f4438c6d once. Source: project-scoped private recorder, 2026-11-07. Later calls and final response excluded; cached/reasoning are subsets. Reconcile at the next checkpoint without adding snapshots.

### Experiment outcome

- Started `npm run dev:auth` for the isolated loopback-only synthetic preview at http://127.0.0.1:5176/workflow/auth/preview.html. The process reported Vite ready on port 5176. Invented accounts and captured mail only; no live Firebase or Gmail delivery is established.
- No new comparison or product test; next owner Darryl for manual acceptance and the remaining recovery work.

**CRI-07/08 shared-turn reconciliation, 2026-11-07:** Completed turn-ba3895e8bbeafb31f4438c6d: input 2954702, cached 2946304, output 4543, total 2959245. This is one shared group for both prompts, counted once; individual allocation unavailable. Replaces both provisional references.

## Prompt CRI-09 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Push the branch and create the PR.

### Agents spawned

- **New agents:** None; publishing the existing branch needs no delegation.
- **Reused agents:** None.
- **Main agent:** /root; precise model unavailable from the recorder snapshot. Unknown activity/rationale is unavailable.

### Token count

**Usage report for CRI-09:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 619030 | 605952 | 666 | 619696 | turn-e4813ff9fe92dd7e4c939856 | provisional, incomplete |
| Children | 0 | 0 | 0 | 0 | observed no agents | provisional |

- Project-scoped private recorder, 2026-11-07. Shared-turn group turn-e4813ff9fe92dd7e4c939856 has one prompt. Later calls and final response excluded; cached/reasoning values are subsets. Reconcile next checkpoint, replacing the snapshot.

### Experiment outcome

- Preparing a draft PR for the explicitly requested push and review. A draft reflects pending operational recovery, manual acceptance, controlled delivery and student integration; it does not imply deployment or completed tasks 3.3/3.5.
- Prior local verification: npm run check passed 290 Vitest tests, four deployment tests, OpenSpec validation, typecheck, lint and build. CI/local secret scan remains pending. No additional product tests run for publishing.
- No controlled comparison; token totals do not prove efficiency. Next owner: Darryl and reviewers. Publication result will be recorded at the next checkpoint.

**CRI-09 publication outcome, 2026-11-07:** Pushed `codex/course-role-invitations` and opened draft [PR #14](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/14) against `main`. Its description records the passing local checks, open recovery/manual acceptance and separate live-delivery authorization. No merge, deployment or message to Keith was performed. CI results were not yet verified at publication.

**CRI-09 reconciliation, 2026-11-07:** Completed turn-e4813ff9fe92dd7e4c939856: input 2574081, cached 2557952, output 3173, total 2577254. Replaces the provisional snapshot.

## Prompt CRI-10 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Ask why invitation mail shows failed in a preview, with a screenshot. No recipient address is retained here.

### Agents spawned

- **New agents:** None; one agent could inspect the existing code and read-only environment evidence without duplicating private context.
- **Reused agents:** None.
- **Main agent:** /root; precise model unavailable from this checkpoint. Historical unknowns unavailable.

### Token count

**Usage report for CRI-10:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main, shared turn | 6804637 | 6767104 | 9773 | 6814410 | turn-76695d37e5767f616e54740e | provisional, shared with CRI-11/12 |
| Children | 0 | 0 | 0 | 0 | observed no agents | provisional |

- Project-scoped private recorder. Per-prompt allocation unavailable; count shared group turn-76695d37e5767f616e54740e once across CRI-10/11/12. Later calls and final response excluded; cached and reasoning tokens are subsets. Reconcile next checkpoint.

### Experiment outcome

- Read-only investigation: synthetic port 5176 captures mail and had no messages; user clarified the actual site was staging. Staging health reported merged PR14 revision 408edc12 and healthy database; mail-related secret names exist, values not inspected. The code records a generic failure from both pre-dispatch and explicit mail rejection paths.
- Follow-up source evidence and diagnosis are in CRI-11/12. No mail sent, identities changed, secrets printed or deployment performed. No controlled resource comparison.

## Prompt CRI-11 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Identify the preview as the hosted staging invitation page.

### Agents spawned

- **New agents:** None; URL clarification was handled in the same read-only investigation.
- **Reused agents:** None.
- **Main agent:** /root; precise model unavailable from this checkpoint.

### Token count

**Usage report for CRI-11:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main, shared turn | 6804637 | 6767104 | 9773 | 6814410 | turn-76695d37e5767f616e54740e | provisional, shared with CRI-10/12 |
| Children | 0 | 0 | 0 | 0 | observed no agents | provisional |

- Per-prompt allocation unavailable; count turn-76695d37e5767f616e54740e once across all three prompts. Project-scoped private recorder; later activity excluded. Reconcile next checkpoint.

### Experiment outcome

- Staging rather than synthetic local preview was identified. Read-only staging health and secret-name inspection performed. An initial D1 query using the checked-in placeholder ID returned database-not-found; resolved the actual staging database by listing names, then ran read-only aggregate queries. No data mutation or mail dispatch.

## Prompt CRI-12 — 2026-11-07, Asia/Singapore

**Prompt (redacted):** Another invented address succeeded; the failed address had received an earlier link but never completed registration.

### Agents spawned

- **New agents:** None; the existing investigation and trusted read-only provider lookup directly tested the hypothesis.
- **Reused agents:** None.
- **Main agent:** /root; precise model unavailable from this checkpoint.

### Token count

**Usage report for CRI-12:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main, shared turn | 6804637 | 6767104 | 9773 | 6814410 | turn-76695d37e5767f616e54740e | provisional, shared with CRI-10/11 |
| Children | 0 | 0 | 0 | 0 | observed no agents | provisional |

- Per-prompt allocation unavailable; count turn-76695d37e5767f616e54740e once across all three prompts. Project-scoped private recorder; later activity excluded. Reconcile next checkpoint.

### Experiment outcome

- Anonymized staging D1 query found two failed pending invitations for the target course/address, one shared reserved provider UID, no accepted invitation, no active app account and no stored setup proof. A local-project-to-staging issuer comparison matched. A read-only Firebase lookup using the existing local service account confirmed an enabled provider account exists with a different UID from the staging reservation. No recipient address, UID, proof or credential is retained in this log.
- `provisionOwner` treats email collision as retryable only for its reserved UID and then checks that UID; the mismatch fails before proof dispatch. This avoids silently merging identities by email, but leaves earlier unregistered provider users without a supported recovery path. Prior invitation state in another environment is not inferred. No real email, password/account update, database write, or deployment performed.
- Next owner: Darryl to design and verify mailbox-proven recovery against the single identity store; do not reset or bind another account by email alone. No controlled comparison; usage is not evidence of efficiency.

**CRI-10/11/12 shared-turn reconciliation, 2026-11-08:** Completed turn-76695d37e5767f616e54740e: input 7861101, cached input 7822592, output 12098, total 7873199. This replaces the three provisional references; it is one shared group counted once and cannot be allocated to individual prompts.
