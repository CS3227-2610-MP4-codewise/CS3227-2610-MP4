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

## Second pass — 2026-11-09

- Tasks 2.3–4.2 are done; see the follow-up section of [implementation-verification.md](../evidence/student-assignment-dashboard/implementation-verification.md).
- Two repairs: stored content that breaks the contract now fails closed with 503, and failure messages are no longer shown twice.
- `npm run check` exits 0 (452 tests). No dependency change.
- Open: 5.1–5.3. They need a composed run against the real sign-in setup, ui-review evidence, manual acceptance and a final review. Next owner: Keith.

## Task 5.2 computer-use checkpoint — 2026-11-10

- Main `/root` only, native Edge self-review; no child/independent review or Keith manual acceptance claimed. Revision `8a7951f` plus pre-existing CSS repair/tests. Requirements SD-05/06, UI-01/02/03/04/07/08, `warm-workbook-v1`.
- Owned edits: this change's UI-review/checklist/verification evidence, 35 page-only screenshots, this handoff, task-status note and Keith increment log. No application/shared source edits.
- [UI review](../evidence/student-assignment-dashboard/ui-review.md) and [filled checklist](../evidence/student-assignment-dashboard/manual-ui-checklist.md) replace the planning-only runtime status with actual local evidence. Captured three surfaces at requested widths, browser-reported 200% zoom, dark overview, source scrolling, pagination and every requested state category.
- Findings returned: retry loses visible focus; cross-tab sign-out clears protected content but hides heading/Sign in until reload; Offline full-page Refresh reaches browser error; actual role radios need reconciliation with documented switch semantics. VoiceOver speech, exhaustive rendered contrast/44px targets, separate role Space/Enter, narrow menu and remaining combinations unverified.
- `npm run check` passes after allowing localhost integration listeners: strict validation 16/16, 455 Vitest + 4 deployment tests, typecheck/lint/build. Initial sandbox run failed with EPERM. See [exact verification](../evidence/student-assignment-dashboard/task-5.2-verification.md).
- Cleanup: 105 temporary synthetic memberships deactivated; zero active read-back. Explicitly approved synthetic publication remains in local course. Signed out; test emulation restored/closed. No real code executed, remote mutation, commit/push/deployment/archive or message to Darryl.
- Task 5.2 remains unchecked; next owner Keith for repairs, remaining checks and acceptance, Darryl for shared-shell/control review. Task 5.3 final privacy/security/team review remains separate. Recording not activated; usage unavailable for this checkpoint.

## Retrospective correction — 2026-11-10

- Keith explicitly authorized retrospective usage/timeline recovery. The previous checkpoint's unavailable-usage statement is superseded by the [audit](../evidence/student-assignment-dashboard/retrospective-audit/audit.md), without rewriting its history.
- Computer-use turn `01a1c1a2`: 196 exact response IDs; 37m 47.314s elapsed; 26,251,241 input (26,056,832 cached subset), 43,759 output (11,633 reasoning subset), 26,295,000 total. Main `/root` only. Follow-up feasibility turn is separately itemized; current audit turn excluded while ongoing.
- Supported tracker source attachment, redacted annotation and report regeneration completed; tracker validation passes. Session remains off with zero admissions; bounded dashboard records verified unchanged. No historic run backdated/reassigned, no raw transcript exported, no collector source edited.
- Relevant evidence/logs updated; UI findings and next-owner actions above are unchanged. Task 5.2 is not completed by telemetry recovery.

## Task 5.2 recheck — 2026-11-10

Main `/root` self-review, no subagents or independent/human acceptance. SD-05/06, UI-01/02/03/04/07/08, warm-workbook-v1. [Recheck and limited sign-off](../evidence/student-assignment-dashboard/task-5.2-recheck.md): all 35 screenshots retaken at existing filenames; normal 1280px window / 200% verified with device toolbar off; blocked-request Tab/Space retry focuses heading (F1). Actual rendered size/color samples recorded; calculated ratios distinguished from DevTools contrast-widget readings. Full check passes (456 Vitest + 4 deployment tests, strict specs/typecheck/lint/build).

Return overall with findings: VoiceOver speech/once-only delivery unverified; Space/Enter retain selected native radio, so F4 documented switch behavior unresolved; earlier F2 recovery finding remains open. Task 5.2 unchecked; Keith manual acceptance and 5.3 final review pending. Zero active temporary synthetic memberships; capture-only latency profile removed; network, color, device/DevTools and zoom restored; local account signed out. No app-source changes, commit, push or deployment. Next owner: Keith for listening/acceptance and student review; Darryl/team for shared switch/session findings.

## For Darryl — shared sign-in and shell findings (2026-11-10)

Found during Keith's composed local acceptance (task 5.1) and UI review (task 5.2). All three are in Darryl-owned shared files, outside Keith's writer window, so none were changed in this PR. Requirement IDs: AUTH-01–03, COU-06/07, UI-02/03/07/08; design `warm-workbook-v1`.

| #         | Finding                                                                                                                                                                                                     | Where                                                                                                                                                             | Suggested fix                                                                                                                                                   | Evidence                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Finding 1 | After accepting a Student invitation, the join page says "The Student workspace is not yet available." and gives no Student link                                                                            | `src/web/auth/client.ts:12` (`joinedWorkspaceMessage`), `src/web/auth/App.tsx:400–407`                                                                            | Say the Student workspace can be opened and link to `/student` (or `/workspace`) when the joined roles include Student; update `src/web/auth/client.test.ts:11` | [composed acceptance](../evidence/student-assignment-dashboard/composed-acceptance.md#findings)                                 |
| F2        | Signing out in another tab, then returning, hides the Student page's heading and Sign in recovery; only "Workspace availability could not be checked" and "Return to available courses" remain until reload | `src/web/ui/workspace-switch.tsx:64–67` treats any `/contexts` failure (including 401) as revoked; `src/web/styles.css:86` then hides everything below the header | Treat 401 as session loss rather than revocation (or do not hide `main` for it), so the page's own expired-session notice and Sign in stay visible              | [UI review](../evidence/student-assignment-dashboard/ui-review.md), `screenshots/session-cross-tab-320-light.png` (earlier run) |
| F4        | Role control is a native radio group; `docs/ui/design.md` describes switch semantics (Space toggles). Space/Enter keep the current radio; arrows change workspace                                           | `src/web/ui/workspace-switch.tsx`                                                                                                                                 | Either implement the documented switch or update the design reference (team decision)                                                                           | [recheck](../evidence/student-assignment-dashboard/task-5.2-recheck.md)                                                         |

Next owner: Darryl. Keith's dashboard needs no change for these; Keith will recheck after Darryl's fixes.

## Tasks 5.2 and 5.3 — 2026-11-10

- 5.2: Keith's manual acceptance, including VoiceOver, as reported by Keith. Evidence images compressed (15.7 MB to 5.5 MB, dimensions unchanged; hashes in the manifest).
- 5.3: [final self-review](../evidence/student-assignment-dashboard/final-review.md): no findings since `8a7951f`; `npm run check` exit 0. No independent review.
- Owned files changed since `8a7951f`: `src/web/student/student.css`, `StudentWorkspace.tsx` and its two test files, `workflow/student/seed-courses*`, evidence, this handoff, tasks and Keith's log.
- Remaining: Darryl's GitHub review of PR #25; Darryl's shared-shell findings above; hosted staging acceptance under the reviewed release workflow. Archive the change only after merge.

## Post-review fixes — 2026-11-10

Seven review reports were checked against the code; all were valid. Generator–verifier: main `/root` fixed them, and one Reviewer subagent verified the fixes (agent review, not human). See [post-review fixes](../evidence/student-assignment-dashboard/post-review-fixes.md).

- **Fixed in Keith's files (tasks 6.1–6.5):** account view refreshed on focus (#2); `/workspace?role=` resolved against current contexts (#3); stale failure text cleared (#4); Back link keeps the assignment page (#6); instruction code blocks are focusable, labelled regions (#7).
- **For Darryl (added to the section above):**
  - #1 is the same as F2: the shared switch treats a 401 as revocation, and the shared CSS then hides the recovery.
  - #5 is the same as F4: the radio group versus the documented switch. Either change the code or revise the design.
  - The obsolete text "The Student workspace is not yet available." remains in `src/web/instructor/Workspace.tsx:228–229` and in `src/web/auth/client.ts:14` (finding 1). It can still appear if `/workspace`'s own contexts check fails and the Instructor workspace then finds a Student-only account.
  - Optional: the instructor preview can opt in to focusable code blocks with `<InstructionText codeLabel="…">`.
  - Reviewer note (existing behaviour): in the instructor preview, raw HTML in instructions can keep an author-supplied `tabindex`; the sanitiser's default rules allow it. Consider removing `tabIndex` from `instructionSchema` in `src/web/ui/instruction-text.tsx`; agree it with Keith, since the renderer is shared.

## Darryl shared-shell repair checkpoint - 2026-11-11

The shared Student entry, 401/session recovery and UI-03 switch findings are repaired in the uncommitted local working tree over main af1bc90fa47ed0b8726a46084ce642992c807e15. Exact source hashes and verification: [shell verification](../evidence/local-shared-instructor-completion/shell-verification.md). New implementation has independent agent source review, final focused 57/57 and independent shared switch 27/27; this is not Keith's exact-source review or Darryl manual acceptance. No student implementation changed. Keith's existing 4.3/policy/manual dashboard acceptance remains recorded above.

The unchanged Student DOM suite returns 22 pass/3 fail against this producer: two old native-radio expectations and one fixture tied to the previous session-request count. Precise proposed adjustments and new-source review packet: [Keith integration packet](local-completion-keith-packet.md). Native shell/browser/zoom/speech checks remain unverified after browser-session mismatch and native app approval timeout. Broader project check still stops at pre-existing unrelated evidence lint; fresh D1 verification remains environment-blocked. Next owners: Darryl manual shell acceptance; Keith consumer-test alignment/source recheck. No new joint acceptance, live call, deployment, commit/push or archival claimed.
