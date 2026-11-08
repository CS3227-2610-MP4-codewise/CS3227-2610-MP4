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
