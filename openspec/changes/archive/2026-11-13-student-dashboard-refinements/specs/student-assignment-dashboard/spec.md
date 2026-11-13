# Spec Delta

## MODIFIED Requirements

### Requirement: SD-02 Published assignment discovery
For an authorized course, the system SHALL list only the latest published version of each logical assignment, with its title, its deadline shown in Singapore time as DR-01 specifies, and an explicit overview action. It SHALL retain past-deadline assignments, sort by deadline ascending then assignment ID, and provide pages of at most 50 rows. [SUB-01/04, UI-01/08, DR-01]

#### Scenario: Draft or republished assignment
- **WHEN** a course contains an unpublished draft and an assignment published twice with later unsaved author edits
- **THEN** the list excludes the draft and shows one row from the second immutable publication, unaffected by current draft fields.

#### Scenario: Equal deadlines and past deadlines
- **WHEN** assignments have past or equal deadlines
- **THEN** past deadlines remain visible, equal deadlines use assignment ID order, and the dashboard makes no claim about submission eligibility or deadline equality rules.

#### Scenario: Bounded pagination and refresh
- **WHEN** a student changes assignment pages or refreshes after republication
- **THEN** each page contains at most 50 unique assignments from current authorized data; new publications appear on refresh and navigation does not promise a snapshot across concurrent publication changes.
