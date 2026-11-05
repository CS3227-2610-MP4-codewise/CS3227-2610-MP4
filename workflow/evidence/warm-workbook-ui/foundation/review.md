# UI review: warm-workbook-ui shared foundation

- Human owner / current writer: Darryl, using the main assistant. Consumers: Darryl instructor and Keith student/identity; Keith review pending.
- Branch/base: `codex/warm-workbook-foundation` / `e3862de`; no commit/PR/push.
- Design: `docs/ui/design.md`, `warm-workbook-v1`; tasks 1.1–1.3, UI-01/UI-07/UI-08. Native navigation boundaries also checked against UI-05.
- Review mode: main-agent self-review and local browser inspection; no independent reviewer or human runtime acceptance claimed.
- Write window: [handoff](../../../handoffs/warm-workbook-foundation.md).

| Area                        | Outcome and evidence                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity / tokens           | Pass for foundation: shared warm light/dark tokens, serif headings, proportional UI and monospaced source specimen; no new fonts/framework                                                                                                                                                                                                                                                      |
| Appearance                  | Desktop 1024px and narrow 320px captured in both appearances; screenshots below; [contrast](contrast.md) ranges from 5.14:1 to 13.22:1 for checked normal text pairs                                                                                                                                                                                                                            |
| Responsive                  | Observed root body scroll width 320px at 320px; shared specimen 305px/307px at 320px, including doubled text; narrow panes stack and controls remain available                                                                                                                                                                                                                                  |
| Keyboard                    | Space expands foundation notes; Space on Next moves from question 1 to 2 and focuses the heading with a visible solid outline; Previous and final review also operated; pending specimen disables both navigation controls and the pending secondary action                                                                                                                                     |
| First/final boundaries      | First Previous disabled; final Next becomes Review assignment; review shows synthetic-only result with no attempt creation. Tests also cover single-question review and historical Attempt summary                                                                                                                                                                                              |
| Zoom / text sizing          | Pass for disclosed emulation: viewport 512 CSS pixels/device scale 2 gives 1024 physical pixels, retaining source/status/actions; all observed button targets 44px. Keyboard Previous operated in this reflow state. Additionally doubled text at 320px without page overflow. Native in-app Ctrl-plus had no effect; native browser zoom and external screen-reader behavior remain unverified |
| Honest status               | Real public foundation states features are unavailable; local helper explicitly labels status/action specimens and no connected mutations. Styling does not imply acknowledged save                                                                                                                                                                                                             |
| Login / actual role switch  | Not applicable to foundation implementation; blocked pending accepted C-ID provider/context handoff, not marked complete                                                                                                                                                                                                                                                                        |
| Real drafts/history/release | Not applicable to foundation implementation; producer services absent, not integration-tested                                                                                                                                                                                                                                                                                                   |
| Privacy/API boundary        | No feature routes, source execution, credentials, storage or private learner fixtures added. Existing server boundary tests passed                                                                                                                                                                                                                                                              |
| Full product acceptance     | Pending; no sign-in, student/instructor workflow, AI, deployment, screen-reader audit or 768/1440px full-flow acceptance claimed                                                                                                                                                                                                                                                                |

## Screenshots

- [Desktop light](foundation-desktop-light.jpg)
- [Desktop dark](foundation-desktop-dark.jpg)
- [Narrow light](foundation-narrow-light.jpg)
- [Narrow dark](foundation-narrow-dark.jpg)
- [200% equivalent reflow specimen](controls-200-percent-reflow.jpg)
- [Narrow controls, light](controls-narrow-light.jpg)
- [Doubled text, narrow dark](controls-narrow-dark-double-text.jpg)

Desktop/narrow light images and the initial desktop dark image were visually inspected. Layout measurements and accessible state were inspected for the other captured combinations; they are not independent accessibility certification.

## Checks actually run

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 13 Vitest cases (7 new boundary cases) and 4 deployment cases.
- `npm run build`: passed; normal production index entry. Development helper exclusion is verified separately in final handoff evidence.
- `npm run check`: failed in existing `instructor-assignment-publication` delta validation; the other three changes passed. The separate stages above were executed despite the aggregate failure. Unrelated change not modified.
- Targeted formatting passed. Build/test needed previously established permitted filesystem access for config loading.

No intentional visual-contract departure. Native zoom limitation is disclosed rather than reported as a native zoom pass. Review outcome: foundation self-checks complete; consumer/human acceptance and all dependent feature work pending.

## Publication verification — 2026-11-06

`npm run check` passed (exit 0) in a clean copy of the staged files: 3/3 OpenSpec changes, typecheck, lint, 13 Vitest tests, 4 deployment tests and Vite build. The earlier aggregate failure came from an unrelated untracked instructor-assignment-publication scaffold, which is excluded from the commit and was left untouched. The clean snapshot reused the installed dependencies; it was not a fresh `npm ci` or a hosted CI run. Runtime screenshots and limitations above are unchanged.
