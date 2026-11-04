# Codewise

Programming learning and assessment platform for CS3227 MP4.

**Current status:** repository foundation. The app shell and health endpoint work; authentication, assignments, editor/submissions and AI features are not implemented. Cloud deployment needs the account setup in docs/Deployment.md.

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
- workflow/: specialized agent instructions, handoff template, ownership and deployment scripts.

The required product website is published separately on GitHub Pages. It is not the application hosting environment.
