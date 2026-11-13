# Handoff: instructor-ux-refresh

- Human owner: Darryl.
- Agent: /root, gpt-6.1-sol; no child agents.
- Requirements/change: instructor-ai-assessment; AI-02/05, GRADE-01/02, AUTH-01/02 and UI-01/03/04/05/06/07/08.
- Input revision: 19311ae7a9f7f6fbae57f0f9ca588556ce8494b7, isolated worktree and branch codex/instructor-ux-refresh.
- Owned files: instructor assessment/authoring presentation; shared ui/workspace-switch.tsx and tests; design/tasks, writer record, evidence and log. No backend, DTO or migration edits.
- Changes: compact AI generation/options and question-synchronized review; source-first grading, approval completeness and authoring hierarchy; foreground checks ignore internal focus and coalesce requests.
- Verification: ../evidence/instructor-ux-refresh/verification.md and ui-review.md. Exact npm run check not a pass (two Worker timeouts, both passed serial rerun); affected tests and build results recorded there.
- Security: fail-closed authorization and reference opt-in retained; no student permissions or public payload changes. No live model or deployment performed.
- Resource measurements: unavailable, current log provisional.
- Blockers/next action: independent/human review, full 200%/keyboard/contrast matrix and staging acceptance; model output accuracy remains separate.
- Next owner: Darryl. Keith shared-consumer review remains separate.
- Independent review: not performed; no reviewer agent spawned or reused.
