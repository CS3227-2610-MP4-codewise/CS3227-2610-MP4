# Shared integration contracts

Status: implementation reading map and decision checklist. Shared services and unresolved interfaces are not claimed complete or agreed.

## Sources

- [MVP design](../openspec/changes/codewise-mvp/design.md): planned entities, routes and version boundaries.
- [Shared DTO starting points](../src/shared/contracts.ts): current transport types, without runtime validation.
- [Ownership](Ownership.md): Darryl/instructor and Keith/student responsibilities.
- [Handoff template](handoffs/TEMPLATE.md): exact producer/consumer revision and verification.

## Contracts to settle before dependent backend integration

| Contract                             | Producer / consumers | Agree and record                                                                       |
| ------------------------------------ | -------------------- | -------------------------------------------------------------------------------------- |
| Identity and authorization           | Shared / both roles  | Identity provider, sessions, trusted roles, course/object checks and errors            |
| Published assignment/question/rubric | Darryl / Keith       | Immutable IDs, student-visible fields, deadlines, private-reference exclusion          |
| Draft and submitted attempt          | Keith / Darryl       | Revision conflicts, atomic submission, idempotency, immutable answer projection        |
| Released assessment                  | Darryl / Keith       | Release version/public fields; no draft feedback or private references in student DTOs |
| AI provider and resources            | Shared / both roles  | Supported model, verified quotas, context isolation, validation and failures           |
| Database and migrations              | Shared / both roles  | Entity constraints, one active migration writer and release compatibility              |

Assign a named human lead and one active writer per shared increment before implementation. This map does not assign all shared work to either member. Producer handoffs include exact types/routes, revision, synthetic payloads, verification and limitations. Consumers can use local fixtures while interfaces are agreed, but must not expose unauthenticated placeholder routes or claim mocks demonstrate integration.
