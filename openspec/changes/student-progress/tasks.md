# Tasks

## 1. Coordination

- [x] 1.1 Record Keith's shared write window for `environment.ts`, `ai/runtime-config.ts`, `index.ts` and `.dev.vars.example` in `workflow/Ownership.md`, with Darryl's review pending (D7; AI-01).
- [x] 1.2 Recheck the next migration number against `main` before creating the migration (D5). Checked 2026-11-13: `origin/main` ends at 0016, so this change uses 0017.

## 2. Shared contract

- [x] 2.1 `src/shared/student-progress.ts`: closed `ProgressExplanation` payload schema, `ProgressView` DTO union and `progressRequestSchema` (`{idempotencyKey}` only) (SP-06, SP-07, SP-08, SP-09).
- [x] 2.2 `validateProgressExplanation(payload, selection)`: checks citations, comparable keys, recurring-issue and improvement scores, and bounds. Unit tests cover each rejection (SP-06, SP-07, PROG-02).

## 3. Server

- [x] 3.1 Evidence selection: guarded attempt read, `attemptReleases` batch, newest current release per assignment, cap 8 and currentness recheck. Tests: withdrawn, superseded and unreleased excluded; foreign course gets 404; revoked membership gets 404 (SP-01, SP-02, PROG-01).
- [x] 3.2 Comparability gate with `too-few-releases` and `no-comparable-criteria` reasons, making no gateway call (SP-03, PROG-01). Superseded by 3.8: only `no-feedback` skips the gateway now.
- [x] 3.3 Progress resolver: re-selects on every call, rejects mismatched refs as stale, builds a bounded prompt from comparable criteria only, uses a currentness-bound evidence key, and wires in the validator (SP-04, SP-05, AI-02).
- [x] 3.3a Injection tests (D9): adversarial fixtures in an explanation, a title and a key; a prompt-builder test checks the text stays in `notes` only; fake "complying" outputs (unsupported claim, URL, score, code) are rejected and not stored (SP-10, AI-02).
- [x] 3.4 Migration `student_progress_results` and the repository's upsert and read, bound to the caller (SP-08, PROG-03).
- [x] 3.5 Progress service, plus `GET` and `POST /api/student/courses/:course/progress` in `http.ts`: origin check and rate limit on POST, closed bodies, safe error mapping, `Retry-After` (SP-01, SP-02, SP-04, SP-05, SP-08).
- [x] 3.6 Instantiate `progressGatewayConsumerContractSuite` against the real resolver, validator and `SecureAIGateway`, with a fake transport and the test D1 fixture (AI-01, AI-02, CON-06).
- [x] 3.7 Staleness tests: a release replaced after generation gives `stale` and no text; unchanged evidence returns the stored result without a transport call; a release replaced mid-request does not succeed (SP-08, PROG-03).

- [x] 3.8 Revision 2026-11-13 (decisions 4 and 5): summaries for every student with released feedback (newest 3), comparison only for shared criterion names, a `no-feedback` state, server-computed `allFullMarks` with "Good job! Keep up the good work.", strength and focus rules, and updated prompt, view, page and tests (SP-03, SP-06, SP-06a, SP-07, SP-09).
- [ ] 3.9 Re-run the live local check for the revised prompt and payload. Calls 1–4 used the earlier prompt and shape, so they say nothing about this version (AI-01, SP-06). 2026-11-13: two successful generations through Keith's local app (`verification.md`). The case matrix is still open.

## 4. Shared wiring (Darryl review pending)

- [x] 4.1 `environment.ts` adds `SOCLAAS_STUDENT_ENABLED`/`SOCLAAS_STUDENT_CONFIG`. `runtime-config.ts` adds `studentAIConfig` through a shared parser, with instructor behaviour unchanged and the existing tests passing. `.dev.vars.example` gets blank entries (AI-01).
- [x] 4.2 `index.ts` composes the progress gateway into the student handler only when the student config is valid. Absent config gives `AI_DISABLED` (AI-01, OPS-01).

## 5. Web

- [x] 5.1 Student route `/student/courses/:course/progress` and its API client methods. A Progress link appears in the course assignment-list header (SP-09, UI-01).
- [x] 5.2 `Progress.tsx` covers every state: loading, unavailable, insufficient evidence, ready, generating, failed/rate-limited, stale and explained. It has the evidence list with Released feedback links, the AI-generated note and the four labelled sections (SP-09, UI-07, UI-08).
- [x] 5.3 DOM tests: state announcements, disabled-while-generating, evidence links, no score or total text, stale text withheld (SP-09, UI-07, UI-08).

## 6. Verification and handoff

- [ ] 6.1 `npm run check` passes. Record the exact output in `workflow/evidence/student-progress/`. 2026-11-13: recorded in `verification.md`. Every progress check passes, but the run fails on `workflow/ai-quality-evaluation/ledger.test.ts`, which also fails on unmodified `b362618`. This stays unchecked until that test passes.
- [x] 6.2 Fill in `workflow/templates/ui-review.md` for the Progress page (warm-workbook-v1, UI-01/03/07/08) with actual evidence. Keith's manual checks are recorded separately and are not claimed by the agent. 2026-11-13: the automated rows are filled in `workflow/evidence/student-progress/ui-review.md`; visual, responsive and contrast rows are pending Keith. 2026-11-13: Keith reported the manual checks complete (not itemized) after local acceptance.
- [x] 6.3 Write the handoff `workflow/handoffs/student-progress.md`: requirement IDs, owned and shared files, Darryl review pending, live provider activation not done, next owner.
- [x] 6.4 Live local check with Keith's SoCLaaS student key: Keith enters the key privately in `.dev.vars`; it must differ from the instructor key. Use only synthetic released feedback and the local D1. Set a bounded `SOCLAAS_STUDENT_CONFIG` (`qwen3-coder-next`, output cap ≥1024) and allow at most 4 generation attempts, with no retries after a 429 or timeout. Include one synthetic release with an injected explanation. Record only the model, outcome, whether that injection was rejected or ignored, latency, redacted usage and whether the validator accepted the output, in `workflow/evidence/student-progress/live-check.md`. This is not staging or production activation (AI-01, OPS-01, SP-04, SP-07). 2026-11-13: done (4 calls) in `workflow/evidence/student-progress/live-check.md`. Two findings were repaired: evidence written as prose under injection, and R/K labels leaking into text.
- [ ] 6.5 Mark `codewise-mvp` tasks 7.1–7.4 as delivered by this change only after 3.1–3.7 and 6.1 pass. Staging and production activation stay a separate gate (AI-01, OPS-01).
