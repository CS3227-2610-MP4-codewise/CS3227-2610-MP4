# Secure AI gateway handoff

Published update: repair source commit `1920f91bb743a0f5325c03be8ce0024011e2686d`, [PR28](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/28), based on current main46830b6. PR26/27 and the real D1SubmissionCatalog are now merged and preserved. Original local snapshot descriptions below remain historical; pending gateway/progress consumer review is distinct from Keith's existing C-SUB acceptance.

## Readiness update — 2026-11-12

Current exact-content audit and normal-application/private-config/staging-only plan: [readiness audit](../evidence/secure-ai-gateway/readiness-audit.md), [source manifest](../evidence/secure-ai-gateway/readiness-source-sha256.json). Base main `af1bc90fa47ed0b8726a46084ce642992c807e15`; repairs are local/uncommitted. Do not infer publication or main inclusion. [Keith progress-consumer packet](secure-ai-gateway-progress-consumer.md) states proposed exclusive windows and pending source review.

One bounded reported-bounds increment repairs component overruns and malformed-output usage loss; unsafe totals retain uncertainty debt. No API/DTO/migration/live wiring change. Darryl expressly autoapproved brief/waived human acceptance; independent review is recorded separately in the audit. Provider quota semantics, model/context/output validation, cross-environment coordination and authorized staging remain external gates. Unknown remote work was not cleared. Current D1 test initialization is blocked by loopback EACCES, not a successful concurrency/revocation/restart verification.

Darryl owns the candidate gateway and D1 migration. Requirements AI-01–05, CON-06, OPS-01. Keith owns student progress selection, authorization/currentness and domain validation; no Keith acceptance is inferred.

The server-only entry is `SecureAIGateway` implementing the existing `AIGatewayPort`; supply trusted per-action `resolve` callbacks that reauthorize exact evidence on every invocation and a mandatory async action-domain validator. `assessmentResolver` validates the pinned publication/attempt and uses `validateAssessmentDraft`. Progress has no default resolver/validator, and fails closed if one is absent. The provider adapter receives an action-specific key; all reservations use one shared D1 provider pool and fixed-window policy.

Runtime uses bounded synchronous calls, not detached work. Successful cached results are actor/course/action/evidence/model/prompt scoped and reauthorized on read. Unknown/expired in-flight attempts hold concurrency debt because timeout does not prove remote cancellation; operational reconciliation is not yet implemented. Usage missing from a provider is unavailable; cache copies do not duplicate reported provider usage.

See [setup and activation gates](../evidence/secure-ai-gateway/setup.md) for secrets and provider verification. Local tests and synthetic fixtures do not prove provider quotas, live connectivity, authorization composition, independent cross-environment budgets or deployment. No production route is enabled; review source/tests and record exact producer/consumer revisions before integration. Keith must implement and review progress evidence selection, authorization/currentness and validation and run reusable consumer checks.

Reusable synthetic progress checks are exported by `workflow/contracts/progress-gateway-consumer.ts`. Keith supplies a fresh fixture for each check, including unowned/unreleased evidence, missing validator, invalid provider output, cross-user access and revocation. Passing this suite alone does not establish real integration or replace C-ID/C-REL authorization tests. The current gateway tests also exercise the selected student key using a synthetic resolver; the real progress validator is not supplied.
