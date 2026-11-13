# Darryl prompt experiments — final submission preparation

Owner: Darryl. Requirements: DEV-01–DEV-04; guide references existing feature IDs and warm-workbook-v1. Input source af10461, then concurrent advance to 4e65c32. Branch/PR for this increment not created; shared checkout also contains separate UI-polish work.

## Prompt FINAL-SUBMISSION-01 — 2026-11-13 Asia/Singapore

**Prompt (redacted):** Audit the repository and prepare source organization, workflow files, User Guide, Developer Guide with useful UML, GitHub Pages website, evidence-based reflections and verified interaction summaries for final submission. Initially allowed screenshot placeholders where captures were unavailable.

### Agents spawned

- New agents: None. This is a cohesive source/document audit; no delegation was requested and the active multi-agent instruction prohibits unsolicited spawning.
- Reused agents: None.
- Main agent: /root, GPT-6-based Codex; exact backend model identifier unavailable.
- Assignment: inspect implemented flows and evidence, reconcile obsolete guides, prepare submission artifacts and perform checks. Concurrent external work is not a spawned child of this prompt.

### Token count

| Agent | Input | Cached input (subset) | Output | Total tokens | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; active shared turn |
| Children | 0 | 0 | 0 | 0 | observed no spawn/reuse | final activity count for this checkpoint |

- Total: unavailable. Verified private recorder config scope equals this project. Ran its report command; refresh failed EPERM writing outside workspace to the configured private data directory. No escalation or raw telemetry export attempted.
- Shared-turn group: final-submission-active-turn, FINAL-SUBMISSION-01 and FINAL-SUBMISSION-02. Per-prompt allocation unavailable; count the group once if final usage later becomes available.
- Coverage: current later calls/final response excluded; earlier private snapshot is stale and not attributed. No complete historical coverage claimed.
- Reconciliation: preceding log 28 prompt INSTRUCTOR-UX-03 remains unavailable; recorder refresh failure prevents honest final totals. Preserve its provisional record. Reconcile these prompts at the next permitted scoped checkpoint without summing snapshots.

### Experiment outcome

- Inspected actual route composition, runtime schemas, role UI, deployment workflow and dated experiment evidence. Found UG/DG/site still describing the foundation and an auth runbook still leading with historical Google setup.
- Rewrote guides and site, added five UML views and 12 screenshot placeholders, generated workflow/log catalogues, expanded evidence-based shared reflection while preserving newly merged Darryl reflection. Keith's personal contribution remains explicitly pending.
- Verification, repairs and limitations: [submission verification](../../workflow/evidence/final-submission/verification.md). Initial required check failed six D1 timeouts; reduced-worker retry hit cache EPERM; workspace-local temp retry pending at this checkpoint. Two instructor test formatting differences repaired. A first combined delete/add patch was rejected without edits; corrected through direct file writes. Python launcher was unavailable; used Node/PowerShell instead.
- No controlled productivity comparison, independent reviewer or human acceptance. No live provider calls or publication performed. Next owners: Darryl/Keith for manual review and release checklist.

## Prompt FINAL-SUBMISSION-02 — 2026-11-13 Asia/Singapore

**Prompt (redacted):** Do not add live screenshots; leave placeholders only.

### Agents spawned

- New agents: None; this is a direct documentation constraint handled by the main agent.
- Reused agents: None.
- Main agent: /root, GPT-6-based Codex; exact backend identifier unavailable.
- Result: applied the constraint to all UG screenshot positions and avoided new captures/image embeds.

### Token count

| Agent | Input | Cached input (subset) | Output | Total tokens | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | shared final-submission-active-turn | provisional; per-prompt allocation unavailable |
| Children | 0 | 0 | 0 | 0 | observed no spawn/reuse | final activity count for this checkpoint |

- Total: unavailable; same shared-turn group as FINAL-SUBMISSION-01, counted once. Configured recorder refresh failed EPERM as recorded above. No invented allocation.
- Coverage: later calls/final response excluded; reconcile on next scoped checkpoint.

### Experiment outcome

- User Guide contains UG-01–UG-12 explicit manual capture instructions; no new images or live screenshots. Existing historical synthetic evidence remains preserved.
- Submission audit explicitly checks the 12 labels and rejects embedded UG images. Final check outcome is recorded in the shared verification evidence.
- No controlled comparison; main-only handling suffices for a constraint. Next owner: team inserts manual screenshots if desired before submission, following the user's placeholder-only instruction for this pass.

### Verification continuation — FINAL-SUBMISSION-01 / shared turn

- The private recorder refresh EPERM remains unresolved; current main usage remains unavailable/provisional. No additional agents. No new user prompt is inferred from tool outcomes.
- Workspace-local temp avoided cache collection errors, but the sandboxed D1 run failed runtime setup and was interrupted. A permitted loopback run again hit a five-second invitation-test timeout and was interrupted. Repair: cap Vitest at four workers, test timeout 15 seconds and hook timeout 30 seconds, keeping assertions unchanged. The final required check is running with those settings.
- Submission structure/link/placeholder checks and targeted new-script ESLint passed. Formatting of prepared documents/site/script passed. A source-format snapshot reports separate in-progress UI-polish files; this audit preserves their writer ownership.

### Final checkpoint — FINAL-SUBMISSION-01 and FINAL-SUBMISSION-02

- Required check with bounded test settings and permitted local runtime access **passed**: strict OpenSpec20/20, typecheck/lint,771 Vitest tests passed and2 skipped,4 deployment tests passed, build passed with existing chunk-size warning. Source formatting passed across src/. Prepared docs/site/script formatting, scoped whitespace and submission audit passed. Earlier unsuccessful/interrupted runs remain in evidence and are not counted as unique tests.
- No product runtime/schema/API changes by this increment. The test runner now bounds D1 resource concurrency and allows real I/O time; original assertions remain unchanged. Concurrent UI-polish work was preserved.
- FINAL-SUBMISSION-02 satisfied:12 explicit UG placeholders, no image embeds or new live captures. Final script check verifies this constraint.
- Main tokens remain unavailable/provisional; refresh failed EPERM and current later calls/final response are not included. No new or reused child agents. Shared group counted once; reconcile at the next scoped checkpoint.
- Next owner: team for deployed revision/access verification, log/member reflection review and reviewed GitHub Pages/application release. No fresh remote publication or instructor acceptance claimed.

## Prompt FINAL-SUBMISSION-03 — 2026-11-13 Asia/Singapore

**Prompt (redacted):** Focus on documentation and website; Keith can do comprehensive testing.

### Agents spawned

- New agents: None. This steering concerns scope and handoff, handled directly.
- Reused agents: None.
- Main agent: /root, GPT-6-based Codex; exact backend identifier unavailable.
- Assignment/result: finish docs/site and hand off further comprehensive verification to Keith. No further comprehensive tests started after this instruction. The earlier full check had already completed.

### Token count

| Agent | Input | Cached input (subset) | Output | Total tokens | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | shared final-submission-active-turn | provisional; per-prompt allocation unavailable |
| Children | 0 | 0 | 0 | 0 | observed no spawn/reuse | none |

- Total unavailable; FINAL-SUBMISSION-01,02,03 share final-submission-active-turn. Per-prompt allocation unavailable; count the group once if usage later becomes available.
- Private recorder refresh failed EPERM as recorded above; no later current-turn/final-response usage is included. Reconcile at the next scoped checkpoint, preserving prior snapshots.

### Experiment outcome

- User clarified the division of work: documentation/site production here, further comprehensive testing by Keith. Preserved the completed check as historical evidence and stopped further testing work.
- Guides, manual screenshot placeholders, UML, reflections, site, catalogue and summary index are prepared. Publication and human/member verification remain separate; no remote deployment claimed.
- No controlled comparison or efficiency claim. Next owners: Darryl/team for docs/site review and reviewed Pages publication; Keith for comprehensive test/release verification.

## Prompt FINAL-SUBMISSION-04 — 2026-11-13 Asia/Singapore

**Prompt (redacted):** Commit, push and open a PR to merge the prepared documentation into the repository.

### Agents spawned

- New agents: None; staging exact files and publishing a bounded PR requires sequential repository operations.
- Reused agents: None.
- Main agent: /root, GPT-6-based Codex; exact backend identifier unavailable.
- Assignment: create isolated docs branch from latest main, preserve unrelated UI work, publish docs/site PR without merging.

### Token count

| Agent | Input | Cached input (subset) | Output | Total tokens | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed no spawn/reuse | none |

- Total unavailable; final-submission-publish-turn is separate from the previous shared group. No invented per-prompt allocation or repeated snapshot totals.
- Prior prompts01–03 remain provisional/unavailable: the configured private recorder refresh previously failed EPERM; no reliable final measurement is available at this checkpoint. Reconcile at a permitted scoped checkpoint. Current later calls and final response excluded.

### Experiment outcome

- Fetched latest main f8af24d and created isolated codex/final-submission-docs worktree. Current UI-polish working tree remains intact. No existing open PR for that docs branch found before creation.
- Selected only documentation, website, generated indexes, submission audit helper and evidence/log/handoff. The test-runner adjustment and two source-test formatting edits stay outside the docs PR for Keith to review.
- Regenerate catalogues against the isolated branch so they do not link unmerged UI files. Run only document/scope checks; further comprehensive testing remains Keith's task.
- Commit/push/PR publication outcome to be recorded after tool confirmation. No merge, application deployment or independent/human acceptance claimed.

### Publication preflight — FINAL-SUBMISSION-04

- Isolated docs branch catalogue/local-link/site-asset/12-placeholder/diagram-presence audit passed. Prepared files formatted with Prettier; git diff --check passed. Selected 16 docs/site/workflow-record files, excluding app runtime, test configuration, migrations, shared contracts and unrelated logs. No comprehensive testing repeated. Commit/push and PR result follows after confirmation.
