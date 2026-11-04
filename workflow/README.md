# Proposed development coordination

This is a workflow specification, not evidence that agents have already run.

The repository now includes role instructions under agents/, a handoff template under handoffs/, and Ownership.md for Darryl/Keith's integration agreement. Use these in actual development and retain evidence; templates alone do not satisfy the multi-agent requirement.

## Roles and handoffs

Coordinator: accepts team-reviewed requirement IDs, assigns write ownership, tracks dependencies, and routes failed reviews. Specification agent: drafts scenarios/design; output is reviewed before implementation. Implementation agent: edits only assigned files and supplies changes plus verification. Independent test/security agent: checks acceptance behaviour and adversarial boundaries, returns findings with requirement IDs. Human team: resolves scope decisions and approves releases.

Agent roles may run sequentially; use parallel work only for independently owned files. No subagents were spawned while preparing this draft.

Each handoff records task ID, requirement IDs, exact owned files, input versions, completed actions, verification commands/outcomes, unresolved findings, blocker/next owner, and resource usage if available. Persist decisions and concise evidence, not hidden reasoning. Do not copy entire repository histories into each handoff.

## Experiments to run

- Fixed small tasks: compare single-agent work with coordinated implementation/review; record completion time, tool calls, tokens if available, defects, retries and idle/blocked intervals. Use comparable tasks and disclose confounders.
- Fixed synthetic AI assessment cases: compare broad context with selected question/rubric/code context. Record evidence correctness, rubric alignment, review corrections, prompt size and latency.
- Compare repeated identical requests with cold requests only if provider cache metrics exist; report unavailable cache/reasoning metrics honestly.
- Test malicious repository instructions and code-comment prompt injection; record expected boundary, actual outcome, remediation and rerun evidence.

## Submission organisation

src/: all implementation; workflow/: agent instructions, handoffs, review/experiment scripts; openspec/: conventional specs/config/change artifacts; docs/: current guides and reflections; logs/: verified redacted interaction summaries. Explain the conventional openspec/ location in DeveloperGuide. Keep real code submissions, secrets and raw private prompts out of the public repository.
