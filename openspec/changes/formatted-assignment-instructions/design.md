# Design

Define an explicit versioned data format and allowlisted rendering model before implementation. Preserve the exact meaning of all existing plain-text records and immutable publications. Serialize shared DTO/schema changes with a named writer, provide a backwards-compatible rollout and coordinate Keith's student consumer. Reject unsafe links, script, event handlers and unsupported markup; do not rely on browser-side sanitization alone.

The editor needs keyboard-operable bold, underline, inline code and quotation controls, clear focus and undo/redo, with a safe plain-text fallback. Verify persistence, publication, version history, student rendering, narrow layouts and both appearances. No code execution or production deployment is implied.

## Proposed compatibility boundary (not implemented)

- Retain `instructions` as the authoritative plain-text projection for existing consumers. Store a separate versioned rich document with immutable question versions, whose text content must exactly match that projection. Old drafts and publications have no rich document and continue to render as plain text.
- Represent only a bounded tree of text, paragraphs, quotations, and explicit bold/underline/code marks. Validate the shape, depth, size, allowed marks and text equivalence on the server. Disallow arbitrary HTML, scripts, embedded content and unreviewed links. Render through escaped UI components rather than injecting user HTML.
- Expose rich content only through an explicitly versioned or negotiated public projection; do not add an unknown field to the existing strict v1 response. Keep the v1 plaintext projection stable. Coordinate the new contract and student rendering with Keith before calling the feature complete.
- The editor must not offer formatting that disappears during save or publication; show a safe explicit error if the richer representation cannot be persisted or returned. Migration and guarded snapshot writes must preserve prior version immutability and require local/integration tests before deployment.
