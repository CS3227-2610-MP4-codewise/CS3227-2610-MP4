# Student assignment dashboard

## Purpose

Let students discover their authorized courses and published assignments, then inspect an exact published version before editing and submission features are available.

## ADDED Requirements

### Requirement: SD-01 Authorized student course discovery
The dashboard SHALL consume trusted workspace contexts, list only current Student memberships and support bounded course pagination without granting authority through browser state. Authentication, role discovery and membership storage SHALL remain shared. [AUTH-01–03, COU-06/07, UI-02/03]

#### Scenario: Roles differ between courses
- **WHEN** an account is a Student in course A and an Instructor only in course B
- **THEN** the Student dashboard lists A and excludes B, while the existing Instructor workspace remains available through trusted role selection.

#### Scenario: Many course memberships
- **WHEN** more than 100 Student memberships exist
- **THEN** the student can traverse all authorized course pages in producer ID order, with at most 100 course rows displayed per page and each page fetched with current authority.

#### Scenario: No Student entitlement or course removed
- **WHEN** trusted contexts omit Student or current authorization rejects a selected course
- **THEN** the interface clears inaccessible student content and offers an authorized workspace or an honest no-access state without creating membership.

### Requirement: SD-02 Published assignment discovery
For an authorized course, the system SHALL list only the latest published version of each logical assignment, with its title, UTC-labelled deadline and an explicit overview action. It SHALL retain past-deadline assignments, sort by deadline ascending then assignment ID, and provide pages of at most 50 rows. [SUB-01/04, UI-01/08]

#### Scenario: Draft or republished assignment
- **WHEN** a course contains an unpublished draft and an assignment published twice with later unsaved author edits
- **THEN** the list excludes the draft and shows one row from the second immutable publication, unaffected by current draft fields.

#### Scenario: Equal deadlines and past deadlines
- **WHEN** assignments have past or equal deadlines
- **THEN** past deadlines remain visible, equal deadlines use assignment ID order, and the dashboard makes no claim about submission eligibility or deadline equality rules.

#### Scenario: Bounded pagination and refresh
- **WHEN** a student changes assignment pages or refreshes after republication
- **THEN** each page contains at most 50 unique assignments from current authorized data; new publications appear on refresh and navigation does not promise a snapshot across concurrent publication changes.

### Requirement: SD-03 Exact publication overview
Opening an assignment SHALL show a read-only overview of the selected immutable publication: title, deadline, version identity and ordered public questions with instructions, Python starter text and rubric guidance. Reload SHALL retain that version while access remains authorized. It SHALL offer no editing, submission or execution action. [SUB-01, UI-04]

#### Scenario: Publication changes while overview is open
- **WHEN** the instructor republishes an assignment after the student opened version V1
- **THEN** the open overview and its reload remain V1, including question/rubric version context; a refreshed listing can open V2 separately without replacing V1.

#### Scenario: Direct link or missing version
- **WHEN** a version link is opened directly, is malformed, is missing or belongs to an inaccessible course
- **THEN** the system rechecks session and course/object access, serves only the authorized exact version, or shows a safe unavailable state without substituting a different version.

#### Scenario: Unsafe instruction content
- **WHEN** a publication contains plain text or supported formatted instructions with unsafe embedded markup
- **THEN** original plain-text meaning is preserved and supported formatting is rendered under the reviewed versioned contract without script execution, unsafe URLs or private fields.

### Requirement: SD-04 Public data and current authorization
Every listing and overview read SHALL enforce current session, Student course membership and applicable object authorization, using allowlisted public fields and no-store responses. Student payloads, DOM and persistent browser storage SHALL exclude instructor drafts, private references, unreleased assessments and unsupported learner-status claims. [AUTH-01–03, COU-07, UI-08]

#### Scenario: Forged course, cursor or role
- **WHEN** a user forges a course/version ID, pagination cursor, role preference or request field
- **THEN** none grants access and no protected content or private metadata is disclosed; instructor-only course membership is insufficient for Student reads.

#### Scenario: Membership or session revoked
- **WHEN** access is revoked before a subsequent protected read or revalidation
- **THEN** the read fails closed, the client clears affected content and cached browser navigation cannot restore access without fresh validation.

#### Scenario: No submission producer
- **WHEN** the dashboard receives public publication data without authoritative learner status
- **THEN** it omits Not started, Submitted, Graded and feedback/progress badges rather than inferring them from missing data.

### Requirement: SD-05 Recoverable student navigation
The dashboard SHALL reuse the shared authorized role switch, support course/list/overview navigation and safe local return after sign-in, reject stale asynchronous results and distinguish loading, empty, denied, expired-session and network failure. It SHALL preserve existing unsaved-work cancellation when entering or leaving another workspace. [COU-06/07, UI-02/03/08]

#### Scenario: Single and dual roles
- **WHEN** trusted context changes between single-role and dual-role eligibility
- **THEN** the existing shared switch is omitted or enabled accordingly, pointer/Space updates its accessible state, and destination heading focus and announcement match the authorized workspace.

#### Scenario: Navigation races a failed request
- **WHEN** an older course/list/overview response arrives after navigation or a role change
- **THEN** it cannot overwrite the current destination or restore cleared content; retry and pending controls remain scoped to the selected destination.

#### Scenario: Empty, failure and session recovery
- **WHEN** an authorized course has no publications, a request fails, or the session expires
- **THEN** the interface distinguishes these states, offers appropriate retry or existing sign-in, and restores only a validated local authorized destination without exposing previous-account content.

#### Scenario: Dirty instructor workspace
- **WHEN** entering Student would leave unsaved instructor work and the user cancels the existing recovery prompt
- **THEN** navigation is cancelled, the current work and role selection remain intact and no student response replaces the instructor view.

### Requirement: SD-06 Accessible workbook presentation
The course list, assignment list and overview SHALL follow warm-workbook-v1 using shared tokens, ruled rows, labelled actions and visible version context. They SHALL support keyboard operation, both appearances, 320px width, 200% zoom, 44px touch targets and reduced motion without essential hover-only controls. [UI-01/04/07/08]

#### Scenario: Narrow and zoomed browsing
- **WHEN** a student browses by keyboard at 320px or 200% zoom
- **THEN** headings, deadlines, page navigation and overview actions remain readable and operable with visible focus and no page-wide horizontal overflow; source-only scrolling is labelled.

#### Scenario: Read-only overview boundary
- **WHEN** the student opens the overview in either appearance
- **THEN** ordered published content and version labels are readable, no Working copy or Submit controls imply unavailable features, and feedback/progress panels are absent.
