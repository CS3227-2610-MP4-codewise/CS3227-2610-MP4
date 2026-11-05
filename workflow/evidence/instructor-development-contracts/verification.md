# Instructor development contract verification — 2026-11-05

Requirements: DEV-01, DEV-02, SUB-01, GRADE-04, AI-05; CON-01–CON-07 and supporting AUTH/SUB/GRADE/AI/PROG cases. Base e3862de841c61cadf3c1f82b19e94db5fb445f61. Branch codex/instructor-development-contracts, isolated worktree. Darryl separately authorized incremental commits, push and PR creation after manual package acceptance; [PR #4](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/4) records publication. No merge/deployment/archive requested.

## Acceptance and scope

Readiness manual acceptance is verified from its recorded checklist/task 3.4 and earlier explicit approval. Darryl separately approved this contract brief, P1–P4 and the exact shared artifact editing window. All K1–K6 consumer decisions still await Keith; no producer revisions or real integration evidence exist.

Implemented candidate runtime schemas and semantic validators, safe public projections, injected server-only interfaces, importable synthetic examples, and reusable factory suites. No identity/course/submission database, role service, route, real gateway/provider, migration, deployment configuration or legacy DTO edit. Original interrupted publication scaffold was preserved in the original checkout.

## Checks actually run

| Check                           | Actual final result                      | Coverage                                                                                                                  |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| npm run check / strict OpenSpec | Passed, 3 changes                        | MVP, readiness, new contract-validation delta                                                                             |
| TypeScript                      | Passed                                   | Shared/server schemas and tests; imported workflow factories/suites checked transitively                                  |
| ESLint                          | Passed                                   | Repository configured scope                                                                                               |
| Vitest                          | 88 passed across 2 files                 | 82 new contract tests + 6 existing API/application tests                                                                  |
| Node workflow/artifact tests    | 4 passed                                 | Existing environment isolation and exact release-artifact safeguards                                                      |
| Vite build                      | Passed                                   | Existing application remains buildable; no UI added                                                                       |
| Diff scope inspection           | Passed                                   | No web/student services, API entry, database/migrations, legacy DTO, dependency, CI/hosting/config or personal-tool edits |
| Whitespace / local links        | Passed: 11 Markdown documents / 38 links; no missing links or whitespace findings | New and changed Markdown plus referenced local modules                                                                    |

Focused checks ran during implementation, then full npm run check after repaired source/suites. Later publication metadata does not require repeating those suites. No new local/live deployment or provider request was run. Existing dependency installation was reused via an ignored worktree node_modules junction.

## Contract evidence tiers

| Boundary | Executed contract checks                                                                                                                                                                                                                  | Not established                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| C-ID     | Strict public views, denied/missing/revoked/forged principal or role headers, course/object authorization before private read, mutation-origin refusal, no fallback adapter                                                               | Real maintained identity integration, signed sessions, real membership store or browser CSRF flow                             |
| C-PUB    | Explicit safe projection from private-rich record, nested unknown-field refusal, rubric/identity/deadline/size checks, legacy ID mapping, unchanged pinned fixture versions                                                               | Publication UI/persistence, transactions, deployed visibility or joint consumer acceptance                                    |
| C-SUB    | Complete pinned question/rubric coverage, immutable IDs, canonical UTF-8/SHA-256 evidence, detached reads, missing/duplicate/foreign answer refusal                                                                                       | Keith's actual submission store, save/submit concurrency, atomic attempts, deadline/idempotency producer behavior             |
| C-REL    | Exact composite criterion coverage/bounds/annotation excerpts, stale approval/availability refusal, content-free tombstones, current/historical withdrawal, no fallback; synthetic command replay/conflict cases                          | Actual release transactions, audit retention, historical storage or Keith's progress invalidation service                     |
| C-AI     | Closed action/evidence/result branches; output cap/admission/validator/config/auth refusal before synthetic transport; invalid domain results rejected; async revocation/withdrawal/deadline races; safe public status; unavailable usage | Real SoCLaaS, verified quotas/model/access, multi-replica admission, token accounting, production cache or request repository |

Numeric source fixture hash independently verified: canonical UTF-8 print(1) followed by LF is 9 bytes and SHA-256 cc42155088fca5730758db72b2a5bca33112a941dfaa2d43098ec422ce4ea213. Empty/trailing-LF, CRLF/CR, Unicode/byte bounds, invalid Unicode/NUL, finite score/precision boundaries, safe issue limits and exact UTC dates are tested. No submitted code is executed.

## Independent review and repairs

Same independent read-only /root/contracts_review examined planning and implementation. During implementation it identified unknown-input helper gaps (getter/class access and unparsed mutated feedback arrays); main repaired and added regression tests. It then reproduced deadline consumption in request-record persistence and revocation/currentness changes during awaited payload validation in the synthetic gateway driver. Main added a pre-transport deadline check and final authorization/evidence/deadline checks after validation, with four interleaving regressions. Runtime payload kind is also checked against the request action.

Focused re-review accepted the repairs with no remaining actionable findings. Reviewer inspected code/tests and ran targeted Node reproductions. Its Vitest startup was denied filesystem access to the worktree parent; it did not claim a successful independent Vitest run. Main executed the passing suites with the required filesystem access. Reviewer approval is neither proof of real integration nor Darryl/Keith policy acceptance.

## Resources and remaining gates

External usage checkpoint: 2026-11-05 13:54:54 Singapore time; per_response_usage. Current main record turn-cc589f62a91c519618b96044 incomplete/provisional; last planning record turn-8c287230f6ce83b1de1ff8c9 completed. Available completed attributable implementation-review records include turn-1c86b77e7f199efd0cfe5a26 and turn-a1308df48d3d31ebd56ce688. Main/reviewer metadata gpt-6.1-sol; no model override. Sessions remain tagged to original configured repository, tool commands ran in this worktree. Later calls/final response are outside the snapshot. Global recorder warnings empty; current-turn warning disclosed. No numeric totals, fabricated zero metrics, unrelated child attribution or efficiency claim.

[Single Keith packet](../../IntegrationContracts.md#keith-review-packet--pending-agreement), real producer/auth integration remain pending. Darryl explicitly accepted the completed package/checklist on 2026-11-05; see the [accepted handoff](../../handoffs/instructor-development-contracts.md). No MVP application feature task was checked as complete. Reusable suites can be supplied real reviewed factories later with exact producer/consumer revisions; until then results are schema and synthetic conformance only.
