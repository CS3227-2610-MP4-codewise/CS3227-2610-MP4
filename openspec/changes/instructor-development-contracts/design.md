# Instructor development contracts design

## Context

See proposal.md for scope. Base e3862de includes merged readiness PR #3. Readiness acceptance is recorded in workflow/handoffs/project-readiness.md (all four manual items checked), project-readiness task 3.4 and Darryl's explicit approval/publication request. No pending readiness checklist needs to be presented again. That approval did not accept all interface fields or outstanding policies.

Only foundation source exists. C-ID/C-PUB/C-SUB/C-REL/C-AI in workflow/IntegrationContracts.md remain the authoritative draft locations; refine them in place after approval. The proposed shapes below are a review diff for those drafts, not a second operative contract document. No real identity/course/submission producer handoff exists.

## Goals / Non-Goals

**Goals:** a minimal runtime-checkable contract package, safe dependency injection, coherent synthetic graph, reusable conformance suites and one review packet that exposes every cross-owner decision.

**Non-Goals:** authoring/publication/assessment services or UI, domain persistence, migrations, identity provisioning, student features, distributed quota implementation, live provider calls, feature routing or deployment. There is no GUI change in this iteration. Parsing data never authenticates it.

## Decisions

### 1. Acceptance, ownership and edit scope

| Item | Status now | Evidence / next gate |
| --- | --- | --- |
| Readiness manual checklist | Accepted by Darryl, 2026-11-05 | Recorded checklist/task 3.4 and prior chat approval |
| Human workload split | Agreed, Keith agreement reported by Darryl | Keith: identity/course, submission and progress; Darryl: publication, release and gateway |
| Existing five contract profiles | Proposed detailed interfaces | Ownership agreement did not approve shapes/policies |
| Instructor policy resolutions P1-P4 below | Recommended owner decisions, awaiting Darryl approval of this brief | Keith must also agree to consumer-impacting representations |
| Cross-owner decisions K1-K6 below | Proposed, Keith review pending | Record actual agreement or corrections; never infer it from readiness acceptance |
| Real producer revisions and auth integration | Unavailable / pending | Exact reviewed handoffs and executed integration/security checks |

Proposed implementation writer: Darryl for new contract-only files under src/shared/instructor-contracts/, src/server/instructor/ports/, workflow/fixtures/instructor-contracts/ and workflow/contracts/; no edits to Keith's service paths. Darryl also owns the serialized editing window for the existing IntegrationContracts/PlanningDecisions documents, this change, its evidence/handoff and one logs/darryl/03-instructor-development-contracts.md. src/shared/contracts.ts, API entry, runtime environment, migrations, dependencies and CI remain untouched. No other agent writes. Obtain brief approval before opening that window; consumer integration still requires Keith's agreement.

Use five modules plus shared primitives, explicit runtime parsers and their inferred types. Do not introduce a second DTO definition for the same new shape. No validation dependency is required: small strict parsers can implement the rules with existing TypeScript/Vitest. Existing scaffold DTOs remain visibly legacy; consumers opt into schemaVersion 1, with PublishedQuestion.id explicitly mapped to questionVersionId by a tested boundary helper rather than changed globally.

### 2. Runtime-schema conventions

Every top-level serialized contract has schemaVersion: 1. Objects are closed: unknown properties fail, including injected privateReference, prompt text, roles in write payloads or provider URLs. No type coercion. Reject unsupported versions, inherited/class instances and non-finite numbers. Parsers return detached values or bounded issues { path, code }; never include rejected values/private excerpts. Unknown-field errors identify the parent path, not arbitrary attacker-controlled key text. Typed objects alone do not establish provenance.

| Primitive | Exact proposed rule |
| --- | --- |
| ID / comparisonKey / version identifier | Nonempty string, at most 128 Unicode code points; no control characters; ID strings remain opaque |
| Revision / releaseVersion / availabilityRevision | Positive safe integer; no coercion |
| UTC timestamp | Exact YYYY-MM-DDTHH:mm:ss.sssZ, real calendar time verified by UTC round-trip; published/submit/approval times server-derived |
| Score points | Finite numeric 0..1000, at most two decimal places; Number(value.toFixed(2)) must equal value; reject rather than round; negative zero rejected |
| Rubric bounds | 0 <= minimumScore < maximumScore <= 1000; award within those bounds; descriptors and comparison keys required |
| Score arithmetic | Convert validated points to integer hundredths for sums/comparisons; never float modulo or silent rounding |
| Source | Well-formed Unicode, UTF-8, at most 32768 bytes per source field; reject NUL and lone surrogates; normalize CRLF/CR to LF only at producer ingress |
| Source digest | Lowercase 64-hex SHA-256 of canonical UTF-8 bytes; verify at consumption; no trimming, tab expansion or terminal-newline rewriting |
| Text/array limits | Title 200 code points; instructions 16384 bytes; descriptor 4000 bytes; explanation 8192 bytes; 1..20 questions, 1..50 criteria per question; at most 200 annotations; total serialized contract at most 1 MiB |
| Safe errors | Code enum UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_CONTRACT, REVISION_CONFLICT, IDEMPOTENCY_CONFLICT, STALE_EVIDENCE, AI_DISABLED, RATE_LIMITED, UPSTREAM_UNAVAILABLE; bounded safe message/requestId and at most 50 path/code issues |

Scores remain wire numbers to match existing drafts; integer hundredths are internal arithmetic, not a second wire unit. Schema parsers validate shape/local semantics; relational/evidence validators additionally require authoritative pinned inputs. Byte/body limits must be enforced before parsing at any eventual HTTP boundary; this increment creates no such boundary. Text is plain data, not trusted HTML. Private payloads are never included in issue logging.

### 3. Minimal inventory and trust boundaries

All field lists below are required unless marked optional. Shared arrays preserve order. Schema names identify the existing C-* draft they extend.

| Contract | Concrete runtime shape | Relational checks / trust owner |
| --- | --- | --- |
| C-ID public | SessionView {schemaVersion,userId,expiresAt}; CourseMembershipView {schemaVersion,courseId,title,role: instructor or student} | Browser view is presentation only. The injected server session/course port is authoritative and rechecks active membership/object scope on every operation |
| C-PUB | PublishedAssignmentView {schemaVersion,assignmentId,assignmentVersionId,courseId,title,publishedAt,deadlineAt,questions[]}; question {questionId,questionVersionId,title,instructions,language: python,starterCode,rubricId,rubricVersionId,criteria[]}; criterion {criterionId,comparisonKey,descriptor,minimumScore,maximumScore} | Unique logical/version question IDs and criterion IDs/keys within each rubric; declared rubric/question join; deadline after publication; no private reference or authoring-draft fields. Retain old versions |
| C-SUB | ImmutableAttempt {schemaVersion,attemptId,assignmentVersionId,courseId,submittedByUserId,submittedAt,answers[]}; answer {submittedAnswerId,questionVersionId,rubricVersionId,draftRevision,source,sourceHash} | All and only pinned publication questions, one answer each; exact rubric links/hash; session ownership/course checked by port, not parser. Empty source allowed. No extra identity/submission database |
| C-REL content | ReleasedAssessmentView {schemaVersion,id,submissionAttemptId,assessmentRevisionId,releaseVersion,releasedAt,state: released or superseded,criteria[],annotations[]}; criterion {questionVersionId,rubricVersionId,criterionId,comparisonKey,minimumScore,maximumScore,score,explanation}; annotation {submittedAnswerId,questionVersionId,rubricVersionId,criterionId,startLine,endLine,excerpt,explanation} | Exact criterion coverage keyed by (questionVersionId,rubricVersionId,criterionId); values/bounds/comparison keys match authoritative rubric; annotation uses matching submitted answer and canonical excerpt. Even manual feedback validates fully |
| C-REL currentness | ReleaseCurrentness {schemaVersion,assessmentId,submissionAttemptId,availabilityRevision,currentReleaseVersion: positive integer or null,withdrawnReleaseVersions[],checkedAt}; WithdrawnRelease {schemaVersion,id,submissionAttemptId,releaseVersion,state: withdrawn,withdrawnAt} | Token is (assessmentId,availabilityRevision,currentReleaseVersion). Increment on correction or any visibility/withdrawal change. Tombstone contains no scores, annotations, code or private reason |
| C-AI request, internal only | Discriminated AIRequestInput: assessment-draft requires exactly one ref {kind: submission,attemptId}; progress-explanation requires 1..20 refs {kind: release,assessmentId,releaseVersion}. Both have schemaVersion,courseId,idempotencyKey,outputTokenLimit | No duplicate refs; attempt IDs are already immutable, releaseVersion is a positive safe integer. Principal is separate in server port; authorize/resolve pinned dependencies before context assembly. Server config selects model/prompt. Scope fingerprint includes actor/course/action and all resolved evidence versions |
| C-AI result, internal only | Discriminated GatewayOutcome: pending/running includes requestId/action/evidenceKey; succeeded additionally includes promptVersion/modelVersion/latencyMs/retries/usage and action-validated payload; failed/expired includes safe code/retryAfterSeconds optional and never a payload | Success requires the registered validator for that exact action and evidence. No permissive unknown payload validator; progress validator belongs to Keith. Public AIStatus is a separate closed allowlist {schemaVersion,requestId,status,safeCode optional,retryAfterSeconds optional} after authorization |

outputTokenLimit is a positive safe integer. Before any reservation/allocation/transport, admission requires it to be at most the verified configured per-action output cap; missing or invalid cap disables that action. It is not a quota promise. Evidence arrays are nonempty/bounded as above; reject duplicates by attemptId or (assessmentId,releaseVersion), cross-action ref kinds, empty/missing attempts and fractional/zero release versions. Assessment resolution loads its authorized immutable attempt and derives exact assignment/question/rubric/source-hash dependencies; progress resolution loads the specified released versions and associated own attempts. Request metadata/cache identity includes those full resolved versions plus prompt/model/settings, rather than trusting an incomplete input list. An empty progress history returns the domain insufficient-evidence outcome before requesting the gateway. No numeric release version is hidden inside an ambiguous string versionId.

Usage is {status: reported,inputTokens,outputTokens} with nonnegative safe integers or {status: unavailable}; optional counts are not fabricated and absent/unknown provider semantics select unavailable. retries is integer 0..2; latencyMs nonnegative finite; requestId/action/evidenceKey are required in every internal outcome. retryAfterSeconds is bounded nonnegative and does not override the trusted deadline. Failure codes use the safe enum. Success-only fields cannot appear in other branches.

For assessment-draft, the injected payload schema is {kind: assessment-draft,codeExecuted: false,criteria,annotations,reviewFlags[]}; criteria/annotations use the pinned C-REL element rules, and review flags are bounded nonempty plain text (at most 20 x 200 code points). The package can validate this shape without generating or storing grades. Progress success requires Keith's injected schema/semantic validator; until supplied, that action fails closed. Test doubles can exercise dispatch/rejection but cannot claim validation of real progress explanations.

A parser does not validate transaction history, session signatures, concurrency or currentness freshness by itself. Those guarantees belong to authoritative producer ports and producer integration tests. This package supplies reusable tests and explicit assumptions, not fake successful infrastructure.

### 4. Server-only adapter boundaries

The following signatures are proposed contracts, not implementations or exported browser capabilities:

```ts
interface IdentityCoursePort {
  requireSession(request: Request): Promise<TrustedPrincipal>;
  requireCourse(principal: TrustedPrincipal, courseId: string,
    action: 'instructor-write' | 'instructor-read' | 'student-read'): Promise<void>;
  requireObject(principal: TrustedPrincipal,
    target: { kind: 'assignment' | 'submission' | 'assessment' | 'ai-request'; id: string },
    action: 'read' | 'write'): Promise<{ courseId: string }>;
  requireMutationOrigin(request: Request): Promise<void>;
}
interface SubmissionReadPort {
  getAuthorized(principal: TrustedPrincipal, attemptId: string): Promise<ImmutableAttempt>;
}
interface PublicationReadPort {
  getAuthorized(principal: TrustedPrincipal, assignmentVersionId: string): Promise<PublishedAssignmentView>;
}
interface ReleaseReadPort {
  getAuthorized(principal: TrustedPrincipal, id: string, releaseVersion: number): Promise<ReleasedAssessmentView | WithdrawnRelease>;
  currentness(principal: TrustedPrincipal, id: string): Promise<ReleaseCurrentness>;
}
interface AIGatewayPort<TAction extends AIAction, TPayload> {
  request(principal: TrustedPrincipal, input: AIRequestInput<TAction>): Promise<GatewayOutcome<TAction, TPayload>>;
  readAuthorized(principal: TrustedPrincipal, requestId: string): Promise<GatewayOutcome<TAction, TPayload>>;
}
```

AIAction is the two-action union. AIRequestInput<TAction> selects the matching discriminated request branch; construction of AIGatewayPort<TAction,TPayload> requires a registered action-specific runtime validator returning that exact payload type. Both request/read reject a runtime action/evidence mismatch rather than asserting the generic type.

TrustedPrincipal has an opaque user ID and server session handle, created only by the injected session adapter; no wire parser/factory converts client JSON or a role into this capability. Its nominal type is a development aid, not a security control. Actual adapter methods validate the current session and membership each time. requireObject resolves course from the authoritative object rather than trusting a caller-supplied courseId. Consumers authorize before content repositories; adapters must not eagerly fetch private source to determine an access decision. Future repositories use authorized metadata lookups before reading payloads.

Construct consumers with explicit ports; do not install a process-global synthetic fallback or import fixture users in production composition. Synthetic factories live under workflow, return detached fixture data and configurable deny/revoke/currentness outcomes, and have no database writes. Deny/missing dependencies raise safe errors before any private read/provider call. Object reads in each port remain independently authorized even when a caller already checked course scope. Mutations call origin validation before writes; no browser role field is accepted.

Gateway test factories additionally inject authorization, provider transport, admission/reservation, request-record persistence, clock/deadline and action validator. This iteration defines these seams and their conformance assertions; it does not implement provider/persistence/quotas. Actual endpoint/model/prompt settings stay server-only. Synthetic provider calls never use network or real credentials. Failed configuration/validator/admission results cannot invoke transport.

### 5. Instructor policy resolutions proposed for approval

**P1 — Publication identity and availability (SUB-01).** Draft edits retain logical assignmentId/questionId/rubricId and logical criterionId while meaning remains the same. Every publish creates a new immutable assignmentVersionId and new questionVersionId/rubricVersionId for every included question, even unchanged ones. Prior content/IDs never mutate; private-reference edits also require a new version. Student projections omit references entirely. Publication is immediately available to authorized course members; no scheduling/unpublish/delete operation in this slice. Deadline changes require republishing and never alter an old pinned deadline. Explicitly map legacy PublishedQuestion.id to questionVersionId; add logical questionId separately. Publisher retry semantics propose the same scoped idempotency key/expected draft revision returns its existing version; changed payload conflicts. Transactional execution belongs to the future publication service, not a schema test.

**P2 — Rubrics and scores (SUB-01, GRADE-04).** Use 0..1000 point bounds/awards with at most two decimals and integer-hundredth arithmetic. No automatic rounding of user/model values. comparisonKey identifies comparable meaning; keep it only when the criterion meaning and scale remain comparable, otherwise choose a new key. Keys/criterion IDs must be unique within a rubric, not globally; release criteria therefore carry question/rubric version references. Structural validation cannot prove semantic comparability; instructor review owns it.

**P3 — Source/lines (GRADE-02, shared with C-SUB).** Producer canonicalizes once, CRLF/CR to LF, preserves all other bytes/whitespace and terminal newline, and computes lowercase SHA-256 over UTF-8. Consumer rejects a noncanonical snapshot/hash mismatch rather than rewriting evidence. Lines are canonicalSource.split('\n'); empty source is one empty line, trailing LF produces a final empty line. Annotation ranges are one-based, inclusive and bounded; excerpt is exactly lines.slice(startLine-1,endLine).join('\n'). Empty excerpt is valid only when that exact range is empty. These rules also apply to starter/private-reference source before publication, without exposing references. They require Keith's agreement before real C-SUB integration.

**P4 — Release/correction/withdrawal (GRADE-04, PROG-03).** Approval binds exact revision; edit invalidates it. Release commands identify expected assessment revision and expected availabilityRevision plus a scoped idempotency key. Retry of an already committed identical release returns that release only after current authorization; changed payload conflicts. Future producer checks command/release/currentness changes atomically. New corrections increase releaseVersion, keep prior nonwithdrawn releases as superseded history, and increment availabilityRevision. Only an assigned instructor may withdraw an exact release version with expected availabilityRevision and an audited private reason. Withdrawal hides that version's content from student reads/history, returns a tombstone, invalidates all affected evidence caches and never revives an older release. Withdrawing the current release sets currentReleaseVersion to null. Withdrawing historical v1 while v2 is current preserves currentReleaseVersion 2. Both increment availabilityRevision and add the exact withdrawn version once to the unique withdrawal list; the current version cannot also be listed as withdrawn. Repeated identical scoped withdrawal returns its recorded tombstone after authorization; a stale differing command conflicts. The currentness port returns metadata; getAuthorized returns either allowed content or the withdrawn tombstone. No currentness call substitutes a content response. Withdrawn versions remain immutable audit records and cannot be reactivated; renewed feedback requires a new reviewed release/version. Instructor audit access remains authorized and private.

Consumers recheck the currentness token and membership before returning/displaying stored progress or cached feedback; stale/missing currentness yields STALE_EVIDENCE rather than old content. No last-known-good fallback after withdrawal. This defines read-time validity; it cannot retract bytes already delivered to a browser. Actual lifecycle atomicity requires future producer integration, not fixture mutation tests. Keith owns progress invalidation implementation; Darryl only supplies the port and cases.

### 6. Cross-linked synthetic examples (proposed fixture graph)

All IDs/data are invented. All code is synthetic; no private prompt text is stored. Source hash below was independently computed from UTF-8 `print(1)\n` (9 bytes), not guessed. Internal fixture setup grants the synthetic instructor course_demo; the public role view is never used as authorization.

C-ID valid public views (separate schema values):

```json
{"schemaVersion":1,"userId":"instructor_demo","expiresAt":"2026-11-10T12:00:00.000Z"}
```
```json
{"schemaVersion":1,"courseId":"course_demo","title":"Synthetic course","role":"instructor"}
```

C-PUB valid student-safe version:

```json
{"schemaVersion":1,"assignmentId":"assignment_demo","assignmentVersionId":"assignment_v1","courseId":"course_demo","title":"Print one","publishedAt":"2026-11-05T06:00:00.000Z","deadlineAt":"2026-11-10T12:00:00.000Z","questions":[{"questionId":"question_demo","questionVersionId":"question_v1","title":"Output","instructions":"Print one.","language":"python","starterCode":"print(1)\n","rubricId":"rubric_demo","rubricVersionId":"rubric_v1","criteria":[{"criterionId":"criterion_demo","comparisonKey":"output.constant-one.v1","descriptor":"Prints one","minimumScore":0,"maximumScore":5}]}]}
```

C-SUB valid immutable evidence:

```json
{"schemaVersion":1,"attemptId":"attempt_demo","assignmentVersionId":"assignment_v1","courseId":"course_demo","submittedByUserId":"student_demo","submittedAt":"2026-11-06T06:00:00.000Z","answers":[{"submittedAnswerId":"answer_demo","questionVersionId":"question_v1","rubricVersionId":"rubric_v1","draftRevision":1,"source":"print(1)\n","sourceHash":"cc42155088fca5730758db72b2a5bca33112a941dfaa2d43098ec422ce4ea213"}]}
```

C-REL valid released content and currentness (separate schema values):

```json
{"schemaVersion":1,"id":"assessment_demo","submissionAttemptId":"attempt_demo","assessmentRevisionId":"assessment_revision_1","releaseVersion":1,"releasedAt":"2026-11-06T07:00:00.000Z","state":"released","criteria":[{"questionVersionId":"question_v1","rubricVersionId":"rubric_v1","criterionId":"criterion_demo","comparisonKey":"output.constant-one.v1","minimumScore":0,"maximumScore":5,"score":5,"explanation":"The source prints one; code was not executed."}],"annotations":[{"submittedAnswerId":"answer_demo","questionVersionId":"question_v1","rubricVersionId":"rubric_v1","criterionId":"criterion_demo","startLine":1,"endLine":1,"excerpt":"print(1)","explanation":"Static source evidence."}]}
```
```json
{"schemaVersion":1,"assessmentId":"assessment_demo","submissionAttemptId":"attempt_demo","availabilityRevision":1,"currentReleaseVersion":1,"withdrawnReleaseVersions":[],"checkedAt":"2026-11-06T07:01:00.000Z"}
```

A withdrawn fixture returns no content and currentness revision 2/currentReleaseVersion null/withdrawnReleaseVersions [1]:

```json
{"schemaVersion":1,"id":"assessment_demo","submissionAttemptId":"attempt_demo","releaseVersion":1,"state":"withdrawn","withdrawnAt":"2026-11-06T08:00:00.000Z"}
```

C-AI valid server request and pending result (separate values):

```json
{"schemaVersion":1,"action":"assessment-draft","courseId":"course_demo","idempotencyKey":"synthetic_ai_1","evidenceRefs":[{"kind":"submission","attemptId":"attempt_demo"}],"outputTokenLimit":256}
```
```json
{"schemaVersion":1,"requestId":"ai_request_demo","action":"assessment-draft","evidenceKey":"synthetic_scope_fingerprint_v1","status":"pending"}
```

256 is an illustrative fixture allowance, not a verified provider limit; admission must compare it against real configuration later. Scope fingerprint fixture strings are labels, not production hash claims. Succeeded fixtures will use synthetic model/prompt version labels and usage {status: unavailable}, never claim a provider ran.

Minimum invalid fixture mutations: ID add client role to SessionView/deny membership; PUB add privateReference/duplicate criterion key; SUB wrong rubric/hash/foreign question; REL overprecision score/missing or duplicate composite criterion/mismatched excerpt/withdrawn with content; AI zero/fractional output allowance/empty or duplicate evidence/wrong-action ref/missing attempt/zero or fractional releaseVersion/succeeded without registered validator/failed with payload/public status containing promptVersion. Additional corpus covers NaN/Infinity (in-memory input), invalid dates/versions/limits, CRLF/CR/Unicode/empty/trailing-LF sources and mutation of returned fixture objects. Expected safe error codes/paths accompany each example; no private value echoes.

### 7. Reusable tests, evidence and independent work

Build reusable factory-based producer suites and consumer suites, not tests that call the same parser on both sides and claim integration. For C-PUB/C-REL producer projection tests start with a richer private instructor record and assert exact public keys/serialized absence of private source; separate consumers parse the projection and compare against pinned evidence. For C-ID/C-SUB, factories supply authorized/denied/revoked scenarios and independent expected values. Production factories are not installed here.

| Suite | Acceptance / evidence |
| --- | --- |
| primitives | Exact score/date/size/source/hash/line boundary behavior; no coercion or mutation; bounded safe issues |
| identity consumer | Absent/forged/revoked/wrong-course cases deny before private reader/provider spy; origin validation before mutations |
| publication producer/consumer | Safe projection; rubric validation; explicit legacy ID mapping; v2 fixture leaves v1 and pinned submission unchanged |
| submission consumer | Full pinned question coverage, revision/hash and rubric joins; wrong-scope denial; reject altered canonical evidence |
| release producer/consumer | Composite criterion coverage, bounds/excerpts, approval revision and stale availability rejection, idempotent release protocol, correction history, current versus historical withdrawal, contradictory current/withdrawn metadata and tombstone shape |
| currentness consumer | Change/withdrawal between selection and read; no stale cache result; no automatic historical fallback; deny revoked session |
| gateway envelope/dispatch | No configured action validator/admission/auth means no transport; domain-invalid result fails wholly; scope/action mismatch; omitted usage stays unavailable; public status strips internal fields |
| compatibility handoff | Same adapter factories/suites reusable against Keith's reviewed revision, with producer/consumer SHAs and actual executed results |

Synthetic suites model lifecycle outcomes to test consumer reactions. They do not establish database transactions, actual release history, multi-replica reservations, real session/CSRF signatures or provider behavior. Record each outcome as schema conformance, synthetic adapter conformance or real integration. The latter is pending until producer revisions exist. Do not change MVP feature checkboxes for this package.

After brief approval Darryl can independently implement the contract parsers, instructor-only policy validators/projection helpers, fixture graph and injected consumer harnesses; pure UI/domain design may consume those locally in later approved increments. Publication persistence/UI and manual assessment lifecycle remain separate features. No actual course/identity/submission database is created. Deployment composition continues rejecting unimplemented feature routes. Auth integration and gateway activation remain pending.

### 8. One concise review packet for Keith

This table is the combined packet; do not send it automatically. Accept/revise each row together and record both owners' outcomes. No row is approved solely because the readiness package was approved.

| ID | Proposed decision | Producer / consumer impact | Current acceptance |
| --- | --- | --- | --- |
| K1 | Trusted request-derived session + current course/object ports; public roles never authorize; closed schemaVersion 1 and safe errors | Keith supplies real C-ID adapter; Darryl injects it, no parallel identity store | Darryl approved; Keith pending |
| K2 | Stable logical IDs, new question/rubric versions on every publish; immediate availability; deadline/reference edits republish; legacy id means questionVersionId | Darryl owns C-PUB; Keith pins old work and accepts new envelope | Darryl P1 approved; Keith pending |
| K3 | 0..1000 numeric points, two decimals, no rounding; composite question/rubric/criterion references | Darryl owns rubric/release validation; Keith renders and compares consistent units/keys | Darryl P2 approved; Keith pending |
| K4 | LF-at-ingress, SHA-256 UTF-8, 32 KiB/source; preserve terminal LF; inclusive one-based split lines and exact excerpts | Keith owns immutable C-SUB; Darryl validates incoming snapshots/annotations | Darryl P3 approved; Keith pending |
| K5 | Monotonic release/availability versions, reviewed corrections, withdrawal tombstone, no old-release revival; read-time currentness check | Darryl owns release lifecycle; Keith invalidates progress/cache and handles history | Darryl P4 approved; Keith pending |
| K6 | Discriminated action-specific evidence/validators, configured output caps and exact numeric release versions; missing usage unavailable; no generic progress-success parser | Darryl owns gateway/assessment validation; Keith supplies progress validator/evidence rules | Darryl approved; Keith pending |

Keith also confirms the proposed shape/resource bounds in section 2 or returns exact replacements. Identity provider choice, real submission transaction/deadline policy, quota/model/tokenizer values and real integration evidence remain his/shared producer gates, not hidden defaults. They do not block this isolated contract-artifact package, but block affected runtime composition. Each final handoff records contract version, policy row outcomes, exact producer/consumer revisions (currently unavailable), fixtures, suite commands/results and auth-integration-pending status.

## Risks / Trade-offs

- Two contract sources diverge -> update C-* drafts in place after approval and link code/fixtures/tests there; this design remains the proposed review diff.
- Shape-valid principal mistaken for authority -> server-only injected session/object checks, no raw JSON capability constructor or deployed fixture fallback.
- Float/line/identity ambiguity corrupts feedback -> exact precision/UTF-8/line rules and composite references with adversarial examples.
- Synthetic lifecycle tests mistaken for implemented storage/currentness -> evidence tiers and producer integration gates; no real services/atomicity claims.
- Contract package grows into app features -> no persistence/UI/routes/provider network/migration work; action schema adapters only.

## Migration Plan

No database migration or deployment. After approval, introduce the opt-in schemaVersion 1 contract package without changing existing DTOs or public endpoints. Refine existing drafts with per-row status and link the module/fixture/test paths. Existing scaffold-to-new-contract mapping is explicit and tested. Future producer composition requires a new reviewed feature change, exact handoffs and joint consumer acceptance. No archive/commit/push/merge/deploy without applicable instruction.

## Planning verification and resource checkpoint

Planning checks will validate OpenSpec, local document links, source/spec consistency and synthetic hash/line calculation. Required npm run check will be attempted for this worktree; isolated dependency availability and outcomes must be reported honestly. Runtime schemas and conformance suites are not yet implemented, so their planned cases are not reported as passing tests. A read-only independent reviewer challenges the proposed boundaries and packet; detailed usage remains in the configured external recorder, with worktree coverage limitations disclosed rather than changing collection settings.


### Actual planning checkpoint — 2026-11-05

- npm run check passed in this isolated worktree: strict validation of all three changes, TypeScript, ESLint, six existing application tests, four workflow/artifact tests and Vite build. Existing installed dependencies were reused through an ignored node_modules junction; no dependency/lockfile edit or install was required.
- Repaired spec/design ambiguity was strictly revalidated. Nine synthetic JSON examples parse, and the canonical source hash was verified using SHA-256; these are planning-example checks, not runtime contract suite results. No application source, migration, API route or existing C-* draft was edited. The original publication scaffold remains untouched in the original checkout.
- Read-only independent reviewer /root/contracts_review (model metadata gpt-6.1-sol) first identified missing composite release references, strict auth/schema separation, policy detail and conformance cases. Final review returned concrete AI bound/action-correlation and withdrawal/currentness mismatches; main agent repaired them. Focused re-review accepted the brief with no remaining blocking findings. Reviewer ran no tests and did not approve owner/team policies on their behalf. Main agent ran the checks above. No recursive delegation or parallel editing.
- External usage checkpoint: 2026-11-05 13:30:40 Singapore time, per_response_usage. Current main record turn-8c287230f6ce83b1de1ff8c9 is incomplete/provisional; available completed attributable reviewer records include turn-d0614351c2618213bef053b1 and turn-f192f00c1ef699991bbded3f. Calls/final response and any reviewer events after the snapshot are not covered. Both sessions are tagged to the configured original repository; tool execution used this worktree. Collector scope was not changed and no separate worktree coverage or numeric usage/efficiency total is claimed. Interrupted publication record turn-cda356bc0ae2a293abab148e remains distinct from this iteration.
- Project logging requires one member summary for this substantial planning request; logs/darryl/03-instructor-development-contracts.md records facts only. Shared contract/decision docs and runtime code remain gated on brief approval. No commit, push, merge, deploy or archive performed for this iteration.

### Implementation approval — 2026-11-05

Darryl approved the brief, P1–P4 and exact contract-artifact editing window. Earlier planning checkpoint text is historical. The operative C-* candidate links and single K1–K6 packet are now refined in workflow/IntegrationContracts.md. Keith agreement remains pending. Release/withdrawal command schemas make the approved revision/key/currentness protocol concrete; synthetic protocol models are not production storage or proof of atomic transactions.
