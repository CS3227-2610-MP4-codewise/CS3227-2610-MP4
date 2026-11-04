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
