# Ownership and integration agreement

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
