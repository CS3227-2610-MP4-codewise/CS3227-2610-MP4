# Spec Delta

## MODIFIED Requirements

### Requirement: SF-03 Feedback against the exact submitted source

The Released feedback view SHALL show, for the current question, each released criterion's score in the DR-03 format (`Score: X / N`, with no minimum or range text) and its explanation, and each annotation beside that attempt's own submitted lines for that question, never the working copy, another attempt, another question or a newer publication. Annotated lines SHALL carry a non-colour marker, mirrored by a labelled observation list. Selecting either SHALL highlight the exact logical range, show and announce the note and keep focus on the trigger. Opening feedback SHALL NOT change the working copy.

#### Scenario: Earlier attempt opened

- **WHEN** a student opens feedback on an earlier attempt after editing their working copy and submitting again
- **THEN** annotations display against that earlier attempt's submitted source, not the current draft or the later attempt

#### Scenario: Observation selected by keyboard

- **WHEN** a keyboard user selects an observation from the list
- **THEN** the exact source range is highlighted with a non-colour indicator, the note shows criterion, range and explanation, focus stays on the selected entry and the change is announced

#### Scenario: Question with no annotations

- **WHEN** a released question has criterion scores but no annotations
- **THEN** the scores and explanations are shown and no line is marked

#### Scenario: Annotation for another question

- **WHEN** a release has an annotation on question 1 and the student views question 2
- **THEN** the annotation is neither listed nor marked on question 2

### Requirement: SF-05 Release history and withdrawals

The Released feedback view SHALL list the selected attempt's releases newest first. The current release is shown by default. Earlier superseded releases SHALL be readable on request, labelled as replaced with their release time, and SHALL NOT be presented as current. A withdrawn release SHALL show only its tombstone (version and withdrawal time), with no scores, annotations or reason. Withdrawing the current release SHALL NOT cause any earlier release to be shown as current. The chosen release version SHALL apply to every question of that attempt until another attempt is selected.

#### Scenario: Correction released

- **WHEN** an attempt has release v1 and a later correction v2
- **THEN** v2 is shown as current and v1 is available read-only, labelled as replaced

#### Scenario: Current release withdrawn

- **WHEN** the only current release of an attempt is withdrawn
- **THEN** the view shows that feedback was withdrawn with its time, shows no scores or annotations, and does not show any earlier release as current

#### Scenario: Historical release withdrawn

- **WHEN** v1 is withdrawn while v2 remains current
- **THEN** v2 is shown as current and v1 shows only its tombstone

#### Scenario: Replaced version kept across questions

- **WHEN** a student chooses replaced v1 on question 1 and then chooses Next
- **THEN** question 2 shows v1, still labelled as replaced
