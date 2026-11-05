# Project readiness design

## Context

See proposal.md for motivation. The baseline at `281cc13` contains a shell, health endpoint and metadata migration; non-health API paths return JSON 404. Existing DTOs cover only partial projections. Live release evidence supersedes several current-state statements, while the full MVP remains unimplemented.

## Goals / Non-Goals

**Goals:** one evidence-backed current status, named increment writers, traceable contract drafts and explicit producer/consumer gates.

**Non-Goals:** choosing unresolved product policies, changing schemas/routes/DTOs, implementing either role, activating AI or changing deployment workflows. No GUI change, so UI iteration is unnecessary.

## Decisions

1. Keep requirements in the existing in-flight MVP capability specs. This is a documentation-only change with `skip_specs: true`; do not invent requirements or populate canonical specs to imply product acceptance. Put contract profiles/scenarios in the existing integration document and link them from both plans. Alternative duplicate delta requirements would obscure the draft baseline.
2. Record ownership as agreed via Darryl's report of Keith's agreement, not as a directly observed Keith review. Darryl owns this shared planning increment and its log. Interface fields and unresolved policies remain proposed. Ownership assignment is insufficient to open a shared-file edit window or start dependent implementation.
3. Reconcile deployment status with the exact run/commit, approval record, job/step outcomes and read-only smoke evidence. Complete only foundation task 0.6, whose entire outcome is evidenced. Keep role-release, full security, recovery and capacity tasks open. Preserve historical logs and label the older handoff checkpoint as historical rather than erase it.
4. Retain one identity/course/submission store. Keith produces C-ID/C-SUB; Darryl waits for reviewed handoffs. Publication/release are Darryl's projections consumed by Keith. Explicit student/public allowlists exclude private references and unreleased scores. Current feature routes stay unavailable until authentication and object checks exist.
5. Treat resource settings and AI payload details as gated proposals. Darryl owns the common gateway/assessment validation; Keith owns progress context/citation/currentness validation. Quotas and model access require real provider evidence; fixtures cannot establish it. Recovery and performance evidence remain separate from healthy foundation endpoints.
6. Reuse one independent read-only reviewer to check status truthfulness, ownership and contract completeness. Main agent repairs confirmed findings and obtains focused re-review. Keep personal skills/orchestration and detailed usage outside the repo; retain only reviewed summaries, stable record IDs, checks and limitations.

## Risks / Trade-offs

- Draft fields mistaken for implemented contracts → prominent draft labels, unavailable producer revisions, joint schema/policy acceptance and real integration checks before consumption.
- Successful foundation deployment mistaken for product readiness → exact scope and outstanding gates in evidence/tasks/guides.
- Shared migration/DTO conflicts → one named producer window, next migration numbering serialized in handoffs.
- Withdrawal and deadline/source policy gaps → decision register blocks the corresponding integration; no silent endpoint/policy invention.
- Missing/current-turn usage → report unavailable/provisional measurements, no resource-efficiency claim or fabricated Keith contribution.

## Verification and manual acceptance

Automated: strict OpenSpec validation, required `npm run check`, whitespace and changed-document local-link checks, and confirmation that no source/migration/CI/dependency files changed. Existing API/workflow tests protect the unchanged foundation. Contract tables are acceptance plans, not executed service tests. Earlier live smoke checks and GitHub evidence are dated in the readiness record; no deployment or provider call is needed here.

Manual: Darryl reviews current status, confirmed/proposed separation, the agreed writer table and all five contract boundaries, then explicitly accepts or returns the planning increment. Product policy decisions and future producer/consumer review remain separate gates.

## Migration Plan

No database or deployment migration. Review documentation on `codex/project-readiness`; normal reviewed PR flow only if separately instructed. No archive while manual acceptance is pending. Reversal would be a reviewed documentation edit, preserving historical evidence.
