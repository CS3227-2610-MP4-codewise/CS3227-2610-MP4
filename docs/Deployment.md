# Cloudflare deployment runbook

Historical foundation status (verified 2026-11-05): foundation deployed successfully to staging and production through GitHub Actions run [41799944040](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/actions/runs/41799944040) at `281cc1392b722e873bc58fd806913c5f2121eeec`, with recorded production approval. Both live smoke checks passed. See [readiness evidence](../workflow/evidence/project-readiness/verification.md) for scope and remaining gates. No deployment was initiated by the readiness review.

## Current source versus historical deployment evidence

As of 13 November 2026, source includes Firebase/Gmail authentication, courses, publication, submissions and assessment/release. The historical foundation evidence below does not certify the current deployed feature revision. See [submission verification](../workflow/evidence/final-submission/verification.md) and [Developer Guide](DeveloperGuide.md) for current composition and release gaps. Statements below saying features/provider integration are unimplemented refer to the dated foundation checkpoint.

## Verified environment setup

- Staging: https://codewise-staging.codewise-cs3227-2610.workers.dev
- Production foundation: https://codewise-production.codewise-cs3227-2610.workers.dev
- Product website: https://cs3227-2610-mp4-codewise.github.io/CS3227-2610-MP4/
- Current verified staging/production run: https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/actions/runs/41799944040
- Tested revision: 281cc1392b722e873bc58fd806913c5f2121eeec. Earlier staging evidence: run 41783663340 at c4354ace256b1c6d27a7d74fb4989a9ddcfea00f.
- Separate remote staging and production D1 databases were provisioned; both foundation deployments passed migration-readiness smoke checks. This does not verify future domain tables or recovery.
- GitHub environment APP_URL values, repository database/account IDs, and environment deployment tokens are configured. The saved token name is CLOUDFARE_API_TOKEN; workflows accept that alias as well as CLOUDFLARE_API_TOKEN. Token values are not recorded.
- Both environments restrict deployments to main. Production requires owner review. Main requires checks and secrets (the names emitted on pull requests), one approving PR review, and resolved conversations. Administrator bypass is retained for repository maintenance.
- Online CI checks, secret scan, staging migration/deployment, artifact upload and smoke checks passed. A separate live smoke run confirmed database readiness, exact revision, app HTML and JSON API 404 behaviour. Full role features and AI integration remain unimplemented.

## Architecture

Cloudflare Worker serves a built React/Vite app and /api routes. D1 stores application data. Local development uses local D1. Staging and production use different Workers, D1 databases, secrets and GitHub environments. SoCLaaS integration is not implemented yet.

## 1. Install locally

```powershell
npm.cmd ci
npm.cmd run check
npx.cmd wrangler login
```

The login opens Cloudflare's authorization page. Use the team's intended account. Do not paste tokens into chat or source files.

## 2. Create two remote databases

```powershell
npx.cmd wrangler d1 create codewise-staging
npx.cmd wrangler d1 create codewise-production
```

Record each returned database_id. They are identifiers, not API credentials. Do not use the same database for both environments. The checked-in wrangler.json contains local placeholders; deployment configuration is generated from GitHub variables and fails if IDs are missing, placeholder, or equal.

Create/activate the account's workers.dev subdomain in Cloudflare Workers & Pages. With the configured Worker names, URLs take the form https://codewise-staging.YOUR-SUBDOMAIN.workers.dev and https://codewise-production.YOUR-SUBDOMAIN.workers.dev. Replace YOUR-SUBDOMAIN with the actual value.

## 3. Configure GitHub

Canonical repository: https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4

Under Settings -> Environments create staging and production. Restrict both to main deployments. Production MUST have a required reviewer configured before enabling this workflow: the protected environment supplies the human approval gate. Naming an environment alone does not pause for approval. The public repository already has owner approval configured; retain it.

Repository Actions variables (Settings -> Secrets and variables -> Actions -> Variables):

| Variable                  | Value                                            |
| ------------------------- | ------------------------------------------------ |
| STAGING_D1_DATABASE_ID    | Staging database UUID                            |
| PRODUCTION_D1_DATABASE_ID | Different production database UUID               |
| CLOUDFLARE_ACCOUNT_ID     | Cloudflare account identifier (not a credential) |

In EACH GitHub environment configure:

| Type     | Name                 | Value                                                                                |
| -------- | -------------------- | ------------------------------------------------------------------------------------ |
| Variable | APP_URL              | That environment's HTTPS Worker URL                                                  |
| Secret   | CLOUDFLARE_API_TOKEN | Token with required Workers deployment and D1 migration permissions for that account |

Use separate deployment tokens where practical, with the minimum available permissions. Do not use a Cloudflare global API key. GitHub environment isolation controls when the credentials become available; use account-level separation if stronger Cloudflare resource isolation is required.

Application credentials (such as future SOCLAAS_API_KEY) belong in each Worker's own secrets, not frontend build variables. Once AI is implemented, set them with wrangler secret put using the corresponding environment. They are not needed for the current foundation.

## 4. Push and protect the repository

Review git status and verify there are no credentials before the initial commit/push. The git remote is already set. Push main to create the workflows, then configure branch protection/rules to require PR review and the CI checks/secrets jobs. Require both owners to review shared-contract or migration changes.

The first push starts staging automatically; it will fail clearly if account variables/secrets have not been configured. Do not turn off failing checks just to obtain a deployment.

## 5. Staging pipeline

There is no automatic branch/PR preview deployment. A PR runs checks; merging it to main starts **Deploy staging and production** and updates the stable staging URL above. After staging succeeds, production waits for approval in that same run. Publishing a feature branch alone does not update staging.

Push/merge main -> reusable CI (strict specs, types, lint, tests, build, dependency audit, secret scan, Worker dry run) -> download that commit's checked frontend -> isolated config generation -> D1 migrations -> Worker deployment -> smoke checks -> immutable staging-release artifact.

Smoke checks verify the environment name, exact Git commit, database migration readiness, JSON 404 for unknown API paths, and application HTML. They do not yet verify login or feature behaviour because those features do not exist. Extend the checks as feature services are implemented.

## 6. Production promotion

1. Merge the reviewed feature PR into main and open Actions -> Deploy staging and production -> that merge's run.
2. Wait for CI and staging deployment/smoke checks to pass. Open the stable staging link from the staging summary and test the changes.
3. In the same run's Summary page, click **Review deployments**, select **production**, and click **Approve and deploy**. This is GitHub's pending-environment approval banner, not a custom executable button inside Markdown. It appears only after staging succeeds and the production job reaches its gate.
4. Production downloads the saved artifact from this exact run and checks its source/run IDs plus current main head before production migrations or deployment.
5. After production deployment and smoke checks pass, open the stable production link from its summary and test the release.

No run ID needs to be copied and no separate Deploy production workflow is manually started. Reject the deployment or cancel the run if staging fails manual testing. The old standalone production-dispatch workflow is removed. No production approval is granted automatically by the agent.

Artifacts expire after 14 days. If absent, produce a new successful staging run. Do not substitute a different build. The workflow rebuilds the Worker bundle from the exact staged source and lockfile and promotes the original tested frontend artifact. The complete release workflow is serialized with cancellation disabled. A waiting approval holds the release slot; approve, reject or cancel before the next release proceeds. If main advances during the wait, the old release is rejected before migrations: cancel it and test the newer release.

## Failure handling and recovery

- Missing configuration: fix variables/secrets; rerun the failed staging workflow.
- Migration failure: stop before deployment; inspect the reviewed SQL and restore/recover with a documented plan.
- Application deployment failure: inspect redacted Actions/Cloudflare logs; do not expose keys.
- Smoke failure: release is failed; investigate environment, revision and D1 readiness. No automatic destructive database rollback is attempted.
- Before meaningful production data exists, define retention and rehearse D1 backup/export and restore with synthetic records. Record timings and validation. This rehearsal is still pending.
- Restore a prior application revision only after confirming compatibility with the current schema. Worker rollback does not reverse D1 changes. Prefer additive backward-compatible migrations; do not blindly promote old source after incompatible schema changes.

## GitHub Pages product website

The product-site workflow publishes src/product-site/ separately. In repository Settings -> Pages, select GitHub Actions as the build source. The website now links the guides and app URLs and distinguishes source implementation from hosted readiness. Record its successful Pages deployment after the reviewed main-branch workflow runs.

## Sources

- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/workers/wrangler/environments/
- https://developers.cloudflare.com/d1/reference/migrations/
