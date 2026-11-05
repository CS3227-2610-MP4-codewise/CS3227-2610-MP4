# Shared integration contracts

Updated 2026-11-05 for `project-readiness` (DEV-01–DEV-04). **Ownership is agreed; the interface profiles and scenarios below are drafts for joint acceptance before dependent edits.** Darryl reported Keith's agreement to the implementation split in this chat. That does not approve every product policy or establish implemented services.

## Sources

- [MVP design](../openspec/changes/codewise-mvp/design.md): planned entities, routes and version boundaries.
- [Shared DTO starting points](../src/shared/contracts.ts): current transport types, without runtime validation.
- [Ownership](Ownership.md): Darryl/instructor and Keith/student responsibilities.
- [Handoff template](handoffs/TEMPLATE.md): exact producer/consumer revision and verification.

## Contracts to settle before dependent backend integration

| Contract                             | Producer / consumers | Agree and record                                                                       |
| ------------------------------------ | -------------------- | -------------------------------------------------------------------------------------- |
| Identity and authorization           | Shared / both roles  | Identity provider, sessions, trusted roles, course/object checks and errors            |
| Published assignment/question/rubric | Darryl / Keith       | Immutable IDs, student-visible fields, deadlines, private-reference exclusion          |
| Draft and submitted attempt          | Keith / Darryl       | Revision conflicts, atomic submission, idempotency, immutable answer projection        |
| Released assessment                  | Darryl / Keith       | Release version/public fields; no draft feedback or private references in student DTOs |
| AI provider and resources            | Shared / both roles  | Supported model, verified quotas, context isolation, validation and failures           |
| Database and migrations              | Shared / both roles  | Entity constraints, one active migration writer and release compatibility              |

Assign a named human lead and one active writer per shared increment before implementation. This map does not assign all shared work to either member. Producer handoffs include exact types/routes, revision, synthetic payloads, verification and limitations. Consumers can use local fixtures while interfaces are agreed, but must not expose unauthenticated placeholder routes or claim mocks demonstrate integration.

## Current implementation and common draft profile

Baseline: `281cc1392b722e873bc58fd806913c5f2121eeec`. Only the app shell, health/API reservation, metadata store and deployment foundation exist. There are no feature-service handoffs; producer and consumer revisions are **unavailable** until future handoffs record them. The foundation handoff is not an identity/submission implementation. See [readiness evidence](evidence/project-readiness/verification.md) and [decision gates](../docs/PlanningDecisions.md).

The in-flight MVP specs remain the draft requirement source. These profiles prepare boundaries without creating a competing normative baseline. Existing TypeScript DTOs are incomplete starting points without runtime validation; no code is changed here.

Proposed shared conventions: opaque string IDs, positive integer revisions, UTC ISO timestamps, `Page<T>` pagination with opaque cursors, explicit public field allowlists and existing `ApiError { error: { code, message, requestId } }`. Never serialize database rows or private provider payloads directly. Server-derived membership is course-scoped; browser roles are presentation only.

Proposed errors: 401 absent/expired session; non-enumerating 404 inaccessible object/course; 403 CSRF failure or forbidden action on an otherwise visible object; 422 field validation; 409 revision/idempotency conflict; 429 admission limits with retry guidance; 503 disabled/unavailable AI. Exact machine codes, schemas and pagination limits require joint review in each producing change.

All protected service operations, lists, result reads and cache hits authorize the current actor/course/object. Mutations enforce origin/CSRF controls appropriate to the selected session integration. Health and login/callback are the intended public API exceptions. Until implemented securely, feature paths continue returning JSON 404.

## C-ID: identity and courses

**Producer/writer:** Keith. **Consumers/reviewer:** Darryl's instructor services and Keith's student services. **Requirements:** AUTH-01–AUTH-03. **Gate:** identity provider/session/provisioning decision and identity schema ownership.

Draft service operations: `requireSession`, `requireCourseMembership`, shared object-scope checks. Browser projections: `SessionView { userId, expiresAt }`, `CourseMembershipView { courseId, title, role }`; GET `/api/courses` lists active memberships. Provider subjects, session secrets and provisioning controls remain server-only. No global instructor flag overrides course membership.

Keith supplies trusted subject mapping, expiration/logout/revocation, one authoritative user/course/membership store and documented errors. Consumers pass the target course/object and recheck membership for result reads; neither role builds parallel identity storage.

| Scenario | WHEN                                                               | Producer guarantee / consumer acceptance                                             |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| ID-01    | Session is absent, expired or logged out                           | 401 without data; both role UIs request sign-in and safely retain unsaved local text |
| ID-02    | Client forges instructor role or requests an unassigned course     | Trusted membership controls access; UI state cannot unlock privileged operations     |
| ID-03    | Cookie mutation fails origin/CSRF validation                       | No write/provider call; consumer shows no success state                              |
| ID-04    | Membership is revoked after AI admission, before result/cache read | Current membership rejects read; neither role displays private cached content        |
| ID-05    | Student guesses another student's attempt                          | Denied before content/context assembly; no code, feedback or AI status leaks         |

**Open:** provider, callback/logout flow, cookie/CSRF settings, trusted setup operator, membership lifecycle and demo accounts. Keith proposes them in SH-ID; Darryl reviews before depending on it.

## C-PUB: published assignment

**Producer/writer:** Darryl. **Consumer/reviewer:** Keith. **Requirements:** SUB-01, SUB-04. **Gate:** accepted C-ID and versioned publication schema.

Draft `PublishedAssignmentView`: `assignmentId`, `assignmentVersionId`, `courseId`, `title`, `publishedAt`, `deadlineAt`, ordered `questions`. Each question has `questionVersionId`, title, instructions, language, starter code, `rubricVersionId` and criteria with `criterionId`, `comparisonKey`, descriptor and finite minimum/maximum scores. Existing `PublishedQuestion.id` requires an explicit mapping/migration to `questionVersionId`; consumers must not guess its meaning.

Darryl validates publication atomically and stores immutable versions. Private references and authoring drafts use separate instructor-only projections. Keith pins drafts to published versions and renders only the public allowlist. Proposed MVP routes GET `/api/courses/:course/assignments` and POST `/api/assignments/:id/publish` do not exist yet.

| Scenario | WHEN                                                                 | Producer guarantee / consumer acceptance                                           |
| -------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| PUB-01   | Authorized student reads a published version                         | Public assignment/question/rubric envelope only; no private reference/draft fields |
| PUB-02   | Duplicate criterion keys, invalid bounds or missing required content | Field errors and atomic failure; previous publication remains usable               |
| PUB-03   | Published content changes                                            | New immutable IDs; existing drafts/attempts stay pinned                            |
| PUB-04   | Unpublished or foreign-course version requested                      | Visibility/authorization reject before serialization                               |

**Open:** availability/deadline edits, comparison-key governance, scoring precision, language and size limits. Republishing cannot silently move existing work.

## C-SUB: immutable submission

**Producer/writer:** Keith. **Consumers/reviewer:** Darryl's assessment service and Keith's history. **Requirements:** SUB-02–SUB-04, AUTH-02. **Gate:** accepted C-ID/C-PUB.

Existing `SubmitAssignmentRequest` carries an idempotency key and every question's expected draft revision. The route's assignment version is validated through object authorization. Draft response: `attemptId`, `assignmentVersionId`, `courseId`, `submittedByUserId`, server `submittedAt`, ordered `answers[] { submittedAnswerId, questionVersionId, rubricVersionId, draftRevision, source, sourceHash }`. Identity comes from the server. Darryl consumes an authorized projection of the same immutable record, not a copied submission store.

Proposed canonical representation: UTF-8 source with CRLF/CR normalized to LF at draft ingress, retained for snapshot/hash/one-based annotation lines. Agree the hash algorithm, empty-source/terminal-newline rules, size limits and actor/action/assignment-scoped canonical request fingerprint before implementation. No later normalization changes historical attempts. Snapshot all answers, revisions, versions and the idempotency record in one transaction. Known identical retries are checked before new-attempt deadline rejection, with authorization always first.

| Scenario | WHEN                                                                | Producer guarantee / consumer acceptance                                                   |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| SUB-C01  | All questions/revisions match before accepted deadline              | One complete immutable attempt; assessment loads exact source/rubric, never current drafts |
| SUB-C02  | Any question is missing, duplicate, foreign, stale or oversized     | Whole submit fails; neither role sees a partial attempt                                    |
| SUB-C03  | Same scoped key/canonical payload retries, including after deadline | Original committed attempt returned; no duplicate attempt/assessment                       |
| SUB-C04  | Same key has different payload                                      | 409; original attempt unchanged; reconcile rather than overwrite                           |
| SUB-C05  | Save races submit or request reaches deadline boundary              | Agreed transactional revision/server-time rule; no unexpected source or late new attempt   |
| SUB-C06  | Later attempt/draft changes                                         | Old source, hashes, version/answer IDs remain immutable; annotations use old attempt       |

**Open:** deadline equality, attempt count, per-question/assignment limits, canonicalization/hash/fingerprint details. Proposed MVP policy: new attempts strictly before deadline, no late submissions. A retry after membership revocation cannot bypass authorization.

## C-REL: released feedback

**Producer/writer:** Darryl. **Consumers/reviewer:** Keith's feedback/progress services. **Requirements:** GRADE-01–GRADE-04, SUB-04, PROG-01–PROG-03. **Gate:** accepted C-ID/C-PUB/C-SUB. Manual grading can precede AI availability.

Draft extension to `ReleasedAssessment`: `id`, `submissionAttemptId`, `assessmentRevisionId`, `releaseVersion`, `releasedAt`, rubric version references, criteria with criterion/comparison IDs and minimum/maximum/awarded scores, and `annotations[] { submittedAnswerId, questionVersionId, rubricVersionId, criterionId, startLine, endLine, excerpt, explanation }`. The existing DTO lacks several fields and is not a complete accepted schema. Retain reviewer/audit provenance server-side; public fields exclude references, private prompts/provider payloads and unreleased revisions.

Darryl approves/releases the exact revision; edits invalidate approval and corrections create reviewed release history. Keith joins annotations to immutable submitted answers and records exact evidence/release versions for progress reuse. Bounds, criterion coverage and source/excerpt validation apply to manual and AI-derived releasable content. AI success never equals approval or release.

| Scenario | WHEN                                                               | Producer guarantee / consumer acceptance                                                                |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| REL-01   | AI/manual draft is not released                                    | Student endpoints/status contain no draft scores/text; progress cannot select it                        |
| REL-02   | Edit follows approval or release request is stale                  | Invalidate approval/conflict; previous public release remains authoritative                             |
| REL-03   | Exact reviewed revision is explicitly released                     | Versioned public projection; feedback uses exact source and progress only released evidence             |
| REL-04   | Regeneration/correction follows release                            | Preserve edits/history; correction needs fresh approval/release; replaced evidence makes progress stale |
| REL-05   | Annotation range/excerpt/criterion mismatches pinned source/rubric | Releasable-content validation fails; no fabricated/shifted annotation shown                             |
| REL-06   | Release is withdrawn under a future agreed policy                  | Atomic visibility/currentness update; cached progress becomes stale before redisplay                    |

**Open:** PROG-03 requires withdrawal invalidation, but design has no withdrawal operation. Agree operator, authorization, audit/history visibility and read semantics before feedback/progress integration. No withdrawal route is added here. Also agree historical-release selection and safe public rendering.

## C-AI: shared AI gateway

**Producer/writer:** Darryl. **Consumers/reviewer:** Darryl's assessment and Keith's progress services. **Requirements:** AI-01–AI-05, GRADE-01–02, PROG-01–03. **Gate:** accepted C-ID and action-specific immutable evidence contracts.

Server-only draft input: verified principal/course/action (`assessment-draft` or `progress-explanation`), scoped idempotency key, evidence/version references, prompt version, configured model/settings and bounded output allowance. Browser callers cannot choose URLs, supply trusted policy or select arbitrary private context. The authorized domain service assembles minimal action-specific context; gateway validates allowlisted action/config and persists request metadata before calling SoCLaaS.

Draft result: `requestId`, status (`pending`, `running`, `succeeded`, `failed`, `expired`), evidence/prompt/model versions, safe retry/error code and validated action payload on success. Public status is a separate authorized allowlist; instructor payloads never appear in student responses. Internal metrics record outcome, latency, retries, reservation reconciliation and available token usage; missing metrics are unavailable, not zero.

Darryl's gateway owns endpoint/model configuration, shared atomic request/token/concurrency admission, leases, idempotency, deadlines, eligible retries (at most two), scoped caching, transport/schema checks and redacted metrics. Darryl's assessment service owns pinned rubric/source context and exact criterion/score/excerpt validation. Keith's progress service owns released/self-only selection, comparability/citation validation and stale-evidence rechecks. Domain validation must complete before output is marked successful/usable; invalid output fails wholly. No model/gateway can execute code, approve or release grades. Darryl does not implement student progress in the gateway.

| Scenario | WHEN                                                                | Producer guarantee / consumer acceptance                                              |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| AI-C01   | Verified model/quotas/credentials/deployed connectivity are missing | AI disabled; no provider call; manual grading and saved code remain usable            |
| AI-C02   | Active duplicate or changed payload reuses a key                    | Reuse matching request; conflict on changed fingerprint; no overwritten feedback      |
| AI-C03   | Replicas/retries compete beyond shared budget                       | Only admitted calls invoke provider; retry guidance; no local-counter bypass          |
| AI-C04   | Timeout, auth/validation failure or Retry-After exceeds deadline    | Bounded failure; no auth/validation auto-retry or detached work; no release/lost save |
| AI-C05   | Injected input or invalid criterion/score/excerpt/citation returned | No privileged tools; reject invalid output wholly; draft only/no unsupported progress |
| AI-C06   | Membership/release changes before result/cache read                 | Reauthorize/revalidate currentness; no cross-scope cache or stale progress display    |
| AI-C07   | Provider omits usage                                                | Mark unavailable and retain conservative budget policy; invent no usage percentage    |

**Open:** supported model/capabilities, real quotas and cross-environment scope, tokenizer/reservations, host deadline, timeout/retry constants, cache retention and runtime payload schemas. Synthetic adapters do not verify provider access or quotas.

## Handoff and acceptance gate

Before dependent edits, producer and consumer jointly accept relevant fields, policies and scenarios in a bounded OpenSpec feature change. Record both review outcomes, active writer, exact producer revision, public/internal runtime schemas, safe errors and synthetic payloads using the [handoff template](handoffs/TEMPLATE.md). Consumer records its revision and executed integration/security checks against that producer. Fixture-only consumption remains integration pending; type checks alone are insufficient.

Order: identity/course → publication → submission → manual assessment/release → feedback/progress consumption. Gateway can use isolated synthetic adapters after interface agreement, but consumers/activation wait for auth, evidence and provider gates. Serialize migration numbering and shared DTO/API wiring by active producer. Consume Keith's identity/submission handoffs when available; absent handoffs block dependent integration rather than justify substitute services.
