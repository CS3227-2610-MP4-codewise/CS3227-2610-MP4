# Proposal

## Why

Students can now find a published assignment and read its overview (student-assignment-dashboard). But they still cannot write, save or submit an answer. Darryl's assessment service reads attempts only through the C-SUB `SubmissionReadPort`/`SubmissionCatalog` seam, and today it is fed only by loopback sample injection. No real submission producer exists in staging or production, so no instructor can assess real student work. This change adds Keith's SH-SUB producer: durable drafts and immutable assignment attempts.

## What Changes

- Add a student working copy for each question of an exact published version. The student edits it in a code editor with line numbers and Python syntax highlighting, and saves are debounced and checked against the draft revision. The interface shows unsaved, saving, saved, conflict and failed states. A conflict opens a recovery window that shows the local and server copies side by side. The student chooses one copy and the other is discarded, with an explicit way to copy it first. Nothing is executed. [SW-01–SW-04, SUB-02, UI-04/05/07/08]
- Drafts stay pinned to the publication they were started on. When the instructor republishes, the draft remains on its old version and the student is told about the newer one. Moving the draft across is an explicit action that copies the code onto the new version. [SW-02, SUB-01, K2]
- Add atomic assignment submission. One attempt snapshots every question's confirmed draft revision against the latest publication. Before writing, the server checks current Student membership, the deadline, K4 source limits, the idempotency key and that each confirmed draft revision is still current. Attempts are unlimited before the deadline. A request that arrives at or after the deadline is rejected; late attempts are not accepted in the MVP. The latest committed attempt is the one assessed. [SW-05–SW-07, SUB-03, C-SUB SUB-C01–C06]
- Add a read-only submission history and submitted-attempt view, with server time, attempt ID and pinned version, linked from the workbook. Released feedback display is a later increment. [SW-08, SUB-04, UI-04/05]
- Supply a D1-backed C-SUB producer (`SubmissionCatalog`) for Darryl's assessment service. It replaces loopback sample injection only through an agreed composition handoff. [SW-09, C-SUB]
- Record the agreed retention policy. A student's attempts, drafts and the feedback linked to them are kept until 90 days after the course is archived. Courses have no archive timestamp yet, so the deletion job is out of scope, and real learner data stays prohibited until the policy is implementable. [SW-10]
- Follow [the UI design](../../../docs/ui/design.md) revision `warm-workbook-v1`, UI-01/04/05/07/08, on the new student workbook (working copy, Review assignment, submit confirmation, history and submitted attempt). UI-06 margin feedback is out of scope.

### Decisions recorded (Keith, 2026-11-10)

| # | Decision |
|---|----------|
| 1 | Late submissions are not accepted (MVP SUB-03 unchanged). The clock is the server (Worker) time, read once when the request arrives, through an injected clock. A submit is accepted only if `receivedAt < deadlineAt`, so one at exactly the deadline is rejected. A retry of an already-committed attempt returns the original attempt even after the deadline (SUB-C03). |
| 2 | There is no attempt-count limit. The latest committed attempt per student and assignment is the one assessed. |
| 3 | The browser creates the idempotency key (a UUID) when the student confirms a submit and keeps it until the request settles. The key is scoped to (user, logical assignment). The request fingerprint is the SHA-256 of the canonical JSON of the publication ID plus answers sorted by `questionVersionId` as `[questionVersionId, draftRevision, sourceHash]`. Authorization is checked before any replay. |
| 4 | Each draft save writes only if the stored revision still equals the revision the browser loaded (compare-and-swap). Submit confirms each question's revision and hash. One atomic D1 batch then checks membership, latest publication, deadline and draft revisions using the existing `course_write_guards` abort pattern. It copies the source from the stored draft rows, never from the request body. Any mismatch rejects the whole submit for reconciliation. |
| 5 | Keith accepts the K4 source rules: 32 KiB UTF-8, LF normalised on ingress, SHA-256, and a final LF preserved. |
| 6 | Keith accepts Python with one source per question. PlanningDecisions marks this joint, so Darryl's confirmation is pending. |
| 7 | Retention: all of a student's attempts and drafts, and the feedback linked to them, are kept until course archive + 90 days. Backup retention windows must be disclosed. The course-archive event is a Darryl SH-ID dependency. |
| 8 | Drafts are pinned to their publication. Moving a draft to a newer publication is an explicit copy. |
| 9 | Conflict recovery uses the local-versus-server window described above. Unsaved text is backed up in per-tab `sessionStorage`, scoped to user, publication and question, and cleared on acknowledged save, sign-out and session loss. Saves run 1.5 s after typing stops, at least every 10 s while typing continues, on blur, and before navigation, review or submit. |
| 10 | The proposed editor was CodeMirror 6, decided at the editor gate after a prototype comparison. **Decided 2026-11-10: variant B (textarea + `prismjs` overlay), no new dependency** (see update below). |
| 11 | Migration `0015` is the next after current main `0014`; the number is rechecked when the file is created. |
| 12 | Keith supplies the D1 `SubmissionCatalog` at a reviewed revision, checked with Darryl's existing contract suites. Darryl, or Keith in a granted window, composes it in `src/server/index.ts` in place of the loopback samples. |
| 13 | Per-student request rate (Keith, 2026-11-12): at most **12 draft saves** and **3 submits** per account per 60 s. Both use the existing D1 limiter (`AuthStore.rate`). The Workers Rate Limiting binding was considered for saves and dropped on 2026-11-12: on the Codewise deployment account it deployed but refused nothing at over three times the limit (`workflow/evidence/student-drafts/rate-limit.md`). A same-key idempotent replay is never limited. An over-limit request gets `429 RATE_LIMITED` with `Retry-After`; it delays the save or submit and never loses text. Decision 2 is unchanged: there is no attempt-count limit. |

### Unresolved before dependent implementation

- Darryl needs to agree the shared writer window: migration 0015, student route wiring in `src/server/index.ts`/`src/web/main.tsx`, a student-write guard in `src/server/courses/authority.ts` and new shared DTO `src/shared/student-work.ts`.
- Darryl needs to accept: decisions 1–4 as the C-SUB producer gates; decision 6; decision 7 and its course-archive dependency; and the "latest attempt is assessed" listing semantics of `SubmissionCatalog.list`.
- The editor library and the dependency approval (decision 10).
- The current D1 and Workers Free daily write/request allowances must be checked and measured against the save cadence. Neither figure is assumed here.

Update 2026-11-10: Keith reported that Darryl approved all shared decisions (the writer window and decisions 1–4, 6, 7 and the `SubmissionCatalog.list` semantics). See `workflow/Ownership.md` and the C-SUB producer gates in `workflow/IntegrationContracts.md`. The editor gate now compares three full workbook variants (design §9, task 4.1); the editor choice and dependency approval remain open.

Update 2026-11-10 (editor gate, decision 10): after running all three variants locally against the real student API, Keith chose **variant B, a native textarea with a `prismjs` highlighting overlay**, for its overall look and because it needs no new dependency (`prismjs` 1.30.0 is already used by the instructor UI). This replaces the proposed CodeMirror 6. No dependency approval was needed; `package.json` and the lockfile are unchanged. Only `keith/student-drafts-ui-b` was merged; variants A (CodeMirror 6) and C (Monaco) stay unmerged, and C's Worker CSP question is moot. See `workflow/evidence/student-drafts/editor-gate/comparison.md`.

## Capabilities

### New Capabilities

- `student-submissions`: student working-copy drafts, revision-checked saving and conflict recovery, pinned versions, atomic idempotent assignment attempts, submission history, the C-SUB producer and the retention policy (SW-01–SW-10).

### Modified Capabilities

None. `openspec list --specs --json` reports no canonical specs. This delta refines the in-flight codewise-mvp SUB-02–SUB-04 and C-SUB without changing their policies: late rejection, immutability and no execution remain as they are.

## Impact

- **Keith-owned:** `src/server/student/` and `src/web/student/` (workbook, editor, history) and their tests.
- **Shared, needs a writer window:** additive migration `0015_student_submissions.sql` (drafts, attempts, attempt answers, idempotency receipts); `src/shared/student-work.ts`; a student-write guard in `src/server/courses/authority.ts`; route composition in `src/server/index.ts` and `src/web/main.tsx`; and `SubmissionCatalog` composition in place of the loopback samples.
- **Rate limit (decision 13):** consumes Darryl's existing `AuthStore.rate` unchanged; no `wrangler.json` or `environment.ts` change.
- **Dependency:** a likely new editor dependency (CodeMirror 6 packages, exact pinned versions), subject to the editor gate.
- **Unchanged:** identity, course and publication stores, SessionView, instructor semantics, AI and providers.
- **Not allowed:** code execution, late attempts and real learner data before retention is implementable. Deployment happens only through the reviewed release workflow.

This change creates planning artifacts only. Implementation requires a later apply instruction and the gates in tasks.md.
