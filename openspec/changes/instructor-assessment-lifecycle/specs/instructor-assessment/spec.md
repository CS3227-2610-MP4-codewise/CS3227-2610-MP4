# Instructor assessment lifecycle delta

## Purpose

Enable instructors to assess immutable submitted work, review exact feedback revisions and publish or withdraw safe versioned feedback while preserving source evidence and private audit history.

## ADDED Requirements

### Requirement: IAL-01 Authorized pinned assessment evidence
The workspace SHALL obtain submissions and authorization through injected ports, validate C-SUB against the exact published question/rubric versions, and retain immutable evidence identifiers/digests. Missing or revoked authority SHALL deny access. Assessment persistence SHALL NOT duplicate submission or membership storage. [GRADE-02, CON-05, UI-04]

#### Scenario: A newer assignment is published
- **WHEN** an instructor opens an older submitted attempt after the assignment changes
- **THEN** the workspace shows that attempt's original source, questions, rubrics and version context, never the latest publication or working copy.

#### Scenario: Missing or inconsistent producer
- **WHEN** authorization/submission ports are missing, access is revoked, or evidence conflicts with its pinned versions/hash
- **THEN** protected content and mutations are denied or unavailable without invented memberships, shifted evidence or source execution.

### Requirement: IAL-02 Revision-checked manual feedback
Instructors SHALL save and reopen bounded private manual drafts with partial scores/explanations. Saves SHALL compare the expected revision, append immutable assessment revisions and invalidate approval. Approval SHALL require all rubric criteria, valid two-decimal scores and complete explanations. [GRADE-02–04, UI-08]

#### Scenario: Partial grading is saved
- **WHEN** an instructor saves some criterion scores with other scores or explanations incomplete
- **THEN** the acknowledged draft survives reopening, stays private, and cannot be approved or released until complete and valid.

#### Scenario: Another instructor saves first
- **WHEN** a save names an older revision than the stored head
- **THEN** it conflicts without overwriting the newer revision; the interface preserves unsaved local input and offers explicit reload/reconciliation.

#### Scenario: Invalid score
- **WHEN** a manual score is non-finite, outside its pinned criterion bounds or has more than two decimal places
- **THEN** the save is rejected as a whole without silently rounding or changing released feedback.

### Requirement: IAL-03 Exact source-linked observations
Stored observations SHALL identify the immutable answer, question/rubric version, criterion and one-based inclusive logical source range, with an exact canonical-source excerpt. Invalid evidence SHALL fail validation wholly. Selecting an observation SHALL preserve trigger focus and announce its note. [GRADE-02, UI-06/UI-07]

#### Scenario: Wrapped lines and final newline
- **WHEN** an observation spans displayed wrapping or an empty final logical line
- **THEN** matching uses the original LF split lines and exact excerpt, including the terminal empty line where applicable.

#### Scenario: Fabricated or foreign excerpt
- **WHEN** an observation has a foreign criterion/answer, out-of-range lines or a different excerpt
- **THEN** it cannot be saved or approved; unavailable display evidence is labelled without attaching it to other source.

#### Scenario: Keyboard observation selection
- **WHEN** an instructor selects a marked line or equivalent labelled observation-list control by keyboard
- **THEN** the exact range and proportional-text note update with text/state indicators, visible focus retained on the trigger, and a concise announcement.

### Requirement: IAL-04 Separate exact approval and release
Approval SHALL bind the current complete assessment revision and reviewer. Release SHALL be a separate explicit action guarded by exact approved revision and expected availabilityRevision. Edits SHALL clear approval; approval alone SHALL NOT expose feedback. [GRADE-03/GRADE-04, CON-05, UI-04/UI-08]

#### Scenario: Approved content changes
- **WHEN** an instructor edits approved feedback
- **THEN** a new unapproved private revision is created and a stale approval/release request conflicts; the prior public release remains unchanged.

#### Scenario: Release without approval
- **WHEN** release requests an incomplete, unapproved or stale assessment revision or stale availability revision
- **THEN** it is rejected without publishing partial feedback or advancing visibility.

### Requirement: IAL-05 Atomic release corrections and private history
Release SHALL atomically record an immutable snapshot, monotonic release version, current pointer, availability revision and private actor/timestamp/provenance audit. Corrections SHALL require a new edited revision and fresh approval. Matching scoped retries SHALL replay only after fresh authorization; changed-key payloads SHALL conflict. [GRADE-04, CON-05]

#### Scenario: A correction is being drafted
- **WHEN** an instructor saves or approves a correction to released feedback
- **THEN** the existing release remains current until the corrected exact revision is explicitly released; earlier nonwithdrawn releases remain identifiable as superseded history.

#### Scenario: Concurrent or interrupted release
- **WHEN** release requests race or a transaction fails partway through
- **THEN** one complete valid transition commits or none does; no duplicate version, partial audit/currentness update or cross-actor idempotency replay appears.

#### Scenario: Already released revision
- **WHEN** a different request tries to republish the same assessment revision or revive a withdrawn version
- **THEN** no new release is created; renewed feedback requires a new revision, approval and release.

### Requirement: IAL-06 P4 withdrawal and currentness
Withdrawal SHALL require current assigned-instructor authorization, an exact release version, expected availability revision and private reason. It SHALL atomically record a tombstone and increment availabilityRevision once. Withdrawing current SHALL clear its pointer; historical withdrawal SHALL preserve a newer current release. Older content SHALL NOT revive. [GRADE-04, CON-05]

#### Scenario: Current release withdrawn
- **WHEN** the current release is withdrawn
- **THEN** currentReleaseVersion becomes null, public/history reads return a content-free tombstone for that version, private audit remains authorized, and cached currentness fails.

#### Scenario: Historical release withdrawn
- **WHEN** version1 is withdrawn while version2 is current
- **THEN** currentReleaseVersion stays2, availabilityRevision increments, version1 reads become tombstones and version2 remains the sole current release.

#### Scenario: Withdrawal retry and stale command
- **WHEN** an identical scoped withdrawal retries, or a different command uses stale availability
- **THEN** the authorized identical retry returns its recorded tombstone without another increment; the stale command conflicts.

### Requirement: IAL-07 Safe consumer feedback boundary
Consumer reads SHALL use C-REL allowlists and current authorization/currentness, returning only released or superseded content or withdrawn tombstones as appropriate. Drafts, references, private reasons and audit identities SHALL remain private. An old idempotency receipt SHALL NOT disclose content withdrawn since its commit. [GRADE-03/GRADE-04, CON-05]

#### Scenario: Student-safe producer fixtures
- **WHEN** Keith runs reusable checks against release, correction, historical/current withdrawal and stale-token fixtures
- **THEN** they validate exact pinned evidence, safe fields and currentness failures without implementing his student UI, membership or progress cache.

#### Scenario: Draft or withdrawn content requested
- **WHEN** a consumer reads before release, after withdrawal, with stale currentness or after access revocation
- **THEN** private content is absent and the result is an appropriate empty, tombstone, stale-evidence or denied state, never last-known-good feedback.

### Requirement: IAL-08 Truthful warm workbook interface
The instructor workbook SHALL follow warm-workbook-v1 and distinguish partial draft, saved revision, approved revision, current release, correction, superseded and withdrawn views. It SHALL support 320px, 200% zoom, keyboard controls and explicit asynchronous/error states, preserving unsaved input without claiming execution. [UI-01/UI-04/UI-06/UI-07/UI-08]

#### Scenario: Late save acknowledgement
- **WHEN** save completes after newer edits or navigation to another question/attempt
- **THEN** it does not overwrite the new context or label unacknowledged input saved; pending duplicate actions are prevented.

#### Scenario: Historical read-only view
- **WHEN** an instructor selects a historical assessment/release
- **THEN** it displays its pinned attempt and revision with read-only controls; creating a correction is explicit and does not mutate history.

#### Scenario: Narrow, empty or unavailable workspace
- **WHEN** the workbook is narrow, has no assessment yet, loses its session or cannot retrieve evidence
- **THEN** task controls remain accessible, states are concise and truthful, and no private content or fake successful save/release is shown.

### Requirement: IAL-09 Isolated development and honest integration status
Synthetic submission adapters SHALL exist only in an explicitly labelled, opt-in loopback development composition and tests; connected local testing SHALL use the real authentication and course services. Application services SHALL fail closed without real injected producers. Joint K decisions, provider integration and deployment tasks SHALL remain pending until actual evidence is supplied. [CON-05, UI-08]

#### Scenario: Production lacks reviewed assessment and submission composition
- **WHEN** deployed routing has no reviewed submission/authorization composition
- **THEN** authenticated instructor navigation reports missing submission integration without protected content or fixture fallback; local synthetic success is not reported as live integration.

### Requirement: IAL-10 Connected authenticated instructor workflow
The application SHALL connect sign-in, authorized courses, assignment publication and assessment review using existing services. Explicit loopback development composition SHALL permit labelled immutable sample submissions through injected ports. Every request SHALL retain current session, object/course authority and mutation guards; no sample/student identity SHALL grant permissions. [AUTH-02, GRADE-02–04, UI-01/04/07/08]

#### Scenario: Full local instructor path
- **WHEN** a provisioned instructor signs in, opens a course, publishes an assignment and chooses its local sample attempt
- **THEN** the same application opens pinned assessment editing, approval/release/history and safe public-feedback preview without a separate fixture login or new membership/submission store.

#### Scenario: Sample adapter outside local development
- **WHEN** sample injection is supplied for staging/production or a non-loopback origin
- **THEN** it is ignored and sample discovery/read/mutation cannot expose fixture work.

#### Scenario: Forged or revoked deep link
- **WHEN** a user follows a review/assessment destination without current instructor authority or sends a mutation without valid origin/CSRF
- **THEN** no source, feedback or mutation is available and the interface requests authorized sign-in/access.
