# Instructor authoring UI review

- Owner: Darryl. Design: warm-workbook-v1. Requirements: IAS-02/03/06, UI-01/04/05/07/08.
- Source: working tree on `codex/instructor-authoring-ux`; manual and independent review pending.
- Question navigation: native drag/drop and labelled keyboard move controls implemented; automated reorder tests pass. Pointer, keyboard focus/announcement and narrow layout remain unverified in a browser.
- Rubric: new items default to zero minimum; existing nonzero values are displayed and preserved. Browser workflow and older publication checks pending.
- Python: Prism tokenizer escapes source; regression test checks HTML-like source is escaped. Stylesheet-only editing overlay avoids requiring CSP inline styles. Browser scroll/selection, light/dark contrast, zoom and screen-reader behavior remain unverified. Code is not executed.
- Follow-up: removed separate reorder arrow buttons in favor of a visible grip, native drag/drop and keyboard Space/arrow/Space interaction. Python overlay now forces matching code/textarea font size, weight, style, letter spacing and tab size; comments, functions and other tokens have distinct colors. Focused tokenizer and reorder tests pass; actual browser pointer, cursor alignment and appearance checks remain pending.
- Follow-up full `npm run check` with two test workers passed strict validation of 13 changes, typecheck, lint, 356 Vitest tests, four deployment checks and build. Manual visual review remains pending.
- Rich text: not implemented; separate `formatted-assignment-instructions` change tracks the versioned shared contract and student-consumer rollout.
- Synthetic and automated checks do not establish real student integration, hosted deployment or manual acceptance.
- `npm run check` with `VITEST_MAX_WORKERS=2` passed strict validation of 12 changes, typecheck, lint, 356 Vitest tests, four deployment checks and build. The separate formatting proposal was validated independently after creation. Production dependency audit found zero advisories; npm reported seven moderate development advisories.
