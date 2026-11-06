# Instructor assignment authoring and publication design

## Context

See proposal.md for scope and the new instructor-assignments spec for IAS-01–IAS-07. Current base is main `7e3e729`; the resumed branch had no unique commits and only an existing OpenSpec scaffold. No tracked application edits preceded this plan.

Readiness and the contract package have recorded manual acceptance. The C-PUB parser/projection and P1–P3 owner policies are merged and Darryl-approved; Keith's detailed K1–K6 agreement and real C-ID producer remain pending. No real identity/course/submission handoff exists. The user explicitly authorizes injected synthetic identity/course adapters for this isolated instructor slice. That permits local development, not deployed access or an integration-complete claim.

UI reference: docs/ui/design.md, `warm-workbook-v1`, and docs/ui/components.md. Reuse existing semantic tokens, page geometry, Action, StatusMessage and QuestionNavigation. UI-01/UI-07/UI-08 apply directly; UI-04/UI-05 apply only to authoring revision/history/navigation analogues. Do not complete their student attempt/submission or instructor assessment-review scenarios from this work.

## Manual-review refinement — dedicated authoring page

Darryl requested on2026-11-06 that New assignment navigate to a page dedicated to creation rather than expanding beneath the list. Use separate list/editor documents in the same guarded local HTML composition: list without a query; editor with opaque `?assignment=<id>`. New waits for the acknowledged create result before navigating; failed/ambiguous create stays on the list and retains its scoped retry key. Open navigates to the exact saved draft. Every editor page reload performs the same server-side object/course authorization; the URL grants no authority.

The editor omits assignment rows and list actions, retains the warm-workbook form/review/history, focuses its heading and provides Back to assignments. Native beforeunload guards unsaved changes for Back, browser history, reload and close. Saved navigation proceeds normally; BFCache list restoration refreshes summaries. A denied editor shows a neutral heading and hides protected fields. This refines the bounded screen flow without changing warm-workbook-v1 visual identity, shared routes or authentication scope.

## Goals / Non-Goals

Manual-review UX cleanup (Darryl,2026-11-06; baseline committed62da9f2): keep warm-workbook-v1 while organizing the editor around Assignment details, Questions, and an explicit final review. Save draft and Review & publish remain in one persistent action bar. Draft recovery/reordering, instructor reference code and version history use native disclosures; history retry remains discoverable for empty/error cases. Routine UI hides storage revisions and calls the comparison key a criterion Name, descriptor Assessment guidance, source Starter code and deadline Due date (Singapore time). Existing payloads/permissions/version semantics remain authoritative. New criterion forms start at an editable minimum0 with an empty maximum; no scoring policy changes. Published versions use selectable read-only content instead of disabled edit fields. Errors name the question/criterion and action needed, not raw schema paths. This is an explicit user-requested refinement of the same instructor slice, not a visual-system departure or new shared-service increment.

**Goals:** one usable local-D1-backed create/save/reopen/edit/review/publish workflow; durable private drafts; atomic immutable snapshots; a safe C-PUB producer for Keith; version/conflict/privacy/security tests and actual UI evidence.

**Non-Goals:** identity provisioning, login/role-switch implementation, student editor/submissions/progress, assessment/AI/release, scheduling, unpublishing, destructive assignment deletion, cloud provisioning or deployment. Removing a question from an editable draft is an explicit authoring operation; it cannot delete historical published rows.

Keep authoring and publication together. They share a bounded draft aggregate, optimistic revision and explicit snapshot transition; splitting would postpone the most important durability/immutability/security checks. This is one feature PR, not the full instructor MVP.

## Decisions

### 1. Proposed exact writer window

After Darryl approves this brief, Darryl is the single active writer for:

- `src/web/instructor/assignments/`: authoring components, controller/client and feature-local token-based CSS.
- `src/server/instructor/assignments/`: domain service, repository, thin injectable HTTP handler and tests.
- New `src/shared/instructor-contracts/authoring.ts` and focused authoring tests. Reuse the existing C-PUB code unchanged wherever possible; existing legacy DTOs and Keith's contracts/services are not rewritten.
- Next additive migration `src/server/db/migrations/0002_instructor_assignments.sql`, after rechecking migration numbering immediately before creation. Darryl owns publication tables/repositories; no identity/course/membership/submission tables are created.
- `workflow/instructor-preview/`, its local HTML entry, synthetic fixtures and integration helpers. Production Worker/index/frontend entries, root Vite/Wrangler deployment config and CI/release workflows stay unchanged.
- Minimal `package.json`/lockfile edits for an explicit Miniflare development dependency and an opt-in preview command, if required. Reuse the installed compatible dependency version; no production dependency/framework/font addition.
- Existing ownership/integration/decision docs where needed, this OpenSpec change, one `logs/darryl/04-instructor-assignment-publication.md`, evidence, handoff and a completed copy of workflow/templates/ui-review.md under this change's evidence directory.

One independent reviewer is read-only. All other active writer windows remain separate. This proposed window expands beyond the earlier contract-only assignment and must be confirmed before implementation; it grants no write ownership of Keith's services or real identity schema.

### 2. Domain and transport boundaries

Construct the service with required IdentityCoursePort, AssignmentRepository, clock and ID factory. Missing identity fails closed. Every create/list/load/save/publish/publication read/retry requires a trusted session and current course/object permission. For object operations, resolve authoritative assignment/publication scope using metadata-only lookup, never request-supplied course or owner. The injected object authorizer uses this resolver; private draft/reference payloads are read only after permission succeeds. State-changing operations validate origin before writes. Browser role/actor/course-owner fields cannot grant authority or enter storage.

Creation checks course membership before allocating/storing a draft. A course/actor-scoped create request key returns its original assignment on a retry instead of duplicating it. Object scope for existing drafts/publications comes from stored metadata. Denials and membership revocation apply before idempotency replay or private receipt lookup. Safe errors use the existing BoundaryError/ContractError conventions and request IDs; SQL/provider details and private source values never appear in errors/logs.

Implement transport as an exported factory receiving these dependencies. Do not register it in `src/server/index.ts`. Illustrative composition-local operations:

| Operation | Request boundary | Response / authorization |
| --- | --- | --- |
| Create/list drafts | course ID plus create key, or bounded list cursor | Instructor-only summaries/draft, trusted course check |
| Get draft | assignment ID | Instructor-only complete draft and revision |
| Save draft | assignment ID, expectedRevision, bounded authoring payload | Acknowledged stored revision/time; 409 on stale revision |
| Publish | assignment ID, expectedRevision, idempotencyKey | Same committed publication for identical retry; 409 changed key payload or stale draft |
| List/open instructor publications | assignment/version ID | Immutable public content plus separately scoped private reference snapshot |
| Read public publication | immutable assignmentVersionId | Authorized course member; existing C-PUB allowlist only |

The handoff will specify exact method/route/request/error names from implementation. These are inactive transport boundaries, not authorization to expose public placeholders. Keith consumes the publication service/read port rather than receiving a new student-feature implementation.

### 3. Draft schema and bounded incomplete saves

An instructor draft is an assignment aggregate: assignment/course identity, server revision/times, title, nullable deadline and ordered questions. Each question retains logical questionId/rubricId, title/instructions, Python language, starterCode, privateReference and ordered logical criteria (criterionId, comparisonKey, descriptor, minimumScore, maximumScore).

Use a separate closed runtime authoring schema. Save permits empty titles/instructions/comparison keys/descriptors, zero questions/criteria and null score/deadline fields within structural/resource bounds. Finite non-null scores still follow the approved two-decimal 0..1000 point primitive; malformed values and unsupported language are rejected. Publication requires complete content, at least one question/criterion, unique criterion IDs/keys, valid bounds, valid future deadline and the existing strict C-PUB schema.

Apply existing limits: up to 20 questions, 50 criteria per question, 32 KiB canonical UTF-8 per source field, existing text bounds and a 1 MiB aggregate/request limit including private content. Save canonicalizes starter/reference source once (CRLF/CR→LF), preserving other whitespace and terminal LF. Empty private reference is permitted. No code is executed.

Draft saves use atomic compare-and-update on assignment/course/revision, returning the new stored revision only after persistence. The repository must report a stale zero-row update as conflict, not success. Source and metadata belong to the same saved aggregate; never acknowledge only part of a question/rubric/reference update.

Deadline input/output is explicitly labelled Asia/Singapore (UTC+08:00) in the UI and converted to strict UTC timestamps for persistence/contracts; tests cover round-trip conversion. Incomplete deadlines can be saved as null. New publication requires deadline later than its server publication time; historical reads do not reject an earlier version merely because its deadline has passed.

### 4. Persistence and immutable publication transaction

Use normalized instructor-owned tables, with names finalized in migration:

| Table | Responsibility |
| --- | --- |
| instructor_assignment_drafts | Assignment ID, opaque course ID, mutable revision, complete private draft JSON, created/updated metadata, scoped create key |
| instructor_assignment_publications | Immutable assignmentVersionId, parent assignment/course, publication number, source draft revision, server actor/time, scoped publication key and fingerprint |
| instructor_question_versions | Immutable questionVersionId, logical questionId, parent assignment version/order, public question fields, private reference snapshot |
| instructor_rubric_versions | Immutable rubricVersionId, logical rubricId, exact questionVersionId |
| instructor_criterion_versions | Ordered immutable criterion values keyed by rubricVersionId and logical criterionId |

Course and actor IDs are opaque external references validated by the injected identity adapter. Do not create substitute users/courses/memberships. Future real foreign-key/provisioning alignment belongs in the reviewed C-ID producer integration; this migration must not invent Keith's schema. Submission/assessment tables are untouched.

Publication uses the exact loaded, acknowledged draft revision. Generate fresh assignment/question/rubric version IDs for every new publication, preserving logical IDs/criterion comparison meaning. Source-only, private-reference-only, order-only and deadline-only edits all produce new versions; old public/private snapshots never change. Private references remain in instructor-only repository projections.

The root publication insert has a database guard (for example a BEFORE INSERT trigger) that aborts if the parent assignment/course/revision no longer matches. Do not rely only on INSERT SELECT affecting zero rows; that can silently succeed. Record the publication receipt and snapshot in the same atomic D1 batch. Verify the root receipt/count as well as child coverage. A stale guard or any constraint/child failure rolls back the complete batch, including the receipt.

Use a small fixed number of prepared bulk INSERT statements with JSON expansion (root, question, rubric, criterion sets), rather than one database call per criterion. The maximum supported 20×50 short-criterion fixture must persist atomically within configured aggregate bounds; oversized text still fails safely. This avoids an unbounded statement count without claiming measured cloud CPU/quota suitability. Validate actual migration/JSON/foreign-key/trigger behavior against local D1, not only an in-memory fake.

Add primary/foreign/unique constraints for ordering, version IDs, logical criteria and actor/course/assignment/key receipt scope. Immutable snapshot tables reject UPDATE/DELETE, including private reference mutation; corrections are new publications. Draft edits remain confined to the mutable aggregate. SQL is parameterized; public reads select only public columns and pass through the existing explicit projection/parser. Instructor private-version reads use a separate authorized method/DTO.

Idempotency fingerprint binds actor/course/assignment/exact expected saved revision (and any publish-affecting command fields), not generated version IDs. Same scoped key/fingerprint returns the original version after authorization, including after the deadline passes or the draft is later edited. Reusing the key with another revision conflicts. Concurrent same-key inserts must resolve to one committed version set; a losing unique-key path rereads only after authorization and verifies the fingerprint. Other repository failures remain safe failures, not guessed idempotent success. Different deliberate publication keys may create distinct version sets; UI pending/retry behavior prevents accidental duplicate operations.

Cloudflare documents D1 batch rollback when a statement fails: [D1Database.batch](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch). Use local testing support as documented in [Miniflare](https://developers.cloudflare.com/workers/testing/miniflare/); neither emulation nor passing tests proves a cloud deployment. The exact imported version/compatibility and test outcomes will be recorded, not assumed from the existing transitive installation.

### 5. Guarded local composition, real integration pending

Use an opt-in development entry under workflow, with a dedicated Vite config/HTML entry and persistent local Miniflare D1. Bind only 127.0.0.1. Production frontend build remains the normal index-only build; the deployed Worker imports no local handler, synthetic identity adapter or preview code. No remote D1 binding, cloud credential or deployment command belongs in this harness.

The visible local page is labelled “Synthetic instructor development · local data”. The server injects a fixed fictional instructor/course fixture. Browser roles, principal headers, course-owner fields or URL flags cannot change that fixture. This is not a login implementation or proof of real authentication.

The local preview page/bootstrap may establish an opaque, random process-local fixture session in an HttpOnly, SameSite=Strict cookie. All development feature requests require that fixture capability through the injected session adapter, exact allowed Host, and origin validation for mutations. Reject disallowed/missing mutation Origin, forwarded-host/client-principal attempts, missing/invalid sessions and non-loopback exposure. Do not enable permissive CORS or accept a browser role as a substitute. Tests must prove denial before private reads/writes. This capability is synthetic, local-only and never logged/committed or carried into production composition.

Use a separate ignored local D1 persistence directory so reopening the browser or restarting the preview can recover saved instructor drafts/publications. The same domain/repository code is exercised by the UI and local-D1 tests; do not present a browser-memory mock as the persistence implementation. Synthetic account/course fixtures are injected in memory and have no duplicate domain tables.

Authentication, provider selection, real session/logout/CSRF integration, K1–K6 agreement and Keith's consumer integration remain explicitly pending. A future separately reviewed composition connects the real adapter/authorized routes. Until then production feature API paths remain safe JSON 404s. No fake role switch or sign-in UI is introduced.

### 6. Instructor UI and asynchronous state

Implement the bounded screens: plain assignment rows with explicit Create/Open; editable Draft workbook; assignment review and separate publication confirmation; read-only Published version/history. Reuse the warm workbook surfaces/geometry and semantic tokens. Feature-local form CSS uses those tokens with explicit input borders/focus; do not replace the theme, fixed root font sizing, shared chrome or public foundation screen.

The question pane carries ordered question context and navigation. The work pane contains labelled title/instructions/source/reference/rubric controls. Starter/reference fields are monospaced; other interface text stays proportional, with restrained serif headings. Clearly label private references “Instructor only”. No student view, submitted-attempt review, grading or AI controls are invented.

Keep the whole assignment edit model centrally, including inactive questions, rubrics and private references. Previous/Next follows saved/current authoring order, retains local edits, announces position and focuses the destination heading. The final Next becomes Review assignment and never saves/publishes/submits by itself. Question addition/removal/reordering is explicit and bounded; history remains immutable.

Save is explicit. Capture assignment ID, expected server revision and client edit generation in each request. If newer edits exist when acknowledgement arrives, advance only the acknowledged base revision and leave newer local contents marked Unsaved. Ignore responses for an unrelated selected assignment. Conflict keeps local data and offers deliberate reload/reconciliation; it never silently overwrites it. Navigation to another assignment or reload with unsaved data requires an explicit save/retain/discard decision. No private source is placed in cross-session localStorage or logs.

Review identifies the exact saved revision and all question/rubric validation results. Unsaved or pending edits block publication until saved and reviewed again. A separate confirmation sends that acknowledged revision and a retained retry key. Pending actions prevent duplicate submission; network failure retains the command key for an explicit retry. Success shows the returned committed publication/version, not an assumed optimistic publication. Switching Draft/Published never turns a published source/reference/rubric into an editable object.

Required states: initial loading/empty list/empty questions, unsaved/saving/saved, validation errors, stale conflict, failed request/network loss, denied/expired fixture, publish review/pending/failure/success and historical immutable view. Success uses the shared success treatment only for the exact acknowledgement. No fake AI/save or code-execution claim. Session loss/denial must stop mutations and hide protected display appropriately; real identity recovery is unverified until integration.

Verify 320/768/1024/1440 widths, light/dark, keyboard/focus/reading order, meaningful live messages, 44px essential targets, reduced motion, browser text preferences and 200% zoom. Code can have a labelled local scroll region; no page-wide overflow. If native zoom or any matrix entry cannot be tested, record it unverified with the closest check, not passed. Complete the UI review template with actual screenshots/state/contrast evidence. Sign-in/role switch/source observations and student flows are not applicable here or explicitly unverified integration, not completed UI-02/03/06 requirements.

### 7. Focused verification and Keith handoff

| Area | Required evidence |
| --- | --- |
| Authoring schema/service | Bounded incomplete saves; exact reopen/source/reference/rubric order; normalization; strict unknown fields and no execution |
| Authorization | Missing/forged/revoked/foreign-course identities; origin failures; denied operations call no private repository methods; retry authorization precedes receipt/payload access |
| Local D1 | Apply actual migration locally; restart/reopen persistence; stale save/publish conflicts; concurrent saves/identical publish keys; changed-payload key conflicts; mid-batch rollback; immutable UPDATE/DELETE refusal; supported maximum cardinality and aggregate limit |
| Contract/privacy | Exact existing C-PUB parser/allowlist; public query/serialization excludes references and private metadata; historical public/private snapshots unchanged; logical IDs vs new version IDs |
| UI/controller | Preserve inactive-question edits; late acknowledgement and assignment-switch races; explicit conflict recovery; review/confirm exact saved revision; no navigation-triggered publish; pending/retry/empty/denied/error states |
| Build isolation | Normal build excludes preview HTML/synthetic adapters; production API entry unchanged and feature paths stay 404 |
| UI review | Actual warm-workbook-v1/UI-01/04/05/07/08 evidence, screenshots and tested keyboard/responsive/appearance/zoom combinations with limitations |

Main agent implements and runs meaningful checks, including npm run check. One read-only reviewer independently examines functional/security/UI boundaries, then focused repairs return to the same reviewer. Planning review already identified the expanded write window, zero-row transaction trap, harness isolation, maximum limits and UI acknowledgement/reopen gates; none is claimed implemented yet.

Handoff records exact C-PUB schema/module reference and producer commit or working-tree revision; authorized service/HTTP and object-scope adapter seams; draft vs private/public snapshot DTOs; migration number and compatibility; cross-linked synthetic create/save/publish/read payloads; actual local-D1/security/UI outcomes and reviewer returns; Keith's consumer/contract acceptance and real authentication integration pending. Do not claim anonymous production availability or successful cloud integration from the local demo.

## Risks / Trade-offs

- Local synthetic session mistaken for real sign-in → explicit development label, isolated guarded composition, no deployed import, pending integration recorded.
- Incomplete drafts blocked by strict publication validation → separate bounded authoring parser and deliberate publish validator.
- Draft race or partial publication → revision guard that aborts, atomic D1 batch/receipt and actual local-D1 race/failure tests.
- Excessive normalized-write statement count → fixed-count bulk snapshot inserts, aggregate limits and maximum-fixture verification; cloud capacity remains unmeasured.
- Private references leak through a student DTO → separate authorized repository projections/public column selection plus existing allowlist and negative tests.
- UI private-source loss or false save → central edit state, generation-bound acknowledgements and explicit recovery/navigation.
- Shared migration/interface conflict → named Darryl window, recheck numbering and consume Keith's future producer rather than duplicate it.

## Migration Plan

Additive instructor-only schema; test first on isolated local D1. Do not execute staging/production migrations or deploy in this iteration. Preserve existing metadata/health behavior and schema version expectations. Future release must use reviewed Actions staging/production flow with compatible schema and real auth gates. Record application rollback separately from schema recovery; no destructive down-migration is authorized.

## Deferred integration decisions

Keith's real identity/session/provider choice, object-scope producer handshake, detailed K1–K6 agreement and consumer integration can be completed later because this slice uses explicit injected seams and no deployed routes. They remain gates before real data or feature exposure. They do not authorize alternative storage or guessed authentication. The exact isolated artifact/migration/harness writer window above is the approval sought now.

## Planning checkpoint — 2026-11-06

- Main agent performed analysis and OpenSpec drafting; no application, test, migration, dependency, shared UI or routing file was edited. The existing matching branch/scaffold was preserved and fast-forwarded to reviewed main without discarding unique work.
- One actual independent read-only reviewer `/root/publication_review` (available model metadata `gpt-6.1-sol`, no override) inspected current contracts/ownership/UI rules and all four planning artifacts. Initial findings informed explicit authorization ordering, harness guards, transaction root abort/receipt checks, bounded bulk persistence and UI acknowledgement/reopen cases. Final planning review accepted the brief with no actionable issues. No runtime implementation or UI screenshot was independently reviewed; the reviewer ran no tests.
- `npm run check` passed: strict validation of all five changes, TypeScript, ESLint, 95 existing Vitest cases plus four Node workflow/artifact cases, and Vite build. These are baseline/contract/foundation checks, not publication-feature tests. Planned local-D1, authoring, security and UI cases remain unexecuted. All implementation tasks remain unchecked.
- `git diff --check` passed. Four planning documents were inspected for local Markdown links (none present); external D1/Miniflare citations support the proposed persistence approach, not a deployment claim. No production/provider call or migration execution occurred.
- External usage checkpoint generated `2026-11-05T17:08:35.999Z` (2026-11-06 01:08:35 Singapore). Main record `turn-2aa74e90a221505c31ec23a5` is incomplete/provisional with `turn_not_observed_complete`. Available completed attributable reviewer records are `turn-21b62c292d628eca8574720e` and `turn-d96304dde9da9df52e5aab74`, source `per_response_usage`. Global recorder warnings were empty; later calls/final response are outside the snapshot. No numeric total/efficiency claim or unrelated-agent attribution. Detailed telemetry and personal orchestration stay outside the repository.
- Darryl's feature-brief/expanded writer-window approval remains pending. Earlier readiness/contract acceptance does not approve this implementation. No commit, push, merge, deploy or archive is performed.
