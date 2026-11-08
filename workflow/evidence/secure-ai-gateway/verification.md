# Secure AI gateway verification

Human owner: Darryl. Requirements AI-01–05, CON-06, OPS-01. Input base main 1a4e0d5; candidate is uncommitted on `codex/secure-ai-gateway`. Instructor and student keys are separate. No live provider, key, cloud account or deployment was accessed.

## Review and focused checks

/root/transport implemented the fixed-origin adapter; /root/storage implemented isolated D1 resource accounting. /root/gateway_review and /root/ai_final_review independently inspected source. Findings included shared quota policy inconsistency, output token overage, reauthorization before dispatch and after cached validation, deadline movement, finite Retry-After, fixed-window rollover, cache telemetry and missing assessment output schema. The main agent repaired these; focused re-reviews were requested. Quota pool debt remains fail-closed while provider outcome is uncertain.

Local synthetic gateway suite passed 30 tests after fixes. Full project check is recorded at the final checkpoint. An earlier full check stopped at lint for three unused bindings; these were repaired. An earlier synthetic test run failed due to a stale cache expectation and another due to a fixture import; both were repaired, and the failures are not concealed.

## Open gates

Live SoCLaaS activation requires real model capability, token bound including framing, quota/window semantics, cross-environment quota isolation or shared coordination, provider connectivity and hosted capacity evidence. Fixed windows are not claimed to enforce rolling quotas. Unknown provider calls permanently hold shared pool admission pending a separately designed safe reconciliation. No production wiring or live feature route exists, and actual Keith progress selection/validation, consumer execution and agreement remain pending. Setup instructions are in [setup.md](setup.md). No screenshots or UI review are applicable to this server-only iteration.

Full project check checkpoint: strict OpenSpec validation (9 changes), typecheck and lint passed. Vitest reported 341 passed and 5 failed in `workflow/auth/course-invitations.test.ts`: four five-second timeouts and one assertion failure after those timeouts. The check stopped before deployment-script checks/build. The assertion is not classified as a timeout; an isolated extended-timeout rerun is needed. Final gateway-specific suite and remaining steps are reported at the next checkpoint.

Follow-up checkpoint: isolated extended-timeout run (`vitest run workflow/auth/course-invitations.test.ts src/server/ai --testTimeout=30000 --maxWorkers=2`) passed 71/71 tests across 4 files, including the prior assertion failure and the final 31 AI tests. Typecheck, lint, four deployment tests and Vite build also passed afterward. This does not make the default-timeout `npm run check` pass; its four timeouts and subsequent assertion failure remain recorded above. A full extended-timeout suite was started separately.

Final verification checkpoint: `vitest run --testTimeout=30000 --maxWorkers=2` passed all 346 tests across 31 files. The final affected authentication plus AI suites passed 71 tests; the AI portion contained 31. Strict validation of all 9 OpenSpec changes, typecheck, lint, four deployment tests, and Vite build passed separately. The exact default `npm run check` still failed at the documented four auth timeouts and subsequent assertion; it is not claimed as passing. The isolated extended-timeout auth rerun passed all cases including that assertion. Focused key-like-pattern scan of new gateway/config/docs returned no matches; it is not a comprehensive secret-scanning service. `git diff --check` passed with line-ending warnings.

Independent final review found no further concrete blocker after the Retry-After and window fixes. Reviewer inspection is not a substitute for tests. Manual acceptance, actual provider capability/quota verification, separately authorized restricted staging and Keith's validator/consumer execution remain open.

## User-provided dashboard observation — 2026-11-08

A user-provided SoCLaaS dashboard screenshot shows an allowance/credits funding mode and daily/monthly allowance figures, with usage described per API key in UTC accounting windows. It does not document request/token rate limits, concurrency, model output caps, tokenization bounds, cross-key quota sharing or rate-window enforcement. Displayed zero spend caps and the exhaustion label are not interpreted as unlimited, free, disabled or billable without provider confirmation. No API key or account identifier is retained. This is not live API connectivity or activation evidence.

## User-provided SoCLaaS usage-limits documentation — 2026-11-08

The user supplied provider documentation stating current defaults of 90 requests/minute, USD 80/day and USD 800/month in reference-cost units, free of real charges, with daily/monthly accounting reset at 00:00 UTC. The earlier user-provided dashboard shows different account-specific allowance values (USD 50/day and USD 500/month); the stated defaults must not overwrite actual account data. Documentation says limits may change and provides `/api-key/budget` and `/v1/models` as sources for current values. It does not establish whether the 90 RPM default applies to this key, concurrency, token limits, rolling versus fixed rate-window semantics, model-specific output limits, or sharing across keys/environments. No authenticated endpoint was called. Live provider activation remains disabled and requires separately authorized verification.

## Authorized local provider discovery — 2026-11-08

Following Darryl's request to proceed, the agent used the configured instructor credential for read-only HTTPS GETs to the SoCLaaS models and portal budget endpoints. Both returned HTTP 401. The local gateway host and portal were reachable from this machine, but neither response established authenticated model access, quota details or hosted Cloudflare connectivity. No key, response body, model output or raw private material was recorded. The local key was present and basic formatting checks found no outer whitespace, newline, Bearer prefix or obvious placeholder; these observations do not determine why authentication failed. No completion request, staging deployment or production change was made. AI remains disabled.

## Authorized local discovery retry — 2026-11-08

On Darryl's explicit retry request, read-only local HTTPS GETs to `/v1/models` and `/api-key/budget` returned HTTP 200 using the configured instructor credential. The model endpoint lists `qwen3-coder-next` with `context_window` 262144. The budget endpoint reports `policy.requests_per_minute_limit=30`, effective daily allowance 50000000 microdollars and monthly allowance 500000000 microdollars. These account/key-specific results supersede the generic 90-RPM and 80/800 default figures for this local discovery; they do not prove the rate applies to another key or environment. No key, response body, username, private prompt or code is retained. The earlier HTTP 401 remains a historical failed attempt.

This is local read-only discovery, not an authenticated completion, Cloudflare/staging connectivity or activation. Output-token cap, usable JSON behavior, tokenization/reservation bounds, concurrency limit, fixed/rolling window semantics and cross-key/environment quota sharing remain unverified. Quota configuration is not automatically inferred from these responses. No application/provider/account mutation was performed.
