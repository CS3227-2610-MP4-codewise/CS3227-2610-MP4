# Keith handoff: secure gateway readiness and progress consumer

Owner: Darryl; next owner: Keith for consumer implementation/exact-source review, then joint shared wiring. Requirements AI-01–05, CON-06, OPS-01. Policy acceptance already recorded in IntegrationContracts is preserved; this packet claims no new Keith review/approval and sends no message on Keith's behalf.

Producer base main: `af1bc90fa47ed0b8726a46084ce642992c807e15`. Local uncommitted repair identity: [SHA256 source manifest](../evidence/secure-ai-gateway/readiness-source-sha256.json). Consumer revision: **pending, not supplied**. Pin both actual commits and rerun checks after publication; a content hash is a working-copy identity, not a commit. No student implementation, public schema or migration changed.

## Existing C-AI contract and examples

`AIGatewayPort<A,T>` in `src/server/instructor/ports/contracts.ts` exposes `request(principal,input)` and `readAuthorized(principal,requestId)`. `GatewayResolver` in `src/server/ai/gateway.ts` must reauthenticate current request/session/account and authorize course/objects on **every invocation**, then return `{evidenceKey,system,user,validate}`. Validation is async and mandatory; no generic progress validator exists. Never accept a principal or evidence body from browser JSON as trusted.

Example typed input (synthetic identifiers, output100 is illustrative, not a provider-approved cap):

```json
{
  "schemaVersion": 1,
  "action": "progress-explanation",
  "courseId": "course_a",
  "idempotencyKey": "progress_probe_a",
  "evidenceRefs": [
    { "kind": "release", "assessmentId": "assessment_a", "releaseVersion": 2 }
  ],
  "outputTokenLimit": 100
}
```

Request accepts1..20 unique `(assessmentId,releaseVersion)` pairs; progress forbids `includePrivateReferences`. Another actor/course/action cannot share a request/cache. Same idempotency key with changed input/evidence is a conflict; use safe retry of the identical intent, not new keys to evade exhausted quota. Tagged unavailable usage is not zero tokens. Public UI consumes the existing safe `projectAIStatus` projection, never raw provider errors/context/assessment payloads. No AI result approves or releases grades.

Keith resolver must select only the current learner's authorized released evidence, pin immutable release versions and their exact attempt/publication/criterion comparison/bounds. Include release availability/currentness and comparability dependencies in the evidence fingerprint; recheck before and after validation/disclosure and on cache reads. Reject out-of-scope, unreleased, withdrawn, incompatible and stale references wholly. Validate citations, numeric comparisons, allowed claims and output shape; permit no private reference, instructor-only annotations, draft assessment or another learner's evidence into progress prompts/results. Quota/key/model settings are server supplied, never browser controlled.

## C-REL projections

Use existing `ReleaseReadPort.getAuthorized(principal,id,releaseVersion)` returning `Release | Withdrawn` plus `currentness(principal,id)` returning `Currentness`. Currentness contains `assessmentId`, `submissionAttemptId`, `availabilityRevision`, `currentReleaseVersion`, `withdrawnReleaseVersions`, `checkedAt`. Use the existing `currentnessToken` semantics and fresh authorization; a cached released DTO alone cannot prove availability.

Concrete settled example: releasev1 followed byv2 -> current2; withdraw historicalv1 -> current2 remains, availabilityRevision increments; withdraw currentv2 -> currentnull, never restorev1. Withdrawn version reads are tombstones, never reuse old criteria/annotations from cache. Learner access remains self-only and current membership/session controlled. No change to the settled withdrawal policy is proposed.

## Submission dependency for normal instructor wiring

`SubmissionReadPort.getAuthorized(principal,attemptId)` returns the exact immutable `Attempt`. Existing `SubmissionCatalog` in `assessments/workflow.ts` adds `sampleMode`, `scope(principal,attemptId)` and `list(principal,publication)` returning `{attemptId,submittedAt,label,sample}[]`. Real adapter must have `sampleMode=false`, preserve authoritative immutable source/answer/hash/rubric/publication identity and current same-course instructor authorization on scope/list/read. No client-supplied course scoping, submission mutation or duplicated store. Missing producer stays unavailable/manual. Publication-base update: PR26 is merged at main46830b6, with `D1SubmissionCatalog` already constructed in normal instructor assessment. Reuse that producer; no submission injection rewrite is required. Keith reported local C-SUB composed acceptance at1a5b924, distinct from gateway/progress review.

## Reusable checks / consumer acceptance

Run `progressGatewayConsumerContractSuite` from `workflow/contracts/progress-gateway-consumer.ts` against fresh isolated fixtures. Its five fixture operations cover missing validator, unowned/unreleased evidence, invalid output, another actor and revocation. Add consumer-specific cases: withdrawn historical/current release, changed availabilityRevision, incompatible comparisonKey/bounds, duplicate refs, stale async output, membership/session/account revocation between resolutions, cache re-read after withdrawal, malicious citation/private-data output and manual outage fallback. Test CSRF on real mutations, no provider call before denial, no body leakage in safe status, and no grade/release mutation by AI.

Producer checks: `npx vitest run src/server/ai/transport.test.ts src/server/ai/gateway.test.ts src/server/ai/store.test.ts`; `npm run check`. Current transport passes; D1 setup is sandbox-blocked. Keith must run actual consumer checks and attach exact revision/results; this exported suite has not been executed against a real progress consumer by Darryl. Include request-bound integrated tests; synthetic resolver success does not certify session revocation.

## Proposed exclusive windows (not yet agreed)

| Order                                                    | Sole writer                    | Files/interface                                                                                   | Gate                                                                                                                 |
| -------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Current local repair                                     | Darryl/main                    | ai/gateway+transport and tests, existing OpenSpec/evidence/handoff                                | Bounded autoapproved repair; read-only independent review                                                            |
| Consumer preparation                                     | Keith                          | Student progress resolver/validator/tests; real submission adapter in Keith-owned files           | Pin reviewed producer, retain C-AI/C-REL/SH-SUB; no index/schema overlap                                             |
| Normal application composition                           | Darryl                         | `src/server/index.ts`, `environment.ts`, server-only profile loader, assessment composition tests | Keith agrees exact adapter/interface revisions and window; provider readiness evidence; no simultaneous index writes |
| Additional global quota/reconciliation schema, if needed | Named joint-agreed sole writer | Explicit API/schema/migration allocation after latest merged numbering check                      | Separate bounded design and review before dependent implementation; no reset/deletion of live debt                   |

Full setup/evidence/authorization and synthetic staging procedure: [readiness audit](../evidence/secure-ai-gateway/readiness-audit.md). No provider completion, remote secret alteration, deployment or production activation is authorized by this packet. Please return actual consumer commit, tests, unresolved incompatibilities and agreed writer window; broad policy acceptance alone does not close this handoff.
