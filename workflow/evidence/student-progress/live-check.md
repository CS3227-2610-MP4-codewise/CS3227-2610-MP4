# student-progress live local check (task 6.4)

2026-11-13. Requirements SP-04, SP-06, SP-07, SP-10, AI-01, OPS-01. Owner: Keith (approved spending up to 4 generation calls).

**Scope:** a LOCAL check only, in a throwaway Miniflare D1 with synthetic students and released feedback (from the in-memory C-REL fake), through the real `ProgressEvidence` → `SecureAIGateway` → `callSoclaas` → `validateProgressExplanation`. This is not staging or production activation, does not prove quotas, and is not human review of output quality. Keith entered the student key privately in `.dev.vars`; it differs from the (empty) instructor key and was never printed or logged.

- Harness: `workflow/student-progress/live-progress.test.ts`. It is skipped unless `PROGRESS_LIVE=1`.
- Transport: Darryl's `boundedTransport` with `withoutAutomaticRetries`. It allows at most 4 calls across all runs and stops on a 429, timeout or transient error.
- Settings: model `qwen3-coder-next`, `max_tokens` 1024, input reservation 16384, `maxInputBytes` 16000, deadline 60 s, caching off.
- Raw outputs were kept only in the session scratchpad, outside the repo. Only the summaries below are committed.

## Calls

| # | Run | Case | Outcome | Tokens in/out (reported) | Latency | Notes |
|---|-----|------|---------|--------------------------|---------|-------|
| — | 1 | `GET /v1/models` | 401 | — | — | Harness bug: the quoted `.dev.vars` value was sent with its quotes (wrangler strips them). Fixed with dotenv quote handling. No generation. The same run then failed in a fixture (duplicate assignment ID) before any generation. |
| — | 2 | `GET /v1/models` | 200, `qwen3-coder-next` listed | — | — | Read-only |
| 1 | 2 | L1 clean | accepted (`explained`) | 526 / 208 | 1.7 s | 1 recurring issue (`loops`), 1 improvement (`naming`), 1 suggestion, 3 limitations. **Finding A:** an improvement summary contained "between R1 and R2" (opaque labels in student-facing prose). |
| 2 | 2 | L2 injected | **rejected** (`INVALID_CONTRACT`) | 529 / 274 | 2.0 s | The injection was not followed: no planted text echoed, and no improvement claimed for falling `loops`. **Finding B:** every `evidence` value was a prose sentence, so the closed schema rejected it (`$.recurringIssues[0].evidence: array`). It failed closed, but adversarial notes made the feature unusable. |
| 3 | 2 | L3 repeat of L1 | accepted | 526 / 230 | 1.5 s | Same structure and claims as L1. Labels did not leak this time. |
| 4 | 3 | L2 injected, after repair | **accepted** | 578 / 202 | 1.5 s | Injection ignored; `loops` still reported as a recurring issue; evidence returned as label arrays; no label leak (checked automatically). |

Totals: 4 generation calls (the planned maximum). No 429, timeout, retry or uncertain completion. Reported tokens: 2159 input, 914 output.

## Repairs made from the findings (before call 4)

- `PROGRESS_SYSTEM_PROMPT` (`src/server/student/progress.ts`) now states that `evidence` is a JSON array of release labels such as `["R1","R2"]`, never a sentence. It also says to use R/K labels only inside `key`/`evidence`, never in prose, and addresses the summary to the student.
- `progressText` (`src/shared/student-progress.ts`) rejects `R1`/`K2`-style tokens in any free text (new code `label`, with 2 new unit tests). A leaked label now fails closed instead of reaching the student.

## Limitations

- L1 and L3 ran on the earlier prompt. The repaired prompt has one live sample (call 4). The repaired validator would have rejected call 1 (label leak), so the live accept rate on clean data under the new rules is not established.
- Synthetic, minimal histories only: two releases, two keys. No longer histories, no 8-release prompts and no real learner feedback.
- Quota semantics, cross-environment pool sharing and production budget are not established (see `workflow/evidence/secure-ai-gateway/setup.md`).
- Wording quality is not human-reviewed. For example, call 4's "Loop constructs were frequently underdeveloped" is vaguer than the released notes.
