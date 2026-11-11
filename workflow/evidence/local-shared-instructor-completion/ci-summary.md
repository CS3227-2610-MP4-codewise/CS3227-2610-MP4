# Redacted CI checkpoint - PR27

## Final source checkpoint

Final code source: `6a277026df23c6097733bed13b2762900e177e81`, after the UI-03 arrival/focus continuation. [Checks job130650155849](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/actions/runs/43057323069/job/130650155849) failed with **501pass/3fail, 42files pass/1fail, 504tests/43files**. The3failures are exactly the same two Student-radio assertions and session-response-count fixture below; no additional failure. [Secrets job130650156338](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/actions/runs/43057323069/job/130650156338) passed. Read-only retrieved/redacted on2026-11-12 Asia/Singapore. Later documentation-only commits may have their own CI head; this evidence is explicitly for the final code revision and not a claim of green PR checks.

## Initial publication checkpoint

Source revision: `fe8f49b7f74db248344fe40ba47e8d99ef9334f6`, initial scoped publication before the arrival/focus continuation. Workflow run43054941837; [checks job130641759975](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/actions/runs/43054941837/job/130641759975), [secrets job130641759452](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/actions/runs/43054941837/job/130641759452). Logs retrieved read-only through GitHub's connector on2026-11-12 Asia/Singapore. This is a summary; no raw workflow logs/private source or credentials exported.

- `secrets`: success.
- `checks`: failure. Strict specs16/16, typecheck and repository lint passed in the committed snapshot (unrelated local untracked demo evidence was excluded). Vitest: **497 pass/3 fail, 42 files pass/1 file fail, 500 tests/43 files**.
- All3 failing assertions are in unchanged `src/web/student/StudentWorkspace.dom.test.ts`: first dual-role course display expects Student radio; dirty-cancel test queries Student/Instructor radios; account-menu network/signout test queues responses for the previous number of session readers. Independent source review and local checks identified these same consumer-test compatibility issues. [Focused Keith packet](../../handoffs/shared-shell-recovery.md) supplies exact adjustments; no silent skip or assertion weakening.
- Test failure stops the chained command before Node deployment tests and build. Their local passes are recorded separately; do not infer CI build success.
- CI suites outside that one student file passed on this exact revision, including the D1/Worker harnesses that were locally loopback-EACCES blocked. This does not make the local checks pass, establish hosted/provider behavior or verify the later continuation source automatically.
- Later commits trigger their own checks. PR27 remains draft pending source-specific consumer alignment and native/manual acceptance; no merge or deployment.
