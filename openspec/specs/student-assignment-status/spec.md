# student-assignment-status Specification

## Purpose

Gives a student an authoritative, at-a-glance status for each assignment in their course assignment list, derived on the server from their own attempts, current releases and deadlines, never inferred from missing data.

## Requirements

### Requirement: AS-01 One status tag per assignment row

Each course assignment list row SHALL show at most one text tag with the row's details, chosen in this priority:

1. Feedback released, when the student's latest attempt for the assignment has a current, non-withdrawn release.
2. Submitted, when the student has any attempt.
3. Due soon, when there is no attempt and the latest publication's deadline is after the server's current time and no more than 24 hours later.

Otherwise the row SHALL show no tag. Tags SHALL NOT include scores. [SD-04, SF-07]

#### Scenario: Feedback on the latest attempt

- **WHEN** the latest attempt has a current release
- **THEN** the row shows only Feedback released

#### Scenario: Feedback only on an earlier attempt

- **WHEN** an earlier attempt has a current release but the latest attempt does not
- **THEN** the row shows Submitted

#### Scenario: Withdrawn feedback

- **WHEN** the latest attempt's only release was withdrawn
- **THEN** the row shows Submitted

#### Scenario: Submitted and due within 24 hours

- **WHEN** the student has submitted and the deadline is 3 hours away
- **THEN** the row shows Submitted, not Due soon

#### Scenario: Due soon boundaries

- **WHEN** there is no attempt and the deadline is exactly 24 hours away, or 1 minute away
- **THEN** the row shows Due soon, and it shows no tag when the deadline is 24 hours and 1 second away or has passed

#### Scenario: Attempt on an earlier version

- **WHEN** the only attempt was submitted against an earlier publication of the assignment
- **THEN** the row shows Submitted

### Requirement: AS-02 Authorized status read

The status read SHALL cover only the requesting student's own attempts, in a course where they hold current Student membership, for at most one list page of IDs. No session gives 401; an inaccessible course gives the uniform 404. Responses SHALL be `no-store` with only assignment IDs and statuses: no attempt IDs, scores, release content or others' data. [AUTH-02, SD-04]

#### Scenario: No session

- **WHEN** status is requested without a valid session
- **THEN** the response is 401 with no status data

#### Scenario: Response content

- **WHEN** a current student requests status for their course
- **THEN** the `no-store` response lists only assignment IDs with a status value, and no attempt IDs, times, scores or release content

#### Scenario: Another course's assignment ID

- **WHEN** the request lists an assignment ID from a course the student does not belong to
- **THEN** that ID receives no status, and nothing reveals whether it exists

#### Scenario: Membership revoked

- **WHEN** a student whose membership was revoked requests status
- **THEN** the response is the uniform 404

#### Scenario: Too many or malformed IDs

- **WHEN** the request has more IDs than one list page, a duplicate or a malformed ID
- **THEN** the response is a 400 validation error with no status data

#### Scenario: Release producer unavailable

- **WHEN** the release producer fails during the read
- **THEN** no row is tagged Feedback released, and the rows fall back to Submitted or Due soon from the student's own data

### Requirement: AS-03 Tags never block the list

The assignment list SHALL render from its own read. It SHALL request status after the list loads. If the status read fails for any reason, the list SHALL show no tags, with no error. Tags SHALL be text with an accessible name. They SHALL NOT rely on colour, and they SHALL be refreshed with the list.

#### Scenario: Status read fails

- **WHEN** the status request fails on the network or returns an error
- **THEN** the list rows, deadlines and Open actions are shown without tags or an error message

#### Scenario: Next page

- **WHEN** the student moves to the next list page
- **THEN** status is requested for that page's IDs only, and the earlier page's tags are not shown on it

#### Scenario: Screen reader

- **WHEN** a screen-reader user reaches a tagged row
- **THEN** the tag text is read with the assignment title
