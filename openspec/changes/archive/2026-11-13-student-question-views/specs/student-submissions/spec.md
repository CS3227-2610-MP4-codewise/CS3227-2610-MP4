# Spec Delta

## MODIFIED Requirements

### Requirement: SW-08 Submission history and submitted attempt view
A student SHALL be able to choose among their own attempts for an assignment, newest first, and view any of them read-only, one question at a time in the workbook's Submitted attempt view and in full in a read-only attempt summary. Each view SHALL show the server time, attempt ID, pinned version and submitted source, and SHALL offer no editing or submission. Viewing an attempt SHALL NOT change the working copy. [SUB-04, UI-04/05, SQ-02/03/06]

#### Scenario: Edit after submitting
- **WHEN** the student edits the working copy and then opens an earlier attempt
- **THEN** the attempt shows its original source, and returning to the working copy keeps the edits.

#### Scenario: No attempts yet
- **WHEN** the student has not submitted
- **THEN** the history shows an honest empty state without invented status.

#### Scenario: Attempt summary
- **WHEN** the student opens the attempt summary of a selected attempt
- **THEN** every question's submitted source for that attempt is shown read only, with no submit or Review assignment action.
