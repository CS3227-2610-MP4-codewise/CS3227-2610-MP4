# Tasks

- [x] Implement bounded authorized context and versioned private reference selection (AI-02/05).
- [x] Persist validated private candidates with provenance and atomic explicit adoption (GRADE-01–04).
- [x] Add warm-workbook generation and review states preserving unsaved edits (UI-01/04/06/07/08).
- [x] Verify adversarial output, stale evidence, revocation, provider failures and races with synthetic data; run project checks. Serial suite passed 666/666; default parallel run failed as recorded in verification.
- [ ] Complete independent review, UI evidence and manual acceptance; record real submission and live provider gaps.

## Current worktree continuation — 2026-11-12

Normal instructor composition and default-off server configuration are in progress at base `f787176`. The real submission producer and release path are present. The existing checked tasks above refer to prior isolated behavior, not complete normal-app acceptance. Independent review found a restart gap after gateway success and before candidate persistence; durable mapping/recovery and tests remain required. Provider facts, final review, UI evidence and manual acceptance remain open. No live provider call or deployment is authorized by this continuation.

- [x] Verify the normal application and restart recovery with request-bound authorization, D1 race/revocation and provider-free synthetic transport tests; complete independent re-review and required checks. [AI-01–05, GRADE-01–04] Normal-entry test and serial suite passed; default parallel command failed as recorded in verification.

- [x] Repair and verify the live-observed 512-token truncation using a 1024-token bounded instructor request and fail-closed compatible configuration; preserve original attempt and verify continuation accounting. [AI-03/05, GRADE-01/02] Q1 live repair succeeded; provider-specific bounds remain a deployment gate.

- [ ] Fail closed for blank-source AI candidates and preserve manual grading; verify no provider dispatch or candidate disclosure for blanks and retain the live failure. [AI-02/05, GRADE-01/02]

## Instructor interaction refresh — 2026-11-13

- [x] Simplify instructor AI generation/options and structured per-question review; preserve explicit reference opt-in and adoption. [AI-02/05, GRADE-01/02, UI-01/04/07/08]
- [x] Refresh source/feedback layout, approval completeness, authoring and submission navigation; verify browser and regression behavior. [UI-01/04/05/06/07/08]
- [x] Prevent internal/repeated focus events from creating reauthorization loops; coalesce genuine foreground checks and verify denial/session recovery. [AUTH-01/02, UI-03/08]
- [x] Run required checks and record actual visual evidence and remaining acceptance gaps. [UI-07/08]
