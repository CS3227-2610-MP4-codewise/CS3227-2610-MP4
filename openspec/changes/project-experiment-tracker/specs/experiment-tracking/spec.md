## Purpose

Provide attributable local evidence for Keith's project experiments across sessions while preserving privacy, measurement limits and existing member-log ownership.

## ADDED Requirements

### Requirement: EXP-01 Scoped independent collection
The tracker SHALL collect only registered project sessions and linked children, preserve unrelated hooks, and remain independent of TurnUp.

#### Scenario: Unrelated session
- **WHEN** a source cwd is outside registered project/worktree roots
- **THEN** import is refused without persisting its conversation contents.

#### Scenario: Hook lifecycle
- **WHEN** project hooks are installed and uninstalled
- **THEN** unrelated handlers survive and tracker hooks never block the agent.

#### Scenario: Malformed transcript header in a hook
- **WHEN** a source-bearing callback references JSON whose header or session metadata payload is not an object
- **THEN** the hook returns its empty successful response without traceback, source registration or turn admission, while other transcript entry points reject the same structure safely.

### Requirement: EXP-02 Attributable usage
The tracker SHALL deduplicate usage by source identity, preserve subset counters, and distinguish provisional, unavailable and measured values.

#### Scenario: Repeated import
- **WHEN** overlapping usage records or the same source are imported again
- **THEN** totals count each measurement once and ongoing turns remain provisional.

#### Scenario: Rewrite outside the checkpoint tail
- **WHEN** a consumed record changes while the source header, size and final 256 bytes stay unchanged
- **THEN** verification of the complete consumed prefix detects the rewrite, rebuilds affected usage and lifecycle evidence, and does not trust a legacy tail-only checkpoint without replay.

#### Scenario: Completed turn without measurements
- **WHEN** an admitted completed turn has no usable total-token measurement or requested counters are unavailable
- **THEN** reports and exports mark coverage partial, identify the gap, retain only observed totals without substituting zero, and reevaluate coverage if late measurements arrive.

### Requirement: EXP-03 Experiment annotations
The tracker SHALL associate increments and sessions explicitly and record hypotheses, coordination, context, verification, review and recovery annotations without inferring intent from tool calls.

#### Scenario: Waiting evidence
- **WHEN** no explicit blocked/unblocked pair exists
- **THEN** blocked duration is unavailable rather than inferred from agent silence.

#### Scenario: Reused identifiers across increments
- **WHEN** one increment has a blocked annotation and another has an unblocked annotation with the same session, agent, task and dependency
- **THEN** no wait interval is paired across increments, and all-increment reports agree with the corresponding increment-filtered intervals.

### Requirement: EXP-04 Honest visibility
The tracker SHALL provide offline filters, agent timelines, resource and comparison views with provenance and coverage, and SHALL require comparable evidence for savings claims.

#### Scenario: Partial coverage
- **WHEN** a client does not expose a requested metric
- **THEN** reports identify the gap and do not substitute zero or a fabricated cost.

#### Scenario: Linked session before turn admission
- **WHEN** a child belongs to a run but is paused before its first turn is admitted
- **THEN** exported membership and filtered report counts retain that child, and its attached or missing source row stays visible.

#### Scenario: Filtered telemetry coverage
- **WHEN** report filters select increments, groups, runs or sessions whose coverage differs from the full snapshot
- **THEN** coverage and status are recomputed for that selection, unrelated telemetry gaps are omitted, and reset restores global coverage without fabricating complete coverage for an empty selection.

### Requirement: EXP-05 Keith increment logs
The tracker SHALL create one template-based Keith log per increment and append idempotent substantial Request/Results checkpoints with evidence links, preserving previous entries.

#### Scenario: Multiple sessions
- **WHEN** a later session checkpoints the same increment
- **THEN** its new entry is appended to the same log and replaying its checkpoint does not duplicate it.

### Requirement: EXP-06 Private metadata
The tracker SHALL persist allowlisted metadata only, exclude raw prompts/tool bodies/hidden reasoning, and export summaries only on explicit request.

#### Scenario: Sensitive event payload
- **WHEN** a hook includes prompts, tool arguments, results or assistant messages
- **THEN** these fields are discarded before persistence and are absent from reports and exports.

### Requirement: EXP-07 Explicit turn admission
The tracker SHALL remain off without explicit start/resume, include the initiating turn only when identified, and exclude inactive work before queue persistence and during imports. Child admission SHALL require proven parentage and active recording.

#### Scenario: General question while paused
- **WHEN** a general question is processed in the project directory while paused
- **THEN** no event or usage for its turn is persisted or included after resume.

#### Scenario: Start mid-conversation
- **WHEN** recording starts in a reliably identified current turn
- **THEN** that turn is admitted and every earlier turn remains excluded.

### Requirement: EXP-08 Graceful recording lifecycle
The tracker SHALL expose start/pause/resume/stop/status and explicit partial finalization, drain admitted active turns without admitting new ones, retain late measurements for admitted turns, and exclude legacy unbounded data from bounded totals.

#### Scenario: Pause with active children
- **WHEN** pause is requested with admitted root and child turns active
- **THEN** state remains draining until their terminal evidence is reconciled and no new turn or child is admitted.

#### Scenario: Migration
- **WHEN** existing v1 data is migrated
- **THEN** a local backup and historical logs are preserved and unbounded measurements are excluded from new totals.

#### Scenario: Terminal evidence removed during source replay
- **WHEN** a truncated or rewritten transcript no longer contains a previously imported terminal record for an admitted turn
- **THEN** replay clears that turn's source-derived terminal and abort flags, reconstructs surviving terminal evidence, preserves unrelated sessions and explicit partial finalization, and pause/stop cannot finish draining from the removed evidence.

#### Scenario: Replay invalidates a settled lifecycle
- **WHEN** a rewrite removes terminal evidence after pause or stop has settled
- **THEN** the affected run returns to the corresponding draining state without reactivating recording, and restored evidence or explicit partial finalization can recover it without disrupting a newer run.

#### Scenario: Rebuilt partial provenance
- **WHEN** replay removes abort evidence and normal completion survives or later arrives
- **THEN** admission and run partial flags are rebuilt from surviving evidence, while explicit partial-finalization provenance remains partial through replay and late completion.

### Requirement: EXP-09 Agent roles and bounded reports
The tracker SHALL preserve actual runtime identities separately from assigned roles/display labels and show run/window provenance, lifecycle states, coverage and legacy exclusions in reports and logs.

#### Scenario: Coordinator label
- **WHEN** the root is assigned Coordinator
- **THEN** its actual identity remains unchanged and measured records retain the same attribution.
