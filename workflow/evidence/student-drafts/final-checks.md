# Final checks: student-drafts (task 7.2)

Run 2026-11-12 at the working tree on top of `a59cb28` (only evidence, task and log files differ from that commit).

## Commands

- `npx openspec validate student-drafts --strict`: **valid**.
- `npm run check`: **exit 0**; all 17 OpenSpec changes valid, typecheck and lint pass, **47 files / 611 tests passed**, deployment tests and build passed. [Output](final-check.txt). The earlier intermittent parallel-run failures (UI review) did not recur in this run or the previous four; their cause is still unproven.

## Privacy and security review

Reviewer: Claude Code Coordinator (root session, Opus 5.5), by reading code and tests. This is an agent review, separate from and not a substitute for Keith's or Darryl's review.

| Area | What was checked | Result |
|---|---|---|
| Owner-only drafts and attempts | Every draft/attempt query in `src/server/student/work.ts` filters on the caller's account (`?4` = `principal.userId` from `studentGuardBindings`) together with `currentStudentGuard` (current membership and live session); writes are single guarded statements or the guarded batch. Tests: other students, instructors, outsiders and missing objects all get the same 404 (`work.test.ts` "answers 404 identically…", history access by `s1`/`inst`/`other`/`dual`). | pass |
| No private references | No wildcard selects of question or publication rows; `private_reference`, publication fingerprints and draft JSON are never selected for students (`repository.ts` note, `work.ts` column lists). The attempt fingerprint is compared server-side only; `replayResult` returns ID, version, time and `replayed`. Tests scan responses for `PRIVATE-REFERENCE-MARKER`, `fingerprint-secret` and `privateReference`. The C-SUB catalog returns only `validateAttempt`-checked attempts to course instructors. | pass |
| No execution path | No `eval`, `new Function`, `child_process` or dynamic import of submitted source in student server, shared or web code; the only `.exec(` is a URL regular expression. Submitted code is stored and displayed as text only. | pass |
| Stale results | The client applies a save response only if its sequence number still matches (`work-model.ts`, "this answer is stale"), clears backups on 401/revocation/sign-out, and the server re-checks membership inside each write. Tests cover stale acknowledgements and revocation between read and write. | pass |
| SW-11 rate limit | 12 saves / 3 new submits per account per 60 s via `AuthStore.rate`; replays exempt; 429 with `Retry-After`, nothing written; client pauses. | pass, with the known limit below |

## Known limits carried forward (not defects in this change's scope)

- A client that ignores 429 still writes one limiter row per request, and Worker requests are unprotected (`save-cadence.md`, task 8.5). Cloudflare-side protection is outside this change.
- The limiter roughly halves-to-thirds the editing headroom of the D1 Free write allowance; the 15 s cadence fallback is to be decided from staging metrics.
- The submit idempotency key does not survive a page reload; a retry after a reload can create a second attempt (allowed, attempts are unlimited).
- Real learner data stays blocked until archive-based deletion exists (SW-10).
- Shared items with Darryl: Skip to content target is 42 px (shared `styles.css`); an intermittent auth-lock assertion was seen once in a parallel run.
- Composed acceptance (6.2, 7.1) is Keith's report without captured screenshots or IDs; the membership changes there were local SQL, not the invitation/removal UI.
