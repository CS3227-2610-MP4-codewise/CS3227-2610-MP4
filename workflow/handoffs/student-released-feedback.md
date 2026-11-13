# Handoff: student-released-feedback

**Status:** implementation, reviews and local acceptance complete; ready for merge review (draft PR #32). One item remains open: task 6.3, a staging check after merge. Task 5.3 is done: the conformance suite was fixed under Darryl's grant and passes on real producer values. 18 of 19 tasks are done.

- **Human owner:** Keith (student consumer, SH-SUB). Producer owner and reviewer: Darryl (SH-REL, SH-ID).
- **Agent role / model / configuration:** Claude Code root Coordinator (Opus 5.5), one recorded session (tracker run `414f6b81`, Coordinator role). No agents spawned in that session. The automated UI checks (4.4) were run by a separate agent that Keith started from a pasted brief, outside this tracker run; its usage is not counted.
- **Requirement IDs and OpenSpec change:** SF-01–SF-08; C-REL (K5, P4); UI-01/04/06/07/08 (`docs/ui/design.md`, `warm-workbook-v1`); AUTH-01–03; OPS-01; DEV-02/04. Change `openspec/changes/student-released-feedback` (strict-valid).
- **Revisions** (branch `keith/student-released-feedback`):

  | Revision                                   | Content                                                                                                                                                             |
  | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `ed1483c`                                  | Producer `ReleaseReadPort.attemptReleases`                                                                                                                          |
  | `4d0f0f8`                                  | Consumer routes, history marker, attempt-view UI, `release-port.ts` composition                                                                                     |
  | `1edbb16`                                  | Conformance tests and shared composed test fixture                                                                                                                  |
  | `2b2b7d3`                                  | OPS-01 batched authorization and once-per-request session; **last code change**                                                                                     |
  | `71800b9`                                  | Final checks run                                                                                                                                                    |
  | `8dd9d56`                                  | Last evidence and decision commit before this handoff                                                                                                               |
  | merge of `origin/main` (`f787176`, PR #33) | Conflicts resolved in `index.ts` and `Ownership.md`; `release-port.ts` adapted to Darryl's `ownedAttempts` port (`D1OwnedAttemptReader`); **current code revision** |

  Base: `origin/main` at the time of review.

## Owned files

- **Keith's files:**
  - `src/server/student/`: `feedback.ts`, `release-port.ts`, `http.ts`, `work.ts`, `test-fixture.ts`, `composed-fixture.ts`, tests, README;
  - `src/web/student/`: `Feedback.tsx`, `feedback-model.ts`, `Attempts.tsx`, `work-model.ts`, `workbook.css`, tests;
  - `src/shared/student-feedback.ts`, `src/shared/student-work.ts`.
- **Darryl's files**, where Keith was writer only within the window, extension and amendment recorded in `workflow/Ownership.md` (2026-11-12): `src/server/instructor/ports/contracts.ts`, `src/server/instructor/assessments/service.ts` and `repository.ts` (`attemptReleases` only), `workflow/assessment-preview/attempt-releases.test.ts`, and the `studentHandler` argument in `src/server/index.ts`.
- **Unchanged:** release DTOs (`src/shared/instructor-contracts/release.ts`). No migration.

## What changed

- **Student routes:**
  - `GET /api/student/attempts/:id/feedback` (summary) and `.../feedback/:version` (one version).
  - Order: session, then the guarded own-attempt read, then the producer, then `assertCurrentRelease` and a currentness re-check.
  - 409 `STALE_FEEDBACK`; uniform 404; 503 without a producer; `no-store`; no cache.
- **History rows:** `feedbackReleased`, from one batched lookup per page.
- **Attempt view:**
  - per-question criteria tables, numbered source with letter markers, an Observations list and an announced note;
  - unavailable evidence for annotations that don't match;
  - a version selector with replaced versions and withdrawn tombstones;
  - every SF-06 state.
- **Producer:**
  - `attemptReleases` authorizes its whole batch with one session check plus one SQL ownership and current-Student check in a single D1 batch;
  - content reads keep Darryl's full `authorize`.
- **`studentReleasePort`:** supplies student read ports, resolves the session once per request, and still re-checks revocation in SQL at every step.

## Decisions

| Decision                                                                                                                         | By                 | Recorded in         |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------- |
| Version labels without times; summary version states from the currentness projection; 503 on feedback routes shows "unavailable" | Keith, 2026-11-12  | design.md D2 and D6 |
| Batched authorization amendment                                                                                                  | Darryl, 2026-11-12 | Ownership.md        |
| F1 not applicable (focus-only heading)                                                                                           | Keith, 2026-11-12  | ui-review.md        |
| S1 accepted: feedback reads not rate-limited                                                                                     | Keith, 2026-11-13  | design.md Risks     |
| Per-question Submitted and Feedback views (UI-04) deferred to a **follow-up change**                                             | Keith, 2026-11-12  | proposal.md         |

## Verification (actual results)

- **After the merge with `main` (2026-11-13):** `npm run check` exit 0 (58 files / 710 tests). Composed, conformance and producer tests pass. Conformance reads pre-release currentness on the producer side because of Darryl's release-existence rule (see conformance.md).
- **Final run at `71800b9`:** `npx openspec validate student-released-feedback --strict` exit 0; `npm run check` exit 0 (openspec 18/18, 57 files / 700 tests, 4/4 deployment tests, build). See [final-checks.md](../evidence/student-released-feedback/final-checks.md).
- **Composed local tests (real producer and instructor workflow on local D1, synthetic data):**
  - `src/server/student/release-port.test.ts` (4): own 200; foreign student and instructor 404; draft privacy; K5 sequence; revoked 404; mid-request revocation.
  - `release-conformance.test.ts` (4) and `workflow/assessment-preview/attempt-releases.test.ts` (6, including a mutation check).
- **Fixture runs (labelled as fixture runs):** `feedback.test.ts` (11).
- **Unit and DOM tests:** `student-feedback.test.ts` (10), `feedback-model.test.ts` (6), `Feedback.dom.test.ts` (8).
- **Conformance (5.3):** [conformance.md](../evidence/student-released-feedback/conformance.md). `verifyAssessmentProducer` and `releaseContractSuite` (fixed at `81a27f2` under Darryl's grant) both pass when run from the consumer on real producer values.
- **UI review (4.4):** [ui-review.md](../evidence/student-released-feedback/ui-review.md). Automated agent checks covered 104 combinations, 112 screenshots, contrast and targets. Keith then did his manual pass and approved.
- **Composed browser acceptance (5.4):** [composed-acceptance.md](../evidence/student-released-feedback/composed-acceptance.md). Keith ran it at `0c8b38b` with real local sign-in. The local D1 audit verifies v1 to v4, current and historical withdrawals, and no revival.
- **Privacy and security review (6.1):** [final-checks.md](../evidence/student-released-feedback/final-checks.md). This was an agent review, recorded separately; all checks pass.

## Security findings / unresolved defects

- **S1, medium, OPS-01:** feedback reads are not rate-limited. Keith accepted the risk (design.md Risks).
- **S2, informational:** the metadata-only path skips the evidence check, as agreed with Darryl.
- No open defects.

## Resource measurements

[read-cost.md](../evidence/student-released-feedback/read-cost.md), on the Workers Free plan (50 D1 queries per invocation):

| Request                |           Local D1 calls |        Production estimate |
| ---------------------- | -----------------------: | -------------------------: |
| History page, any size |                        2 |                        ~10 |
| Released open          | 14 (25 before the merge) | ~22 (~33 before the merge) |

Before the fixes, both were over 50. Edge CPU (task 6.3): staging dashboard, whole Worker, P50 5.02 ms, P90 10.74 ms, P99 40.68 ms against the Free 10 ms limit; occasional overruns accepted by Keith ([staging-cpu.md](../evidence/student-released-feedback/staging-cpu.md)). Session token usage is in [the increment log](../../logs/keith/student-released-feedback.md) checkpoints. Counters marked unavailable there are not inferred.

## Blockers and next actions

0. **Duplicate route, Darryl:** `main` also serves Darryl's assessment-keyed `/api/student/released-feedback/...` (`release-http.ts`, PR #33). Keith kept the attempt-keyed routes as the single student feedback API. Darryl agreed on 2026-11-13 (Keith's report) to **hide his student route**; that change is his, in his files, and is not part of this branch. The student UI never calls his route.

1. **5.3: done** (`81a27f2`). Keith fixed `releaseContractSuite` under Darryl's one-file grant; the suite passes on real producer values (7/7) and on its fixtures. **Darryl reviews the suite change.**
2. **Merge, Keith and Darryl:** mark PR #32 ready, then get final merge review.
3. **6.3: done (2026-11-13)**, on aggregate dashboard CPU by Keith's decision; occasional overruns accepted. Production had already shipped via run `43334000493` (`af10461`) before this was recorded. See [staging-cpu.md](../evidence/student-released-feedback/staging-cpu.md).
4. **Follow-up change, Keith:** per-question Submitted and Released feedback views (UI-04).
5. **Archive:** 6.3 is done; the change can be archived.

**Next owner:** Keith, with Darryl for 5.3 and the merge review.

## Producer review (task 5.2)

| Item                                                                                                                                                                                                           | Reviewer | Outcome                                      | Recorded                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 5.1 `attemptReleases` producer change (`ed1483c`: `contracts.ts`, `service.ts`, `repository.ts`, `attempt-releases.test.ts`). Its `authorizeAttempt` path was later replaced by the batched check in `2b2b7d3` | Darryl   | Accepted, as reported by Keith on 2026-11-12 | Keith's report: no findings and no conditions; no separate written record from Darryl is in the repository |
| Student read ports and composition (`release-port.ts`, `studentHandler` argument in `src/server/index.ts`, in `4d0f0f8`)                                                                                       | Darryl   | Accepted, as reported by Keith on 2026-11-12 | Same as above                                                                                              |
| OPS-01 amendment: batched `attemptReleases` authorization (`2b2b7d3`: `service.ts`, `repository.ts`, producer tests) and the once-per-request session in `release-port.ts`                                     | Darryl   | Accepted, as reported by Keith on 2026-11-12 | Keith's report; no separate written record from Darryl is in the repository                                |

The agent privacy and security review (6.1) is recorded separately in [final-checks.md](../evidence/student-released-feedback/final-checks.md). It is not Darryl's or Keith's review.

**Independent review outcome:**

- producer change, composition and OPS-01 amendment: accepted by Darryl (Keith's report);
- UI: accepted by Keith after his manual pass;
- this handoff as a whole: awaiting Darryl's merge review.

No deployment was performed from this session. The change reached production through the reviewed workflow (run `43334000493`).
