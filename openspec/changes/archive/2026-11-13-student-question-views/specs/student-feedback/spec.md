# Spec Delta

## MODIFIED Requirements

### Requirement: SF-03 Feedback against the exact submitted source

For the current question, the Released feedback view SHALL show each released criterion's score (DR-03 `Score: X / N`) and explanation, and each annotation beside that attempt's own submitted lines, never the working copy or another attempt, question or publication. Annotated lines SHALL carry a non-colour marker mirrored by a labelled observation list; selecting either SHALL highlight the exact range and announce the note without moving focus. Opening feedback SHALL NOT alter the working copy.

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

The Released feedback view SHALL list the selected attempt's releases newest first, current by default. Superseded releases SHALL be readable on request, labelled as replaced with their release time, never as current. A withdrawn release SHALL show only its tombstone: version and withdrawal time, no scores, annotations or reason. Withdrawing the current release SHALL NOT make an earlier one current. The chosen version SHALL apply to all questions of the attempt until another attempt is selected.

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
