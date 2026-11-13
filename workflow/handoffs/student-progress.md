# Handoff: student-progress

- Human owner: Keith.
- Agent role / model / configuration: one coordinator in Claude Code (claude-opus-5-5); no agents spawned. Experiment recording run `dd9f5b69`, log `logs/keith/student-progress.md`.
- Requirement IDs and OpenSpec change: `openspec/changes/student-progress` SP-01–SP-10 (refining PROG-01–03), AI-01, AI-02, CON-06, OPS-01, UI-01/07/08.
- Input commit/artifact versions: base `b362618`; branch `keith/student-progress`.
- Owned files (Keith):
  - Shared contract and its test: `src/shared/student-progress.ts`, `src/shared/student-progress.test.ts`
  - Server: `src/server/student/progress.ts`, `src/server/student/progress.test.ts`, `src/server/db/migrations/0017_student_progress.sql`
  - Existing student server files edited: `http.ts` (progress routes), `rate-limit.ts` (`progress` action), `feedback.ts` (two helpers exported, behaviour unchanged), `routing.test.ts`
  - Web: `src/web/student/Progress.tsx`, `progress-model.ts`, `Progress.dom.test.ts`, plus edits to `StudentWorkspace.tsx`, `model.ts`, `student.css`
  - Composed test: `workflow/connected-preview/normal-progress.test.ts`
- Shared files edited (window in `workflow/Ownership.md`; **Darryl's review pending, not claimed**): `src/server/environment.ts`, `src/server/ai/runtime-config.ts` (+ test), `src/server/index.ts`, `.dev.vars.example`.
- Relevant context supplied / retrieved: `workflow/handoffs/secure-ai-gateway-progress-consumer.md`, `workflow/contracts/progress-gateway-consumer.ts`, the gateway, its store and config, C-REL `ReleaseReadPort`, the student feedback consumer, `docs/ui/design.md`.
- Changes and decisions:
  - Keith's decisions (2026-11-13):
    - Small additive shared edits, reviewed by Darryl.
    - Evidence is selected automatically per course (newest released attempt per assignment, cap 8).
    - The latest result is stored in a new Keith-owned table.
  - Design D9 covers prompt injection:
    - The server computes the facts and the model only words them.
    - Opaque `R…`/`K…` labels replace real IDs.
    - `facts` and `notes` are kept separate.
    - Text checks reject URLs, code, scores and override phrases.
  - AI is disabled unless `SOCLAAS_STUDENT_ENABLED=true` and `SOCLAAS_STUDENT_CONFIG` is valid.
- Verification commands and actual results: see `workflow/evidence/student-progress/verification.md`.
  - `npm run check` fails only on `workflow/ai-quality-evaluation/ledger.test.ts`, which also fails on unmodified `b362618`.
  - Progress suites after the revision: 88/88 (shared, server including Darryl's consumer contract suite, composed Worker, DOM). Live: 4 harness calls on the first prompt, plus 2 successful generations through Keith's local app on the revised prompt.
- Security findings / unresolved defects:
  - **Quota pool**: `GatewayStore` pins one `soclaas-shared` policy. The student config's six limits must equal the instructor's while both are enabled, otherwise student admissions fail closed. Changing this needs Darryl.
  - **Second-order injection (I1)**: student code can be copied into an AI assessment draft that an instructor approves. Progress treats released text as data and validates claims against scores, so tone can still be steered but claims cannot. Suggestion for Darryl (not implemented): flag instruction-like text copied from source into draft explanations during review.
  - The selection window is 50 attempts (design D1).
  - Revision 2026-11-13 (decisions 4–5): every student with released feedback gets a summary of the newest 3 assignments; comparison only on shared criterion names; full marks (from scores) shows "Good job! Keep up the good work."
  - Open: 3.9 live case matrix for the revised prompt (optional); 6.1/6.5 blocked by the pre-existing ledger test failure.
- Resource measurements: see the tracker checkpoints in `logs/keith/student-progress.md`.
- Blockers and next action:
  1. Done 2026-11-13: task 6.4, the local live check (4 calls). Two findings repaired; see `workflow/evidence/student-progress/live-check.md`. The repaired prompt has only one live sample.
  2. Done 2026-11-13: Keith reported the manual UI checks complete and accepted the page (`ui-review.md`).
  3. Darryl: review the shared wiring and the quota-pool constraint.
  4. Mark `codewise-mvp` 7.1–7.4 only after 6.1 passes, which is blocked by the pre-existing ledger failure.
- Next owner: Darryl (shared wiring and quota-pool review on the PR).
- Independent review outcome: none yet.
