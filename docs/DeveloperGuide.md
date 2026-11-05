# Developer guide

## Current release status

Foundation only. React application shell, non-sensitive health endpoint, partial shared TypeScript contracts, D1 metadata migration, checks, and deployment workflows. Staging and production passed deployment and smoke checks at `281cc13`; see [readiness evidence](../workflow/evidence/project-readiness/verification.md) for exact provenance. Authentication, role features and SoCLaaS integration remain unimplemented.

## Structure and responsibility

| Location                                       | Responsibility / owner                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| src/web/instructor/ and src/server/instructor/ | Instructor UI and domain services / Darryl                                         |
| src/web/student/ and src/server/student/       | Student UI and domain services / Keith                                             |
| src/shared/contracts.ts                        | Shared transport contracts / both                                                  |
| src/server/index.ts                            | HTTP entry, health and common response headers / both                              |
| src/server/environment.ts                      | Runtime bindings; credentials stay server-side / both                              |
| src/server/db/migrations/                      | Shared versioned D1 SQL / both                                                     |
| src/product-site/                              | GitHub Pages product website / both                                                |
| openspec/                                      | Conventional OpenSpec config and in-flight change artifacts                        |
| workflow/agents/                               | Specialized coordinator/specification/implementation/review instructions           |
| workflow/handoffs/                             | Context and review records; template provided                                      |
| workflow/scripts/                              | Deployment configuration validation, trusted-run gate, smoke checks and gate tests |
| .github/workflows/                             | Required CI, staging, production promotion and product-site publishing             |
| logs/darryl/ and logs/keith/                   | Human-owned redacted interaction summaries; policy in logs/README.md               |
| workflow/IntegrationContracts.md               | Shared-service decisions and producer/consumer reading map                         |
| workflow/evidence/                             | Redacted verification records grouped by change                                    |
| workflow/templates/                            | Reusable member-log entry template                                                 |

## Shared API and data contract

The only implemented API is GET /api/health. It checks the platform metadata schema and returns status, service, environment, version and database readiness. Errors contain no database details. All other /api paths return JSON 404. Feature folders do not expose unauthenticated placeholder endpoints.

The planned routes and entity relationships are in openspec/changes/codewise-mvp/design.md. src/shared/contracts.ts supplies initial public DTOs; these are reviewed starting points, not completed API implementations. They deliberately exclude reference solutions and draft instructor assessments. Add runtime validators alongside feature implementation; TypeScript types do not validate HTTP or AI input.

Use one database and shared identity per environment. Keep route handling separate from business rules and persistence. Do not split into separately deployed microservices for each role: independent modules/branches provide development ownership while one API avoids duplicated identity/data and additional hosting complexity.

The agreed writer split is in [Ownership.md](../workflow/Ownership.md): Keith produces identity/course and submission services; Darryl produces publication, assessment/release and the common gateway. [Contract drafts](../workflow/IntegrationContracts.md) specify producer/consumer acceptance cases; field/policy acceptance and reviewed producer handoffs still gate dependent edits. No identity/submission handoff exists yet. Shared DTO/API/migration files require one active writer window, even for different increments.

## Local development and checks

Follow README. The Vite frontend is at 5173 and proxies /api to Wrangler at 8787. Run the first build before starting Wrangler; run db:local to apply metadata migration. npm run check validates OpenSpec, TypeScript, lint, application/gate tests and the frontend build. CI additionally audits dependencies, scans secrets and performs Worker bundling without credentials.

## Spec and agent workflow

Application UI follows [docs/ui/design.md](ui/design.md), revision `warm-workbook-v1`, with [UI-01–UI-08](../openspec/changes/warm-workbook-ui/specs/workbook-experience/spec.md). Read it before UI planning/code/review and attach a completed [UI review](../workflow/templates/ui-review.md) to the feature evidence. AGENTS.md, OpenSpec rules and the PR template require traceability and review; no automated visual gate is claimed. The shared visual foundation now implements the chosen tokens and public foundation screen; [component usage](ui/components.md) describes the controls. Authentication and role workspaces remain unimplemented.

Use [member logs](../logs/README.md) and the [shared integration map](../workflow/IntegrationContracts.md). The [change naming guide](../openspec/changes/README.md) explains bounded member/shared OpenSpec changes. Existing setup summaries retain their historical contents after relocation; new records follow the per-increment log policy.

OpenSpec was initialized for Codex and Claude. Read the relevant capability specs and tasks, implement a bounded change on a feature branch, attach verification and review records, and update checkboxes only for fully completed tasks. The comprehensive MVP change remains in progress; completed foundation does not imply completed product requirements.

The coordinator assigns requirement IDs and file ownership; the specification role resolves behaviour; implementation supplies changes and checks; independent review checks functional/security failures and returns findings to the owner. Use workflow/handoffs/TEMPLATE.md. The current foundation preparation is not evidence that a coordinated multi-agent experiment has run. Preserve actual agent records when it does.

## Environments, security and AI

See Deployment.md for isolation and promotion. The Worker adds restrictive response headers and reserves API routes ahead of SPA fallback. These controls are only a foundation: authentication, CSRF, object authorization, AI guardrails and adversarial grading tests remain outstanding. Never place provider keys in VITE_ variables. SoCLaaS remains server-only, with model/quota/connectivity verification required before activation.

## Release approval

The main-push Deploy staging and production workflow runs CI and staging first, then queues its production job behind the protected production environment. Production consumes the artifact from that exact run and checks source/run identity and current main before migrations. Review deployments is GitHub's native environment banner. The former standalone run-ID dispatch workflow is removed. Read Deployment.md before cancelling or approving a queued release; a waiting approval holds the serialized release slot.

## Dependency audit status

The initial audit on 2026-11-04 reports no high/critical findings and 11 moderate findings in the development-only ESLint/typescript-eslint dependency tree, originating from minimatch. CI blocks high/critical advisories and reports the complete audit. These development tools are not part of the deployed Worker/client bundle. Review compatible upstream fixes; do not use npm audit fix --force to downgrade or break the toolchain blindly.

## Acknowledgements

- OpenSpec: spec-driven schema, workflow and generated assistant integrations (https://github.com/Fission-AI/OpenSpec).
- Cloudflare documentation: Workers/D1 environments, migrations and CI deployment patterns (links in Deployment.md).
- React, Vite, TypeScript, Wrangler, Vitest, ESLint and other dependencies: see package.json and lockfile.
- SourceAcademy screenshot supplied by the team inspired the planned two-panel layout; no SourceAcademy code has been copied.
- Member-log organisation was informed by the team's MP3 contribution conventions; no MP3 application implementation was copied.
- AI assistance generated initial planning and foundation code; record and verify summaries in logs/.
