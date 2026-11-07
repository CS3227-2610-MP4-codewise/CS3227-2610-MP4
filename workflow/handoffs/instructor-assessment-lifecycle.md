# Handoff: instructor-assessment-lifecycle

- Human owner: Darryl. Keith owns immutable submissions, course/object authorization, student feedback/progress and cache invalidation.
- Agent: main /root implementation/actual checks; independent /root/assessment_review read-only quality inspection/focused re-review. No parallel editing or recursive delegation.
- Requirements: GRADE-02–04, CON-05, IAL-01–09; warm-workbook-v1 UI-01/04/05/06/07/08.
- Base: reviewed main79495387ec766c2d9c41b43ee87e9505e7d8bf85; isolated codex/instructor-assessment-lifecycle. Current producer is UNCOMMITTED; source-manifest.json pins working-tree bytes, not a published or deployed revision.
- Owned files: new src/server/instructor/assessments/, src/web/instructor/assessments/, src/shared/instructor-contracts/assessment.ts, assessment-only migration0007, workflow/assessment-preview/ and this change's specs/log/evidence/handoff; opt-in package script and approved Ownership/IntegrationContracts entries. Original auth checkout's dirty operational notes preserved separately.
- Context: approved proposal/design/spec/tasks, existing publication service/C-SUB/C-REL, P1–P4 and K packet. User approved bounded implementation and exclusive writer window; no Keith agreement invented.

## Delivered producer

[Exact dependency injection, method/payload/HTTP boundaries and reusable checks](../assessment-preview/README.md). No production API/browser entry registration. Synthetic preview at127.0.0.1:5177 only. Actual local D1 stores assessment-owned drafts, immutable grading revisions, release snapshots, withdrawal/audit and scoped receipts; no submission/membership/source/publication copy.

Existing publication service supplies pinned question/rubric versions; injected submissions supply canonical immutable source. Persisted evidence digests detect mutation, including consumer reads. Partial private manual grading saves/reopens; complete validation gates approval. Edits invalidate exact approval. Explicit release and correction/withdrawal transitions atomically update visibility, versions, receipts and audit. Current/historical withdrawal follows P4; no older revival. Unexpected database errors are unavailable, stale CAS/duplicate revision conflicts are distinct. Previously withdrawn release receipts cannot resurrect content.

AssessmentService.consumer(trustedRequest) implements the existing ReleaseReadPort with request-bound trusted principal, own-attempt/course/object checks and currentness rechecks. This is a producer seam, not a student route/UI/cache implementation. [Public synthetic payloads](../assessment-preview/public-feedback.json), [importable fixtures](../assessment-preview/public-fixtures.ts), [reusable actual-producer conformance checks](../assessment-preview/conformance.ts) and [local tests](../assessment-preview/assessment.test.ts) support Keith's independent work.

## Review and verification

Independent reviewer found four source issues: old private context retained after denied loads, consumer immutable evidence not checked, unfinished observation input lost on navigation, all database failures shown as conflicts. Main repaired these; focused review found two remaining missing observation-release/context-reset guards, also repaired. Reviewer confirmed the focused repairs; independent typecheck passed initially, later reviewer Vitest startup could not access worktree config. Main executed actual tests; no reviewer test pass is invented.

See [verification](../evidence/instructor-assessment-lifecycle/verification.md), [UI review](../evidence/instructor-assessment-lifecycle/ui-review.md) and [member log](../../logs/darryl/09-instructor-assessment-lifecycle.md). Full project suite passed with bounded local worker concurrency; initial unrestricted full run timed out one pre-existing auth restart test. Browser rendering/accessibility proof is blocked by the browser connection; no screenshot/manual acceptance fabricated. Source hashes and exact outcomes recorded separately.

## Pending review packet and next owners

Existing K1 request-derived authorization, K2 pinned publication identities, K3 scores/comparison keys, K4 immutable canonical source, K5 release/currentness/tombstones remain Keith-pending. K6 AI is unchanged/excluded. Use the original single packet in IntegrationContracts.md, not a duplicate policy decision. Keith must supply exact reviewed SH-ID/SH-SUB revisions and execute the conformance checks with real consumers before composition. Darryl must verify/accept the actual workbook and accessible observation flow.

Real identity/course/submission composition, student cache/progress behavior, hosted limits/deployment and joint K agreement remain pending. Do not copy synthetic state or apply remote migrations. No commit/push/merge/deploy/archive performed. Once publishing is separately authorized, replace the working-tree source identity with an exact committed producer revision before dependent integration.
