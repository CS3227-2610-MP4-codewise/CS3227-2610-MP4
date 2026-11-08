# Proposal

## Why

Instructors need a clearer way to navigate and reorder questions, set rubric points and read Python source while authoring assignments.

## What Changes

- Put question selection, drag reordering and add action in a side panel with keyboard reorder controls.
- Default new rubric minimums to zero and preserve existing nonzero values.
- Color Python syntax in editable and published code without executing it.
- Track rich instruction formatting as an outstanding versioned shared-content integration; the existing instructions contract is plain text.

## Capabilities

### New Capabilities

- `instructor-authoring-usability`: Accessible question navigation, rubric presentation and Python highlighting.

### Modified Capabilities

None; publication and authorization contracts remain unchanged.

## Impact

Instructor authoring UI and Python syntax highlighting dependency. UI-01/04/05/07/08 and `docs/ui/design.md` warm-workbook-v1 apply. Existing published content and nonzero bounds remain intact. Student-facing rich formatting needs a separately specified compatible content format and Keith's consumer review; do not treat markup as already supported by the plain-text contract.
