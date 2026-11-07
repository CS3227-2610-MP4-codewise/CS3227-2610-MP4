# Handoff: instructor-assessment-lifecycle

## Current producer status — 2026-11-07

Application source revision: b9f3f6de496db9581cd44bb9abaa50219698d604, following connected producer94be478. [Current source hashes](../evidence/instructor-assessment-lifecycle/ux-source-manifest.json). User authorized commits, push and a normal PR; no merge/deploy/manual acceptance inferred. Earlier uncommitted/pending-publication sections below are historical checkpoints, superseded by this source identity and the final publication log. Real SH-AUTH/SH-ID/publication compose locally; only submissions are synthetic. Keith SH-SUB/consumer/K agreement and complete manual accessibility acceptance remain pending. Latest checks:241 tests/23files,4deployment checks and full specs/type/lint/build; actual course→assignment→grading→version→sample workbook→Students browser walk and320/1280 inspection.

- Human owner: Darryl. Darryl owns course/object authorization under the updated SH-ID agreement. Keith owns immutable submissions, student feedback/progress and cache invalidation.
- Agent: main /root implementation/actual checks; independent /root/assessment_review read-only quality inspection/focused re-review. No parallel editing or recursive delegation.
- Requirements: GRADE-02–04, CON-05, IAL-01–09; warm-workbook-v1 UI-01/04/05/06/07/08.
- Base: reviewed main969a062f5bdc8171c5a36a0ba06baedde8d2cb6d; isolated codex/instructor-assessment-lifecycle. Exact committed producer: b7df0b9047d3ad57a4dda95e09bfa1d7258731a3. [Source manifest](../evidence/instructor-assessment-lifecycle/source-manifest.json) pins Git blobs/SHA-256 from that revision, including inherited publication/course dependencies. This is not deployment, manual acceptance or joint consumer integration.
- Owned files: new src/server/instructor/assessments/, src/web/instructor/assessments/, src/shared/instructor-contracts/assessment.ts, assessment-only migration0008, workflow/assessment-preview/ and this change's specs/log/evidence/handoff; opt-in package script and approved Ownership/IntegrationContracts entries. Original auth checkout's dirty operational notes preserved separately.
- Context: approved proposal/design/spec/tasks, existing publication service/C-SUB/C-REL, P1–P4 and K packet. User approved bounded implementation and exclusive writer window; no Keith agreement invented.

## Delivered producer

[Exact dependency injection, method/payload/HTTP boundaries and reusable checks](../assessment-preview/README.md). No production API/browser entry registration. Synthetic preview at127.0.0.1:5177 only. Actual local D1 stores assessment-owned drafts, immutable grading revisions, release snapshots, withdrawal/audit and scoped receipts; no submission/membership/source/publication copy.

Existing publication service supplies pinned question/rubric versions; injected submissions supply canonical immutable source. Persisted evidence digests detect mutation, including consumer reads. Partial private manual grading saves/reopens; complete validation gates approval. Edits invalidate exact approval. Explicit release and correction/withdrawal transitions atomically update visibility, versions, receipts and audit. Current/historical withdrawal follows P4; no older revival. Unexpected database errors are unavailable, stale CAS/duplicate revision conflicts are distinct. Previously withdrawn release receipts cannot resurrect content.

AssessmentService.consumer(trustedRequest) implements the existing ReleaseReadPort with request-bound trusted principal, own-attempt/course/object checks and currentness rechecks. This is a producer seam, not a student route/UI/cache implementation. [Public synthetic payloads](../assessment-preview/public-feedback.json), [importable fixtures](../assessment-preview/public-fixtures.ts), [reusable actual-producer conformance checks](../assessment-preview/conformance.ts) and [local tests](../assessment-preview/assessment.test.ts) support Keith's independent work.

## Review and verification

Independent reviewer found four source issues: old private context retained after denied loads, consumer immutable evidence not checked, unfinished observation input lost on navigation, all database failures shown as conflicts. Main repaired these; focused review found two remaining missing observation-release/context-reset guards, also repaired. Reviewer confirmed the focused repairs; independent typecheck passed initially, later reviewer Vitest startup could not access worktree config. Main executed actual tests; no reviewer test pass is invented.

See [verification](../evidence/instructor-assessment-lifecycle/verification.md), [UI review](../evidence/instructor-assessment-lifecycle/ui-review.md) and [member log](../../logs/darryl/09-instructor-assessment-lifecycle.md). Full project suite passed with bounded local worker concurrency; initial unrestricted full run timed out one pre-existing auth restart test. Browser rendering/accessibility proof is blocked by the browser connection; no screenshot/manual acceptance fabricated. Source hashes and exact outcomes recorded separately.

## Pending review packet and next owners

Existing K1 request-derived authorization, K2 pinned publication identities, K3 scores/comparison keys, K4 immutable canonical source, K5 release/currentness/tombstones remain Keith-pending. K6 AI is unchanged/excluded. Use the original single packet in IntegrationContracts.md, not a duplicate policy decision. Darryl must supply assessment-aware SH-ID composition using the inherited course foundation; Keith must supply the exact reviewed SH-SUB revision and execute the conformance checks with real consumers before composition. Darryl must verify/accept the actual workbook and accessible observation flow.

Real identity/course/submission composition, student cache/progress behavior, hosted limits/deployment and joint K agreement remain pending. Do not copy synthetic state or apply remote migrations. Source was committed and rebased under explicit user instruction. No push/merge/deploy/archive performed. Consumers must pin the committed producer revision above and complete the remaining integration gates.

## Connected continuation — current uncommitted working tree

IAL-10 is approved. The application now connects real sign-in, existing course authority, assignment publication and assessment discovery/editor/history/public feedback preview. [Run/setup/manual checklist](../connected-preview/README.md). The connected continuation is not part of the historical producer commit above; [connected source manifest](../evidence/instructor-assessment-lifecycle/connected-source-manifest.json) records its source snapshot. Do not describe it as pushed or deployed.

Native local API verification passed real Firebase login, session, course discovery, create/save/publish, sample discovery/create, exact-line grading/save, approval, release, safe feedback preview and logout. Only submitted source is synthetic. Local owner membership was explicitly provisioned in Local workflow test using existing course operator logic. No remote data or email operation occurred. Production/staging ignore sample injection; absent real submission producer yields unavailable.

Independent assessment_review inspected the connected changes and confirmed repairs for same-D1 write authority, missing feedback-preview UI and lost assessment return destinations. Reviewer did not execute the tests. Full runtime and source checks are recorded in verification.md. Browser connection timed out; visual/keyboard/manual acceptance remains pending. Darryl-owned assessment/course composition is now implemented locally; Keith-owned real submissions, consumer verification and joint decisions remain pending.

## Pushed connected producer identity

Connected continuation producer:94be478, after backend increment d1c9120; both pushed to origin/codex/instructor-assessment-lifecycle. The connected-source-manifest hashes describe those source files; its earlier uncommitted status records the verification-time snapshot. No merge, deployment or manual UI acceptance is inferred. Read-only FoC interaction analysis is a proposed subsequent UX pass, awaiting the required brief approval.

## IAL-11 UX refinement — uncommitted follow-up

Darryl approved presentation-only simplification using FoC User Service interactions while preserving Codewise warm-workbook-v1. Shared account disclosure/sign-out, grouped course navigation, concise invitation text and labelled revoke confirmation, assignment action hierarchy, published-version dropdown and assessment released/private labels implemented. Existing controllers, authorization, immutable source/version and approval/release semantics retained; no Keith or backend changes. Independent reviewer confirmed focused repairs; actual browser sign-in/course/invitations/320px account/Escape checks executed, broader visual/manual acceptance still pending. See UI review and member log. This follow-up is not part of the pushed94be478 producer.

IAL-11 manual rejection repaired: central course navigation and labelled rows supersede prior scattered tabs/assignment button/default grading bullets. Actual main-browser route walk and320/1280 inspection passed;241 automated tests plus4deployment checks and full source/build checks passed. See latest UI/verification evidence. No changes to producer contracts, storage, permissions or Keith source. Current UX remains uncommitted and user acceptance pending.

## PR publication — 2026-11-07

[PR11: Connect instructor grading lifecycle and consistent course navigation](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/11) is open for review as a normal PR. Application producer is b9f3f6de496db9581cd44bb9abaa50219698d604; evidence/planning715d96c and subsequent publication-note commits change documentation only. Branch pushed; manual acceptance/Keith integration/deployment gates remain pending. No merge or deploy performed.
