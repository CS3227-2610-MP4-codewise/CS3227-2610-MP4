# Starting independent feature development

## Shared foundation

Before merging role features, both owners should review the shared DTOs, planned routes, identity boundary and migration conventions. The foundation provides modules and interfaces, not a finished database schema or authentication system. Agree those shared decisions first so feature services can integrate safely.

## Darryl

Work under src/server/instructor/ and src/web/instructor/. Start with assignment/rubric authoring and manual assessment/release. Add AI suggestions after the common provider and quota boundary exists. Relevant spec IDs: SUB-01, GRADE-01 through GRADE-04.

## Keith

Work under src/server/student/ and src/web/student/. Start with editor drafts and immutable submissions, then released feedback, then progress explanations. Relevant spec IDs: SUB-02 through SUB-04, PROG-01 through PROG-03.

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
