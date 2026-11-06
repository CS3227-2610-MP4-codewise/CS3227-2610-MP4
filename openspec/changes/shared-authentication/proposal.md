# Shared authentication producer

## Review follow-up — 2026-11-06

After implementation, Darryl requested invitations without expiry and asked about NUS-only/institutional sign-in, explicitly instructing no implementation of those changes yet. This PR preserves the previously approved Google + 24-hour invitation implementation for review. Non-expiring invitations are the requested future policy; the NUS provider/admission choice remains proposed, not confirmed. Neither change is implemented or covered by the recorded passing tests. Final manual acceptance, real Google and Keith integration remain pending. Commit/push/PR authorization is separate from feature or policy acceptance.

## Why

The merged instructor feature still relies on synthetic identity. Darryl's approved SH-AUTH slice must establish real identity/sessions without duplicating Keith's courses, memberships or object authority (AUTH-01–AUTH-03, CON-03/CON-07).

## What Changes

- Google OIDC through maintained openid-client6.8.9, server-side code/PKCE/state/nonce validation and invitation-only first account creation. One D1 issuer/subject account/session store.
- Approved24-hour single-use invitations managed in-app by trusted authentication administrators: create, copy once, list status and revoke; manually send links. No email provider or public signup. Operator bootstrap is outside browser roles and course authority.
- Secure opaque sessions,30-minute idle/8-hour absolute expiry, logout/revocation, origin/CSRF guards and safe return-destination authorization composition. Missing Keith producer means a signed-in/unavailable workspace, never synthetic memberships.
- Warm-workbook-v1 sign-in, onboarding and invitation management with pending/cancel/error/expired states; UI-01/UI-02/UI-07/UI-08. Reuse existing C-ID session schema and safe errors; supply exact producer handoff and reusable checks.

## Capabilities

### New Capabilities
- `shared-authentication`: SH-AUTH identity, invitations, sessions, secure transport and role-free workspace handoff, specializing existing AUTH/CON/UI requirements.

### Modified Capabilities
None under canonical openspec/specs. Reuse existing in-flight C-ID/MVP/UI requirements rather than duplicate or weaken Keith's boundary.

## Impact

Base main2d8a861; branch codex/shared-authentication. Darryl approved Google/invite/session policy and added in-app invitation management before approving implementation. Exact single-writer window is recorded in workflow/Ownership.md. Product auth modules, API/web entry wiring, next0003 migration, minimal dependency/binding support and scoped workflow/docs/log/evidence are included. No Keith services, course/role tables, CI/deployment workflows, email delivery, auth-admin self-enrollment or provider-global logout. Live Google credentials/callback verification and Keith revised-boundary review remain pending unless actually supplied; no deployment authorized.
