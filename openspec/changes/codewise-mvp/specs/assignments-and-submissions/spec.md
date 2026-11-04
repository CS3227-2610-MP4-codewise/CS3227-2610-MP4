## ADDED Requirements

### Requirement: SUB-01 Versioned assignment publication
Instructors SHALL create assignments with questions, Python starter text, deadlines, and rubric criteria with stable comparison keys, descriptors, and score bounds. Publication SHALL validate these fields and create immutable question and rubric versions.

#### Scenario: Invalid rubric
- **WHEN** an instructor publishes a rubric with duplicate criterion keys or invalid score bounds
- **THEN** publication fails with field-specific errors.

#### Scenario: Published content changes
- **WHEN** an instructor revises published questions or rubrics
- **THEN** a new version is created and existing drafts, submissions, and assessments retain their pinned versions.

### Requirement: SUB-02 Durable code drafts
Students SHALL edit code with line numbers and syntax highlighting. The interface SHALL show saving, saved, conflict, and failed states. Draft writes SHALL use revision checks to avoid overwriting newer data and SHALL be debounced. The MVP SHALL not execute submitted code.

#### Scenario: Network save failure
- **WHEN** saving fails
- **THEN** editor text remains available, an unsaved indicator appears, and retry is available without a false saved confirmation.

#### Scenario: Concurrent editing
- **WHEN** a stale tab saves over a newer draft revision
- **THEN** the server rejects the stale update and the interface offers recovery without silently discarding either version.

### Requirement: SUB-03 Immutable assignment attempts
Submission SHALL atomically snapshot all question answers, pinned assignment/rubric versions, submitter, and server time. The server SHALL enforce membership, deadline, size limits, and idempotency. New attempts before the deadline SHALL preserve earlier attempts; late submissions SHALL be rejected in MVP.

#### Scenario: Duplicate submit
- **WHEN** the same idempotency key and payload are retried
- **THEN** the existing attempt is returned without creating another attempt.

#### Scenario: Idempotency key reused for different code
- **WHEN** a key is reused with a changed payload
- **THEN** a conflict is returned and neither attempt is silently replaced.

#### Scenario: Draft changed during submission
- **WHEN** draft revisions differ from those confirmed by the student
- **THEN** the attempt is rejected for reconciliation instead of submitting unexpected code.

### Requirement: SUB-04 Accessible history and workspace
The system SHALL provide assignment navigation, keyboard-operable editing controls, visible status messages, submission history, and released feedback linked to exact attempts. Instructor views SHALL show submitted code beside the rubric and editable assessment.

#### Scenario: Historical annotation opened
- **WHEN** a user opens feedback on an earlier attempt
- **THEN** annotations display against that attempt's code rather than the current draft.
