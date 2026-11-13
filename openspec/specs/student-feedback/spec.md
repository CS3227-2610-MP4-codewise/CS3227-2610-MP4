# student-feedback Specification

## Purpose

Lets a student read the instructor-released feedback on their own submitted attempts, shown against that attempt's exact submitted source, without ever exposing unreleased, withdrawn or private assessment material.

## Requirements

### Requirement: SF-01 Own-attempt released feedback only

The system SHALL return an attempt's feedback, as the closed C-REL public projections with `no-store`, only to its submitter while they hold current Student membership. Without a session the response SHALL be 401. Any other caller or attempt ID SHALL get the uniform 404 before assessment data is read. Responses and errors SHALL NOT contain drafts, approval state, reviewer identity, private reasons, references, prompts or provider payloads.

#### Scenario: Own released attempt

- **WHEN** a current student requests feedback for their own attempt that has a current release
- **THEN** the response is 200 with the release projection, its currentness and the attempt's version list, with `Cache-Control: no-store`

#### Scenario: Another student's attempt

- **WHEN** a student requests feedback for an attempt submitted by someone else in the same course
- **THEN** the response is the uniform 404 body and contains no assessment, release or source data

#### Scenario: Membership revoked

- **WHEN** a student whose membership was revoked after submitting requests feedback for their own earlier attempt
- **THEN** the response is the uniform 404 body

#### Scenario: No session

- **WHEN** feedback is requested without a valid session
- **THEN** the response is 401 with no attempt or feedback data

#### Scenario: Unreleased draft exists

- **WHEN** the instructor has saved or approved an assessment for the attempt but not released it
- **THEN** the response reports no release, and neither the response nor the page contains any draft score, text or approval state

### Requirement: SF-02 Current release and currentness re-check

The system SHALL display a release as current only when it is in the `released` state, its version equals the attempt's current release version, it is not withdrawn, and it belongs to the same assessment and attempt. The server SHALL re-check currentness after reading the release and before responding. A mismatch SHALL produce a safe stale-feedback result, never the older or mismatched content. The browser SHALL NOT cache feedback across views; reopening the attempt SHALL fetch it again.

#### Scenario: Release changes during the read

- **WHEN** a new release or a withdrawal commits between the server's release read and its currentness re-check
- **THEN** the response is a stale-feedback error with no release content, and a retry returns the new current state

#### Scenario: Version number from a different attempt

- **WHEN** a release's version number matches the current version but its assessment or attempt ID does not
- **THEN** it is not displayed as current

#### Scenario: Reopening after a correction

- **WHEN** a student reopens an attempt after the instructor released a correction
- **THEN** the newly current release is shown, not the version seen earlier

### Requirement: SF-03 Feedback against the exact submitted source

The attempt view SHALL show each released criterion's score, bounds and explanation, and each annotation beside that attempt's own submitted lines, never the working copy, another attempt or a newer publication. Annotated lines SHALL carry a non-colour marker, mirrored by a labelled observation list. Selecting either SHALL highlight the exact logical range, show and announce the note and keep focus on the trigger. Opening feedback SHALL NOT change the working copy.

#### Scenario: Earlier attempt opened

- **WHEN** a student opens feedback on an earlier attempt after editing their working copy and submitting again
- **THEN** annotations display against that earlier attempt's submitted source, not the current draft or the later attempt

#### Scenario: Observation selected by keyboard

- **WHEN** a keyboard user selects an observation from the list
- **THEN** the exact source range is highlighted with a non-colour indicator, the note shows criterion, range and explanation, focus stays on the selected entry and the change is announced

#### Scenario: Question with no annotations

- **WHEN** a released question has criterion scores but no annotations
- **THEN** the scores and explanations are shown and no line is marked

### Requirement: SF-04 Unmatched annotations shown as unavailable

Before display, the system SHALL check each annotation against the attempt's submitted answer that it names: the answer SHALL belong to this attempt and question, the line range SHALL lie within that source, and the excerpt SHALL equal those lines exactly. An annotation that fails any check SHALL be listed as unavailable evidence with its criterion and explanation, and SHALL NOT mark, highlight or be attached to any line. Other valid annotations and criterion scores SHALL still display.

#### Scenario: Excerpt does not match

- **WHEN** an annotation's excerpt differs from the submitted source at its stated lines
- **THEN** it is shown as unavailable evidence and no line is marked for it

#### Scenario: Range beyond the source

- **WHEN** an annotation's end line is past the last line of the submitted answer
- **THEN** it is shown as unavailable evidence and is not attached to the last line or any other line

#### Scenario: Annotation names another attempt's answer

- **WHEN** an annotation's submitted answer ID is not an answer of this attempt
- **THEN** it is shown as unavailable evidence

### Requirement: SF-05 Release history and withdrawals

The attempt view SHALL list the attempt's releases newest first. The current release is shown by default. Earlier superseded releases SHALL be readable on request, labelled as replaced with their release time, and SHALL NOT be presented as current. A withdrawn release SHALL show only its tombstone (version and withdrawal time), with no scores, annotations or reason. Withdrawing the current release SHALL NOT cause any earlier release to be shown as current.

#### Scenario: Correction released

- **WHEN** an attempt has release v1 and a later correction v2
- **THEN** v2 is shown as current and v1 is available read-only, labelled as replaced

#### Scenario: Current release withdrawn

- **WHEN** the only current release of an attempt is withdrawn
- **THEN** the view shows that feedback was withdrawn with its time, shows no scores or annotations, and does not show any earlier release as current

#### Scenario: Historical release withdrawn

- **WHEN** v1 is withdrawn while v2 remains current
- **THEN** v2 is shown as current and v1 shows only its tombstone

### Requirement: SF-06 Truthful feedback states

The feedback panel SHALL show distinct, text-based states for loading, not released yet, released, withdrawn, stale (with a retry), session expired, network failure (with a retry) and unavailable service. The not-released state SHALL invite waiting for the instructor's release and SHALL NOT imply that an assessment exists. A loading state SHALL NOT show placeholder scores. The attempt's submitted source SHALL remain visible whatever the feedback state.

#### Scenario: Not released

- **WHEN** an attempt has no release
- **THEN** the panel says feedback has not been released yet, with no score placeholders

#### Scenario: Network failure

- **WHEN** the feedback request fails on the network
- **THEN** the panel shows a failure message with a retry, and the submitted source stays visible

#### Scenario: Session expired

- **WHEN** the feedback request returns 401
- **THEN** the student is taken to sign-in recovery and no feedback content remains on screen

### Requirement: SF-07 Feedback marker in submission history

Each submission-history row SHALL show a text marker when its attempt has a current release, determined from server state at the time the list is loaded. The marker SHALL NOT show scores, and it SHALL NOT appear for unreleased, withdrawn-only or stale states.

#### Scenario: Mixed history

- **WHEN** a student has three attempts and only the second has a current release
- **THEN** only the second row shows the marker, and none shows a score

### Requirement: SF-08 Producer conformance from the consumer

Keith's consumer SHALL pass the C-REL release conformance checks against the real composed producer and local D1. These cover draft privacy, own-attempt and foreign denial, revoked access, currentness tokens, historical supersession and withdrawn-receipt non-resurrection. Fixture-only runs SHALL be recorded as fixture runs, not integration.

#### Scenario: Composed conformance run

- **WHEN** the consumer checks run against the real producer composed in the local application
- **THEN** every check passes and the run records the exact producer and consumer revisions

#### Scenario: Producer not yet composed

- **WHEN** only the fake port and public fixtures are available
- **THEN** the checks are reported as fixture runs, and integration acceptance stays pending
