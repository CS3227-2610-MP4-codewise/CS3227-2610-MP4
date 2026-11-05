# Handoff: warm-workbook-ui shared foundations

- Human owner / sole current writer: Darryl, through the main assistant under the user's request to continue on 2026-11-05. No concurrent writer is assigned in this chat.
- Consumers: Darryl's instructor UI and Keith's student/identity UI. Keith's consumer review is pending; no agreement or contribution from him in this chat is invented.
- Scope: tasks 1.1–1.3, `warm-workbook-v1`, UI-01/UI-07/UI-08. Shared presentation only; no identity, student or instructor service implementation.
- Base: `e3862de`; branch `codex/warm-workbook-foundation`. Existing uncommitted design documents stay intact. No commit/push/deployment is authorized here.
- Exclusive application files for this window: `src/web/main.tsx`, `src/web/styles.css`, new `src/web/ui/primitives.tsx`, `src/web/ui/primitives.test.ts`.
- Development helper files: new `workflow/ui-preview.html`, `workflow/ui-preview.tsx`. The Vite production entry remains unchanged; the preview is not included in production assets.
- Tracking/evidence files: task completion updates in `openspec/changes/warm-workbook-ui/tasks.md`, `docs/ui/components.md`, `workflow/evidence/warm-workbook-ui/foundation/`, this handoff and the existing Darryl design increment log.
- Shared contracts: no transport/API/schema/migration/runtime CI edits. Presentation props are controlled by consumers; navigation callbacks cannot grant membership or create submissions themselves. Real role/data wiring remains gated by C-ID/C-PUB/C-SUB/C-REL.
- Verification: pending implementation; final results will be appended below. This entry records the write window before application edits and does not claim integration or review acceptance.
- Next owner: main assistant completes this bounded visual slice; Keith supplies identity/student handoffs for later tasks. Both consumers review shared controls before dependent integration.

## Implemented and verified

- Shared theme/layout, native Action, StatusMessage and controlled QuestionNavigation are implemented. The public foundation screen adopts the workbook identity and offers genuine in-page navigation/expandable foundation notes. No simulated login or role selector is exposed.
- Synthetic helper `/workflow/ui-preview.html` exercises first/middle/final navigation, focus, appearance and pending state. Component usage: [components.md](../../docs/ui/components.md). It does not implement student services or wire real source/history data.
- Typecheck/lint passed. Tests passed: 13 Vitest + 4 deployment cases. Build passed. Aggregate `npm run check` remains failed on the unrelated incomplete instructor-assignment-publication delta; no bypass or changes to that increment.
- Actual visual/keyboard/reflow checks, 7 screenshots and measured contrast: [foundation review](../evidence/warm-workbook-ui/foundation/review.md). Checked normal-text token pairs exceed 4.5:1 in both appearances. No full accessibility or runtime role acceptance claimed.
- Native Ctrl-plus zoom was ineffective in the in-app browser. Verified 200% equivalent layout using 512 CSS pixels at scale factor 2 plus doubled text at 320px; retained keyboard behavior. Consumer review remains pending.
- Next blocker: task 2.1 needs Keith's accepted C-ID provider/session/allowed-context handoff. Identity is not implemented by this shared visual work. No role feature task is marked complete. No archive, deployment, commit or push.
- Final source/build inspection: the production output contains only the normal `index.html` entry and no development-preview fixture strings; the helper's React entry is excluded. Temporary viewport/media emulation was reset after inspection. The local Vite preview is left available for user review.

## Publication authorization — 2026-11-06

The user subsequently authorized committing this bounded increment, pushing `codex/warm-workbook-foundation` and opening a PR to main. Earlier no-commit/push statements describe the previous stage. This authorization does not include merging or deploying. The unrelated untracked instructor-assignment-publication scaffold and ignored local skill are excluded.

Fresh verification on 2026-11-06: exported only staged files with `git checkout-index` to a temporary clean snapshot, reused the installed dependency directory and ran `npm run check` there. Exit 0: three OpenSpec changes valid, typecheck/lint passed, 13 Vitest tests and 4 deployment tests passed, and Vite build passed. The unrelated scaffold was absent because it is not staged. This supersedes the earlier aggregate failure for the files being committed; the original working tree's unrelated scaffold is preserved. Remote main still matched base `e3862de` at publication preparation. Hosted CI results are not yet known.
