# Course onboarding

## Purpose

Enable trusted instructors to create courses and invite new or registered students and instructors into the same authoritative account, with explicit acceptance and authorized dashboard selection.

## ADDED Requirements

### Requirement: COU-01 Persistent first-admin authority
The system SHALL recognize the operator-pinned starting account `instructor@u.nus.edu` as the first admin and permit its instructor workspace and course creation without a pre-existing course membership. First-admin status SHALL persist across deployments, grant no access to unrelated courses and never arise from an email string, shared default password, invitation or browser role. Existing owner credential and mailbox-verification safeguards SHALL remain in force. (AUTH-01–03, SHA-12)

#### Scenario: Empty hosted first-admin workspace
- **WHEN** the trusted first admin signs in to an environment containing no assigned course
- **THEN** the instructor dashboard offers Create course rather than requiring manual database setup to proceed.

#### Scenario: Forged or replayed bootstrap
- **WHEN** another account uses the same display email, a browser admin flag, an instructor invitation or completed bootstrap is replayed
- **THEN** no first-admin authority or access to another instructor's course is granted.

### Requirement: COU-02 Instructor-created courses
The system SHALL allow the first admin and current trusted instructors to create a named course and atomically receive instructor membership in that new course. The course SHALL appear in the instructor dashboard only after acknowledged persistence. Course creation SHALL require current session/creator authority and origin/CSRF validation; retries SHALL NOT create duplicate courses. Student-only accounts SHALL NOT create courses. (AUTH-02/03, UI-01/04/08)

#### Scenario: Successful or retried course creation
- **WHEN** an authorized creator confirms a valid course name, including retry after an uncertain response
- **THEN** exactly one course and its creator instructor membership persist together and the acknowledged course can be opened without a deployment or operator action.

#### Scenario: Partial or unauthorized creation
- **WHEN** a student-only/expired/revoked identity requests creation, CSRF is invalid, or either atomic write fails
- **THEN** no orphan course, partial privilege or false success appears.

### Requirement: COU-03 Role-targeted course invitations
Every current course instructor SHALL be able to send/track Student or Instructor NUS-email invitations bound to recipient, course and role on the server. Invitations SHALL remain pending until accepted/revoked, without admission expiry. Delivery SHALL remain distinct from acceptance. Instructor invitations SHALL grant no account administration or unrelated-course access. (AUTH-02/03, SHA-02/03/10)

#### Scenario: Instructor invites another instructor
- **WHEN** a currently authorized instructor selects Instructor and sends an invitation for a course they teach
- **THEN** a scoped instructor invitation is recorded with honest mail status and can be accepted by its intended recipient.

#### Scenario: Forged course or target role
- **WHEN** a student, former instructor or unrelated-course user changes the requested course/role
- **THEN** no unauthorized invitation or mail is issued and no recipient data is disclosed.

#### Scenario: Same recipient receives both roles
- **WHEN** current course instructors invite the same email to Student and Instructor roles for the same course
- **THEN** the list shows one recipient entry with both roles; accepting either current link explicitly displays and atomically grants the currently invited roles. Re-entering the same role SHALL NOT produce another list entry. A revoked invitation or an inviter without current authority SHALL NOT grant a role. [COU-03/05/07]

### Requirement: COU-04 Account-aware invitation entry
For either invited role, the system SHALL require mailbox-bound password setup for unregistered recipients and existing-password sign-in for registered recipients. Prior invitation alone SHALL NOT count as registration. It SHALL preserve one authoritative identity/password and renew expired proofs without expiring the pending invitation. (AUTH-01/03, SHA-01/02/05/08/09/11, UI-02/08)

#### Scenario: First invitation or previously unaccepted invitation
- **WHEN** the intended recipient has not completed registration, even if invited before
- **THEN** they are prompted to choose a password and complete verified setup before course acceptance; concurrent invitations resolve to one admitted account.

#### Scenario: Registered recipient returns through an invitation
- **WHEN** a registered recipient follows a new Student or Instructor invitation
- **THEN** they authenticate using their existing password without resetting/replacing it, then continue to acceptance for the exact invited course/role.

#### Scenario: Already signed in as the registered recipient
- **WHEN** a registered recipient follows a new invitation while already signed in
- **THEN** the join form confirms their existing password before the new role is accepted; it never asks them to choose a replacement password or joins on GET.

#### Scenario: Wrong account or expired proof
- **WHEN** a different account is signed in or the short-lived setup proof has expired
- **THEN** the invite is not consumed and no membership is granted; the UI offers correct-account sign-in or safe proof renewal without treating the invitation itself as expired.

#### Scenario: Existing provider identity without a local account
- **WHEN** an invited mailbox already has a Firebase identity but no admitted Codewise account in this environment
- **THEN** the recipient SHALL prove mailbox control and explicitly choose to authenticate with the existing password or reset it; the system SHALL NOT reset an existing password without that choice or bind an identity based on email alone. [COU-04/05, SHA-05/08/11]

### Requirement: COU-05 Atomic authenticated course acceptance
The system SHALL atomically/idempotently accept a current invitation and add the exact displayed set of currently invited course-role memberships after intended-recipient authentication and current inviter authorization. It SHALL preserve existing roles and show the course after acknowledgement. Invitation-aware setup/sign-in submission SHALL serve as explicit acceptance; ordinary sign-in or GET alone SHALL grant nothing. (AUTH-02/03, SHA-02/03, UI-04/08)

#### Scenario: Recipient accepts or retries
- **WHEN** the intended new or existing account authenticates and confirms a current invitation, including a retry after an interrupted response
- **THEN** the current invitations are acknowledged and the exact displayed course-role memberships result, other memberships remain and the course becomes available without another invite or deployment.

#### Scenario: Scanner, revocation or changed inviter
- **WHEN** a scanner opens GET, the invitation is revoked/replayed by another account, or the inviter loses instructor authority before acceptance commits
- **THEN** no new access is granted, an existing valid membership is not removed and the UI reports the actual pending/denied/already-accepted state.

### Requirement: COU-06 Authorized dual-role dashboard switch
The system SHALL preserve both roles and show a top keyboard-operable Student/Instructor switch when trusted account context permits both dashboards. First-admin creator authority SHALL permit Instructor before course creation. Each dashboard SHALL list only its authorized courses, even when roles differ by course. Switching SHALL preserve unsaved-work recovery without changing authority. (AUTH-02/03, UI-01/03/04/07/08)

#### Scenario: Instructor accepts first student role
- **WHEN** an instructor or first admin accepts a Student invitation for the first time
- **THEN** the same account gains the authorized Student dashboard, retains Instructor access and sees the top switch without another registration.

#### Scenario: Student accepts first instructor role
- **WHEN** a student accepts an Instructor invitation for the first time
- **THEN** the same account retains Student access, gains the appropriate Instructor dashboard and sees the top switch; the new instructor can create courses and invite instructors within their taught courses.

#### Scenario: Roles differ by course or unsaved work exists
- **WHEN** a dual-role user changes dashboards, including during unsaved work
- **THEN** recovery is offered before navigation, the new heading/context is announced, only that role's courses appear and being an instructor in one course grants no instructor access to a student-only course.

### Requirement: COU-07 Current authority after revocation
The system SHALL re-evaluate role/workspace eligibility and course access after membership, inviter, account or session revocation. Previously available switches, invitation receipts, cached lists or browser preferences SHALL NOT preserve revoked authority. Loss of one role SHALL leave other valid memberships intact and return the user to an authorized dashboard without leaking the previous role's private content. (AUTH-01–03, UI-03/08)

#### Scenario: Last role membership is revoked
- **WHEN** the user's last Instructor or Student entitlement is revoked
- **THEN** the unavailable workspace is removed from current trusted context, stale selections cannot retrieve protected data and any remaining authorized dashboard is still usable.
