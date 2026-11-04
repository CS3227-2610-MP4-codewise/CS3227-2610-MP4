# 01 - Queue Production Approval After Staging - 4 November 2026

## Request

Darryl approved replacing manual run-ID production dispatch with the MP3-style experience: merge a PR, test stable staging, then use Review deployments / Approve and deploy in the same run. Owner: Darryl; branch: codex/approval-gated-release; requirements: OPS-02 and OPS-04. The agent is to publish a reviewable workflow change, not merge or approve production itself.

## Results

- Replaced two separately triggered workflows with one main-push release workflow containing CI, staging and a dependent production job. Removed the obsolete standalone production-dispatch file.
- Production uses the existing protected environment's required-reviewer gate. Staging's summary explains the native GitHub approval banner and includes its stable link. Production's success summary exposes its stable link.
- Preserved environment-specific database/secret configuration. Production consumes the same run's staged frontend artifact, checks commit/run provenance and current main head before migrations, and rejects superseded releases. Whole-run serialization keeps staging stable while approval is pending; approve, reject or cancel to release the slot.
- Updated deployment specs/design/tasks, documentation and meaningful workflow/artifact guard tests. YAML parsing is now an explicit development dependency. No application role feature or AI integration was changed.
- Verification: full npm run check passed strict specs, types, lint, ten tests (six application and four deployment/workflow checks) and frontend build. Read-only GitHub API verification confirmed the existing required production reviewer and deployment-branch restriction. Evidence is in workflow/evidence/approval-gated-release/verification.md. The new review branch will run PR CI; the live approval banner is not claimed exercised before merge. No production dispatch, approval, migration or merge is performed by this change preparation.
