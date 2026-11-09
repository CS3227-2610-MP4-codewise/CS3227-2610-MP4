# Experiment turn activity

Owner: Keith. Increment: `experiment-turn-activity`. Requirements: EXP-11, EXP-12, EXP-13. Branch/PR: `keith/experiment-turn-activity` (pull request open).

Format: [keith-prompt-experiment template](../../workflow/templates/keith-prompt-experiment.md). This entry was written by hand because tracker recording was off. It is not a tracker-generated checkpoint, so no turn tables are produced.

## Checkpoint `implementation` — 2026-11-09

### Request

Improve the experiment tracker's visibility of each turn: which agents were spawned in which roles, and output per agent turn, in both the HTML report and Keith's logs. No request/result summaries; output tokens displayed only.

### Results

- Owner: Keith (decisions); implemented by the Claude Code main agent.
- Changes and why:
  - Planned and applied OpenSpec `experiment-turn-activity`.
  - Added a per-turn report table with expandable responses and an including-spawned output rollup.
  - The tracker now stores the spawning turn when it links a child.
  - Checkpoints generate Agents spawned, Turn activity and Reconciliation sections.
  - Added a new Keith log template.
  - Updated the policy references.
- Checks actually run and outcomes:
  - 138 Python tests passed.
  - 34 report tests passed.
  - Strict OpenSpec validation passed.
  - `npm run check` passed.
  - The synthetic end-to-end report and log agreed.
- Evidence or handoff links: [verification](../../workflow/evidence/experiment-turn-activity/verification.md), [handoff](../../workflow/handoffs/experiment-turn-activity.md).
- Remaining limitations and next owner:
  - Darryl reviews the shared AGENTS.md/README wording.
  - Keith reviews, commits and opens the PR.
  - A live opted-in session has not been verified.

### Agents spawned

None. Main agent only, because the work was sequential, single-owner tooling.

### Turn activity

Turn metrics unavailable: recording was not started for this work.

### Reconciliation

None.

### Coverage

- Usage unavailable. No metrics are invented.
