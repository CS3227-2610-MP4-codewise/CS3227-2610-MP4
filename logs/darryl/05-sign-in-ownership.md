# 01 - Shared sign-in ownership revision - 2026-11-06

## Request

Darryl requested a plan revision so he can handle sign-in, followed by commit, push and PR creation. Scope: ownership/planning only; no authentication implementation. Branch: `codex/sign-in-ownership`, isolated from the in-progress instructor-assignment checkout at base `7e3e729`. Requirements: AUTH-01–AUTH-03, UI-02/UI-03, DEV-01/DEV-02, CON-01/CON-07.

## Results

- Darryl now owns SH-AUTH: sign-in UI, approved registration/provisioning, provider/account mapping, session validation/expiry/logout/revocation and CSRF guards. Keith retains SH-ID course/membership/object authorization, allowed workspace contexts, submissions and student features. Both cross-review one composed C-ID boundary and authoritative identity store; shared migration/API write windows remain serialized.
- Updated Ownership/IntegrationContracts, agent context, planning decisions, team/developer/UI guides and the existing MVP, warm-workbook and instructor-contract planning artifacts. No runtime schema/API/security requirement is weakened; completed task markers are preserved. Historical logs/evidence keep the earlier allocation rather than inventing retroactive agreement.
- This is Darryl's requested reassignment, not evidence of Keith's review. Provider choice, registration method and trusted provisioning remain open. Public registration and instructor self-promotion are not approved. The plan is not an implementation handoff.
- Main assistant made the documentation edits and self-reviewed. No subagent, independent review or Keith contribution claimed; delegation was unnecessary for this bounded ownership revision.
- `npm run check` passed in the isolated worktree using installed dependencies: 4/4 OpenSpec changes, typecheck/lint, 95 Vitest tests, 4 deployment tests and Vite build. No new tests mirror the documentation. This was not a fresh dependency install or hosted CI run.
- [Verification](../../workflow/evidence/sign-in-ownership/verification.md) and [handoff](../../workflow/handoffs/sign-in-ownership.md). The original checkout's instructor implementation, package/lock changes and uncommitted ownership append were untouched and excluded from this PR.
- Next: review the reassigned producer boundary with Keith, then prepare/approve a bounded Darryl-owned SH-AUTH implementation change. No task is marked implemented by this ownership revision; no merge, deployment, canonical sync or archive is authorized. Commit/push/PR outcomes are reported after publication.
