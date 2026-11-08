# Proposal

## Why

Instructors need a private, evidence-grounded starting point for assessment without losing their own work or releasing unreviewed grades.

## What Changes

- Generate bounded drafts using pinned submission and publication evidence through the server-only gateway, optionally including authorized private references.
- Persist provenance and require explicit adoption, approval and release; reject invalid output wholly.
- Extend the instructor workbook with accessible pending, review, error and retry states.

## Capabilities

### New Capabilities

- `instructor-ai-assessment`: Private validated AI candidates and explicit instructor adoption.

### Modified Capabilities

None. Existing draft assessment and AI requirements remain authoritative.

## Impact

Darryl owns the instructor assessment service, workbook and bounded shared C-AI changes. UI follows `docs/ui/design.md` warm-workbook-v1 and UI-01/04/06/07/08. Keith owns real submission integration and reviews the shared boundary. Synthetic verification does not establish real submission integration or provider activation. Live calls remain disabled until their separate activation gates are satisfied.
