# Handoff: student-assignment-dashboard planning

- Human owner: Keith.
- Agent role / model / configuration: main `/root`, Coordinator; no subagents or independent review. Model-specific telemetry not exported; no invented model or usage allocation.
- Requirement IDs / change: SD-01–06, AUTH-01–03, COU-06/07, SUB-01/04, UI-01/02/03/04/07/08, warm-workbook-v1; `openspec/changes/student-assignment-dashboard/`.
- Input commit/artifact versions: source inspection `f62b23891434d18414ef8179a326749fc85365bf`; context producer reference `8f93f51c1f6a36dd64908bd550e90b68e9957af1` remains subject to exact selected-source review. No student consumer revision exists.
- Owned files: this new change's proposal/design/spec/tasks and CLI metadata, Keith's increment log, this handoff and new planning/UI evidence. No existing shared contract, source, migration, package or deployment file edited.
- Context retrieved: Ownership, current IntegrationContracts decisions, OpenSpec config and relevant in-flight course/publication/UI specs, UI design/review template, actual shell/context/authority/publication repository/renderer seams and nearby producer tests.
- Changes and decisions: capture accepted course-first browsing plus read-only overview. Defaults: UTC-labelled deadlines, past deadlines retained, deadline/assignment-ID ordering, 100-course/50-assignment replace-page navigation, latest publication per assignment with exact-version links. No editor/submission/feedback/progress/AI/history picker.
- Verification: [planning-verification.md](../evidence/student-assignment-dashboard/planning-verification.md) records exact commands/results; [UI review](../evidence/student-assignment-dashboard/ui-review.md) distinguishes planned coverage from unverified runtime acceptance. All 14 implementation tasks remain unchecked.
- Security findings / unresolved defects: instructor draft listing is not student-safe; course-by-ID and bulk-verification endpoints are instructor-only; `student-read` permits either course role. Require a reviewed public listing producer and explicit current Student authority at disclosure, preserving existing instructor semantics. These are inspected gaps, not implemented repairs or exploit findings.
- Resource measurements: no bounded dashboard recording run exists. The existing tracker run retains original attribution and is draining-to-stop for this admitted turn; counters remain provisional, per-dashboard allocation unavailable. Hook events are now observed by doctor, which does not establish complete callback coverage. No raw transcript or detailed private report exported.
- Blockers / next action: review plan, request implementation separately, pin exact producer revisions and obtain serialized shared writer windows before dependent edits. Darryl retains SH-AUTH/SH-ID/SH-PUB; no team agreement about the new DTO/window is invented. Reconcile old tracker after terminal evidence; only start a dashboard run in a later active turn under explicit recording authorization.
- Next owner: Keith for planning review and consumer work; Darryl for reviewed shared producer additions/windows. No message sent to Darryl.
- Independent review outcome: unavailable; main planning self-review only. No commit/push/merge/deployment/archive or runtime/manual acceptance.

## Apply attempt — 2026-11-09

- Role: main `/root`, Implementer (Claude Code session c1aaaded…), no subagents; recording run 428b26fb… for this increment.
- Gate 1.1: technical review at HEAD 3a7e5e4 — context/switch/publication producers unchanged since 8f93f51; SH-AUTH setup-reset (5e0ed6b) changed afterwards; producer test 18/18 pass; `student-read` either-role gap still present (authority.ts:160). Keith's source-review outcome pending.
- Gate 1.2: unresolved — no listing envelope agreement or writer windows recorded; not bypassed.
- Gate 1.3: done (task checked).
- No application/shared/source files edited; no commit/push/deploy. Evidence: [apply-gates.md](../evidence/student-assignment-dashboard/apply-gates.md).
- Next owner: Keith (1.1 outcome; arrange 1.2 with Darryl), then Darryl (2.1 producer window).

## Implementation increment, 2026-11-09

- **Role:** main `/root`, Implementer; no subagents. Recording run `428b26fb…`.
- **Gates:** 1.1 accepted by Keith. 1.2 Darryl's agreement as reported by Keith; Keith is sole writer, recorded in Ownership.md and IntegrationContracts.md. Darryl's direct review is still pending.
- **Done:** tasks 1.1–1.3, 2.1 and 2.2. Student listing and overview API with an SQL-level current-Student guard at disclosure; browser course, assignment and overview pages; shared sanitized renderer extracted. No migration, dependency or new storage.
- **Verification:** `npm run check` exits 0 (433 tests); 23 new student tests. See [implementation-verification.md](../evidence/student-assignment-dashboard/implementation-verification.md).
- **Open:** 2.3 (maximum payload), 3.x/4.x test gaps, and 5.x composed/manual/UI-review acceptance. Sign-in return to `/student…` needs an SH-AUTH `returnDestination` change, which is outside the window.
- **Next owners:** Darryl reviews the shared edits (authority.ts guard, index.ts, main.tsx, InstructionPreview extraction) and decides on the SH-AUTH return paths. Keith completes the remaining tests and the browser and manual acceptance.
- Uncommitted on main at `3a7e5e4`; no commit, push or deployment.

## Review status — 2026-11-09

- Darryl's approval of draft PR #25 (`2b2da64`) was reported by Keith, who asked for it to be treated as approved. GitHub shows no submitted review (`reviewDecision: REVIEW_REQUIRED`). CI checks `checks` and `secrets` pass.
- Still open: tasks 2.3, 3.x, 4.x and 5.x.

- Decision (Keith, 2026-11-09): no SH-AUTH `/student…` return destinations in this change; sign-in lands on `/workspace`. Deferred to a later SH-AUTH change. No Darryl action required; spec SD-05, design §5, task 3.3 and proposal updated.
