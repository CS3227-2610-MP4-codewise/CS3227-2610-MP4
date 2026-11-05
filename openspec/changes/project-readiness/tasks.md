# Project readiness tasks

Documentation increment only. Checkboxes do not imply application integration. See the existing MVP tasks for unfinished product work.

## 1. Baseline and decisions

- [x] 1.1 Inspect source, MVP artifacts and deployed evidence; deliver the scoped readiness assessment and exact baseline/run references in workflow/evidence/project-readiness/verification.md (DEV-01, OPS-01–OPS-04).
- [x] 1.2 Record the agreed named writers and decision status/gates in workflow/Ownership.md and docs/PlanningDecisions.md; verify agreement provenance is attributed to Darryl's report and no Keith review is invented (DEV-01, DEV-02).
- [x] 1.3 Reconcile current guides/OpenSpec context/MVP status and foundation task 0.6 against recorded release evidence; preserve historical member logs and leave unverified product/recovery tasks open (DEV-01, DEV-04, OPS-01–OPS-04).

## 2. Contract preparation

- [x] 2.1 Deliver C-ID and C-PUB draft profiles, producer/consumer scenarios and unresolved policy gates in workflow/IntegrationContracts.md; verify AUTH-01–03 and SUB-01/SUB-04 traceability without changing DTOs/routes (DEV-01, DEV-02).
- [x] 2.2 Deliver C-SUB and C-REL drafts with immutable evidence, atomicity, retry, approval/release and withdrawal gaps; verify SUB-02–04, GRADE-01–04 and PROG-01–03 traceability (DEV-01, DEV-02).
- [x] 2.3 Deliver C-AI draft, validation ownership and resource/privacy failure scenarios; verify AI-01–05 traceability and that real provider activation stays gated (DEV-02, DEV-03).

## 3. Review and handoff

- [x] 3.1 Complete independent read-only review and repair confirmed findings; record reviewer identity, returned findings and final acceptance in workflow/handoffs/project-readiness.md (DEV-02, DEV-03). Same reviewer accepted revised documentation; no blocking final findings.
- [x] 3.2 Pass strict OpenSpec validation and npm run check; verify changed-document links, whitespace and documentation-only diff; record exact results/limitations in readiness evidence (DEV-01, DEV-03, DEV-04). Both changes validated; ten tests/build/types/lint passed; local links and scope passed.
- [x] 3.3 Refresh the local usage checkpoint and finish one Darryl-owned increment log/handoff; record stable turn IDs and measurement limitations without detailed telemetry in Git (DEV-04). Checkpoint and completed review/current provisional record references recorded.
- [x] 3.4 Obtain explicit Darryl acceptance of the manual checklist in the handoff: current status, ownership, five draft contracts and remaining gates (DEV-01, DEV-02). Darryl approved on 2026-11-05 and separately requested batched commits, push and PR. Future interface/policy acceptance is separate.

## Workflow follow-up

- After acceptance, prepare the next separately authorized bounded increment; Keith leads SH-ID. Darryl consumes the reviewed producer handoff before dependent instructor integration.
- Do not commit, push, merge, deploy or archive without the appropriate separate instruction. No future feature-service implementation or deployment acceptance is included in this increment.
