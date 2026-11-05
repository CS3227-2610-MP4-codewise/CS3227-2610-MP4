# Warm workbook implementation design

## Context

See [proposal.md](proposal.md) for motivation and [docs/ui/design.md](../../../docs/ui/design.md) for the selected visual/interaction contract. Current implementation is a React foundation shell in `src/web/main.tsx` and placeholder CSS in `src/web/styles.css`. No application login, role service, workbook, persistence-backed editor or assessment UI exists. The new UI-01–UI-08 scenarios complement the in-flight MVP's domain/security requirements; canonical specs remain empty.

## Goals / Non-Goals

**Goals:** give future bounded feature changes one durable UI contract, reusable component boundaries and concrete review evidence. Cover sign-in, trusted switching, question navigation and draft/history/feedback states without speculative domain decisions.

**Non-Goals:** implement application screens now, choose an identity provider, broaden membership roles, invent deadlines/retention/quotas, execute learner source, migrate storage, deploy or certify the prototypes as accessible/live software. UI tasks remain unchecked.

## Decisions

### One reference, traceable acceptance

`docs/ui/design.md` is the durable reference across role changes. This change owns observable UI requirements in `specs/workbook-experience/spec.md`. AGENTS.md, OpenSpec context/rules, specialist instructions and the PR template point to the reference and `workflow/templates/ui-review.md`. Future proposals/design/tasks cite the revision and relevant UI IDs. Alternative: embed the whole design in every role change; rejected because duplicate copies drift. The MVP architecture design remains a separate artifact.

This increment edits only the new change and documentation/guidance/templates. It leaves the unrelated in-progress instructor-assignment-publication change and MVP checkboxes untouched. No static keyword checker or screenshot CI gate is introduced: those would give weak evidence of fidelity without implemented components and reviewed reference screenshots. Existing strict OpenSpec validation plus a review checklist enforce structure/process; human review supplies visual judgment. Branch protection is unchanged.

### Shared tokens and bounded components

When implementation is separately requested, extract semantic theme tokens, text styles, focus rules and common controls into a named shared web ownership window. Compose workbook shell, published-question pane, answer-view navigation, question footer, source viewer, observation note and asynchronous-state messaging. Role-specific domain wiring stays in the existing instructor/student folders. Begin with the installed React/Vite/CSS stack; no UI framework, font CDN or complex editor dependency is required by this plan. Alternative: recreate the prototype's inline styles in each feature; rejected because it would duplicate layout/state behavior.

Proportional sans serves interface prose, serif marks editorial hierarchy and monospace preserves source. This assigns a purpose to each type family. Full-interface monospace was considered in preview and is not the default. The design defines light/dark palettes and responsive stacking; use measured content fit to refine the breakpoint without changing the information hierarchy.

### Authentication and role boundary

Keith produces C-ID sessions/course context and approved sign-in integration; Darryl consumes that exact reviewed revision. No frontend role control is an identity source. The real two-position switch is available only where trusted context supports both workspaces, otherwise a static role label is used. The identity producer must agree an allowed-context projection before this shared control is wired; this plan does not add that schema. Sign-in uses the selected provider instead of inventing a local password implementation. Synthetic visual review may precede integration only if visibly labelled and isolated from protected routes.

### Versioned navigation state

Treat course, published assignment version, question version, selected answer view, attempt and assessment revision as explicit navigation context. Previous/Next follows the pinned published order. Guard pending/conflicting saves, retain per-question recoverable edits and ignore stale responses for a different context. Final working-copy navigation opens whole-assignment review; C-SUB alone creates an atomic attempt. Alternative: submit when Next is pressed; rejected because it contradicts SUB-03's all-question snapshot.

Submitted source and released observations are separate read-only projections. The working copy never mutates them. Canonical source normalization/hash/limits remain producing-contract gates; the viewer must use agreed logical-line mapping, not guess from display wrapping. The full instructor review keeps rubric/assessment next to immutable submitted evidence. Student DOM, network payloads and caches must never contain private references or unreleased drafts.

### Deliberate evidence, not a claimed live design

Use `workflow/templates/ui-review.md` for each actual UI slice: named scenario outcomes, desktop/narrow images, keyboard behavior, failed/empty states and role/data authorization checks. Store redacted synthetic evidence under that change. A screenshot is appearance evidence, not successful authentication, durability or deployment. Record independent review only if performed; this documentation increment does not invoke coordinated implementation or delegate work.

## Risks / Trade-offs

- Warm low-contrast surfaces → verify actual foreground/background pairs and essential control boundaries in both appearances.
- Continuous workbook becomes crowded on small screens → stack with explicit question access, equal answer targets and in-flow navigation; verify at 320px/200% zoom.
- Role switch implies self-promotion → make visibility depend on trusted C-ID context; test forged/revoked states server-side.
- Pending saves race navigation → version-bound responses, unsaved recovery and an explicit all-question submission checkpoint.
- Guide read but not followed → required PR traceability and review-return checklist; do not claim automated visual enforcement.
- Cross-role changes overlap → agree exact shared files and write window, retain existing human ownership, require consumer review before integration.

## Migration Plan

This planning increment has no data migration or deployment. Later application slices implement shared visual foundations, then identity/student/instructor interfaces under their approved producer handoffs. Verify against synthetic data and both appearances before review. Release only through the existing staging/approved-production workflow; UI work grants no exception. Roll back an actual UI revision through reviewed release procedures without rolling back or deleting immutable learner records. Do not archive this change while any implementation/acceptance task remains open.

## Dependency gates

C-ID provider and allowed role-context projection; C-PUB ordered pinned questions; C-SUB source/revision/retry rules; C-REL exact released fields; outstanding language/source/deadline/retention policy acceptance. These are explicit producer handoff gates, not decisions silently made by this UI plan. Prototype-derived token spacing and breakpoint refinements are deferrable only within the documented visual and accessibility constraints.

## Implementation checkpoint — shared foundation

Following a separate continuation request, tasks 1.1–1.3 implemented shared theme tokens, presentation primitives and the public foundation screen on `codex/warm-workbook-foundation`. The initial planning-only scope above describes the proposal stage, not a prohibition on this subsequently authorized slice. [Component usage](../../../docs/ui/components.md), [ownership window](../../../workflow/handoffs/warm-workbook-foundation.md) and [actual review evidence](../../../workflow/evidence/warm-workbook-ui/foundation/review.md) record the implementation. The remaining role/service tasks stay unchecked; C-ID is the next missing producer handoff. No claim of full UI, identity or deployed acceptance.
