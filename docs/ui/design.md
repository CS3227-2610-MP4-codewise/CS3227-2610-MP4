# Codewise UI design contract

Revision: `warm-workbook-v1`, 2026-11-05. Owner: Darryl for this design/documentation increment; Keith reviews student and shared identity consumers before dependent implementation. The user selected Workbook's layout and Margin's palette, then requested a role switch, sign-in and Next navigation. This document defines the intended design; none of these role features is claimed implemented.

## Authority and scope

Read this document before planning, implementing or reviewing application UI. Apply its visual and interaction rules across sign-in, student and instructor screens. The accompanying [OpenSpec change](../../openspec/changes/warm-workbook-ui/proposal.md) supplies UI-01–UI-08 acceptance requirements; the [review checklist](../../workflow/templates/ui-review.md) turns them into review evidence.

Authentication, data contracts and MVP domain requirements retain authority over UI convenience. A design choice cannot grant roles, expose private drafts, change atomic assignment submission or resolve deadline/retention policy. Resolve conflicts explicitly in the relevant producing change; record intentional departures with the user/team decision, affected requirement and revised design revision before implementation.

The chat samples are exploratory references, not production components. Their simulated role picker is replaced by the conditional real switch below; their missing login/Next controls are not exceptions to this contract. Their local-only save messages are not the final save behavior. No app implementation, canonical OpenSpec sync, archive or deployment is authorized by this documentation increment.

## Identity: a warm programming workbook

Keep the question and its work together. Use a continuous page with ruled divisions, restrained editorial headings and source-linked margin notes. Emphasize the current task, source version and next action. Preserve this identity through all states, including errors and sign-in.

- Use warm paper, dark olive-charcoal ink and terracotta emphasis. Use green only for a verified positive state, with a text label.
- Prefer shared page surfaces and whitespace to repeated rounded cards. Keep short labels in sentence case; reserve small uppercase labels for section context.
- No gradient hero, glowing background, decorative analytics, generic KPI row, bento dashboard, oversized marketing heading in a workspace, ornamental pill collection or chat-first replacement for the editor.
- Decoration must not suggest functionality: no fake save, execution, AI, navigation or membership controls.

## Visual tokens

Use these semantic names from the shared theme in `src/web/styles.css`. The first foundation slice now implements these tokens and the public foundation screen; [component usage](components.md) records the reusable controls and remaining consumer responsibilities. Sign-in and role workspaces are still unimplemented. Do not introduce a CSS framework or font dependency solely to reproduce the sample.

| Token        | Light     | Dark      | Purpose                                 |
| ------------ | --------- | --------- | --------------------------------------- |
| `canvas`     | `#F1ECE2` | `#252620` | Outer workbook surface                  |
| `page`       | `#FFFDF7` | `#2C2E26` | Question and work surface               |
| `ink`        | `#2C3029` | `#F0ECDF` | Main text, active rule, main action     |
| `secondary`  | `#616457` | `#BEC2B0` | Supporting text                         |
| `rule`       | `#D5D0C1` | `#505548` | Dividers and control boundaries         |
| `accent`     | `#9B3E2B` | `#FFB399` | Selected annotation, important evidence |
| `annotation` | `#F4E5DB` | `#48382D` | Selected source-line fill               |
| `success`    | `#3D6245` | `#BBD5AF` | Acknowledged save/released status       |
| `on-ink`     | `#FFFDF7` | `#22271F` | Filled main-action text                 |

Honor the user's system appearance initially. Both appearances retain the warm palette. Color always has a text/state equivalent. Verify actual text/background combinations, including focus and error states; target at least 4.5:1 for normal text and 3:1 for large text and essential control indicators. Define error and focus treatments explicitly during component work; do not assume a pale divider is sufficient to identify an input.

| Use                              | Initial stack / size                                            | Rationale                                             |
| -------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Controls, instructions, feedback | `"Segoe UI", Arial, sans-serif`; 15–16px body, 13–14px controls | Proportional word shapes and compact, readable labels |
| Page/question titles             | `Georgia, serif`; 28–32px, normal weight                        | Workbook character without oversized hero text        |
| Annotation title                 | `Georgia, serif`; 21–23px                                       | Distinct from operational labels                      |
| Source, examples, inline symbols | `Consolas, "Courier New", monospace`; 14–16px                   | Preserve indentation and line relationships           |
| Supporting labels / line numbers | 12px minimum                                                    | Secondary hierarchy with readable contrast            |

Monospace is not the default interface font. Do not apply it to whole navigation bars, instructions or feedback. Never rely on the availability of a downloaded font for layout. If a new font is proposed, review licensing, payload, fallback metrics and visual evidence first. Use 1.5–1.7 body line spacing and approximately 1.8–2.1 source line spacing. Limit prose to about 45–65 characters per line where practical; allow editor width to fit source.

Use a 4/8/12/16/24/32/48px spacing scale, with 24–32px desktop page padding and 16–20px narrow padding. Default corners: square surfaces, up to 4px control corners; use a capsule only for the physical switch thumb/track. Use a 2px active rule and a 1px page divider. Omit decorative shadows and paper rotation. Focus must be visible and distinct from selection.

## Screen map

The labels below describe navigation destinations, not authorization to invent API routes.

1. Sign in → authenticated course/assignment list. Restore a safe, authorized intended destination when possible.
2. Assignment → published question order → workbook. Remember position within the current authorized context.
3. Student workbook → Working copy / Submitted attempt / Released feedback. Submission history selects an exact attempt, not a mutable draft.
4. Instructor workspace → assignment authoring/publication or submitted-attempt review with rubric, assessment revision, approval and release.
5. Student progress → released evidence and linked source history, using the same typography and version context; no invented scores or claims of improvement.

Assignment lists use plain rows with title, meaningful state and an explicit open action. Do not add analytics cards to fill space. Keep course, assignment, question and attempt context discoverable without forcing a permanent wide sidebar.

## Sign-in page — UI-02

Use a quiet, responsive two-part composition: Codewise wordmark, a short workbook-oriented introduction and a compact sign-in form/action. On narrow screens put identity and action in one reading column. Keep the same paper/ink palette, type hierarchy and button treatment as the app.

The maintained identity provider is unresolved in C-ID. Use the approved provider's sign-in action once selected; do not create a local password store, password-reset flow, public instructor-registration form or pretend authenticated demo. No role selection at login grants privileges. Before provider integration, any demonstration must be clearly synthetic and must not expose protected routes.

Ownership update requested by Darryl on 2026-11-06: Darryl implements shared sign-in and registration/provisioning presentation, provider/account integration and session/logout handling (SH-AUTH); Keith retains courses, memberships, object authorization and student features (SH-ID). Both review the composed C-ID contract. This assignment does not choose a provider or approve public registration; trusted instructor provisioning remains mandatory.

Required states: ready; redirect/signing in with duplicate action prevented; provider cancellation; safe failure with retry; expired session; authenticated but no course membership. Do not reveal account existence or provider internals. Preserve only a validated local return destination and reauthorize it after sign-in. Offer logout and a clear session identity inside the app. Session loss must not falsely report an unsaved draft as saved; safe recovery follows the agreed identity/storage contract, without shared-browser disclosure of learner code.

## Shared chrome and role switch — UI-03

Show a compact wordmark, course/assignment context, current identity, role context and logout. In a synthetic preview, visibly label preview controls; do not carry an unrestricted preview role selector into the real app.

When trusted identity data authorizes both workspaces in the current context, use a real two-position switch with visible **Student** and **Instructor** labels. Student corresponds to off; Instructor to on. Implement as a native focusable control with switch semantics, a stable accessible name such as "Instructor workspace", and a synchronized checked state. Space toggles; click/tap operates the whole labeled target. Announce the new workspace and move focus to its heading after transition. Honor reduced-motion preferences.

If the approved C-ID contract permits one role in a course, show that role as text and omit the switch. Do not broaden the identity schema to satisfy the switch. The allowed-context projection and cross-course behavior require Keith's producer contract and Darryl's consumer review. While switching, handle unsaved work explicitly, avoid duplicate transitions, clear inaccessible view data and reauthorize all requests. A client toggle never changes server membership. If access changes or switching fails, stay in/recover to an authorized context with a clear message.

## Workbook and version context — UI-04

Desktop: one continuous sheet with a question pane at approximately 38–40% and a work pane at 60–62%, separated by a vertical rule. Place question ordinal, concise title, instructions, examples and expandable rubric guidance in the question pane. Put answer-view navigation, file/attempt state, code and relevant feedback in the work pane. Keep an assignment-level header above both.

Answer views have equal-sized targets and an active underline. Use a properly implemented accessible tab pattern or equivalent native controls with matching state, panel labels and keyboard behavior. Instructor views omit the student's working copy. Assessment drafts, approved revisions and released revisions must have distinct labels and permitted actions.

- Working copy: editable pinned source, visible saving/saved/conflict/failed state. Display "Saved" only after server acknowledgement of the displayed revision. Show unsaved local changes honestly; retry/recovery never silently replaces code.
- Submitted attempt: immutable source, server timestamp, attempt identifier and pinned question/rubric context; no editing affordance.
- Released feedback: exact released revision and attempt source. Switching views never changes the submitted source or applies a suggested fix automatically.
- Instructor review: submitted source beside rubric and editable assessment. Keep AI suggestions distinguishable from instructor-reviewed content. Approval of an exact revision and release are separate deliberate actions; editing invalidates stale approval according to GRADE-03/04.

Show deadlines with a named timezone when the producing contract supplies them. Do not invent dates, attempt quotas, late rules or retention promises to make the design look complete.

## Previous and Next — UI-05

Provide a footer inside the assignment workspace with **Previous question**, **Question n of N**, and **Next question**. The question picker complements these controls. Accessible names include destination question titles where useful. Navigation follows the pinned published order, updates both panes together and preserves the current view and exact attempt when one is selected.

Disable Previous at the first question with an understandable boundary. On the final question, replace Next with **Review assignment**. That opens an all-question review of exact draft revisions and missing/invalid answers; only a separate explicit submission action may atomically submit the assignment. Never submit a single question by clicking Next. For an already-submitted historical view, use an attempt summary instead of inviting submission of that snapshot.

Before moving with pending, failed or conflicting saves, preserve editor contents and offer an appropriate wait/retry/recovery or explicit local-retention choice. Never silently discard text or claim it was saved. Do not disable unrelated navigation indefinitely on an AI failure. On arrival focus the new question heading and announce the question/position without reading the entire editor. Preserve per-question draft state when returning. A request racing navigation must not overwrite the newly selected question.

## Source-linked margin feedback — UI-06

Code stays monospaced, selectable and indentation-preserving. Number canonical source lines. Mark only annotated lines with a small letter/index and the selected terracotta fill/rule; do not rely on color or hover. Provide an equivalent labeled observation list so line selection is not the sole access path.

Selecting a line/observation highlights its exact source range and shows a compact proportional-text note: criterion, line range, observation and explanation. Retain focus on the selected trigger and announce the changed note. Ensure wrapped display lines retain their original logical line number. Never shift historical annotations to a newer working copy. Malformed/unmatched annotations get a safe unavailable-evidence state, not a fabricated location.

Students receive only released public fields. Instructor-only AI drafts and references never enter student DTOs, DOM or cached views. Show inspection/no-execution context without repeating an alarming banner in every panel. Do not present uncalibrated AI confidence meters.

## Responsive behavior and state coverage — UI-07

Use side-by-side panes when both remain readable; stack question then work around 720px, adjusting the breakpoint from measured content fit rather than device names. At 320px retain all essential actions; answer navigation may wrap labels inside equal targets, not overflow the viewport. The visual sample's stacked mobile layout is a reference, not proof of full accessibility acceptance.

On narrow screens make the question brief collapsible after first reading, with its title/position and an explicit "Show question" action retained. Do not hide the problem while a student is trying to understand it. Keep Previous/Next in document flow. Avoid nested page scroll regions. Code may use an explicitly labeled local scroll area where necessary to preserve source formatting; do not shrink it illegibly to avoid scrolling.

Provide keyboard operation, visible focus, form labels, meaningful reading order, text alternatives for status, and live updates scoped to changed state. Use at least 44px touch targets. Do not rely on drag, hover, animation or color. Verify at 200% zoom, 320/768/1024/1440px and both appearances; record actual checks and limitations. Respect reduced motion and browser text sizing.

State coverage for every implemented slice: loading; empty/no membership/no submissions; expired session/denied access; save pending/failure/conflict; no released feedback; AI disabled/unavailable; network loss; stale/mismatched version; action pending/error/success. Empty feedback invites continued work or waiting for instructor release, never reveals an unreleased draft. Loading placeholders do not imply saved/released content.

## Implementation and review discipline — UI-01, UI-08

1. A UI change names this design revision and applicable UI IDs in its proposal/design/tasks and PR. Scope role files to their human owners and agree shared components before edits.
2. Derive theme tokens and shared components from this document in an authorized implementation slice. Reuse them across roles. Darryl owns shared sign-in/account/session work; Keith owns course/object authorization and student features. An ownership/design update does not implement or authorize a broader feature slice.
3. Attach a completed [UI review](../../workflow/templates/ui-review.md), representative desktop/narrow screenshots and keyboard/state verification under `workflow/evidence/<change>/`. Include light/dark evidence where the slice introduces a themed surface.
4. Reviewers return unexplained departures to the owner. Mark unavailable states/checks unverified; do not mark feature tasks complete from screenshots or mocks alone.
5. Run `npm run check` plus the slice's appropriate authorization, state and accessibility checks. OpenSpec validation validates the specification structure, not pixel fidelity or live authentication. PR template/checklists require human review; no automatic screenshot gate or branch-protection change is claimed here.

The design direction is selected and the shared visual foundation is implemented; role/service integration remains future work. Provider choice, dual-role projection, published navigation contracts, deadline equality/resubmissions, source limits and retention remain governed by [PlanningDecisions.md](../PlanningDecisions.md) and [IntegrationContracts.md](../../workflow/IntegrationContracts.md). See [foundation review](../../workflow/evidence/warm-workbook-ui/foundation/review.md) for the verified slice and limitations.
