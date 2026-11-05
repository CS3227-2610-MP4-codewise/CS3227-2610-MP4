# Planning decisions and evidence

Updated 2026-11-05 for `project-readiness`. Foundation is deployed to staging and production at `281cc1392b722e873bc58fd806913c5f2121eeec`; [dated evidence](../workflow/evidence/project-readiness/verification.md) records the successful release and smoke checks. Role features and SoCLaaS integration remain unimplemented. The MVP product baseline is still a draft; ownership agreement does not settle all product decisions.

## Confirmed decisions and observed facts

| Item                       | Status / basis                                                                      | Consequence                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Team and feature ownership | Confirmed: Darryl instructor; Keith student                                         | No student implementation by Darryl                                                                                                               |
| Shared increment writers   | Agreed, reported by Darryl on 2026-11-05                                            | Keith: identity/course and submissions; Darryl: publication, assessment/release, gateway, operations; see [exact split](../workflow/Ownership.md) |
| Readiness increment        | Darryl writes shared planning documents and owns the member log                     | Record Keith's reported agreement without inventing his review or contribution                                                                    |
| Runtime foundation         | React/Vite + native Worker + D1 selected and deployed                               | One deployable API and one authoritative domain store per environment                                                                             |
| Foundation release         | GitHub run 41799944040 passed staging/production, with recorded production approval | No claim of authenticated feature or AI verification                                                                                              |
| Provider boundary          | SoCLaaS required, server-only; no submitted-code execution                          | Provider activation remains gated; references stay instructor-only                                                                                |

## Proposed or unresolved product decisions

These are not confirmed by the workload agreement. Each named owner must resolve the relevant gate with the other consumer before implementation depends on it.

| Decision                         | Current draft / uncertainty                                                                               | Owner and required acceptance                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Language and source model        | MVP specs/DTOs assume Python and one source per question; final product acceptance pending                | Both: confirm before publication/editor schema                                                                         |
| Scope                            | Assessment/annotations and released-evidence progress; tutoring, textbook Q&A, analytics deferred         | Both: accept MVP baseline; no execution/automatic grading in this iteration                                            |
| Identity and provisioning        | Maintained provider undecided; trusted course-scoped membership, no self-promotion                        | Keith proposes, Darryl reviews provider/session/CSRF/logout/operator/demo accounts before C-ID integration             |
| Publication                      | Availability, deadline edits, rubric comparison semantics and scoring precision unresolved                | Darryl proposes, Keith accepts immutable/public C-PUB projection                                                       |
| Submission timing                | Draft SUB-03 rejects late submissions and preserves prior attempts; equality/attempt-count policy pending | Keith proposes, Darryl accepts exact C-SUB transaction/retry/deadline rules                                            |
| Source limits and representation | Proposed 32 KiB/question; aggregate limits, LF normalization, hash and terminal-newline rules pending     | Both accept before storage, annotations and gateway budget implementation                                              |
| Feedback history/withdrawal      | Corrections create reviewed releases; PROG-03 mentions withdrawal without a defined operation             | Darryl proposes release/withdrawal/read rules, Keith accepts invalidation semantics before progress integration        |
| Retention/deletion               | Code, feedback, audit, cache and backup lifetimes undecided                                               | Both accept policy before real learner data                                                                            |
| Provider readiness               | Supported model/capabilities, account quotas and shared-environment scope unverified                      | Darryl obtains redacted evidence; Keith reviews gateway limits and consumer behavior                                   |
| AI resource configuration        | No guessed quota, tokenizer, timeout or reservation bounds                                                | Darryl proposes measured/configured bounds; both accept C-AI before activation                                         |
| Hosting capacity                 | Cloudflare foundation verified; complete authenticated API CPU/load targets unmeasured                    | Darryl measures; both review capacity before full product release                                                      |
| Recovery                         | Runbook exists; synthetic restore/recovery rehearsal not executed                                         | Darryl performs separately authorized rehearsal, Keith reviews results (OPS-03)                                        |
| Product acceptance               | Full MVP requirements remain draft                                                                        | Both approve bounded future changes and runtime schemas; current contract scenarios are not executed integration tests |

Contract drafts and producer/consumer scenarios live in [IntegrationContracts.md](../workflow/IntegrationContracts.md). Workload agreement is confirmed; schema/field/error proposals there remain pending joint contract acceptance.

## Historical research: SoCLaaS and hosting — 2026-11-04

The following records the initial research, not refreshed account/model/quota or pricing evidence. Its unprovisioned-host statement applied at that research time and was superseded by the foundation release above. Reverify external platform/provider limits before relying on them for activation or capacity decisions.

The supplied dochub URL could not be opened through the web tool or resolved from the workspace. Official publicly indexed SoCLaaS guides were available instead:

- https://soclaas.comp.nus.edu.sg/guides/ explicitly states the API gateway is Internet-reachable although portal/chat/documentation are NUS-network-only.
- https://soclaas.comp.nus.edu.sg/guides/api.html specifies base URL https://soclaas-api.comp.nus.edu.sg/v1, Bearer-key authentication, GET /v1/models and POST /v1/chat/completions. Capabilities vary by model.
- Public guides did not establish exact request/token/concurrency quotas for the team's account. Do not treat marketing language about unlimited usage as a quota guarantee.
- Workspace unauthenticated reachability probe returned curl DNS resolution failure / HTTP 000. This establishes only a limitation of this environment; it does not establish a provider or Cloudflare failure.
- At the initial research checkpoint no account key was supplied, no authenticated completion was run, and neither hosting platform had been provisioned. Cloudflare foundation provisioning/deployment is now evidenced; authenticated SoCLaaS connectivity remains unverified.

Cloudflare https://developers.cloudflare.com/workers/platform/limits/ states network waiting does not count as CPU time. Free CPU budget still covers authentication, parsing, validation and other local processing. https://developers.cloudflare.com/workers/platform/pricing/ lists free allowances; verify at release.

Vercel https://vercel.com/docs/limits states Hobby cannot directly connect organisation-owned Git repositories. The assignment requires a team organisation repository. https://vercel.com/docs/functions/limitations documents function duration and payload limits; choose a supported deployment route and plan rather than assuming previous project setup transfers.

Initial recommendation was to evaluate Cloudflare first for a lightweight API and D1. That foundation is now deployed. The alternative-host discussion is historical, not a proposed migration or a demonstrated workaround for provider networking restrictions.

## Required deployed connectivity check

1. From the NUS network, retrieve an allowed API key and applicable quota documentation. Store the key directly in the candidate host's secret settings, never in a prompt, browser bundle or Git.
2. In an isolated backend, call GET /v1/models with Authorization: Bearer and choose an available chat model.
3. Send one minimal synthetic chat completion through that backend with an output bound and timeout. Do not use student data.
4. Record deployment host/region, timestamp, model, status, latency and available usage metrics; redact headers, key and response contents.
5. Confirm authenticated browser -> backend -> SoCLaaS path, error mapping, and shared quota configuration. Test 429 handling with a mock rather than exhausting the service.
6. If blocked, distinguish DNS/TLS, authentication, model capability, quota and networking failures before changing hosts. Obtain service-owner clarification for provider restrictions.

## OpenSpec provenance

Structure follows the upstream spec-driven schema and proposal template:

- https://github.com/Fission-AI/OpenSpec
- https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/schemas/spec-driven/schema.yaml
- https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/schemas/spec-driven/templates/proposal.md

The initial change lives in openspec/changes/codewise-mvp/. Canonical openspec/specs/ is intentionally not populated with an unimplemented baseline. Use the selected CLI's documented validation and archival workflow once installed; do not archive merely to make a draft appear complete.
