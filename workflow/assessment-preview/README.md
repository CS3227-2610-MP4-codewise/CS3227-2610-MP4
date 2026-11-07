# Instructor assessment producer and isolated workbook

Darryl owns this assessment/release implementation. Keith owns submissions, course/object authorization and all student UI/progress/cache behavior. Requirements: GRADE-02–04, CON-05, IAL-01–09; warm-workbook-v1 UI-01/04/05/06/07/08. K1–K6 consumer agreement and real producer integration remain pending.

## Run locally

From this iteration worktree, install the locked dependencies if necessary, then run:

    npm run dev:assessment

Open http://127.0.0.1:5177/workflow/assessment-preview/index.html. This is explicitly synthetic: fixed instructor/course/submitted attempts, no real account login, student storage, email or AI. The published assignment is created through the existing AssignmentService/D1Assignments; the synthetic attempt pins that exact publication. Assessment/publication state persists under ignored .wrangler/assessment-preview; external submission fixtures are server-owned in memory and immutable for the preview. Do not use real learner source or credentials.

Only loopback127.0.0.1:5177 is accepted. Forwarding/role/authentication override headers are rejected. A random server token is issued as an HttpOnly SameSite=Strict fixture cookie and required for requests; writes additionally need matching Origin and X-CSRF-Token. Mixed unrelated localhost cookies are permitted; duplicate preview-cookie names are denied. There is no fixture/default fallback in the deployed Worker or production browser entry.

    npx vite build --config workflow/assessment-preview/vite.config.ts

builds only the opt-in preview. It does not deploy or activate assessment routes. The regular npm run build remains the application build.

## Injected producer boundaries

Construct AssessmentService(repository, identityCoursePort, submissionReadPort, publicationReadPort, clock?, nextId?). Use AssessmentRepository with the one authoritative application D1 binding in a later approved integration. Missing identity denies session access; missing immutable submission/publication producers returns unavailable. No new membership, identity or submission table exists.

publicationAdapter(existingAssignmentService, trustedRequest) uses its instructor-authorized privateVersion read and returns only publication. It does not require the student-read-only publicVersion path, create another publication store or expose private references. Every operation reauthorizes session/object/course; writes require mutation-origin/CSRF enforcement by the injected identity adapter. Metadata-only repository.scope lets the real authorizer resolve assessment scope without private feedback reads. No browser role, account-admin badge or request actor grants instructor access.

Persisted assessment evidence is a SHA256 pair of the validated immutable attempt and publication, not source storage. Instructor reads/writes re-fetch and validate C-SUB/C-PUB and compare both digests; consumer reads parse and compare the attempt digest without reading instructor references. Hash mismatches fail closed. Exact question/rubric/criterion and source-line joins reuse C-SUB/C-REL. Real external producers must honor their immutability/current authorization guarantees; local transactions do not prove cross-service revocation atomicity.

## Guarded transport, inactive outside local composition

assessmentHandler(service) is an injected thin handler. ASSESSMENT_API is /__assessment-preview/api; it is not registered in src/server/index.ts. Responses are no-store with value-free safe errors. Request bodies are bounded to1MiB.

| Method/path below the prefix   | Body / response                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| POST /assessments              | {attemptId,requestKey} → workspace; idempotent creation scoped to actor/course/key and one assessment per attempt |
| GET /assessments/:id           | workspace; optional revisionId for immutable private history, cursor for older revision summaries                 |
| PUT /assessments/:id           | {expectedRevisionId,feedback} → acknowledged current workspace                                                    |
| POST /assessments/:id/approve  | {expectedRevisionId,expectedAvailabilityRevision} → approved workspace                                            |
| POST /assessments/:id/correct  | {expectedRevisionId,sourceRevisionId} → new unapproved draft copied from authorized history                       |
| POST /assessments/:id/release  | existing C-REL release command → allowlisted Release                                                              |
| POST /assessments/:id/withdraw | existing C-REL withdrawal command → content-free Withdrawn tombstone                                              |
| GET /assessments/:id/audit     | authorized private paginated actor/action/revision/time/reason metadata; never student fields                     |

Workspace contains head, selected revision, paginated revision summaries, recent release summaries, exact public publication and submitted attempt. Only the selected revision loads complete grading content; history does not duplicate up to50 full feedback payloads. Source stays read only. Local IDs and timestamps are displayed under version details.

Feedback is {criteria,annotations}. Each draft criterion contains questionVersionId,rubricVersionId,criterionId,score:number|null,explanation:string. All expected criteria remain represented; null scores and empty explanations can be privately saved. Non-null scores are finite0..1000, at most two decimals, within pinned rubric bounds; no rounding. Complete approval/release requires every score and meaningful explanation. Server derives rubric bounds/comparison keys, not the browser. Annotation fields are the existing C-REL answer/question/rubric/criterion/range/excerpt/explanation shape; partial drafts may omit only annotation explanation text. Invalid joins/excerpts reject the entire save.

Source uses LF split lines, one-based inclusive ranges, preserved whitespace and terminal empty line; annotation excerpt is exactly lines.slice(startLine-1,endLine).join('\n'). Nothing executes submitted code.

## State and transaction guarantees

Changed saves append immutable manual revisions and clear approval. No-op saves do not create release eligibility. Approval records exact revision/reviewer/time separately from explicit release. Corrections create new drafts; the existing release stays current until another reviewed revision is released. A released assessment revision cannot be published again using another key. Renewed feedback after withdrawal needs a new revision and approval.

Release and withdrawal use existing C-REL commands/precision/P4 policies unchanged. D1 compare-and-swap gates commit head/visibility, immutable content, audit and scoped receipt in one batch. Stale CAS or duplicate released revision conflicts; unexpected database failures are unavailable rather than falsely labelled stale edits. Child failure rolls everything back. Request replay always reauthorizes, fingerprints exact commands and never resurrects withdrawn content. Matching committed release retries return their release with current state; withdrawn release receipts return STALE_EVIDENCE. Matching withdrawals replay recorded tombstones without another availability increment.

Withdrawing current clears currentReleaseVersion; historical withdrawal preserves a newer current. Both advance availabilityRevision, record the exact version once and never revive older feedback. Public/history reads of withdrawn versions are tombstones without scores, observations, source, private reason or reviewer metadata. Private audit/revision access remains instructor-authorized. Already delivered bytes cannot be recalled.

## Keith handoff and reusable checks

AssessmentService.consumer(trustedRequest) returns the existing ReleaseReadPort. Its methods bind principal to the request session, require student-read object/course authority and the student's own exact attempt, verify immutable evidence, and recheck authorization/currentness before returning public fields. It creates no student route or progress feature. Keith must recheck currentnessToken plus membership before reusing cached feedback/progress; no last-known-good fallback after withdrawal. Draft/no-release reads are absent/NOT_FOUND.

- public-fixtures.ts exports existing C-REL graph-based first release, correction, superseded content, historical/current withdrawal and currentness cases. public-feedback.json is the same synthetic payload set for non-TypeScript consumers.
- conformance.ts exports verifyAssessmentProducer(driver). Supply producer prepareReviewed/correctReviewed/release/withdraw/read/currentness operations; the reusable checks verify idempotent replay, monotonic corrections, supersession, P4 tombstones and no revival. Local tests exercise the real D1 lifecycle with synthetic external producers, not the earlier in-memory protocol model.
- assessment.test.ts, conformance.test.ts, transactions.test.ts and controller.test.ts cover private edits, precision/evidence/auth, concurrency/rollback, public safety and asynchronous revision guards. Their local success is not Keith's consumer execution.

Combined review packet: existing K1 request-derived auth/object ports, K2 immutable publication identities, K3 precision/comparison keys, K4 canonical immutable source and K5 release/currentness/withdrawals remain Keith-pending. K6 AI is unchanged and excluded here. See workflow/IntegrationContracts.md for the authoritative packet; do not duplicate or mark it jointly accepted. Keith supplies exact reviewed SH-ID/SH-SUB revisions and records execution against this producer before real composition.

## Manual acceptance still required

Save/reopen a partial draft; complete all criteria; add/select/update a source observation using keyboard; approve then edit and confirm approval clears; explicitly release; open history and create a correction; confirm prior release remains current until fresh approval/release; withdraw historical then current versions; inspect tombstones/currentness using the factory checks. Verify narrow320px, light/dark,200% zoom, focus/44px targets, observation announcements, unsaved observation/navigation and conflict/network recovery. See this change's UI review for actual outcomes versus unverified rows. No real producer/deployment or manual acceptance is implied.
