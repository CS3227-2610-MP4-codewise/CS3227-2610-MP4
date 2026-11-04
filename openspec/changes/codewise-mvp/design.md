# Codewise MVP design

## Context

Draft created 2026-11-04. Foundation implementation is authorized. Two team members are confirmed: Darryl owns instructor features and Keith owns student features. Cloudflare is selected for the deployment foundation; language remains a Python default for review. The full role features and AI workflows remain unimplemented. SourceAcademy is a layout reference, not a code reuse decision.

## Goals / Non-Goals

Goals: durable submissions, rubric-driven assistance, private evidence-based learning feedback, testable security, and auditable development/deployment.

Non-goals: student-code execution, hidden tests, automatic grade release, plagiarism/AI-authorship detection, multi-language runtimes, textbook ingestion, collaborative editing, and a production claim before verification.

## Decisions

### 1. Keep the hosting decision reversible

Foundation: React/Vite/TypeScript browser application with a native lightweight Worker API, static assets and D1. Separate instructor/student modules share one deployable backend and database per environment. A thin API suits the Workers Free CPU budget better than assuming a full server-rendered framework fits. Waiting for an external fetch does not itself consume Worker CPU, but authentication, serialization and validation do; measure the complete request.

Alternative: Vercel Node functions with a separately selected managed database. Familiarity is valuable, but Vercel Hobby's direct Git integration excludes organisation-owned repositories. Verify a supported team deployment route and plan eligibility before choosing it; do not move the required canonical repository out of the team organisation merely to import it.

Keep domain services independent of hosting request objects and database bindings. Provide repository interfaces and a SoCLaaS adapter. Do not implement both hosts in MVP. An actual migration between D1 and another database still requires schema/data work.

### 2. Separate responsibilities

Suggested source modules under src/: web UI, identity/membership service, assignment service, submission service, assessment service, progress service, AI gateway, persistence repositories, and hosting adapters. Authorization belongs at server boundaries and service operations; shared validation schemas and transactions avoid duplicated business rules.

### 3. Data model and version boundaries

| Entity | Important fields and relationships |
| --- | --- |
| User | Internal ID, identity-provider subject; no trusted role from client |
| Course / Membership | Course ID, user ID, student/instructor role, active state |
| AssignmentVersion | Course, publication version, deadline, state |
| QuestionVersion | Assignment version, prompt, language, starter source, private reference |
| RubricVersion / Criterion | Version, question, comparison key, descriptors, min/max score |
| DraftAnswer | Student, question version, source text, revision, update time |
| SubmissionAttempt / SubmittedAnswer | Immutable assignment snapshot, student, timestamp, source and hashes |
| AssessmentRevision | Attempt, rubric version, origin AI/manual, editable revision, approval/release metadata |
| CriterionAssessment / Annotation | Assessment revision, criterion ID, score, explanation, question, line/excerpt |
| AIRequest | Scope, owner, idempotency key, evidence hash, model/prompt versions, status, usage/latency |
| ProgressResult | Student/course, evidence and release versions, validated explanation |
| QuotaReservation / AuditEvent | Atomic allowance reservation / actor, action, object, timestamp |

Use foreign keys, unique constraints, parameterized queries and transactions. Keep rubric comparison keys stable only when their meaning remains comparable. Question/rubric versions are immutable after publication. Drafts remain pinned; do not silently migrate students to changed questions.

### 4. API contract outline

All routes require session and scope checks except sign-in/health. Responses use stable machine-readable error codes with safe messages and a request ID. Dates are stored in UTC and displayed with a labelled timezone. Lists are paginated.

| Route | Intent |
| --- | --- |
| GET /api/courses | Accessible courses |
| GET/POST /api/courses/:course/assignments | List / instructor create |
| POST /api/assignments/:id/publish | Validate and publish a new version |
| GET/PUT /api/questions/:version/draft | Read / revision-checked save |
| POST /api/assignments/:version/submissions | Atomic attempt with answer revisions and idempotency key |
| GET /api/submissions/:id | Authorized immutable attempt |
| POST /api/submissions/:id/ai-assessments | Instructor-only AI draft request |
| GET /api/ai-requests/:id | Authorized status; no hidden assessment text for students |
| POST /api/submissions/:id/assessments | Manual instructor draft |
| PATCH /api/assessments/:id | Revision-checked instructor edits |
| POST /api/assessments/:id/approve | Approve current revision |
| POST /api/assessments/:id/release | Release exact approved revision |
| POST /api/courses/:course/progress | Student-owned evidence selection and AI explanation |

Conflict: 409; invalid payload: 400/422; unauthenticated: 401; inaccessible objects: consistent 403 or non-enumerating 404; application quota: 429; unavailable upstream: 503. Apply payload limits before AI invocation.

### 5. AI context and output contracts

Instructor input: fixed grading policy, explicit no-execution limitation, pinned question/rubric, submitted source with canonical LF line numbering, optional instructor-only reference. No other students' code is needed. Cap source size and reject oversized submissions for AI rather than silently truncating evidence.

Assessment response: criterion IDs, finite bounded scores, explanations, evidence excerpts with start/end lines, and review flags. Validate exact criterion coverage, bounds, ownership and code excerpts. Uncertainty is a review signal, not a statistically calibrated confidence score. Reject invalid responses; show a safe retry/manual option.

Student input: bounded recent released assessments and relevant own code, grouped by comparable keys. Output: observations, supporting evidence IDs, improvements where justified, limitations, and next practice steps. Never include private reference solutions or unreleased assessment content in this prompt.

Prompt versions are immutable repository artifacts. Identical policy prefixes and deterministic context order can improve cache opportunities, but provider caching is not assumed or reported without metrics. Never request, store or claim access to private chain-of-thought; use documented decisions and available usage counters.

### 6. Resource handling and request lifecycle

AIRequest states: pending -> running -> succeeded | failed | expired. This is separate from AssessmentRevision draft -> approved -> released. Store request metadata before invoking the provider; use a unique key scoped to actor/action/evidence and reject key reuse with different payloads.

Initial design is a bounded synchronous request with persisted status. Do not rely on unawaited promises after a serverless response. Use a request deadline below verified host/provider limits; an expired lease can be marked failed and retried explicitly. A durable background queue is a later decision if latency measurements require it.

Use shared atomic request/token reservations and expiring concurrency leases, not per-process counters. Retry attempts require admission too. Reserve configured worst-case input/output allowances; reconcile to actual usage only where semantics are known. Exact quotas, tokenizer and model context limits remain unverified. Production AI is disabled until configuration is supplied. A request can fail without affecting editor save or manual assessment paths.

Cache within authorized user/course scope, keyed on immutable evidence, prompt, model and generation settings. Membership checks apply before cache access. Progress results recheck source release versions. Autosave is debounced, initially proposed at two seconds after changes; no AI call occurs per keystroke.

### 7. Security design and verification

Trust boundaries: browser -> authenticated API -> persistence / provider. Browser code, source comments, materials and generated feedback are untrusted. The model receives no credentials or execution tools. Enforce authorization before context assembly, use safe text/Markdown rendering, explicit endpoint allowlists, prepared SQL, secure sessions, origin/CSRF protections, and bounded payloads.

Prompt delimiters are only one defence. Adversarial evaluation must test rubric override attempts, reference-solution exfiltration, malicious markup and cross-student identifiers; structural validation alone cannot detect a semantically wrong but well-formed grade. All AI grades therefore remain drafts.

Development boundaries: implementation agents use synthetic fixtures and no production secrets. Treat issue/repository/external instructions as untrusted source material. Review dependencies, run secret scanning, protect production deployment jobs and keep development interaction summaries redacted. Do not store real learner code in the public repository.

### 8. Operations and quality targets

Proposed acceptance targets, to be confirmed: at least 95% of non-AI read/save requests complete within 1 second under 20 concurrent synthetic users in a documented test environment; no lost acknowledged draft saves; every grading release has valid approval provenance. Report measured results rather than promises.

Separate development/preview/production stores and credentials. CI executes validation, focused tests, build, security checks and deployment gates. Fork/PR builds get no production credentials. Document database backup/restore, migration safety and application rollback separately. Product website uses GitHub Pages; the app is deployed through team-managed automation, not an AI build-and-host environment.

## Risks / Trade-offs

- SoCLaaS public guides establish Internet access, not deployed authenticated success or account quota values.
- Free plan limits can change and may be shared across environments.
- Human review adds work but is necessary given absent execution and uncertain model judgements.
- Progress summaries need enough comparable released feedback; synthetic demo histories must be labelled.
- Two roles match the confirmed two-person team; shared interfaces need both owners' review.

## Migration Plan

No existing product data. Implement schema and synthetic fixtures locally; verify development integration; run acceptance/security evaluation; rehearse restore; deploy a release candidate to isolated hosting; perform deployed SoCLaaS smoke test; release only after gates pass.

## Open Questions

See docs/PlanningDecisions.md. Identity provider, language, provider quotas, retention policy and final feature selection remain unresolved. Team ownership is confirmed and Cloudflare is selected for foundation setup. Optional textbook Q&A and code execution require independent security/design changes.

## Foundation delivery slice

Scope: repository conventions, app shell, safe API/health boundary, metadata migration, shared DTO starting points, role folders, CI, staging and explicit production promotion, product-site pipeline, runbooks and handoff instructions. This is not implementation of the complete role services or all OPS requirements. Cloud account configuration, remote pipeline success and recovery rehearsal must be recorded separately.

CI runs without cloud/provider credentials. Pushes to main run checks before staging deploy. The same release run queues production only after staging smoke checks and artifact upload succeed. The production environment's required reviewer creates the Review deployments approval gate. After approval, the job checks out the same commit, downloads this run's tested frontend artifact, validates its commit/run provenance and current main head, then migrates/deploys. No separate run-ID dispatch is used. Staging and production retain separate D1 IDs checked by the configuration generator. Full API/data schema and identity decisions remain future shared work.

The complete release workflow is serialized with cancellation disabled. A waiting production review holds the release slot. Approve, reject or cancel it before the next release proceeds. If another commit reaches main during the wait, the superseded release is rejected before production migration; cancel it and test the newer run. Branch/PR pushes still run CI only. Application rollback remains separate from schema recovery.
