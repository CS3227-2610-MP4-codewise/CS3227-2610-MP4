# Workbook experience delta

## Purpose

Give students and instructors a consistent, accessible workbook that keeps questions, versioned source and reviewed feedback in context without weakening authorization or submission boundaries.

## ADDED Requirements

### Requirement: UI-01 Consistent warm workbook identity
Application screens SHALL follow `docs/ui/design.md` revision `warm-workbook-v1`: warm paper/ink/terracotta surfaces, proportional interface text, restrained serif headings and monospaced source. Layout SHALL prioritize the current task and version context. Intentional departures SHALL have an explicit reviewed design revision.

#### Scenario: A role screen is added
- **WHEN** a student or instructor screen is presented
- **THEN** its tokens, typography, controls and states follow the shared design contract rather than an unrelated screen-specific theme.

#### Scenario: Appearance changes
- **WHEN** the user changes between light and dark appearance
- **THEN** the warm identity, readable content, visible selection and accessible focus remain intact.

### Requirement: UI-02 Sign-in and session recovery
The interface SHALL provide a sign-in page using the approved maintained identity integration, clear pending/cancelled/failed/expired states and logout. It SHALL restore only a validated, authorized local destination after successful sign-in. Sign-in SHALL NOT provision a role from a browser selection.

#### Scenario: Unauthenticated destination
- **WHEN** a visitor requests a protected workspace without a valid session
- **THEN** sign-in is requested without displaying protected data and successful authentication rechecks authorization before returning to that destination.

#### Scenario: Provider cancellation or failure
- **WHEN** sign-in is cancelled or fails
- **THEN** a safe retry path is available, no authenticated state is fabricated and account existence or provider internals are not disclosed.

#### Scenario: Expiration with unsaved work
- **WHEN** a session expires while a draft has unacknowledged edits
- **THEN** the interface requests sign-in, does not label those edits saved and offers recovery according to the approved identity/storage contract without exposing another user's source.

### Requirement: UI-03 Authorized role workspace switch
Where trusted context permits both workspaces, the interface SHALL use a keyboard-operable Student/Instructor switch with visible labels and synchronized accessible state. A single-role context SHALL display its role without an enabling switch. Switching SHALL preserve unsaved-work recovery and SHALL NOT change server membership or expose inaccessible data.

#### Scenario: Dual-role workspace selection
- **WHEN** an authorized dual-role user toggles the switch by pointer or Space
- **THEN** the authorized workspace and accessible checked state change together, context is announced and focus moves to the new workspace heading.

#### Scenario: Forged or revoked role
- **WHEN** browser state selects an instructor workspace without current trusted permission
- **THEN** protected operations remain denied, private data is absent and the interface returns to an authorized context with a clear message.

#### Scenario: Single-role user
- **WHEN** trusted context permits only one workspace
- **THEN** the current role is shown without an operable switch that implies access to the other role.

### Requirement: UI-04 Version-aware question and work surfaces
The workbook SHALL keep the published question and relevant work together, with distinct Working copy, Submitted attempt and Released feedback views for students. Submitted source SHALL remain read only. Instructor review SHALL show submitted source with rubric and assessment revision; student drafts and private assessment content SHALL remain restricted to their authorized owners.

#### Scenario: Working copy edited after submission
- **WHEN** a student edits a draft and reopens a submitted attempt
- **THEN** the exact submitted snapshot remains unchanged and returning to the working copy preserves its recoverable edits.

#### Scenario: Instructor reviews an attempt
- **WHEN** an instructor opens an authorized submission
- **THEN** submitted source, rubric and assessment version are identifiable, private AI suggestions are labelled as drafts and approval and release remain separate actions.

### Requirement: UI-05 Explicit question navigation and assignment review
The workbook SHALL provide Previous/Next question navigation and position in pinned published order. Navigation SHALL preserve recoverable drafts and historical attempt context without submitting. The first Previous SHALL be disabled; the final Next SHALL become Review assignment or an attempt summary for historical views. Submission SHALL require separate confirmation of all question revisions.

#### Scenario: Next question with a failed save
- **WHEN** the user chooses Next while the current draft save has failed
- **THEN** the interface retains the text and offers explicit retry/recovery or local-retention navigation without falsely confirming a save or silently losing changes.

#### Scenario: End of assignment
- **WHEN** a student reaches the final question in the working-copy flow
- **THEN** Review assignment presents all answers and their revisions and no attempt is created until the separate assignment submission is confirmed.

#### Scenario: Historical feedback navigation
- **WHEN** the user navigates to another question while viewing a historical attempt
- **THEN** both panes show the new question in that same attempt/version context and never substitute current draft source.

### Requirement: UI-06 Source-linked margin observations
Feedback SHALL link each valid observation to exact logical source lines of its assessment's attempt. Selecting a marked line or equivalent observation control SHALL update the highlight and proportional-text note, retain trigger focus and announce the changed note. Students SHALL receive only released public feedback; unavailable evidence SHALL be identified without fabricated locations.

#### Scenario: Observation selected
- **WHEN** a keyboard or pointer user selects a source observation
- **THEN** its criterion, explanation and exact source range appear with a non-color-only indicator and the selected trigger retains focus.

#### Scenario: Missing source match
- **WHEN** an annotation cannot be matched to the pinned source
- **THEN** an unavailable-evidence state is shown without attaching it to another line or newer draft.

### Requirement: UI-07 Responsive and accessible interaction
Essential content and actions SHALL remain usable at 320px width and 200% zoom with keyboard navigation, visible focus, labeled controls and text-based states. Narrow layouts SHALL stack question and work, retaining question access and navigation. Touch targets SHALL be at least 44px. Source formatting SHALL remain legible and reduced-motion preferences SHALL be respected.

#### Scenario: Narrow workbook
- **WHEN** the workbook is used at 320px width
- **THEN** question access, answer views and Previous/Next remain available without page-wide horizontal overflow, while any source-only scroll region is explicitly identified.

#### Scenario: Keyboard use at increased zoom
- **WHEN** a user operates sign-in, role switch, question navigation and source observations by keyboard at 200% zoom
- **THEN** focus stays visible, reading order remains meaningful and no essential action depends on hover, dragging or color alone.

### Requirement: UI-08 Truthful asynchronous and empty states
The interface SHALL distinguish loading, empty, denied, unsaved, saving, acknowledged saved, conflict, failed and action-pending states. It SHALL show success only for the acknowledged revision/action, preserve recoverable text on failure and prevent duplicate pending actions. Disabled AI SHALL NOT block independent editing or manual assessment, and the UI SHALL NOT imply source execution.

#### Scenario: Stale save acknowledgement
- **WHEN** an older save succeeds after newer edits or question navigation
- **THEN** it does not label the newer source saved or overwrite the newly selected question.

#### Scenario: Feedback not released
- **WHEN** a student has no released feedback for an attempt
- **THEN** an honest empty state is shown without private draft content or invented assessment results.

#### Scenario: AI unavailable
- **WHEN** AI is disabled, fails or is unavailable
- **THEN** the interface offers the permitted retry/manual path and independent editing or manual assessment remains available.
