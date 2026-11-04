# Cloudflare deployment runbook

Status: configuration prepared. A successful online deployment is not claimed until GitHub Actions and smoke checks pass.

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

Under Settings -> Environments create staging and production. Restrict both to main deployments. For production enable required reviewer approval if supported by the repository/account settings. Even without that option, promotion is an explicit workflow_dispatch action restricted to main by the workflow.

Repository Actions variables (Settings -> Secrets and variables -> Actions -> Variables):

| Variable                  | Value                              |
| ------------------------- | ---------------------------------- |
| STAGING_D1_DATABASE_ID    | Staging database UUID              |
| PRODUCTION_D1_DATABASE_ID | Different production database UUID |
| CLOUDFLARE_ACCOUNT_ID | Cloudflare account identifier (not a credential) |

In EACH GitHub environment configure:

| Type     | Name                  | Value                                                                                |
| -------- | --------------------- | ------------------------------------------------------------------------------------ |
| Variable | APP_URL               | That environment's HTTPS Worker URL                                                  |
| Secret   | CLOUDFLARE_API_TOKEN  | Token with required Workers deployment and D1 migration permissions for that account |

Use separate deployment tokens where practical, with the minimum available permissions. Do not use a Cloudflare global API key. GitHub environment isolation controls when the credentials become available; use account-level separation if stronger Cloudflare resource isolation is required.

Application credentials (such as future SOCLAAS_API_KEY) belong in each Worker's own secrets, not frontend build variables. Once AI is implemented, set them with wrangler secret put using the corresponding environment. They are not needed for the current foundation.

## 4. Push and protect the repository

Review git status and verify there are no credentials before the initial commit/push. The git remote is already set. Push main to create the workflows, then configure branch protection/rules to require PR review and the CI checks/secrets jobs. Require both owners to review shared-contract or migration changes.

The first push starts staging automatically; it will fail clearly if account variables/secrets have not been configured. Do not turn off failing checks just to obtain a deployment.

## 5. Staging pipeline

Push/merge main -> reusable CI (strict specs, types, lint, tests, build, dependency audit, secret scan, Worker dry run) -> download that commit's checked frontend -> isolated config generation -> D1 migrations -> Worker deployment -> smoke checks -> immutable staging-release artifact.

Smoke checks verify the environment name, exact Git commit, database migration readiness, JSON 404 for unknown API paths, and application HTML. They do not yet verify login or feature behaviour because those features do not exist. Extend the checks as feature services are implemented.

## 6. Production promotion

1. Open Actions -> Deploy staging and select a successful run. Its numeric run ID appears in the run URL.
2. Open Actions -> Deploy production -> Run workflow on main.
3. Enter that staging run ID. Approve the production environment if required.
4. The gate verifies the run belongs to this repository, was triggered by push to main, used the expected staging workflow, and completed successfully.
5. Production checks out the exact staged SHA, downloads its tested frontend artifact, applies production migrations, deploys, and checks the version and database.

Artifacts expire after 14 days. If absent, produce a new successful staging run. Do not substitute a different build. The foundation workflow rebuilds the Worker bundle from the exact staged source and lockfile; it promotes the original tested frontend artifact. Deployment runs are serialized per environment.

## Failure handling and recovery

- Missing configuration: fix variables/secrets; rerun the failed staging workflow.
- Migration failure: stop before deployment; inspect the reviewed SQL and restore/recover with a documented plan.
- Application deployment failure: inspect redacted Actions/Cloudflare logs; do not expose keys.
- Smoke failure: release is failed; investigate environment, revision and D1 readiness. No automatic destructive database rollback is attempted.
- Before meaningful production data exists, define retention and rehearse D1 backup/export and restore with synthetic records. Record timings and validation. This rehearsal is still pending.
- Restore a prior application revision only after confirming compatibility with the current schema. Worker rollback does not reverse D1 changes. Prefer additive backward-compatible migrations; do not blindly promote old source after incompatible schema changes.

## GitHub Pages product website

The product-site workflow publishes src/product-site/ separately. In repository Settings -> Pages, select GitHub Actions as the build source. The website initially states the foundation status and must be updated with real app URLs/features once released.

## Sources

- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/workers/wrangler/environments/
- https://developers.cloudflare.com/d1/reference/migrations/
