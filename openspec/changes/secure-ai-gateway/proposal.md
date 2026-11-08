# Proposal

## Why
The C-AI schemas and ports have no real server-only provider or distributed resource implementation. Instructors need safe assessment assistance and Keith needs a reliable progress-consumer boundary without exposing credentials or treating generated feedback as approved.

## What Changes
- Implement an allowlisted SoCLaaS adapter and a persisted, scope-aware gateway with atomic quota, deadlines, bounded retries and reauthorization. [AI-01–05, CON-06, OPS-01]
- Use separate server-only instructor and student provider keys; missing configuration or verified capability/quotas disables the corresponding action. Never activate against live SoCLaaS from synthetic evidence.
- Require registered action-domain validation; assessment uses pinned rubric/source validation; Keith supplies progress evidence selection and validator.
- Prepare restricted staging connectivity checks and a producer/consumer handoff without performing live calls or deployment.

## Capabilities
### New Capabilities
- `secure-ai-gateway`: bounded provider transport, request lifecycle, admission and validated authorized output.
### Modified Capabilities
- None. Existing in-flight `codewise-mvp` and `instructor-development-contracts` remain authoritative and are cross-referenced.

## Impact
Darryl owns shared gateway/next migration and assessment boundary; Keith owns student progress validation and consumer review. No new UI, learner-code execution, automatic grade approval, student implementation or activation. Actual provider models, quotas and shared-account limits remain unverified. One active schema writer; staging authorization is separate.
