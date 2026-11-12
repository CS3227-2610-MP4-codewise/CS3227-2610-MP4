# Shared integration contracts

## Current decision status — Keith confirmation, 2026-11-09

Keith directly confirmed the decisions presented in this session: C-ID identity/authorization ownership and consumer boundaries, course onboarding, dashboard contexts, and K1–K6 below. This records contract/design acceptance, not source-review clearance, executed consumer checks, manual UI acceptance, deployment or live AI readiness. Earlier dated statements that Keith's policy agreement is pending are historical and superseded only for these decisions; implementation and verification gaps remain open.

- Darryl produces SH-AUTH and SH-ID, including authentication, authoritative courses/memberships, object authorization and allowed workspace contexts. Keith consumes these services and owns student dashboards, submissions, feedback display and progress. One authoritative store; browser roles, role switching and account-admin status never grant course/object authority.
- Course onboarding uses explicit invited course roles and one stable account, retains existing-user passwords, requires verified new-account setup and preserves both roles. Accepted-invitation retries cannot restore revoked memberships. Provider-only identity recovery requires proof and explicit password choice, never implicit reset or email-only account merging.
- Keith accepts the documented role-filtered `/api/courses/contexts` shape, pagination and failure/currentness behaviour, including single/dual roles, empty courses, stale responses, revoked access and dirty-work preservation. `8f93f51c1f6a36dd64908bd550e90b68e9957af1` is the recorded dashboard producer reference, not a newly verified source revision. Compare it with the selected implementation and record exact producer/consumer revisions before integration.
- K1–K6 are accepted as contract decisions. Deadline equality, attempt-count limits, save/submit transaction rules and canonical retry fingerprints still need concrete SH-SUB proposals; confirmation does not invent those values. Real model/output/quotas, hosted connectivity and the progress validator remain outstanding.

Requirements: AUTH-01–03, COU-01–07, SUB-01–04, GRADE-01–04, PROG-01–03, AI-01–05 and UI-03 (`warm-workbook-v1`). No implementation task is completed by this confirmation. Next owner: Keith for revision-pinned producer review and the student consumer; Darryl remains the shared-service writer. No runtime/schema/API write window is opened by this documentation update.

The dated sections below retain historical decisions and evidence. Later provider/ownership/implementation updates supersede their earlier baselines; current authentication uses Firebase proof/password authority with Gmail delivery, rather than the historical Google/Brevo targets.

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

Darryl supplies trusted subject/account mapping, authenticated session validation, expiry/logout/session revocation and mutation-origin/CSRF guards. Darryl resolves current courses/memberships and object permissions, including membership revocation and allowed workspace contexts; Keith consumes the resulting trusted authorization boundary. Keep one authoritative identity/course store and the existing server-only injected port; no competing per-role session store, client role authority or duplicate C-ID contract. Both owners agree failure/revocation semantics and exact producer revisions before composing protected routes.

| Scenario | WHEN                                                               | Producer guarantee / consumer acceptance                                             |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| ID-01    | Session is absent, expired or logged out                           | 401 without data; both role UIs request sign-in and safely retain unsaved local text |
| ID-02    | Client forges instructor role or requests an unassigned course     | Trusted membership controls access; UI state cannot unlock privileged operations     |
| ID-03    | Cookie mutation fails origin/CSRF validation                       | No write/provider call; consumer shows no success state                              |
| ID-04    | Membership is revoked after AI admission, before result/cache read | Current membership rejects read; neither role displays private cached content        |
| ID-05    | Student guesses another student's attempt                          | Denied before content/context assembly; no code, feedback or AI status leaks         |

**Open:** Darryl proposes provider, sign-in/callback/logout, cookie/session/CSRF settings, registration method and trusted account-provisioning/demo process in SH-AUTH; Keith reviews. Darryl produces course/membership lifecycle, object scope and allowed workspace contexts in SH-ID; Keith cross-reviews. Public registration and instructor self-provisioning are not approved. Accepted SH-AUTH and SH-ID handoffs are both required for real C-ID integration.

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

**Keith producer gates — reported accepted by Darryl 2026-11-10 (student-drafts):** Keith reported that Darryl approved all shared student-drafts decisions, so these gates are recorded as accepted on that report (Darryl's direct review is not claimed): (1) deadline and clock: server receipt time from an injected clock, accepted only if `receivedAt < deadlineAt`, no late attempts, committed-attempt replay returns the original even after the deadline; (2) unlimited attempts, latest committed attempt per student/assignment is assessed; (3) browser-generated UUID idempotency key scoped to (user, logical assignment), fingerprint = SHA-256 of canonical JSON of publication ID plus answers sorted by `questionVersionId` as `[questionVersionId, draftRevision, sourceHash]`, authorization before any replay; (4) compare-and-swap draft saves and one atomic guarded D1 submit batch copying source from stored drafts; (5) K4 source rules; (6) Python with one source per question; (7) retention until course archive + 90 days, with the course-archive event a Darryl SH-ID dependency and real learner data blocked until implementable; `SubmissionCatalog.list` returns one row per student, their latest attempt. No spec changes were requested.

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

**Darryl accepted P4; Keith accepted as consumer 2026-11-12 (see below):** withdrawing current clears currentReleaseVersion; withdrawing historical v1 preserves current v2. Both increment availabilityRevision; neither restores older content. Withdrawn student/history reads return a tombstone; private audit history remains authorized. Currentness gates cached reads. The synthetic protocol model tests these outcomes; actual lifecycle atomicity/audit storage remain unimplemented.

**Student lookup method — reported agreed by Darryl 2026-11-12 (student-released-feedback):** Keith reported that Darryl agreed to an additive `ReleaseReadPort.attemptReleases(principal, attemptIds)` (1..50 unique own attempts; per attempt `{assessmentId, currentness, releaseVersions}` or `null`; all-or-nothing authorization through the existing consumer `authorize`; versions include superseded and withdrawn). Keith writes it and its `studentHandler` composition in the window recorded in [Ownership.md](Ownership.md); Darryl reviews before composition. Release projections are unchanged. Darryl's direct review is not claimed. On 2026-11-12 Keith reported Darryl's go-ahead for Keith to also write the student read ports the consumer needs (student object authorization for `assessment`/`submission` and a student `SubmissionReadPort`), recorded in the Ownership.md extension; review remains pending.

**Keith consumer acceptance of K5/P4 — 2026-11-12 ([student-released-feedback](../openspec/changes/student-released-feedback/proposal.md) Decision 2):** Keith directly accepts P4 and K5 as consumer. Students see the current release and, read-only, earlier superseded releases labelled as replaced; withdrawn versions show only the tombstone (version, withdrawal time); withdrawing current never shows an older release as current. Every display is gated by `assertCurrentRelease` and a currentness re-check after async work. The student consumer keeps no client or server cache of feedback. Implementation and conformance against the real producer remain pending.

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

Order: Darryl's authentication/session and course/object authorization producers → publication → submission → manual assessment/release → feedback/progress consumption. Gateway can use isolated synthetic adapters after interface agreement, but consumers/activation wait for auth, evidence and provider gates. Serialize migration numbering and shared DTO/API wiring by active producer. Compose reviewed SH-AUTH/SH-ID revisions and consume Keith's submission handoff; absent handoffs block dependent integration rather than justify substitute services.

## Candidate policy and evidence status

All five runtime candidates are Darryl-approved; Keith agreement remains pending. [Primitives](../src/shared/instructor-contracts/schema.ts) enforce strict unknown-input parsing, safe errors, UTC round trips, finite 0..1000 numeric point scores with two decimals/no rounding, integer-hundredth arithmetic, UTF-8 bounds and bounded value-free issues. Source canonicalizes CRLF/CR to LF once at ingress, preserves other whitespace/final LF, hashes canonical UTF-8 with lowercase SHA-256, and uses exact one-based inclusive split-line excerpts. Consumers reject noncanonical snapshots rather than rewriting evidence.

P1 accepted by Darryl: stable logical identities and fresh assignment/question/rubric versions on every publication, including deadline/private-reference edits; immediate visibility, no scheduling/unpublish/delete in this slice; old snapshots/deadlines remain pinned. P2 covers precision/comparison keys, P3 source/lines, P4 reviewed correction/withdrawal. These owner decisions await consumer agreement; no publication/release feature is implemented.

[Cross-linked fixtures](fixtures/instructor-contracts/graph.ts), [synthetic adapters/protocol model](fixtures/instructor-contracts/adapters.ts), [reusable factory suites](contracts/instructor-contracts.ts) and [contract/security tests](../src/shared/instructor-contracts/contracts.test.ts) establish schema/synthetic conformance only. Actual authentication, submission persistence, release transactions, distributed admission and provider behavior remain pending. See [evidence](evidence/instructor-development-contracts/verification.md) and [handoff](handoffs/instructor-development-contracts.md).

<a id="keith-review-packet--pending-agreement"></a>

## Keith review packet — decisions accepted 2026-11-09

Every row below was Darryl-approved on 2026-11-05 and directly confirmed by Keith on 2026-11-09. Decision status: **K1–K6 accepted**. Source-review clearance and real consumer integration remain pending; record exact producer/consumer revisions and executed checks separately. No message was sent to another person.

| ID  | Concrete decision                                                                                                                                   | Producer / consumer                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| K1  | Request-derived trusted session/course/object port; schemaVersion 1/closed shapes/safe errors; parsed roles never authorize                         | Darryl authentication/session/course/object authorization; both consumers |
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

## Instructor assessment producer — 2026-11-07, isolated implementation

Darryl's approved instructor-assessment-lifecycle implements manual revision/approval/release/correction/P4 withdrawal in assessment-only D1 tables, consuming existing C-SUB/C-REL and injected identity/submission/publication ports. No shared DTO policy is changed and no production assessment route is composed. [Exact local producer, payloads and reusable checks](assessment-preview/README.md); [handoff](handoffs/instructor-assessment-lifecycle.md). Existing K1–K6 remain Keith-pending; synthetic producer tests do not establish his acceptance or real integration. Darryl supplies the reviewed assessment/object-authority composition; Keith supplies SH-SUB and consumer evidence before activation. Main969a062 adds Darryl-owned course/assignment authority, which does not yet authorize assessment/submission objects. No parallel course implementation is added here.

## Connected continuation — IAL-10, 2026-11-07

Darryl approved connecting the existing application, with Darryl as the sole shared-file writer. Real local Firebase identity/D1 sessions/course authority/publication compose with assessment metadata authorization. Native loopback-only sample submission injection is separately explicit; normal staging/production has no submission producer and remains unavailable. Existing K decisions and Keith's SH-SUB/consumer acceptance remain pending. No submission or membership storage is duplicated. Same-D1 assessment writes reuse D1Assignments.guarded; revocation tests cover the mutation gap. See [connected setup and boundaries](connected-preview/README.md). This supersedes the earlier statement that no production entry routes are registered: protected assessment routes are registered, but cannot expose data without the required trusted producer and authorization.

## Course-onboarding target and one review packet — 2026-11-07

First-increment implementation and exact compatibility packet: [C-ID/SHA packet](evidence/course-onboarding/instructor-course-creation/contract-packet.md), [local verification and hosted preparation](evidence/course-onboarding/instructor-course-creation/verification.md), and [handoff](handoffs/instructor-course-creation.md). Baseline local main4f3264be60fabb58ede92b2e15984592016530bf. Darryl reports Keith approved the packet in the implementation prompt; direct Keith review/consumer revision is unavailable. Local implementation includes additive0009 and the atomic course command/UI. Local checks pass; manual UI acceptance and hosted course verification remain pending.

**Confirmed by Darryl; technical packet approval reported by Darryl as received from Keith:** first-admin account is the exact operator-pinned instructor@u.nus.edu identity with explicit course-creator eligibility; current instructors can create their own courses and invite Student or Instructor into courses they teach. New recipients choose passwords; admitted registered recipients use existing passwords. Combined authenticated join commits the invited role membership into the same account; prior invite alone is not registration. Preserve both roles and return trusted account-level available dashboards with per-role course filtering and UI-03 switch. No admin grant by invite/email/toggle. Earlier admission-only/no-membership acceptance and operator-only provisioning statements are superseded for this target only. First course-creation code is local; invitation, acceptance, dual-role switch and Keith student integration remain unimplemented.

**Named writers/consumers:** Darryl produces SH-AUTH/SH-ID/course creation/role invitations/acceptance/allowed context/shared switch and instructor consumer; Keith reviews C-ID and supplies the student dashboard/submission consumers. Reuse C-ID, SessionView, IdentityCoursePort and the one authoritative store; do not duplicate those drafts or expand the browser's authority.

### Dashboard contexts producer — review pending

The local producer revision is `8f93f51c1f6a36dd64908bd550e90b68e9957af1`, based on `1200323e925ec40f23ca5447ba888f9e941fda77`. Review and acceptance are pending; Keith's consumer revision and agreement remain unavailable. The existing closed SessionView is unchanged. No deployment or student dashboard is implied.

`GET /api/courses/contexts` requires the current authenticated session and returns no-store JSON. Its closed schema is `{ "workspaces": [{ "role": "student" | "instructor", "courses": [{ "id": string, "name": string }], "nextCursor": string | null }] }`. Roles are unique and omitted when not allowed; each page contains at most 100 courses, ordered by ID. Use `studentAfter` and/or `instructorAfter` to request the next role-specific page with its returned cursor. The cursor is an opaque course ID and never grants authority. Only active same-role memberships appear. First-admin creator eligibility allows an Instructor entry with no courses. Example: `{ "workspaces": [{ "role": "student", "courses": [{ "id": "course-a", "name": "Studio" }], "nextCursor": null }, { "role": "instructor", "courses": [{ "id": "course-b", "name": "Seminar" }], "nextCursor": null }] }`.

Instructor consumers collecting multiple pages use `POST /api/courses/contexts/verify` with same-origin/CSRF protection and `{ "ids": ["course-a", "course-b"] }` (1–5,000 distinct IDs); success returns `{ "courses": [{ "id": "course-a", "name": "Studio" }, { "id": "course-b", "name": "Seminar" }] }` in ID order, and any missing current instructor membership fails the entire request. The instructor consumer fails closed above this bound; larger accounts need a separately designed snapshot strategy. Recheck authority for each protected object independently. An existing browser selection, context response or cursor is never an authorization grant. Consumers should discard older asynchronous responses, preserve dirty work, and treat expired sessions, network failure and revoked courses as unavailable.

Reusable consumer acceptance checks for Keith: same-course and different-course dual roles remain distinct; a first-admin with zero courses retains Instructor; a student-only account has no enabling switch; forged roles/cursors do not add authority; removed role/course and expired session hide inaccessible content; traverse more than 100 memberships; ignore stale responses, prevent duplicate pending actions, preserve dirty work on canceled navigation, and verify pointer/Space, announced state and heading focus. Run `npx vitest run workflow/course/creation.test.ts` for producer D1 checks, then exercise these checks against Keith's actual consumer and record both exact revisions. Synthetic producer checks do not complete task 4.3.

**Single pending technical agreement packet (COU-01–07, AUTH-01–03, UI-03):** (1) explicit creator eligibility and existing first-admin reconciliation; (2) course/recipient/target-role invitation DTO and backward compatibility for pending student invitations; (3) combined password/setup-or-sign-in and membership acceptance with one account, same-D1 final guards/receipts and provider partial-failure recovery; (4) multiple role/currentness/revocation and already-accepted receipts that cannot resurrect membership; (5) allowed-workspace/role-filtered course projection plus switch/unsaved/error states, preserving closed session identity; (6) exact producer revisions, synthetic payloads and reusable producer/consumer checks, then actual Keith student integration. DTO/API/migration details remain proposals until reviewed; this plan records no joint approval. Detailed design/tests/tasks: [course-onboarding](../openspec/changes/course-onboarding/design.md). No new competing C contract is created.

## Course-role invitation implementation — local work in progress

Darryl's local producer extends the existing managed invitation DTO with immutable `targetRole` (`student` or `instructor`; null is a legacy admission-only row). Course instructors operate on invitations within their current course. Recipient preview and combined password/join use the existing trusted identity provider and D1 account/session/membership store; the closed SessionView is unchanged. The atomic acceptance guard rechecks session, recipient, current inviter and course; accepted receipts cannot restore revoked membership. Synthetic request/response and recovery limitations are documented in [course-role invitation evidence](evidence/course-onboarding/course-role-invitations/verification.md). Student dashboard/switch integration belongs to the later Keith consumer increment; no consumer acceptance or live delivery is claimed. Producer commits: server 4847301 and UI/preview c1047a8. Uncertain provider reset remains fail-closed and lacks a reviewed operational reconciliation path; this is not full partial-failure recovery.

## Invitation grouping and provider recovery adjustment — 2026-11-08

Darryl requested one invitation entry per course/email, with the explicit current Student and Instructor role set accepted atomically using either current link. Existing audit rows and link tokens remain; each role's current inviter authority and the displayed role set are guarded before membership writes. Same pending role is reused; a grouped revoke invalidates the pending group. Delivery status is conservative. For a Firebase identity without a local account, mailbox proof and an explicit existing-password or create/reset choice precede UID binding. The choice is shown to all recipients without a local account because provider-only history is not safely distinguishable across environments. No email-only identity merge or implicit existing-password reset is permitted. [Design, security and synthetic verification](evidence/course-onboarding/invitation-identity-recovery/verification.md). Keith consumer acceptance, live delivery, staged migration and human UI acceptance remain pending.

## Course People roster — local implementation, 2026-11-08

Instructor People listing projects active same-course memberships and current pending invitations from the existing D1 store; revoked invitations and inactive members are omitted. Active and pending roles are shown separately. Removing a person deactivates all of their active memberships and revokes pending invitations for that course within a same-D1 current-instructor guard; it does not delete accounts or alter other courses. Listing/removal is instructor-only, with a current session/account/course check. This local increment is uncommitted and not yet independently reviewed or manually accepted; [verification](evidence/course-onboarding/course-people/verification.md), [handoff](handoffs/course-people.md). Keith's composed-boundary review remains pending.

## C-AI gateway candidate — 2026-11-08

Darryl's `secure-ai-gateway` candidate supplies `SecureAIGateway` implementing the existing `AIGatewayPort`, fixed-origin transport, separate server-only instructor/student credentials and one shared D1 quota policy. Consumers must inject current course/object/evidence authorization and action-domain validation on every resolution; the assessment resolver uses `validateAssessmentDraft`, while Keith owns progress evidence selection and validation. The reusable [progress consumer checks](contracts/progress-gateway-consumer.ts) and [handoff](handoffs/secure-ai-gateway.md) are candidate interfaces: Keith has not executed or accepted them. No production route or live provider is enabled, and no actual model, token bound, quota, cross-environment coordination or hosted connectivity has been verified. Unknown calls retain shared concurrency debt rather than assuming provider cancellation. Fixed-window admission is not evidence of compliance with an unverified rolling provider quota.

### Student assignment listing — design §2–§4 reported agreed 2026-11-09

Keith reported that Darryl agreed the student-assignment-dashboard design §2–§4 as written:

- **Listing:** `GET /api/student/courses/:courseId/assignments?cursor=` returns `{ schemaVersion: 1, course: {id,name}, items: [{assignmentId, assignmentVersionId, title, publishedAt, deadlineAt}], nextCursor }`. It returns the latest publication per assignment, ordered by `(deadlineAt, assignmentId)`, at most 50 per page, with an opaque cursor of at most 512 characters.
- **Overview:** `GET /api/student/publications/:assignmentVersionId` returns the existing C-PUB Publication.
- **Authority:** both reads require explicit current Student membership at disclosure. A course where the account is only an instructor gets a non-enumerating unavailable response.

Keith accepted the 1.1 producer review at HEAD `3a7e5e4` (dashboard producer `8f93f51`; later SH-AUTH `5e0ed6b`). See `workflow/evidence/student-assignment-dashboard/apply-gates.md`. Composed consumer acceptance is still pending.

Update 2026-11-09: Keith reported that Darryl approved the student listing and overview producer additions in draft PR #25 (`2b2da64`). This is treated as Darryl's approval at Keith's instruction; GitHub shows no submitted review. Composed consumer acceptance (task 5.1) is still pending.
