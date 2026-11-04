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

# 01 - Organize Member Records - 4 November 2026

## Request

Darryl asked to change the proposed folder structure after comparing MP3 and to explain to Keith how MP4 deployment differs from preview branches. This is a local documentation/organisation continuation on codex/deployment-handoff, not authorization to deploy production or redesign the release workflow.

## Results

- Moved the three dated setup summaries into logs/darryl/ without rewriting their historical content; reserved logs/keith/ for Keith's actual contributions.
- Added member-log policy/template, a shared integration-contract reading map, evidence-folder guidance and bounded OpenSpec change naming guidance. Updated instructions and affected references. No feature implementation or empty feature-change scaffolds were introduced.
- MP3 was read as a process/layout reference. No MP3 application implementation was reused. Existing MVP planning and source/service ownership are preserved.
- Deployment workflow is unchanged: PR checks, merge main to staging, test stable staging, explicitly select a successful staging run for production promotion/approval. No preview-branch deployment is added.
- Verification: 23 local Markdown targets resolve; historical planning/foundation summaries are identical after normalizing line endings and deployment history is retained as the unchanged prefix. Full npm run check passed strict specs, types, lint, nine tests and production build. The initial restricted run failed on test-tool parent-directory access; the authorized rerun passed without code changes. Production, cloud settings, credentials, branch protections and remote PR state were not changed. Edits remain local on the current branch.

# 02 - Prepare Neutral Addresses and Publish the Review Branch - 4 November 2026

## Request

Darryl requested the neutral link-name fix and publication of the repository changes on a branch so he can test GitHub Actions production promotion himself. He then confirmed completing the Cloudflare dashboard rename. This does not instruct the agent to merge or dispatch production.

## Results

- Verified account subdomain codewise-cs3227-2610, with only codewise-staging deployed. The earlier public API attempt to rename the existing account subdomain returned HTTP 409; Darryl completed the dashboard rename.
- Updated current documentation and prepared GitHub APP_URL variables for both environments. Historical evidence retains the original URL and dates rather than rewriting the past.
- Corrected required PR check names from reusable staging labels to the actual checks/secrets emitted on PRs, preserving other protections. Added clickable environment URLs and clear staging/production summaries to the workflow definitions.
- Member-owned log structure, shared contract reading map, evidence/template folders and existing deployment handoff are included in the same review branch. No production dispatch, production migration, merge or credential disclosure is authorized by this work.
- Final local verification: strict OpenSpec validation, TypeScript, ESLint, all nine tests and frontend build pass. Four workflow YAML files parse successfully; whitespace checks pass. Live smoke checks at the renamed staging URL pass against deployed revision c4354ace256b1c6d27a7d74fb4989a9ddcfea00f. The review branch is being published to PR #1; its current remote check state is authoritative on GitHub. Production is not dispatched and this branch is not merged by the agent.
