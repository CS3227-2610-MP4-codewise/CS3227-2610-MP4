# Codewise

Programming learning and assessment platform for CS3227 MP4.

**Current status:** repository foundation. The app shell and health endpoint work and are deployed to staging. Authentication, assignments, editor/submissions and AI features are not implemented. Production promotion remains pending.

Staging preview: https://codewise-staging.codewise-cs3227-2610.workers.dev. See docs/Deployment.md for verified deployment evidence and release instructions.

## Team

| Owner  | Feature set                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------- |
| Darryl | Instructor assignments/rubrics, assessment suggestions, annotation review and feedback release |
| Keith  | Student editor/drafts, submissions, released feedback and progress explanations                |
| Both   | Shared contracts, identity, database, AI integration, security, deployment and evidence        |

## Start locally

Use Node.js 22.12+ (CI uses Node 22). In Windows PowerShell, use npm.cmd if script execution is disabled.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run db:local
npm.cmd run dev
```

Open http://127.0.0.1:5173. The frontend proxies /api to the local Worker at port 8787. Initial frontend build provides Wrangler's assets directory. Vite updates the frontend during development. No Cloudflare login or SoCLaaS key is needed for local foundation checks.

```powershell
npm.cmd run check
```

## Working independently

Read docs/DeveloperGuide.md and workflow/Ownership.md. Develop on feature branches and review through PRs. Shared contracts and migrations need both owners' review. Keep openspec/changes/codewise-mvp/ as the in-flight system plan; it is not a finished product baseline.

## Deployment and documents

- docs/Deployment.md: account setup and staging-to-production release.
- docs/DeveloperGuide.md: architecture, API boundary and contribution workflow.
- docs/UserGuide.md: currently available behaviour only.
- docs/PlanningDecisions.md: assumptions and provider-access evidence.
- docs/Reflections.md: experiment template, not invented results.
- logs/darryl/ and logs/keith/: member summaries; see logs/README.md.
- workflow/: agent instructions, shared contracts, handoffs, evidence, templates and deployment scripts.

The required product website is published separately on GitHub Pages. It is not the application hosting environment.

Release flow: merge a reviewed PR to main -> Actions deploys staging -> test the stable staging link -> in that same run choose Review deployments / production / Approve and deploy -> test the stable production link. Production waits for approval; no staging run ID needs to be copied. See docs/Deployment.md for cancellation, stale-source and database recovery details.
