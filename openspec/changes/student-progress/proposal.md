# Proposal

## Why

Students can now read released feedback for each attempt (student-released-feedback, SF; student-question-views, SQ), but nothing ties feedback together across assignments. The MVP baseline (`codewise-mvp`, PROG-01–03, tasks 7.1–7.4) promises a private, evidence-linked progress explanation, and Darryl's secure AI gateway already accepts the `progress-explanation` action. The student-side consumer is still missing (`workflow/handoffs/secure-ai-gateway-progress-consumer.md`, "consumer revision: pending"). Keith owns that consumer: evidence selection, domain validation and rendering (`workflow/Ownership.md`, SH-AI and W5).

## What Changes

- Add a **Progress** page for each course in the student workspace (`/student/courses/:course/progress`). It lists the evidence the server selected and shows the latest progress explanation. [SP-01, SP-02, SP-09, UI-01, UI-08]
- **Server-selected evidence**: from the caller's own attempts in the course, take the newest attempt for each assignment that has a current release. Order newest first and cap at 8. Unreleased, withdrawn and superseded feedback, classmates' data and private references are never selected. The browser never supplies evidence. [SP-01, SP-02, PROG-01]
- **Summary for everyone, comparison when possible** (revised, decision 4): every explanation summarises the newest 3 releases. A criterion name is comparable when at least two selected releases share it, and only comparable names may appear in recurring issues or improvements. With no comparable name, the page says it is a summary, not a comparison. With no released feedback, there is no provider call. [SP-03, PROG-01]
- **Full-marks encouragement** (decision 5). [SP-06a]
- **Explain my progress** (POST) sends a `progress-explanation` request through `SecureAIGateway` using Keith's resolver. The resolver re-authorizes and rechecks currentness on every call and builds a bounded prompt from the released criteria only. [SP-04, SP-05, AI-01, AI-02]
- **Domain validator**: the output has to separate recurring issues, supported improvements, practice suggestions and limitations. Every cited reference must be a selected release that contains the cited comparison key. A claimed improvement must be backed by released scores. The output carries no grade fields. Anything invalid is rejected and never shown. [SP-06, SP-07, PROG-02]
- **Stored latest result**: a new Keith-owned table, `student_progress_results`, records the gateway request ID and the exact evidence versions. Every read re-selects the evidence and re-reads the result through the gateway. If anything changed, the result is marked **stale** and its text is withheld. [SP-08, PROG-03]
- **Shared wiring (Darryl review pending)**: small additive edits to `src/server/environment.ts` (`SOCLAAS_STUDENT_ENABLED`, `SOCLAAS_STUDENT_CONFIG`), `src/server/ai/runtime-config.ts` (a student parser that shares the instructor parser's validation) and `src/server/index.ts` (composing the progress gateway into the student handler). AI stays disabled unless these variables are set. Provider activation remains gated on verified quotas and models. [AI-01, OPS-01]

### Decisions recorded (Keith, 2026-11-13)

| # | Decision |
|---|----------|
| 1 | Keith makes the smallest additive shared wiring edits in this change. A write window is recorded in `workflow/Ownership.md` and Darryl's review stays pending on the PR. |
| 2 | Evidence is selected automatically per course: for each assignment, the newest attempt with a current release, newest first, at most 8. Students do not pick releases. |
| 3 | The latest result persists in a new Keith-owned table (next migration number, rechecked before creation), not only in the URL. |
| 4 | (Revised 2026-11-13, supersedes the "fewer than two comparable releases" gate.) Every student with any released feedback gets an explanation. It always summarises the newest 3 releases (what went well, what to work on), and adds recurring issues and improvements only for criterion names shared by at least two releases. With no released feedback, there is no AI call. |
| 5 | When every criterion of every selected release is at full marks (computed from scores, not by the AI), the page shows "Good job! Keep up the good work." with AI-written strengths, and no focus points. |

### Assumptions and exclusions

- Excluded: activating any live provider, choosing models or quotas, changing gateway internals or quota tables, instructor screens, release DTOs, and any grade change.
- Progress text is AI-generated, so it is untrusted. The UI labels it and says it never changes grades.
- The route is `/api/student/courses/:course/progress`, not the MVP design's illustrative `/api/courses/:course/progress`. This keeps all student routes under one handler and its session and origin guards.
- Unresolved: real SoCLaaS model, quota and output-budget values. Until an operator verifies them, the page shows "Progress explanations are unavailable".

## Capabilities

### New Capabilities
- `student-progress`: a student's private, evidence-linked progress explanation for one course: evidence selection, comparability, gateway request, output validation, stored-result staleness and the progress page.

### Modified Capabilities
None. The SF, SQ and dashboard requirements are unchanged. The course page gains only a navigation link to Progress.

## Impact

- New: `src/shared/student-progress.ts`, `src/server/student/progress.ts` (selection, resolver, validator, service), `src/server/db/migrations/00NN_student_progress.sql`, `src/web/student/Progress.tsx` with model/client additions, tests and evidence.
- Changed (Keith): `src/server/student/http.ts` (two routes), `src/web/student/StudentWorkspace.tsx` and its routing (Progress link and route), student CSS.
- Changed (shared, Darryl reviews): `src/server/environment.ts`, `src/server/ai/runtime-config.ts`, `src/server/index.ts`, `.dev.vars.example`.
- Consumes, without changing: `SecureAIGateway`, `GatewayStore`, `ReleaseReadPort.attemptReleases/getAuthorized/currentness`, `workflow/contracts/progress-gateway-consumer.ts`.
- UI: `docs/ui/design.md` revision `warm-workbook-v1`, screen map item 5; UI-01, UI-03, UI-07, UI-08.
