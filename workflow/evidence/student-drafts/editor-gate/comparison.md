# Editor gate: three workbook variants (task 4.1, SW-04, SUB-02, UI-01/04/07)

Written by the Coordinator on 2026-11-10 from measured data only. Design revision: `warm-workbook-v1`. **Outcome (2026-11-10):** after running all three variants locally against the real student API with a real sign-in, Keith chose **variant B** for its overall look and because it adds no dependency. Only `keith/student-drafts-ui-b` (`31ab727`) is merged into `keith/student-drafts`; A and C stay unmerged.

Each variant implements tasks 5.1–5.3 in full, on its own branch based on the reviewed domain commit `defbd63`. A separate Sonnet 5.5 UI Implementer agent built each one. An Opus 5.5 Reviewer agent, read-only, reviewed all three, and each variant then had one repair round. The per-variant notes, run guides and screenshots are on each variant branch under `workflow/evidence/student-drafts/editor-gate/<a|b|c>/`.

## Variants

| | A: CodeMirror 6 | B: textarea + prismjs | C: Monaco 0.57.0 |
|---|---|---|---|
| Branch @ commit | `keith/student-drafts-ui-a` @ `9e89d94` | `keith/student-drafts-ui-b` @ `31ab727` | `keith/student-drafts-ui-c` @ `3ec770b` |
| Worktree | `.claude/worktrees/agent-ac08cb72471330e34` | `.claude/worktrees/agent-ab0c9394b1b3cfe58` | `.claude/worktrees/agent-a82596474e53c182f` |
| New dependencies | 6 direct packages, exact-pinned (+9 transitive) | none (prismjs 1.30.0 already used by instructor UI) | `monaco-editor` 0.57.0 (+`dompurify`, `marked` transitive) |
| `npm run check` (Coordinator rerun after repairs) | exit 0, 48 files / 591 tests | exit 0, 47 files / 597 tests | exit 0, 47 files / 585 tests |
| Editor chunk gzip | 125.45 kB (`CodeMirrorEditor`) | none separate; Prism already in main chunk | 776.53 kB JS + 18.25 kB CSS (`MonacoEditor`), worker ≈ 82.6 kB (agent-measured, `gzip -9`) |
| Workbook chunk gzip | 8.55 kB JS + 1.23 kB CSS | 14.79 kB JS + 2.08 kB CSS | 13.18 kB JS |
| Main chunk gzip (`defbd63` base: 221.03 kB, measured by Agent A) | 224.81 kB | 221.44 kB | 221.34 kB |
| Worker CSP (`style-src 'self'`) | works: the editor is mounted in a shadow root with adopted stylesheets, checked in headless Edge with the real headers | works: class-only Prism spans, 0 CSP violations in headless Edge with the real headers (repair round) | **broken**: 22 style violations, overlapping lines and no highlighting. Needs `'unsafe-inline'` styles or nonce support, which is a shared-infrastructure decision |
| Esc leaves the editor, Tab not trapped | yes (headless Edge and tests) | yes (tests; native textarea) | yes (headless Edge) |
| Python highlighting / line numbers | yes / yes | yes / yes (overlay and gutter) | yes / yes, but only with the CSP bypassed |
| Screen reader | CodeMirror accessibility tree; `aria-description` support varies | native textarea semantics; overlay `aria-hidden` | Monaco's accessibility mode relies on screen-reader detection; weak on mobile |
| URL position | 1-based | 1-based | 1-based (after repair) |
| Review findings after repair | 2 low fixed | 1 low-medium and 1 low fixed | 3 medium and 1 low fixed; **1 high (CSP) open** |

## Shared limits, not verified for any variant

- No real sign-in, live student API or D1 durability from a browser. All browser evidence used stubbed or injected APIs, because the Worker re-checks the Firebase user.
- No real screen reader, touch device or IME, and no Safari or Firefox. Contrast was not measured.
- The 320 px, 200% zoom and dark screenshots are partial and differ in method (see each variant's notes).
- The idempotency key does not survive a page reload. A retry after a reload, following a lost response, can create a second attempt. Attempts are unlimited, so this is acceptable, but it is recorded for the UI review (task 5.4).

## Decisions open for Keith

1. Which variant to merge (task 4.2), with dependency approval.
2. If C is chosen, whether to relax the Worker CSP to allow inline styles. This is a shared Darryl/Keith decision with security impact.
3. The per-user save and submit rate limit, which the domain Reviewer raised as medium and deferred as new scope.
