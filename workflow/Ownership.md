# Ownership and integration agreement

Confirmed by the team: Darryl implements instructor features; Keith implements student features. Both contribute a substantial share of team-level work.

| Area                                                     | Primary owner                    | Integration rule                                               |
| -------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| src/web/instructor/, src/server/instructor/              | Darryl                           | Instructor feature branch/PR                                   |
| src/web/student/, src/server/student/                    | Keith                            | Student feature branch/PR                                      |
| Shared DTOs, API entry, identity, AI gateway, schema, CI | Both                             | Agree interface and assign one write owner before changes      |
| Assignment publication/rubric                            | Darryl                           | Student-facing projection agreed with Keith                    |
| Drafts/submission attempts                               | Keith                            | Immutable submission projection agreed with Darryl             |
| Released feedback                                        | Darryl publishes, Keith consumes | Versioned public DTO; no reference solutions/unreleased drafts |

Use feature branches such as codex/instructor-rubrics and codex/student-drafts (or team-agreed names). Merge through reviewed PRs to main. Keep role services in one deployable application for now. If two agents or developers need a shared file, serialize ownership or split interfaces first.

Before role features expose real data, jointly implement the trusted identity/membership boundary. Do not let each role invent its own authentication or separate copy of shared tables. Language remains a draft Python default; execution remains excluded unless a later spec change adds it.

## Agreed shared increment writers — 2026-11-05

Darryl confirmed in the `project-readiness` conversation that Keith agreed to this split. This records reported human agreement, not a review submitted by Keith in this chat. Product policies/interface drafts still require joint acceptance before dependent edits. “Both” above denotes shared review responsibility; the following assigns one writer per bounded increment.

| Increment                                             | Writer / migration owner | Consumer and cross-reviewer                   | Dependency / handoff                                                                   |
| ----------------------------------------------------- | ------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| PR-READY: readiness documents/evidence                | Darryl                   | Keith; independent agent review also recorded | Planning only; no application/schema edits                                             |
| SH-ID: identity, sessions, courses, membership schema | Keith                    | Darryl                                        | Provider/provisioning decision and C-ID acceptance                                     |
| SH-PUB: assignment publication/public projection      | Darryl                   | Keith                                         | Reviewed SH-ID handoff; C-PUB acceptance                                               |
| SH-SUB: drafts/immutable submissions                  | Keith                    | Darryl                                        | Reviewed SH-ID/SH-PUB handoffs; C-SUB acceptance                                       |
| SH-REL: assessment approval/release/public feedback   | Darryl                   | Keith                                         | Reviewed SH-SUB/rubric handoffs; C-REL acceptance                                      |
| SH-AI: shared AI gateway/resource controls            | Darryl                   | Keith                                         | C-AI acceptance; auth/evidence before integration; provider evidence before activation |
| SH-OPS: release evidence/isolation/recovery rehearsal | Darryl                   | Keith                                         | Successful staging and separately authorized release work; recovery still pending      |

Keith also owns student editor, feedback display and progress implementation, including progress-specific AI context/validation. Darryl owns instructor UI/domain work and assessment-specific validation. Each future increment needs its own approved bounded change; this assignment is not blanket implementation/deployment authorization.

The writer owns relevant tables/repositories, DTO sections and API wiring only during a recorded edit window. Before editing shared DTOs, API entry, runtime bindings or migrations, name exact files/sections and acquire that window in the handoff. Serialize windows and next migration numbering; never assign both active writers to one file. CI/security work outside SH-OPS needs a new named assignment. Both owners record review outcomes for shared contracts/migrations; workload agreement is not a completed review.

No SH-ID/SH-SUB implementation handoff exists at this baseline. Darryl consumes Keith's exact reviewed revision instead of creating another identity/course/submission store. Fixtures support isolated work only, with integration pending.

## Records and shared interfaces

Darryl owns logs/darryl/; Keith owns logs/keith/. Choose one human log owner for each shared increment and attribute both contributions. Follow [the log policy](../logs/README.md). Shared producer/consumer decisions live in [IntegrationContracts.md](IntegrationContracts.md); handoffs and verification evidence stay in shared workflow folders. Assign a named lead and single active writer per shared increment before dependent implementation.

## Instructor contract artifact window — approved 2026-11-05

Darryl is the single writer for src/shared/instructor-contracts/, src/server/instructor/ports/, workflow/fixtures/instructor-contracts/, workflow/contracts/, existing IntegrationContracts/PlanningDecisions documents and this change’s planning/evidence/handoff/member log. One independent reviewer is read-only. Existing src/shared/contracts.ts, API entry, runtime environment, migrations, dependencies/CI and Keith role services are untouched. Detailed Keith K1–K6 agreement and real producer/auth integration remain pending; this window does not transfer his implementations to Darryl.
