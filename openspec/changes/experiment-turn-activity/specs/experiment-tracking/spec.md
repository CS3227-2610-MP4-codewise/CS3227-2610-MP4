# Spec Delta

## ADDED Requirements

### Requirement: EXP-11 Per-turn activity view
The offline report SHALL show one row per admitted agent turn within the active filters. Each row SHALL show the agent label/role, parent, start, end, status, model(s), effort(s), output tokens and reasoning output tokens, and SHALL expand to show the turn's individual model responses. The view SHALL display only output and reasoning output counters, while every stored counter and existing total stays unchanged.

#### Scenario: Turn with several responses
- **WHEN** an admitted turn has three deduplicated responses with measured output
- **THEN** its row shows their summed output and expands to three response rows, each with its timestamp, model, effort, output and reasoning output.

#### Scenario: Mixed model or effort within a turn
- **WHEN** responses in one turn report different models or efforts
- **THEN** the row lists each distinct value rather than choosing one, and a response without a model or effort shows unavailable without inheriting another response's value.

#### Scenario: Unavailable reasoning output
- **WHEN** no response in a turn reports reasoning output
- **THEN** the reasoning output cell shows unavailable, not zero, while measured zero values still show zero.

#### Scenario: Provisional, pending or partial turn
- **WHEN** a turn has no terminal evidence, is draining, was aborted or explicitly finalized partial, or contains a response without usable usage
- **THEN** its status shows provisional, pending or partial, and its output shows only observed measurements.

#### Scenario: Filters
- **WHEN** increment, group, run, session or model filters are applied or reset
- **THEN** the activity rows and response rows follow the same selection as existing usage views, a model filter narrows response rows and turn sums without hiding the turn's status, and an empty selection shows no rows instead of global data.

#### Scenario: Output is not cost
- **WHEN** the activity view is rendered
- **THEN** it states that output tokens show production volume, not cost, and that input, cached input and cache writes appear in the existing usage views.

#### Scenario: No content persisted
- **WHEN** the activity view is built
- **THEN** it uses only allowlisted metadata already stored under EXP-06, and contains no prompt, response, tool-argument or summary text.

### Requirement: EXP-12 Turn spawn attribution and output rollup
The tracker SHALL attribute a linked child agent to the parent turn that spawned it only from structural linkage evidence. Each turn row SHALL list its spawned children by label/role, and SHALL show both the agent's own output and its output including all descendant turns, with each turn counted once.

#### Scenario: Child spawned inside an admitted parent turn
- **WHEN** a child is linked from an admitted parent turn
- **THEN** the parent turn lists the child's label and role, and the child's own turn rows show that parent.

#### Scenario: Parent turn unavailable
- **WHEN** a child's parent session is known but its spawning turn was not recorded, including children linked before this change
- **THEN** the child is shown under its parent session with spawning turn unavailable, and is not assigned to an inferred turn.

#### Scenario: Nested descendants
- **WHEN** a child spawns its own child
- **THEN** the root turn's including-descendants output counts each descendant turn exactly once, its own output excludes descendants, and an unmeasured descendant makes the rollup partial instead of zero.

#### Scenario: Role changed after spawn
- **WHEN** an agent's role or label is reassigned
- **THEN** rows show the current label and the runtime identity is unchanged, as under EXP-09.

### Requirement: EXP-13 Keith checkpoint turn tables
Each new checkpoint SHALL append a table of the increment's admitted turns not shown at an earlier checkpoint, using the per-turn fields and output-only counters of EXP-11/EXP-12, and SHALL append reconciliation rows for turns that an earlier checkpoint reported as provisional. Newly created Keith logs SHALL use `workflow/templates/keith-prompt-experiment.md`. Earlier log content SHALL never be rewritten.

#### Scenario: First and later checkpoints
- **WHEN** two checkpoints are taken with new admitted turns between them
- **THEN** the second table contains only turns not already shown, and no turn's output is counted in two checkpoint tables.

#### Scenario: Provisional turn reconciled
- **WHEN** a turn reported as provisional later has final terminal evidence and usage
- **THEN** the next checkpoint appends a reconciliation row with the final values, and the earlier row is left unchanged.

#### Scenario: Checkpoint replay
- **WHEN** the same checkpoint ID is replayed, including after local database loss
- **THEN** the log is not duplicated and no turn is marked reported twice.

#### Scenario: No new turns
- **WHEN** a checkpoint has no newly admitted or reconcilable turns
- **THEN** the entry states that no new turns were recorded, instead of an empty or invented table.

#### Scenario: Recording off
- **WHEN** a checkpoint is written for an increment with no bounded runs, or with only legacy unbounded data
- **THEN** the entry states that turn metrics are unavailable and excludes legacy records, and narrative logging still succeeds.

#### Scenario: Committed log privacy
- **WHEN** a checkpoint table is written to `logs/keith/`
- **THEN** it contains labels, roles, shortened session identifiers, timestamps, models, efforts, statuses and output counters only, and never source paths, prompts or tool content.

#### Scenario: Existing log
- **WHEN** a checkpoint is appended to a log created from the earlier member-log template
- **THEN** the historical header and entries remain unchanged, and the new entry follows the Keith prompt-experiment entry format.
