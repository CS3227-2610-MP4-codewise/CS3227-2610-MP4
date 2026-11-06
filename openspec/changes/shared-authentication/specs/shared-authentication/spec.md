# Shared authentication

## Purpose

Establish trusted, invite-only account identity and sessions for both Codewise roles without granting course authority or inventing unavailable integrations.

## ADDED Requirements

### Requirement: SHA-01 Verified provider identity
The system SHALL authenticate through the approved maintained Google integration, validate browser-bound one-use login transactions and map accounts by issuer/subject. Provider secrets/tokens SHALL remain server-only (AUTH-01, CON-03).

#### Scenario: Valid and invalid provider responses
- **WHEN** a callback has valid code/PKCE/state/nonce/issuer/audience/signature/expiry, or any check fails
- **THEN** only the valid browser-bound callback can proceed; failed/replayed/cross-browser callbacks create no account/session and expose no provider details.

### Requirement: SHA-02 Trusted invitation onboarding
First account creation SHALL require a matching verified provider email and an unexpired/unrevoked one-use24-hour invitation. Redemption/account mapping/session creation SHALL be atomic, with no email-based account linking or course-role grant (AUTH-03).

#### Scenario: Competing redemption or disabled account
- **WHEN** callbacks race for one invitation, the invitation is revoked/expired before commit, or an existing account is disabled
- **THEN** at most one permitted identity is created; denied callbacks create no partial account/session or new privileges.

### Requirement: SHA-03 Administrator invitation management
Only currently trusted auth administrators SHALL create/copy-once/list-status/revoke invitations in-app. Raw invitation tokens SHALL never be stored or returned from list endpoints. Trusted operator bootstrap SHALL target verified identities, never browser roles (AUTH-03, UI-08).

#### Scenario: Admin authority revoked or forged
- **WHEN** an instructor/client role or revoked auth administrator tries to manage invitations
- **THEN** the operation is denied before invitation data or bearer links are disclosed; ordinary course rights do not confer auth administration.

### Requirement: SHA-04 Secure revocable sessions
Sessions SHALL use Secure/HttpOnly/host-only cookies,30-minute idle and8-hour absolute expiry and server-side revocation. Conditional touches SHALL never revive revoked/expired sessions. Logout SHALL invalidate the current Codewise session (AUTH-01).

#### Scenario: Expiry and revoke race
- **WHEN** an expired/revoked/disabled session is read, or touch races logout/revocation
- **THEN** subsequent protected access fails; the absolute expiry never extends and no expired session becomes active again.

### Requirement: SHA-05 Origin and CSRF guards
Cookie-authenticated mutations SHALL validate exact configured Origin and session-bound CSRF. Login transactions SHALL be time-bounded and replay resistant. Account/session/invitation bearers SHALL not leak into logs, caches or return URLs (AUTH-01/02).

#### Scenario: Forged mutation or link scanner
- **WHEN** a cross-site/forged mutation or a GET invitation probe occurs
- **THEN** no invitation is redeemed, account promoted or session changed; unsafe requests fail without private data.

### Requirement: SHA-06 Authorized workspace handoff
Only validated local return destinations SHALL be retained. Protected destinations SHALL be reauthorized through Keith's injected interface before data is shown. Missing authorization SHALL yield an honest unavailable workspace without invented memberships (AUTH-02, CON-03/07).

#### Scenario: Safe identity with missing authorization
- **WHEN** sign-in succeeds but the course/object producer is absent or denies the intended path
- **THEN** the signed-in user sees an unavailable/denied state with no protected payload; a forged role or external return path cannot grant access.

### Requirement: SHA-07 Warm-workbook authentication states
Sign-in/onboarding/invitation administration SHALL preserve warm-workbook-v1, labelled controls, keyboard/responsive flows and truthful ready/pending/cancel/error/expired/denied states. New handoffs SHALL distinguish fixtures from live Google and Keith integration (UI-01/02/07/08, CON-07).

#### Scenario: Provider unavailable or cancelled
- **WHEN** configuration is missing, the provider cancels/fails, a session expires or invitation management fails
- **THEN** the UI safely explains the state, prevents duplicate actions and provides recovery without claiming sign-in, invitation or workspace success.
