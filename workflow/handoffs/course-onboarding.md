# Handoff: course-onboarding planning

## Authorized dashboard contexts checkpoint — 2026-11-08

Darryl owns the uncommitted 4.1–4.2 producer/switch work based on `1200323e925ec40f23ca5447ba888f9e941fda77`; exact producer commit is not yet available. [C-ID packet](../IntegrationContracts.md#dashboard-contexts-producer--local-work-in-progress) contains current schemas, examples and Keith's reusable checks. [Verification checkpoint](../evidence/course-onboarding/authorized-dashboard-contexts.md) records actual review and outstanding UI checks. Keith owns task 4.3; no student consumer or agreement is claimed. The working tree is not accepted or deployed. Next: finish final checks and UI evidence, obtain Darryl's manual acceptance, then publish an exact producer revision for Keith's integration.

Publication: [normal PR12](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/12), planning commit df0f3ed3558eafb603b5a2583ab5ec49791ad617 pushed on codex/course-onboarding-plan. This supersedes earlier uncommitted/publication-pending checkpoints below. No application implementation, merge or deployment.

- Human owner: Darryl; Keith owns student/submission consumers and cross-reviews the shared boundary.
- Agent role/configuration: main /root plans/writes/verifies; reused /root/contracts_review independently inspects documents read-only; no recursive delegation.
- Requirement IDs/change: COU-01–07, AUTH-01–03, SHA-01–12, UI-01/02/03/04/07/08; openspec/changes/course-onboarding/.
- Input revision: merged reviewed main a05d5ba95034dcb87c967690dc9a185cf05ba526; isolated codex/course-onboarding-plan. Planning commit df0f3ed3558eafb603b5a2583ab5ec49791ad617; not a producer implementation revision.
- Owned files: new course-onboarding artifacts, targeted existing MVP/auth/UI/config plans, project AGENTS/DeveloperGuide/PlanningDecisions/UI design, current Ownership/IntegrationContracts notes and this log/evidence/handoff. One named writer Darryl; no application/DTO/schema/migration or personal skill edits.
- Context: explicit user policy request and explicit Darryl SH-ID ownership reconfirmation; actual existing role-capable membership schema and current local-only course setup inspected.
- Decisions: first admin is pinned starting identity, not magic email; first admin/current instructors create courses; current instructors invite both roles within taught courses; new accounts choose passwords, registered accounts confirm existing passwords; validated combined join adds exact role to same account; preserve both roles and expose trusted role-filtered dashboard switch. Product target confirmed by Darryl; technical packet/Keith acceptance pending.
- Verification: all8 OpenSpec changes pass strict validation after concise requirement repair; final project check/evidence updated separately. All17 course-onboarding implementation tasks remain unchecked. No runtime, screenshot, mail or hosted success inferred.
- Security findings: preserve one account/password/membership authority, first-owner pins and course guards; scanner/GET no-op, wrong-account/revoked/duplicate/partial failure scenarios, same-D1 final acceptance and revoked-receipt non-restoration included. Ownership conflict resolved by actual user reply.
- Resource measurements: private recorder checkpoint; current-turn/per-prompt attribution provisional/unavailable; no detailed counters/raw telemetry in repository.
- Blockers/next action: later explicit implementation request; finalize existing C-ID/SHA packet/exclusive schema/API window with Keith before dependent edits; deliver course creation, role invitations/acceptance, then shared switch plus actual Keith student consumer in coherent increments. Live staging/production verification remains reviewed release work.
- Next owner: Darryl implements shared/instructor increments; Keith supplies his student consumer/review. No implementation or deployment authorized by this planning request.
- Independent review: accepted for planning after ownership clarification, source/document inspection only; main executes validation. No joint Keith approval claimed.

Completion: full npm run check passed (8strict changes, type/lint,241tests/23files,4deployment checks,56module build); secret/link/diff audits passed. OpenSpec planning complete with17unchecked tasks; this is not implemented COU functionality. All changes remain uncommitted on the isolated planning branch. See workflow/evidence/course-onboarding/verification.md for exact distinctions and remaining gates.
