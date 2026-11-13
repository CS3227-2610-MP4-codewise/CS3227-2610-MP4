# Handoff: Cloudflare variable persistence

- Human owner: Darryl.
- Agent role / model / configuration: /root, Codex; sole writer, no child agents.
- Requirement IDs and OpenSpec change: OPS-01/OPS-02, codewise-mvp deployment-and-operations; repair of existing configuration.
- Input commit/artifact versions: main 4e65c32.
- Owned files (exclusive write ownership): wrangler.json, workflow/scripts/deployment.test.mjs, logs/darryl/31-cloudflare-variable-persistence.md, this handoff.
- Relevant context supplied / retrieved: repository instructions, ownership/contracts, release generator/workflow, installed Wrangler schema and Cloudflare documentation.
- Changes and decisions: top-level keep_vars=true retains dashboard-managed variables during normal releases. Existing deployment check asserts both environment configurations retain the flag. Explicit vars still control APP_ENV/APP_VERSION. Dashboard-managed configuration remains environment-specific and must be maintained by operators.
- Verification commands and actual results: node --test workflow/scripts/deployment.test.mjs PASS (4/4); npm run check attempted (strict specs 20/20, typecheck and lint PASS; full test suite interrupted after unrelated five-second student work pagination timeout, including two-worker unsandboxed attempt); npm run build PASS with chunk-size warning; targeted Prettier and git diff --check PASS. Initial sandbox retries also hit Vitest cache EPERM. No complete full-suite pass claimed.
- Security findings / unresolved defects: no secrets added; no provider activation or quota changes. The flag retains all dashboard-managed plain variables, including operator activation settings. Already-deleted values are not restored by this change.
- Resource measurements (or unavailable): unavailable; see per-prompt log.
- Follow-up timeout diagnosis: isolated pagination test PASS with 30-second timeout (1 passed, 46 skipped); no full-suite pass inferred.
- Blockers and next action: normal GitHub Actions staging/reviewed production workflow; restore missing dashboard configuration once if needed.
- Next owner: Darryl.
- Independent review outcome (accept / return with findings): not performed; bounded repair requested directly, no independent-review claim.
