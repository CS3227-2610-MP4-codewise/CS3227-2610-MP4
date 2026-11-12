# Darryl prompt experiment — instructor feedback usability

Owner: Darryl. Change: instructor-ai-assessment; UI-01/04/07/08, GRADE-03/04. Branch/PR: working tree, no PR.

## Prompt feedback-usability-01 — 2026-11-13, time unavailable (Asia/Singapore)

**Prompt (redacted):** Move Save draft beside approval/release and explain invalid scores.

### Agents spawned

- New agents: None; bounded instructor UI change, no delegation requested.
- Reused agents: None.
- Main agent: /root, Codex; model identifier unavailable.
- Unknown historical activity/rationale: unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main agent | unavailable | unavailable | unavailable | unavailable | unavailable | provisional, current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed activity | none spawned |

Total unavailable; current turn and source group unavailable. Recorder scope and refresh not established; prior prompt reconciliation unavailable. Reconcile at next checkpoint; cached tokens are a subset and not added separately.

### Experiment outcome

- Expected benefit: clearer action placement and correction guidance.
- Outcome: moved draft action and added associated score errors and cross-question summary; preserved existing worktree changes. Checks and manual limitations recorded in UI evidence.
- Evidence: workflow/evidence/instructor-ai-assessment/ui-review.md. No controlled comparison; no efficiency claim.
- Next owner: Darryl for browser and human acceptance.
- Verification: strict OpenSpec validation, typecheck and lint passed; full tests had multiple timeouts/failures and were interrupted, and a focused one-worker run did not finish. Build and browser verification remain outstanding.

## Prompt staging-ai-unavailable-01 — 2026-11-13, time unavailable (Asia/Singapore)

**Prompt (redacted):** Explain why AI drafting is unavailable on staging from the attached screenshot.

### Agents spawned

- New agents: None; bounded investigation, no delegation requested.
- Reused agents: None.
- Main agent: /root, Codex; model identifier unavailable.
- Historical activity: unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed activity | none spawned |

Total and turn group unavailable. Recorder scope/refresh and previous prompt reconciliation not established; reconcile at next checkpoint. Cached input is a subset.

### Experiment outcome

- The screenshot maps to AI_DISABLED. GitHub Actions run 43277420019 deployed staging successfully at 2e5e56f; source at that revision injects a gateway only for loopback development. Current local gateway wiring is uncommitted and gated; evaluation evidence records material quality issues and pending readiness. Running staging version and configuration were not directly queried; no provider request or deployment performed.
- Evidence: workflow/evidence/instructor-ai-assessment/live-quality-evaluation.md and GitHub Actions run 43277420019. No controlled comparison. Next owner Darryl.

## Prompt instructor-ui-cleanup-01 — 2026-11-13, time unavailable (Asia/Singapore)

**Prompt (redacted):** Make instructor screens cleaner and more consistent with student screens; screenshots show grading and rubric layout.

### Agents spawned

- New agents: None; delegation not requested, bounded role-owned UI work.
- Reused agents: None.
- Main agent: /root, Codex; model identifier unavailable.
- Historical activity: unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed activity | none spawned |

Total and source group unavailable. Recorder scope/refresh and prior prompt reconciliation not established; reconcile later. Cached input is a subset.

### Experiment outcome

- Compared instructor and student workbook styles. Repaired full-width AI checkbox, simplified assessment spacing and submission rows, and compacted authoring spacing; existing worktree changes preserved. Requirements UI-01/04/07/08 and IAL-02; warm-workbook-v1. See workflow/evidence/instructor-ai-assessment/ui-review.md for verification and limitations.
- No controlled comparison or efficiency claim. Browser review and human acceptance remain with Darryl.
- Verification: OpenSpec validation, typecheck and lint passed; full suite interrupted after authentication test timeouts. Focused instructor tests passed 29/29; build passed with chunk-size warning. Visual acceptance remains unverified.

## Prompt gateway-merge-question-01 — 2026-11-13, time unavailable (Asia/Singapore)

**Prompt (redacted):** Ask whether merging local gateway work enables staging/production LLM access and why it is uncommitted.

### Agents spawned

- New agents: None; read-only investigation, delegation not requested.
- Reused agents: None.
- Main agent: /root, Codex; model identifier unavailable.
- Historical activity: unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed activity | none spawned |

Total and turn group unavailable. Recorder scope/refresh and prior prompt reconciliation not established; reconcile later. Cached input is a subset.

### Experiment outcome

- Inspected current main working tree, gateway gates, checked-in deployment configuration and workflow, and handoff. Merge alone deploys default-disabled code to staging after CI; activation needs environment enable flag, secret and valid profile. Production follows successful staging and its approval gate. Live configuration and deployed version not checked in this prompt. Local work remains mixed, uncommitted and unfinished with quality, verification and acceptance gaps. No commit, push, settings change or deployment performed.
- Evidence: src/server/ai/runtime-config.ts, wrangler.json, .github/workflows/deploy-staging.yml and workflow/handoffs/instructor-ai-assessment.md. No controlled comparison; next owner Darryl.

## Prompt gateway-environment-settings-01 — 2026-11-13, time unavailable (Asia/Singapore)

**Prompt (redacted):** Ask what staging and production need for instructor AI.

### Agents spawned

- New agents: None; focused configuration investigation, no delegation requested.
- Reused agents: None.
- Main agent: /root, Codex; model identifier unavailable.
- Historical activity: unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed activity | none spawned |

Total and source group unavailable. Recorder scope/refresh and prior prompt reconciliation not established; reconcile later. Cached input is a subset.

### Experiment outcome

- Inspected local runtime loader, setup evidence, Wrangler configuration, deployment preparation and official Cloudflare documentation. Identified three required settings, exact profile keys, configuration persistence concern, and remaining deployment/quality gates. No secrets read or changed, and no provider calls or deployment made.
- Evidence: src/server/ai/runtime-config.ts and workflow/evidence/secure-ai-gateway/setup.md. No controlled comparison; next owner Darryl.

## Prompt gateway-profile-values-01 — 2026-11-13, time unavailable (Asia/Singapore)

**Prompt (redacted):** Fill in instructor AI configuration values.

### Agents spawned

- New agents: None; focused inspection of existing evaluation profile.
- Reused agents: None.
- Main agent: /root, Codex; model identifier unavailable.
- Historical activity: unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed activity | none spawned |

Total and source group unavailable. Recorder scope/refresh and prior prompt reconciliation not established; reconcile later. Cached input is a subset.

### Experiment outcome

- Located complete profile used for the bounded local evaluation in workflow/ai-quality-evaluation/live.test.ts. It is not a verified staging or production quota profile; independent D1 windows cannot coordinate a shared provider pool, and quality and activation gates remain open. No settings, code, secrets or deployments changed and no provider call made. No controlled comparison; next owner Darryl.

## Prompt cloudflare-settings-screenshot-01 — 2026-11-13, time unavailable (Asia/Singapore)

**Prompt (redacted):** Provided screenshot of Cloudflare runtime variables and Wrangler synchronization notice.

### Agents spawned

- New agents: None; screenshot interpretation, no delegation requested.
- Reused agents: None.
- Main agent: /root, Codex; model identifier unavailable.
- Historical activity: unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed activity | none spawned |

Total and source group unavailable. Recorder scope/refresh and prior prompt reconciliation not established; reconcile later. Cached input is a subset.

### Experiment outcome

- Screenshot shows APP_ENV staging, 2e5e56f version, instructor config and enabled=true in the displayed snippet, and Cloudflare warning about Wrangler sync. No proof of selected Worker name, effective deployed settings, secret presence, or complete profile. Checked-in Wrangler environment omits AI vars; gateway is not included in previously identified staging revision. No remote or local configuration changed; no provider call made. No controlled comparison.

## Prompt ai-next-steps-01 — 2026-11-13, time unavailable (Asia/Singapore)

**Prompt (redacted):** Ask what to do next after adding AI settings.

### Agents spawned

- New agents: None; explanation based on established configuration and evidence.
- Reused agents: None.
- Main agent: /root, Codex; model identifier unavailable.
- Historical activity: unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed activity | none spawned |

Total and source group unavailable. Recorder scope/refresh and prior prompt reconciliation not established; reconcile later. Cached input is a subset.

### Experiment outcome

- Explained immediate disabled setting, Worker identity and remaining implementation, staging verification and release steps. No settings, deployment or provider call made. No controlled comparison; next owner Darryl.

## Prompt gateway-other-chat-01 — 2026-11-13, time unavailable (Asia/Singapore)

**Prompt (redacted):** Ask whether enable flag can stay true and whether another chat is pushing the gateway fix.

### Agents spawned

- New agents: None; inspected existing user-owned chat, avoiding overlapping work.
- Reused agents: None.
- Main agent: /root, Codex; model identifier unavailable.
- Historical activity: unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed activity | none spawned |

Total and group unavailable. Recorder refresh/scope and previous reconciliation not established; reconcile later. Cached input is a subset.

### Experiment outcome

- Inspected active chat Evaluate SoCLaaS assessment quality via immediate snapshot: rebase complete, serial tests running, draft PR intended due unresolved quality and human review; observed PR creation tool marker failed. No successful push or PR established. Existing staging revision had no hosted gateway; true flag could activate after later deployment if configuration preserved. No code edits, settings change or deployment. No controlled comparison.

## Prompt ui-pr-01 — 2026-11-13, time unavailable (Asia/Singapore)

**Prompt (redacted):** Commit, push and open a PR for the UI/UX changes made in this chat.

### Agents spawned

- New agents: None; isolated branch and PR preparation do not require delegation.
- Reused agents: None.
- Main agent: /root, Codex; model identifier unavailable.
- Historical activity: unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Children | 0 | 0 | 0 | 0 | observed activity | none spawned |

Total, turn group and recorder checkpoint unavailable; prior prompt reconciliation remains pending. Cached input is a subset.

### Experiment outcome

- Isolated the UI changes on a branch from origin/main; excluded overlapping gateway work. UI-01/04/07/08, IAL-02, warm-workbook-v1. See workflow/evidence/instructor-ai-assessment/feedback-ui-review.md for verification and remaining manual review. No controlled comparison.
- Isolated branch checks: strict specs 18/18, typecheck and lint passed; full Vitest did not finish and was interrupted. Focused instructor tests 26/26 and build passed. Browser/human acceptance pending.
