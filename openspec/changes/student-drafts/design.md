# Design

## Context

See proposal.md for motivation and the decisions Keith recorded on 2026-11-10. The source was inspected at `af1bc90` (main after PR #25); this is a reference point, not a producer review.

Observed seams:

- **Publications and questions.** `instructor_assignment_publications` has `id`, `assignment_id`, `course_id`, `publication_number` and `deadline_at`. `instructor_question_versions` belongs to exactly one publication (`publication_id`, `position`, `language CHECK 'python'`, `starter_code`, `private_reference`). Draft and attempt rows can therefore reference question versions directly, and the publication fixes the deadline.
- **Student authority.** `src/server/courses/authority.ts` exports `currentStudentGuard`/`studentGuardBindings`, which the dashboard repository uses to check current Student membership in SQL when data is disclosed. `course_write_guards (allowed CHECK(allowed=1))` is the existing pattern for aborting a D1 batch when a condition fails.
- **The instructor consumer.** `SubmissionCatalog` (`src/server/instructor/assessments/workflow.ts`) extends `SubmissionReadPort` with `sampleMode`, `scope(principal, attemptId)` and `list(principal, publication)`, which returns `{attemptId, submittedAt, label, sample}`. `src/server/index.ts` currently feeds it only from `localSubmissions` behind `allowLocalSamples` (loopback, development only).
- **The attempt contract.** `attemptSchema` (`src/shared/instructor-contracts/submission.ts`) is closed: `schemaVersion 1`, `attemptId`, `assignmentVersionId`, `courseId`, `submittedByUserId`, `submittedAt` and `answers[1..20]` of `{submittedAnswerId, questionVersionId, rubricVersionId, draftRevision, source, sourceHash}`. `validateAttempt` checks it against the publication. The producer must emit exactly this shape. No late flag is needed because late attempts do not exist.
- **Existing student code.** The `src/server/student/` HTTP handler maps safe errors to non-enumerating 404s. The `src/web/student/` workspace and overview already exist, and the overview is the entry point to the workbook.

## Goals / Non-Goals

**Goals:** durable owner-only drafts; truthful save and conflict states; one atomic, idempotent attempt per confirmed submit; a real C-SUB producer; bounded requests and storage; no source execution.

**Non-Goals:**
- Released feedback display and UI-06 margin observations (SH-REL consumer, later).
- Progress and AI.
- Late or extension policies.
- Instructor views of drafts.
- The deletion job and course archive.
- Offline-first editing across tabs or devices beyond per-tab recovery.

## Decisions

### 1. Storage in additive migration 0015

```text
student_drafts(user_id, question_version_id, publication_id, course_id,
               revision INTEGER >= 0, source TEXT, source_hash TEXT, updated_at,
               PRIMARY KEY(user_id, question_version_id))
student_attempts(id PK, user_id, course_id, assignment_id, publication_id,
                 submitted_at, idempotency_key, fingerprint,
                 UNIQUE(user_id, assignment_id, idempotency_key))
student_attempt_answers(id PK, attempt_id, question_version_id, rubric_version_id,
                        draft_revision, source, source_hash,
                        UNIQUE(attempt_id, question_version_id))
```

- **No existing data is copied.** Foreign keys point to existing account, course and publication rows.
- **Attempt numbering:** "latest" is ordered by `submitted_at` and then by an insert sequence, because ties within one Worker time tick are possible.
- **Revision 0** (starter source) is virtual. No row exists until the first save, which keeps writes down.
- **Alternatives considered:** storing drafts as JSON on one per-assignment row (rejected: one question's save would conflict with another's) and append-only draft history (rejected: more writes; the MVP needs only the latest revision plus immutable attempts).

### 2. API (Keith's student handler; routes composed in the shared window)

```text
GET  /api/student/publications/:pub/work             → drafts per question (or starter@0), latest-publication pointer, attempt count
PUT  /api/student/drafts/:questionVersionId          {baseRevision, source} → {revision, sourceHash, savedAt} | 409 {revision, source, sourceHash}
POST /api/student/publications/:pub/drafts/move      {questionVersionId(old), targetQuestionVersionId, targetBaseRevision} → new revision on target | 409 current target
POST /api/student/publications/:pub/attempts         {idempotencyKey, answers:[{questionVersionId, draftRevision, sourceHash}]}
GET  /api/student/publications/:pub/attempts         → own attempts, newest first (bounded page of 50)
GET  /api/student/attempts/:attemptId                → own attempt (attempt contract projection)
```

- **Shapes:** closed `schemaVersion 1` request and response schemas live in a new `src/shared/student-work.ts`.
- **Safe errors:** `CONFLICT_REVISION`, `STALE_PUBLICATION`, `DEADLINE_PASSED`, `IDEMPOTENCY_MISMATCH`, `INVALID_CONTRACT`, `NOT_FOUND`, `UNAUTHENTICATED`, `UPSTREAM_UNAVAILABLE`.
- **Mutation protection:** mutations call the existing `requireMutationOrigin`/CSRF check. Every response is `no-store`.
- **Denied versus missing:** denied and missing objects share one 404, as on the dashboard.

### 3. Authority checked when data is written

- **Guarded writes.** Each write is one D1 batch. Its first statement inserts a guard row whose `allowed` value is computed in SQL: current Student membership, an active course, and for submit also latest publication and `receivedAt < deadline_at`. When `allowed=0`, the CHECK aborts the whole batch.
- **Mapping guard failures to errors.** The handler then runs a read-only diagnosis to choose the safe error: membership and missing object give 404; the others give their specific code.
- **The new guard.** This needs a reviewed `currentStudentWriteGuard` addition in `authority.ts`, the shared file. The generic `student-read` action is left unchanged.
- **Why not check first, then write in a separate statement:** it leaves a revocation race (SW-01 scenario 3). The dashboard already set the precedent of authority checked at disclosure.

### 4. Compare-and-swap draft saves

- **Updating an existing draft:** `UPDATE student_drafts SET revision=revision+1, … WHERE user_id=? AND question_version_id=? AND revision=?baseRevision`.
- **First save (base 0):** uses `INSERT … ON CONFLICT DO NOTHING`.
- **Zero rows changed:** the handler returns 409 with the current row so the client can reconcile.
- **Source handling:** source is normalised once with the existing K4 `canonicalizeSource` and `sourceHash` primitives, and the hash is computed on the server.
- **Unchanged source:** a save whose source matches the stored hash returns the current revision without writing. Exception: a base-0 save always inserts revision 1, even when the text equals the starter, because the attempt contract requires `draftRevision ≥ 1`. The client saves untouched questions before submit.
- **Applied refinement (2026-11-10, reviewed):** a draft save is one statement with the current-Student guard in its `WHERE` clause rather than a guard-row batch, so a save writes one row. A revoked member changes no row and receives 404. Move and submit keep the guard-row batch; move also compare-and-swaps the target with `targetBaseRevision`, so it never overwrites newer work there.

### 5. Atomic submit and idempotency

The submit is one D1 batch, in this order:
1. One guard statement (membership, latest publication, deadline, complete question and rubric coverage computed from the publication, and, through `json_each` over the confirmed pairs, that each stored draft revision and hash equal the confirmed pair).
2. `INSERT student_attempts`.
3. `INSERT … SELECT` of the answers from `student_drafts`, so the request body's source is never used.
4. Cleanup of the guard row.

Rules:
- **Replay first.** Before the batch, a lookup on `(user, assignment, key)` handles replay. The same fingerprint returns the stored attempt; a different fingerprint returns 409. This lookup runs only after a current-membership read check, so a revoked member gets no replay data.
- **Racing replays.** If two replays race, the UNIQUE constraint makes one batch fail, and the loser re-reads.
- **Fingerprint.** The SHA-256 of canonical JSON `{publicationId, answers:[[questionVersionId, draftRevision, sourceHash]...]}`, sorted by `questionVersionId`.
- **Key lifetime.** Keys are kept as long as their attempt.
- **Clock.** Server time comes from an injected `clock()` read once at handler entry. Workers time advances only on I/O, so this records the receipt time. The time is never taken from the client or computed at commit in SQL. Deadline comparisons use ISO-8601 UTC strings in one fixed format, matching `deadline_at`.
- **Alternatives considered:** SQLite `now` at commit (penalises slow requests and makes the deadline instant untestable) and the client's clock (forgeable).

### 6. C-SUB producer

`D1SubmissionCatalog` in `src/server/student/` implements `SubmissionCatalog` with `sampleMode=false`:
- **`getAuthorized`:** returns the attempt in the closed shape and checks it with `validateAttempt` against the pinned publication.
- **`scope`:** maps attempt to course.
- **`list`:** for a publication, returns one row per student whose latest committed attempt for the whole assignment is on that publication (ordered by `submitted_at`, then insert sequence), labelled with an opaque per-course student label. A student whose latest attempt is on a newer publication appears only under that publication. More than 1,000 rows fails closed as unavailable rather than truncating. No email address is used unless Darryl's existing label policy says otherwise.

Instructor authority still comes from Darryl's workflow identity wrapper. Composition in `index.ts` uses the real catalog in place of the loopback samples outside loopback development. Checks use Darryl's `workflow/contracts/instructor-contracts.ts` factory suites with the real catalog.

### 7. Client save state machine and conflict window

- **Per-question state:** `{baseRevision, ackRevision, ackHash, localSource, status ∈ unsaved|saving|saved|conflict|failed}`.
- **When saves run:** 1.5 s after typing stops, at least every 10 s while typing continues, plus on blur, before Previous/Next, before Review and before submit.
- **One save at a time:** there is one save in flight per question. Edits made while a save is in flight are queued, and the latest text is sent after the response.
- **Stale acknowledgements:** an acknowledgement applies only if its question and request sequence still match (UI-08 stale acknowledgement).
- **Failure:** retries back off exponentially, capped at 30 s, and a manual retry is always available.
- **Conflict window:** a side-by-side, read-only view of the local and server text. Changed lines are marked by a line-level difference that does not rely on colour alone (no new dependency for the difference). The actions are **Keep my version** (saved on top of the server revision), **Use saved version** and **Copy other version** (copies to the clipboard first, with a visible fallback when the clipboard is denied).
- **Local backup:** `sessionStorage` key `cw:draft:<userId>:<publicationId>:<questionVersionId>`, with no source in logs. It is cleared on acknowledged save, sign-out, session expiry (401) and account change.
- **Why `sessionStorage` rather than `localStorage`:** design.md forbids shared-browser disclosure of learner code. The trade-off is that unsaved text is lost if the tab is closed while the network is down. That is documented, and the honest not-saved state warns the student before they leave.

### 8. Workbook UI (warm-workbook-v1)

- **Route:** `/student/assignments/:pub/work/:position`, where `:position` is 1-based ("Question n of N"); the API's 0-based `position` is not exposed in URLs, and an out-of-range position shows not found. The overview's Open action leads here for the latest publication. A draft on an older version stays editable and keeps saving (SW-02), with the newer-version notice and the explicit move; submit always targets the latest publication, so an older version cannot be submitted. (Reviewer ruling, 2026-11-10, replacing "older versions stay read-only", which contradicted SW-02.)
- **Layout:** question text in proportional type above or beside the editor. On narrow screens (UI-07) the question stacks above the editor and stays reachable.
- **Answer views (UI-04):** Working copy and Submitted attempt, using native tabs or the accessible tab pattern.
- **Navigation (UI-05):** Previous/Next. Previous is disabled on the first question, and Next becomes **Review assignment** on the last. Review lists every question with its acknowledged revision, any unsaved or failed state, and missing answers. Submit is a separate confirmation that lists the revisions it will snapshot.
- **History:** a list of the student's attempts that opens the read-only attempt view.
- **States (UI-08):** loading, empty, denied, expired session, save pending, failed and conflict, stale version, deadline passed (submit disabled with an explanation, editing still allowed), and action pending, error and success.
- **Never shown:** run, execute or AI controls (UI-01).

### 9. Editor component (gate)

- **Leading option: CodeMirror 6.** It has a Python language mode and line-number gutter, accessible keyboard focus with Esc to leave so Tab isn't trapped, and touch support, at a modest bundle size.
- **Alternatives:**
  - Textarea with a `prismjs` overlay: no new dependency, but layered overlays are fragile for selection, IME input and screen readers.
  - Monaco: a large bundle and weak on mobile.
- **The gate.** Keith decided on 2026-11-10 that the gate compares three full workbook variants rather than thin prototypes: A (CodeMirror 6), B (textarea + `prismjs`) and C (Monaco, falling back to CodeMirror 6 with an alternative layout if Monaco is measured as unworkable). Each variant implements tasks 5.1–5.3 on its own worktree branch (`keith/student-drafts-ui-{a,b,c}`) off the reviewed domain commit, built by a separate, authorized UI Implementer agent. Candidate packages stay on variant branches. The variants are compared against SW-04 and UI-01/04/07: keyboard, screen reader, 320 px, 200% zoom, light and dark, and bundle size. Keith then chooses one, approves its dependency with exact pinned versions, and only that variant is merged; the editor sits behind a small `CodeEditor` wrapper so it can be swapped.

## Authorization, data boundaries, isolation and resource limits

- **Authorization:** the trusted session comes from SH-AUTH. Every read and write re-checks current Student membership in SQL. Browser role state never authorizes anything.
- **What each role sees:** drafts are owner-only and never reach instructor, catalog or AI paths. Attempts reach instructors only through `SubmissionCatalog`. No private reference column is selected anywhere.
- **No execution:** source is stored and rendered as text only, with no `eval` and no execution path.
- **Isolation:** local development uses synthetic fixtures. The staging and production D1 databases are separate, and migration 0015 reaches them only through the reviewed release workflow. Real learner data is blocked by SW-10.
- **Size limits:** 32 KiB per source and at most 20 questions per assignment (from the attempt schema), so an attempt is at most about 640 KiB. History pages hold at most 50 attempts. The JSON request body for a save is bounded to cover a 32 KiB source at worst-case JSON escaping (6×, `\u00XX`) plus envelope; a submit carries only revisions and hashes. A per-user save/submit rate limit is not part of this change; it is an open decision for Keith (reviewer finding, 2026-11-10).
- **Request and write quota:** each acknowledged save is one D1 write and one Worker request. The current Workers Free and D1 daily allowances are not assumed here; task 1.4 measures a synthetic session's save rate against the published figures before the save timing is fixed. If needed, the 10 s maximum interval is lengthened, without weakening the save on blur, navigation and submit. Unchanged-hash saves skip writing.

## Risks / Trade-offs

- [A revocation or republish race during submit] → It is evaluated inside the same batch guard, and the tests force it between the client confirmation and the batch.
- [D1 batch limits or guard-statement complexity] → Measure the batch for 20 × 32 KiB answers; split the answer insert only if a limit is reached, keeping it in the same batch.
- [Same-millisecond attempts confuse "latest"] → Order by `submitted_at` and then by an insert sequence.
- [Tab closed while offline loses text] → This is the accepted `sessionStorage` trade-off. The not-saved state is shown before the tab is left.
- [The editor dependency adds to the bundle] → The gate measures it, the editor is code-split to the workbook route, and versions are pinned exactly.
- [Composition change to the loopback sample path] → Darryl owns that seam. Until the handoff, both paths coexist and the samples stay loopback only.
- [Retention not implementable] → SW-10 blocks real data, and the course-archive dependency is raised with Darryl.

## Migration Plan

1. **Migration.** Add `0015_student_submissions.sql`; recheck the number against main at creation. It is additive only, so rolling back means leaving the tables unused and removing the routes. No destructive down-migration is applied to hosted data.
2. **Code order.** Land the student routes behind the existing authentication. Compose the catalog only after Darryl accepts the handoff.
3. **Release.** Staging, then production, only through the reviewed GitHub Actions release workflow with synthetic data.

## Open Questions

- The exact opaque per-course student label format for `SubmissionCatalog.list` is to follow Darryl's existing label convention once it is reviewed. This does not change the specs or the tasks.
