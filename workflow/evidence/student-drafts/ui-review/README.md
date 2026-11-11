# Reproduce the variant B UI review

From the repository root, run:

```sh
npx vite --config workflow/evidence/student-drafts/ui-review/run/harness/vite.config.mjs
```

Open `http://127.0.0.1:5188/review.html`. Query parameters `width`, `theme` and `state` select a repeatable scenario. Example: `?width=320&theme=light&state=conflict-fallback`.

This loopback helper imports the current checkout's real Workbook, styles and Prism editor. It stubs session/student responses in memory, clears its own synthetic backup at load, and uses synthetic source only. It is excluded from the product entry point. It does not test real authentication, authorization, D1, CSP or deployment. The local Vite middleware writes geometry/contrast snapshots beneath this evidence directory; refreshes overwrite the same scenario/status snapshot. The code comes from the earlier B editor-gate helper, extended for this review.

- `editor`: acknowledged revision 3. Edit to see Unsaved → acknowledged.
- `starter`: revision 0, not saved yet.
- `saving`: PUT acknowledgement held until Release pending acknowledgement is activated. Edit through the native textarea first. Release once per outstanding PUT when testing races.
- `failed`, `session`, `denied`, `invalid`: inject 503 / 401 / 404 / 400 on save. Edit first. The actual client validates >32 KiB before sending; paste synthetic oversized text to exercise that state.
- `conflict-save`: inject a revision conflict with server revision 4 after editing.
- `conflict`: seed a differing per-tab backup, showing reload recovery.
- `conflict-fallback`: same recovery with a synthetic rejected clipboard operation, exercising the product's manual-copy fallback.
- `newer` and `review`: inherited editor-gate preview scenarios; these do not implement complete submission/movement APIs and were not accepted as integration evidence.

For actual 200% browser zoom, open `/index.html?theme=light&state=editor` directly, use browser zoom to 200%, then repeat in dark. The observed full-page effective viewport was 731 CSS px. For reduced motion, use DevTools Rendering → Emulate CSS media feature prefers-reduced-motion → reduce, keep DevTools open, and confirm `motion: true` in the measurements. Restore No emulation afterward.

Use the native browser UI for interactions. Measurements observe DOM/computed CSS; no product controller is directly manipulated. Every screenshot is a native browser capture, not a reconstructed image. See the completed [review](../ui-review.md), [screenshot inventory](screenshots.md) and [contrast](contrast.md). No product fix or human acceptance is implied.
