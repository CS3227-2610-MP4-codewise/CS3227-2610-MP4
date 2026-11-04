# Planning decisions and evidence

Status: DRAFT, 2026-11-04. Repository/pipeline foundation implementation is authorized. Full role features and online deployment are not claimed complete. Specifications describe proposed product behaviour.

## Evidence: SoCLaaS and hosting

The supplied dochub URL could not be opened through the web tool or resolved from the workspace. Official publicly indexed SoCLaaS guides were available instead:

- https://soclaas.comp.nus.edu.sg/guides/ explicitly states the API gateway is Internet-reachable although portal/chat/documentation are NUS-network-only.
- https://soclaas.comp.nus.edu.sg/guides/api.html specifies base URL https://soclaas-api.comp.nus.edu.sg/v1, Bearer-key authentication, GET /v1/models and POST /v1/chat/completions. Capabilities vary by model.
- Public guides did not establish exact request/token/concurrency quotas for the team's account. Do not treat marketing language about unlimited usage as a quota guarantee.
- Workspace unauthenticated reachability probe returned curl DNS resolution failure / HTTP 000. This establishes only a limitation of this environment; it does not establish a provider or Cloudflare failure.
- No account key was supplied, no authenticated completion was run, and neither hosting platform was provisioned. Host-specific connectivity remains an implementation gate.

Cloudflare https://developers.cloudflare.com/workers/platform/limits/ states network waiting does not count as CPU time. Free CPU budget still covers authentication, parsing, validation and other local processing. https://developers.cloudflare.com/workers/platform/pricing/ lists free allowances; verify at release.

Vercel https://vercel.com/docs/limits states Hobby cannot directly connect organisation-owned Git repositories. The assignment requires a team organisation repository. https://vercel.com/docs/functions/limitations documents function duration and payload limits; choose a supported deployment route and plan rather than assuming previous project setup transfers.

Recommendation: evaluate Cloudflare first for a lightweight API and D1. SoCLaaS Internet access supports either platform in principle. Choose Vercel if framework familiarity materially reduces work and its organisation/team deployment constraints are resolved. Vercel is not a demonstrated workaround for an NUS-only endpoint; a network restriction could affect both.

## Decisions awaiting team review

| Decision            | Draft position                                      | Consequence                                                                  |
| ------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Team size           | Confirmed two: Darryl (instructor), Keith (student) | Shared infrastructure and review contributed by both                         |
| Language            | Python                                              | Editor syntax only, no runtime                                               |
| Execution           | Excluded                                            | No test-pass claims or automatic correctness guarantee                       |
| Features            | AI assessment/annotations and progress explanation  | Textbook Q&A, tutoring, class analytics deferred                             |
| Identity            | Maintained integration; provider undecided          | Confirm host compatibility and demo account flow                             |
| Hosting             | Cloudflare selected for repository/pipeline setup   | Account configuration, deployed smoke test and CPU measurements required     |
| Provider            | SoCLaaS mandatory                                   | Record allowed model, capability and actual quotas                           |
| Retention           | Undecided                                           | Set code/result/audit retention, deletion and backup policy before real data |
| Draft/source limits | Proposed 32 KiB per question, configurable          | Review against provider context budget; reject rather than silently truncate |
| AI limits           | No guessed provider quota                           | Production AI disabled until explicit deployment configuration               |
| Deadlines           | Server-enforced; no late submissions in MVP         | Review desired late/resubmission policy                                      |

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
