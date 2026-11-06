# Shared authentication tasks

AUTH-01–03, CON-03/07, SHA-01–07; warm-workbook-v1 UI-01/02/07/08. Approved Google/invite/session/admin UI scope; live provider and Keith integration are not claimed from fixtures.

## 1. Approved boundary and primitives
- [x] 1.1 Record Darryl approval, admin-UI refinement, exact exclusive shared-file/migration window and existing C-ID reuse before product edits; verify branch/ownership records (AUTH-03, CON-03).
- [x] 1.2 Implement strict auth UI/request projections, cookie/hash/CSRF/origin and safe-return/config primitives; verify malformed/forged/unsafe URL/cookie cases and document runtime contracts (SHA-04/05/06).

## 2. Authoritative identity/session producer
- [x] 2.1 Add0003 and D1 repository with atomic mapping/redemption/session commit, admin checks, transaction consumption and conditional expiry/touches; verify actual D1 restart/race/rollback/constraints and no course tables (SHA-01–05).
- [x] 2.2 Integrate maintained Google code/PKCE/state/nonce flow and route composition with fail-closed missing config; verify signed synthetic provider failures, cancellation/replay/cross-browser handling and token privacy; document live setup pending (SHA-01/02/05).
- [x] 2.3 Implement session/logout/revoke/disable semantics and guarded mutations; verify expiry boundaries, CSRF/origin denial, touch/revocation races and cookie flags against real local D1 (SHA-04/05).

## 3. Provisioning and shared handoff
- [x] 3.1 Implement admin-only create/copy-once/list-status/revoke and trusted local operator bootstrap/revocation helper; verify current admin rechecks, verified-identity-only grant, invite races/expiry/revocation and no course-role escalation; document commands (SHA-02/03).
- [x] 3.2 Compose existing C-ID producer with injected Keith destination authorization, closed session projection and fail-closed absent authorization; deliver reusable conformance examples/checks, verify private reader is never called on denial (CON-03/07, SHA-06).

## 4. Authentication and admin UI
- [x] 4.1 Implement warm-workbook sign-in/invite/admin/unavailable workspace states with duplicate prevention, fragment clearing, one-time copy and safe recovery; verify focused UI/controller checks and no browser-role authority (SHA-03/07, UI-01/02/08).
- [ ] 4.2 Exercise actual local-D1 UI in explicit guarded synthetic-provider preview, keyboard/responsive/appearances/text sizing and screenshot evidence; fill UI-review template honestly, production provider remains real-only (SHA-07, UI-07/08).

## 5. Independent review and verification
- [x] 5.1 Obtain independent read-only authentication/security/UI review and focused repair re-review; record actual findings, tests and limits (AUTH-01–03).
- [x] 5.2 Run npm run check, auth conformance/adversarial tests, Worker dry-run and unchanged secret scanner; record exact verification/resource checkpoint and deployment limits (CON-07, SHA-01–07).
- [ ] 5.3 Complete log/evidence/Keith handoff with exact producer source revision, synthetic examples, accepted versus pending boundaries and manual checklist; obtain Darryl final manual acceptance, leaving live Google/Keith/deployment verification pending if unavailable (UI-08, CON-07).

## Workflow follow-up
- Real Google OAuth app credentials/callback verification, Keith's revised-boundary review and real SH-ID producer are explicit integration gates, not synthetic successes.
- No commit/push/merge/deploy/archive without separate applicable instruction. Do not archive unfinished work.

## Verification checkpoint — 2026-11-06

Implementation, real local-D1/signed synthetic protocol checks, independent source review, full npm check (145 Vitest +4 Node), Worker dry-run and source secret scan passed; see workflow/evidence/shared-authentication/verification.md. Task4.2 remains partial: required-width/light/dark/pointer/selected keyboard flows verified, but native200% zoom/full accessibility walkthrough and live Google browser flow remain unverified. Task5.3 handoff, source hashes and manual checklist are prepared; final Darryl acceptance is pending. Real Google/hosted provisioning, Keith review/SH-ID and deployment remain separate gates, not completed by synthetic evidence.
