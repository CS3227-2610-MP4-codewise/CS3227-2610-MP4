# Proposal

## Why

Instructors need styled question instructions, including bold, underline, inline code and quotations, without exposing unsafe markup or breaking existing assignments and student consumers.

## What Changes

- Introduce a bounded, versioned rich-instruction representation with an accessible instructor editor and safe student/instructor rendering.
- Preserve existing plain-text drafts and immutable publications and define fallback and compatibility for existing consumers.
- Coordinate the shared publication contract and Keith's student-facing consumer before claiming end-to-end support.

## Capabilities

### New Capabilities

- `formatted-assignment-instructions`: Versioned, safely rendered assignment instruction formatting.

### Modified Capabilities

None; existing draft specifications remain authoritative until the compatible contract is defined and reviewed.

## Impact

Instructor UI, shared publication and authoring contracts, persistence and student-facing consumers. Darryl owns the producer; Keith owns student rendering and reviews the shared boundary. UI-01/04/07/08 and warm-workbook-v1 apply. This is a separate substantial feature, not a claim that the current plain-text field supports formatting.
