# Handoff: local completion and remaining Keith integration

## Local shell implementation checkpoint - 2026-11-11

`local-shell-recovery-01` is implemented in the current uncommitted working tree over the input main revision. Exact changed-source SHA-256 values: [shell source manifest](../evidence/local-shared-instructor-completion/shell-source-manifest.txt). The historical Git blob table below remains the inspected base, not the new producer content. Review/repairs, verification and manual checklist: [shell verification](../evidence/local-shared-instructor-completion/shell-verification.md). Darryl approved W1's brief; source-specific Keith review and all other proposed windows remain separate. No source commit, remote review or new Keith agreement is invented.

Shared public/session DTOs, backend and student implementation are unchanged. The shared control now adds an actual `/api/auth/session` read during mount/focus/switch revalidation, compares user/session identity, and receives existing AuthView identity from instructor parents. This is an internal browser-component prop, not an identity-store/API contract fork.

Keith's precise test follow-up, unchanged `src/web/student/StudentWorkspace.dom.test.ts` (22 pass/3 fail):

1. Line 136's Student radio assertion becomes the native switch named `Instructor workspace`, checked **false** in Student context. Keep the visible Workspace group assertion.
2. Lines 431–436's dirty-cancel test activates the same switch from Instructor context and verifies checked **true**, no departure/context requests after cancelled `beforeLeave`, and retained focus/role. Do not reintroduce hidden radios to satisfy the old test.
3. Line 599's account-menu fixture must provide session responses by test phase, rather than four queue entries tied to an exact number of readers. Both parent and shared shell now legitimately request the session; a network-only phase must return network failure to both, then a signed-out phase must return 401 to both. Existing queue prematurely supplies its future 401. Independent reviewer confirmed this coupling; no product behavior or failure assertion was suppressed.

These test changes are proposed for Keith; main did not edit his files. Additional shared checks at the new producer revision must not be described as his source acceptance. Source inspection also found stale formatting plans, but the new compatibility policy/sanitizer change remains blocked on his agreement; no rich schema/renderer replacement was implemented.

- Human owner: Darryl; Keith owns submission producer, student editor/feedback/progress and exact consumer review.
- Agent: main `/root`, Codex; no delegated review at this preparation checkpoint.
- Requirements: AUTH-01–03, COU-01–07, SUB-01–04, IAS-01–07, GRADE-01–04, AI-01–05, PROG-01–03, UI-01–08; warm-workbook-v1.
- Input revision: local main `af1bc90fa47ed0b8726a46084ce642992c807e15`. All source references below resolve at that commit. Working tree contains unrelated dirty evidence/logs, preserved. No remote comparison performed.
- Owned writes this checkpoint: this packet, `workflow/evidence/local-shared-instructor-completion/inspection-and-brief.md` and `logs/darryl/20-local-shared-instructor-completion.md`. No application/student/schema edits.
- Decision status: existing Keith C-ID/onboarding/K1–K6 acceptance remains authoritative. The concrete SH-SUB choices below are proposals for agreement. No exact-revision Keith review, writer-window acceptance or human manual acceptance is invented.
- Verification and resource limits: see the linked inspection checkpoint; usage unavailable. Independent review not yet performed. Next action: Darryl approves the first bounded brief; Keith reviews only the remaining concrete integration decisions, then supplies his producer revision and checks.

## Exact source manifest

Git blob IDs identify content at the input commit; they are not review approvals. A later code change must update the producer revision and rerun affected checks before composition.

| Interface/source                                | Git blob at af1bc90                        | Meaning                                                                 |
| ----------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `src/server/instructor/ports/contracts.ts`      | `6b8e212e7678f530fbe3b543430235a469d613ef` | Trusted identity, SubmissionReadPort, ReleaseReadPort and AIGatewayPort |
| `src/server/instructor/assessments/workflow.ts` | `ee6de85f4d8481c86a1dedcd4eedae56f9ce2b93` | SubmissionCatalog and actual instructor composition                     |
| `src/shared/instructor-contracts/submission.ts` | `1baad4cbff5c50563d794dc7180f3d0529e4fff2` | Closed Attempt and cross-publication/hash validation                    |
| `src/shared/instructor-contracts/release.ts`    | `c7a215d1021a8943286c14dbaf74dfa57258c2be` | Release, tombstone, currentness and allowlist helpers                   |
| `src/shared/instructor-contracts/ai.ts`         | `33f3cc9a4a3567999e387bb9acd1bbd590e4f66f` | Typed actions/evidence and assessment validation                        |
| `src/server/index.ts`                           | `58529d41fd7dddb1a065cc8a891659a327c295e5` | Only explicit loopback local-submission/gateway injection today         |
| `src/web/ui/instruction-text.tsx`               | `030c272411055596c19140b2b58f052bc4011f0c` | Existing sanitized Markdown/GFM/raw-HTML pipeline                       |
| `src/web/student/StudentWorkspace.tsx`          | `5c375352a8175cb94a523cafa011cb84807f6fe7` | Merged student overview consuming the renderer                          |
| `src/web/ui/workspace-switch.tsx`               | `5c833a5d500ecc0422794d54cadc7809e897aced` | Existing shell source with remaining findings                           |

Historical dashboard producer `8f93f51c1f6a36dd64908bd550e90b68e9957af1` and reported consumer `8a7951f`/producer `3a7e5e4` are historical acceptance evidence. They do not constitute review of this manifest. Keith's recorded PR #25 acceptance and merged student dashboard remain preserved.

## SH-SUB concrete proposal — agreement required

Reuse the authoritative account/course/publication stores and accepted K1–K4. This packet defines a proposed transaction rule, not a competing submission DTO or implementation by Darryl.

| Decision          | Proposed exact rule                                                                                                                                                                                                                                                                                           | Example/check                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Deadline equality | Admit a new attempt only when authoritative server transaction time is strictly before the pinned publication deadline; equality is late. Check in the guarded transaction, never browser time                                                                                                                | Deadline `2026-11-12T12:00:00.000Z`: new commit at `.000` rejected; `11:59:59.999Z` eligible if all other checks pass          |
| Attempt count     | Multiple distinct attempts before deadline; no new product count cap in MVP. Retain bounded request admission/resource limits independently                                                                                                                                                                   | Two different valid keys create two immutable attempts; same-key retry creates none                                            |
| Save/submit       | Submit references the complete pinned question set and exact acknowledged draft revisions. Transaction checks current session/member/course/publication, compares every revision, snapshots canonical source/hashes, inserts every answer and scoped receipt together; mismatch rolls back whole command      | Confirm q1 r3/q2 r5; concurrent q2 r6 makes the submitted r5 command conflict, rather than silently snapshotting r6            |
| Fingerprint       | SHA-256 over UTF-8 JSON of fixed array `[1,userId,courseId,assignmentVersionId,[[questionVersionId,rubricVersionId,draftRevision,sourceHash],...]]`; answer order is pinned publication order. IDs/server identity and hashes come from authoritative validated rows. Omit request key/time/new generated IDs | Reordered incoming answers normalize to publication order; changed revision/hash/publication with same scoped key conflicts    |
| Key scope         | Unique actor + course + assignment version + client key, checked after current authorization. Matching committed retry returns the original attempt even after deadline; changed fingerprint conflicts; revoked authorization denies receipt disclosure                                                       | Lost response followed by next-day identical retry returns original ID/time. Revoked student gets denial, never a replay grant |
| Rollback/restart  | One D1 transaction covers guard, complete attempt/answers and receipt. No partial attempt is visible. Persistent restart returns the same committed data/receipt                                                                                                                                              | Inject second-answer or receipt failure: zero root/answer/receipt rows; retry may commit once                                  |
| Version pinning   | Drafts/attempts stay pinned to selected immutable assignment/question/rubric versions. Republish does not migrate them                                                                                                                                                                                        | Reference-only republish v2 leaves existing v1 source/rubric/deadline untouched                                                |

Keith must explicitly accept or amend equality, attempt count, fingerprint and transaction linearization before dependent implementation. Do not reopen stable logical IDs, source normalization, score precision or K1–K6 broad decisions. Error transport uses existing safe boundary helpers; pin the actual producing route's status mapping rather than assuming every route uses 422 (current instructor workflow maps INVALID_CONTRACT to 400).

## SubmissionReadPort and SubmissionCatalog required behavior

Existing signatures, unchanged:

```ts
interface SubmissionReadPort {
  getAuthorized(
    principal: TrustedPrincipal,
    attemptId: string,
  ): Promise<Attempt>;
}
interface SubmissionCatalog extends SubmissionReadPort {
  readonly sampleMode: boolean;
  scope(
    principal: TrustedPrincipal,
    attemptId: string,
  ): Promise<{ courseId: string }>;
  list(
    principal: TrustedPrincipal,
    publication: Publication,
  ): Promise<
    Array<{
      attemptId: string;
      submittedAt: string;
      label: string;
      sample: boolean;
    }>
  >;
}
```

- `scope` resolves authoritative attempt-to-course metadata and authorizes current access before returning it; IDs/browser role fields never choose scope. Foreign or inaccessible IDs fail without private existence disclosure.
- `getAuthorized` authorizes each read/retry, including current session/provider and membership revocation; returns a detached immutable closed Attempt, never draft/latest code. Instructor reads require current instructor authority for that course; student producer reads must be self-only under current Student authority. Verify joins/hashes with `validateAttempt` against the exact publication.
- `list` authorizes current same-course instructor access and returns only attempts matching the supplied exact persisted publication ID/course. No drafts, private references or unrelated-user/course metadata. Labels are bounded safe display text, not raw provider records. Real implementation sets `sampleMode:false` and each item `sample:false`. The signature currently has no cursor; Keith proposes bounded list/pagination evolution if needed, agrees it with Darryl before changing this shared seam. Never silently truncate while claiming a complete list.
- With no producer, instructor review honestly remains unavailable; empty attempts with `available:true` means an authorized producer returned no submissions. Do not substitute loopback samples in the normal application.
- Actual `src/server/index.ts` currently passes only explicitly enabled loopback `DevelopmentPorts.localSubmissions`; normal shared routing has no real producer. The first composition needs an agreed serialized index/authority window. Missing real producer is a dependency, not permission for Darryl to create Keith's service.

Synthetic Attempt example is already executable in `workflow/fixtures/instructor-contracts/graph.ts`: use its publication/attempt graph and real `sourceHash`, not an invented hash literal. Canonical answer source `print(1)\n` retains the final LF; CRLF becomes LF once at ingress; downstream validators reject CR/NUL/hash mismatches instead of rewriting historical evidence. Maximum per source is 32 KiB UTF-8; complete coverage is 1–20 unique answers. Empty source is representable; completeness/product validation is separate from inventing a nonempty-code rule.

## C-REL consumer projection and currentness

Existing public release keys: `schemaVersion,id,submissionAttemptId,assessmentRevisionId,releaseVersion,releasedAt,state,criteria,annotations`. Criterion joins include question/rubric/criterion IDs and stable comparison key, original bounds, awarded score and explanation. Annotation joins include submitted answer/question/rubric/criterion IDs, exact one-based inclusive source lines, exact excerpt and explanation. Use the existing schema/projector; never serialize assessment database rows.

Withdrawn tombstone keys only: `schemaVersion,id,submissionAttemptId,releaseVersion,state,withdrawnAt`; no criteria, source, private withdrawal reason or private audit. Currentness keys: `schemaVersion,assessmentId,submissionAttemptId,availabilityRevision,currentReleaseVersion,withdrawnReleaseVersions,checkedAt`.

Example sequence (existing K5): release v1/current v1/availability 1 → release v2/current v2/availability 2 → withdraw historical v1/current v2/availability 3 → withdraw v2/current null/availability 4. No transition revives v1. Matching version number alone does not establish same assessment/attempt. Use `assertCurrentRelease` and the existing currentness token before displaying reused current feedback/progress; read historical content only under its explicit historical authorization/state. Currentness is rechecked after async work and before result/cache disclosure. Exact submitted source and pinned rubric accompany annotations; no latest-draft substitution, AI drafts, private references or provider payloads enter student DTO/DOM/cache/errors.

Current instructor preview/release lifecycle is not a reviewed student feedback route. Keith supplies feedback consumer; Darryl supplies the bounded authorized public adapter after real SH-SUB integration and agreement on exact route/projection revision. Do not treat ReleaseReadPort types or synthetic protocol checks as proof that a deployed public read boundary exists.

## C-AI consumer requirements

Reuse `AIGatewayPort`, `SecureAIGateway` and `GatewayResolver`; no student-side model calls or generic progress-success parser. Darryl owns assessment validation/provider/resource admission; Keith owns progress selection, domain validation and rendering.

- `assessment-draft`: exactly one immutable submission reference; trusted pinned public rubric/source plus server-only private reference as permitted. `validateAssessmentDraft` rejects criterion/bounds/source/excerpt mismatch wholly. Output remains instructor draft; approval/release remain explicit and separate.
- `progress-explanation`: 1–20 unique released numeric versions belonging to the current student, authorized course and selected evidence. Keith's resolver must reauthorize/recheck release currentness every invocation and supply minimal context plus mandatory domain validator. Evidence key binds exact releases/currentness; model/prompt/output configuration enters gateway fingerprints. Invalid/unowned/unreleased/withdrawn/cross-course evidence is rejected before transport and again before disclosure.
- Validate every cited release/criterion and comparison key, supported claims and evidence limitations; fewer than two comparable assessed attempts cannot substantiate improvement. Suggested practice is distinct from a supported observation. Output cannot change grades or execute code.
- Request/result/cache reads are actor/course/action/evidence/model/prompt scoped and reauthorized; stale or withdrawn evidence invalidates reuse. Request idempotency mismatch conflicts. Missing usage remains unavailable, not zero; cache copies do not duplicate reported provider usage.
- Real verified model/output cap, tokenizer reservation, shared quotas/concurrency/deadline and action-specific server credentials are activation gates. Unknown in-flight provider outcome retains conservative concurrency debt. No provider/live call is authorized here; manual assessment remains usable while AI is disabled.

Reusable check adapters: `workflow/contracts/instructor-contracts.ts` exports identity, publication, submission, release, protocol and gateway suites; `workflow/contracts/progress-gateway-consumer.ts` exports the five missing-validator/evidence/output/cross-user/revocation checks. Keith must instantiate against real reviewed adapters, not label fixture-only runs integration complete.

## Formatted instructions: narrowly scoped agreement request

Actual producer stores the existing `instructions` string. `InstructionPreview` and Student overview both use `InstructionText` with Markdown/GFM, parsed HTML followed by `rehype-sanitize`, default schema plus underline. Student code blocks receive code-owned focusable labelled regions after sanitization. Instructor published history remains literal text; its preview has no `codeLabel`. Existing plans claiming no student renderer and proposing a second rich tree are stale.

Proposed agreement: keep the existing string/strict v1 DTO and shared renderer; decide/document how legacy literal Markdown-like text is interpreted before aligning published instructor display. Separately decide whether to remove content-supplied `tabIndex` from sanitizer rules while retaining code-owned labelled code regions. No sanitizer, schema or student consumer change is made by this packet. Keith's source-specific agreement is required before implementation; broad K1–K6/onboarding acceptance does not cover this new compatibility policy.

## Reusable verification and proposed exclusive writer sequence

Run `npm run check`; focused commands (existing suites, not new producer proof):

```text
npx vitest run workflow/course/creation.test.ts workflow/course/authority.test.ts workflow/course/assignment-guard.test.ts workflow/auth/course-invitations.test.ts workflow/auth/managed.test.ts workflow/auth/owner.test.ts --maxWorkers 2
npx vitest run workflow/instructor-preview/assignments.test.ts src/shared/instructor-contracts/contracts.test.ts src/web/instructor/assignments/controller.test.ts src/web/instructor/assignments/python-highlight.test.ts --maxWorkers 2
npx vitest run workflow/assessment-preview workflow/connected-preview src/server/ai --maxWorkers 2
```

Tests use isolated synthetic provider/mail and local D1; do not run operator/bootstrap/migrations against existing development or hosted data to obtain a pass. Required real producer additions: racing same-key submits, changed key fingerprint, confirmed revision/save race, equality/late/retry boundaries, injected answer/receipt rollback, persistent restart, session/member/provider revocation before transaction and cached result, CSRF, foreign-course/self-only denial and private-field sentinels through the composed consumer.

| Window (proposed, no concurrent shared writers) | Sole writer and exact shared scope                                                                                                                                                                                                                  | Exit/review gate                                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| W1 shell repair                                 | Darryl: first brief's shared UI/auth/instructor client files; no schema/API/migration/student edit                                                                                                                                                  | Local tests, independent reviewer, Darryl manual acceptance; Keith regression recheck                                            |
| W2 SH-SUB producer                              | Keith: his new submission modules/tests; proposed submission DTO sections only if agreed; `src/server/index.ts`, `src/server/courses/authority.ts` resolver sections and next migration only in an explicitly granted serialized integration window | Concrete rules accepted, exact files and migration number rechecked, real D1 persistence/security evidence, Darryl source review |
| W3 instructor composition                       | Darryl: `src/server/index.ts` real catalog injection, `src/server/instructor/assessments/workflow.ts`/ports only as agreed, instructor consumer tests                                                                                               | Freeze W2 shared files first; exact Keith producer pin and Darryl consumer revision/checks; no duplicate submission store        |
| W4 C-REL projection                             | Darryl: release public adapter/DTO/API sections only as agreed; Keith student feedback separately against frozen producer                                                                                                                           | Authoritative self/course guards, public allowlist/currentness/tombstone cases and exact consumer review                         |
| W5 C-AI progress                                | Keith: progress resolver/validator/consumer; Darryl serializes any shared gateway/index changes separately                                                                                                                                          | Action validator and real evidence conformance; activation remains separately gated                                              |
| W-F instruction compatibility                   | Darryl: existing renderer and instructor consumers only after Keith's exact compatibility agreement                                                                                                                                                 | No competing format; legacy/injection/accessibility tests and Keith unchanged overview regression                                |

Latest migration is `0014_assessment_ai_candidates.sql` at this snapshot. Do not reserve 0015 by implication; recheck immediately before any agreed migration write. Windows describe file exclusivity/order, not scheduled times, grants, source approval or release authorization. No message to Keith sent.

## Remaining manual/external acceptance

Darryl: first shell brief approval and subsequent manual UI gate; onboarding People/coordinator/create/join/recovery UI; authoring reorder/minimum/highlighting/save/reopen/history/privacy. Keith: new concrete SH-SUB rules, real producer adapter and exact consumer/source reviews; formatting compatibility. Hosted first-admin, real Gmail/NUS delivery and Firebase verification remain separately authorized work. Production uses reviewed release workflow after staging. No unfinished change is archived.
