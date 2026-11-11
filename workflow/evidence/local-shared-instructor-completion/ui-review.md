# UI review: local-shared-instructor-completion

## Repair checkpoint - 2026-11-11

Continuation2026-11-12 (PR27): shared arrival focus now waits until the authorization mask is removed; a role status is announced once per entry, ordinary revalidation retains recoverable focus without stealing a new target, and cancelled navigation clears stale checking text. Main focused43/43 and reused independent reviewer shared31/31 pass. These source/DOM checks supplement the earlier checkpoints; actual native Space/speech/beforeunload and the visual matrix remain unverified, not completed by PR publication. Focused consumer packet: [shared-shell recovery](../../handoffs/shared-shell-recovery.md).

The original inspection table below is preserved as pre-implementation history. Approved `local-shell-recovery-01` now repairs its shell findings in source. Current review: main plus independent `/root/shell_review`, source/synthetic DOM only. See [final shell verification and manual checklist](shell-verification.md) and its exact source manifest. New automated checks exercise the actual recovery CSS, focus, native checkbox semantics, current/initial account binding, all-check 401 priority, dirty-cancel callback, navigation cancellation recovery and stale/unmounted requests. Main final focused suites: 57/57; independent shared switch suite: 27/27 after focus repair. These do not establish actual Space/VoiceOver/native-beforeunload or rendered matrix acceptance.

| Current area                            | Outcome                                                                                                                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-02 recovery and UI-08 state/privacy  | Pass in focused synthetic DOM/client checks and independent source review; native/composed session/provider verification remains unverified. Recovery heading/Sign in live outside the hidden protected region.                           |
| UI-03 switch                            | Native checkbox with switch role, stable name/checked state and Student/Instructor labels implemented; semantic/pointer activation path passes DOM tests. Actual native Space, destination announcement and focus need manual acceptance. |
| UI-01/07 appearance/keyboard/responsive | Source preserves warm tokens, labelled 44px target, visible focus and no animation; rendered widths/200%/both appearances/contrast/reduced-motion/speech remain unverified.                                                               |
| UI-04/05/06 immutable/version context   | No backend/version/content changes; existing controller checks pass. Real D1 and native unsaved/assessment interaction acceptance remain unverified.                                                                                      |
| Student consumer compatibility          | 22/25 existing DOM tests pass; two old radio assertions and one session-response-count fixture need Keith's exact-source update. No student source changed.                                                                               |

Attempted browser verification could not inspect the synthetic page: in-app browser session mismatch and native app approval timeout. No screenshots or native UI evidence fabricated. Outcome: source/automated implementation reviewed; **manual acceptance pending**, not a completed UI matrix or overall feature acceptance.

## Original inspection table

- Human owner/area: Darryl, shared auth/shell and instructor; Keith's student source unchanged.
- Revision: local main `af1bc90fa47ed0b8726a46084ce642992c807e15`; new inspection/packet only, no PR.
- Design: `docs/ui/design.md`, `warm-workbook-v1`.
- Requirements: AUTH-01–03, COU-01–07, IAS-01–07, SHA-07, UI-01–08.
- Writer scope: inspection/packet/log only; first product writer window proposed in [brief](inspection-and-brief.md).
- Reviewer: main `/root`, source/evidence self-inspection; no new independent or human UI review.
- Evidence: this directory; prior student screenshots/rechecks referenced by `workflow/handoffs/student-assignment-dashboard.md` are historical evidence, not fresh screenshots.

| Review area         | Requirement / acceptance                               | Outcome and evidence                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design identity     | UI-01 warm tokens/type/control treatment               | Not applicable to changed rendering: docs-only checkpoint. Existing tokens inspected; no new appearance pass claimed.                                                                                 |
| Sign-in             | UI-02 session recovery/authorized destination          | Fail by source inspection: contexts failure becomes role revocation and CSS hides main; Student join has obsolete unavailable text. Runtime repair pending first brief approval.                      |
| Role switch         | UI-03 visible labels/Space/checked/single-role         | Fail by source inspection: native radios do not implement documented switch. Historical F4 confirms; no new runtime check.                                                                            |
| Versioned workspace | UI-04 immutable source/draft/public separation         | Unverified runtime; existing publication safeguards/tests inspected, D1 execution blocked.                                                                                                            |
| Next/Previous       | UI-05 pinned navigation/draft retention                | Unverified rendered keyboard workflow. Controller checks passed in focused baseline; they do not accept reorder focus or persistence.                                                                 |
| Evidence links      | UI-06 exact historical annotations                     | Not applicable to this documentation change; real submission composition remains a separate dependency.                                                                                               |
| Responsive/keyboard | UI-07 widths/zoom/touch/focus/reduced motion           | Unverified for repaired flow; no product repair yet. Manual gate in brief covers full required matrix.                                                                                                |
| Contrast/appearance | UI-01/07 measured light/dark combinations              | Unverified; no new screenshot or rendered contrast measurement.                                                                                                                                       |
| Honest state        | UI-08 session/role/network and delivery distinctions   | Fail by source inspection for shell failure classification. Mail queued/failed/unknown branches already exist, but D1-backed fresh verification blocked.                                              |
| Privacy             | AUTH-02/GRADE-04 no private references/unreleased DTOs | Public allowlists/strict schemas inspected; passing pure contract tests are baseline evidence only. D1/composed runtime blocked, no broad privacy acceptance claimed.                                 |
| Verification        | Exact check/security outcomes                          | Required check fails pre-existing evidence lint; focused 14/14 pass; broad baseline 275 pass/34 fail/155 skip with D1 loopback denial and DOM timeout; build and 4 deployment checks pass. See brief. |

## Evidence and decisions

- Screenshots: none created at this checkpoint. Do not relabel Keith's old captures as repaired-state evidence.
- Actual manual keyboard/state/listening tests: none. Python escaping/controller tests are automated source checks.
- Intentional departures: none approved. Implement UI-03 as documented; do not quietly revise design to match radios.
- Findings returned: three shared-shell issues, literal instructor published rendering versus shared Markdown preview/student rendering, stale planning assertions. Fixes await bounded brief approval; formatting compatibility separately needs Keith.
- Untested: repaired recovery/switch matrix; People removal/coordinator, invitation new/existing/provider-only partial recovery, authoring keyboard reorder/minimum/highlighting/save/reopen/history. D1 concurrency/rollback/restart/currentness blocked by loopback EACCES.
- Outcome: **return with findings / pending brief approval and manual acceptance**. No OpenSpec checkbox completed by this document.
