# Credential runtime prerequisite — 2026-11-06

Darryl approved the revised NUS credential/SendGrid plan and confirmed **Workers Free**. The approved design section5 requires a hosting/auth-runtime decision before credential implementation if secure hashing does not fit. This spike tests that prerequisite only; it does not implement or complete login, signup, reset, instructor authorization or mail.

## Actual local check

- Pinned `argon2id@1.0.1` (OpenPGP.js), registry version checked, installed with scripts disabled into ignored `.wrangler/argon2-spike-pkg`. No root application dependency changed. Source [package](https://github.com/openpgpjs/argon2id) and custom static loader were inspected; dynamic WASM compilation is avoided.
- Isolated local workerd through Miniflare, static CompiledWasm modules, cached initialization/instance. Argon2id parameters m19456KiB, passes2, parallelism1,32-byte tag. All inputs are synthetic. No DB, live identity, network mail or Cloudflare deployment.
- External wall timing is recorded separately from inspector sampled non-idle time and WASM-only samples in [hash-spike.json](hash-spike.json). Do not label these as actual deployed/billed CPU. Detailed profiles remain in ignored local storage.
- First successful run: four warm single hashes sampled110.531–130.493ms non-idle, including79.592–91.505ms sampled WASM-only activity. Cold sample161.075ms non-idle. Baseline no-op18.954ms illustrates inspector/program overhead; WASM-only samples exclude that baseline and still materially exceed10ms. Later reproducibility runs may update the linked JSON; these are dated initial observations, not an assertion of identical timings on every host.
- Correct/wrong verification and64-Unicode-character versus72-byte truncation comparisons produced the expected results; these cases each perform **two** hashes and are labelled accordingly. They are functional comparisons, not an independent known-answer/RFC certification of the library.
- Cached WASM allocation measured68,157,440bytes (65MiB), separately from JS heap. Four-request burst reused that allocation. Neither JS heap nor this allocation proves total isolate high-water memory or production capacity.

## Outcome and review

**Reject this candidate/current local-password design for the confirmed Free budget.** Current [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) specify10ms/request CPU on Free; [local limits are not deployed enforcement](https://developers.cloudflare.com/workers/wrangler/configuration/). The experiment does not prove that every possible algorithm/implementation is mathematically impossible on Free, nor does it claim a measured deployed-limit failure. It provides enough evidence to avoid relying on this implementation for that budget. Parameters were not weakened.

One existing read-only reviewer `/root/auth_review` investigated primary runtime/library sources and reviewed the concrete helper/results. It confirmed the method, cached static loading, two-hash labelling, memory distinctions and narrow gate conclusion; no blocking benchmark defect. Reviewer did not run the benchmark independently. Missing known-answer vectors are a limitation, not a basis to claim production hash correctness.

Scoped helper lint and local execution are the relevant checks. Application code remains unchanged; previous145+4 application results are historical evidence for Google, not the new flow. Initial inspector transport/target integration errors were corrected; failed attempts are not passing benchmark results. No tier/account configuration, paid subscription, deployment, production migration, credentials or actual emails changed.

## Decision packet — alternatives remain proposed

1. Retain in-Worker credential hashing on a CPU-capable approved runtime/tier. [Workers Paid pricing](https://developers.cloudflare.com/workers/platform/pricing/) starts atUS$5/month plus usage; Darryl has not approved purchasing/enabling it. A separately authorized staging resource check would still be required before rollout.
2. Keep Workers Free and move credential authority to a managed authentication service with an appropriate free quota. Candidate **Supabase Auth** currently offers50,000 monthly active users on its Free plan and supports custom SMTP including SendGrid ([pricing](https://supabase.com/pricing), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)). This is research, not an adopted/verified integration. Before edits, revise credential ownership (one authority, no duplicate password store), stable-ID migration, server-only trust/session mapping, disabled public signup, non-expiring app-owned instructor invitations, domain restriction and FoC reset-contract mapping. Do not assume provider OTP/lockout/password defaults exactly match the approved contract.

Workers Free can remain the web/session/invitation/API layer if password computation is delegated and the composed requests fit measured limits. Real instructor authority still comes from Keith; real NUS email evidence remains pending. Creating external accounts, handing credentials to a new provider or claiming live functionality is not authorized by this alternative discussion.

**Email cost is separate:** SendGrid retired its continuing free plans and currently offers a60-day trial ([Twilio announcement](https://www.twilio.com/en-us/changelog/changes-coming-to-sendgrid-s-free-plans), [current trial](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/upgrading-your-plan)). Do not promise the entire stack remains permanently free or assume Darryl's SendGrid account entitlement. No email provider switch is implied.

Task1.1 approval is recorded; task1.2 remains partial until Keith agreement/addendum work; task1.3 remains unresolved at the host-budget decision. Dependent credential code is intentionally not started. Next owner: Darryl chooses a budget/runtime/provider direction; then update the bounded plan and continue implementation with independent review. This is a real prerequisite failure, not completed authentication or an optional future integration.
