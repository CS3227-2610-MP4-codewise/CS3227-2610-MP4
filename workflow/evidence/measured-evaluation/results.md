# Synthetic evaluation checkpoint

Requirements: DEV-02/04, AI-05, GRADE-01. Date: 2026-11-08. Dataset `f6a44b957a489a226d1de89f19a0e23b1eaa4c6d512a580051d78ec5cdffc78d`: five deterministic response variants of one synthetic publication/attempt, not five independent submissions. Expected validity is an engineering oracle; instructor review is pending. No student code was executed.

## Context control

Command: `npx vitest run workflow/measured-evaluation/evaluation.test.ts --disableConsoleIntercept --reporter=verbose`. Two tests passed; the reported process duration was 654 ms, with 25 ms test time. One fixed run executed five validation cases per condition: both arms accepted the valid and untrusted-output-flag variants and rejected fabricated excerpt, missing criterion and out-of-range score. A separate injected-question check verified only that attack text remains in the user context and not the system policy; it did not test model instruction following or release.

The locally constructed full JSON artifact was 2474 bytes (SHA-256 `db867a657e9512ec801b239e620b9952aafae9fe583bcfcd35c9ed94fbd7b417`); selected was 1033 bytes (SHA-256 `816b22b54f441f6dcf22fa876076011b5d7226a5a0f90120862796df294d982c`). These are not actual gateway envelopes or token measurements. Both arms called the identical validator on the same publication and attempt; the additional full-context data was not consumed. Thus this is a harness/validator control, not a context-output, grading-quality or latency comparison. Individual validation call times ranged 0.09–11.94 ms in this run, ordered full first; warmup/order effects preclude speed conclusions. Provider/model tokens, model latency and real-model outcomes are unavailable.

## Coordination exercises

Main-only exercise A identified reversed ranges and coercible fractional indices; no execution, human correction, comparable elapsed time or isolated token attribution was measured. Coordinated exercise B: `/root/exercise_worker` independently identified those defects and numeric-string coercion, plus surrounding authorization and version-binding needs. Worker reported 6 seconds between its clock readings, excluding startup and communication; this is not comparable to end-to-end or main-only elapsed time. `/root/eval_review` was given the worker's finding and reproduced selected cases in a synthetic Node check, adding pinned identity/authorization and canonical line-splitting concerns. It was verification, not blinded independent discovery. A and B share the same defect class; task order, different participants, prior context and reviewer visibility confound the comparison. Human-reviewed correctness, correction counts, total worker/reviewer tokens and complete elapsed time remain unavailable. No defensible efficiency or quality improvement is claimed.

The project-scoped local recorder's provisional main-agent snapshot for the entire implementation turn (`turn-da821e019bc29b1392bc9de9`) reported 6,612,460 input tokens, including 6,606,464 cached input, and 6,826 output tokens, total 6,619,286. This is not an exercise-level measurement, excludes later calls and the final response, and cannot compare conditions. Child attribution is unavailable. Cached input is included in input, not added to the total.

## Pending

Instructor scoring and annotation review, model outputs under comparable context conditions, actual provider usage, attributable experiment-level agent token totals, fuller controlled tasks and Keith-attributed progress results are unavailable. The existing provider activation gates remain open. The experiment does not modify or substitute for release review.

## Assistant review requested by Darryl

On 2026-11-08 Darryl requested that the assistant review the five variants. The assistant's case-by-case judgments and proposed corrections are in `workflow/measured-evaluation/REVIEW.md`: a provisional 5/5 for the baseline with a less certain static-inspection explanation, rejection of fabricated evidence, missing criterion and out-of-range score, and human review of the structurally accepted untrusted flag. This is assistant review, not an independent instructor review, actual instructor corrections, or model-quality evidence. It does not satisfy the human-review requirement or change approval/release rules.

## Verification and review

`npm run check` with `VITEST_MAX_WORKERS=2` passed strict validation of 11 changes, typecheck, lint, 354 Vitest tests, four deployment tests and build. Focused synthetic evaluation: two tests passed. Independent reviewer identified misleading context and injection interpretations, unpinned conditions and anchoring in the review sheet; the main agent corrected the labels, hashes and sheet, and the reviewer confirmed the final sheet. The reviewer initially suspected an escaping error then verified and retracted it; no code repair was needed for that claim. Human review and acceptance remain pending.
