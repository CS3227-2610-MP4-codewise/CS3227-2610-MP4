# Spec Delta

## Purpose

Defines how student screens present times, rubric points and released scores, so that every student sees the same, unambiguous values whatever their device settings.

## ADDED Requirements

### Requirement: DR-01 Student times in Singapore time

Every timestamp shown on a student screen SHALL be the server-supplied instant converted to Asia/Singapore and shown as `DD/MM/YYYY, h:mm:ss am/pm`: zero-padded day and month, 4-digit year, 12-hour hour without padding, zero-padded minutes and seconds, lowercase am/pm and no time-zone label. The text SHALL NOT depend on the viewer's locale or time zone. Machine-readable `datetime` attributes SHALL keep the original ISO instant.

#### Scenario: Afternoon deadline

- **WHEN** a deadline is `2026-11-13T06:05:09Z`
- **THEN** the student sees `13/11/2026, 2:05:09 pm`

#### Scenario: Viewer in another time zone

- **WHEN** the same deadline is viewed in a browser set to a different locale and time zone
- **THEN** the text is still `13/11/2026, 2:05:09 pm`

#### Scenario: Date boundary

- **WHEN** an instant is `2026-12-31T16:00:00Z`
- **THEN** the student sees `01/01/2027, 12:00:00 am`

#### Scenario: Machine-readable value kept

- **WHEN** a time is rendered in a `time` element
- **THEN** its `datetime` attribute is the unchanged ISO instant from the server

### Requirement: DR-02 Rubric guidance shows the attainable maximum

Rubric guidance on the assignment overview and in the workbook question pane SHALL show each criterion's points as the maximum score in brackets, `(N points)`, using `(1 point)` when N is 1. It SHALL NOT show the minimum score or a range.

#### Scenario: Zero minimum

- **WHEN** a criterion has minimum 0 and maximum 2
- **THEN** the guidance shows `(2 points)`

#### Scenario: Non-zero minimum

- **WHEN** a criterion has minimum 1 and maximum 3
- **THEN** the guidance shows `(3 points)` and no range

#### Scenario: Fractional maximum

- **WHEN** a criterion's maximum is 2.5
- **THEN** the guidance shows `(2.5 points)`

### Requirement: DR-03 Released score format

The released-feedback criterion table SHALL show each awarded score as `Score: X / N`, where X is the released score and N the criterion maximum, with no minimum or range text. All other released-feedback rules (SF-01–06) SHALL still apply.

#### Scenario: Released score

- **WHEN** a released criterion has score 1 and maximum 2
- **THEN** the table shows `Score: 1 / 2` and no `range` text

#### Scenario: Withdrawn release

- **WHEN** the shown release is a withdrawn tombstone
- **THEN** no score text appears
