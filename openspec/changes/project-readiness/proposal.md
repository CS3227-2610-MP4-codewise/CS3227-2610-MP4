# Project readiness proposal

## Why

Current planning contradicts the deployed foundation and leaves shared services without named implementation owners or usable producer/consumer acceptance boundaries. Resolve those gaps before either member depends on another service (DEV-01–DEV-04, OPS-01–OPS-04).

## What Changes

- Reconcile current-state statements against code at `281cc1392b722e873bc58fd806913c5f2121eeec` and dated GitHub Actions/deployed smoke evidence; preserve historical member records.
- Record the implementation split agreed by Darryl and Keith, as reported by Darryl on 2026-11-05. Darryl writes this shared planning increment and its member log; Keith's agreement is reported, not independently collected in this chat.
- Prepare five contract drafts in `workflow/IntegrationContracts.md`, linked to the existing MVP requirements, with producer/consumer acceptance scenarios, dependency gates and explicit unresolved decisions.
- Separate confirmed ownership and observed deployment facts from proposed product policies and unimplemented interfaces.
- Retain unchecked gates for provider access, authenticated role integration, security evaluation, load/CPU measurements, recovery rehearsal and manual acceptance.

### Scope and exclusions

Documentation and planning only. No application routes, DTO code, migrations, runtime validators, CI changes, provider calls, deployment, commits or archival. Synthetic examples are illustrative; no contract scenario is claimed executed against a feature service. Ownership agreement does not approve every product policy in the MVP draft.

## Capabilities

### New Capabilities

None. This change adds no system behavior; `.openspec.yaml` declares `skip_specs: true`.

### Modified Capabilities

None. The in-flight `codewise-mvp` specs remain the draft requirement source (AUTH-01–03, SUB-01–04, GRADE-01–04, AI-01–05, PROG-01–03). Contract drafts clarify planned boundaries and identify decisions for future bounded feature changes; they do not create a second normative baseline.

## Impact

Current guides, OpenSpec context and MVP status/tasks, shared ownership and integration documents, and a dated readiness evidence/handoff/member log. Existing task 0.6 may be completed only for the independently evidenced foundation release; the full OPS requirements and role-release task remain incomplete. Review and manual acceptance of this planning increment remain separate from any future application implementation.
