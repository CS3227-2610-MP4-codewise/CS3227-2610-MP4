# Proposal

## Why

Instructors can publish versioned assignments, but cannot yet durably review an immutable submitted attempt, save manual feedback, approve an exact revision and release or withdraw it. Implement this instructor-owned lifecycle using existing C-SUB/C-REL contracts, without substituting for Keith's unfinished submission or authorization producers.

## What Changes

- Add an instructor assessment workbook showing read-only submitted source beside its pinned published question/rubric, with manual criterion scores, explanations and exact source-linked observations.
- Persist revision-checked assessment drafts, immutable revision/audit history, exact approval, explicitly separate release, reviewed corrections, scoped idempotency and transactional P4 withdrawal/currentness metadata.
- Reuse P2 numeric scores (0..1000, two decimals, no rounding), P3 canonical source/excerpts, C-SUB/C-REL validators and existing publication service. Partial manual scores/explanations may be saved privately; approval/release require complete valid feedback.
- Add a dependency-injected, guarded service/HTTP composition and an explicitly synthetic, loopback-only preview with synthetic submissions. No live assessment route or synthetic production fallback.
- Supply Keith with safe public release/correction/tombstone/currentness fixtures and reusable producer conformance checks. Keep K1–K6 joint agreement and actual SH-ID/SH-SUB integration pending.

## Capabilities

### New Capabilities

- instructor-assessment: Durable manual assessment editing, source evidence, review/approval, release/correction/withdrawal and the instructor workbook. Trace GRADE-02–GRADE-04, CON-05 and warm-workbook-v1 UI-01/UI-04/UI-06/UI-07/UI-08; UI-05 applies where navigating multiple pinned questions.

### Modified Capabilities

None. No canonical openspec/specs inventory exists; the existing codewise-mvp instructor-assessment draft remains the baseline, and this delta adds concrete implementation acceptance rather than changing its policies.

## Impact

Darryl owns new src/server/instructor/assessments/, src/web/instructor/assessments/, a separate instructor-only assessment authoring schema, an additive assessment-only migration (next currently0008; recheck before writing), workflow/assessment-preview/, fixtures/conformance/evidence/handoff and one member log. Reuse publication and existing shared contract code; preserve their DTOs and Keith-owned ports. Minimal opt-in preview tooling/package script only if needed.

No membership, account, submission or duplicate publication storage; no student UI/progress implementation, AI gateway/provider, source execution, production entrypoint/route/CI changes, cloud provisioning or deployment. Editing and release remain one coherent PR because optimistic revisions, approval invalidation, correction history and P4 atomicity are one bounded aggregate. No commit/push/merge/archive is authorized by this request.

## Approval and dependencies

Planning only; implementation approval has not been given. Existing P1–P4 are Darryl-approved; K1–K6 remain Keith-pending. Requested approval includes the exact proposed Darryl writer window in design.md, including serialized assessment-only migration ownership. Synthetic isolated development can proceed after approval; real composition cannot be called complete without Keith's reviewed producers and agreement. Remote auth owner sign-in was verified separately, but course authorization remains absent; this work will not bypass it.
