# Apply gates — student-assignment-dashboard (2026-11-09)

Implementer: main `/root` (Claude Code session `c1aaaded-0179-4a53-b787-29b78814fd9f`), role Implementer. No subagents, no commit/push/deploy. Recording run `428b26fb68a548bd93698ab8f552877d` (increment `student-assignment-dashboard`).

Instruction (Keith, 2026-11-09): apply the change beginning with producer-review and shared-ownership gates; do not bypass unresolved gates.

## Gate 1.1 — revision-pinned producer review

Status: **technical review done; Keith's source-review outcome pending.**

- Workspace HEAD: `3a7e5e4beaa38f3c92bf6912025c8189ea2e4207` (main). Dashboard producer reference `8f93f51` (2026-11-08, "Add authorized dashboard contexts and role switch") is an ancestor of HEAD. The inspection baseline is `f62b238`.
- `git log 8f93f51..HEAD` over `src/server/courses`, `src/shared/courses.ts`, `src/web/ui/workspace-switch.tsx` and `src/server/instructor/assignments` shows no changes. Context, switch and publication producers are therefore identical to the reference.
- SH-AUTH changed after the reference: `5e0ed6b` (setup-reset journal; `managed-store.ts`, `managed-routes.ts`, migration 0012). Other changes since the reference are the AI gateway (0013/0014) and assessments. None of them alter SessionView or the contexts DTO, but this was not line-reviewed for dashboard consumption.
- Producer test: `npx vitest run workflow/course/creation.test.ts` → 1 file, 18/18 passed (vitest 4.1.12). Producer evidence only; not consumer acceptance.
- Confirmed gap still present: `src/server/courses/authority.ts:160` sets `role = undefined` for `student-read`, so either course role passes. A Student-specific authority seam is still required (design §3).
- No student listing producer exists. `AssignmentService.list` remains draft-based.
- Not recorded: runtime schemas and synthetic payload examples for the new listing. They depend on gate 1.2.

## Gate 1.2 — shared envelope and writer windows

Status: **unresolved — blocked on Darryl.**

`workflow/Ownership.md` contains no window for any of these:

- the student listing envelope
- `src/shared/student-assignments.ts`
- a Student authority addition
- dashboard wiring in `src/server/index.ts` or `src/web/main.tsx`
- the neutral instruction renderer

`workflow/IntegrationContracts.md` still lists "Dashboard contexts producer — review pending" and has no listing-envelope agreement. No message was sent to Darryl, and no agreement is invented.

## Gate 1.3 — implementation instruction and recording

Status: **satisfied.**

- The instruction is recorded above.
- Both earlier `project-experiment-tracker` runs show `stopped` in `doctor`.
- Dashboard run `428b26fb…` was started by an explicit start instruction in an earlier turn of this session, and `/root` was assigned role Implementer via `agent-role`.
- `logs/keith/student-assignment-dashboard.md` is reused.
- Historical attribution is unchanged.
- Claude Code hooks were installed this session, so coverage is incomplete until the client restarts.

## Consequence

Tasks 2.x–5.x all depend on 1.2: Darryl's producer window, the reviewed validator, named route/API windows and the shared renderer window. No application code was written. Next steps:

1. Keith records the 1.1 source-review outcome.
2. Keith and Darryl agree the 1.2 packet and writer windows in `Ownership.md`/`IntegrationContracts.md`.
3. Darryl lands 2.1. Keith then starts 2.2.
