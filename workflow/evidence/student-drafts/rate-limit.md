# Rate-limit binding gate (task 8.1, SW-11)

## Writer window

Keith reported on 2026-11-12 that Darryl agreed Keith may edit the `ratelimits` entries in `wrangler.json` and the binding type in `src/server/environment.ts`. Recorded in `workflow/Ownership.md` ("Extension — rate-limit binding").

## Documentation checked (2026-11-12)

- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ : `period` "Must be either 10 or 60"; "Rate limits are approximate and apply separately in each Cloudflare location"; requires Wrangler 4.36.0 or later (project: 4.157.0). The page does not say whether the binding is available on Workers Free, and does not describe local development.
- https://developers.cloudflare.com/workers/platform/pricing/ : does not mention the binding.

## Local development (measured 2026-11-12)

Throwaway probe Worker outside the repo with one binding (`limit: 12, period: 60`), `wrangler dev` 4.157.0. Wrangler listed `env.SAVE_LIMITER (12 requests/60s) Rate Limit local`. 13 requests on one key: the first 12 were allowed (one was a readiness probe) and the rest returned 429; a second key was allowed. So the binding is simulated locally and enforces per key.

## Deployed probe on the Codewise deployment account (2026-11-11 UTC)

Keith deployed the same throwaway probe Worker (`rl-probe`, one binding `limit: 12, period: 60`; not Codewise) with his own login to the account Darryl uses for Codewise deployments, with Darryl's access. Wrangler accepted the binding: it listed `env.SAVE_LIMITER (12 requests/60s) Rate Limit` and deployed to `rl-probe.<account>.workers.dev` (version `384ab22f`).

The Coordinator then sent requests from one client, all answered by the same Cloudflare location (`cf-ray` suffix `SIN`):

| Time (UTC) | Key | Requests | Result |
|---|---|---:|---|
| 16:55:05 | `a` | 15 back to back | all 200 |
| 16:55:05 | `b` | 1 | 200 |
| 16:55:26 | `c` | 40, 0.3 s apart | all 200 |
| 16:55:26–16:56:58 | `warm` | 1 every 5 s for 75 s, then 5 back to back | all 200 |
| 16:56:58 | `d` | 30 back to back | all 200 |

**Outcome:** on this account the binding deploys but did **not** enforce: no request was refused at up to 40 requests per key per minute, from one location, over about two minutes. Cloudflare documents the binding as approximate, but not as allowing more than three times the limit with no refusals. Whether this is a Free-plan restriction or a delay after a new deployment is not established; the documentation does not say. For SW-11 this means the binding cannot be relied on for saves on this account, so saves use the D1 fallback (`AuthStore.rate`), as the design allows.

The probe Worker is to be deleted by Keith (`wrangler delete --name rl-probe`).

## Decision (Keith, 2026-11-12)

The binding is dropped. Saves and submits both use `AuthStore.rate`; `wrangler.json` and `environment.ts` are not changed. Darryl's writer-window extension stays on record in `workflow/Ownership.md` in case the binding is revisited.

## Implementation (tasks 8.2, 8.3; 2026-11-12, uncommitted on `keith/student-drafts`)

- Server: `src/server/student/rate-limit.ts` (`RateLimiter`, `d1RateLimiter` over `AuthStore.rate`, keys `student-save:<account>` / `student-submit:<account>`), applied in `StudentWork.save` and in `StudentWork.submit` after the replay lookup; composed in `src/server/index.ts`; 429 carries `Retry-After: 60`.
- Client: a 429 maps to `rate-limited`; the draft controller pauses every save until `Retry-After` (no requests sent meanwhile; text and tab backup kept; status "Saving paused for a moment…"), then saves automatically; a submit 429 shows a retry message and keeps the idempotency key.
- Tests: 4 server tests on local D1 with the real limiter (13th save, 4th submit, same-key replay over the limit and after the deadline, unauthenticated requests not counted, per-account isolation, next window), 4 `Retry-After` parsing cases, 2 model tests (pause and resume, no backoff inflation), 1 DOM test (submit 429 then same-key retry).
- `npm run check`: exit 0, 47 files / **610 tests** passed, build passed. [Output](rate-limit-check.txt).
