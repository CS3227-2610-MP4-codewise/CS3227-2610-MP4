# Secure AI gateway setup and activation gates

Requirements AI-01–05, CON-06, OPS-01. The server-only gateway is a candidate implementation; it is not connected to a production route. Supplying a key does not activate it. Do not paste keys into chat, Git, frontend build variables, logs or screenshots.

## Local development

1. From the project root, copy `.dev.vars.example` to `.dev.vars` if no local file exists. If it already exists, preserve the existing Firebase/Gmail settings and add only the entries below.
2. In the ignored `.dev.vars` file, enter `SOCLAAS_INSTRUCTOR_API_KEY` for instructor assessment. Leave `SOCLAAS_STUDENT_API_KEY` empty until Keith's separate key and progress consumer are ready. If using both, use distinct keys. Do not use `VITE_` names.
3. Local fake-provider tests do not require either key. No live model call is enabled by these entries; a trusted application composition and verified configuration are still needed.

```dotenv
SOCLAAS_INSTRUCTOR_API_KEY=<your-instructor-key>
SOCLAAS_STUDENT_API_KEY=<separate-student-key-or-empty>
```

Use placeholder text only in documentation; enter real values privately in `.dev.vars`. Check `git status` before any commit. The existing `.gitignore` excludes `.dev.vars`.

## Cloudflare staging and production

Use the Workers **Settings → Variables and Secrets** interface for the correct environment to add `SOCLAAS_INSTRUCTOR_API_KEY` as a secret, not a plaintext variable. Add `SOCLAAS_STUDENT_API_KEY` separately only when needed. Wrangler supports `npx wrangler secret put SOCLAAS_INSTRUCTOR_API_KEY --env staging` and prompts for the value; check the selected Worker/account first. Cloudflare may create/deploy a new Worker version when changing secrets: follow the project's reviewed staging and release workflow. Production deployment and secret changes are not authorized by this guide. Keep staging and production secrets isolated; never place these values in `wrangler.json` or GitHub logs. See https://developers.cloudflare.com/workers/configuration/secrets/.

## Before any activation

- Obtain actual account/model capability and quota evidence through the authorized SoCLaaS portal and `GET /v1/models`. Confirm the selected model's structured-output support, safe input/output bounds including message overhead, and any provider limit sharing between keys and environments. The public guide identifies the API but does not prove this account's quota: https://soclaas.comp.nus.edu.sg/guides/api.html.
- The local D1 implementation enforces a fixed-window policy. It must not be activated unless the real provider's quota semantics are compatible, or a stricter verified enforcement strategy is implemented. Separate D1 databases do not coordinate a shared upstream quota across environments. Require demonstrably independent upstream quotas or a shared global coordinator before concurrent environments are enabled.
- Require current authorization and immutable evidence resolvers, action-specific validators and separately reviewed deployment wiring. A student request must fail closed until Keith's progress validation/selection is installed and reviewed.
- Prepare a separately authorized staging-only check behind access control: use an isolated staging account/database and synthetic content, inspect enabled model capability/quota evidence, run one bounded completion, and retain only environment, revision, model, outcome, latency and redacted usage. Do not record keys, prompts or learner code. Separate approval is required before making live provider calls.
- Production activation requires the reviewed release workflow, successful staging evidence, verified quotas and capacity, and explicit user/team decision. Manual grading and saves remain available while AI is disabled.
