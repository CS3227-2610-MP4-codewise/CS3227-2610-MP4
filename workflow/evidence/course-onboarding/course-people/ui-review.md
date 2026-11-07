# UI review — Course People

- Design: warm-workbook-v1, UI-01/07/08. User requested People label instead of Students; docs/ui/design.md records this decision.
- Automated: isolated D1 tests cover active/pending/revoked/removed states and foreign-user denial. Full check result recorded in verification evidence.
- Manual desktop/narrow, keyboard, zoom, screen-reader and measured contrast: unverified. No screenshot or live UI acceptance claimed.
- Outcome: pending human UI acceptance. [Evidence](verification.md).

2026-11-08 follow-up: The creator is labelled Course coordinator from the trusted creation receipt. The self-remove action is omitted for that coordinator; server-side self-removal is denied atomically. Synthetic-preview recovery is isolated and does not affect staging/production. Focused tests passed; manual UI/accessibility review remains pending.
