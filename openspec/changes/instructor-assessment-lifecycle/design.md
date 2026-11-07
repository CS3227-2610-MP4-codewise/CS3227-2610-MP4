# Design

## Context

See proposal.md for outcome and exclusions. The authoritative base is reviewed main969a062, including its updated MVP/OpenSpec context, Ownership and IntegrationContracts. Darryl owns SH-AUTH and SH-ID (courses, memberships, object authorization and workspace contexts); Keith owns immutable submissions and student features and cross-reviews C-ID. Main's existing specs/configuration are unchanged by this assessment delta.

Consume the existing AssignmentService/D1Assignments, CourseAuthority and C-SUB/C-REL contracts rather than replacing them. CourseAuthority currently resolves assignment objects; assessment/submission object composition and Keith's immutable submission producer are still pending. This change supplies an isolated assessment service/workbook using injected ports and a local synthetic preview; no production activation is inferred. P1–P4 are confirmed owner policies and K1–K6 cross-review remains pending.

The assessment migration is0008 after main0007_courses. The local preview loader accepts the identical pre-rebase0007 assessment marker solely to preserve synthetic grading data; production/course migration history is unchanged. The separate authentication checkout remains untouched.

## Goals / Non-Goals

**Goals:** A persistent instructor-owned manual assessment aggregate and source workbook, with exact revision review, transactional release/correction/withdrawal, safe feedback projection and reusable consumer checks. Test with real local D1 and synthetic external producers.

**Non-Goals:** Submission ingestion/storage, course/membership or account schemas, student feedback/progress UI/cache implementation, AI generation/gateway, execution/testing of learner code, real producer composition, production routes or release work. No generic personal skill or orchestration/telemetry files in Git.

## Decisions

### 1. Approved single-writer window

Darryl is the named assessment/release producer owner. The approved brief grants exclusive writes for new src/server/instructor/assessments/, src/web/instructor/assessments/, new src/shared/instructor-contracts/assessment.ts and focused assessment tests, and the next additive assessment-only migration (currently0008; recheck actual main/migration directory immediately before creation). Reuse src/server/instructor/ports/contracts.ts and C-SUB/C-REL unchanged unless a separately agreed compatible addition is necessary. No Keith-owned writes.

Minimal opt-in package script/local preview support, workflow/assessment-preview/, new assessment conformance helpers/fixtures, this change's evidence/handoff and one logs/darryl/09-instructor-assessment-lifecycle.md are in scope. The approved migration/contract writer window is recorded in Ownership.md, and assessment status is recorded in IntegrationContracts.md. Main’s ownership updates govern; pending cross-review is not converted into acceptance. Existing publication services, shared UI primitives and production server/frontend entries remain read-only. Reviewer is read-only; no parallel edits. Any required shared interface or production wiring change outside this window returns for scope agreement.

Alternative: edit the current authentication checkout or implement Keith's missing producers. Rejected: preserves unrelated work and the agreed domain ownership.

### 2. Evidence and authorization composition

Inject IdentityCoursePort, SubmissionReadPort and PublicationReadPort plus assessment repository, clock and ID source. Every list/load/create/save/approve/release/withdraw/history/consumer read requires a trusted current session and the applicable object/course action. Writes additionally require mutation origin/session CSRF from the identity adapter. Actor/course ownership is server-derived; browser role/admin flags never authorize. Idempotency lookup/replay occurs after fresh authorization.

Assessment scope resolver reads only local aggregate identifiers/course/attempt metadata for the Darryl-owned object-authorization port; it does not load private draft/source before authorization. Creation starts from an explicitly authorized immutable attempt ID, not a substitute submissions list. Assignment discovery uses the inherited course/publication foundation; immutable-attempt discovery belongs to Keith’s submission producer; the local fixture picker is visibly synthetic only.

Use the existing publication service through an adapter calling its instructor-authorized immutable privateVersion operation and returning only its publication projection. This avoids erroneously requiring the existing student-only publicVersion authorization path for instructor grading and avoids another publication store. References never enter C-REL. SubmissionReadPort supplies the authoritative attempt; validateAttempt joins exact assignment/question/rubric IDs, LF source and SHA-256.

Persist evidence identifiers and cryptographic fingerprints of validated attempt/publication content, not copied source, submissions or question/rubric tables. Re-fetch/revalidate evidence on reads/writes and before transitions; a supposedly immutable producer returning different content fails closed. Existing observation excerpts are feedback evidence, not a second submission repository. Missing producers are unavailable/denied. Synthetic ports cannot enter src/server/index.ts. Real revocation races across services remain a composition gate; tests do not claim cross-system transactions.

### 3. Assessment aggregate and partial editing

One assessment per immutable submission attempt; aggregate holds assessment/course/attempt/publication IDs, evidence fingerprints, headRevisionId, approvedRevisionId, approval actor/time, monotonic availabilityRevision, currentReleaseVersion and maximumReleaseVersion. Initial availabilityRevision is1 and currentReleaseVersion is null. New assessment is explicit, using a scoped create request key/unique attempt constraint to avoid races.

Append-only revisions store the assessment's own criterion feedback, observations, editor/time, parent revision and manual provenance. Saved private drafts allow null scores and empty explanations. Structural bounds, finite supplied numeric points, two-decimal precision, exact pinned criterion identities and valid observation source ranges/excerpts apply even to partial saves. No browser-supplied rubric bounds/comparison keys override the publication. Approval uses existing complete C-REL feedback validation, including every criterion exactly once and nonempty explanations. No AI output or provenance is fabricated.

Every changed save compares expected headRevisionId, appends a new immutable revision and clears approval atomically. Existing released content remains current. Save failure/conflict leaves browser input unacknowledged; no forced overwrite. Explicit correction starts a new editable revision from selected prior content without mutating historical revisions. No-op save does not create an implicit approved correction or a fresh release eligibility shortcut; renewed approval is explicit.

Alternative: require complete scoring before every save. Rejected because interrupted grading must remain recoverable privately.

### 4. Approval, releases and idempotency

Approval requires complete valid feedback and expected head/availability; record exact revision/reviewer/time in private audit, without exposing anything publicly. Release is a separate command using existing releaseCommandSchema (assessmentId, assessmentRevisionId, expectedAvailabilityRevision, idempotencyKey). assertApproval guards actual head/approved revision and availability. Recheck current authorization/evidence immediately before persistence.

D1 owns atomic compare-and-swap transitions: immutable release content, next release number, current pointer, incremented availability, audit and scoped request receipt commit together or roll back together. Use conditional mutation gates/constraints in D1 batch, not read-then-write process locks. Tests exercise concurrent replicas, stale CAS, child failure and rollback. One release per assessment revision prevents accidental new-key duplicate publication; withdrawn feedback requires a fresh edited revision and approval. Keep immutable stored content; derive released/superseded state from authoritative metadata rather than rewriting snapshots.

Receipts scope to actor/course/assessment/operation/key and fingerprint the command. Identical committed requests replay after fresh authorization; changed payloads conflict. Replay never resurrects withdrawn feedback: a formerly released receipt whose version is now withdrawn returns STALE_EVIDENCE through the unchanged Release return type, with tombstone accessible through the read boundary. Matching withdrawal receipts replay their recorded tombstones. Fresh currentness is obtained separately; an old receipt is not proof of current availability.

### 5. P4 withdrawals and safe reads

Use existing withdrawalCommandSchema: assigned instructor, exact version, expected availability, idempotency key and bounded private reason. Atomic withdrawal records actor/time/reason, permanent withdrawal marker, tombstone, receipt and availability increment. Withdrawing current clears the pointer; withdrawing historical preserves a newer current. Never automatically promote an older release or delete audit history. A later new reviewed release has a higher version.

Provide instructor-private revision/release/audit reads separately from a ReleaseReadPort producer adapter. Student-safe getAuthorized checks the student's own attempt/current permission, returns allowlisted released/superseded feedback or a content-free tombstone, never private audit/reasons/references/drafts. Currentness returns existing C-REL metadata, including all exact withdrawn versions. Read content/currentness consistently from D1 and reject stale tokens/revoked authority before response; do not reuse process-cached last-known-good content. Consumer cache invalidation/display remains Keith-owned. No endpoint can retract bytes already delivered; document the existing read-time freshness contract honestly.

### 6. Warm workbook UI

Follow docs/ui/design.md warm-workbook-v1, including its concise-copy refinement. Reuse existing tokens/Brand/icons/primitives without shared component edits. Desktop question/rubric and source/work panels use the established approximately40/60 split; narrow layouts stack. Header identifies assignment publication, attempt/time and assessment revision. Read-only source is selectable/monospaced and logically numbered; no student working-copy view. Multi-question Previous/Next stays in the same attempt and preserves local grading input (UI-05 additionally applies).

Primary work is manual rubric scoring/explanations and an equivalent keyboard-operable observation list with labelled line-range/criterion/explanation controls. Exact excerpts are taken from pinned source; no dragging-only selection. Marked-line and list triggers retain focus and announce the compact proportional-text note. Wrapping never changes logical line numbers; unavailable evidence never moves to another source.

Concise distinct states: Draft, Unsaved, Saving, Saved, Conflict, Approved, Released, Correction, Superseded and Withdrawn. Approval and Release are separate visible actions; withdrawal requires a deliberate version/reason confirmation. History is explicitly read-only. Show pending/empty/denied/expired/unavailable/failed states, disable duplicate pending commands, preserve recoverable edits in memory and protect navigation; no learner content persisted to shared-browser localStorage. Epoch/revision guards prevent stale reads/save responses from overwriting another context or claiming newer input saved. No execution or AI claims.

Verify light/dark,320px and actual200% zoom, keyboard/44px targets/focus/reduced motion and observation announcements. Complete workflow/templates/ui-review.md with real evidence, not assumed compliance. No intentional design departure is proposed.

### 7. Resource, security and verification boundaries

Apply existing32KiB canonical UTF-8 source per answer,20 questions,50 criteria/question, shared text/array/JSON bounds and bounded HTTP bodies; scores use integer-hundredth totals and reject rounding. Persist aggregate revision JSON within D1 row bounds, avoid per-criterion unbounded transaction statements and paginate history. Do not log source, excerpts, feedback payloads, credentials or raw prompts. No new external dependency/AI provider is needed. Local preview is a separate loopback-only entry with synthetic identity/course/submission labels and isolated persistent D1 assessment/publication state, never remote data.

After implementation use one independent read-only quality reviewer, with requirement IDs, exact base/delta, interfaces and test evidence. Benefit: independent judgment of CAS/approval/withdrawal privacy and asynchronous UI races. Main implements and runs actual tests; reviewer checks do not imply executed tests. Reuse that reviewer for repairs; no agent-per-stage or parallel file writing. Planning needs no extra agent.

Tests must use real local D1 for aggregate atomicity/persistence and synthetic external ports for isolated contract cases. Add reusable lifecycle factory checks rather than presenting a synthetic protocol model as a real producer. Run npm run check plus targeted authorization, precision/source, race/idempotency/rollback, safe projection and controller/UI checks. Do not mark real integrations or manual checks passed from schema/screenshot tests.

## Risks / Trade-offs

- Submission producer/assessment-aware authorization composition and joint cross-review pending → injected contracts and clearly synthetic preview only; real composition stays blocked/pending.
- Large manual feedback and history → shared bounded payloads, compact revision persistence and paginated history; no copied submissions.
- Authorization/provider changes during async work → reauthorize/revalidate before writes/replay/reads; real producer guarantees must be independently reviewed.
- Release/withdrawal races → D1 CAS plus atomic receipts/audit/currentness, concurrency and injected failure tests.
- Two reviewer-controlled states can confuse users → concise separate approval/release actions, exact revision/history labels and preserved corrections.
- Currentness cannot retract delivered bytes → enforce fresh reads and document Keith's cache responsibility.

## Migration Plan

After approval recheck migration numbering/writer window and add one assessment-only migration with no destructive changes to existing tables. Apply only to isolated local test/preview D1 in this iteration. Production remains unchanged until a later reviewed SH-ID/SH-SUB integration and release authorization through the existing staging/production workflow. Preserve immutable data on rollback; do not delete/rewrite release or audit history. No ad hoc cloud migration/deployment.

## Acceptance and pending decisions

Darryl implementation/window approval is confirmed. P2/P3/P4 remain confirmed owner policies; this design records the approved isolated implementation. K1–K6 (especially source/precision/currentness and revised auth boundary) require Keith cross-review before real runtime composition; do not silently treat prior general approval as detailed Keith review. No new consumer-impacting contract policy is proposed. Deployment, real submission/authorization integration, student cache behavior and manual UI acceptance remain independent gates.
