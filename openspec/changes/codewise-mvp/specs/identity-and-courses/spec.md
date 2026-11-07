## ADDED Requirements

### Requirement: AUTH-01 Authenticated sessions
The system SHALL authenticate users through a maintained identity integration and protect server-side sessions with expiration, secure transport, and logout invalidation. Cookie sessions SHALL use Secure, HttpOnly, appropriate SameSite settings, and CSRF protection for state changes.

#### Scenario: Expired session
- **WHEN** a session expires or is revoked
- **THEN** protected requests fail without exposing course data and the interface requests sign-in.

#### Scenario: Cross-site mutation
- **WHEN** a cookie-authenticated mutation lacks required origin/CSRF validation
- **THEN** the server rejects it without changing data.

### Requirement: AUTH-02 Course and object authorization
The server SHALL derive roles and memberships from trusted records and authorize every read, write, export, and AI request against its course and object. Students SHALL access only their own drafts, submissions, and released assessments; instructors SHALL access only their assigned courses.

#### Scenario: Student guesses another submission ID
- **WHEN** a student requests another student's submission or AI result
- **THEN** access is denied before database content is passed to any model.

#### Scenario: Instructor crosses course boundary
- **WHEN** an instructor requests a course they do not teach
- **THEN** the request is denied, even if they know a valid object identifier.

### Requirement: AUTH-03 Trusted role provisioning
The system SHALL restrict instructor/membership provisioning to trusted first-admin setup or current-course-instructor invitations with authenticated acceptance. It SHALL permit first-admin/current-instructor course creation under COU-01–07. Client roles SHALL grant no authority; membership revocation SHALL apply on subsequent protected operations.

#### Scenario: Self-promotion
- **WHEN** a student changes a request field or client state to instructor
- **THEN** server permissions remain unchanged.

#### Scenario: Membership revoked during AI work
- **WHEN** a user loses course membership before an AI result is read
- **THEN** the result read is denied despite the earlier authorized request.
