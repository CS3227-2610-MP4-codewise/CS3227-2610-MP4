# Handoff: student-drafts — C-SUB producer (task 6.2)

- Human owner: Keith (producer, SH-SUB). Consumer and reviewer: Darryl (C-SUB, instructor assessment).
- Agent role / model / configuration: Claude Code Coordinator (root session, Opus 5.5); no agents spawned for this handoff. The catalog itself was built by the domain Implementer agent and reviewed by the Reviewer agent in commit `defbd63` (see `logs/keith/student-drafts.md`).
- Requirement IDs and OpenSpec change: `student-drafts` SW-09 (C-SUB SUB-C01–C06), with SW-05–SW-08 and SW-11 behind it; AUTH-02.
- Input commit/artifact versions: producer revision **`1d39d61`** on `keith/student-drafts` (PR #26). `src/server/student/catalog.ts` and `attempts.ts` are unchanged since `defbd63`. Migration `0015_student_submissions.sql`.
- Owned files (exclusive write ownership): Keith — `src/server/student/` (catalog, attempts, work, rate limit), `src/shared/student-work.ts`, migration 0015. The `AssessmentWorkflow` submissions argument in `src/server/index.ts`: Keith, by Darryl's grant reported 2026-11-12 (`workflow/Ownership.md`, "Extension — SubmissionCatalog composition").

## What Darryl receives

`D1SubmissionCatalog` (`src/server/student/catalog.ts`) implements Darryl's `SubmissionCatalog` port:

| Member | Behaviour |
|---|---|
| `sampleMode` | `false` |
| `getAuthorized(principal, attemptId)` | Returns the committed attempt in the closed `attemptSchema` (`src/shared/instructor-contracts/submission.ts`), checked with `validateAttempt`, only for a current Instructor of the attempt's course; anything else (student, other-course instructor, revoked session, missing id) is `NOT_FOUND`. Malformed stored rows are reported as unavailable (503), never as client errors. Drafts are never returned. |
| `scope(principal, attemptId)` | `{ courseId }` of the attempt, for Darryl's object authorization. |
| `list(principal, publication)` | Each student whose **latest committed attempt for the assignment** is on that publication (accepted listing semantics, 2026-11-10), ordered `submitted_at DESC, seq DESC`; fails closed above 1,000 rows (`CATALOG_LIST_LIMIT`, no paging in the port). Student labels follow the existing opaque per-course convention (design Open Questions). |

Schemas: `attemptSchema` / `validateAttempt` (shared C-SUB contract, unchanged), plus the producer-side closed `schemaVersion 1` request/response schemas in `src/shared/student-work.ts`. Producer gates (deadline and server clock, latest attempt assessed, idempotency key and fingerprint, guarded save/submit batch, Python one source per question) are as accepted in `workflow/IntegrationContracts.md` ("Keith producer gates").

## Composition (applied by Keith, 2026-11-12, `src/server/index.ts`)

Before this change `AssessmentWorkflow` received the loopback samples in loopback development and **no catalog** everywhere else, so staging and production had no submissions. Applied inside `workflow()`:

```ts
import { D1SubmissionCatalog } from './student/catalog';
// ...
allowLocalSamples(env, request, config?.origin) && ports.localSubmissions
  ? ports.localSubmissions({ assignments, request })
  : new D1SubmissionCatalog(env.DB),
```

- Loopback samples stay development-only and only when the connected-preview worker supplies `localSubmissions` (`workflow/connected-preview/worker.ts`); plain `wrangler dev`, staging and production use the real catalog.
- Decided (Darryl, via Keith, 2026-11-12): samples stay exclusive in a sample-port run.
- `npm run check` after the change: exit 0, 47 files / 611 tests, build passed. No automated test drives the composed Worker with a signed-in instructor; the composed run below is the check.

## Synthetic payloads

Synthetic only (SW-10: real learner data stays blocked until archive-based deletion exists).

- Unit fixtures: `src/server/student/test-fixture.ts` (`publish`, `seedPeople`), used by `catalog.test.ts`.
- Local app data: `node workflow/student/seed-courses.mjs seed 1 <account> <issuer> <subject>` then `seed-work 1 …` creates "Synthetic course 001" with publication `synthetic-work-publication` (2 Python questions). It enrols the account as Student only; the composed run needs an Instructor of the same course (see below).

## Verification commands and actual results (2026-11-12, at `1d39d61`)

- `npx vitest run src/server/student/catalog.test.ts`: **15 passed**, including Darryl's `submissionContractSuite('D1SubmissionCatalog', …)` from `workflow/contracts/instructor-contracts.ts` run against the real catalog's output, drafts never returned, non-instructor / other-course / revoked → 404, malformed stored data → unavailable, latest-per-assignment listing, ordering and the 1,000-row cap.
- `npm run check` at `e1d2beb` (code unchanged since): exit 0, 47 files / 610 tests, build passed (`workflow/evidence/student-drafts/rate-limit-check.txt`).
- **Not yet run:** the composed local run (task 6.2 verify). Plan, after the composition is applied:
  1. With two local accounts (or one dual-role account, which task 7.1 also needs): account A creates a course and publishes an assignment through the instructor UI; account B is added as Student.
  2. B opens the workbook, saves both answers and submits; note the attempt ID from History.
  3. A opens the assessment workflow for that publication: B appears in the list, and opening B's entry loads that exact attempt ID and source.
  4. Confirm a draft edited after submitting does not change what A sees, and that the loopback samples do not appear in this run.
  Record the outcome in `workflow/evidence/student-drafts/composed-acceptance.md` (shared with task 7.1).

## Security findings / unresolved defects

- None open in the catalog. Privacy: projections carry no private references; the review in task 7.2 re-checks owner-only drafts, no private references, no execution path and SW-11.
- SW-11 limits writes from well-behaved clients only; a client ignoring 429 is not contained (`save-cadence.md`, task 8.5).

## Resource measurements

Catalog reads are bounded by the 1,000-row cap; per-request D1 rows for list/get were not separately measured. Write-side figures: `workflow/evidence/student-drafts/save-cadence.md`, `submit-batch.md`.

## Blockers and next action

- No blocker for composition. Next action: the composed run above (task 6.2 verify), done together with task 7.1.
- Next owner: Keith (composed run), with Darryl reviewing the composition and this handoff.
- Independent review outcome: pending Darryl's review of this handoff.
