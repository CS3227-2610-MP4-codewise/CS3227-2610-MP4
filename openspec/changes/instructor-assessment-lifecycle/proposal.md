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

Darryl owns new src/server/instructor/assessments/, src/web/instructor/assessments/, a separate instructor-only assessment authoring schema, an additive assessment-only migration (next currently0008; recheck before writing), workflow/assessment-preview/, fixtures/conformance/evidence/handoff and one member log. Reuse publication and existing shared contract code; preserve their DTOs and existing shared ports. Minimal opt-in preview tooling/package script only if needed.

No duplicate membership, account, submission or publication storage; no student UI/progress implementation, AI gateway/provider, source execution, CI changes, cloud provisioning or deployment. The approved connected-workflow continuation adds authenticated application routing and instructor navigation. Editing and release remain one coherent PR because optimistic revisions, approval invalidation, correction history and P4 atomicity are one bounded aggregate. Commit and rebase are authorized separately; push, merge, deployment and archival remain outside this request.

## Approval and dependencies

Darryl approved the bounded implementation and shared write window. Existing P1–P4 remain Darryl-approved; K1–K6 cross-review and real consumer integration remain pending. Main969a062 is authoritative for existing specs and ownership: Darryl owns SH-AUTH and SH-ID/course/object authorization; Keith owns immutable submissions and student features. Main's course/assignment authority is retained unchanged. Assessment/submission object composition and Keith's SH-SUB producer are not yet integrated, so real submission integration remains pending. The connected application can show unavailable states while an explicit loopback development entry injects labelled sample submissions. Manual UI acceptance remains pending.

## Approved connected-workflow continuation

Darryl requested one sign-in → course → assignment authoring/publication → submitted-work review → assessment approval/release flow and approved it with “do it”. Connect existing merged services/screens using real authentication and authoritative course membership. A separate explicit loopback Worker entry injects deterministic sample submissions for local testing only; it reuses the existing authoritative local D1 account/course state and existing guarded services. No learner membership/submission storage, student impersonation or unauthenticated fallback. Real provider absence remains honest in the normal application. Darryl is sole shared writer for server/application composition, safe destinations, instructor navigation and narrowly required assessment adapters/clients; review is read-only. No new remote operation or commit/push/deployment authority.

## Approved UX continuation — IAL-11

Darryl approved simplifying auth/invitations/course navigation/instructor authoring and assessment controls using FoC User Service interaction patterns, while preserving warm-workbook-v1 layout, palette, typography and brand. Native account dropdowns, contextual actions, concise copy and a consistent primary/secondary hierarchy replace scattered account controls and equally weighted buttons. This is presentation only: no student feature, role/auth/provider policy, persistence or contract change. Keep private/public version boundaries, sample/unavailable markers and approval/release separate. UI-01/02/04/05/06/07/08 apply. Main remains authoritative; this is a matching-branch continuation after the requested push.
