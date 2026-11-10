# UI review: student-assignment-dashboard

## Keith manual acceptance — 2026-11-10

- **Reported by Keith:** all remaining manual checks done, including the VoiceOver listening check (page headings read; status and error messages read once), and manual acceptance of the three Student surfaces (course list, assignment list, read-only overview). Recorded by main `/root` from Keith's statement; `/root` did not hear the VoiceOver output.
- **Accepted with open shared-shell items** (Darryl-owned, outside Keith's writer window, handed off in [the handoff](../../handoffs/student-assignment-dashboard.md#for-darryl--shared-sign-in-and-shell-findings-2026-11-10)): finding 1 (post-join message), F2 (cross-tab session recovery hidden by the shared switch) and F4 (radio vs documented switch semantics). F3 (browser error page on full-page navigation while offline) is accepted as a limitation: pages are URL-based and nothing is cached in the browser by design.
- **Untested combinations:** other browsers (only Edge and Chrome) and screen readers other than VoiceOver; hosted staging.
- **Evidence images** were compressed on 2026-11-10 (PNG palette quantization, dimensions unchanged, 15.7 MB to 5.5 MB). Hashes before and after are in the [manifest](screenshots/manifest.json). Contrast evidence relies on the recorded RGB values, not screenshot pixels.

**Outcome: Task 5.2 accepted by Keith.**

## Current browser recheck — 2026-11-10

Main `/root`, local native-Edge self-review; no independent/human acceptance claimed. Design `warm-workbook-v1`; SD-05/06, UI-01/02/03/04/07/08. HEAD `8a7951f` plus existing CSS/retry-focus repairs; served `index-Coew5NIR.js` and `index-DEvFaz14.css`. No application source edits by this review.

| Area                          | Current outcome                                                                                                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Responsive / keyboard (UI-07) | Inspected widths retaken; ordinary 1280 px / 200% header wraps. F1 blocked-request Tab/Space retry focuses heading. [Sequences](task-5.2-recheck.md).                                                                   |
| Role switch (UI-03)           | **Return F4:** Space/Enter preserve selected native radio; Arrow changes workspace and Student heading receives focus. Documented switch semantics unresolved.                                                          |
| Contrast / targets (UI-01/07) | **Sampled pass:** four target samples ≥44px high. Computed RGB samples yield ratios >4.5:1 by calculation; DevTools contrast-widget reading unverified. [Readings](task-5.2-recheck.md#inspector-readings).             |
| Announcements (UI-07/08)      | **Unverified:** no audio feed; local VoiceOver listening report requested.                                                                                                                                              |
| Session / states (UI-02/08)   | Categories retaken; temporary latency for loading. Cross-tab return with DevTools focus retained overview until reload. Earlier F2 open; F3 browser Offline error reconfirmed.                                          |
| Privacy / verification        | 35 page-only retakes, same names, no visible emails. [Manifest](screenshots/manifest.json). Full check passes: specs/typecheck/lint/build, 456 Vitest tests + 4 deployment checks. Fixtures removed, settings restored. |

**Outcome: accept observed F1 repair and normal-window zoom check; return overall with findings / pending Keith acceptance.** Task 5.2 stays unchecked. [Complete recheck](task-5.2-recheck.md).

## Earlier computer-use review (historical)

Current results above supersede the preceding run's F1, zoom and sampled readings. Screenshot links now contain retakes.

- Human owner and role area: Keith; Student courses, assignments and read-only overview.
- Source revision / PR: `8a7951f5452c643172ef1945f53a9ecbedcda111`, PR #25, plus the pre-existing working-tree student CSS repair/tests. No application source edits in this review.
- Design reference: `docs/ui/design.md`, `warm-workbook-v1`.
- Requirements: SD-01–06, UI-01/02/03/04/07/08, AUTH-01–03, COU-06/07.
- Shared writer window / revisions: existing dashboard window in Ownership.md; producer composition in [composed acceptance](composed-acceptance.md). No new shared writer window opened.
- Reviewer / actual mode: main `/root`, computer-use self-review, 2026-11-10 (Singapore). Native Microsoft Edge controls and macOS accessibility tree; browser extension host unavailable. No subagents, independent review or Keith manual acceptance claimed.
- Environment / evidence: real local app at `http://127.0.0.1:8787`, existing local D1, dual-role account; [filled checklist](manual-ui-checklist.md), [screenshots](screenshots/), [verification](task-5.2-verification.md). No hosted run.

| Review area         | Requirement / acceptance                             | Outcome and evidence                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design identity     | UI-01 warm tokens, typography, ruled rows            | **Pass for inspected surfaces.** Serif headings, proportional interface, monospace source and ruled rows; [dark overview](screenshots/overview-1440-dark.png).                                                                                                                                                                                                                                      |
| Sign-in             | UI-02 session recovery                               | **Fail on cross-tab return; pass after reload.** Protected overview clears, but heading and Sign in recovery are hidden by the shared shell. [Initial return](screenshots/session-cross-tab-320-light.png); [reload](screenshots/session-expired-320-light.png). Provider flows not repeated.                                                                                                       |
| Role switch         | UI-03 labels, pointer/Space, state, role eligibility | **Partial / unverified.** Native Student/Instructor radios expose checked state; pointer and arrow transitions observed; Student destination heading focus verified. Separate Space/Enter activation and single-role omission not fully exercised. Radio pattern differs from switch semantics in design.md; return to shared-shell owner for reconciliation.                                       |
| Versioned workspace | UI-04 public version/question context                | **Pass for read-only presentation.** Exact version URL, UTC deadline, publication timestamp/ID, question, starter source and public rubric visible. [Overview](screenshots/overview-1440-light.png). Immutability/privacy acceptance remains in task 5.1 and automated checks.                                                                                                                      |
| Next/Previous       | UI-05 question-work navigation                       | **Not applicable.** No editor. Course pager separately passed: Tab reached Next after 100 links; Enter opened page two; Tab/Enter on First page returned to page one. [Pager](screenshots/courses-page1-pager-1440-light.png), [page two](screenshots/courses-page2-1440-light.png).                                                                                                                |
| Evidence links      | UI-06 learner feedback/source observations           | **Not applicable.** No learner feedback or submission source.                                                                                                                                                                                                                                                                                                                                       |
| Responsive/keyboard | UI-07 widths, zoom, targets, focus, motion           | **Fail / partial.** Requested widths and browser-reported 200% zoom captured; long names wrap, code scrolls independently. Heading/source/pager focus visible. Retry loses focus to HTML document. All-control 44px measurements and complete keyboard/theme matrix remain unverified. Reduced-motion emulation applied; inspected navigation remained static. [Checklist](manual-ui-checklist.md). |
| Contrast/appearance | UI-01/07 light/dark and contrast                     | **Partial.** Light/dark captures; readable rendered Next/Sign in. Declared-token contrast calculations exceed 4.5:1, but actual DevTools contrast readings for all rendered combinations remain unverified. [Calculations](manual-ui-checklist.md#display-settings).                                                                                                                                |
| Honest state        | UI-08 loading/empty/unavailable/network/session      | **Partial with findings.** All requested state categories captured. API-only blocking shows in-app connection error and Try again; Space triggers retry. Full-page Refresh while Offline reaches browser network error. Retry focus and cross-tab session recovery fail.                                                                                                                            |
| Privacy             | AUTH-02 screenshot/public-data scope                 | **Pass for saved visual evidence only.** Page-only crops exclude browser chrome, DevTools and open account menus; no visible email. Synthetic assignment/source/rubric only. Not an exhaustive DOM/cache audit.                                                                                                                                                                                     |
| Verification        | Exact checks and limitations                         | **Pass on rerun.** Strict validation 16/16, typecheck, lint, Vitest 455/455, deployment tests 4/4 and build. First sandboxed run failed on localhost EPERM. [Details](task-5.2-verification.md).                                                                                                                                                                                                    |

## Evidence and decisions

- All screenshot states and desktop/narrow/width/theme coverage are linked in the [filled checklist](manual-ui-checklist.md).
- Findings: F1 retry focus loss (Keith; repaired 2026-11-10, focus moves to the heading, regression test added; browser recheck pending); F2 hidden cross-tab session recovery (Keith/Darryl integration); F3 Offline full-page Refresh browser error (recovery limitation); F4 radio implementation versus documented switch semantics (Darryl/design review). No fixes or design departures accepted here.
- Untested: VoiceOver speech/once-only announcements, exhaustive rendered contrast/44px inspection, separate role Space/Enter activation, narrow account-menu expansion and remaining theme/zoom combinations.
- Cleanup: 105 temporary synthetic Student memberships deactivated; read-back count zero. Approved synthetic publication `87b1c39f-9b48-497d-a3d9-28464d971a67` remains in the existing local course. Signed out at end. Zoom reset to 100%; network blocking disabled; color/motion emulation reset; device emulation and DevTools closed.
- Outcome: **return with findings / pending Keith acceptance**. Task 5.2 stays unchecked; task 5.3 final authority/privacy review remains separate.

## Historical planning review

- Human owner and role area: Keith, student course list, assignment list and read-only overview.
- Source revision / PR: inspected `f62b23891434d18414ef8179a326749fc85365bf`; new uncommitted planning documents on main; no PR.
- Design reference: `docs/ui/design.md`, `warm-workbook-v1`.
- Relevant IDs: SD-01–06; AUTH-01–03; SUB-01/04; COU-06/07; UI-01/02/03/04/07/08.
- Shared-file writer window / producer-consumer revisions: none opened; documented context reference `8f93f51c1f6a36dd64908bd550e90b68e9957af1` is not consumer clearance. Task 1 requires exact implementation revisions and named writers.
- Reviewer / actual mode: main `/root`, Coordinator, planning self-review only. No subagents or independent/human UI acceptance.
- Evidence directory: `workflow/evidence/student-assignment-dashboard/`; [planning verification](planning-verification.md).

| Review area         | Requirement / acceptance                                        | Outcome and evidence                                                                                                                                                                                          |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design identity     | UI-01 shared warm tokens, typography and plain rows             | Pass for plan traceability: design decisions 4–5 specify shared styling. Runtime presentation not applicable to this docs-only checkpoint.                                                                    |
| Sign-in             | UI-02 shared session and safe return                            | Pass for planned scenarios SD-04/05 and tasks 2.2/3.3. Actual provider and student return integration unverified.                                                                                             |
| Role switch         | UI-03 authorized shared switch, single/dual roles, cancellation | Pass for planned scenarios SD-01/05 and tasks 3.1/3.3/5.1. Actual pointer/Space/focus and invitation integration unverified.                                                                                  |
| Versioned workspace | UI-04 exact version, public question/rubric context             | Pass for read-only overview boundary in SD-03. Working copy/attempt surfaces not applicable; actual version rendering unverified.                                                                             |
| Next/Previous       | UI-05 pinned question-work navigation                           | Not applicable to this document overview; no editor/question-work workspace is introduced. Page navigation is separately specified by SD-01/02/05.                                                            |
| Evidence links      | UI-06 historical source observations                            | Not applicable: feedback and learner source are excluded.                                                                                                                                                     |
| Responsive/keyboard | UI-07 widths, zoom, targets, focus, reduced motion              | Runtime checks not applicable to docs-only change; future actual evidence remains unverified under task 5.2.                                                                                                  |
| Contrast/appearance | UI-01/07 light/dark, contrast and screenshots                   | Runtime checks not applicable; planned shared tokens are traceable, actual contrast/screenshots unverified under task 5.2.                                                                                    |
| Honest state        | UI-08 loading/empty/denied/network/expired/races                | Pass for state matrix and SD-05 scenarios. Runtime state transitions unverified. Save/release/AI states not applicable to this slice.                                                                         |
| Privacy             | AUTH-02 public allowlists and current Student membership        | Pass for planning coverage SD-04 and task 2.2. Existing either-role `student-read` behaviour is an explicit producer gate, not a repaired runtime defect. Actual student payload/DOM/cache checks unverified. |
| Verification        | Exact validation/check outcomes                                 | See planning-verification.md. Existing application checks are baseline regression evidence, not proof of a student implementation.                                                                            |

## Evidence and decisions

- Representative desktop/narrow screenshots: not applicable to planning; no mock or screenshot claimed.
- Automated checks actually run: linked planning verification records results and environment limits.
- Manual keyboard/state checks: none; future task 5.2 remains unchecked.
- Intentional departures: none requested. Read-only document overview precedes the future UI-04/05 question-work surface; it does not replace or waive that surface's requirements.
- Findings returned to owner: student-safe listing is missing; generic public-read role semantics are insufficient for Student dashboard routes. Both are recorded as gated producer/consumer tasks.
- Untested combinations / blockers / next owner: all runtime/UI combinations unverified; Keith reviews plan and exact producers, Darryl supplies agreed shared producer additions.
- Outcome: planning self-review complete; runtime and human UI acceptance pending.
