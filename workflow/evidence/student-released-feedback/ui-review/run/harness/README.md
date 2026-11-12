# Synthetic released-feedback review harness

Run from the repository root:

```sh
npx vite --config workflow/evidence/student-released-feedback/ui-review/run/harness/vite.config.mjs
```

Open <http://127.0.0.1:5189/review.html>. Choose width 320/768/1024/1440, light/dark and a state. Direct panel URLs use `index.html?state=released&theme=light`. In `replaced` and `withdrawn-historical`, select Version 1 after loading. In `withdrawn-current`, Version 2 defaults to its tombstone; Version 1 is readable as replaced. In `stale`, Load feedback again returns the current release.

States: loading, none, released, released-noannotations, replaced, withdrawn-historical, withdrawn-current, unmatched, stale, expired, network, unavailable, history.

This is a loopback, synthetic-API review aid rendering the real AttemptsPanel through workApi(fakeFetch). It does **not** test authentication, authorization, D1, the composed C-REL producer, provider access, deployment or integration acceptance. No submitted Python is executed. Sources are synthetic, LF-terminated and SHA-256 hashed with crypto.subtle; publication, attempt, summary, version and history bodies pass the real schema parsers. Internal synthetic sentinel fields are intentionally excluded from API responses. Styles include the same shared/student/workbook styles used by Workbook, without feedback-specific overrides. The surrounding main uses the workbook/student classes; this isolates the attempts panel rather than recreating the full application shell/question pane.

The server binds 127.0.0.1:5189 with strictPort and allows imports from the repo root. Generated Vite cache stays under run/node_modules (ignored by the existing repository rules). No report-writing middleware is exposed.

Automated evidence uses Edge 157 via loopback CDP and `../measure.mjs`. It requires an isolated browser already listening on 127.0.0.1:9229; then run:

```sh
node workflow/evidence/student-released-feedback/ui-review/run/measure.mjs
```

Screenshots are actual browser PNG captures. Measurements are CSS pixels at 100% browser zoom; device metrics emulation is **not** real browser zoom. All assertions and their coverage appear in ../../metrics-summary.md. Human keyboard, VoiceOver, 200% zoom and final acceptance remain Keith's work. Task 4.4 is not checked by this review.
