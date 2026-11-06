# Shared authentication

## Purpose

Establish instructor-invited NUS email/password identity through Firebase, Brevo invitations and secure recovery while preserving stable identity/session and Keith course/object boundaries. Darryl selected this target on 2026-11-06; implementation and real integration are not yet verified.

## ADDED Requirements

### Requirement: SHA-01 Firebase-backed invited identity
The system SHALL authenticate active admitted NUS accounts using Firebase email/password, key identity by configured project and UID, preserve stable Codewise IDs and grant no course roles (AUTH-01/03, CON-03).

#### Scenario: Correct credentials or unsolicited provider account
- **WHEN** a permitted account signs in, or an unsolicited Firebase UID/browser role/email match requests access
- **THEN** only the admitted verified UID receives a session; wrong/disabled/unadmitted identities are denied without automatic email linking.

### Requirement: SHA-02 Non-expiring invitation admission
The system SHALL require an instructor-issued email-bound, single-use, revocable pending invitation for new admission. Pending invitations SHALL remain valid until accepted/revoked; separate provider proofs may expire (AUTH-03).

#### Scenario: Delayed invitation and racing acceptance
- **WHEN** a pending invitation is opened weeks later, a scanner performs GET, or confirmations race
- **THEN** GET consumes nothing, admission remains eligible, expired proof can be renewed and at most one account acceptance commits; no membership is created.

### Requirement: SHA-03 Current instructor authority
The system SHALL authorize send/list/resend/revoke through Keith's current C-ID instructor/course producer and scope records to trusted inviter/course. Missing authority SHALL fail before recipient records or mail (AUTH-02/03, CON-03/07).

#### Scenario: Missing or forged instructor
- **WHEN** the producer is absent, a browser forges roles or another instructor requests records
- **THEN** actions are unavailable/denied without mail, recipient disclosure or invented memberships; auth-admin flags grant no instructor permission.

### Requirement: SHA-04 Secure sessions and provider revocation
The system SHALL retain host-only Secure/HttpOnly opaque sessions, 30-minute idle/eight-hour absolute expiry, rotation/logout/revocation, current local account checks and current Firebase credential/revocation checks. Provider reset/disable/revocation SHALL prevent subsequent session access (AUTH-01).

#### Scenario: Reset races session use
- **WHEN** local or external reset/disable/revocation occurs, or the provider cannot confirm current validity
- **THEN** invalid cookies cannot access protected data or be revived; unknown provider status fails closed and recovery requires fresh login.

### Requirement: SHA-05 Origin, proof and secret protection
The system SHALL enforce Origin/CSRF on cookie/preauth mutations, distributed admission limits, bounded bodies/provider calls, reviewed single-use proofs and server-only credentials. No password hashing/storage SHALL be duplicated in D1 (AUTH-01/02).

#### Scenario: Forged or unsupported operation
- **WHEN** a cross-site mutation, browser verification claim, replayed proof or absent provider configuration arrives
- **THEN** no account/session/invitation privilege is created and no password/token/provider secret is logged or persisted in the browser.

### Requirement: SHA-06 Authorized workspace handoff
The system SHALL validate local return destinations and reauthorize them through Keith's interface before protected data. Missing course authority SHALL show honest unavailable workspace (AUTH-02, CON-03/07).

#### Scenario: Identity without course producer
- **WHEN** sign-in succeeds while destination authority is unavailable or denies access
- **THEN** no protected payload or fabricated membership appears and external return URLs are rejected.

### Requirement: SHA-07 Warm-workbook flows
The system SHALL preserve warm-workbook-v1 with an approved provider-backed password/recovery policy addendum, labelled accessible controls and truthful pending/cancel/error/expired-proof/unavailable states (UI-01/02/07/08).

#### Scenario: Interrupted or unavailable setup
- **WHEN** mail configuration is absent, a request times out or an action expires
- **THEN** the UI offers safe retry/cancel/recovery without claiming sign-in, acceptance, delivery or saved password prematurely.

### Requirement: SHA-08 Mailbox-bound password setup
The system SHALL bind password setup to current invitation, intended Firebase UID/email and a valid mailbox proof, preventing activation of another browser's pre-staged password. Successful provider confirmation SHALL precede atomic local acceptance; ambiguous cross-service outcomes SHALL grant no session (AUTH-01/03).

#### Scenario: Pre-hijack, revoked admission or partial failure
- **WHEN** another actor staged credentials, an invitation is revoked during setup, or provider completion/local acceptance is uncertain
- **THEN** the recipient can securely restart/recover, no staged password is admitted and only confirmed current admission activates a stable identity.

### Requirement: SHA-09 Provider-backed password recovery
The system SHALL provide generic reset-request acknowledgement, bounded consistent cooldown and Firebase single-use expiring recovery proof for active admitted accounts only. Confirmation SHALL verify purpose/email and invalidate local sessions without creating/reactivating accounts (AUTH-01, CON-07).

#### Scenario: Replay, unknown email or external reset
- **WHEN** an unknown/disabled account requests recovery, a proof expires/is replayed or reset occurs outside the app
- **THEN** no account existence/provider internals are disclosed; invalid proof changes nothing and old credentials/cookies cannot retain app access after reset.

### Requirement: SHA-10 Brevo invitation audit
The system SHALL send instructor invitations through server-only Brevo with approved sender and scoped audit. Pending/accepted/revoked invitation state SHALL remain distinct from queued/failed/unknown send attempts (AUTH-02/03, UI-08, CON-07).

#### Scenario: Queue acknowledgement or ambiguous timeout
- **WHEN** Brevo acknowledges, times out or the recipient accepts
- **THEN** tracking distinguishes queue acceptance from delivery/read and invitation acceptance; retries retain audit identity with bounded capability rotation and no duplicate accounts.
