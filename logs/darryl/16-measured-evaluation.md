# Measured evaluation iteration

Owner: Darryl. Requirements: DEV-02/04, AI-05, GRADE-01. Base: main d7f2f34.

## Prompt ME-01 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt (redacted):** Evaluate instructor AI drafts on a fixed synthetic dataset; compare context selection and coordinated versus main-only work, with human-reviewed criteria, resource measurements and honest attribution.

### Agents spawned

- None: the main agent performed the required pre-approval feature analysis. Independent review and coordinated experimental roles are planned after approval when useful and authorized by the iteration skill.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt. Do not invent or double-count metrics.
- Reconciled main record `turn-9a520c182e89f7f4b5790b16`: input 1648348, cached subset 1372032, output 2481, total 1650829; attribution is turn-level.

### Experiment outcome

- Existing local preview produces deterministic mock output, not model results. Real provider activation/connectivity and manual acceptance remain open; the reflections file contains planned comparisons, not prior outcomes. OpenSpec planning artifacts created for approval; no experiment, real-model call, product change or human review performed.
- Next: user approval of the bounded plan, then implement and measure supported comparisons with separate human/model gates.

## Prompt ME-02 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt:** approve

### Agents spawned

- `/root/eval_review`: independent read-only review of the comparison and synthetic coordination exercise; chosen to check validity and reproduce findings. It identified context-comparison and attribution limitations; main agent repaired the reporting and added condition hashes and an injected-input boundary check.
- `/root/exercise_worker`: read-only coordinated-condition analysis of a disposable synthetic validator; chosen because actual agent coordination is the comparison being requested. It identified inverted and coercible bounds and noted authorization/version boundaries. No product edits or live provider access.
- Main agent `/root`: implemented the synthetic control and main-only exercise. UI iteration is not applicable; no interface changed.

### Token count

- Main, worker and reviewer token usage unavailable at this checkpoint; attribution reconciliation pending. Worker reported 6 seconds between observed clock readings, excluding startup and communication; main-only and reviewer comparable elapsed times unavailable. No result assumes unavailable usage is zero.
- Project-scoped recorder current main record `turn-da821e019bc29b1392bc9de9`: provisional input 6612460, cached subset 6606464, output 6826, total 6619286. Later calls and final response excluded; child attribution unavailable. This covers the whole implementation turn, not the isolated exercise; cached input is a subset, not an additional total.

### Experiment outcome

- Five deterministic response variants of one synthetic attempt were tested twice with the same validator; the measured context sizes are artifact bytes, not model tokens. Results and condition hashes are in `workflow/evidence/measured-evaluation/results.md`.
- Conducted actual isolated main-only and coordinated exercises; reviewer saw worker findings, so the review was not blind and the examples share one defect class. No broad quality or efficiency conclusion follows.
- Instructor-reviewed grading/corrections, real-model results, provider activation and Keith's attributed results remain pending. No real learner code, provider calls, release-policy changes or deployment.
- Reviewer additionally identified anchoring in the review sheet; expected outcomes were removed and limitations to blinding documented. The reviewer confirmed the repair. A suspected newline-escape defect was retracted after byte-level confirmation.
- `npm run check` with `VITEST_MAX_WORKERS=2` passed: 354 Vitest tests, four deployment tests, strict OpenSpec validation, typecheck, lint and build. Instructor review requested and remains pending.

## Prompt ME-03 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt:** Review the cases for me using the most sensible approach for the app.

### Agents spawned

- None; the main agent reviewed the five fixed synthetic variants against the existing assessment validation and release rules. No independent human or child reviewer was represented as having performed this review.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- Recorded assistant judgments and suggested corrections in `workflow/measured-evaluation/REVIEW.md`, including a cautious baseline explanation, rejection of three invalid cases and no automated release for the untrusted flag. This is assistant review at Darryl's request, not independent instructor review or model evaluation; those gates remain pending. No code execution, provider call or release-policy change.

## Prompt ME-04 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt:** Is the iteration done, and what was implemented?

### Agents spawned

- None; main agent inspected the existing task tracker and evidence to report status.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- The mocked control, isolated coordination exercises, assistant case review, reflection and handoff are recorded; the full project check passed. Genuine context-output comparison, human-reviewed criteria, real-model evidence and acceptance remain pending. Changes are uncommitted.

## Prompt ME-05 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt:** Where can I test the local preview?

### Agents spawned

- None; main agent checked the loopback preview and local startup instructions.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- The synthetic assessment preview returned HTTP 200 at the local address. Measured evaluation itself is a test/evidence workflow, not a separate web page. No live provider call or real account operation was performed.

## Prompt ME-06 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt:** Can I test the full local workflow from sign-in, and why was the earlier preview only one screen?

### Agents spawned

- None; main agent checked the connected preview instructions and started the local development workflow.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- Started `npm run dev:workflow`, which built assets, applied local-only migrations and reported the local sign-in endpoint ready. No owner-course setup flag, Firebase account operation, real model call or deployment was performed. The connected flow uses Firebase sign-in and local D1; its submission and model suggestions are synthetic. The earlier assessment preview is an isolated screen.
