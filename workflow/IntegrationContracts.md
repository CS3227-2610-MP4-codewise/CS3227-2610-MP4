# Shared integration contracts

Updated 2026-11-05 for instructor-development-contracts. **Darryl approved the brief, P1–P4 owner policies and isolated contract-artifact write window. Keith’s detailed K1–K6 agreement remains pending.** Readiness and workload acceptance do not establish real-producer integration.

Current SH-AUTH update, 2026-11-06: Darryl approved Google OIDC, invitation-only onboarding, 30-minute idle/8-hour absolute sessions and trusted-administrator invitation management with manual link delivery. The [SH-AUTH handoff](handoffs/shared-authentication.md) identifies the local implementation, separate UI schemas and reusable real-D1 session checks. Existing C-ID SessionView remains unchanged; no course roles/memberships are added. Earlier provider/registration and no-producer statements below are historical baselines superseded for this slice only. Real Google configuration/callback, deployed authentication, Keith revised-boundary review and SH-ID integration remain pending; this is not Keith's acceptance or a deployed feature claim.

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

Feature-service baseline: e3862de (merged readiness). The app shell, health/API reservation, metadata store and deployment foundation remain the only deployed application behavior. This iteration adds isolated candidate contract artifacts, not feature services. There are no feature-service handoffs; producer and consumer revisions are **unavailable** until future handoffs record them. The foundation handoff is not an identity/submission implementation. See [readiness evidence](evidence/project-readiness/verification.md) and [decision gates](../docs/PlanningDecisions.md).

The in-flight MVP specs remain the draft requirement source. These profiles prepare boundaries without creating a competing normative baseline. Existing scaffold DTOs remain incomplete starting points; the opt-in candidate package now supplies runtime validation without changing those legacy types.

Proposed shared conventions: opaque string IDs, positive integer revisions, UTC ISO timestamps, `Page<T>` pagination with opaque cursors, explicit public field allowlists and existing `ApiError { error: { code, message, requestId } }`. Never serialize database rows or private provider payloads directly. Server-derived membership is course-scoped; browser roles are presentation only.

Proposed errors: 401 absent/expired session; non-enumerating 404 inaccessible object/course; 403 CSRF failure or forbidden action on an otherwise visible object; 422 field validation; 409 revision/idempotency conflict; 429 admission limits with retry guidance; 503 disabled/unavailable AI. Exact machine codes, schemas and pagination limits require joint review in each producing change.

All protected service operations, lists, result reads and cache hits authorize the current actor/course/object. Mutations enforce origin/CSRF controls appropriate to the selected session integration. Health and login/callback are the intended public API exceptions. Until implemented securely, feature paths continue returning JSON 404.

## C-ID: identity and courses

Runtime candidate: [sessionViewSchema/courseMembershipSchema](../src/shared/instructor-contracts/identity.ts) and server-only [IdentityCoursePort/withAuthorizedObject](../src/server/instructor/ports/contracts.ts). Session → authoritative object-to-course metadata → current course permission → mutation-origin guard → private read. Parsed/browser roles and principal-shaped JSON never authorize. No real adapter/fallback is composed into routing.

**Producer/writers:** Darryl for SH-AUTH (sign-in, registration/provisioning, provider/account mapping, sessions/logout and CSRF); Darryl for SH-ID (courses, memberships, course/object authorization and allowed workspace contexts). **Consumers/reviewers:** both role services; each owner cross-reviews the composed C-ID boundary. **Requirements:** AUTH-01–AUTH-03. **Gate:** provider/registration-policy decision, accepted session-to-authorization contract and serialized schema ownership. This is Darryl's 2026-11-06 ownership revision; Keith's revised-boundary review is pending.

Darryl supplies trusted subject/account mapping, authenticated session validation, expiry/logout/session revocation and mutation-origin/CSRF guards. Keith consumes the trusted subject to resolve current courses/memberships and object permissions, including membership revocation and allowed workspace contexts. Keep one authoritative identity/course store and the existing server-only injected port; no competing per-role session store, client role authority or duplicate C-ID contract. Both owners agree failure/revocation semantics and exact producer revisions before composing protected routes.

| Scenario | WHEN                                                               | Producer guarantee / consumer acceptance                                             |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| ID-01    | Session is absent, expired or logged out                           | 401 without data; both role UIs request sign-in and safely retain unsaved local text |
| ID-02    | Client forges instructor role or requests an unassigned course     | Trusted membership controls access; UI state cannot unlock privileged operations     |
| ID-03    | Cookie mutation fails origin/CSRF validation                       | No write/provider call; consumer shows no success state                              |
| ID-04    | Membership is revoked after AI admission, before result/cache read | Current membership rejects read; neither role displays private cached content        |
| ID-05    | Student guesses another student's attempt                          | Denied before content/context assembly; no code, feedback or AI status leaks         |

**Open:** Darryl proposes provider, sign-in/callback/logout, cookie/session/CSRF settings, registration method and trusted account-provisioning/demo process in SH-AUTH; Keith reviews. Keith proposes course/membership lifecycle, object scope and allowed workspace contexts in SH-ID; Darryl reviews. Public registration and instructor self-provisioning are not approved. Accepted SH-AUTH and SH-ID handoffs are both required for real C-ID integration.

## C-PUB: published assignment

Runtime candidate: [publicationSchema/projectPublication/toLegacyQuestion](../src/shared/instructor-contracts/publication.ts). Closed schemaVersion 1, logical questionId/rubricId and immutable version IDs. Legacy id explicitly maps to questionVersionId. The allowlist projection excludes private references/draft fields. Existing scaffold DTOs remain unchanged.

**Producer/writer:** Darryl. **Consumer/reviewer:** Keith. **Requirements:** SUB-01, SUB-04. **Gate:** accepted C-ID and versioned publication schema.

Darryl validates publication atomically and stores immutable versions. Private references and authoring drafts use separate instructor-only projections. Keith pins drafts to published versions and renders only the public allowlist. Proposed MVP routes GET `/api/courses/:course/assignments` and POST `/api/assignments/:id/publish` do not exist yet.

| Scenario | WHEN                                                                 | Producer guarantee / consumer acceptance                                           |
| -------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| PUB-01   | Authorized student reads a published version                         | Public assignment/question/rubric envelope only; no private reference/draft fields |
| PUB-02   | Duplicate criterion keys, invalid bounds or missing required content | Field errors and atomic failure; previous publication remains usable               |
| PUB-03   | Published content changes                                            | New immutable IDs; existing drafts/attempts stay pinned                            |
| PUB-04   | Unpublished or foreign-course version requested                      | Visibility/authorization reject before serialization                               |

**Darryl accepted P1–P3 for the candidate; Keith pending:** version/deadline/reference edit policy, comparison keys, score precision and source representation are resolved for isolated instructor development. Team acceptance of the projection/resource bounds and real producer integration remains required. No silent migration of pinned work.

## C-SUB: immutable submission

Runtime candidate: [attemptSchema/validateAttempt](../src/shared/instructor-contracts/submission.ts) and injected SubmissionReadPort. Checks complete pinned question/rubric coverage and canonical source hashes. Keith retains the actual submission command/transaction/storage producer. No parallel identity/course/submission store is created.

**Producer/writer:** Keith. **Consumers/reviewer:** Darryl's assessment service and Keith's history. **Requirements:** SUB-02–SUB-04, AUTH-02. **Gate:** accepted C-ID/C-PUB.

The existing SubmitAssignmentRequest remains Keith-owned scaffold; this increment specifies only the immutable read boundary consumed by instructors, not submission commands or their transactional implementation.

The candidate source contract is implemented by canonicalizeSource/sourceHash/excerpt primitives: producer ingress normalizes once, consumers verify rather than rewrite. Darryl accepted these representation rules; Keith must agree before supplying real C-SUB evidence. Submission transaction/deadline/idempotency semantics remain Keith-owned producer gates.

| Scenario | WHEN                                                                | Producer guarantee / consumer acceptance                                                   |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| SUB-C01  | All questions/revisions match before accepted deadline              | One complete immutable attempt; assessment loads exact source/rubric, never current drafts |
| SUB-C02  | Any question is missing, duplicate, foreign, stale or oversized     | Whole submit fails; neither role sees a partial attempt                                    |
| SUB-C03  | Same scoped key/canonical payload retries, including after deadline | Original committed attempt returned; no duplicate attempt/assessment                       |
| SUB-C04  | Same key has different payload                                      | 409; original attempt unchanged; reconcile rather than overwrite                           |
| SUB-C05  | Save races submit or request reaches deadline boundary              | Agreed transactional revision/server-time rule; no unexpected source or late new attempt   |
| SUB-C06  | Later attempt/draft changes                                         | Old source, hashes, version/answer IDs remain immutable; annotations use old attempt       |

**Keith producer gates:** deadline equality, attempt-count limits, canonical request fingerprint/transaction semantics and detailed acceptance of candidate source/line bounds. Authorization always precedes retry/result access, including after membership revocation.

## C-REL: released feedback

Runtime candidate: [releaseSchema/withdrawnSchema/currentnessSchema/releaseCommandSchema/withdrawalCommandSchema/validateRelease/assertApproval/projectRelease](../src/shared/instructor-contracts/release.ts). Feedback criteria carry explicit composite question/rubric/criterion joins. Closed content, currentness and tombstone schemas exclude private reasons/references/prompts/drafts. ReleaseProtocolPort is a replaceable future producer seam, not an implemented lifecycle service.

**Producer/writer:** Darryl. **Consumers/reviewer:** Keith's feedback/progress services. **Requirements:** GRADE-01–GRADE-04, SUB-04, PROG-01–PROG-03. **Gate:** accepted C-ID/C-PUB/C-SUB. Manual grading can precede AI availability.

Darryl approves/releases the exact revision; edits invalidate approval and corrections create reviewed release history. Keith joins annotations to immutable submitted answers and records exact evidence/release versions for progress reuse. Bounds, criterion coverage and source/excerpt validation apply to manual and AI-derived releasable content. AI success never equals approval or release.

| Scenario | WHEN                                                               | Producer guarantee / consumer acceptance                                                                |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| REL-01   | AI/manual draft is not released                                    | Student endpoints/status contain no draft scores/text; progress cannot select it                        |
| REL-02   | Edit follows approval or release request is stale                  | Invalidate approval/conflict; previous public release remains authoritative                             |
| REL-03   | Exact reviewed revision is explicitly released                     | Versioned public projection; feedback uses exact source and progress only released evidence             |
| REL-04   | Regeneration/correction follows release                            | Preserve edits/history; correction needs fresh approval/release; replaced evidence makes progress stale |
| REL-05   | Annotation range/excerpt/criterion mismatches pinned source/rubric | Releasable-content validation fails; no fabricated/shifted annotation shown                             |
| REL-06   | Release is withdrawn under a future agreed policy                  | Atomic visibility/currentness update; cached progress becomes stale before redisplay                    |

**Darryl accepted P4; Keith consumer agreement pending:** withdrawing current clears currentReleaseVersion; withdrawing historical v1 preserves current v2. Both increment availabilityRevision; neither restores older content. Withdrawn student/history reads return a tombstone; private audit history remains authorized. Currentness gates cached reads. The synthetic protocol model tests these outcomes; actual lifecycle atomicity/audit storage remain unimplemented.

## C-AI: shared AI gateway

Runtime candidate: [aiRequestSchema/gatewayOutcomeSchema/assessmentDraftSchema/validateAssessmentDraft/usageSchema/publicAIStatusSchema/projectAIStatus](../src/shared/instructor-contracts/ai.ts). Typed action/evidence input, registered domain validators, tagged unavailable usage and a distinct safe public status projection. Generic progress validation is not supplied; Keith provides it. No provider/admission/request persistence implementation is added.

**Producer/writer:** Darryl. **Consumers/reviewer:** Darryl's assessment and Keith's progress services. **Requirements:** AI-01–AI-05, GRADE-01–02, PROG-01–03. **Gate:** accepted C-ID and action-specific immutable evidence contracts.

AI requests are server-only typed references: exactly one immutable submission for assessment, or 1..20 unique numeric release versions for progress. Actual context assembly, quotas, transport and persisted request lifecycle are not implemented by this candidate package.

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

**Open:** real supported model/capabilities, quotas/cross-environment scope, tokenizer/reservation bounds, host deadlines and cache retention. Runtime request/result shapes are now candidates; Keith must supply the real progress validator. Synthetic adapters establish neither provider access nor real admission behavior.

## Handoff and acceptance gate

Before dependent edits, producer and consumer jointly accept relevant fields, policies and scenarios in a bounded OpenSpec feature change. Record both review outcomes, active writer, exact producer revision, public/internal runtime schemas, safe errors and synthetic payloads using the [handoff template](handoffs/TEMPLATE.md). Consumer records its revision and executed integration/security checks against that producer. Fixture-only consumption remains integration pending; type checks alone are insufficient.

Order: Darryl's authentication/session producer plus Keith's course/object authorization → publication → submission → manual assessment/release → feedback/progress consumption. Gateway can use isolated synthetic adapters after interface agreement, but consumers/activation wait for auth, evidence and provider gates. Serialize migration numbering and shared DTO/API wiring by active producer. Compose reviewed SH-AUTH/SH-ID revisions and consume Keith's submission handoff; absent handoffs block dependent integration rather than justify substitute services.

## Candidate policy and evidence status

All five runtime candidates are Darryl-approved; Keith agreement remains pending. [Primitives](../src/shared/instructor-contracts/schema.ts) enforce strict unknown-input parsing, safe errors, UTC round trips, finite 0..1000 numeric point scores with two decimals/no rounding, integer-hundredth arithmetic, UTF-8 bounds and bounded value-free issues. Source canonicalizes CRLF/CR to LF once at ingress, preserves other whitespace/final LF, hashes canonical UTF-8 with lowercase SHA-256, and uses exact one-based inclusive split-line excerpts. Consumers reject noncanonical snapshots rather than rewriting evidence.

P1 accepted by Darryl: stable logical identities and fresh assignment/question/rubric versions on every publication, including deadline/private-reference edits; immediate visibility, no scheduling/unpublish/delete in this slice; old snapshots/deadlines remain pinned. P2 covers precision/comparison keys, P3 source/lines, P4 reviewed correction/withdrawal. These owner decisions await consumer agreement; no publication/release feature is implemented.

[Cross-linked fixtures](fixtures/instructor-contracts/graph.ts), [synthetic adapters/protocol model](fixtures/instructor-contracts/adapters.ts), [reusable factory suites](contracts/instructor-contracts.ts) and [contract/security tests](../src/shared/instructor-contracts/contracts.test.ts) establish schema/synthetic conformance only. Actual authentication, submission persistence, release transactions, distributed admission and provider behavior remain pending. See [evidence](evidence/instructor-development-contracts/verification.md) and [handoff](handoffs/instructor-development-contracts.md).

## Keith review packet — pending agreement

One combined packet through Darryl; no message was automatically sent. Every row is Darryl-approved on 2026-11-05; **Keith pending**. Real producer/consumer implementation revisions remain unavailable. Accept or return exact replacements before dependent runtime composition.

| ID  | Concrete decision                                                                                                                                   | Producer / consumer                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| K1  | Request-derived trusted session/course/object port; schemaVersion 1/closed shapes/safe errors; parsed roles never authorize                         | Darryl authentication/session + Keith course/object authorization; both consumers |
| K2  | Stable logical IDs, fresh immutable publish versions; deadline/reference edits republish; immediate visibility; legacy id maps to questionVersionId | Darryl publication, Keith pins work                                               |
| K3  | 0..1000 numeric point scores, two decimals/no rounding; composite question/rubric/criterion joins and comparison-key governance                     | Darryl rubric/release, Keith display/comparison                                   |
| K4  | 32 KiB UTF-8 source, LF ingress/SHA-256; preserved final LF, exact inclusive one-based excerpts                                                     | Keith submission producer, Darryl evidence consumer                               |
| K5  | Exact reviewed release, monotonic availability; withdrawal tombstones/no historical revival; recheck before cached reads                            | Darryl release/currentness, Keith progress invalidation                           |
| K6  | Typed action/evidence/validators; real configured output cap; missing usage unavailable; no generic progress success parser                         | Darryl gateway/assessment, Keith progress validation                              |

The runtime modules define candidate text/array/error bounds for review in this same packet. Real model/quota/tokenizer values, identity choice and submission transaction/deadline rules remain producer gates. Darryl can proceed independently with isolated candidate contract artifacts and pure instructor design. Actual feature implementation/composition requires approved bounded changes, joint agreement and real reviewed handoffs. Existing unimplemented API paths stay unavailable.

## Current SH-AUTH target — approved Firebase/Brevo, 2026-11-06

Darryl selected Firebase Authentication (password authority) and Brevo (instructor invitation mail), non-expiring instructor admission, email/password login and provider-backed password recovery. This supersedes earlier Google-only and SendGrid/local-KDF target statements for future work. Current implementation is in progress; historical Google evidence is not current verification. The closed SessionView is unchanged; D1 retains stable app IDs/mapping and opaque sessions, with current Firebase credential/revocation checks before protected use. No automatic legacy email linking or duplicate password/course store. Keith requireCourse remains injected; absent producer disables instructor send/list/resend/revoke and protected destinations. Keith revised-boundary review, first-instructor bootstrap, real Firebase/Brevo configuration, mail/Free capacity and composed integration remain pending. No enrollment occurs upon accepting an invitation.

## SH-AUTH native email decision — 2026-11-07

Confirmed by Darryl: replace Brevo with Firebase native password-action emails on Spark. Existing instructor-owned invitation audit/non-expiring admission, passwords, session projection and Keith course boundary remain. The local ticket+Firebase code contract and custom /auth/action handler replace generated-code mail; POST setup/confirm now requires {invite,ticket,code,password}, reset/confirm {ticket,code,password}. Old actions are invalidated by additive0005, accounts/sessions/invitations preserved. User reports credentials configured, not independently verified. Separate Firebase projects are needed for simultaneous environment-specific custom action URLs. No live delivery, composed Keith integration, manual acceptance, deployment or cross-review is claimed. Historical Brevo decisions/evidence above are superseded for future work.

## Current SH-AUTH Gmail delivery — 2026-11-07

Firebase native custom email URL rejected EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED; hosted-password UX rejected by Darryl; SMTP2GO signup unavailable. Current selection is existing personal Gmail app-password sender with fixed implicitTLS465. Firebase generates proof only, Gmail delivers direct Codewise link; all password screens remain in app. Add GMAIL_SENDER_EMAIL/GMAIL_APP_PASSWORD/AUTH_MAIL_ENABLED; existing five Firebase/origin settings unchanged. No Firebase custom action URL/additional project required. Same closed C-ID, ticket/UID/email/purpose/generation, session/revocation/CSRF and Keith course ports. Actual Gmail auth/NUS delivery/hosted CPU/background lifetime, first instructor/real Keith composition/revised review/manual acceptance pending. No deployed/accepted claim.

## Password policy follow-up — 2026-11-07

Darryl confirmed an 8-character minimum on2026-11-07 and reports changing Firebase accordingly. The intended policy is8–64 Unicode characters; maximum64 and no truncation remain. This is a documentation update: src/server/auth/firebase.ts and src/web/auth/App.tsx still enforce15, and runtime/test alignment is pending. Firebase console configuration was not independently verified in this request. Closed C-ID/session/course boundaries unchanged.

## Operator owner boundary — 2026-11-07

SHA-12 adds an exact operator-provisioned identity exception, not memberships or instructor self-promotion. Server-side owner marker+active authaccount+authadmin+immutable pinned providerUID/email/passwordAt/validSince are checked on every owner login/session, including emailVerified=true after external reset. Public SessionView remains unchanged; UI administrator flag conveys account administration only. Keith requireCourse/requireObject/destination ports remain required. User accepted fake-alias bootstrap, not a verified-email claim or Keith cross-review. Identity pin/owner-authority composition needs Keith revised-boundary review before his consumers rely on it.

Current follow-up2026-11-07:8–64 validation is now implemented in app/server as part of one-time owner bootstrap. Prior documentation-only statements about15-character runtime describe the earlier state. Real Firebase policy/provider and production verification remain separate gates. Owner administration grants no course rights.

## SH-ID ownership update — 2026-11-07

Darryl owns SH-ID: courses, memberships, object authorization and allowed workspace contexts. This supersedes earlier Keith SH-ID ownership statements. Keith retains student and submission work and cross-reviews the composed C-ID boundary; his acceptance is pending. Use one authoritative identity/course store, serialize shared schema and API edits, and consume trusted SH-AUTH sessions. Account administration grants no course membership or instructor role. Implementation and integration remain pending.
