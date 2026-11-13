# student-progress verification

Requirements: SP-01–SP-10 (refining PROG-01–03), AI-01, AI-02, CON-06, OPS-01; UI-01/07/08 (`warm-workbook-v1`). Owner: Keith. Branch `keith/student-progress`, base `b362618`, uncommitted working tree on 2026-11-13. All data is synthetic. No live provider call, deployment or remote change was made.

## `npm run check` (2026-11-13T04:19Z)

| Step | Result |
|------|--------|
| `specs:validate` (`openspec validate --all --strict`) | 22 passed, 0 failed, including `change/student-progress` |
| `typecheck` (`tsc --noEmit`) | passed |
| `lint` (`eslint .`) | passed. The first run failed `no-ex-assign` in `src/server/student/http.ts`, which I fixed. |
| `test` (vitest) | **1 failed**, 878 passed, 2 skipped (72 files) |
| `build` | not reached, because `npm run check` stops at the failing test step |

The one failure is `workflow/ai-quality-evaluation/ledger.test.ts`, "reserves first, records bounded redacted output and refuses reopening" (`SoclaasTransportError: invalid_response`). **It predates this change.** It fails the same way on unmodified `b362618`: I stashed all changes, ran the file alone (1 failed, 9 passed), then restored. It is Darryl's evaluation ledger, which this change does not touch. So `npm run check` does not pass end to end, and task 6.1 is not checked.

## Focused results for this change

| File | Result | Covers |
|------|--------|--------|
| `src/shared/student-progress.test.ts` | 37/37 | Validator: citations, keys, recurring issue and improvement scores, flat keys, duplicates, closed shape with no score fields, bounds, idempotent re-validation. Text checks: 16 blocked samples (URL, email, code, score, override, markup, newline) and 3 allowed prose samples. Comparability and facts. Request and stale-view shapes. |
| `src/server/student/progress.test.ts` | 24/24 | SP-01 selection (newest released attempt per assignment, withdrawn excluded, cap 8). SP-02 401, uniform 404, body with evidence gets 400, missing origin, revoked student. SP-03 both insufficient reasons with no gateway row. SP-04 AI not configured gives 503 `AI_DISABLED`; mapping back to real IDs; student key used; prompt has no source, IDs or annotations; limiter 429 with `Retry-After`. SP-05/08 revisit with no second provider call; stale after replacement; withdrawal; mid-request replacement gives 409 and nothing stored. SP-10 injected explanation, title and key stay in `notes`; 5 kinds of complying output all rejected with nothing stored. Task 3.6: `progressGatewayConsumerContractSuite` (4 checks) against the real `SecureAIGateway`, resolver and validator. |
| `workflow/connected-preview/normal-progress.test.ts` | 1/1 | Composed Worker (`createApplication`) with real auth, two assessments released through Darryl's `AssessmentWorkflow`, the real `studentReleasePort` and the real gateway over a stubbed provider fetch. Disabled by default (ready with `aiAvailable:false`, POST gives 503 `AI_DISABLED`, 0 provider calls). Once enabled: explained, the student key is sent (never the instructor key), revisit reuses the stored result (1 provider call total). |
| `src/server/ai/runtime-config.test.ts` | 4/4 | 2 existing instructor checks unchanged. 2 new student checks: fails closed; independent of the instructor switch both ways. |
| `src/server/student/routing.test.ts` | 1/1 | Progress GET and POST give 401 without a session, no storage touched |
| `src/web/student/Progress.dom.test.ts` | 10/10 | Route parsing. Evidence links. Heading focus. Disabled while generating, with status announcement. CSRF header and a body containing only the idempotency key. Labelled explanation with empty sections omitted and no score, total or percentage text. Stale text withheld. Both insufficient reasons. AI unavailable. Rejected output and 429 states. Session failure. Course-page link. |
| All `src/web/student/` and shared progress tests | 223/223 | Includes the existing CSS regression rule for link colours |

## Limitations

- No live SoCLaaS call. Task 6.4 (a local live check with your student key) is still to do.
- Quota pool: the gateway pins one `soclaas-shared` policy. While both features are enabled, the student config's six limit values must equal the instructor's (design D7).
- Selection reads the newest 50 attempts in the course (D1). An assignment whose only released attempt is older than those 50 is left out.
- Visual, responsive and contrast checks are not done (see `ui-review.md`).

## Update after the live check (2026-11-13)

- The prompt and the `progressText` label rule changed (`live-check.md`). Rerun: `student-progress.test.ts` (now 39 tests), `progress.test.ts` and `normal-progress.test.ts`, 64/64 passing. Typecheck and lint clean.
- The live harness `workflow/student-progress/live-progress.test.ts` skips without `PROGRESS_LIVE=1` (2 skipped), so `npm run check` stays offline.

## Local review fix (2026-11-13)

Keith's first local generation failed with `INVALID_CONTRACT` (the gateway row shows only the code). A probe found the code check rejecting ordinary feedback prose: `\breturn\s+\S` matched "should return the sum", and `\bimport\s+\w+` matched "import statements". Both now match only code-shaped uses: `return` followed by a call or operator, and `import` at the start of the text. Three new code samples are still rejected and three new prose samples are allowed. The resolver now logs the failing rule's path and code (never the text) as `student-progress: model output rejected` in the `npm run dev` terminal. `student-progress.test.ts` and `progress.test.ts`: 76/76. This is not confirmed as the cause of Keith's specific failure until the next local attempt, since the original output was not stored.

Second local attempt: the server log showed `[{"path":"$.suggestions[0].text","code":"label"}]`, meaning the model wrote an R/K label into a suggestion despite the prompt. Labels that exist in the context are now accepted and shown as the quoted assignment title or criterion name; unknown labels are still rejected (`unknown_label`). Progress suites: 88/88.

## Keith's local run through the real app (2026-11-13)

Keith ran the composed app locally (`npm run dev`, port 8787, local D1) against SoCLaaS with his student key, on his own local test data. The progress gateway rows, read for status only:

| UTC | Status | Cause / outcome |
|-----|--------|-----------------|
| 04:58:42 | failed `INVALID_CONTRACT` | Code check false positive on "return" prose (fixed) |
| 05:03:12 | failed `INVALID_CONTRACT` | `$.suggestions[0].text` contained a label (fixed: known labels renamed) |
| 05:05:20 | succeeded | |
| 05:10:16 | succeeded | Stored as the latest result (`student_progress_results`, 1 row) |

Keith accepted the result. This is the first live evidence for the revised prompt and payload (decisions 4–5) through the real composition. It does not cover the 3.9 case matrix (single assignment, unrelated rubrics, full marks, injected text), and the output text was not read or recorded by the agent.
