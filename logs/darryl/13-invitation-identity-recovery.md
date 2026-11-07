# Invitation identity recovery and grouping — prompt experiments

Owner: Darryl. Requirements: course-onboarding COU-03–05/07, applicable SHA-01/02/03/05/08/11, UI-01/02/07/08, warm-workbook-v1. Branch: codex/invitation-identity-recovery, based on merged main 408edc1.

## Prompt IIR-01 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Implement and commit recovery for a previously invited provider identity and group invitations by course/email, accepting both requested roles through either link.

### Agents spawned

- **New agents:** None. The main agent implemented the shared schema, API, UI and tests to avoid unnecessary parallel work.
- **Reused agent:** /root/reviewer, read-only, for independent evaluation of identity reconciliation, owner protection, authority and grouped acceptance. Chosen because this change touches credentials and authorization. It identified mixed legacy grouping, delivery aggregation, receipt currentness, stale preview, provider-provenance and reserved-owner edge cases; main agent repaired them and sought focused re-review. Final reviewed paths had no further concrete findings. Reviewer did not independently run the final tests.
- **Main agent:** /root; model unavailable from the checkpoint. Unknown historical activity is unavailable.

### Token count

**Usage report for IIR-01:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main, shared turn | 56419869 | 55964288 | 56555 | 56476424 | turn-a52d2d2a9fb9f36353b1dc34 | provisional; shared with IIR-02 |
| /root/reviewer, shared turn | 7057231 | 6883456 | 7790 | 7065021 | turn-ae1f1a0c332289ef3aca3c14, turn-4c6b75986866045264e4058d, turn-74879ea0f39b35c2b67366d1 | completed measured review turns |

- Shared group turn-a52d2d2a9fb9f36353b1dc34 includes IIR-01 and IIR-02; per-prompt allocation is unavailable. The listed measured snapshot totals 63541445 tokens including 62847744 cached input tokens, counted once for the group, not once per entry. Cached and reasoning tokens are subsets, not additions; reported tokens are not monetary charges. Source: private project-scoped recorder, 2026-11-08. Later calls and final response excluded; reconcile at the next checkpoint without adding snapshots.
- Coverage: unlinked approval sessions excluded; no controlled comparison establishes cost-effectiveness. The user had previously asked about excessive delegation and no additional agents were spawned.

### Experiment outcome

- Observed: grouped same course/email with explicit combined role preview and guarded atomic acceptance; mailbox-proven provider identity recovery with explicit existing-password or create/reset choice; protects reserved bootstrap identities even after provider email changes. Older audit/link records are preserved. See workflow/evidence/course-onboarding/invitation-identity-recovery/verification.md and handoff.
- Final `npm run check` passed 8 OpenSpec changes, typecheck, lint, 28 Vitest files / 305 tests, four deployment workflow tests and build. First full run revealed a test harness missing the new migration and a stale collision expectation; these were repaired and the full run passed. Subsequent spec validation and diff check passed. No live mail, remote mutation, release or human UI acceptance.
- Limits: uncertain provider-reset outcomes remain fail-closed and need reviewed operational reconciliation. Staging migration, real delivery, human UI accessibility review and Keith consumer integration are pending.
- Comparison: no controlled experiment; token use does not by itself establish quality or efficiency. Next owner: Darryl for review and separately authorized staging release/testing.

## Prompt IIR-02 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Choose an explicit existing-password or reset-password option for a Firebase identity lacking a local account.

### Agents spawned

- **New agents:** None.
- **Reused agent:** /root/reviewer, read-only, for the same shared implementation turn described in IIR-01; no separate allocation is inferred.
- **Main agent:** /root; model unavailable from the checkpoint. Unknown historical activity unavailable.

### Token count

**Usage report for IIR-02:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main, shared turn | 56419869 | 55964288 | 56555 | 56476424 | turn-a52d2d2a9fb9f36353b1dc34 | provisional; shared with IIR-01 |
| /root/reviewer, shared turn | 7057231 | 6883456 | 7790 | 7065021 | turn-ae1f1a0c332289ef3aca3c14, turn-4c6b75986866045264e4058d, turn-74879ea0f39b35c2b67366d1 | shared with IIR-01 |

- Per-prompt allocation unavailable; count the shared group once, not twice. Source private project-scoped recorder, 2026-11-08; later calls and final response excluded. Cached/reasoning values are subsets. Reconcile next checkpoint.

### Experiment outcome

- Implemented mailbox proof plus deliberate existing-password or create/reset selection. This choice is shown to all recipients with no local account, since Firebase-only account history may come from another environment. Reset explicitly warns that the account password changes wherever shared. Synthetic tests verify existing password is unchanged on the existing-password path and reset occurs only after the explicit choice and valid proof.
- Review, verification, limitations and next owner are recorded in IIR-01 and linked evidence. No controlled comparison; token totals alone do not establish quality.

**IIR-01/02 reconciliation, 2026-11-08:** Completed shared main turn-a52d2d2a9fb9f36353b1dc34: input 59481576, cached 59022208, output 60495, total 59542071. This replaces the provisional main snapshot and is counted once for both prompts; per-prompt allocation remains unavailable. Reviewer measured turns remain as recorded above.

## Prompt IIR-03 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Split commits into sensible batches where possible, push and create a pull request.

### Agents spawned

- **New agents:** None; Git publication and documentation are bounded main-agent tasks.
- **Reused agents:** None.
- **Main agent:** /root; model unavailable. Historical unknowns unavailable.

### Token count

**Usage report for IIR-03:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | turn-81d128132b837cb4b627e694 | completed record reports zero with legacy_counter_attribution warning; not reliable usage |
| Children | 0 | 0 | 0 | 0 | observed no agents | final activity |

- Total unavailable; the recorder's zero legacy delta is not treated as proof of zero usage. No child agent activity observed. No controlled comparison.

### Experiment outcome

- User requested batching; unpushed ba87d1f was split without changing its file content into server/test commit c60ca27, UI commit e13066c and a documentation batch. Remote main matched the base. Push and PR outcome will be reported after execution.
- Previous implementation verification: npm run check passed 305 Vitest tests, four workflow tests, specs, typecheck, lint and build. No product changes in publication; no new product test run. Manual UI acceptance, live delivery, staging migration and uncertain-reset recovery remain pending.

## Prompt IIR-04 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Continue the requested push and PR work.

### Agents spawned

- **New agents:** None; continuation of the existing Git publication task requires no delegation.
- **Reused agents:** None.
- **Main agent:** /root; model unavailable.

### Token count

**Usage report for IIR-04:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 344982 | 0 | 277 | 345259 | turn-540d16e37153bb50ae50b80b | provisional; incomplete snapshot |
| Children | 0 | 0 | 0 | 0 | observed no agents | provisional |

- Project-scoped private recorder, 2026-11-08. One prompt in source group; later calls and final response excluded. Cached and reasoning values are subsets. Reconcile next checkpoint without adding provisional totals.

### Experiment outcome

- Continued the requested split, push and PR creation. Server/test and UI batches committed; specification, handoff and prompt records are the next batch. No new product test run. No merge or deployment requested.
- No controlled comparison; token counts are not cost or quality evidence. Next owner Darryl and PR reviewers.

**IIR-03/04 publication outcome, 2026-11-08:** Pushed `codex/invitation-identity-recovery` with commits c60ca27, e13066c and b5b9e68; opened draft [PR #15](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/15) against main. The PR records the previous passing full checks and pending recovery, UI acceptance, live delivery and CI. No merge, deployment or external message was performed.

**IIR-04 reconciliation, 2026-11-08:** Completed turn-540d16e37153bb50ae50b80b: input 3483707, cached 3134208, output 3539, total 3487246. This replaces the provisional snapshot.

## Prompt IIR-05 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Ask why clicking sign in immediately shows a workbook/course-access message without entering credentials.

### Agents spawned

- **New agents:** None; local read-only tracing of the sign-in and session paths was sufficient.
- **Reused agents:** None.
- **Main agent:** /root; model unavailable. Historical unknowns unavailable.

### Token count

**Usage report for IIR-05:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 353610 | 351872 | 348 | 353958 | turn-0a1503d1ff67d47e94ff5f16 | provisional; incomplete |
| Children | 0 | 0 | 0 | 0 | observed no agents | final activity |

- Project-scoped private recorder; one-prompt turn. Later calls/final excluded; cached/reasoning are subsets. Reconcile next checkpoint. No controlled comparison.

### Experiment outcome

- Read-only code tracing: /sign-in calls session and workspace on load; an existing valid session suppresses credentials, and authorized workspace state displays the observed message. /workspace destination authorization alone does not establish course membership; wording can mislead. Session policy idle 30 minutes and absolute 8 hours, subject to server/provider checks. Exact browser session was not inspected; no account, session, deployment or product files changed. The user can use Account > Sign out or a private window to test a fresh login.
- No controlled comparison; no new tests run. Next owner: Darryl if wording/flow correction is desired.

**IIR-05 reconciliation, 2026-11-08:** Completed turn-0a1503d1ff67d47e94ff5f16: input 1781377, cached 1776256, output 1352, total 1782729. This replaces the provisional snapshot.
