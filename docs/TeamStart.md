# Starting independent feature development

## Shared foundation

Before merging role features, both owners should review the shared DTOs, planned routes, identity boundary and migration conventions. The foundation provides modules and interfaces, not a finished database schema or authentication system. Agree those shared decisions first so feature services can integrate safely.

Use [IntegrationContracts.md](../workflow/IntegrationContracts.md) to identify the producer/consumer decisions. Keep your own interaction summaries under [Darryl](../logs/darryl/) or [Keith](../logs/keith/), with one file per PR-sized increment. Shared handoffs and verification live in workflow/handoffs/ and workflow/evidence/. Create bounded OpenSpec changes as each feature is planned; see [the change guide](../openspec/changes/README.md).

The [current shared writer split](../workflow/Ownership.md), revised at Darryl's request on 2026-11-06, assigns Darryl sign-in/registration/provisioning, provider accounts and sessions/logout/CSRF (SH-AUTH), plus publication, assessment/release, the gateway and operations. Keith retains courses/memberships/object authorization (SH-ID), submissions and student features. Both accept the composed C-ID boundary before integration; Keith's revised-boundary review is pending. Darryl supplies the trusted session handoff, Keith supplies authorization/submission handoffs, and neither role duplicates the identity store. Fixtures do not prove integration; protected feature routes remain gated.

## Darryl

Work under src/server/instructor/ and src/web/instructor/. Start with assignment/rubric authoring and manual assessment/release. Add AI suggestions after the common provider and quota boundary exists. Relevant spec IDs: SUB-01, GRADE-01 through GRADE-04.

Also lead the bounded shared SH-AUTH change: sign-in and registration/provisioning decisions/UI, provider mapping, sessions/logout and CSRF (AUTH-01, AUTH-03; UI-02). Shared auth is one cross-role service, not a student-feature fork. Choose provider and registration policy through review before implementation; agree exact shared schema/API write ownership and Keith's C-ID consumer contract.

## Keith

Work under src/server/student/ and src/web/student/. Start with editor drafts and immutable submissions, then released feedback, then progress explanations. Relevant spec IDs: SUB-02 through SUB-04, PROG-01 through PROG-03.

Retain SH-ID courses/memberships/course-object permissions and allowed workspace contexts (AUTH-02), consuming Darryl's authenticated session subject. Cross-review SH-AUTH, including revocation/CSRF/role boundaries, before integrating it into student services. Do not build a second sign-in/session store.

## First checkout

After the foundation is committed and pushed to the organisation repository:

```powershell
git clone https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4.git
cd CS3227-2610-MP4
npm.cmd ci
npm.cmd run build
npm.cmd run db:local
npm.cmd run dev
```

Use a separate branch for each bounded feature. Include spec requirement IDs and verification in each PR. Shared contracts, identity, schema and CI changes need both owners' review; assign one active write owner to avoid conflicts.

## Coordinated agent use

Human role ownership is distinct from specialized agent roles. For agent-assisted development, apply the coordinator/specification/implementation/review instructions in workflow/agents/ and record real handoffs/review outcomes. Neither two human branches nor installed OpenSpec commands alone demonstrate multi-agent coordination.

Do not give implementation agents production deployment secrets. Keep real student information and provider credentials out of public development logs.
