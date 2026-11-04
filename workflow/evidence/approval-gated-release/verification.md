# Approval-gated release verification

Requirements: OPS-02, OPS-04. Branch: codex/approval-gated-release.

## Safety properties to verify

- Only main pushes enter the deployment workflow; PRs run credential-free CI.
- Production depends on successful staging, uses the production environment approval gate, and cannot run through the removed standalone dispatch workflow.
- Production selects this run's exact artifact/source. Wrong commit/run and superseded main fail before migrations.
- Production reviewer configuration must exist on GitHub; YAML naming an environment alone does not enforce approval.
- Whole-run serialization retains the staged version during review. No automatic cancellation of a waiting production deployment.

## Execution results

- Full npm run check passed: strict OpenSpec validation, TypeScript, ESLint, six application tests, four deployment/artifact/workflow safety tests, and the frontend production build.
- The workflow safety test parses the real YAML and checks the main-only trigger, CI/staging/production dependency chain, protected environment reference, exact same-run artifact selection, and verification-before-migration order.
- Artifact tests reject wrong/missing commit/run evidence and a changed main head.
- Read-only GitHub API verification confirmed production has one required reviewer and retains its custom deployment-branch restriction. No approval settings were weakened.
- Whitespace checks passed. No production workflow, database migration or deployment was started during branch preparation.

Online production approval behaviour can be observed only after a human merges this PR, staging succeeds, and the new run reaches the environment gate. Local tests and PR CI do not prove a completed production deployment.
