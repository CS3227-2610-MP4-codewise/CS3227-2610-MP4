# Instructor assignments delta

## Purpose

Allow authorized instructors to retain unfinished authoring work and deliberately publish validated, immutable assignment versions while keeping private references out of student-facing projections.

## ADDED Requirements

### Requirement: IAS-01 Durable instructor draft lifecycle
Instructors SHALL create, list, save, reopen and edit course-scoped assignment drafts with ordered questions, Python starter source, private references and rubric criteria. Bounded incomplete drafts SHALL be saveable; saved state SHALL reflect acknowledged persistence (SUB-01, UI-08).

#### Scenario: Reopen an incomplete saved draft
- **WHEN** an authorized instructor saves an unfinished draft and reopens it after a new client or local service instance starts
- **THEN** its exact stored question order, source, private references, rubric fields and server revision are restored without claiming it is publishable.

#### Scenario: Local service or save fails
- **WHEN** a save fails or is interrupted
- **THEN** editor contents remain recoverable, the UI reports failure or unsaved state and it does not claim persistence without an acknowledgement.

### Requirement: IAS-02 Revision-aware editing and acknowledgement
Draft updates SHALL require the expected stored revision and atomically advance it on success. Stale writes SHALL conflict. Acknowledgements SHALL bind to the saved assignment and editor generation; they SHALL NOT overwrite newer edits or mark them saved (SUB-01, UI-08).

#### Scenario: Two tabs edit the same assignment
- **WHEN** a stale tab saves after another tab's update
- **THEN** the newer stored draft remains unchanged and the stale tab retains its edits with explicit reload/reconciliation choices.

#### Scenario: Edits or selection change during save
- **WHEN** an older save acknowledgement arrives after newer edits or assignment navigation
- **THEN** only the acknowledged base revision is advanced and the newer/other assignment's contents and status are not overwritten.

### Requirement: IAS-03 Validated immutable publication
Publication SHALL validate an exact saved draft revision and atomically persist immutable assignment/question/rubric/criterion versions. Logical IDs SHALL remain stable across edits while each new publication receives fresh version IDs. Earlier snapshots and pinned consumers SHALL remain unchanged (SUB-01).

#### Scenario: Publish an invalid draft
- **WHEN** required content, deadline, criterion uniqueness, score bounds, supported language or resource limits fail validation
- **THEN** publication returns safe field errors and creates no publication or partial version rows; the draft remains editable.

#### Scenario: Edit and publish again
- **WHEN** source, a private reference, question order, rubric or deadline changes and is saved then republished
- **THEN** a new immutable version set is created and all earlier public/private snapshots, IDs and deadlines remain unchanged.

#### Scenario: Storage fails during publication
- **WHEN** any snapshot statement fails or the saved draft revision changes before the commit
- **THEN** no partial publication/idempotency receipt remains and retry does not expose an incomplete version.

### Requirement: IAS-04 Scoped publication retries
Publication SHALL bind its idempotency key to actor, course, assignment and exact draft revision. Authorized identical retries SHALL return the committed publication; changed-payload reuse SHALL conflict. Concurrent identical retries SHALL create only one version set (SUB-01, AUTH-02).

#### Scenario: Response lost after publication commits
- **WHEN** the same authorized actor retries the identical publication key and draft revision
- **THEN** the original immutable publication is returned even if its deadline has since passed, without another version set.

#### Scenario: Permission revoked before replay
- **WHEN** a user retries a prior key after losing course authorization
- **THEN** replay is denied before private content or receipt data is exposed.

### Requirement: IAS-05 Trusted authorization and private boundaries
Every draft/publication operation SHALL use injected trusted session and course/object authorization. Browser roles SHALL NOT authorize operations. Student-facing publication reads SHALL use the explicit C-PUB allowlist; drafts, private references and private error details SHALL remain restricted (AUTH-02, SUB-01).

#### Scenario: Forged role or foreign assignment
- **WHEN** a student or unassigned instructor supplies role fields or guesses an assignment/version ID
- **THEN** private reads/writes/publish/replay are denied using authoritative scope metadata before payload access or mutation.

#### Scenario: Read a published public version
- **WHEN** an authorized course member reads an existing published version through the public contract boundary
- **THEN** it validates against the existing C-PUB schema and contains no private reference, draft state or private instructor metadata at any nesting level.

### Requirement: IAS-06 Warm-workbook authoring and deliberate publication
The instructor UI SHALL follow warm-workbook-v1 and applicable UI-01/UI-04/UI-05/UI-07/UI-08 requirements. It SHALL label draft versus published versions, retain all question edits during navigation and provide separate review and publish confirmation actions. Navigation SHALL NOT publish or submit work.

#### Scenario: Author multiple questions
- **WHEN** an instructor moves between first, middle and last questions while editing
- **THEN** all question/rubric/reference edits remain in the assignment state, position and focus are announced appropriately, and final navigation opens review rather than publishing.

#### Scenario: Confirm an acknowledged draft revision
- **WHEN** the instructor reviews a valid saved draft and separately confirms publication
- **THEN** the request identifies that exact revision; newer unsaved edits block publication until saved/reviewed and success identifies the committed version.

#### Scenario: Keyboard and narrow-screen workflow
- **WHEN** the authoring slice is operated by keyboard at 320px or 200% zoom in either appearance
- **THEN** labels, focus, save/error/review actions, source formatting and at least 44px essential targets remain usable without page-wide overflow.

#### Scenario: Enter a dedicated authoring page
- **WHEN** an instructor creates a draft or opens a saved assignment from the list
- **THEN** the UI navigates to a dedicated authoring page without the assignment list, permits authorized reload of that exact draft and provides Back to assignments with unsaved-navigation protection.

#### Scenario: Author with task-focused controls
- **WHEN** the instructor edits or reviews an assignment
- **THEN** the UI prioritizes details, questions, saving and deliberate publication; less frequent controls use accessible disclosures, field errors identify the affected question/criterion, and version-history recovery remains reachable after errors.

#### Scenario: Inspect a published version
- **WHEN** the instructor opens a published version
- **THEN** it presents read-only instructions, code and rubric values with a clear version label, private-reference disclosure and Back to draft action rather than an editable-looking form.

### Requirement: IAS-07 Isolated synthetic composition and honest integration

Synthetic identity/course adapters SHALL be injected only by an explicit guarded local-development/test composition. Deployed entrypoints SHALL expose no publication feature route before real authentication/object authorization exists. Local D1, schema, UI and synthetic checks SHALL be distinguished from real integration evidence (AUTH-02).

#### Scenario: Local preview request lacks its fixture capability or valid origin
- **WHEN** a request to the development API has a missing/invalid synthetic session, disallowed Host/Origin or forged client identity input
- **THEN** access is rejected without private data or mutation; no permissive CORS grants access.

#### Scenario: Build the deployed application
- **WHEN** the normal production frontend/Worker is built
- **THEN** the local harness, synthetic adapters and preview assets are excluded and unimplemented feature API paths still return safe JSON 404 responses.

#### Scenario: Hand publication off to Keith
- **WHEN** the instructor increment is handed off
- **THEN** it includes exact contract/module and migration revisions, synthetic public/private examples, actual authorization/local-D1/UI test outcomes and pending real identity/course/K1–K6/consumer integration gates.
