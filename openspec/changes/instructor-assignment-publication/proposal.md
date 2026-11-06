# Instructor assignment authoring and publication

## Why

Instructors need a durable authoring workflow that saves incomplete work and deliberately publishes validated immutable assignment/question/rubric versions (SUB-01). The merged contract and warm-workbook foundations now support this bounded slice, while Keith's real identity/course integration remains unavailable (AUTH-02).

## What Changes

- Create, list, save, reopen and edit instructor assignment drafts containing ordered Python questions, starter source, private references and criterion rubrics. Save bounded incomplete drafts with optimistic revisions; reject stale writes without discarding editor state.
- Validate and publish an exact acknowledged draft revision into immutable assignment/question/rubric/criterion snapshots. Preserve logical IDs, allocate fresh version IDs, and make scoped retries return the same committed publication.
- Persist drafts/publications in instructor-owned D1 repositories with a reviewed additive migration; expose an explicit C-PUB student-safe projection using the existing runtime contract, never raw private rows.
- Implement the instructor UI under `src/web/instructor/`, following `docs/ui/design.md` revision `warm-workbook-v1`, reusing shared primitives/tokens. Applicable UI IDs: UI-01, UI-04/05 (authoring/navigation analogues only), UI-07, UI-08. Sign-in, role switching, student submissions, observations and grading remain outside this slice.
  Darryl's manual-review refinement on2026-11-06 separates the assignment list from a dedicated authoring page, with Back to assignments and unsaved-navigation protection.
- Provide a clearly labelled, opt-in loopback development composition backed by persistent local D1 and injected synthetic server identity/course adapters. Guard its requests; keep the deployed Worker entry and production frontend entry unchanged until real authentication exists.
- Deliver contract/security/local-D1 checks, actual UI review evidence, exact synthetic payloads and a producer handoff for Keith. Keep K1–K6 agreement, real auth/consumer integration and deployed feature readiness explicitly pending.

### Scope decision and exclusions

Authoring and publication remain one PR-sized increment: draft revisions, review/confirmation and the snapshot transaction are one user outcome. Splitting now would leave the publication transition unverified. No identity/course/submission storage, Keith student features, grading/release/AI integration, scheduling, unpublishing, destructive deletion, production deployment or production migration execution is included.

Analysis/planning only until Darryl approves the brief and expanded writer window. Existing P1–P3 contract policies are reused for isolated development; this request does not establish Keith's detailed agreement. Synthetic adapters do not demonstrate real authentication. Readiness and the contract package were manually accepted earlier; that acceptance is not reused as approval of this feature implementation.

## Capabilities

### New Capabilities

- `instructor-assignments`: instructor draft lifecycle, immutable publication, access/privacy boundaries, persistence and the version-aware authoring UI. It specializes the in-flight MVP SUB-01/AUTH-02 requirements without copying the shared C-PUB schema.

### Modified Capabilities

None under canonical `openspec/specs/` (not populated). Reuse the existing in-flight MVP, warm-workbook UI and contract-validation requirements as dependencies.

## Impact

Base: `7e3e7293152de512a3081e8149caa55ae6d715e8` (main after reviewed PRs #4/#5). Reuse `codex/instructor-assignment-publication`; it previously held only its preserved OpenSpec metadata scaffold and no unique commits. Expected files: instructor UI/domain/repositories, new authoring contract additions, one D1 migration, local helpers/tests, minimal test/runtime dependency declarations, and this increment's docs/evidence/handoff/log. Proposed exact shared-file writer window is in design.md for Darryl approval. Deployed authentication and feature routing remain separate work.
