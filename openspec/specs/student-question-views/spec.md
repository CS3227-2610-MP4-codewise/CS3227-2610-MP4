# student-question-views Specification

## Purpose

Lets a student work through an assignment one question at a time in the workbook and, for each question, switch between their working copy, a selected submitted attempt and that attempt's released feedback, without the views ever mixing sources or versions.

## Requirements

### Requirement: SQ-01 Three per-question answer views

The workbook work pane SHALL offer three answer views for the current question: Working copy, Submitted attempt and Released feedback. They SHALL be equal-sized controls with matching selected state, panel labels and keyboard operation. Switching views SHALL NOT save, submit, or change the working copy or the selected attempt. [UI-04, UI-07]

#### Scenario: Switch to the submitted view

- **WHEN** a student on question 2 of the working copy selects Submitted attempt
- **THEN** the work pane shows question 2's answer from the selected attempt, the question pane still shows question 2 and no save or submit request is sent

#### Scenario: Keyboard operation

- **WHEN** a keyboard user moves between the view controls with arrow keys and activates one
- **THEN** the selected state and visible panel change together and the panel is announced by its label

#### Scenario: Return to the working copy

- **WHEN** a student edits the working copy, opens Submitted attempt and returns to Working copy
- **THEN** the edits and their save state are unchanged

### Requirement: SQ-02 Attempt selector

The Submitted attempt and Released feedback views SHALL include a selector listing the student's own attempts for the assignment, newest first, each with its server submission time and, when it has a current release, the existing text-only "Feedback released" marker. Older attempts SHALL load on request. The latest attempt SHALL be selected by default. [SW-08, SF-07]

#### Scenario: Default attempt

- **WHEN** a student with three attempts opens Submitted attempt without choosing one
- **THEN** the latest attempt is selected and shown, and the selector lists all three newest first

#### Scenario: More than one page

- **WHEN** the history has more attempts than one page and the student asks for older attempts
- **THEN** the next page is appended without changing the selected attempt

#### Scenario: No attempts

- **WHEN** a student who has not submitted opens Submitted attempt or Released feedback
- **THEN** the view says no attempt has been submitted yet and offers to return to the working copy, with no invented attempt or status

### Requirement: SQ-03 Per-question submitted answer

The Submitted attempt view SHALL show, read only, the selected attempt's submitted source for the current question, with the server submission time, attempt ID and pinned version. It SHALL offer no editing, and the source SHALL come only from that attempt. [SW-08, UI-04]

#### Scenario: Edited after submitting

- **WHEN** the student has edited question 1 after submitting and opens Submitted attempt on question 1
- **THEN** the submitted source is shown unchanged and no editor or save control appears

#### Scenario: Earlier attempt selected

- **WHEN** the student selects an earlier attempt in the selector
- **THEN** the view shows that attempt's source for the current question, not the latest attempt's or the working copy's

### Requirement: SQ-04 Per-question released feedback

The Released feedback view SHALL show, for the selected attempt and current question only, the released criterion scores (DR-03 `Score: X / N`) and explanations, the annotations against that question's submitted source with their observation list, and that question's unavailable evidence. Release-version history SHALL remain per attempt. Every SF state SHALL apply, and the submitted source SHALL remain visible in every state. [SF-03/04/05/06, UI-06]

#### Scenario: Feedback filtered to the question

- **WHEN** a release has criteria and annotations for questions 1 and 2 and the student views question 2
- **THEN** only question 2's criteria and annotations appear, and no line of question 2's source carries a marker from question 1

#### Scenario: Question without feedback in a release

- **WHEN** the current release has no criterion or annotation for the current question
- **THEN** the view says this question has no released feedback in this version, without placeholder scores

#### Scenario: Not released

- **WHEN** the selected attempt has no release
- **THEN** the view says feedback has not been released yet and still shows the question's submitted source

### Requirement: SQ-05 View and attempt in the address

The workbook address SHALL carry the selected view and, for the historical views, the selected attempt ID. Reload, Back/Forward and opening the address SHALL restore them after the server re-authorizes the attempt for the current student. A malformed, foreign or revoked attempt ID SHALL show the uniform unavailable state, with no attempt or feedback data. [AUTH-02, UI-05]

#### Scenario: Reload in the feedback view

- **WHEN** a student reloads question 3 in Released feedback for attempt A
- **THEN** question 3, Released feedback and attempt A are restored and the feedback is fetched again

#### Scenario: Another student's attempt ID

- **WHEN** the address names an attempt submitted by another student
- **THEN** the view shows the unavailable state and contains no source, scores or attempt metadata

#### Scenario: Malformed query

- **WHEN** the address has an unknown view value or a malformed attempt ID
- **THEN** the workbook opens the Working copy view for that question without sending a request with the malformed value

### Requirement: SQ-06 Historical navigation and attempt summary

In the historical views, Previous/Next and the position SHALL follow the selected attempt's pinned question order and SHALL keep the view and attempt. On the last question, Next SHALL become Attempt summary, a read-only all-question page of that attempt that offers no submission. Navigation SHALL NOT submit or change the working copy. [UI-05, SW-08]

#### Scenario: Next keeps context

- **WHEN** a student in Released feedback for attempt A on question 1 chooses Next
- **THEN** question 2 opens in Released feedback for attempt A, both panes update together and focus moves to the question heading

#### Scenario: Attempt pinned to an earlier version

- **WHEN** the selected attempt is pinned to an earlier publication with a different question list
- **THEN** both panes, the position and Previous/Next follow that earlier publication, and no current-version question is shown with that attempt's source

#### Scenario: End of a historical attempt

- **WHEN** the student reaches the last question in a historical view
- **THEN** Next reads Attempt summary, it opens the read-only summary, and no Review assignment or submit action is offered

### Requirement: SQ-07 Overview entry point

The assignment overview SHALL keep Open my work. When the student has at least one attempt for the assignment, it SHALL add one link to question 1 of the latest attempt. The link SHALL read View released feedback when that attempt has a current release, and View latest submission otherwise. With no attempts, or when the history cannot be read, no link SHALL be shown and the rest of the overview SHALL be unaffected. [SD-03, SF-07]

#### Scenario: Latest attempt has feedback

- **WHEN** the latest attempt has a current release
- **THEN** the overview shows View released feedback, which opens question 1 in Released feedback for that attempt

#### Scenario: History read fails

- **WHEN** the history request fails on the network
- **THEN** the overview renders without the extra link and Open my work still works
