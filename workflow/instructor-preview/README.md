# Instructor authoring/publication — local composition

Requirements: SUB-01, AUTH-02, IAS-01–IAS-07. UI: warm-workbook-v1, UI-01/04/05/07/08. Darryl owns this producer; Keith's real identity/course and student consumers remain pending.

Run `npm run dev:instructor`, then open `http://127.0.0.1:5175/workflow/instructor-preview/index.html`. The dedicated configuration binds only 127.0.0.1:5175 and uses persistent **local** D1 at ignored `.wrangler/instructor-preview`. No remote binding/account is used. Restart preserves drafts/publications and rotates the random process-only fixture cookie. Opening the local HTML bootstraps that HttpOnly SameSite=Strict capability for a fixed server-owned synthetic instructor/course. This is a development capability, not real login. Nothing selects browser roles. Do not deploy this configuration.

The API requires the fixture cookie, exact Host, and exact Origin for mutations; foreign origins, forwarded identity/host headers and browser identity fields cannot grant access. No permissive CORS. A real producer must replace the injected IdentityCoursePort; absent injection fails closed. The production Worker, frontend entry, Vite/Wrangler deployment configuration and release workflow are unchanged. No production feature routes are registered.

## Dedicated authoring pages

The list lives at the base HTML URL. New assignment waits for the persisted create acknowledgement, then navigates to `index.html?assignment=<id>`. Open uses that same dedicated editor page; reload reauthorizes/loads the exact saved draft. Back to assignments returns to the list. Browser beforeunload protects unsaved work on navigation; save first to leave without a warning. These are local preview page URLs, not new production feature routes. The editor contains only its assignment workflow, not the list below/above it.

## Exact transport

The UX cleanup after baseline62da9f2 keeps details and questions in the main flow, Save draft and Review & publish in a persistent action bar, and private references/question options/version history in native disclosures. Criterion Name maps to the unchanged comparisonKey; Assessment guidance maps to descriptor. Published snapshots render as read-only content. Human-readable errors preserve the same server validation. Storage revisions remain exact protocol values without appearing in routine UI. No transport/authorization/contract changes result from these label/layout refinements.

All paths below have local-only prefix `/__instructor-preview/api`. JSON commands/responses use runtime schemas in `src/shared/instructor-contracts/authoring.ts`; C-PUB remains `publication.ts`. All responses are no-store. Request JSON is streamed with a 1 MiB limit. Unexpected exceptions are sanitized; errors use the existing safeErrorSchema.

| Method/path                            | Input                                                  | Result / authorization                                                      |
| -------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| POST `/assignments`                    | createDraftSchema `{courseId,requestKey}`              | draftSchema, 201; instructor course write + Origin; scoped create key       |
| GET `/assignments?courseId=…&cursor=…` | opaque course/cursor                                   | draftListSchema; instructor read; 50 rows and nullable nextCursor           |
| GET `/assignments/:id/draft`           | assignment ID                                          | draftSchema; instructor object/course read                                  |
| PUT `/assignments/:id/draft`           | saveDraftSchema `{expectedRevision,payload}`           | exact acknowledged draftSchema; instructor object/course write + Origin     |
| POST `/assignments/:id/publish`        | publishDraftSchema `{expectedRevision,idempotencyKey}` | publicationResultSchema; instructor object/course write + Origin            |
| GET `/assignments/:id/publications`    | assignment ID                                          | historySchema; latest 100, descending publication number; instructor read   |
| GET `/publications/:version`           | immutable assignmentVersionId                          | existing C-PUB publicationSchema; authorized student-read course membership |
| GET `/publications/:version/private`   | immutable assignmentVersionId                          | privatePublicationSchema; instructor read only                              |

401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND for inaccessible objects; 422 INVALID_CONTRACT with safe issue paths/codes; 409 REVISION_CONFLICT or IDEMPOTENCY_CONFLICT; sanitized 503 for unavailable storage. Transport Host/Origin/header denial is 403 before service entry. Cursor/list/history bounds are deliberate resource limits; history consumers needing more than 100 must agree pagination in a later contract increment rather than infer exhaustive history.

## Draft versus publication

Draft payload is `{title,deadlineAt,questions}`; question fields are questionId, rubricId, title, instructions, language='python', starterCode, privateReference, criteria. Criterion fields are criterionId, comparisonKey, descriptor, minimumScore, maximumScore. Empty titles/instructions/criteria and null deadline/scores permit unfinished drafts. Save preserves all question order and canonical LF source, advances revision atomically, and refuses a stale base. UI retains new edits after a late acknowledgment and makes reopen/discard explicit. No source execution occurs.

Publication validates the **saved** exact revision using existing C-PUB rules: nonempty required content, future UTC deadline, 1–20 questions, 1–50 criteria per question, unique criterion/comparison IDs, finite 0–1000 scores with no rounding and at most two decimals, minimum < maximum, canonical source ≤32 KiB per source field, aggregate ≤1 MiB. Incomplete draft acceptance does not imply publishability. Singapore input is converted to canonical UTC; displayed timezone is explicit.

Logical questionId/rubricId/criterionId remain stable through edits/reordering. Every new publication has fresh assignmentVersionId/questionVersionId/rubricVersionId, including private-reference-only or deadline-only changes. Criterion identity is pinned by the immutable rubricVersionId plus criterionId. Migration 0002 stores normalized snapshots; four bulk SQL statements execute atomically. A BEFORE INSERT root guard aborts a stale revision. UPDATE/DELETE triggers reject changes to committed root and child snapshots. Scores persist as integer hundredths.

Publication retry key scope is actor + course + assignment + exact saved revision. Identical authorized retries return the committed original even after draft edits/deadline passage. Changed revision reuse conflicts; concurrent matching keys produce one version. Lost-response UI retries retain the key. Reauthorization precedes replay and snapshot commit. A failed child statement leaves no receipt or partial snapshot.

## Keith's replaceable producer/consumer boundary

Inject Keith's reviewed IdentityCoursePort into AssignmentService. Its requireObject must map both assignment and assignment-version IDs to authoritative course scope using the instructor repository's **scope metadata** seam (`D1Assignments.scope`), then verify current membership; it must not load private payloads to discover ownership. Existing branded principal types are not authentication. No duplicated user/course/submission/assessment storage is introduced here.

For publication consumption, call authorized `AssignmentService.publicVersion(request, assignmentVersionId)` at a future real-auth composition boundary, or adapt the existing PublicationReadPort with equivalent current object/course guards. Never expose D1Assignments directly as an unguarded route. Public SQL explicitly excludes private_reference, then reconstructs the closed C-PUB allowlist. Private snapshots are a separate instructor-only read. Consumers pin exact assignment/question/rubric versions, never substitute logical IDs for version IDs or read the mutable authoring draft.

`payloads.json` contains exact synthetic create/save/publish commands, public C-PUB envelope and separate instructor-only private reference example. `producer-checks.ts` exports verifyPublicationProducer for schema + expected-version admission. `assignments.test.ts` validates these payloads and tests actual D1-produced envelopes, privacy, restart, races and rollback. Keith can run `npx vitest run workflow/instructor-preview/assignments.test.ts`; his consumer implementation/real session checks remain pending, not simulated as complete.

Confirmed for Darryl's isolated implementation: P1–P3 existing publication/release/source policies and this approved writer window. Proposed/pending for joint integration: Keith K1–K6 from instructor-development-contracts and real producer handoff/provisioning. No new joint acceptance is invented. This feature changes no release policy or student storage.
