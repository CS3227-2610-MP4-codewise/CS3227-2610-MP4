# Deployment setup summary

AI-generated; human verification pending. No credentials or private learner data are included.

## Confirmed work

- User completed Cloudflare login and stored a deployment token separately in both GitHub environments.
- Created distinct Cloudflare D1 databases codewise-staging and codewise-production in APAC.
- Activated codewise-darryl.workers.dev; configured GitHub staging/production environments, main-branch deployment restrictions, APP_URL values and non-secret repository database/account identifiers.
- Published the initial repository foundation to the team organisation repository.
- Configured GitHub Pages and verified its product website returns HTTP 200.
- Saved environment secret names were CLOUDFARE_API_TOKEN (missing L). Updated workflows to accept that alias without accessing or disclosing values, and use the configured non-secret account variable.
- Commit c4354ace256b1c6d27a7d74fb4989a9ddcfea00f passed staging run 41783663340, including CI, secret scan, migration, deployment, smoke checks and release artifact upload.
- A separate live smoke check against staging verified the environment, revision, database readiness, app HTML and JSON API 404.
- Enabled required main checks/PR review/resolved conversations and production owner approval. Administrator bypass remains enabled for maintenance; production owner self-review is allowed for the two-person setup.

## Pending production

Automatic approval review rejected dispatching production promotion because user authorization for that specific production action was not explicit. No production workflow was started by that attempt. The staging build is ready for explicit approval and promotion through the existing workflow. Do not bypass that rejection or deploy manually.

## Remaining product work

Authentication/authorization, shared domain schema, instructor/student services, SoCLaaS quota/model/connectivity verification, AI security evaluation and recovery rehearsal remain unfinished. Online foundation success does not complete those MVP requirements or demonstrate a multi-agent experiment.
