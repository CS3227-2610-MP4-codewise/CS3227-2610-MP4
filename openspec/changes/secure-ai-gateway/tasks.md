# Tasks

- [x] 1.1 Record exclusive Darryl writer/migration window, contract scope and separate credential policy. [AI-01–05, CON-06, OPS-01]
- [x] 1.2 Implement fixed-origin bounded SoCLaaS transport and synthetic failure/security tests. [AI-01/02/04]
- [x] 1.3 Implement persisted atomic admission, request and quota/lease state, bounded retry and conservative recovery. [AI-03/04/05]
- [x] 1.4 Compose action validators, authorized evidence/cache reads and explicit unavailable usage. [AI-02/05, CON-06] — Candidate injected boundary only; Keith's real progress resolver remains pending.
- [x] 1.5 Verify cross-replica, mismatch, expiry, exhaustion, revoked/cross-scope, invalid and missing usage scenarios; independently review and run project checks. [AI-01–05, CON-06] — Default-timeout check failed in auth; full extended-timeout test suite and separate remaining checks passed; see evidence.
- [ ] 1.6 Publish setup and restricted staging verification guidance, exact consumer contract and pending Keith review; obtain manual acceptance. [AI-01, CON-06, OPS-01]
- [ ] 1.7 Verify actual model capabilities, quotas and authorized hosted connectivity before any live activation. [AI-01, OPS-01]

## Readiness audit — 2026-11-12

- [x] 2.1 Audit current source, OpenSpec and historical evidence; classify verified source behavior, confirmed defects and external account-specific gaps. Publish normal-app wiring, private configuration, staging-only synthetic plan and proposed Keith writer windows. [AI-01–05, CON-06, OPS-01] See `workflow/evidence/secure-ai-gateway/readiness-audit.md` and progress consumer handoff; this checks packet preparation, not Keith acceptance or live readiness.
- [x] 2.2 Implement bounded `gateway-reported-bounds-01`: reject component overruns, retain unsafe-total debt, preserve valid usage through malformed/truncated content; independent review and focused transport verification recorded. Human acceptance waived by Darryl; integrated D1 checks are separately pending below. [AI-02–05]
- [ ] 2.3 Execute current repaired gateway/store D1 regressions, concurrent admission/rollback/restart and real request-bound session/account/membership revocation, CSRF and cross-course denial in an environment permitting Miniflare loopback. Current setup fails EACCES; no passing integration claim. [AI-03–05, CON-06]
- [ ] 2.4 Keith reviews exact producer source and supplies/runs real progress resolver/validator/currentness/cache consumer checks; jointly agree normal-app shared wiring window. [AI-02/05, CON-06]

Tasks1.1–1.5 retain their historical candidate status, not fresh exact-revision verification. Task1.6's local packet is refreshed; Keith/manual composed acceptance is still absent. Darryl's current waiver covers the bounded local server repair, not staging or Keith. Task1.7 remains unresolved. No archival or live activation.
