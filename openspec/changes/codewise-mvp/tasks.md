## 0. Repository and deployment foundation (current scope)
- [x] 0.1 Create React/TypeScript shell, native Worker health/API boundary, role module folders and shared DTO starting points (OPS-03, DEV-01).
- [x] 0.2 Configure local D1 metadata migration and isolated staging/production bindings with validation (OPS-01).
- [x] 0.3 Implement CI and tested staging-to-production promotion workflows plus GitHub Pages workflow (OPS-02).
- [x] 0.4 Record confirmed Darryl/Keith ownership, shared-file review rules and agent handoff templates (DEV-02).
- [x] 0.5 Verify dependency installation, types, lint, tests, build, specs and local Worker smoke checks (DEV-01, OPS-03).
- [x] 0.6 Provision cloud/GitHub settings, pass online staging checks and promote a foundation release (OPS-01, OPS-02). Verified run 41799944040 at 281cc13, recorded production approval and staging/production smoke results: workflow/evidence/project-readiness/verification.md. Foundation only; full OPS and role release remain incomplete.

## 1. Resolve planning and integration gates
- [ ] 1.1 Confirm language and remaining MVP assumptions (DEV-01). Two-member team and role/shared increment workload confirmed; see workflow/Ownership.md. Product gates remain in docs/PlanningDecisions.md.
- [ ] 1.2 Obtain documented SoCLaaS quotas, discover a supported model, and configure secrets outside Git (AI-01, AI-03).
- [ ] 1.3 Run authenticated model discovery and one synthetic completion from an isolated candidate deployment; record host, date, HTTP outcome and latency without secrets (AI-01).
- [ ] 1.4 Measure complete API CPU/latency and confirm hosting plan, repository integration and database choice (OPS-01).
- [ ] 1.5 Review specs and validate with the selected OpenSpec CLI version before baselining (DEV-01).

## 2. Establish engineering workflow
- [ ] 2.1 Implement coordinator handoff records, file ownership and review-return rules (DEV-02).
- [ ] 2.2 Establish synthetic data, redacted summaries, security scans and least-privilege agent tooling (DEV-03, DEV-04).
- [ ] 2.3 Configure isolated environments and required CI checks (OPS-01, OPS-02).
- [x] 2.4 Organize member logs, shared evidence and contract reading map; preserve history and verify references (DEV-02, DEV-04).
- [x] 2.5 Replace manual run-ID dispatch with one approval-gated release run, validate exact artifacts and update release guidance (OPS-02, OPS-04).

Readiness reconciliation: `project-readiness` records actual independent planning review, named writers, contract drafts and redacted evidence. Tasks 2.1–2.3 remain open for full workflow/security/environment acceptance beyond foundation configuration. New contract scenarios are not executed feature integration checks; no role/AI/recovery task is completed by this document update.

## 3. Implement identity and persistence
- [ ] 3.1 Darryl owns SH-AUTH: choose the maintained identity/provider and registration/provisioning policy for joint review, implement sign-in/account mapping, secure sessions/logout and CSRF; verify expiry/cancellation/logout, safe return and no self-promotion before handing the trusted subject to Keith (AUTH-01, AUTH-03).
- [ ] 3.2 Darryl owns SH-ID course/membership/object permissions and membership revocation, consuming Darryl's SH-AUTH session/CSRF guards; jointly verify exact C-ID producer revisions, cross-user/course access, session and membership revocation, and CSRF before protected feature integration (AUTH-01, AUTH-02, AUTH-03).
- [ ] 3.3 Implement versioned schema, constraints, migrations and repositories (SUB-01, SUB-03, GRADE-04).

## 4. Implement writing and submission workflow
- [ ] 4.1 Implement instructor publication and rubric validation with version-preserving edits (SUB-01).
- [ ] 4.2 Implement accessible editor, visible save status and revision conflict recovery (SUB-02, SUB-04).
- [ ] 4.3 Implement atomic attempts, deadlines and idempotency; test concurrent save/submit and mismatched retries (SUB-03).
- [ ] 4.4 Verify old annotations use old source and keyboard flows remain usable (SUB-04).

## 5. Implement AI infrastructure
- [ ] 5.1 Implement provider adapter, model configuration and server-only credentials (AI-01).
- [ ] 5.2 Implement minimal versioned prompts, response schemas, safe rendering and endpoint restrictions (AI-02, AI-05).
- [ ] 5.3 Implement shared atomic admission, idempotency, bounded retry, timeouts and request recovery (AI-03, AI-04).
- [ ] 5.4 Verify parallel replica limits, outage/manual fallback, cache isolation and usage-unavailable handling (AI-03, AI-04, AI-05).

## 6. Implement instructor assessment
- [ ] 6.1 Generate criterion-level drafts and validated annotations with no-execution disclosure (GRADE-01, GRADE-02).
- [ ] 6.2 Implement manual grading, revision-aware editing, approval and release (GRADE-03, GRADE-04).
- [ ] 6.3 Verify hidden draft access, stale approval, regeneration and release corrections (GRADE-02, GRADE-03, GRADE-04).

## 7. Implement student progress
- [ ] 7.1 Select authorized released comparable evidence with bounded context (PROG-01).
- [ ] 7.2 Validate cited observations and practice suggestions (PROG-02).
- [ ] 7.3 Implement version-aware reuse and stale-evidence handling (PROG-03).
- [ ] 7.4 Verify insufficient history, incomparable rubrics and reference-solution exclusion (PROG-01, PROG-02, PROG-03).

## 8. Evaluate and release
- [ ] 8.1 Execute adversarial AI/development security cases and retain reviewed evidence (AI-02, DEV-03).
- [ ] 8.2 Evaluate AI rubric alignment, evidence validity and instructor corrections using fixed synthetic cases (GRADE-01, DEV-04).
- [ ] 8.3 Compare full vs selected context and single-agent vs coordinated-agent workflow on comparable tasks (DEV-02, DEV-04, AI-05).
- [ ] 8.4 Run non-AI load checks and backup/restore rehearsal; document recovery and migration limits (OPS-03).
- [ ] 8.5 Complete accurate UserGuide, DeveloperGuide, acknowledgements, Reflections, verified summary logs and GitHub Pages product website (DEV-04).
- [ ] 8.6 Pass release gates, deploy via team CI, and smoke-test both roles against isolated production configuration (OPS-01, OPS-02, AI-01).


## 9. Shared foundation for independent role development
- [x] 9.1 Reconcile current SH-AUTH revision, shared write window, migration sequence and C-ID contract; record pending Keith review (AUTH-01–03, DEV-02).
- [ ] 9.2 Implement authoritative courses, memberships, revocation and server-side course/object authorization, with trusted instructor provisioning and no self-promotion (AUTH-02, AUTH-03).
- [ ] 9.3 Compose sessions, authorization, workspace destinations and instructor invitation gates using real authority; fail closed (AUTH-01–03).
- [ ] 9.4 Provide isolated local setup and synthetic course/instructor data for instructor feature development (AUTH-01–03, DEV-03).
- [ ] 9.5 Verify allowed, unauthenticated, cross-course, revoked and CSRF cases, migration and restart persistence; record checks and handoff (AUTH-01–03, DEV-02).
- [ ] 9.6 Complete applicable warm-workbook-v1 UI-01–08 review and manual acceptance for changed UI; record deployment only when performed (OPS-01–02).
