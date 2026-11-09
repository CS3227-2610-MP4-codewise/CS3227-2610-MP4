# Member logs and Darryl prompt experiments

- Darryl's work: [darryl/](darryl/).
- Keith's work: [keith/](keith/).
- Darryl: [prompt-experiment template](../workflow/templates/darryl-prompt-experiment.md).
- Keith: [prompt-experiment checkpoint template](../workflow/templates/keith-prompt-experiment.md) for new logs. Earlier logs used the [member-summary template](../workflow/templates/member-log.md).

## Darryl only — prompt experiments

Purpose: retain evidence for Darryl's post-project reflection on prompt design, agent selection, token use, review benefit and repair/rework. These additional per-prompt requirements do not apply to Keith.

Create one file per PR-sized increment under logs/darryl/. Reuse it through planning, implementation, corrections and verification. **Every user prompt requires its own structured entry**, including questions, approvals, corrections, cancellations and "continue". This supersedes the former substantial-request-only rule and routine-question exemption. Do not collapse several prompts into one narrative. Transport/UI metadata and tool results are not user prompts.

Use the [Darryl template](../workflow/templates/darryl-prompt-experiment.md) for each prompt. Record:

- Stable prompt ID, sequence/time (or unavailable), human owner, redacted request, change/requirements and branch/PR when applicable.
- Every agent spawned or reused for that prompt: actual identity, new/reused/main status, assignment, reason, outcome and review/repair returns. If none were spawned or reused, explicitly record **none** and why. A role/skill name is not a spawned agent. Historical missing evidence is **unavailable**, not proof of none.
- Measured tokens for the main agent and each attributable child: input, cached input, output and total; source turn/record IDs, checkpoint, completion and coverage. Record unavailable fields explicitly. Link to the private recorder rather than committing its detailed reports or raw session data.
- Actions, checks and outcomes, blockers and next owner; a summary may supplement these fields but cannot replace them.

Open an entry when a prompt arrives and complete it before the final response, even if no code changes. Multiple steering prompts in one active turn each get an entry. If usage exists only for their shared turn, reference the same usage group, say **per-prompt allocation unavailable**, and count that group once. Never divide or duplicate a turn total to invent per-prompt measurements.

Refresh the configured local recorder at reporting checkpoints after verifying its project scope. Mark the current turn provisional: its later calls and final response are outside the snapshot. At the next checkpoint reconcile completed prior records with dated updates, retaining earlier checkpoint history. A recorder failure does not waive the prompt entry; record unavailable usage and the failure. Zero child tokens is valid only when the agent activity is known to be none. Keep unlinked approval-review sessions separate. Cached input and reasoning output are subsets, not additions to total tokens; these are reported tokens, not monetary charges.

Preserve historical logs. Backfill only what source records or observed conversation establish, label reconstructed entries and explicitly list gaps. Do not claim complete historical coverage until prompts, agent activity and usage links have actually been reconciled. The initial visible-chat backfill and logging-policy correction are in [07-prompt-workflow-audit.md](darryl/07-prompt-workflow-audit.md).

For shared work choose one log owner and identify both contributors. Human owner and agent role are different concepts. Include requirement/change IDs, branch/PR when available, actual checks and limitations. Review AI-generated entries for accuracy. Never include credentials, real student code, raw private prompts or hidden reasoning.

The three dated setup summaries were moved into Darryl's folder because they originated in his setup session. Their historical filenames and separate records are retained; they are not retroactively claimed to be one PR each. Keith's folder intentionally contains no invented contribution records.

For Darryl, before every final response confirm that the current prompt has its own `### Agents spawned` and `### Token count` sections in the member log, even when no agent was spawned or usage is unavailable. A summary table covering several prompts does not satisfy this structure. Reconcile the preceding prompt at the next checkpoint. These instructions apply to future logs after this branch is adopted; do not claim an unmerged PR has changed main.

## Keith — substantial-request checkpoint policy

Keith keeps one log per PR-sized increment in logs/keith/. New logs use workflow/templates/keith-prompt-experiment.md (experiment-turn-activity, EXP-13), and earlier logs keep their member-log.md header and history. Append a checkpoint entry for each substantial request; routine questions need no entry under this policy. When recording is on, each checkpoint adds tracker-generated Agents spawned, Turn activity (output tokens only) and Reconciliation sections. Darryl's every-prompt agent/token tables and prompt-experiment requirements do not apply to Keith. No Keith contribution, prompt, usage or reviewer activity is invented.

### Optional Keith experiment tooling

Recording is off unless Keith explicitly requests start/resume. Pause/stop drain admitted turns and reject new work; attachment and ordinary project requests do not activate collection. Legacy whole-session pilot totals stay preserved but excluded from bounded comparisons.

The [independent project tracker](../workflow/experiment-tracker/README.md) and
repository `project-experiment` skill can create a template-based log when an
increment starts and append idempotent substantial-request checkpoints. Reuse the
same increment/log across sessions. Measurements are cumulative snapshots with
coverage/provisional labels, not independently additive prompt totals. Routine
questions remain exempt. Private runtime data stays ignored; export redacted
summaries explicitly to shared evidence. This does not alter Darryl's policy.
