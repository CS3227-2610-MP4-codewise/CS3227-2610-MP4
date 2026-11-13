# Codewise

A programming workbook for CS3227 MP4, built by Darryl and Keith.

**Submission documentation — 13 November 2026:** implemented source includes invitation-based authentication, courses, publication, student drafts/attempts and instructor-reviewed feedback. Hosted revision/configuration and peer-test access must be verified separately. Optional AI suggestions remain subject to evaluation findings and activation gates.

- [User Guide](docs/UserGuide.md): current features, test access and 12 manual screenshot placeholders.
- [Developer Guide](docs/DeveloperGuide.md): architecture, UML, setup, workflow catalogue and acknowledgements.
- [Reflections](docs/Reflections.md): member contributions and evidence-based experiment analysis.
- [Interaction summaries](logs/INDEX.md) and [workflow file inventory](workflow/FILE-INDEX.md).
- [Submission verification and remaining actions](workflow/evidence/final-submission/verification.md).
- [Product website](https://cs3227-2610-mp4-codewise.github.io/CS3227-2610-MP4/) · [staging sign-in](https://codewise-staging.codewise-cs3227-2610.workers.dev/sign-in).

## Local setup

Use Node.js 22.12+ (CI uses Node 22). In PowerShell use `.cmd` wrappers if script execution policy requires them.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run db:local
npm.cmd run dev:api
```

Open http://127.0.0.1:8787. Configure the approved Firebase and exact AUTH_ORIGIN in ignored `.dev.vars` before authenticated use; see [Developer Guide](docs/DeveloperGuide.md#local-setup). No model key is required for synthetic tests or manual grading. There are no default credentials or public registration. For frontend iteration `npm.cmd run dev` also starts Vite at 5173; authenticated tests should use the configured single origin.

```powershell
npm.cmd run check
npm.cmd run format:check
node workflow/scripts/submission-audit.mjs
```

## Development and release

Darryl owns instructor features and shared authentication/course authority; Keith owns student features and submissions. Review [ownership](workflow/Ownership.md), [integration contracts](workflow/IntegrationContracts.md), `AGENTS.md`, and relevant OpenSpec artifacts before changes. Keep one authoritative store and one writer for shared schema/API edits.

Product code is in `src/`; workflow tooling/evidence in `workflow/`; conventional OpenSpec artifacts in `openspec/`; guides in `docs/`; redacted summaries in `logs/`. Do not commit credentials, real learner code or raw private prompts.

[Deployment runbook](docs/Deployment.md): reviewed main changes run CI and staging, then production waits for protected approval in the same release run. GitHub Pages publishes `src/product-site/` separately through `.github/workflows/product-site.yml`. Source preparation is not proof that the revised website/application has been deployed. Record successful workflows and exact deployed revisions before final submission.
