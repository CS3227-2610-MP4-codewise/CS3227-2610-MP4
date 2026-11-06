# Instructor development contracts proposal

## Why

The accepted readiness package assigns owners but deliberately leaves C-ID/C-PUB/C-SUB/C-REL/C-AI as interface drafts. Instructors need concrete, replaceable, runtime-checked boundaries to develop publication and assessment independently while Keith's producers remain unavailable (DEV-01, DEV-02, SUB-01, GRADE-04, AI-05).

## What Changes

- Verify readiness acceptance from the recorded manual checklist, task 3.4 and Darryl's explicit approval; do not mistake workload agreement for acceptance of detailed contracts.
- Refine the existing five drafts in workflow/IntegrationContracts.md, preserving their IDs and scenarios. Add strict runtime schemas/parsers, synthetic cross-linked examples, server-only adapter interfaces and reusable producer/consumer contract suites after brief approval.
- Propose exact instructor-owned publication/release policies: stable logical IDs with immutable version IDs, two-decimal point scores, canonical LF source/line rules and auditable feedback withdrawal. Present the consumer-impacting decisions together for Keith, with per-decision acceptance status.
- Separate schema/fixture conformance, synthetic adapter tests and verified real-producer integration. Under the 2026-11-06 ownership revision, Darryl produces account/session/sign-in integration (SH-AUTH); Keith retains course/object authorization (SH-ID), submissions and progress. Both integrate through the same injected C-ID boundary; no duplicate identity service is introduced.
- Identify isolated work Darryl can start without real authentication, and gates that still prevent deployed feature routes, provider activation or claims of integration.

### Boundaries and assumptions

This planning turn creates OpenSpec artifacts and the factual member summary required by project logging policy. Product/schema code, fixtures, tests and shared contract/workflow documents are not edited until Darryl approves the brief. The proposed implementation increment supplies contract artifacts, not assignment/assessment features, persistence, migrations, identity services, live provider calls, routes, UI or deployment. Synthetic examples contain no real learner code or private prompts.

Readiness was manually accepted on 2026-11-05 and merged through PR #3. Main/worktree base is e3862de841c61cadf3c1f82b19e94db5fb445f61. Named workload ownership is agreed; detailed shapes/policies in this change remain proposals. No producer implementation handoff exists. The interrupted publication scaffold is preserved in its original checkout; no publication implementation is carried into this iteration.

## Capabilities

### New Capabilities

- `shared-contract-validation`: runtime shape/semantic validation and reusable adapter conformance for the existing five C-* boundaries. This capability owns validation behavior, not another copy of the contracts or domain services. It traces to the in-flight MVP AUTH/SUB/GRADE/AI/PROG requirements.

### Modified Capabilities

None under canonical openspec/specs (not yet populated). Existing MVP capability drafts remain the product intent; this bounded change adds validation requirements, without replacing those drafts or declaring their services implemented.

## Impact

The original contract-artifact window covered the small schema/port/fixture/test package and integration documents. For future real integration, Darryl now produces SH-AUTH accounts/sessions/sign-in; Keith produces SH-ID course/object authorization, submissions and student features. Both review C-ID and consumer-impacting decisions. This ownership-only revision changes no runtime port, source module, database, feature route or deployment. Exact shared-file windows and accepted producer revisions still gate composition.
