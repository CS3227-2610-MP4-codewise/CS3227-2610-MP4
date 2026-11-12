# Design

The gateway composes the existing C-AI typed request/outcome and injected authorization, evidence and action-validator ports. Assessment uses existing immutable submission/rubric validation. Progress remains unavailable until Keith supplies authorization-aware evidence and domain validation. No browser role or cache key grants authority.

Transport uses the fixed SoCLaaS HTTPS origin, explicit allowlisted model, bounded request/response, no tools, server-only action-specific secrets and finite abortable timeouts. Provider secrets and raw content never enter logs. Activation defaults disabled until per-action capability, model, quota, credentials and isolated hosted connectivity are verified; separate keys do not prove separate upstream quota pools.

D1 is the one shared transactional store for request idempotency, quota reservations and leases. Request fingerprints and cache scope include principal, course, action, immutable evidence, prompt/model/settings and authorization rechecks. Every retry reserves capacity; at most two retries of definitive429 responses fit a single deadline. Transient408/5xx/network failures are uncertain and are not retried. An uncertain call retains conservative accounting and cannot become a later successful response after its lease. Missing usage never invents a number. Staging smoke checks require separate authorization and only synthetic inputs. No student progress implementation, code execution, grading release, production activation or deployment is implied.

## Readiness reconciliation — 2026-11-12

The local `gateway-reported-bounds-01` repair rejects component usage overruns even when the combined reservation fits; unsafe combined arithmetic retains uncertainty debt. Definitive component failures retain reserved tokens and cannot validate/cache output. Existing combined overage handling is preserved. No interface or migration changes.

Validated numeric usage is carried through internal transport failures for malformed/truncated generated content, so rejection cannot discard reported overage. The same gateway accounting path runs before success or safe failure; raw rejected content is never attached to the error.

Admission is a same-D1, single shared-pool fixed-window policy, not a proven provider quota adapter. Separate databases, keys and environments do not establish independent quota pools. Historical model/budget discovery does not verify rolling-window, output/tokenization or concurrency behavior. Normal application wiring and operational reconciliation remain activation dependencies documented in the readiness packet; no unknown debt is cleared and no live routes are enabled.
