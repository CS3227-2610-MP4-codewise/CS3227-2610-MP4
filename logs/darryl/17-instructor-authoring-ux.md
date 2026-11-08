# Instructor authoring UX refinement

Owner: Darryl. Requirements: IAS-02/03/06, UI-01/04/05/07/08; warm-workbook-v1. Branch: `codex/instructor-authoring-ux`.

## Prompt IUX-01 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt (redacted):** Commit existing work, then improve question reordering, formatting, point bounds and Python syntax coloring in instructor authoring.

### Agents spawned

- None; main agent handles the focused instructor UI and serializes shared contract decisions. No parallel editing was requested.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.
- Reconciled main record `turn-bb6e480ca8f0b01a9b4b1f6d`: input 21323909, cached input subset 21296768, output 19899, total 21343808. Cached input is already included in input. No child agents.

### Experiment outcome

- Committed existing measured evaluation as `e61f28f` and separate existing prompt history as `17a31e7` on the feature branch. Evaluation still has pending instructor/model evidence.
- Inspecting the existing authoring and published-instruction contracts. Real student integration and historical minimum-point values must be preserved; no live operations.
- Added a draggable question panel with keyboard move controls, preserved selected question identities, hid the default-zero minimum input while retaining existing nonzero minimums, and added escaped Prism Python highlighting with stylesheet-only editor overlay. Focused tests passed 10 cases; typecheck and lint passed before final edits. Production-only dependency audit reported zero advisories; the overall npm install reported seven moderate development advisories.
- Rich instruction formatting is a separate substantial feature: current shared authoring/publication contracts are unversioned plain text and Keith's student consumer is not implemented. Created a separate OpenSpec change rather than silently publishing markup through the existing contract. Rich editor and student rendering are not implemented.
- Browser, drag/keyboard and appearance verification remain pending; full check in progress. The maintained highlighter itself is straightforward, while editable overlay, contrast, accessibility and cross-consumer formatting require careful verification.
- `npm run check` with `VITEST_MAX_WORKERS=2` passed 356 Vitest tests, four deployment tests, strict validation of 12 changes, typecheck, lint and build. The separate formatting proposal was created during that run and subsequently validated independently. No browser acceptance is claimed.

## Prompt IUX-02 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt (redacted):** Use a conventional reorder handle without up/down arrow buttons, correct Python syntax colors and fix cursor alignment.

### Agents spawned

- None; the main agent inspected and repaired the existing instructor authoring UI and syntax styles. No shared contracts or parallel work were needed.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.
- Current main record `turn-2c135ee04fc0127f8e4f944b`: provisional input 8027483, cached subset 8018688, output 6214, total 8033697; later calls and final response excluded. No child agents. Cached input is not additive.

### Experiment outcome

- Replaced arrow buttons with a drag handle and keyboard pick/move/drop support. Corrected code overlay typography: the global `code` font size differed from the textarea, and bold/italic token styles could change glyph metrics. Added distinct comment, keyword, string, number, function and builtin colors without changing font weight/style.
- Browser-based pointer, keyboard, light/dark and cursor verification remains pending; automated checks follow.
- Full `npm run check` with `VITEST_MAX_WORKERS=2` passed: strict validation of 13 changes, typecheck, lint, 356 Vitest tests, four deployment tests and build. The focused authoring/highlighting suite passed 10 tests. No browser acceptance was inferred.

## Prompt IUX-03 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt:** Commit changes in suitable increments; instruction text still lacks typical formatting.

### Agents spawned

- None; main agent is handling the requested commits and inspecting the existing shared instruction contract before implementation.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- Committed the prior instructor UI and Python highlighting group as `3266ab0`; committing its planning and evidence separately. Beginning the previously deferred formatted-instruction work; existing plain-text publications and student contract compatibility remain requirements.
- Planning and evidence committed separately as `8056c14`. Inspected the strict v1 publication schema and immutable question snapshot path; documented a proposed versioned rich document plus unchanged plaintext fallback. No formatting editor or persistence changes are claimed yet.
- Strict OpenSpec validation of the formatting change passed. Rich editor, durable versioned persistence, instructor/student rendering, consumer review and end-to-end verification remain unfinished; no markup is being inserted into the existing plain-text publication field.

## Prompt IUX-04 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt (redacted):** The supplied Write/Preview example shows the desired formatting controls; the previous work did not implement text styling.

### Agents spawned

- None; main agent implemented the explicitly requested Markdown authoring toolbar and sanitized preview in the instructor UI.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- Added Write/Preview controls and formatting actions to the instructor editor. Markdown source is stored in the existing plain-text field; the preview is sanitized. Student-side formatted rendering and a versioned rich publication contract remain unimplemented and are disclosed in the editor. Existing plain text is not rewritten on load. No student feature, live provider or deployment was changed.

## Prompt IUX-05 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt (redacted):** The instruction toolbar looks cluttered; use a conventional layout.

### Agents spawned

- None; the main agent inspected the toolbar layout. The turn was interrupted before a change was completed.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- The screenshot showed the toolbar wrapping into multiple tall rows in a narrow column; the following prompt clarified the preferred compact-symbol direction.

## Prompt IUX-06 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt:** Use the compact symbols from the supplied example.

### Agents spawned

- None; the main agent is refining the existing instructor-only toolbar presentation.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- Replaced wordy formatting buttons with compact labelled symbols and removed toolbar wrapping. Horizontal scrolling retains access to all controls in narrow layouts. Safe preview and the explicit student-rendering limitation are retained; visual review is pending.
- Focused formatting/sanitization tests passed (2), typecheck and lint passed, and production build passed. Markdown preview is lazy-loaded as a separate chunk. Browser layout and the full project suite after this final UI change remain unverified.

## Prompt IUX-07 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt:** Put Write/Preview on a separate row and keep the formatting symbols together.

### Agents spawned

- None; main agent is applying a focused layout adjustment to the existing toolbar.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- Moved Write/Preview into a separate row and retained the compact symbols in a non-wrapping, horizontally scrollable row. Existing formatting behavior is unchanged. Browser and manual acceptance remain pending.
- Focused formatting tests passed (2); typecheck and lint passed. A full check was started before the final row adjustment, so its output must not be treated as a clean final-snapshot verification without noting the timing.
- The overlapping `npm run check` with `VITEST_MAX_WORKERS=2` completed with 359 Vitest tests, four deployment checks, spec validation, typecheck, lint and build passing. It started before the row adjustment; final-snapshot focused formatting tests, typecheck and lint also passed independently. Browser review remains pending.

## Prompt IUX-08 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt:** Formatting buttons do nothing, the link icon is incorrect, and Python highlighting misses calls such as `math.floor`.

### Agents spawned

- None; main agent is reproducing and repairing the authoring UI and Python tokenizer.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- A browser-like interaction test reproduced the toolbar defect: the textarea ref was not attached, so formatting handlers returned without acting. The ref was attached, a chain-link icon added, and Python call/receiver tokens added without executing source. Verification remains in progress.
- After repair, 15 focused tests passed across browser-like interaction, formatting/sanitization and Python tokenization. Each formatting button and link handling was exercised; `math.floor`, ordinary calls, comments and strings were tested. Typecheck and lint passed. Actual browser interaction and student formatted rendering remain pending.
- Added a click-to-Preview interaction test: 11 toolbar interaction tests passed, including applying bold and seeing a strong element in the preview. The Python coloring recognizes call syntax and does not resolve runtime imports or execute code. Full project check is running.
- Full `npm run check` with `VITEST_MAX_WORKERS=2` passed: 371 Vitest tests, four deployment tests, strict validation of 13 changes, typecheck, lint and build. The click-to-Preview assertion was added while the suite was running and passed separately afterward. Actual browser acceptance remains pending.

## Prompt IUX-09 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt (redacted):** Insert empty formatting markers with the caret inside; fix oversized checklist controls; use `[](url)` for links and preserve tabs and newlines in monospaced code.

### Agents spawned

- None; the main agent handled the bounded editor and preview fixes directly.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- Removed placeholder text and the link prompt, added fenced multiline code preserving indentation, and overrode inherited form sizing for checklist preview controls. Added focused automated checks for empty selections, checklist output and multiline whitespace. Browser visual acceptance remains pending; student-side formatted rendering is not integrated.
- Final focused editor tests passed (17). Full `npm run check` passed strict validation of 13 changes, typecheck, lint, 375 Vitest tests, four deployment tests and production build.

## Prompt IUX-10 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt (redacted):** Improve the rough, cluttered instruction editor and preview shown in the supplied screenshots.

### Agents spawned

- None; the main agent handled this focused instructor UI refinement.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- Refined the warm-workbook-v1 editor with an underlined active tab, compact wrapping formatting controls, consistent surface and padding, and an inset whitespace-preserving code preview. Local browser access is disabled in Work settings, so visual and manual accessibility acceptance remains pending. UI-01/04/07/08 apply. `npm run check` passed 375 Vitest tests, four deployment tests, strict spec validation, typecheck, lint and build.

## Prompt IUX-11 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt (redacted):** Preview collapses line breaks entered in the instruction editor, including a checklist example.

### Agents spawned

- None; the main agent fixed the preview whitespace behavior directly.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- Applied newline-preserving text rendering to preview paragraphs and list items, retaining the existing separate code-block whitespace treatment. Focused preview and editor tests passed (18). Manual browser confirmation remains pending because local browser access is disabled in Work settings; student-side formatted rendering is still unintegrated.

## Prompt IUX-12 — 2026-11-08 Asia/Singapore (time unavailable)

**Prompt:** Commit the changes in increments, push and create the PR.

### Agents spawned

- None; the main agent is preparing the existing branch, commits and pull request.

### Token count

- Main usage unavailable at this checkpoint; recorder reconciliation pending. No child usage for this prompt.

### Experiment outcome

- Preparing separate Python highlighting and formatted-instruction increments. The latest full project check passed 375 tests and four deployment tests before the small preview newline change; afterward 18 focused tests, typecheck and lint passed. Visual browser review and student-side formatted rendering remain pending.
- Committed Python highlighting as `57ce938` and formatted-instruction work as `436a6d5`, pushed `codex/instructor-authoring-ux`, and opened draft PR [#22](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/22). The existing untracked `.worktrees/` directories were excluded.
