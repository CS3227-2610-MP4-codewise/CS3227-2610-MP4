# Ownership and integration agreement

## Secure gateway readiness window — 2026-11-12

Darryl/main is sole writer for the bounded `gateway-reported-bounds-01` repair in `src/server/ai/gateway.ts`, `transport.ts` and their tests, secure-ai-gateway artifacts/evidence/handoff, this coordination record, IntegrationContracts readiness note and log 21. `/root/gateway_readiness_review` is read-only. The transport scope follows its confirmed related usage-accounting finding. No shared DTO, route, schema or migration change is made. Existing writer windows and Keith's student/submission ownership remain intact. Future index/environment wiring or migration changes need a separately agreed exclusive window with exact producer/consumer revisions; none is inferred here. Darryl autoapproves this brief and waives human acceptance only; Keith exact-source review and provider activation are not approved.

## Local shell recovery window - approved 2026-11-11

CI repair follow-up2026-11-12: under Darryl's current failing-PR request, main aligns only the shared-consumer expectations/fixture in `src/web/student/StudentWorkspace.dom.test.ts` on PR27. Two radio assertions now use the documented native switch; one request-count queue becomes server-phase responses for all session readers, retaining/strengthening sign-out recovery assertions. This is test compatibility for Darryl's changed shared producer, not student feature implementation or a transfer of Keith's ownership. Keith's source-specific review remains pending; no Keith approval is claimed. No student runtime, shared DTO/schema/API or PR26 edits.

Darryl approved the concrete `local-shell-recovery-01` brief. Sole product writer: Darryl/main for shared `workspace-switch.tsx` and focused tests, role/recovery CSS, auth `client.ts`/`App.tsx` and focused tests, instructor `Workspace.tsx`, course client/tests, plus existing specs/tasks/evidence/handoffs and Darryl log. Independent reviewer `/root/shell_review` is read-only. The brief conditionally includes necessary instructor parent recovery consumers: independent review proved initial cross-account binding needs existing identity passed through `assignments/AssignmentWorkspace.tsx`, `assessments/AssessmentWorkspace.tsx` and `assessments/ReviewWorkspace.tsx`. These exact additions were announced before editing; no parent business flow, student source, backend/DTO/schema/migration or live operation is changed. Manual acceptance and Keith's exact-revision consumer review remain separate from his accepted broad decisions.

Current confirmation — 2026-11-09: Keith directly accepts Darryl's SH-AUTH/SH-ID ownership and the C-ID, onboarding, dashboard-context and K1–K6 contract decisions recorded in [IntegrationContracts.md](IntegrationContracts.md#current-decision-status--keith-confirmation-2026-11-09). Earlier pending policy-agreement statements are historical; exact-revision source review and real student consumer integration remain pending. This confirmation changes no runtime permissions or shared write windows.

Confirmed by the team: Darryl implements instructor features; Keith implements student features. Both contribute a substantial share of team-level work.

| Area                                                            | Primary owner                    | Integration rule                                               |
| --------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| src/web/instructor/, src/server/instructor/                     | Darryl                           | Instructor feature branch/PR                                   |
| src/web/student/, src/server/student/                           | Keith                            | Student feature branch/PR                                      |
| Shared sign-in/registration, provider accounts, sessions/logout | Darryl                           | Keith cross-reviews; Keith cross-reviews course authority      |
| Courses, memberships and object authorization                   | Darryl                           | Consume trusted SH-AUTH identity; Keith cross-reviews          |
| Shared DTOs, API entry, identity, AI gateway, schema, CI        | Both                             | Agree interface and assign one write owner before changes      |
| Assignment publication/rubric                                   | Darryl                           | Student-facing projection agreed with Keith                    |
| Drafts/submission attempts                                      | Keith                            | Immutable submission projection agreed with Darryl             |
| Released feedback                                               | Darryl publishes, Keith consumes | Versioned public DTO; no reference solutions/unreleased drafts |

Use feature branches such as codex/instructor-rubrics and codex/student-drafts (or team-agreed names). Merge through reviewed PRs to main. Keep role services in one deployable application for now. If two agents or developers need a shared file, serialize ownership or split interfaces first.

Before role features expose real data, jointly implement the trusted identity/membership boundary. Do not let each role invent its own authentication or separate copy of shared tables. Language remains a draft Python default; execution remains excluded unless a later spec change adds it.

## Current shared increment writers — updated 2026-11-06

The original combined split was reported agreed by Keith through Darryl in `project-readiness` on 2026-11-05; that historical acceptance is not a new review by Keith in this chat. The current table incorporates Darryl's later auth reassignment below. Product policies/interface drafts still require joint acceptance before dependent edits. “Both” above denotes shared review responsibility; the following assigns one writer per bounded increment.

Update requested by Darryl on 2026-11-06: transfer sign-in and registration/provisioning, provider integration, account identity, sessions and logout to Darryl (SH-AUTH). Keith retained course/membership/object authorization (SH-ID) and student/submission work at that time; the later 2026-11-07 transfer below supersedes SH-ID ownership. This supersedes the earlier combined Keith-owned SH-ID assignment for future work; historical logs/evidence retain that earlier allocation. Keith's review of the revised shared boundary remains pending and is not claimed here.

| Increment                                                                       | Writer / migration owner | Consumer and cross-reviewer                   | Dependency / handoff                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| PR-READY: readiness documents/evidence                                          | Darryl                   | Keith; independent agent review also recorded | Planning only; no application/schema edits                                                                    |
| SH-AUTH: sign-in, registration/provisioning, provider accounts, sessions/logout | Darryl                   | Keith                                         | Provider and registration-policy decision; reviewed session/account handoff and C-ID acceptance               |
| SH-ID: courses, memberships, course/object authorization                        | Darryl                   | Keith                                         | Consume Darryl's SH-AUTH session identity; reviewed authorization/allowed-context handoff and C-ID acceptance |
| SH-PUB: assignment publication/public projection                                | Darryl                   | Keith                                         | Reviewed SH-ID handoff; C-PUB acceptance                                                                      |
| SH-SUB: drafts/immutable submissions                                            | Keith                    | Darryl                                        | Reviewed SH-ID/SH-PUB handoffs; C-SUB acceptance                                                              |
| SH-REL: assessment approval/release/public feedback                             | Darryl                   | Keith                                         | Reviewed SH-SUB/rubric handoffs; C-REL acceptance                                                             |
| SH-AI: shared AI gateway/resource controls                                      | Darryl                   | Keith                                         | C-AI acceptance; auth/evidence before integration; provider evidence before activation                        |
| SH-OPS: release evidence/isolation/recovery rehearsal                           | Darryl                   | Keith                                         | Successful staging and separately authorized release work; recovery still pending                             |

Keith also owns student editor, feedback display and progress implementation, including progress-specific AI context/validation. Darryl owns instructor UI/domain work and assessment-specific validation. Each future increment needs its own approved bounded change; this assignment is not blanket implementation/deployment authorization.

The writer owns relevant tables/repositories, DTO sections and API wiring only during a recorded edit window. Before editing shared DTOs, API entry, runtime bindings or migrations, name exact files/sections and acquire that window in the handoff. Serialize windows and next migration numbering; never assign both active writers to one file. CI/security work outside SH-OPS needs a new named assignment. Both owners record review outcomes for shared contracts/migrations; workload agreement is not a completed review.

No real SH-AUTH/SH-ID/SH-SUB implementation handoff exists at this baseline. Darryl supplies the single shared authentication/account/session producer; Darryl supplies course/membership/object authorization; Keith supplies submission producers. Compose their reviewed revisions behind the existing C-ID boundary rather than creating parallel identity stores. SH-PUB and SH-SUB require both authentication and authorization handoffs. Fixtures support isolated work only, with integration pending.

Darryl owns the sign-in UI and provider callback, session expiry/logout/revocation, mutation-origin/CSRF guards and account identity mapping. Darryl owns authoritative course membership, course/object permission checks and allowed workspace contexts, consuming the trusted session identity. Instructor provisioning policy is jointly reviewed; accounts never self-promote. Account/session and course/membership schema sections have named owners but remain in one authoritative store, with one active migration writer per agreed window. Registration method (public, invitation or operator-managed) and provider remain undecided; transferring ownership does not approve either.

## Records and shared interfaces

## SH-AUTH credential/mail revision window — approved 2026-11-06

Darryl approved the revised shared-authentication brief: FoC-style NUS email/password verification/reset, SendGrid, non-expiring instructor invitations and own-invite tracking. Darryl is sole writer for this change's existing planning/log/evidence/handoff, workflow/auth/ runtime spike and helpers, and (after the secure runtime gate) existing src/server/auth/, src/web/auth/, compatible src/shared/auth.ts, next additive0004 migration after number recheck, minimal dependency/environment/API wiring and the approved UI auth-policy addendum. Existing0003 and stable account IDs are preserved. No other migration writer is assigned here. Keith remains sole writer for instructor/course/membership/object authorization; no Keith agreement or implementation is claimed. Missing authority prohibits real instructor sends and dependent integration. Reviewer /root/auth_review is reused read-only for runtime investigation and later independent review; no parallel editing. Workers Free was confirmed by Darryl; no paid tier, alternate host, weaker password policy, mail sending, commit/push or deployment is authorized by this approval. Runtime feasibility must be resolved before credential code.

## SH-AUTH implementation window — approved2026-11-06

Darryl is sole writer for src/server/auth/, src/web/auth/, compatible existing C-ID session/error boundary additions, authentication wiring in src/server/index.ts/environment.ts and src/web/main.tsx, next0003 authentication migration (number rechecked before creation), minimal package/lock and wrangler.json auth configuration sections, workflow/auth/ provisioning/tests and this bounded change's specs/docs/log/evidence/handoff. Existing styling/primitives are reused. User approved Google OIDC, invitation-only24-hour onboarding,30-minute idle/8-hour absolute sessions and in-app trusted-admin create/copy-once/list/revoke invitations with manual sending. Auth-admin authority is operator-bootstrapped separately from course/instructor roles. One independent auth_review is read-only. No Keith/course/submission implementations, CI/release edits, email provider, production deployment or generic personal skill changes. Keith's revised-boundary review remains pending. This window is serialized with future shared writes.

Concrete compatible additions in this same window: src/shared/auth.ts (separate UI envelope; existing SessionView unchanged), .dev.vars.example (blank server-only auth configuration), openspec/config.yaml context and docs/PlanningDecisions.md/IntegrationContracts.md current-status reconciliation. No other migration writer is active. The earlier “provider/registration undecided” and “no SH-AUTH implementation” paragraphs describe the pre-approval baseline; this window and its source/evidence handoff supersede them for current local implementation. Live Google, deployment, Keith cross-review and composed authorization remain pending.

Darryl owns logs/darryl/; Keith owns logs/keith/. Choose one human log owner for each shared increment and attribute both contributions. Follow [the log policy](../logs/README.md). Shared producer/consumer decisions live in [IntegrationContracts.md](IntegrationContracts.md); handoffs and verification evidence stay in shared workflow folders. Assign a named lead and single active writer per shared increment before dependent implementation.

## Instructor contract artifact window — approved 2026-11-05

Darryl is the single writer for src/shared/instructor-contracts/, src/server/instructor/ports/, workflow/fixtures/instructor-contracts/, workflow/contracts/, existing IntegrationContracts/PlanningDecisions documents and this change’s planning/evidence/handoff/member log. One independent reviewer is read-only. Existing src/shared/contracts.ts, API entry, runtime environment, migrations, dependencies/CI and Keith role services are untouched. Detailed Keith K1–K6 agreement and real producer/auth integration remain pending; this window does not transfer his implementations to Darryl.

## Instructor assignment publication window — approved 2026-11-06

Darryl approved the bounded authoring/publication brief and expanded single-writer window: src/web/instructor/assignments/, src/server/instructor/assignments/, new authoring contract/tests, next migration 0002_instructor_assignments.sql (number rechecked before creation), workflow/instructor-preview/ and its local HTML entry, minimal package/lockfile development support and this change's docs/log/evidence/handoff/UI review. The independent reviewer is read-only. Production Worker/frontend entrypoints, root deployment configuration, CI and Keith identity/course/submission/progress services are not part of this window. Synthetic local composition is explicitly authorized; real authentication/K1–K6/consumer integration remains pending.

## SH-AUTH Firebase/Brevo revision window — approved 2026-11-06

Darryl selected Firebase Authentication and Brevo and authorized implementation before creating provider accounts. This supersedes the SendGrid/local-password and proposed passwordless/Supabase targets above. Darryl remains sole writer for existing src/server/auth/, src/web/auth/, compatible auth DTOs, next additive 0004 after number check, minimal server/environment/frontend wiring, blank .dev.vars.example, approved UI auth-policy addendum and existing change/docs/log/evidence/handoff. Keith remains sole authority producer; no membership/schema implementation or claimed review is transferred. Existing Google identities are not automatically linked by email. Firebase owns passwords; D1 stores app identity mapping, sessions and admission/audit only. No live mail, account creation, paid tier, commit/push or deployment is authorized. /root/auth_review is reused read-only to verify official provider APIs and independently review; no parallel edits.

## UI clarity continuation — authorized 2026-11-06

Darryl requested committing existing work first, then simplifying cluttered shared/instructor UI and adding appropriate SVG marks. Existing auth work is committed in b62165f/386b681/b169c11. Continue its UI refinement on codex/shared-authentication without carrying unrelated changes. Darryl is sole writer for src/web/ui/ brand/icon components, opt-in shared styles in src/web/styles.css, src/web/main.tsx, src/web/auth/, src/web/instructor/assignments/AssignmentWorkspace.tsx and its styles, synthetic preview presentation, and existing warm-workbook/auth planning/log/evidence. This window changes presentation, not shared service contracts or permissions. Keith student source/services remain untouched; future student consumers inherit only opt-in shared components. One reused reviewer remains read-only. No push/deploy is authorized; UI manual acceptance remains pending.

## SH-AUTH native email replacement window — approved 2026-11-07

Darryl is sole writer for existing SH-AUTH credential/mail adapters, managed auth routes/store, src/server/index.ts/environment.ts, minimal src/web/auth/client.ts/App.tsx/main.tsx handler additions, .dev.vars.example, next additive0005 (number rechecked), workflow/auth tests/synthetic preview and this existing change's specs/setup/handoff/evidence/log. Preserve all pre-existing UI clarity changes. Brevo is removed in favor of Firebase native authentication email; no Keith-owned course/membership/student edits. Existing reviewer auth_review is read-only. No live email, deployment, commit/push or provider purchase authorized by this request. Keith revised-boundary review and integration remain pending.

## SH-AUTH Gmail delivery continuation — authorized2026-11-07

Darryl is sole writer of the existing SH-AUTH mail/provider/routes/environment/API wiring, workflow/auth tests/setup and current change/spec/docs/log/evidence/handoff. Existing auth/native edit window continues on codex/shared-authentication; preserve all prior UI changes. Gmail sender/app-password replaces unavailable provider signup/template configuration. No new migration, dependency, personal skill, Keith/student/course implementation, credentials creation/mail/send/deploy/commit/push authorized here. One reused auth_review is read-only. User performs Google account/app-password setup. Real sender delivery and Keith review/composition remain pending.

## SH-AUTH one-time operator owner — authorized2026-11-07

Darryl requested a persistent one-time owner bootstrap and then explicitly chose an invented NUS login alias rather than a real mailbox. Darryl is the sole writer for src/server/auth/owner.ts and auth/provider/store/routes/index/environment composition, src/web/auth/App.tsx minimal8-character policy/adminlabel alignment, next additive0006_owner_bootstrap.sql (number rechecked), workflow/auth tests/local configuration guidance and existing shared-authentication proposal/design/spec/tasks/docs/evidence/handoff/log. Existing changes preserved. No course/membership/student implementation or authorization bypass. One reused auth_review is read-only. Known test credentials are not put in source. User authorizes provisioning a test owner locally through configured Firebase; production account/schema changes remain the reviewed release path, not ad hoc SQL/deploy. Synthetic/non-owned alias is not verified email, and ordinary email-based recovery cannot authorize changed owner credentials. Keith boundary review remains pending.

## SH-ID ownership update — 2026-11-07

Darryl owns SH-ID: courses, memberships, object authorization and allowed workspace contexts. This supersedes earlier Keith SH-ID ownership statements. Keith retains student and submission work and cross-reviews the composed C-ID boundary; his acceptance is pending. Use one authoritative identity/course store, serialize shared schema and API edits, and consume trusted SH-AUTH sessions. Account administration grants no course membership or instructor role. Implementation and integration remain pending.

## SH-ID implementation window — approved 2026-11-07

Darryl is the sole shared writer for the next additive course/membership migration (recheck numbering), server course authority and trusted local provisioning, authentication/assignment API composition, instructor workspace and necessary shared DTOs, and this change's specs, evidence, handoff and Darryl log. UI and authority work are delegated into non-overlapping files. Keith reviews C-ID; no review is claimed. Do not deploy production outside the reviewed release workflow.

## Instructor assessment lifecycle — approved 2026-11-07

Darryl approved the assessment brief and exclusive writer window: new src/server/instructor/assessments/, src/web/instructor/assessments/, src/shared/instructor-contracts/assessment.ts and focused tests; additive0008 assessment-only migration after numbering check; workflow/assessment-preview/ and feature conformance/evidence/handoff; minimal opt-in package script; logs/darryl/09-instructor-assessment-lifecycle.md. Existing auth/production entrypoints/Keith ports and services remain read-only. One independent reviewer is read-only. No real producer composition, commit/push/deploy/archive authorization.

## Connected instructor workflow — approved2026-11-07

Darryl is sole writer for native application/assessment composition in src/server/index.ts/environment.ts, minimal safe-destination changes, request-bound assessment scope/discovery adapters, src/web/main.tsx/instructor navigation and assessment client/chrome, workflow/connected-preview/ and existing assessment specs/log/evidence/handoff. Reuse existing auth/course/publication/lifecycle storage and ports. Explicit local sample submission injection is loopback+development only, with no student account/membership/submission implementation; production missing producer stays unavailable. Local operator setup may grant the existing owner a local test-course membership through existing coursePlan, preserving authoritative local D1. One reused reviewer is read-only. No remote data, commit/push/merge/deploy authorized.

Connected continuation detail: Darryl reuses the existing D1Assignments.guarded batch implementation for assessment writes via a server-only injected callback; its method becomes accessible to composition. No parallel course authorization SQL/store is introduced.

## Interaction clarity — approved2026-11-07

Darryl is sole writer for src/web/ui/account-menu.tsx/brand.tsx, opt-in src/web/styles.css, auth/App.tsx/styles.css, instructor/Workspace.tsx and assignment/assessment presentation, plus current assessment planning/log/evidence/handoff. Approved existing-iteration continuation after push; main969a062 remains the baseline. Read-only FoC UX reference, no edits to FoC, Keith/student/backend/contracts or personal skills. One reused independent assessment_review remains read-only. User approved the concise cross-screen scope; keep Codewise warm-workbook-v1 visual identity and security/version semantics.

Rejected-UX repair scope includes Darryl-owned src/web/ui/course-navigation.tsx and its focused navigation regression test. This centralizes existing navigation/presentation only; it consumes existing authorized course names and does not alter C-ID, memberships or student code.

## Course-onboarding shared planning window — 2026-11-07

Darryl requested the new course/onboarding product plan and is the sole writer of openspec/config.yaml, bounded course-onboarding planning, targeted existing MVP/auth/UI planning reconciliation, docs/ui/design.md and docs/PlanningDecisions.md, current IntegrationContracts/Ownership planning notes, Darryl log and redacted planning evidence/handoff. New branch codex/course-onboarding-plan starts at merged reviewed main a05d5ba; original dirty auth and assessment log worktrees are preserved. No application/contracts/runtime DTO/schema/migration/provider data or personal skill edit is authorized. Keith retains student dashboard/submission implementation and cross-review. Shared API/migration contracts require actual agreement before later dependent edits; product request is confirmed by Darryl, not supplied Keith acceptance.

### Ownership conflict resolved by explicit user reply

Darryl answered "Darryl, as recorded on main" on2026-11-07. This supersedes the stale user-supplied/project AGENTS sentence assigning SH-ID to Keith. Project AGENTS.md and DeveloperGuide/PlanningDecisions ownership statements are reconciled in this documentation-only window so subsequent implementations do not repeat the conflict. Keith retains student/submission work and actual joint review remains pending. No personal skill or runtime authority changed.

## Setup-reset recovery window — approved 2026-11-08

Darryl is sole writer for `src/server/auth/managed-store.ts`, `managed-routes.ts`, additive next migration 0012 after numbering check, affected synthetic auth tests, shared-authentication artifacts, auth recovery evidence/handoff and Darryl log. /root/reset_review is read-only. This window does not grant permission for live provider operations, deployments, student code or other shared schema changes. Keith cross-review remains pending.

## Secure AI gateway writer window — approved 2026-11-08

Darryl is the sole shared schema/API writer for `src/server/ai/`, additive migration 0013 after numbering check, minimal server-only environment and blank `.dev.vars.example` entries, gateway tests and this change's spec/evidence/handoff. Two specialists own non-overlapping adapter and D1 files; the main agent owns integration; independent review is read-only. Separate instructor/student keys do not imply separate provider quota pools. No live provider calls, secrets access, Keith progress implementation or deployment are authorized by this window; Keith cross-review remains pending.

## Student assignment dashboard writer window — reported agreed 2026-11-09

Keith reported on 2026-11-09 that Darryl agreed that Keith is the sole writer, with Darryl reviewing, for the student-assignment-dashboard change: student route wiring in `src/server/index.ts` and `src/web/main.tsx`, new `src/shared/student-assignments.ts`, the bounded latest-publication list read, the explicit current-Student authority addition in `src/server/courses/authority.ts`, and extraction of the neutral shared instruction renderer. Also in Keith's window: `src/server/student/`, `src/web/student/` and this change's artifacts, evidence, handoff and Keith log. This record carries Keith's report; Darryl's direct review is not claimed here. The reads use the existing D1 identity, course and publication tables: no migration, no new store, no dependency, and no change to SessionView, the `student-read` action or instructor semantics. The window does not include SH-AUTH return-destination changes, commits, pushes or deployments.

Update 2026-11-09: Keith reported that Darryl reviewed and approved draft PR #25 (`2b2da64`), including the shared-file edits above. Keith asked for this to be treated as Darryl's approval. GitHub shows no submitted review on the PR at this time, so this record rests on Keith's report. Keith dropped the SH-AUTH student return-destination request on 2026-11-09, so no Darryl change is needed.

## Student drafts writer window — reported agreed 2026-11-10

Keith reported on 2026-11-10 that Darryl approved all shared decisions for the student-drafts change (SW-01–SW-10, C-SUB), including this writer window. One writer per file, Darryl reviewing:

| File                                                                                   | Writer                                                                                                                                   |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/server/db/migrations/0015_student_submissions.sql` (number rechecked at creation) | Keith (domain Implementer agent on `keith/student-drafts`)                                                                               |
| `src/shared/student-work.ts`                                                           | Keith (domain Implementer agent)                                                                                                         |
| `currentStudentWriteGuard` addition in `src/server/courses/authority.ts`               | Keith (domain Implementer agent)                                                                                                         |
| Student route wiring in `src/server/index.ts`                                          | Keith (domain Implementer agent)                                                                                                         |
| Student workbook route wiring in `src/web/main.tsx`                                    | Keith (one UI Implementer agent per variant branch `keith/student-drafts-ui-{a,b,c}`; only the variant Keith chooses at task 4.2 merges) |

Also in Keith's window: `src/server/student/`, `src/web/student/`, the change's artifacts, evidence, handoff and Keith log. `SubmissionCatalog` composition in place of the loopback samples (task 6.2) is not opened by this record. This record carries Keith's report; Darryl's direct review is not claimed. No push or deployment is authorized by it.

### Extension — rate-limit binding (SW-11, task 8.1), reported agreed 2026-11-12

Keith reported on 2026-11-12 that Darryl agreed Keith may edit, one writer per file with Darryl reviewing:

| File                                                                                               | Writer |
| -------------------------------------------------------------------------------------------------- | ------ |
| `ratelimits` binding entry for each environment in `wrangler.json` (no other section)              | Keith  |
| Rate-limit binding type in `src/server/environment.ts` (no other change)                           | Keith  |
| Limiter composition for the student handler in `src/server/index.ts` (already in the window above) | Keith  |

Darryl's `AuthStore.rate` (`src/server/auth/store.ts`) is consumed unchanged, not edited. This record carries Keith's report; Darryl's direct review is not claimed. No deployment is authorized by it.

### Extension — SubmissionCatalog composition (task 6.2), reported agreed 2026-11-12

Keith reported on 2026-11-12 that he may apply the C-SUB composition himself: Keith is the writer for the `AssessmentWorkflow` submissions argument in `src/server/index.ts` (real `D1SubmissionCatalog` outside the loopback sample run; loopback samples stay exclusive when the connected-preview port supplies them). No other part of `index.ts` is opened. This record carries Keith's report; Darryl's direct review is not claimed.

## Real assessment integration writer window — 2026-11-12

Darryl is sole writer for `src/server/instructor/assessments/service.ts` consumer authorization, new `src/server/instructor/assessments/owned-attempt.ts` adapter, `src/server/instructor/assessments/workflow.ts` and `src/server/index.ts` composition, `workflow/connected-preview/real-submission.test.ts` integration verification, and related tasks, evidence, handoff and Darryl log. Instructor catalog and Keith student implementation remain unchanged. This records Darryl's explicit authorization, not Keith approval.

Darryl also writes `src/server/instructor/assessments/release-http.ts` (read-only C-REL HTTP adapter) and the release-existence check in `src/server/instructor/assessments/repository.ts`; focused tests remain in `workflow/connected-preview/real-submission.test.ts`. This is an additive consumer of the existing contract and does not claim Keith approval.
Darryl also writes `workflow/assessment-preview/fixture.ts` to supply the distinct synthetic owned-attempt port to existing lifecycle tests.
Darryl also writes `src/web/instructor/assignments/InstructionEditor.interaction.test.ts` solely to investigate and, if confirmed, accommodate the lazy preview's local loading time while retaining the rendered-bold assertion.

## Student released feedback — Keith writer window in SH-REL, reported agreed 2026-11-12

Keith reported on 2026-11-12 that Darryl agreed to the `attemptReleases` method shape in `openspec/changes/student-released-feedback/design.md` D1 (1..50 unique own attempt IDs; `null` for no assessment or no release; all-or-nothing authorization; version list including superseded and withdrawn versions) and granted Keith this writer window. Darryl remains the SH-REL producer owner and reviews Keith's producer change before composition (task 5.2).

| File                                                                                                                                     | Writer | Reviewer |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| `src/server/instructor/ports/contracts.ts`: additive `attemptReleases` on `ReleaseReadPort` only                                         | Keith  | Darryl   |
| `src/server/instructor/assessments/service.ts`: `attemptReleases` in `AssessmentService.consumer` only, reusing the existing `authorize` | Keith  | Darryl   |
| `src/server/instructor/assessments/repository.ts`: one read mapping attempt IDs to assessment and release versions, if needed            | Keith  | Darryl   |
| Producer tests for the new method beside the existing assessment tests                                                                   | Keith  | Darryl   |
| `src/server/index.ts`: the `studentHandler` feedback-port composition only, after Darryl's review                                        | Keith  | Darryl   |

No other part of these files is opened, and no migration or release DTO change (`src/shared/instructor-contracts/release.ts`) is included. This record carries Keith's report; Darryl's direct review is not claimed. No deployment is authorized by it.

**Extension — student read ports, reported agreed 2026-11-12.** Keith reported that Darryl gave the go-ahead for Keith to implement the student-side object authorization the producer needs. Production `AssessmentWorkflow` maps `assessment` and `submission` objects to instructor reads and `D1SubmissionCatalog` uses `currentInstructorGuard`, so `AssessmentService.consumer` composed as-is denies every student. The extension covers:

| File                                                                                                                                                                                                                                                                                                                                          | Writer | Reviewer |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| New `src/server/student/release-port.ts`: a student `IdentityCoursePort.requireObject` for `assessment`/`submission` read (own attempt plus current Student membership in SQL; assessment scope through `AssessmentRepository.scope`), a student `SubmissionReadPort` (`StudentWork.attempt`) and the `AssessmentService.consumer` it returns | Keith  | Darryl   |
| `src/server/index.ts`: passing that port to `studentHandler` (real D1 only, never loopback samples)                                                                                                                                                                                                                                           | Keith  | Darryl   |

`AssessmentWorkflow`, `CourseAuthority` and the instructor ports are unchanged. Keith reported on 2026-11-12 that Darryl reviewed and accepted the 5.1 producer change and this adapter (PR #32; recorded in [the handoff](handoffs/student-released-feedback.md)). No deployment is authorized by it.

**Amendment — batched authorization in `attemptReleases`, reported agreed 2026-11-12.** The OPS-01 measurement ([read-cost.md](evidence/student-released-feedback/read-cost.md)) showed about 3 D1 round trips per attempt, against the Workers Free limit of 50 D1 queries per invocation (a `db.batch` counts as one). Keith reported that Darryl agreed to replace the per-attempt `authorize` in `attemptReleases` only with one request-bound session check plus one `db.batch` that maps attempts and verifies, in SQL, that every attempt is the caller's own with current Student membership (`currentStudentGuard`). Authorization stays all-or-nothing. `getAuthorized` and `currentness` keep the full per-attempt `authorize` with the evidence check. Keith writes the change in `service.ts` (`attemptReleases` only) and `repository.ts` (its read) and moves its producer tests onto the composed local-D1 fixture. Darryl reviews.

**Merge with `main` (2026-11-13).** Darryl's real assessment integration (PR #33, section above) changed consumer authorization to use an `ownedAttempts` port in place of the object and course checks. In merging it, Keith's `release-port.ts` (within the extension above) now supplies `ownedAttempts` and no longer overrides `requireObject`; it keeps the once-per-request session. Darryl's `/api/student/released-feedback/...` route and his files are unchanged by Keith.

**Conformance-suite window, reported granted 2026-11-13.** Keith reported that Darryl granted Keith a one-file window for `workflow/contracts/instructor-contracts.ts`, limited to `releaseContractSuite`, so that its later `availabilityRevision` and release-version values derive from the input snapshot instead of hard-coded values (student-released-feedback task 5.3; finding in `workflow/evidence/student-released-feedback/conformance.md`). Writer: Keith. Reviewer: Darryl. The suite's assertions, its other suites and the synthetic fixtures are unchanged. This record carries Keith's report; Darryl's direct review is not claimed.
