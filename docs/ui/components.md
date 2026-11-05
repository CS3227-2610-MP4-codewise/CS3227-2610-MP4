# Shared visual foundations

Implements the first shared presentation slice of `warm-workbook-v1` (UI-01/UI-07/UI-08). The production app remains a foundation screen; login and role workspaces require their producer contracts. Role-specific feature ownership is unchanged.

## Theme and layout

Import `src/web/styles.css` once. Use the `--cw-*` semantic tokens; do not duplicate hex colors in role components. Default appearance follows the system. `.cw-shell`, `.cw-header`, `.cw-workbook`, `.cw-workbook-brief` and `.cw-workbook-work` provide the shared page geometry. The continuous sheet stacks at 720px. Editorial headings use Georgia; UI text uses Segoe UI/Arial; source uses Consolas/Courier New. All stacks have local fallbacks.

The root uses `font-size: 100%` so rem-based typography inherits the browser's default text size. Do not replace it with a fixed pixel root. The specimen's text scaling is relative to that default; selecting Browser default removes its inline font-size override. A doubled-text specimen is not evidence that browser font preferences are honored; verify that independently.

Use the light `rule` token for decorative dividers, not as the only identifiable boundary of a form input. Focus uses the higher-contrast accent; action boundaries use ink. Inputs in future features need the same explicit boundary/contrast review. See [measured contrast](../../workflow/evidence/warm-workbook-ui/foundation/contrast.md).

## Controlled presentation components

Import from `src/web/ui/primitives.tsx`.

- `Action`: native button, `type="button"` by default; primary/secondary style; `pending` disables it and exposes busy state. Pass clear pending children. Only use `type="submit"` deliberately inside a real form. The caller owns authorization, mutation, duplicate-request protection, errors and acknowledged completion.
- `StatusMessage`: live status text with neutral/success/error presentation. Supply an explicit human-readable message; tone is never the only indicator. A success style does not verify a save or release. Do not label a revision saved until its acknowledgement is current.
- `QuestionNavigation`: zero-based `index`, positive `count`, `onPrevious`, `onNext`, optional `pending` and `finalLabel`. Invalid positions fail rather than producing misleading controls. Previous is disabled at zero; pending disables both actions. Final label is Review assignment, or Attempt summary for a historical flow. Native button semantics prevent accidental form submission. Consumers must guard saves, pin version/attempt context, open the correct review, announce context and focus the destination heading. This control performs no fetch, save, submission or authorization.

No role switch or identity projection is implemented by these primitives. No real assignment navigation is wired in the public app. Keith and Darryl review controlled props and behavior before their dependent feature integration.

## Local development specimen

Run `npm run dev:web`, then open `/workflow/ui-preview.html`. It imports the same controls/styles and supplies synthetic local callbacks, light/dark selection, 200% text stress, pending state and first/middle/final navigation. Native Vite production build has only the existing index entry; this helper and its synthetic callbacks are not built into deployed assets. Never link it from the product or use it as proof of real authentication, saving or assessment.

The preview is for development only. Check [foundation review](../../workflow/evidence/warm-workbook-ui/foundation/review.md) for exact test coverage, screenshots and limitations. Native browser zoom could not be changed through the in-app keyboard shortcut; the recorded 200% reflow test instead used a 512-CSS-pixel viewport at device scale 2 (1024 physical pixels), supplemented by doubled text at 320px. This is disclosed emulation, not a claim of native browser zoom or a complete accessibility audit.
