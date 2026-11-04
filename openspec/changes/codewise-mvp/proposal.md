# Codewise MVP proposal

## Why

Students need a simple place to write programming solutions and understand reviewed feedback. Instructors need rubric-aligned assessment assistance without surrendering final grading control. The project must demonstrate spec-driven, coordinated multi-agent development, AI security, environment separation, context engineering, and measured resource use.

Status: DRAFT. This proposal makes implementation choices reviewable; it does not claim team approval or completed features.

## What Changes

- Introduce course-scoped student and instructor accounts.
- Provide a two-panel question/editor workspace, durable draft saving, immutable submissions, and released assessment history.
- Generate instructor-only rubric scores and line annotations with SoCLaaS; require human approval before release.
- Generate student progress explanations grounded in released assessments and comparable criterion identifiers.
- Add server-side AI quotas, context selection, output validation, and audit records.
- Define development agent coordination, security checks, deployment gates, evaluation, and required submission evidence.

### Working assumptions

- Confirmed: two team members and two roles. Darryl owns instructor features; Keith owns student features. Both contribute to shared engineering work.
- Python only, one text source file per question; syntax highlighting does not imply execution.
- Assignments may contain multiple questions; all questions are submitted atomically as an assignment attempt.
- No code execution, automatic test grading, live tutoring, textbook retrieval, or AI-detection features in MVP.
- Reference solutions remain instructor-only. Student AI uses released feedback and the student's own evidence only.
- Cloudflare Workers/static assets/D1 is selected for the repository and pipeline foundation. Account provisioning and deployed integration verification remain outstanding.
- Instructor enrolment is provisioned by a trusted setup process; users cannot self-promote.

## Capabilities

### New Capabilities

- `identity-and-courses`: sessions, trusted role assignment, course membership, object access.
- `assignments-and-submissions`: versioned assignments/rubrics, editor drafts, submission history.
- `instructor-assessment`: evidence-linked AI drafts, instructor edits, approval and release.
- `student-progress`: private progress explanations over comparable released feedback.
- `ai-security-and-resources`: server-only provider integration, validation, quotas and observability.
- `deployment-and-operations`: isolated environments, release automation, recovery and secret handling.
- `development-workflow`: coordinated agents, acceptance evidence, experiments and deliverables.

### Modified Capabilities

None; repository was empty apart from Git metadata at inspection.

## Impact

New application, data schema, API, development records, and deployment pipeline. No existing product migration. Provider access, identity provider, supported language, team size, final hosting and exact quotas remain review decisions in `docs/PlanningDecisions.md`. Optional features belong in later independent changes.
