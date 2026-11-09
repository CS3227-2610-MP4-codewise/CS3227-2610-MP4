# Project experiment tracker

## Why

Keith needs attributable evidence across sessions to evaluate coordination, context engineering and resource use. Existing member summaries do not collect usage automatically or relate it to experiment outcomes.

## What Changes

- Add an independent local collector, project-scoped Codex hooks, incremental transcript metadata import and private SQLite storage.
- Add an offline dashboard, CSV/JSON summaries, explicit coordination annotations and a focused repository skill.
- Create one Keith member log per increment and append substantial Request/Results checkpoints without rewriting history.
- Preserve unavailable/provisional measurements, source identities and review gates; never infer efficiency or idle time from token counts or silence.

## Capabilities

### New Capabilities

- `experiment-tracking`: project-scoped experiment evidence, attributable measurements, coordination checks, reports and Keith log integration (EXP-01–EXP-06; DEV-02/DEV-04).

### Modified Capabilities

None. This is development tooling; application UI, runtime contracts and deployment are unchanged.

## Impact

Keith is sole writer for workflow/experiment-tracker/, .agents/skills/project-experiment/, this change, its evidence/handoff/member log, and additive ignore/Keith log-policy guidance (AGENTS.md and logs/README.md). Hooks are installed locally into ignored .codex/hooks.json, preserving other handlers. No TurnUp integration, historical backfill, Darryl logging changes, model calls or production actions. User approved implementation and a new branch on 2026-11-08 after reviewing the plan.

## Approved revision

Explicit opt-in and bounded runs replace whole-session attribution. Include the initiating turn; pause/stop drain admitted active turns and exclude future work. Add runtime-ID-preserving agent roles, legacy exclusion, lifecycle status and turn-safe reconciliation. Requirements EXP-07–09 extend the same capability. User approved implementation after selecting all lifecycle defaults.

## Claude Code client revision — 2026-11-09

Keith also develops this project in Claude Code, whose sessions the Codex-only tracker refused. Add a second source adapter, local Claude hook installation, exact-ID transcript attachment and a Claude Code skill copy under EXP-10, keeping recording opt-in and the existing Codex behaviour unchanged. Claude hooks go only into ignored `.claude/settings.local.json`; committed shared settings are untouched, so Darryl's sessions are never collected. User requested implementation of the reviewed plan on 2026-11-09.
