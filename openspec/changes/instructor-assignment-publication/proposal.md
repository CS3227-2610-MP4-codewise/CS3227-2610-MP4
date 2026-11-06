# Instructor assignment authoring and publication

## Why

Instructors need a durable authoring workflow that saves incomplete work and deliberately publishes validated immutable assignment/question/rubric versions (SUB-01). The merged contract and warm-workbook foundations support this bounded slice; real SH-AUTH (Darryl) and SH-ID course/object authorization (Keith) handoffs remain unavailable (AUTH-02).

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

Darryl approved the brief and expanded writer window on2026-11-06; implementation, local verification and independent source review are complete, with final human manual acceptance pending. Existing P1–P3 contract policies are reused for isolated development; this does not establish Keith's detailed agreement. Synthetic adapters do not demonstrate real authentication. Darryl separately authorized commit/push/PR publication; deployment and real integration remain pending.

## Capabilities

### New Capabilities

- `instructor-assignments`: instructor draft lifecycle, immutable publication, access/privacy boundaries, persistence and the version-aware authoring UI. It specializes the in-flight MVP SUB-01/AUTH-02 requirements without copying the shared C-PUB schema.

### Modified Capabilities

None under canonical `openspec/specs/` (not populated). Reuse the existing in-flight MVP, warm-workbook UI and contract-validation requirements as dependencies.

## Impact

Original implementation base: `7e3e7293152de512a3081e8149caa55ae6d715e8` (main after reviewed PRs #4/#5); publication branch updated on reviewed main`7621ec7` (PR#6). Reused `codex/instructor-assignment-publication` and preserved its scaffold. Owned files: instructor UI/domain/repositories, new authoring contract additions, one D1 migration, local helpers/tests, minimal development dependency declaration, and this increment's docs/evidence/handoff/log. Darryl approved the exact shared writer window before product edits. Deployed authentication and feature routing remain separate work.
