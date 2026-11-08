# Design

Use a reorderable question list with native drag/drop and equivalent keyboard controls, preserving question IDs, current selection and unsaved drafts. Stack the list on narrow layouts. Keep published views read-only.

New rubric criteria retain the existing minimum of zero; do not rewrite existing nonzero minimums or historical publications. Display an existing nonzero minimum when relevant.

Use a maintained Python tokenizer with escaped output, a native textarea and stylesheet-only synchronized source overlay compatible with the app Content Security Policy. Never execute code. Retain selectable source and keyboard editing, readable colors in both appearances and safe empty/error states.

The existing instruction field and student projection are plain text. Rich formatting requires an explicit versioned serialization, safe rendering, legacy behavior and coordinated student consumer rollout; do not silently insert HTML or Markdown into an unversioned plain-text contract. That independently valuable feature is pending.
