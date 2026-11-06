# Ownership and integration agreement

Confirmed by the team: Darryl implements instructor features; Keith implements student features. Both contribute a substantial share of team-level work.

| Area                                                            | Primary owner                    | Integration rule                                                 |
| --------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| src/web/instructor/, src/server/instructor/                     | Darryl                           | Instructor feature branch/PR                                     |
| src/web/student/, src/server/student/                           | Keith                            | Student feature branch/PR                                        |
| Shared sign-in/registration, provider accounts, sessions/logout | Darryl                           | Keith cross-reviews; course/object authority remains Keith-owned |
| Courses, memberships and object authorization                   | Keith                            | Consume Darryl's trusted session identity; Darryl cross-reviews  |
| Shared DTOs, API entry, identity, AI gateway, schema, CI        | Both                             | Agree interface and assign one write owner before changes        |
| Assignment publication/rubric                                   | Darryl                           | Student-facing projection agreed with Keith                      |
| Drafts/submission attempts                                      | Keith                            | Immutable submission projection agreed with Darryl               |
| Released feedback                                               | Darryl publishes, Keith consumes | Versioned public DTO; no reference solutions/unreleased drafts   |

Use feature branches such as codex/instructor-rubrics and codex/student-drafts (or team-agreed names). Merge through reviewed PRs to main. Keep role services in one deployable application for now. If two agents or developers need a shared file, serialize ownership or split interfaces first.

Before role features expose real data, jointly implement the trusted identity/membership boundary. Do not let each role invent its own authentication or separate copy of shared tables. Language remains a draft Python default; execution remains excluded unless a later spec change adds it.

## Current shared increment writers — updated 2026-11-06

The original combined split was reported agreed by Keith through Darryl in `project-readiness` on 2026-11-05; that historical acceptance is not a new review by Keith in this chat. The current table incorporates Darryl's later auth reassignment below. Product policies/interface drafts still require joint acceptance before dependent edits. “Both” above denotes shared review responsibility; the following assigns one writer per bounded increment.

Update requested by Darryl on 2026-11-06: transfer sign-in and registration/provisioning, provider integration, account identity, sessions and logout to Darryl (SH-AUTH). Keith retains course/membership/object authorization (SH-ID) and student/submission work. This supersedes the earlier combined Keith-owned SH-ID assignment for future work; historical logs/evidence retain that earlier allocation. Keith's review of the revised shared boundary remains pending and is not claimed here.

| Increment                                                                       | Writer / migration owner | Consumer and cross-reviewer                   | Dependency / handoff                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| PR-READY: readiness documents/evidence                                          | Darryl                   | Keith; independent agent review also recorded | Planning only; no application/schema edits                                                                    |
| SH-AUTH: sign-in, registration/provisioning, provider accounts, sessions/logout | Darryl                   | Keith                                         | Provider and registration-policy decision; reviewed session/account handoff and C-ID acceptance               |
| SH-ID: courses, memberships, course/object authorization                        | Keith                    | Darryl                                        | Consume Darryl's SH-AUTH session identity; reviewed authorization/allowed-context handoff and C-ID acceptance |
| SH-PUB: assignment publication/public projection                                | Darryl                   | Keith                                         | Reviewed SH-ID handoff; C-PUB acceptance                                                                      |
| SH-SUB: drafts/immutable submissions                                            | Keith                    | Darryl                                        | Reviewed SH-ID/SH-PUB handoffs; C-SUB acceptance                                                              |
| SH-REL: assessment approval/release/public feedback                             | Darryl                   | Keith                                         | Reviewed SH-SUB/rubric handoffs; C-REL acceptance                                                             |
| SH-AI: shared AI gateway/resource controls                                      | Darryl                   | Keith                                         | C-AI acceptance; auth/evidence before integration; provider evidence before activation                        |
| SH-OPS: release evidence/isolation/recovery rehearsal                           | Darryl                   | Keith                                         | Successful staging and separately authorized release work; recovery still pending                             |

Keith also owns student editor, feedback display and progress implementation, including progress-specific AI context/validation. Darryl owns instructor UI/domain work and assessment-specific validation. Each future increment needs its own approved bounded change; this assignment is not blanket implementation/deployment authorization.

The writer owns relevant tables/repositories, DTO sections and API wiring only during a recorded edit window. Before editing shared DTOs, API entry, runtime bindings or migrations, name exact files/sections and acquire that window in the handoff. Serialize windows and next migration numbering; never assign both active writers to one file. CI/security work outside SH-OPS needs a new named assignment. Both owners record review outcomes for shared contracts/migrations; workload agreement is not a completed review.

No real SH-AUTH/SH-ID/SH-SUB implementation handoff exists at this baseline. Darryl supplies the single shared authentication/account/session producer; Keith supplies course/membership/object authorization and submission producers. Compose their reviewed revisions behind the existing C-ID boundary rather than creating parallel identity stores. SH-PUB and SH-SUB require both authentication and authorization handoffs. Fixtures support isolated work only, with integration pending.

Darryl owns the sign-in UI and provider callback, session expiry/logout/revocation, mutation-origin/CSRF guards and account identity mapping. Keith owns authoritative course membership, course/object permission checks and allowed workspace contexts, consuming Darryl's trusted session identity. Instructor provisioning policy is jointly reviewed; accounts never self-promote. Account/session and course/membership schema sections have named owners but remain in one authoritative store, with one active migration writer per agreed window. Registration method (public, invitation or operator-managed) and provider remain undecided; transferring ownership does not approve either.

## Records and shared interfaces

## SH-AUTH implementation window — approved2026-11-06

Darryl is sole writer for src/server/auth/, src/web/auth/, compatible existing C-ID session/error boundary additions, authentication wiring in src/server/index.ts/environment.ts and src/web/main.tsx, next0003 authentication migration (number rechecked before creation), minimal package/lock and wrangler.json auth configuration sections, workflow/auth/ provisioning/tests and this bounded change's specs/docs/log/evidence/handoff. Existing styling/primitives are reused. User approved Google OIDC, invitation-only24-hour onboarding,30-minute idle/8-hour absolute sessions and in-app trusted-admin create/copy-once/list/revoke invitations with manual sending. Auth-admin authority is operator-bootstrapped separately from course/instructor roles. One independent auth_review is read-only. No Keith/course/submission implementations, CI/release edits, email provider, production deployment or generic personal skill changes. Keith's revised-boundary review remains pending. This window is serialized with future shared writes.

Concrete compatible additions in this same window: src/shared/auth.ts (separate UI envelope; existing SessionView unchanged), .dev.vars.example (blank server-only auth configuration), openspec/config.yaml context and docs/PlanningDecisions.md/IntegrationContracts.md current-status reconciliation. No other migration writer is active. The earlier “provider/registration undecided” and “no SH-AUTH implementation” paragraphs describe the pre-approval baseline; this window and its source/evidence handoff supersede them for current local implementation. Live Google, deployment, Keith cross-review and composed authorization remain pending.

Darryl owns logs/darryl/; Keith owns logs/keith/. Choose one human log owner for each shared increment and attribute both contributions. Follow [the log policy](../logs/README.md). Shared producer/consumer decisions live in [IntegrationContracts.md](IntegrationContracts.md); handoffs and verification evidence stay in shared workflow folders. Assign a named lead and single active writer per shared increment before dependent implementation.

## Instructor contract artifact window — approved 2026-11-05

Darryl is the single writer for src/shared/instructor-contracts/, src/server/instructor/ports/, workflow/fixtures/instructor-contracts/, workflow/contracts/, existing IntegrationContracts/PlanningDecisions documents and this change’s planning/evidence/handoff/member log. One independent reviewer is read-only. Existing src/shared/contracts.ts, API entry, runtime environment, migrations, dependencies/CI and Keith role services are untouched. Detailed Keith K1–K6 agreement and real producer/auth integration remain pending; this window does not transfer his implementations to Darryl.

## Instructor assignment publication window — approved 2026-11-06

Darryl approved the bounded authoring/publication brief and expanded single-writer window: src/web/instructor/assignments/, src/server/instructor/assignments/, new authoring contract/tests, next migration 0002_instructor_assignments.sql (number rechecked before creation), workflow/instructor-preview/ and its local HTML entry, minimal package/lockfile development support and this change's docs/log/evidence/handoff/UI review. The independent reviewer is read-only. Production Worker/frontend entrypoints, root deployment configuration, CI and Keith identity/course/submission/progress services are not part of this window. Synthetic local composition is explicitly authorized; real authentication/K1–K6/consumer integration remains pending.
