# Handoff: sign-in ownership revision

- Human owner: Darryl, planning/documentation only. Keith retains course/object authorization, submissions and student features; revised-boundary review pending.
- Agent role / model / configuration: main assistant, OpenSpec update and self-review; no independent agent or measured usage claimed.
- Requirement IDs and OpenSpec changes: AUTH-01–AUTH-03, UI-02/UI-03, DEV-01/DEV-02, CON-01/CON-07; existing `codewise-mvp`, `warm-workbook-ui`, `instructor-development-contracts` revised in place.
- Input versions: main `7e3e729`; branch `codex/sign-in-ownership` in an isolated worktree. Original instructor-assignment work remains in its checkout.
- Owned files: AGENTS.md, openspec/config.yaml, workflow/Ownership.md and IntegrationContracts.md; docs/PlanningDecisions.md, DeveloperGuide.md, TeamStart.md and ui/design.md; named changes' proposal/design/tasks and the existing instructor-contract validation scenario wording; this log/evidence/handoff. No src/, package/lockfile, migration, fixture, CI or runtime configuration edits.
- Relevant context: current ownership and C-ID ports, outstanding provider/provisioning decisions, warm-workbook UI tasks and the user's explicit reassignment/publication request.
- Changes: Darryl produces SH-AUTH account/session/sign-in/registration/provisioning/CSRF; Keith consumes trusted sessions for SH-ID courses/memberships/object authority and retains student/submission work. Both accept the same C-ID composition; one store and serialized shared writes. Updated plan tasks name the responsible producer; no checkbox state changes.
- Verification: full `npm run check` passed, 4 OpenSpec changes, typecheck/lint, 95 Vitest + 4 deployment cases and build. [Evidence](../evidence/sign-in-ownership/verification.md). Existing dependencies reused; no live identity/provider/deployment verification implied.
- Security and unresolved issues: provider and public/invitation/operator registration choices remain open; no instructor self-promotion, duplicate session storage or client role authority. Real C-ID producer revisions are unavailable until implemented and reviewed.
- Resource measurements: unavailable; no efficiency claim.
- Next owner: Darryl proposes the bounded SH-AUTH implementation/provider/session contract; Keith reviews it and supplies the SH-ID authorization/context producer. This document supersedes the old combined Keith-owned identity assignment for future work, without rewriting historical evidence or claiming team acceptance.
- Review outcome: documentation self-review only; Keith's consumer review and runtime acceptance pending. User authorized feature-branch commit/push/PR, not merge/deploy/archive.
