# Student submissions

## Purpose

Lets a student write durable, version-pinned working copies of each question and submit them as one immutable assignment attempt. Instructors assess those attempts through the C-SUB boundary.

## ADDED Requirements

### Requirement: SW-01 Owner-only working copy
For each question of an authorized published version, the system SHALL give a current Student exactly one working copy. On first open it SHALL hold the starter source at revision 0. Only that student SHALL read or write it. Instructors, other students and former members SHALL receive the same not-found response as for a missing object. [SUB-02, AUTH-02/03, UI-04]

#### Scenario: First open
- **WHEN** a current Student opens a question with no saved draft
- **THEN** the editor shows the published starter source at revision 0 and no save has occurred.

#### Scenario: Another account requests the draft
- **WHEN** an instructor of the course or another student requests that student's draft
- **THEN** the response is the non-enumerating not-found error and no source is disclosed.

#### Scenario: Membership revoked between page load and save
- **WHEN** the student's membership is revoked and a save then arrives
- **THEN** the save is rejected at the point of writing and no draft row changes.

### Requirement: SW-02 Version-pinned drafts
A draft SHALL stay bound to the question version it was started on. Republishing SHALL NOT move, merge or overwrite it. When a newer publication exists, the working copy SHALL say so. Moving to the newer version SHALL be an explicit student action that copies the chosen source onto that version's draft. [SUB-01, K2, UI-04]

#### Scenario: Instructor republishes during editing
- **WHEN** a newer publication appears while a student edits version 1
- **THEN** the version 1 draft keeps saving unchanged, and the student sees a newer-version notice without the source being replaced.

#### Scenario: Student moves to the new version
- **WHEN** the student confirms moving question work to the newer version
- **THEN** that version's draft receives the copied source as a new revision, and the version 1 draft is unchanged.

### Requirement: SW-03 Revision-checked saves
Each save SHALL name the revision it was based on. The server SHALL write only if that is still the stored revision, and SHALL then return the new revision, its SHA-256 hash and the server time. Source SHALL be normalised on arrival to UTF-8 with LF line endings (K4), and source over 32 KiB SHALL be rejected. Saves SHALL require a valid session and mutation origin. Saving SHALL NOT execute source. [SUB-02, K4, AUTH-03]

#### Scenario: Stale tab save
- **WHEN** tab B saves on revision 3 after tab A has already saved revision 4
- **THEN** the server rejects tab B with a conflict that includes the current revision and source, and revision 4 is unchanged.

#### Scenario: Oversized source
- **WHEN** a save exceeds 32 KiB after normalisation
- **THEN** it is rejected with a field error, the editor keeps the text, and the state shows not saved.

#### Scenario: CRLF input
- **WHEN** a save contains CRLF line endings
- **THEN** the stored source and hash use LF, and a final LF is preserved.

### Requirement: SW-04 Truthful save states and conflict recovery
The working copy SHALL show unsaved, saving, saved, conflict and failed states. It SHALL show "Saved" only after the server acknowledges the revision currently displayed. On a conflict it SHALL show the local and server copies side by side and let the student keep one. It SHALL offer a copy of the other version before that version is discarded. [SUB-02, UI-04/05/08]

#### Scenario: Network save failure
- **WHEN** a save fails because of the network
- **THEN** the text stays editable, a not-saved state and a retry action appear, and no saved confirmation is shown.

#### Scenario: Student keeps the local copy
- **WHEN** the student chooses their local copy in the conflict window
- **THEN** it is saved as a new revision based on the server's latest revision, and the server copy is discarded only after the copy offer.

#### Scenario: Late acknowledgement after more typing
- **WHEN** an older save is acknowledged after the student has typed more or moved to another question
- **THEN** the newer text is not labelled saved and the other question's draft is not overwritten.

#### Scenario: Reload with an unsaved local copy
- **WHEN** the tab reloads while a local copy differs from the last acknowledged revision
- **THEN** the student is offered the local-versus-server choice and no copy is silently applied.

### Requirement: SW-05 Atomic assignment submission
Submission SHALL list every question of the latest publication with its confirmed draft revision and hash. If membership, latest version, deadline, completeness, size and every confirmed revision are all valid, the server SHALL create one immutable attempt. It SHALL copy the answers from stored drafts with the publication, question and rubric versions, submitter and server time. Otherwise it SHALL create nothing. [SUB-03, C-SUB SUB-C01/C02/C05]

#### Scenario: Valid submission
- **WHEN** a student confirms the current revisions of all questions before the deadline
- **THEN** one attempt is created whose source and hashes equal the stored drafts at those revisions.

#### Scenario: Draft changed during submission
- **WHEN** any question's stored revision differs from the confirmed revision
- **THEN** the submit is rejected for reconciliation, and no attempt or partial answer is visible to any role.

#### Scenario: Drafts on a superseded publication
- **WHEN** the student submits while a newer publication exists
- **THEN** the submit is rejected as stale, and the student is directed to move work to the newer version.

#### Scenario: Missing, duplicate or foreign question
- **WHEN** the submission omits a question, repeats one or names another publication's question
- **THEN** the whole submit fails with a contract error and nothing is created.

### Requirement: SW-06 Deadline and server clock
The server SHALL read its own clock once when a submit request arrives. It SHALL accept a new attempt only if that time is strictly before the publication's deadline. A request at or after the deadline SHALL be rejected with a deadline-passed error. Late attempts SHALL NOT be accepted in the MVP. Client-supplied times SHALL NOT be trusted. [SUB-03, C-SUB SUB-C05]

#### Scenario: Exactly at the deadline
- **WHEN** a new submit arrives at the deadline instant
- **THEN** it is rejected as deadline passed and no attempt is created.

#### Scenario: Forged client time
- **WHEN** a request carries an earlier client timestamp after the deadline
- **THEN** the client value is ignored and the submit is rejected.

### Requirement: SW-07 Idempotent submission and unlimited attempts
Each submit SHALL carry a client key scoped to the user and logical assignment, plus a fingerprint of the canonical answers. The same key with the same fingerprint SHALL return the original attempt, even after the deadline. The same key with a different fingerprint SHALL return a conflict. Distinct keys before the deadline SHALL create further attempts with no count limit, and earlier attempts SHALL be kept. [SUB-03, C-SUB SUB-C03/C04/C06]

#### Scenario: Retry after a lost response
- **WHEN** the same key and payload are retried, including after the deadline
- **THEN** the original attempt is returned and no new attempt is created.

#### Scenario: Key reused with different code
- **WHEN** a key is reused with a changed fingerprint
- **THEN** a conflict is returned and the original attempt is unchanged.

#### Scenario: Retry after membership revocation
- **WHEN** a former member replays a committed key
- **THEN** authorization fails first and no attempt data is returned.

### Requirement: SW-08 Submission history and submitted attempt view
A student SHALL be able to list their own attempts for an assignment, newest first, and open any of them read-only. The view SHALL show the server time, attempt ID, pinned version and submitted source, and SHALL offer no editing. Opening an attempt SHALL NOT change the working copy. [SUB-04, UI-04/05]

#### Scenario: Edit after submitting
- **WHEN** the student edits the working copy and then opens an earlier attempt
- **THEN** the attempt shows its original source, and returning to the working copy keeps the edits.

#### Scenario: No attempts yet
- **WHEN** the student has not submitted
- **THEN** the history shows an honest empty state without invented status.

### Requirement: SW-09 C-SUB producer for assessment
The system SHALL supply attempts to authorized instructors through the C-SUB contract only. It SHALL return complete attempts that pass validation by ID, and list, per publication, each student whose latest committed attempt for the assignment is on that publication, with that attempt as the attempt to assess. Drafts SHALL NOT be returned, and stored data that fails the contract SHALL be reported as unavailable. [C-SUB, SUB-03/04, AUTH-02]

#### Scenario: Instructor lists attempts to assess
- **WHEN** a course instructor lists attempts for a publication where a student submitted twice
- **THEN** the list contains that student's latest attempt, and the earlier attempt remains readable by ID.

#### Scenario: Student or non-member requests the catalog
- **WHEN** a non-instructor requests an attempt or catalog listing
- **THEN** the non-enumerating not-found error is returned.

### Requirement: SW-10 Retention policy
Student attempts, drafts and the feedback linked to them SHALL be kept until 90 days after the course is archived and SHALL then be deleted, with backup windows disclosed. Until a course-archive event exists and deletion is implemented, the system SHALL be used with synthetic data only. [Retention gate, DEV-03]

#### Scenario: Real learner data before deletion exists
- **WHEN** deployment with real learner data is requested before archive-based deletion is implemented
- **THEN** release is blocked by the retention gate.
